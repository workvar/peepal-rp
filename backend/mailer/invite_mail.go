package mailer

// Invite and welcome email composition now lives in the template registry
// (templates.go) and is rendered + sent via SendTemplated (render.go). URL
// builders are in urls.go. This file is intentionally left as a package marker
// so the previous hard-coded composition no longer duplicates those symbols.
