package llm

import (
	"testing"

	"github.com/peepal/installer/internal/sysinfo"
)

func TestRecommend(t *testing.T) {
	cases := []struct {
		name  string
		ram   uint64
		vram  uint64
		model string
	}{
		{"workstation", 64 * gb, 0, "llama3.1:8b"},
		{"gaming laptop", 16 * gb, 8 * gb, "llama3.1:8b"},
		{"office desktop", 16 * gb, 0, "llama3.2:3b"},
		{"thin client", 8 * gb, 0, "llama3.2:1b"},
		{"too small", 4 * gb, 0, ""},
	}
	for _, c := range cases {
		tier, ok := Recommend(sysinfo.Machine{RAMBytes: c.ram, VRAMBytes: c.vram})
		got := ""
		if ok {
			got = tier.Model
		}
		if got != c.model {
			t.Errorf("%s: got %q, want %q", c.name, got, c.model)
		}
	}
}
