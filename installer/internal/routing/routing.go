// Package routing answers the second setup question: how do people reach
// this installation. Either on the machine itself (http://localhost:PORT) or
// on a real hostname, in which case the environment has to carry that name
// into cookies, callbacks and absolute links.
package routing

import (
	"fmt"
	"net"
	"strconv"
	"strings"

	"github.com/peepal/installer/internal/appdef"
)

// Mode is the operator's choice.
type Mode string

const (
	// LocalMode serves on the machine's own address only.
	LocalMode Mode = "local"
	// DomainMode serves a public hostname, optionally with TLS.
	DomainMode Mode = "domain"
)

// Choice is what the wizard collects.
type Choice struct {
	Mode Mode `json:"mode"`
	// Domain is required in DomainMode, e.g. erp.college.edu.
	Domain string `json:"domain"`
	// TLS turns on the built-in certificate manager for Domain.
	TLS bool `json:"tls"`
	// Port is the front-door port; 80 unless something else owns it.
	Port int `json:"port"`
}

// Plan is the resolved routing, ready to be written into the environment.
type Plan struct {
	Mode         Mode   `json:"mode"`
	Domain       string `json:"domain"`
	TLS          bool   `json:"tls"`
	Port         int    `json:"port"`
	PublicURL    string `json:"public_url"`
	CookieDomain string `json:"cookie_domain"`
	// LANURL is the address other machines on the network can use, which is
	// what an operator actually needs to type into a second computer.
	LANURL string `json:"lan_url"`
}

// Resolve turns a choice into a plan, filling in the defaults from the spec.
func Resolve(spec appdef.Spec, c Choice) (Plan, error) {
	p := Plan{Mode: c.Mode, Port: c.Port, TLS: c.TLS}
	if p.Mode == "" {
		p.Mode = LocalMode
	}
	if p.Port == 0 {
		p.Port = spec.Routing.HTTPPort
	}
	if p.Port == 0 {
		p.Port = 80
	}

	if p.Mode == DomainMode {
		domain := strings.TrimSpace(strings.ToLower(c.Domain))
		domain = strings.TrimPrefix(strings.TrimPrefix(domain, "https://"), "http://")
		domain = strings.TrimSuffix(domain, "/")
		if err := ValidateDomain(domain); err != nil {
			return Plan{}, err
		}
		p.Domain = domain
		scheme := "http"
		if p.TLS {
			scheme = "https"
		}
		p.PublicURL = scheme + "://" + domain + portSuffix(scheme, p.Port)
		// A leading dot would break the login cookie on a bare hostname, so
		// the domain is used exactly as typed.
		p.CookieDomain = domain
		p.LANURL = p.PublicURL
		return p, nil
	}

	p.PublicURL = "http://localhost" + portSuffix("http", p.Port)
	// Deliberately empty: a cookie domain of "localhost" is rejected by
	// several browsers and breaks login on the machine itself.
	p.CookieDomain = ""
	p.LANURL = "http://" + LocalAddress() + portSuffix("http", p.Port)
	return p, nil
}

// Env returns the environment entries the plan contributes, keyed by the
// variable names the definition nominated.
func (p Plan) Env(r appdef.Routing) map[string]string {
	out := map[string]string{}
	if r.PublicURLVar != "" {
		out[r.PublicURLVar] = p.PublicURL
	}
	if r.CookieDomainVar != "" {
		out[r.CookieDomainVar] = p.CookieDomain
	}
	return out
}

// ValidateDomain catches the typos that only surface when a certificate fails
// to issue days later.
func ValidateDomain(d string) error {
	if d == "" {
		return fmt.Errorf("enter a domain, for example erp.college.edu")
	}
	if strings.ContainsAny(d, " /\\:?#") {
		return fmt.Errorf("%q is not a plain hostname", d)
	}
	if !strings.Contains(d, ".") {
		return fmt.Errorf("%q has no dot; a public certificate needs a real domain", d)
	}
	for _, label := range strings.Split(d, ".") {
		if label == "" {
			return fmt.Errorf("%q has an empty label", d)
		}
		if strings.HasPrefix(label, "-") || strings.HasSuffix(label, "-") {
			return fmt.Errorf("%q has a label starting or ending with a hyphen", d)
		}
	}
	return nil
}

// LocalAddress finds this machine's LAN address without sending a packet.
func LocalAddress() string {
	conn, err := net.Dial("udp", "8.8.8.8:53")
	if err == nil {
		defer conn.Close()
		if a, ok := conn.LocalAddr().(*net.UDPAddr); ok {
			return a.IP.String()
		}
	}
	return "127.0.0.1"
}

// portSuffix omits the default port so the URL reads naturally.
func portSuffix(scheme string, port int) string {
	if (scheme == "http" && port == 80) || (scheme == "https" && port == 443) {
		return ""
	}
	return ":" + strconv.Itoa(port)
}
