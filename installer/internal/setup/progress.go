// Package setup performs the installation itself: prerequisites, checkouts,
// database, environment, build and service registration. It reports progress
// through a callback so the same code drives the graphical wizard and a
// headless run.
package setup

// Phase is one stage of the install, in the order they run.
type Phase string

const (
	PhasePreflight Phase = "preflight"
	PhaseToolchain Phase = "toolchain"
	PhaseClone     Phase = "clone"
	PhaseDatabase  Phase = "database"
	PhaseEnv       Phase = "environment"
	PhaseBuild     Phase = "build"
	PhaseService   Phase = "service"
	PhaseDone      Phase = "done"
)

// Phases is the ordered list the wizard renders as a checklist.
var Phases = []Phase{
	PhasePreflight, PhaseToolchain, PhaseClone, PhaseDatabase,
	PhaseEnv, PhaseBuild, PhaseService, PhaseDone,
}

// Title is the human-readable name of a phase.
func (p Phase) Title() string {
	switch p {
	case PhasePreflight:
		return "Checking the machine"
	case PhaseToolchain:
		return "Installing prerequisites"
	case PhaseClone:
		return "Fetching the source"
	case PhaseDatabase:
		return "Preparing the database"
	case PhaseEnv:
		return "Writing configuration"
	case PhaseBuild:
		return "Building the application"
	case PhaseService:
		return "Registering the service"
	case PhaseDone:
		return "Finished"
	}
	return string(p)
}

// Update is one progress message.
type Update struct {
	Phase Phase  `json:"phase"`
	Title string `json:"title"`
	Line  string `json:"line"`
	// Percent is 0-100 across the whole install, not within the phase.
	Percent int `json:"percent"`
	// Failed marks the message as the reason the install stopped.
	Failed bool `json:"failed"`
	Done   bool `json:"done"`
}

// Reporter receives progress. The panel forwards these straight to the UI.
type Reporter func(Update)

// reporter wraps a Reporter with the current phase, so callers just log lines.
type reporter struct {
	send  Reporter
	phase Phase
	idx   int
}

func (r *reporter) enter(p Phase) {
	r.phase = p
	for i, ph := range Phases {
		if ph == p {
			r.idx = i
		}
	}
	r.line("")
}

func (r *reporter) line(format string, a ...any) {
	if r.send == nil {
		return
	}
	msg := format
	if len(a) > 0 {
		msg = sprintf(format, a...)
	}
	r.send(Update{
		Phase:   r.phase,
		Title:   r.phase.Title(),
		Line:    msg,
		Percent: r.idx * 100 / (len(Phases) - 1),
	})
}

func (r *reporter) fail(err error) {
	if r.send == nil {
		return
	}
	r.send(Update{Phase: r.phase, Title: r.phase.Title(),
		Line: err.Error(), Failed: true, Percent: r.idx * 100 / (len(Phases) - 1)})
}

func (r *reporter) done() {
	if r.send == nil {
		return
	}
	r.send(Update{Phase: PhaseDone, Title: PhaseDone.Title(),
		Line: "Installation complete.", Percent: 100, Done: true})
}
