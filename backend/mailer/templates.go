package mailer

// Registry of the system email types a super admin can customise. Each type has
// a stable Key, the variables it exposes (with samples for preview), and a
// built-in default subject/body used until an override is saved. Adding a new
// system email is a matter of appending a TemplateDef here and calling
// SendTemplated with its key.

// TemplateVar documents one placeholder a template may use.
type TemplateVar struct {
	Name        string `json:"name"`        // e.g. "userName" → {{userName}}
	Description string `json:"description"`
	Sample      string `json:"sample"`      // used for preview / test sends
}

// TemplateDef is a system email type plus its built-in default content.
type TemplateDef struct {
	Key            string        `json:"key"`
	Name           string        `json:"name"`
	Description    string        `json:"description"`
	Vars           []TemplateVar `json:"vars"`
	DefaultSubject string        `json:"defaultSubject"`
	DefaultHTML    string        `json:"defaultHtml"`
	DefaultText    string        `json:"defaultText"`
}

const (
	TemplateInvite  = "invite"
	TemplateWelcome = "welcome"
)

var templateDefs = []TemplateDef{
	{
		Key:         TemplateInvite,
		Name:        "Account invite",
		Description: "Sent when an account is created without a password — invites the user to set their own.",
		Vars: []TemplateVar{
			{Name: "userName", Description: "Recipient's name", Sample: "Jordan"},
			{Name: "tenantName", Description: "Organisation name", Sample: "Springfield College"},
			{Name: "acceptUrl", Description: "Password-setup link", Sample: "https://app.example.com/springfield/accept-invite?token=demo"},
		},
		DefaultSubject: "You're invited to {{tenantName}}",
		DefaultHTML:    inviteDefaultHTML,
		DefaultText:    inviteDefaultText,
	},
	{
		Key:         TemplateWelcome,
		Name:        "Welcome",
		Description: "Sent after a user accepts their invite and sets a password.",
		Vars: []TemplateVar{
			{Name: "userName", Description: "Recipient's name", Sample: "Jordan"},
			{Name: "tenantName", Description: "Organisation name", Sample: "Springfield College"},
			{Name: "loginUrl", Description: "Sign-in link", Sample: "https://app.example.com/springfield/login"},
		},
		DefaultSubject: "Welcome to {{tenantName}}",
		DefaultHTML:    welcomeDefaultHTML,
		DefaultText:    welcomeDefaultText,
	},
}

// Templates returns all customisable email types.
func Templates() []TemplateDef { return templateDefs }

// TemplateByKey returns one type's definition.
func TemplateByKey(key string) (TemplateDef, bool) {
	for _, d := range templateDefs {
		if d.Key == key {
			return d, true
		}
	}
	return TemplateDef{}, false
}

// SampleVars builds a preview/test variable map from a definition's samples.
func SampleVars(def TemplateDef) map[string]string {
	m := make(map[string]string, len(def.Vars))
	for _, v := range def.Vars {
		m[v.Name] = v.Sample
	}
	return m
}

const inviteDefaultText = `Hello {{userName}},

An account has been created for you on {{tenantName}}.
Set your password to activate it:

{{acceptUrl}}

This link expires soon. If you weren't expecting this, you can ignore this email.`

const inviteDefaultHTML = `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Segoe UI,Helvetica,Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
  <div style="background:#fff;border-radius:14px;padding:32px;border:1px solid #e6e8eb">
    <h1 style="margin:0 0 12px;font-size:20px;color:#111">Set up your account</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151">Hello {{userName}}, an account was created for you on <strong>{{tenantName}}</strong>. Click below to choose your password and sign in.</p>
    <p style="margin:24px 0">
      <a href="{{acceptUrl}}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:15px;font-weight:600;display:inline-block">Set my password</a>
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#6b7280">Or paste this link into your browser:<br><a href="{{acceptUrl}}" style="color:#4f46e5;word-break:break-all">{{acceptUrl}}</a></p>
    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">This link expires soon. If you weren't expecting this, you can safely ignore this email.</p>
  </div>
</div></body></html>`

const welcomeDefaultText = `Hello {{userName}},

Your account on {{tenantName}} is ready. Sign in any time:

{{loginUrl}}`

const welcomeDefaultHTML = `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Segoe UI,Helvetica,Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
  <div style="background:#fff;border-radius:14px;padding:32px;border:1px solid #e6e8eb">
    <h1 style="margin:0 0 12px;font-size:20px;color:#111">You're all set 🎉</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151">Hello {{userName}}, your account on <strong>{{tenantName}}</strong> is ready to use.</p>
    <p style="margin:24px 0">
      <a href="{{loginUrl}}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:15px;font-weight:600;display:inline-block">Sign in</a>
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#6b7280">Or visit:<br><a href="{{loginUrl}}" style="color:#4f46e5;word-break:break-all">{{loginUrl}}</a></p>
  </div>
</div></body></html>`
