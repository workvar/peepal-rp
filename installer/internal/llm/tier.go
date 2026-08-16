// Package llm decides whether a machine can run Ask PeepalAI locally and, if
// so, which Llama model fits, then installs Ollama and pulls that model.
package llm

import (
	"fmt"

	"github.com/peepal/installer/internal/sysinfo"
)

const gb = 1 << 30

// Tier is one supported local model together with the hardware it needs.
type Tier struct {
	Model string
	// MinRAMBytes is the total system memory required.
	MinRAMBytes uint64
	// DiskBytes is roughly how much the model weights occupy.
	DiskBytes uint64
	Quality   string
}

// tiers are ordered best-first; the first one the machine satisfies wins.
var tiers = []Tier{
	{Model: "llama3.1:8b", MinRAMBytes: 32 * gb, DiskBytes: 5 * gb, Quality: "best SQL accuracy"},
	{Model: "llama3.2:3b", MinRAMBytes: 16 * gb, DiskBytes: 2 * gb, Quality: "good for common questions"},
	{Model: "llama3.2:1b", MinRAMBytes: 8 * gb, DiskBytes: 2 * gb, Quality: "basic; simple questions only"},
}

// Recommend picks the largest model the machine can run. ok is false when the
// hardware cannot support any model, in which case the AI feature is left off.
func Recommend(m sysinfo.Machine) (Tier, bool) {
	for _, t := range tiers {
		if qualifies(m, t) {
			return t, true
		}
	}
	return Tier{}, false
}

// qualifies applies the RAM rule, with a discrete-GPU shortcut: 8 GB of VRAM
// runs the 8b model comfortably even on a 16 GB host.
func qualifies(m sysinfo.Machine, t Tier) bool {
	if m.RAMBytes >= t.MinRAMBytes {
		return true
	}
	if t.Model == "llama3.1:8b" && m.VRAMBytes >= 8*gb {
		return true
	}
	return false
}

// Explain renders the decision for the console.
func Explain(m sysinfo.Machine) string {
	t, ok := Recommend(m)
	if !ok {
		return fmt.Sprintf("%.1f GB RAM is below the 8 GB minimum for a local model; AI answers will stay disabled.", m.RAMGB())
	}
	return fmt.Sprintf("%s fits this machine (%s).", t.Model, t.Quality)
}

// Models lists every supported tag, for the uninstaller and for docs.
func Models() []string {
	out := make([]string, 0, len(tiers))
	for _, t := range tiers {
		out = append(out, t.Model)
	}
	return out
}
