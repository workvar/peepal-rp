package graph

import "testing"

func TestDeviceLabel(t *testing.T) {
	cases := []struct {
		name string
		ua   string
		want string
	}{
		{"empty", "", "Unknown device"},
		{
			"chrome on macos",
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
			"Chrome on macOS",
		},
		{
			// Safari also says AppleWebKit but never "Chrome/".
			"safari on macos",
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
			"Safari on macOS",
		},
		{
			// Edge claims Chrome; the Edg/ token has to win.
			"edge on windows",
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0",
			"Edge on Windows",
		},
		{
			"firefox on linux",
			"Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
			"Firefox on Linux",
		},
		{
			// iPadOS reports "Mac OS X"; the iPad token has to be checked first.
			"safari on ipad",
			"Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Safari/604.1",
			"Safari on iPad",
		},
		{
			"chrome on android",
			"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36",
			"Chrome on Android",
		},
		{
			"native app",
			"Peepal/1.4.0 (iPhone; iOS 17.4)",
			"Peepal app on iPhone",
		},
		{"unrecognised", "curl/8.4.0", "Unknown device"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := deviceLabel(tc.ua); got != tc.want {
				t.Errorf("deviceLabel(%q) = %q, want %q", tc.ua, got, tc.want)
			}
		})
	}
}
