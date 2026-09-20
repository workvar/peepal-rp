package push

// message.go — what a push notification is, independent of who delivers it.
//
// Keeping the shape here rather than in the Expo client means the transport can
// be swapped (Expo now, FCM/APNs direct later) without every caller changing.

import "strings"

// Message is one notification addressed to one or more device tokens.
type Message struct {
	// To is the set of device tokens this message goes to. The sender chunks
	// them; callers do not need to.
	To []string
	// Title and Body are what the user sees on the lock screen.
	Title string
	Body  string
	// Data rides along silently and is what the app reads to deep-link into the
	// right screen. Keep it small: the payload limit is a few kilobytes, and
	// anything large belongs behind a fetch once the app opens.
	Data map[string]string
	// Category groups notifications for the OS ("fee", "leave", "clinical").
	// Android maps it to a channel, which is what gives the user per-category
	// control over sound and priority.
	Category string
	// Priority is "default" or "high". High wakes the device immediately and is
	// for time-critical clinical alerts only; overusing it is what gets an app
	// throttled by the platform.
	Priority string
	// Badge sets the iOS app icon count. Nil leaves it untouched.
	Badge *int
}

// DeepLink is the conventional data key the mobile app reads to decide which
// screen to open. Kept here so server and client cannot drift on the spelling.
const DeepLink = "url"

// Valid reports whether a message is worth sending. A notification with no
// recipients or no title is a bug upstream, and sending it just burns quota.
func (m Message) Valid() bool {
	return len(m.To) > 0 && strings.TrimSpace(m.Title) != ""
}

// normalisePriority keeps the wire value to what the service accepts.
func (m Message) normalisePriority() string {
	if strings.ToLower(m.Priority) == "high" {
		return "high"
	}
	return "default"
}
