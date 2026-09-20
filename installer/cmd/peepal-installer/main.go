// Command peepal-installer sets up the Peepal ERP on a customer's machine:
// it provisions PostgreSQL, downloads the latest backend and frontend
// releases, optionally sets up a local AI model, registers a background
// service and leaves the app serving on http://localhost.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/peepal/installer/internal/buildinfo"
	"github.com/peepal/installer/internal/paths"
	"github.com/peepal/installer/internal/ui"
)

func main() {
	opts := parseFlags()
	if opts.ShowVersion {
		fmt.Printf("peepal-installer %s (backend %s, frontend %s, channel %s)\n",
			buildinfo.Version, buildinfo.BackendRepo, buildinfo.FrontendRepo, buildinfo.Channel)
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
		<-sig
		fmt.Println("\n  Cancelled. Nothing else will be changed.")
		cancel()
		os.Exit(130)
	}()

	if opts.Uninstall {
		uninstall(ctx, opts)
		return
	}
	install(ctx, opts)
}

// Options are the installer's command-line switches. Every prompt has a flag
// so the whole thing can run unattended from a deployment script.
type Options struct {
	Dir           string
	HTTPPort      int
	AdminEmail    string
	AdminPassword string
	AI            string // auto, yes or no
	BackendTag    string
	FrontendTag   string
	Unattended    bool
	Uninstall     bool
	KeepData      bool
	ShowVersion   bool
	RPILocal      bool
}

func parseFlags() Options {
	var o Options
	flag.StringVar(&o.Dir, "dir", paths.Default().Root, "installation directory")
	flag.IntVar(&o.HTTPPort, "port", 80, "port the application is served on")
	flag.StringVar(&o.AdminEmail, "admin-email", "", "email address of the first super-admin account")
	flag.StringVar(&o.AdminPassword, "admin-password", "", "password for the first super-admin account")
	flag.StringVar(&o.AI, "ai", "auto", "local AI assistant: auto, yes or no")
	flag.StringVar(&o.BackendTag, "backend-tag", "", "pin the backend to a specific release tag")
	flag.StringVar(&o.FrontendTag, "frontend-tag", "", "pin the frontend to a specific release tag")
	flag.BoolVar(&o.Unattended, "unattended", false, "never prompt; requires --admin-email and --admin-password")
	flag.BoolVar(&o.Uninstall, "uninstall", false, "remove the service and the installed files")
	flag.BoolVar(&o.KeepData, "keep-data", true, "keep the database and uploads when uninstalling")
	flag.BoolVar(&o.ShowVersion, "version", false, "print the installer version and exit")
	flag.BoolVar(&o.RPILocal, "rpi-local", false, "enable http://raspberrypi.local (cookies, CORS, mDNS)")
	flag.Parse()
	return o
}

// banner is the first thing the customer sees.
func banner() {
	fmt.Printf(`
  ____                       _
 |  _ \ ___  ___ _ __   __ _| |
 | |_) / _ \/ _ \ '_ \ / _' | |
 |  __/  __/  __/ |_) | (_| | |
 |_|   \___|\___| .__/ \__,_|_|   installer %s
                |_|
`, buildinfo.Version)
	ui.Info("This sets up Peepal to run on this computer and keeps it updated.")
}
