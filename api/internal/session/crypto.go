// Package session stores server-side sessions and encrypted OAuth tokens (backend-for-frontend).
package session

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
)

// Sealer encrypts small secrets with AES-256-GCM. The nonce is prepended to the ciphertext.
type Sealer struct{ aead cipher.AEAD }

// NewSealer builds a Sealer from a 32-byte key.
func NewSealer(key []byte) (*Sealer, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &Sealer{aead: aead}, nil
}

// Seal encrypts plaintext, binding it to purpose so a value sealed for one use can't be replayed in another.
func (s *Sealer) Seal(plaintext []byte, purpose string) ([]byte, error) {
	nonce := make([]byte, s.aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	return s.aead.Seal(nonce, nonce, plaintext, []byte(purpose)), nil
}

// Open decrypts a value produced by Seal with the same purpose.
func (s *Sealer) Open(sealed []byte, purpose string) ([]byte, error) {
	size := s.aead.NonceSize()
	if len(sealed) < size {
		return nil, errors.New("sealed value too short")
	}
	return s.aead.Open(nil, sealed[:size], sealed[size:], []byte(purpose))
}

// SealString seals and base64url-encodes text, for use in cookies.
func (s *Sealer) SealString(text, purpose string) (string, error) {
	sealed, err := s.Seal([]byte(text), purpose)
	return base64.RawURLEncoding.EncodeToString(sealed), err
}

// OpenString reverses SealString.
func (s *Sealer) OpenString(value, purpose string) (string, error) {
	raw, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		return "", err
	}
	plain, err := s.Open(raw, purpose)
	return string(plain), err
}

// RandomToken returns n random bytes, base64url-encoded.
func RandomToken(n int) string {
	buf := make([]byte, n)
	_, _ = rand.Read(buf)
	return base64.RawURLEncoding.EncodeToString(buf)
}

func hashID(id string) []byte {
	sum := sha256.Sum256([]byte(id))
	return sum[:]
}
