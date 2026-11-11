// Package config loads process settings from environment variables.
package config

import (
	"fmt"
	"net/url"
	"os"
	"strings"
)

// Config holds runtime settings. Secrets are read from the environment only.
type Config struct {
	Port         string
	WebOrigin    string
	ConfigDir    string
	DatabaseURL  string
	AuthMode     string
	SeedDemoData bool
	Microsoft    Microsoft
}

// AuthModePreview enables the development sign-in where people pick a role. It must not be used in production.
const AuthModePreview = "preview"

// Load reads the environment and validates required values.
func Load() (Config, error) {
	cfg := Config{
		Port:         env("PORT", "8080"),
		WebOrigin:    env("WEB_ORIGIN", "http://localhost:5173"),
		ConfigDir:    env("CONFIG_DIR", "config"),
		DatabaseURL:  os.Getenv("DATABASE_URL"),
		AuthMode:     env("AUTH_MODE", AuthModePreview),
		SeedDemoData: strings.EqualFold(os.Getenv("SEED_DEMO_DATA"), "true"),
	}
	if cfg.DatabaseURL == "" {
		cfg.DatabaseURL = databaseURLFromParts()
	}
	if cfg.DatabaseURL == "" {
		return cfg, fmt.Errorf("DATABASE_URL or POSTGRES_PASSWORD must be set")
	}
	ms, err := loadMicrosoft(cfg.WebOrigin)
	if err != nil {
		return cfg, err
	}
	cfg.Microsoft = ms
	if cfg.AuthMode == AuthModeEntra {
		if err := ms.validateEntra(); err != nil {
			return cfg, err
		}
	}
	return cfg, nil
}

func databaseURLFromParts() string {
	password := os.Getenv("POSTGRES_PASSWORD")
	if password == "" {
		return ""
	}
	u := url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(env("POSTGRES_USER", "dfpmp"), password),
		Host:     env("POSTGRES_HOST", "localhost") + ":" + env("POSTGRES_PORT", "5432"),
		Path:     env("POSTGRES_DB", "dfpmp"),
		RawQuery: "sslmode=" + env("POSTGRES_SSLMODE", "disable"),
	}
	return u.String()
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}
