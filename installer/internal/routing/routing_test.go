package routing

import (
	"testing"

	"github.com/peepal/installer/internal/appdef"
)

func spec() appdef.Spec {
	return appdef.Spec{Routing: appdef.Routing{
		HTTPPort: 80, PublicURLVar: "APP_URL", CookieDomainVar: "COOKIE_DOMAIN",
	}}
}

func TestLocalLeavesCookieDomainEmpty(t *testing.T) {
	// A cookie domain of "localhost" breaks login on the machine itself, so
	// this is the one that must never regress.
	p, err := Resolve(spec(), Choice{Mode: LocalMode})
	if err != nil {
		t.Fatal(err)
	}
	if p.CookieDomain != "" {
		t.Errorf("cookie domain = %q, want empty", p.CookieDomain)
	}
	if p.PublicURL != "http://localhost" {
		t.Errorf("public URL = %q", p.PublicURL)
	}
	if got := p.Env(spec().Routing)["COOKIE_DOMAIN"]; got != "" {
		t.Errorf("COOKIE_DOMAIN = %q, want empty", got)
	}
}

func TestNonDefaultPortAppearsInURL(t *testing.T) {
	p, _ := Resolve(spec(), Choice{Mode: LocalMode, Port: 8080})
	if p.PublicURL != "http://localhost:8080" {
		t.Errorf("public URL = %q", p.PublicURL)
	}
}

func TestDomainNormalisesInput(t *testing.T) {
	p, err := Resolve(spec(), Choice{Mode: DomainMode, Domain: "HTTPS://ERP.College.edu/", TLS: true, Port: 443})
	if err != nil {
		t.Fatal(err)
	}
	if p.Domain != "erp.college.edu" {
		t.Errorf("domain = %q", p.Domain)
	}
	if p.PublicURL != "https://erp.college.edu" {
		t.Errorf("public URL = %q", p.PublicURL)
	}
}

func TestBadDomainsRejected(t *testing.T) {
	for _, d := range []string{"", "localhost", "erp college.edu", "-bad.edu", "a..b"} {
		if err := ValidateDomain(d); err == nil {
			t.Errorf("ValidateDomain(%q) should fail", d)
		}
	}
}
