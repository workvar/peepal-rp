package peepalai

import (
	"errors"
	"regexp"
	"strings"
)

// SQL guard — strict validation of model-generated SQL before execution.
// Defense in depth: even if something slips past, the query still runs inside
// a READ ONLY transaction with a statement timeout, against CTEs that shadow
// every granted table with its scoped variant.

// ErrDenied is surfaced to the user verbatim as the permission message.
var ErrDenied = errors.New("You do not have permission to access that data")

// errUnsafe covers structural problems that are not permission denials.
var errUnsafe = errors.New("the generated query was rejected for safety reasons")

var (
	reSelectStart = regexp.MustCompile(`(?is)^\s*select\b`)
	reFromJoin    = regexp.MustCompile(`(?is)\b(?:from|join)\s+([a-zA-Z_][a-zA-Z0-9_]*)`)
	reSchemaRef   = regexp.MustCompile(`(?is)"?\b(public|pg_catalog|pg_temp|information_schema)\b"?\s*\.`)
	rePgFunc      = regexp.MustCompile(`(?i)\bpg_[a-z0-9_]+`)
	rePlaceholder = regexp.MustCompile(`\?|\$\d`)
	reComment     = regexp.MustCompile(`--|/\*`)
	// Quoted / unicode-escaped identifiers can smuggle a real table name past
	// the bare-word table allowlist (e.g. U&"\0061udit_logs"). The model is
	// instructed to use bare identifiers only, so any of these is rejected.
	reQuotedIdent = regexp.MustCompile(`(?i)"|\bu&|\be'|\$\$|\bchr\s*\(|\bconvert_from\b`)
)

// set-returning functions that may legitimately follow FROM/JOIN.
var fromFuncAllowlist = map[string]bool{
	"lateral": true, "unnest": true, "generate_series": true,
}

// Whole-word keywords that must never appear in a read query.
var forbiddenKeywords = []string{
	"with", // the wrapper owns the WITH clause; nested CTEs are rejected outright
	"insert", "update", "delete", "merge", "drop", "alter", "create", "truncate",
	"grant", "revoke", "copy", "vacuum", "reindex", "cluster", "comment",
	"do", "call", "execute", "prepare", "deallocate", "declare", "fetch",
	"listen", "notify", "set", "reset", "refresh", "lock", "into", "returning",
	"set_config", "dblink", "lo_import", "lo_export",
	"current_setting", "session_user", "current_user", "current_database",
	"version",
}

// cteNames are identifiers the wrapper itself introduces; the model must not
// reference or redefine them beyond the shadowed tables.
const resultAlias = "peepal_result"

// validateSQL checks the model's SQL against the caller's grants.
//   - returns ErrDenied when the query touches a table outside the grants
//     (the strict permission message the user sees);
//   - returns errUnsafe for structural violations (writes, comments, multiple
//     statements, schema-qualified names, placeholders).
func validateSQL(sql string, granted map[string]bool, universe []string) error {
	s := strings.TrimSpace(sql)
	s = strings.TrimSuffix(s, ";")
	if strings.Contains(s, ";") {
		return errUnsafe // multiple statements
	}
	if !reSelectStart.MatchString(s) {
		return errUnsafe
	}
	if reComment.MatchString(s) || rePlaceholder.MatchString(s) ||
		reSchemaRef.MatchString(s) || rePgFunc.MatchString(s) ||
		reQuotedIdent.MatchString(s) {
		return errUnsafe
	}

	lower := " " + strings.ToLower(s) + " "
	for _, kw := range forbiddenKeywords {
		if regexp.MustCompile(`\b` + kw + `\b`).MatchString(lower) {
			return errUnsafe
		}
	}

	// Every FROM/JOIN target must be a granted table.
	for _, m := range reFromJoin.FindAllStringSubmatch(s, -1) {
		name := strings.ToLower(m[1])
		if name == resultAlias {
			return errUnsafe
		}
		if fromFuncAllowlist[name] {
			continue
		}
		if !granted[name] {
			return ErrDenied
		}
	}

	// Any real table mentioned anywhere that is not granted is a denial —
	// catches comma-joins and other constructions the FROM/JOIN regex misses.
	for _, t := range universe {
		t = strings.ToLower(t)
		if granted[t] {
			continue
		}
		if regexp.MustCompile(`\b` + regexp.QuoteMeta(t) + `\b`).MatchString(lower) {
			return ErrDenied
		}
	}
	return nil
}

// cleanModelSQL strips markdown fences and surrounding prose from the model's
// reply, keeping the SELECT statement.
func cleanModelSQL(raw string) string {
	s := strings.TrimSpace(raw)
	if i := strings.Index(s, "```"); i >= 0 {
		s = s[i+3:]
		s = strings.TrimPrefix(s, "sql")
		if j := strings.Index(s, "```"); j >= 0 {
			s = s[:j]
		}
	}
	s = strings.TrimSpace(s)
	// Drop anything before the first SELECT (models sometimes add a preamble).
	if i := strings.Index(strings.ToUpper(s), "SELECT"); i > 0 {
		s = s[i:]
	}
	return strings.TrimSpace(strings.TrimSuffix(strings.TrimSpace(s), ";"))
}
