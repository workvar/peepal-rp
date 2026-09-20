package graph

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/99designs/gqlgen/graphql"
	"github.com/vektah/gqlparser/v2/gqlerror"
)

var (
	ErrForbidden    = errors.New("forbidden")
	ErrNotFound     = errors.New("not found")
	ErrUnauthorized = errors.New("unauthorized")
	ErrValidation   = errors.New("validation error")
)

// errorPresenter maps sentinel errors to GraphQL errors with extension codes.
// Attach to the gqlgen server via srv.SetErrorPresenter(errorPresenter).
func errorPresenter(ctx context.Context, err error) *gqlerror.Error {
	switch {
	case errors.Is(err, ErrForbidden):
		return &gqlerror.Error{
			Message:    "forbidden",
			Extensions: map[string]interface{}{"code": "FORBIDDEN"},
		}
	case errors.Is(err, ErrNotFound):
		return &gqlerror.Error{
			Message:    "not found",
			Extensions: map[string]interface{}{"code": "NOT_FOUND"},
		}
	case errors.Is(err, ErrUnauthorized):
		return &gqlerror.Error{
			Message:    "unauthorized",
			Extensions: map[string]interface{}{"code": "UNAUTHORIZED"},
		}
	case errors.Is(err, ErrValidation):
		// GQLErr wraps the specific message as "validation error: <msg>".
		// Surface that message to the client, not the generic sentinel.
		msg := strings.TrimPrefix(err.Error(), ErrValidation.Error()+": ")
		if msg == "" {
			msg = "validation error"
		}
		return &gqlerror.Error{
			Message:    msg,
			Extensions: map[string]interface{}{"code": "VALIDATION_ERROR"},
		}
	default:
		return graphql.DefaultErrorPresenter(ctx, err)
	}
}

// GQLErr wraps a message string in ErrValidation so the error presenter
// forwards it to the client with code VALIDATION_ERROR.
func GQLErr(msg string) error {
	return fmt.Errorf("%w: %s", ErrValidation, msg)
}
