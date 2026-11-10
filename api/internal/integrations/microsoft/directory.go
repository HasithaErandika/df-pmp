package microsoft

import (
	"context"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"golang.org/x/oauth2"
)

// DirectoryUser is an Entra ID user (basic profile only; User.ReadBasic.All).
type DirectoryUser struct {
	ID                string `json:"id"`
	DisplayName       string `json:"displayName"`
	Mail              string `json:"mail"`
	UserPrincipalName string `json:"userPrincipalName"`
}

// Email returns the mailbox address, falling back to the UPN.
func (u DirectoryUser) Email() string {
	if u.Mail != "" {
		return strings.ToLower(u.Mail)
	}
	return strings.ToLower(u.UserPrincipalName)
}

const userSelect = "id,displayName,mail,userPrincipalName"

// SearchUsers finds people in the organization by name or email using the signed-in user's token.
func (c *Client) SearchUsers(ctx context.Context, ts oauth2.TokenSource, query string, limit int) ([]DirectoryUser, error) {
	// $search terms are quoted; strip characters that would break the expression.
	term := strings.NewReplacer(`"`, "", `\`, "").Replace(strings.TrimSpace(query))
	if term == "" {
		return nil, nil
	}
	params := url.Values{}
	params.Set("$search", `"displayName:`+term+`" OR "mail:`+term+`" OR "userPrincipalName:`+term+`"`)
	params.Set("$select", userSelect)
	params.Set("$top", strconv.Itoa(max(1, min(limit, 25))))
	params.Set("$count", "true")
	var out struct {
		Value []DirectoryUser `json:"value"`
	}
	err := c.do(ctx, ts, request{
		method:  http.MethodGet,
		path:    "/users?" + params.Encode(),
		headers: map[string]string{"ConsistencyLevel": "eventual"}, // required for $search on directory objects
		out:     &out,
	})
	return out.Value, err
}

// GetUser loads one user by object ID so imported profiles come from Entra, not from the client.
func (c *Client) GetUser(ctx context.Context, ts oauth2.TokenSource, id string) (DirectoryUser, error) {
	var user DirectoryUser
	err := c.do(ctx, ts, request{
		method: http.MethodGet,
		path:   "/users/" + url.PathEscape(id) + "?$select=" + userSelect,
		out:    &user,
	})
	return user, err
}
