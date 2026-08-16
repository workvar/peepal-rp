// Command peepal-panel is the graphical control panel. It installs the
// application described by an app.yml, then stays on as the management
// console for it: services, logs, updates and the link to the developer's
// monitoring hub.
//
// The same binary runs headless (-headless) as the background service, so the
// panel and the service can never disagree about how the stack is run.
package main

import (
	"embed"
	"flag"
	"fmt"
	"os"

	"github.com/peepal/installer/internal/buildinfo"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	var (
		configPath  = flag.String("config", "", "path to the app definition (app.yml)")
		headless    = flag.Bool("headless", false, "run the stack without a window; used by the service")
		showVersion = flag.Bool("version", false, "print the panel version and exit")
	)
	flag.Parse()

	if *showVersion {
		fmt.Println(buildinfo.Version)
		return
	}

	app := NewApp(*configPath)

	if *headless {
		if err := app.RunHeadless(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}

	err := wails.Run(&options.App{
		Title:            app.WindowTitle(),
		Width:            1180,
		Height:           760,
		MinWidth:         960,
		MinHeight:        620,
		AssetServer:      &assetserver.Options{Assets: assets},
		BackgroundColour: &options.RGBA{R: 15, G: 18, B: 24, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind:             []any{app},
	})
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
