package microsoft

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

// uploadChunk is a multiple of 320 KiB, as Graph requires for upload sessions.
const uploadChunk = 320 * 1024 * 16 // 5 MiB

// Upload streams a file of known size into a folder using a resumable upload session, which works
// for any size (simple uploads are limited to 4 MB). Name conflicts are resolved by renaming.
func (s *SharePoint) Upload(ctx context.Context, folderID, name string, size int64, r io.Reader) (DriveItem, error) {
	drive, err := s.DriveID(ctx)
	if err != nil {
		return DriveItem{}, err
	}
	if size <= 0 {
		return DriveItem{}, fmt.Errorf("file is empty")
	}
	var session struct {
		UploadURL string `json:"uploadUrl"`
	}
	err = s.Client.do(ctx, s.Client.App, request{method: http.MethodPost,
		path: "/drives/" + drive + "/items/" + url.PathEscape(folderID) + ":/" + url.PathEscape(SafeName(name)) + ":/createUploadSession",
		body: map[string]any{"item": map[string]any{"@microsoft.graph.conflictBehavior": "rename"}},
		out:  &session})
	if err != nil {
		return DriveItem{}, err
	}
	buf := make([]byte, uploadChunk)
	var offset int64
	for offset < size {
		n, readErr := io.ReadFull(r, buf[:min(int64(uploadChunk), size-offset)])
		if readErr != nil {
			s.abort(ctx, session.UploadURL)
			return DriveItem{}, fmt.Errorf("file is shorter than its declared size")
		}
		var item DriveItem
		done, err := s.putChunk(ctx, session.UploadURL, buf[:n], offset, size, &item)
		if err != nil {
			s.abort(ctx, session.UploadURL)
			return DriveItem{}, err
		}
		offset += int64(n)
		if done {
			return item, nil
		}
	}
	return DriveItem{}, fmt.Errorf("upload did not complete")
}

// putChunk sends one byte range. The pre-authenticated upload URL must not carry an Authorization header.
func (s *SharePoint) putChunk(ctx context.Context, uploadURL string, chunk []byte, offset, size int64, out *DriveItem) (bool, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, uploadURL, bytes.NewReader(chunk))
	if err != nil {
		return false, err
	}
	req.ContentLength = int64(len(chunk))
	req.Header.Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", offset, offset+int64(len(chunk))-1, size))
	resp, err := s.Client.HTTP.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusAccepted {
		return false, nil
	}
	return true, decode(resp, out)
}

func (s *SharePoint) abort(ctx context.Context, uploadURL string) {
	req, err := http.NewRequestWithContext(context.WithoutCancel(ctx), http.MethodDelete, uploadURL, nil)
	if err == nil {
		if resp, err := s.Client.HTTP.Do(req); err == nil {
			resp.Body.Close()
		}
	}
}
