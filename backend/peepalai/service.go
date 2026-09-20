package peepalai

import (
	"context"
	"errors"
	"strings"

	"gorm.io/gorm"
)

// Result of one Ask PeepalAI request.
type Result struct {
	Answer  string     // short natural-language answer (may be empty)
	SQL     string     // the generated SELECT that was run ("" when denied/failed)
	Columns []string   // result columns
	Rows    [][]string // result rows as strings
	Denied  bool       // true when the request was blocked by permissions
	Message string     // denial or error message for the user
}

// DeniedMessage is the exact permission message shown to users.
const DeniedMessage = "You do not have permission to access that data"

// Ask runs the full pipeline: build grants → generate SQL with the local
// Ollama model → strictly validate it against the grants → execute read-only
// against scoped CTEs → summarise. All permission failures return a Result
// with Denied=true and the exact denial message; only infrastructure
// problems return an error.
func Ask(ctx context.Context, db *gorm.DB, user UserContext, canView, entitled func(module string) bool, question string) Result {
	question = strings.TrimSpace(question)
	if question == "" {
		return Result{Message: "Please ask a question."}
	}
	if len(question) > 2000 {
		return Result{Message: "That question is too long."}
	}

	grants, err := BuildGrants(db, user, canView, entitled)
	if err != nil {
		return Result{Message: "PeepalAI could not read the data catalog."}
	}
	if len(grants) == 0 {
		return Result{Denied: true, Message: DeniedMessage}
	}

	// 1. NL → SQL via local Ollama.
	reply, err := ollamaChat(ctx, sqlSystemPrompt(user, grants), question)
	if err != nil {
		return Result{Message: err.Error()}
	}
	if strings.Contains(reply, cannotAnswer) {
		return Result{Denied: true, Message: DeniedMessage}
	}
	genSQL := cleanModelSQL(reply)
	if genSQL == "" {
		return Result{Message: "PeepalAI could not translate that question into a query."}
	}

	// 2. Strict validation against the caller's grants.
	granted := make(map[string]bool, len(grants))
	for _, g := range grants {
		granted[strings.ToLower(g.Spec.Name)] = true
	}
	universe, err := allTableNames(db)
	if err != nil {
		return Result{Message: "PeepalAI could not read the data catalog."}
	}
	if err := validateSQL(genSQL, granted, universe); err != nil {
		if errors.Is(err, ErrDenied) {
			return Result{SQL: genSQL, Denied: true, Message: DeniedMessage}
		}
		return Result{SQL: genSQL, Message: "PeepalAI generated an unsafe query and it was blocked."}
	}

	// 3. Execute inside scoped CTEs, read-only, capped.
	prelude, args := ctePrelude(grants)
	wrapped := prelude + "\nSELECT * FROM (\n" + genSQL + "\n) AS " + resultAlias + " LIMIT 200"
	columns, rows, err := runReadOnly(db, wrapped, args)
	if err != nil {
		return Result{SQL: genSQL, Message: "The generated query could not be executed. Try rephrasing your question."}
	}

	res := Result{SQL: genSQL, Columns: columns, Rows: rows}

	// 4. Short textual answer (best effort; table is the source of truth).
	if len(rows) <= 30 {
		if answer, err := ollamaChat(ctx, summarySystemPrompt, summaryUserPrompt(question, columns, rows)); err == nil {
			res.Answer = strings.TrimSpace(answer)
		}
	}
	return res
}
