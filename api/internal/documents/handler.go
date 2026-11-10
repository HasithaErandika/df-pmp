// Package documents stores project files in SharePoint. df-pmp keeps only folder identifiers;
// file contents, versions and permissions remain governed by SharePoint.
package documents

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strconv"

	"github.com/dialog-finance/df-pmp/api/internal/audit"
	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
	ms "github.com/dialog-finance/df-pmp/api/internal/integrations/microsoft"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const maxUpload = 250 << 20 // 250 MB

// Folder is a project's SharePoint folder and its contents.
type Folder struct {
	Enabled bool           `json:"enabled"`
	WebURL  string         `json:"webUrl"`
	Items   []ms.DriveItem `json:"items"`
}

// Handler exposes project document endpoints.
type Handler struct {
	Pool       *pgxpool.Pool
	SharePoint *ms.SharePoint
}

// Register mounts routes on mux.
func (h Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/projects/{id}/documents", auth.Require("document:view", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() (Folder, error) { return h.list(r.Context(), r.PathValue("id")) })
	}))
	mux.HandleFunc("POST /api/v1/projects/{id}/documents", auth.Require("document:upload", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusCreated, func() (ms.DriveItem, error) { return h.upload(w, r) })
	}))
}

// folder returns the project's folder, creating "<id> <name>" in the library on first use.
func (h Handler) folder(ctx context.Context, projectID string) (id, url string, err error) {
	var name string
	var existing *string
	err = h.Pool.QueryRow(ctx, "SELECT name, sharepoint_folder_id, sharepoint_folder_url FROM projects WHERE id = $1",
		projectID).Scan(&name, &existing, &url)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", httpx.ErrNotFound
	}
	if err != nil || existing != nil {
		return deref(existing), url, err
	}
	item, err := h.SharePoint.EnsureFolder(ctx, ms.SafeName(projectID+" "+name))
	if err != nil {
		return "", "", err
	}
	_, err = h.Pool.Exec(ctx, "UPDATE projects SET sharepoint_folder_id = $2, sharepoint_folder_url = $3 WHERE id = $1",
		projectID, item.ID, item.WebURL)
	return item.ID, item.WebURL, err
}

func (h Handler) list(ctx context.Context, projectID string) (Folder, error) {
	if !h.SharePoint.Enabled() {
		return Folder{Items: []ms.DriveItem{}}, nil
	}
	id, url, err := h.folder(ctx, projectID)
	if err != nil {
		return Folder{}, sharepointError(err)
	}
	items, err := h.SharePoint.List(ctx, id)
	if err != nil {
		return Folder{}, sharepointError(err)
	}
	if items == nil {
		items = []ms.DriveItem{}
	}
	return Folder{Enabled: true, WebURL: url, Items: items}, nil
}

// upload expects multipart fields "size" (bytes) followed by "file", and streams the file to SharePoint.
func (h Handler) upload(w http.ResponseWriter, r *http.Request) (ms.DriveItem, error) {
	if !h.SharePoint.Enabled() {
		return ms.DriveItem{}, &httpx.ValidationError{Fields: map[string]string{"file": "SharePoint is not configured."}}
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxUpload+1<<20)
	reader, err := r.MultipartReader()
	if err != nil {
		return ms.DriveItem{}, &httpx.ValidationError{Fields: map[string]string{"file": "Send the file as multipart form data."}}
	}
	var size int64
	for {
		part, err := reader.NextPart()
		if err == io.EOF {
			return ms.DriveItem{}, &httpx.ValidationError{Fields: map[string]string{"file": "Choose a file to upload."}}
		}
		if err != nil {
			return ms.DriveItem{}, &httpx.ValidationError{Fields: map[string]string{"file": "The upload was interrupted."}}
		}
		switch part.FormName() {
		case "size":
			raw, _ := io.ReadAll(io.LimitReader(part, 20))
			size, _ = strconv.ParseInt(string(raw), 10, 64)
		case "file":
			return h.store(r.Context(), r.PathValue("id"), part, size)
		}
	}
}

func (h Handler) store(ctx context.Context, projectID string, part *multipart.Part, size int64) (ms.DriveItem, error) {
	if size <= 0 || size > maxUpload {
		return ms.DriveItem{}, &httpx.ValidationError{Fields: map[string]string{"file": fmt.Sprintf("Files must be between 1 byte and %d MB.", maxUpload>>20)}}
	}
	folderID, _, err := h.folder(ctx, projectID)
	if err != nil {
		return ms.DriveItem{}, sharepointError(err)
	}
	item, err := h.SharePoint.Upload(ctx, folderID, part.FileName(), size, part)
	if err != nil {
		return ms.DriveItem{}, sharepointError(err)
	}
	err = pgx.BeginFunc(ctx, h.Pool, func(tx pgx.Tx) error {
		return audit.Record(ctx, tx, "document.uploaded", "project", projectID, item.Name)
	})
	return item, err
}

func sharepointError(err error) error {
	var ge *ms.Error
	switch {
	case errors.Is(err, httpx.ErrNotFound):
		return err
	case errors.As(err, &ge) && (ge.Status == 401 || ge.Status == 403):
		return &httpx.ValidationError{Fields: map[string]string{"file": "SharePoint denied access. Ask an administrator to grant the app access to the site (Sites.Selected)."}}
	case errors.As(err, &ge):
		return &httpx.ValidationError{Fields: map[string]string{"file": "SharePoint error: " + ge.Message}}
	default:
		return err
	}
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
