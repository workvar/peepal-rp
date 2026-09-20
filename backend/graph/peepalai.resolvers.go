package graph

// Ask PeepalAI — natural-language questions answered from the caller's own
// permitted data. The heavy lifting (grants, Ollama, SQL guard, read-only
// execution) lives in the peepalai package; this resolver wires it to auth,
// the access matrix, and the audit trail.
//
// Security model (backend-enforced, no frontend trust):
//   - accessFieldMiddleware gates the operation on the ask-peepalai module;
//   - canView() re-runs industry + subscription + role-matrix checks per
//     table module, so the model only ever sees tables this caller may view;
//   - every granted table is shadowed by a tenant- and self-scoped CTE;
//   - the generated SQL is strictly validated and runs READ ONLY;
//   - every request (allowed or denied) is written to the audit trail.

import (
	"context"
	"fmt"

	"collegeerp/graph/model"
	"collegeerp/models"
	"collegeerp/peepalai"
)

// AskPeepalAi is the resolver for the askPeepalAI query.
func (r *queryResolver) AskPeepalAi(ctx context.Context, question string) (*model.PeepalAIAnswer, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	user := peepalai.UserContext{
		UserID:       auth.UserID,
		Role:         auth.Role,
		TenantID:     auth.TenantID,
		IsSuperAdmin: auth.IsSuperAdmin || auth.Role == string(models.RoleSuperAdmin),
		Name:         actorName(r.DB, auth.UserID),
	}
	r.loadLinkedProfiles(&user)

	// entitled: industry + subscription gate. A module that fails this is
	// unavailable to the whole org and never grantable, even self-service.
	entitled := func(module string) bool {
		return enforceIndustryModule(ctx, module) == nil &&
			enforceSubscriptionModule(ctx, module) == nil
	}
	canView := func(module string) bool {
		return entitled(module) && enforceAccess(ctx, module, models.ActionView) == nil
	}

	res := peepalai.Ask(ctx, r.DB, user, canView, entitled, question)
	r.recordPeepalAudit(auth, question, res)

	if res.Columns == nil {
		res.Columns = []string{}
	}
	if res.Rows == nil {
		res.Rows = [][]string{}
	}
	return &model.PeepalAIAnswer{
		Answer:  res.Answer,
		SQL:     res.SQL,
		Columns: res.Columns,
		Rows:    res.Rows,
		Denied:  res.Denied,
		Message: res.Message,
	}, nil
}

// loadLinkedProfiles resolves the caller's student/employee/patient row ids so
// "my ..." questions can be answered.
func (r *Resolver) loadLinkedProfiles(user *peepalai.UserContext) {
	var id string
	if r.DB.Raw("SELECT id FROM students WHERE user_id = ? LIMIT 1", user.UserID).Scan(&id); id != "" {
		user.StudentID = id
	}
	id = ""
	if r.DB.Raw("SELECT id FROM employees WHERE user_id = ? LIMIT 1", user.UserID).Scan(&id); id != "" {
		user.EmployeeID = id
	}
	id = ""
	if r.DB.Raw("SELECT id FROM patients WHERE user_id = ? LIMIT 1", user.UserID).Scan(&id); id != "" {
		user.PatientID = id
	}
}

// recordPeepalAudit writes one audit row per Ask PeepalAI request, allowed or
// denied. Best effort; never fails the request.
func (r *Resolver) recordPeepalAudit(auth AuthContext, question string, res peepalai.Result) {
	outcome := "answered"
	if res.Denied {
		outcome = "denied"
	} else if res.Message != "" {
		outcome = "failed"
	}
	detail := fmt.Sprintf("[%s] q: %s", outcome, truncate(question, 500))
	if res.SQL != "" {
		detail += " | sql: " + truncate(res.SQL, 1000)
	}
	_ = r.DB.Create(&models.AuditLog{
		TenantID:  auth.TenantID,
		ActorID:   auth.UserID,
		ActorName: actorName(r.DB, auth.UserID),
		ActorRole: auth.Role,
		Action:    models.AuditQuery,
		Module:    "ask-peepalai",
		Operation: "askPeepalAI",
		Detail:    detail,
	}).Error
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
