package microsoft

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// DriveItem is a SharePoint file or folder.
type DriveItem struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	WebURL       string    `json:"webUrl"`
	Size         int64     `json:"size"`
	LastModified time.Time `json:"lastModifiedDateTime"`
	Folder       *struct {
		ChildCount int `json:"childCount"`
	} `json:"folder,omitempty"`
	File *struct {
		MimeType string `json:"mimeType"`
	} `json:"file,omitempty"`
	LastModifiedBy struct {
		User struct {
			DisplayName string `json:"displayName"`
		} `json:"user"`
	} `json:"lastModifiedBy"`
}

// SharePoint stores project documents in one document library using application permission
// Sites.Selected, so df-pmp can reach only the site an administrator explicitly granted.
type SharePoint struct {
	Client  *Client
	SiteURL string // https://contoso.sharepoint.com/sites/df-pmp
	Library string // optional library name; default library when empty

	mu      sync.Mutex
	driveID string
}

// Enabled reports whether the app has credentials and a site.
func (s *SharePoint) Enabled() bool { return s != nil && s.Client.App != nil && s.SiteURL != "" }

// DriveID resolves (and caches) the document library's drive ID.
func (s *SharePoint) DriveID(ctx context.Context) (string, error) {
	if !s.Enabled() {
		return "", ErrNotConnected
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.driveID != "" {
		return s.driveID, nil
	}
	site, err := url.Parse(s.SiteURL)
	if err != nil || site.Host == "" {
		return "", fmt.Errorf("invalid SHAREPOINT_SITE_URL %q", s.SiteURL)
	}
	var siteInfo struct{ ID string }
	if err := s.Client.do(ctx, s.Client.App, request{method: http.MethodGet,
		path: "/sites/" + site.Host + ":" + site.EscapedPath() + "?$select=id", out: &siteInfo}); err != nil {
		return "", err
	}
	if s.Library == "" {
		var def struct{ ID string }
		if err := s.Client.do(ctx, s.Client.App, request{method: http.MethodGet,
			path: "/sites/" + siteInfo.ID + "/drive?$select=id", out: &def}); err != nil {
			return "", err
		}
		s.driveID = def.ID
	} else {
		var drives struct {
			Value []struct{ ID, Name string }
		}
		if err := s.Client.do(ctx, s.Client.App, request{method: http.MethodGet,
			path: "/sites/" + siteInfo.ID + "/drives?$select=id,name", out: &drives}); err != nil {
			return "", err
		}
		for _, d := range drives.Value {
			if strings.EqualFold(d.Name, s.Library) {
				s.driveID = d.ID
			}
		}
	}
	if s.driveID == "" {
		return "", fmt.Errorf("document library %q not found on %s", s.Library, s.SiteURL)
	}
	return s.driveID, nil
}

// EnsureFolder returns the folder with the given name at the library root, creating it if needed.
func (s *SharePoint) EnsureFolder(ctx context.Context, name string) (DriveItem, error) {
	drive, err := s.DriveID(ctx)
	if err != nil {
		return DriveItem{}, err
	}
	var item DriveItem
	err = s.Client.do(ctx, s.Client.App, request{method: http.MethodPost,
		path: "/drives/" + drive + "/root/children",
		body: map[string]any{"name": name, "folder": map[string]any{}, "@microsoft.graph.conflictBehavior": "fail"},
		out:  &item})
	if IsStatus(err, http.StatusConflict) {
		err = s.Client.do(ctx, s.Client.App, request{method: http.MethodGet,
			path: "/drives/" + drive + "/root:/" + url.PathEscape(name), out: &item})
	}
	return item, err
}

// List returns the children of a folder, newest first.
func (s *SharePoint) List(ctx context.Context, folderID string) ([]DriveItem, error) {
	drive, err := s.DriveID(ctx)
	if err != nil {
		return nil, err
	}
	var out struct {
		Value []DriveItem `json:"value"`
	}
	params := url.Values{}
	params.Set("$top", "200")
	params.Set("$orderby", "lastModifiedDateTime desc")
	params.Set("$select", "id,name,webUrl,size,lastModifiedDateTime,folder,file,lastModifiedBy")
	err = s.Client.do(ctx, s.Client.App, request{method: http.MethodGet,
		path: "/drives/" + drive + "/items/" + url.PathEscape(folderID) + "/children?" + params.Encode(),
		out:  &out})
	return out.Value, err
}

// SafeName removes characters SharePoint does not allow in file and folder names.
func SafeName(name string) string {
	name = strings.Map(func(r rune) rune {
		if strings.ContainsRune(`"*:<>?/\|#%`, r) || r < 32 {
			return '-'
		}
		return r
	}, strings.TrimSpace(name))
	name = strings.Trim(name, ". ")
	if len(name) > 200 {
		name = name[:200]
	}
	if name == "" {
		name = "file"
	}
	return name
}
