package mailer

import (
	"strings"
	"testing"
)

func TestRenderSubstitutesAndEscapes(t *testing.T) {
	vars := map[string]string{
		"userName":   "A & B <script>",
		"tenantName": "Acme",
		"acceptUrl":  "https://x/y?token=z",
	}
	r := Render(
		"Hi {{userName}} at {{tenantName}}",
		`<p>{{userName}}</p><a href="{{acceptUrl}}">go</a>`,
		"plain {{userName}} {{acceptUrl}}",
		vars,
	)

	// Subject + text keep the raw value; HTML escapes it.
	if r.Subject != "Hi A & B <script> at Acme" {
		t.Errorf("subject not substituted raw: %q", r.Subject)
	}
	if !strings.Contains(r.HTML, "A &amp; B &lt;script&gt;") {
		t.Errorf("HTML value not escaped: %q", r.HTML)
	}
	if strings.Contains(r.HTML, "<script>") {
		t.Errorf("unescaped script tag leaked into HTML: %q", r.HTML)
	}
	if !strings.Contains(r.Text, "plain A & B <script>") {
		t.Errorf("text value should be raw: %q", r.Text)
	}
}

func TestSampleVarsCoverAllPlaceholders(t *testing.T) {
	for _, def := range Templates() {
		vars := SampleVars(def)
		r := Render(def.DefaultSubject, def.DefaultHTML, def.DefaultText, vars)
		for _, body := range []string{r.Subject, r.HTML, r.Text} {
			if strings.Contains(body, "{{") {
				t.Errorf("template %q has an unfilled placeholder after sample render: %q", def.Key, body)
			}
		}
	}
}
