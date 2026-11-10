package config

import (
	"encoding/base64"
	"fmt"
	"os"
	"strings"
	"time"
)

// AuthModeEntra signs users in with Microsoft Entra ID through the API (BFF sessions).
const AuthModeEntra = "entra"

// Microsoft holds Entra ID and Microsoft Graph settings. Secrets come from the environment only.
type Microsoft struct {
	TenantID     string
	ClientID     string
	ClientSecret string
	RedirectURL  string
	// SharePoint document storage (application permission Sites.Selected).
	SharePointSiteURL string
	SharePointLibrary string
	// Session handling.
	SessionKey    []byte
	SessionTTL    time.Duration
	CookieSecure  bool
	BootstrapUPNs []string
	DefaultRole   string
	GraphBaseURL  string
	AuthorityURL  string
}

// Configured reports whether an app registration is available.
func (m Microsoft) Configured() bool {
	return m.TenantID != "" && m.ClientID != "" && m.ClientSecret != ""
}

// SharePointEnabled reports whether project document storage can be used.
func (m Microsoft) SharePointEnabled() bool { return m.Configured() && m.SharePointSiteURL != "" }

func loadMicrosoft(webOrigin string) (Microsoft, error) {
	ttl, err := time.ParseDuration(env("SESSION_TTL", "10h"))
	if err != nil {
		return Microsoft{}, fmt.Errorf("SESSION_TTL: %w", err)
	}
	m := Microsoft{
		TenantID:          os.Getenv("ENTRA_TENANT_ID"),
		ClientID:          os.Getenv("ENTRA_CLIENT_ID"),
		ClientSecret:      os.Getenv("ENTRA_CLIENT_SECRET"),
		RedirectURL:       env("ENTRA_REDIRECT_URL", "http://localhost:8080/api/v1/auth/callback"),
		SharePointSiteURL: strings.TrimRight(os.Getenv("SHAREPOINT_SITE_URL"), "/"),
		SharePointLibrary: os.Getenv("SHAREPOINT_LIBRARY"),
		SessionTTL:        ttl,
		CookieSecure:      strings.HasPrefix(webOrigin, "https://"),
		BootstrapUPNs:     splitList(os.Getenv("BOOTSTRAP_ADMIN_UPNS")),
		DefaultRole:       env("DEFAULT_ROLE", "team_member"),
		GraphBaseURL:      env("GRAPH_BASE_URL", "https://graph.microsoft.com/v1.0"),
		AuthorityURL:      env("ENTRA_AUTHORITY_URL", "https://login.microsoftonline.com"),
	}
	if raw := os.Getenv("SESSION_ENCRYPTION_KEY"); raw != "" {
		key, err := base64.StdEncoding.DecodeString(raw)
		if err != nil || len(key) != 32 {
			return m, fmt.Errorf("SESSION_ENCRYPTION_KEY must be 32 bytes, base64 encoded")
		}
		m.SessionKey = key
	}
	return m, nil
}

// validateEntra checks the settings required when AUTH_MODE=entra.
func (m Microsoft) validateEntra() error {
	var missing []string
	for name, value := range map[string]string{
		"ENTRA_TENANT_ID": m.TenantID, "ENTRA_CLIENT_ID": m.ClientID, "ENTRA_CLIENT_SECRET": m.ClientSecret,
	} {
		if value == "" {
			missing = append(missing, name)
		}
	}
	if len(m.SessionKey) == 0 {
		missing = append(missing, "SESSION_ENCRYPTION_KEY")
	}
	if len(missing) > 0 {
		return fmt.Errorf("AUTH_MODE=entra requires: %s", strings.Join(missing, ", "))
	}
	return nil
}

func splitList(value string) []string {
	var out []string
	for _, item := range strings.Split(value, ",") {
		if item = strings.ToLower(strings.TrimSpace(item)); item != "" {
			out = append(out, item)
		}
	}
	return out
}
