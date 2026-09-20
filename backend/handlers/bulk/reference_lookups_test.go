package bulk

import "testing"

// Blank reference cells are optional: the resolvers must short-circuit to
// ("", nil) without touching the database. Required cells are rejected earlier
// by Schema.ValidateRow, so a blank that reaches a resolver is always optional.
func TestReferenceResolversAllowBlank(t *testing.T) {
	cases := map[string]func(string, string) (string, error){
		"department":      resolveDepartmentID,
		"course":          resolveCourseID,
		"salary template": resolveSalaryTemplateID,
		"employee":        resolveEmployeeID,
		"subject":         resolveSubjectID,
	}
	for name, fn := range cases {
		id, err := fn("tenant-1", "   ")
		if err != nil {
			t.Fatalf("%s: blank cell should not error, got %v", name, err)
		}
		if id != "" {
			t.Fatalf("%s: blank cell should resolve to empty id, got %q", name, id)
		}
	}
}

// An unknown entity_type is rejected before any lookup runs, so a typo in the
// attendance CSV fails the row instead of silently inserting an orphan record.
func TestResolveAttendanceEntityRejectsBadType(t *testing.T) {
	if _, err := resolveAttendanceEntityID("tenant-1", "teacher", "EMP1"); err == nil {
		t.Fatal("expected an error for an unsupported entity_type")
	}
}

// The resources whose reference validation was hardened must still register
// (via init) with a Create function and fields, or their /bulk routes 404.
func TestReferenceValidatedResourcesRegistered(t *testing.T) {
	for _, res := range []string{"employees", "students", "courses", "marks", "attendance"} {
		s, ok := Get(res)
		if !ok {
			t.Fatalf("resource %q is not registered", res)
		}
		if s.Create == nil {
			t.Fatalf("resource %q has no Create function", res)
		}
		if len(s.Fields) == 0 {
			t.Fatalf("resource %q has no fields", res)
		}
	}
}
