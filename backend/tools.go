//go:build tools

// Pins build-time tooling (gqlgen) so `go mod tidy` keeps its dependencies
// in go.sum. Never compiled into the server binary.
package main

import (
	_ "github.com/99designs/gqlgen"
	_ "github.com/99designs/gqlgen/graphql/introspection"
)
