package peepalai

import (
	"errors"
	"testing"
)

func TestValidateSQL(t *testing.T) {
	granted := map[string]bool{"students": true, "marks": true, "users": true}
	universe := []string{"students", "marks", "users", "tenants", "payrolls", "audit_logs"}

	allow := []string{
		"SELECT count(*) FROM students",
		"SELECT u.name, m.marks_obtained FROM marks m JOIN students s ON s.id = m.student_id JOIN users u ON u.id = s.user_id ORDER BY m.marks_obtained DESC LIMIT 10",
		"select avg(marks_obtained) from marks where subject ilike '%history%'",
		"SELECT * FROM (SELECT student_id, sum(marks_obtained) t FROM marks GROUP BY student_id) x ORDER BY t DESC",
	}
	for _, q := range allow {
		if err := validateSQL(q, granted, universe); err != nil {
			t.Errorf("expected allow, got %v: %s", err, q)
		}
	}

	denied := []string{
		"SELECT * FROM payrolls",                          // table outside grants
		"SELECT * FROM students JOIN tenants ON true",     // cross joins a denied table
		"SELECT * FROM marks, audit_logs",                 // comma join with denied table
		"SELECT * FROM secret_table",                      // unknown table
	}

	// Unicode-escaped / quoted identifier smuggling must be rejected as unsafe.
	for _, q := range []string{
		`SELECT * FROM students, U&"\0061udit_logs"`,
		`SELECT * FROM "Students"`,
		`SELECT chr(65) FROM students`,
	} {
		if validateSQL(q, granted, universe) == nil {
			t.Errorf("expected rejection of quoted/escaped identifier: %s", q)
		}
	}
	for _, q := range denied {
		if err := validateSQL(q, granted, universe); !errors.Is(err, ErrDenied) {
			t.Errorf("expected ErrDenied, got %v: %s", err, q)
		}
	}

	unsafe := []string{
		"DELETE FROM students",
		"SELECT 1; DROP TABLE students",
		"UPDATE students SET section = 'A'",
		"SELECT * FROM public.students",
		"SELECT * FROM \"public\".students",
		"WITH x AS (SELECT 1) SELECT * FROM x",
		"SELECT pg_sleep(10)",
		"SELECT * FROM students -- comment",
		"SELECT * FROM students WHERE id = $1",
		"SELECT set_config('statement_timeout', '0', true)",
		"SELECT * INTO tmp FROM students",
	}
	for _, q := range unsafe {
		err := validateSQL(q, granted, universe)
		if err == nil || errors.Is(err, ErrDenied) && q != "SELECT * FROM public.students" {
			if err == nil {
				t.Errorf("expected rejection, got nil: %s", q)
			}
		}
	}
}

func TestCleanModelSQL(t *testing.T) {
	cases := map[string]string{
		"```sql\nSELECT 1\n```":                 "SELECT 1",
		"Here is the query: SELECT 1;":          "SELECT 1",
		"  SELECT name FROM students;  ":        "SELECT name FROM students",
	}
	for in, want := range cases {
		if got := cleanModelSQL(in); got != want {
			t.Errorf("cleanModelSQL(%q) = %q, want %q", in, got, want)
		}
	}
}
