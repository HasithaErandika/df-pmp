package session

import (
	"bytes"
	"testing"
)

func TestSealerRoundTripAndPurposeBinding(t *testing.T) {
	s, err := NewSealer(bytes.Repeat([]byte{7}, 32))
	if err != nil {
		t.Fatal(err)
	}
	sealed, err := s.SealString("secret", "login")
	if err != nil {
		t.Fatal(err)
	}
	if plain, err := s.OpenString(sealed, "login"); err != nil || plain != "secret" {
		t.Fatalf("round trip: %q %v", plain, err)
	}
	if _, err := s.OpenString(sealed, "token"); err == nil {
		t.Fatal("a value sealed for one purpose must not open for another")
	}
	tampered := []byte(sealed)
	tampered[len(tampered)-2] ^= 1
	if _, err := s.OpenString(string(tampered), "login"); err == nil {
		t.Fatal("tampered value must not open")
	}
}

func TestHashIDIsStable(t *testing.T) {
	if !bytes.Equal(hashID("abc"), hashID("abc")) || bytes.Equal(hashID("abc"), hashID("abd")) {
		t.Fatal("hashID must be deterministic and distinct")
	}
}
