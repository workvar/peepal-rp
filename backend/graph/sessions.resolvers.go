package graph

// sessions.resolvers.go — seeing and ending signed-in sessions.
//
// Access tokens are bearer credentials that nothing can withdraw once minted;
// what makes them revocable in practice is that they are short-lived and every
// renewal goes back through a refresh-token family that IS revocable. These
// resolvers are the controls over those families: a user can see where they are
// signed in and drop a device they no longer have, and an admin can sign a user
// out of everything without waiting out an access token's lifetime.
//
// Two rules run through all of it:
//
//   - A session id is client-supplied, so ownership is checked before anything
//     is revoked. Without that check, knowing an id would be enough to sign
//     somebody else out.
//   - The my* operations are self-service and stay out of the opAccess matrix,
//     like myDeviceTokens. The admin-facing pair is gated on the `admins`
//     module, because signing a user out is user administration.

import (
	"context"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"
)

// ─── Queries ────────────────────────────────────────────────────────────────

// MySessions lists the caller's own live sessions, newest activity first.
func (r *queryResolver) MySessions(ctx context.Context) ([]*model.UserSession, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := models.ListUserSessions(r.DB.WithContext(ctx), auth.UserID)
	if err != nil {
		return nil, err
	}
	return sessionsToModel(rows, auth.SessionID), nil
}

// UserSessions lists one user's live sessions for an admin.
//
// Scoped to the caller's tenant: an admin of one organisation must not be able
// to enumerate sessions in another by guessing a user id.
func (r *queryResolver) UserSessions(ctx context.Context, userID string) ([]*model.UserSession, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	if _, err := loadTenantUser(r.DB.WithContext(ctx), auth.TenantID, userID); err != nil {
		return nil, err
	}
	rows, err := models.ListUserSessions(r.DB.WithContext(ctx), userID)
	if err != nil {
		return nil, err
	}
	// The admin's own session is only "current" when they are looking at
	// themselves; for anyone else no row can be the request's own session.
	current := ""
	if userID == auth.UserID {
		current = auth.SessionID
	}
	return sessionsToModel(rows, current), nil
}

// ─── Mutations ──────────────────────────────────────────────────────────────

// RevokeMySession ends one of the caller's sessions, including possibly the one
// making the request — signing yourself out of the device in your hand is a
// legitimate thing to ask for, and the client simply lands back on the login
// screen at its next request.
func (r *mutationResolver) RevokeMySession(ctx context.Context, sessionID string) (bool, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return false, err
	}
	db := r.DB.WithContext(ctx)
	owns, err := models.SessionBelongsTo(db, sessionID, auth.UserID)
	if err != nil {
		return false, err
	}
	if !owns {
		// Reported as not-found rather than forbidden: whether an id exists at
		// all is not something a caller should be able to probe for.
		return false, ErrNotFound
	}
	if err := models.RevokeSession(db, sessionID, models.RevokeReasonLogout); err != nil {
		return false, err
	}
	return true, nil
}

// RevokeMyOtherSessions is the "I left myself signed in somewhere" button: it
// ends every session but this one, and reports how many that was.
func (r *mutationResolver) RevokeMyOtherSessions(ctx context.Context) (int, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return 0, err
	}
	n, err := models.RevokeUserSessionsExcept(
		r.DB.WithContext(ctx), auth.UserID, auth.SessionID, models.RevokeReasonLogout,
	)
	if err != nil {
		return 0, err
	}
	return int(n), nil
}

// RevokeUserSessions signs a user out everywhere, for an admin who needs access
// gone now rather than at the end of the current access token's lifetime.
func (r *mutationResolver) RevokeUserSessions(ctx context.Context, userID string) (int, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return 0, err
	}
	db := r.DB.WithContext(ctx)
	if _, err := loadTenantUser(db, auth.TenantID, userID); err != nil {
		return 0, err
	}
	// Counted before revoking, because RevokeUserSessions updates rows rather
	// than sessions and its RowsAffected would count rotation links.
	before, err := models.ListUserSessions(db, userID)
	if err != nil {
		return 0, err
	}
	if err := models.RevokeUserSessions(db, userID, models.RevokeReasonAccountLocked); err != nil {
		return 0, err
	}
	return len(before), nil
}

// ─── Mapping ────────────────────────────────────────────────────────────────

// sessionsToModel projects the model layer's session summaries onto the GraphQL
// type. currentSessionID marks the session the request itself came in on; pass
// an empty string when none of the rows can be the caller's own.
func sessionsToModel(rows []models.UserSession, currentSessionID string) []*model.UserSession {
	out := make([]*model.UserSession, 0, len(rows))
	for _, s := range rows {
		out = append(out, &model.UserSession{
			ID:          s.SessionID,
			Current:     currentSessionID != "" && s.SessionID == currentSessionID,
			ActiveRole:  s.ActiveRole,
			CreatedAt:   s.CreatedAt.Format(time.RFC3339),
			LastUsedAt:  s.LastUsedAt.Format(time.RFC3339),
			ExpiresAt:   s.ExpiresAt.Format(time.RFC3339),
			UserAgent:   toStrPtr(s.UserAgent),
			DeviceLabel: deviceLabel(s.UserAgent),
			IP:          toStrPtr(s.IP),
		})
	}
	return out
}
