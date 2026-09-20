package peepalai

import (
	"fmt"
	"strings"
	"time"
)

// Prompt building. The model is only ever shown the tables the caller may
// query; everything else does not exist as far as it is concerned. The guard
// re-checks the output regardless.

const cannotAnswer = "CANNOT_ANSWER"

func sqlSystemPrompt(user UserContext, grants []Grant) string {
	var b strings.Builder
	b.WriteString("You translate a user's question into exactly one PostgreSQL SELECT statement.\n")
	b.WriteString("You may ONLY use the tables and columns listed below. No other table exists.\n\n")
	b.WriteString("Tables:\n")
	for _, g := range grants {
		b.WriteString(fmt.Sprintf("- %s(%s)", g.Spec.Name, strings.Join(g.Columns, ", ")))
		if g.Spec.Desc != "" {
			b.WriteString(" — " + g.Spec.Desc)
		}
		b.WriteString("\n")
	}

	b.WriteString("\nCurrent user context (use for questions about \"me\"/\"my\"):\n")
	b.WriteString(fmt.Sprintf("- user id: %s\n- role: %s\n- name: %s\n", user.UserID, user.Role, user.Name))
	if user.StudentID != "" {
		b.WriteString(fmt.Sprintf("- students.id for this user: %s\n", user.StudentID))
	}
	if user.EmployeeID != "" {
		b.WriteString(fmt.Sprintf("- employees.id for this user: %s\n", user.EmployeeID))
	}
	if user.PatientID != "" {
		b.WriteString(fmt.Sprintf("- patients.id for this user: %s\n", user.PatientID))
	}
	b.WriteString(fmt.Sprintf("- today's date: %s\n", time.Now().Format("2006-01-02")))

	b.WriteString(`
Rules:
1. Output ONLY the SQL statement, no explanation, no markdown fences.
2. Exactly one SELECT statement. Never write data. No semicolons.
3. Do not use WITH, INTO, comments, parameters ($1, ?) or schema prefixes (public.).
4. Reference tables by bare name exactly as listed.
5. Use ILIKE '%...%' for text matching (names, subjects, diagnoses).
6. Prefer readable output: select human-friendly columns (names, dates, totals), use aggregates and ORDER BY when the question implies ranking or counting, and add LIMIT for top-N questions.
7. If the question cannot be answered from the listed tables, or asks about other users' private data the tables don't justify, reply with exactly: ` + cannotAnswer + "\n")
	return b.String()
}

// summarySystemPrompt asks the model to phrase the result as a short answer.
const summarySystemPrompt = `You summarise SQL query results for a user.
Write one or two short sentences answering the user's question from the data.
Use plain language and include the key numbers. Do not mention SQL or tables.
If the result is empty, say no matching records were found.`

func summaryUserPrompt(question string, columns []string, rows [][]string) string {
	var b strings.Builder
	b.WriteString("Question: " + question + "\n\nResult (CSV):\n")
	b.WriteString(strings.Join(columns, ",") + "\n")
	for i, r := range rows {
		if i >= 30 {
			b.WriteString(fmt.Sprintf("... (%d more rows)\n", len(rows)-30))
			break
		}
		b.WriteString(strings.Join(r, ",") + "\n")
	}
	return b.String()
}
