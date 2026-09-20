package mailer

import (
	"fmt"
	"net/url"
	"strings"

	"collegeerp/config"
)

// BuildAcceptURL returns the public link a user follows to set their password.
// Invites are tenant-scoped, so the path is namespaced by subdomain to match
// the rest of the tenant routing. The subdomain is path-escaped defensively;
// the token is hex so it needs none.
func BuildAcceptURL(subdomain, rawToken string) string {
	return tenantURL(subdomain, "accept-invite") + "?token=" + rawToken
}

// BuildLoginURL returns the tenant's sign-in page.
func BuildLoginURL(subdomain string) string {
	return tenantURL(subdomain, "login")
}

func tenantURL(subdomain, page string) string {
	base := strings.TrimRight(config.App.AppBaseURL, "/")
	return fmt.Sprintf("%s/%s/%s", base, url.PathEscape(subdomain), page)
}
