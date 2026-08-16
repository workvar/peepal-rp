package updater

import (
	"testing"
	"time"

	"github.com/peepal/installer/internal/appconfig"
)

func TestInWindow(t *testing.T) {
	at := func(h int) time.Time { return time.Date(2026, 8, 2, h, 30, 0, 0, time.Local) }

	cases := []struct {
		name       string
		start, end int
		hour       int
		want       bool
	}{
		{"disabled window always allows", 0, 0, 13, true},
		{"inside overnight window", 2, 5, 3, true},
		{"outside overnight window", 2, 5, 13, false},
		{"wrapping window, before midnight", 22, 4, 23, true},
		{"wrapping window, after midnight", 22, 4, 1, true},
		{"wrapping window, daytime", 22, 4, 12, false},
	}
	for _, c := range cases {
		u := &Updater{Cfg: appconfig.Config{Updates: appconfig.UpdateConfig{
			WindowStartHour: c.start, WindowEndHour: c.end,
		}}}
		if got := u.inWindow(at(c.hour)); got != c.want {
			t.Errorf("%s: got %v, want %v", c.name, got, c.want)
		}
	}
}
