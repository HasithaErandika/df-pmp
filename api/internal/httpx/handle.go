package httpx

import "net/http"

// Respond runs fn and writes its result with status, or maps its error via Fail.
func Respond[T any](w http.ResponseWriter, r *http.Request, status int, fn func() (T, error)) {
	value, err := fn()
	if err != nil {
		Fail(w, r, err)
		return
	}
	JSON(w, status, value)
}

// NoContent runs fn and writes 204, or maps its error via Fail.
func NoContent(w http.ResponseWriter, r *http.Request, fn func() error) {
	if err := fn(); err != nil {
		Fail(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DecodeValid decodes the body into a new In and validates it with validate.
func DecodeValid[In any, Out any](w http.ResponseWriter, r *http.Request, validate func(In) (Out, error)) (Out, error) {
	var in In
	if err := Decode(w, r, &in); err != nil {
		var zero Out
		return zero, err
	}
	return validate(in)
}
