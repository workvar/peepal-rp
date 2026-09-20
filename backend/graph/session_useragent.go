package graph

// session_useragent.go — turning a User-Agent string into something a person
// can recognise in a session list.
//
// This is deliberately crude. The list exists so a user can answer one
// question: "is that me?" A rough "Chrome on macOS" answers it; a precise
// version string does not, and full UA parsing would pull in a dependency and a
// database that has to be kept current to stay accurate. When the guess fails
// we say "Unknown device" rather than showing the raw string, which is noise to
// everyone but a support engineer — the raw value is still returned alongside,
// for exactly that case.

import "strings"

// deviceLabel names a browser and platform from a User-Agent.
//
// Order matters throughout: Edge and Opera both claim to be Chrome, Chrome
// claims to be Safari, and iPadOS claims to be a Mac. Each check therefore has
// to come before the one it impersonates.
func deviceLabel(ua string) string {
	ua = strings.TrimSpace(ua)
	if ua == "" {
		return "Unknown device"
	}
	client := browserName(ua)
	platform := platformName(ua)
	switch {
	case client != "" && platform != "":
		return client + " on " + platform
	case client != "":
		return client
	case platform != "":
		return platform
	default:
		return "Unknown device"
	}
}

func browserName(ua string) string {
	l := strings.ToLower(ua)
	switch {
	// Our own native clients identify themselves first, so they never get
	// mislabelled by whatever webview they happen to embed.
	case strings.Contains(l, "peepal"):
		return "Peepal app"
	case strings.Contains(l, "expo"):
		return "Peepal app"
	case strings.Contains(l, "edg/"), strings.Contains(l, "edga/"), strings.Contains(l, "edgios/"):
		return "Edge"
	case strings.Contains(l, "opr/"), strings.Contains(l, "opera"):
		return "Opera"
	case strings.Contains(l, "firefox/"), strings.Contains(l, "fxios/"):
		return "Firefox"
	case strings.Contains(l, "chrome/"), strings.Contains(l, "crios/"):
		return "Chrome"
	case strings.Contains(l, "safari/"):
		return "Safari"
	default:
		return ""
	}
}

func platformName(ua string) string {
	l := strings.ToLower(ua)
	switch {
	case strings.Contains(l, "android"):
		return "Android"
	case strings.Contains(l, "iphone"):
		return "iPhone"
	case strings.Contains(l, "ipad"):
		return "iPad"
	case strings.Contains(l, "windows"):
		return "Windows"
	// "mac os x" also appears in the iPhone/iPad strings, which is why those
	// are matched above and not here.
	case strings.Contains(l, "mac os"), strings.Contains(l, "macintosh"):
		return "macOS"
	case strings.Contains(l, "cros"):
		return "ChromeOS"
	case strings.Contains(l, "linux"):
		return "Linux"
	default:
		return ""
	}
}
