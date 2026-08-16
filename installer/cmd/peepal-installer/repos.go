package main

import "github.com/peepal/installer/internal/buildinfo"

// The repository slugs and channel are stamped in at build time, but stay
// overridable through the environment for internal testing.
func repoBackend() string  { return envOr("PEEPAL_BACKEND_REPO", buildinfo.BackendRepo) }
func repoFrontend() string { return envOr("PEEPAL_FRONTEND_REPO", buildinfo.FrontendRepo) }
func channel() string      { return envOr("PEEPAL_CHANNEL", buildinfo.Channel) }
func token() string        { return envOr("PEEPAL_TOKEN", buildinfo.Token) }
