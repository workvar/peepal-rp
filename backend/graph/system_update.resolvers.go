package graph

import (
	"context"
	"fmt"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"
)

// SystemUpdateStatus reports installed/available versions from peepal-agent,
// this tenant's snooze state, and the live presence count.
func (r *queryResolver) SystemUpdateStatus(ctx context.Context) (*model.SystemUpdateStatus, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	return r.buildSystemUpdateStatus(ctx, auth.TenantID)
}

// SnoozeSystemUpdate sets tenant UpdateSnoozedUntil to now+1h and returns status.
func (r *mutationResolver) SnoozeSystemUpdate(ctx context.Context) (*model.SystemUpdateStatus, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	until := time.Now().UTC().Add(time.Hour)
	if err := r.DB.WithContext(ctx).Model(&models.Tenant{}).
		Where("id = ?", auth.TenantID).
		Update("update_snoozed_until", until).Error; err != nil {
		return nil, err
	}
	return r.buildSystemUpdateStatus(ctx, auth.TenantID)
}

// ApplySystemUpdate asks peepal-agent to apply an available update.
func (r *mutationResolver) ApplySystemUpdate(ctx context.Context) (bool, error) {
	_, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	if r.Agent == nil {
		return false, fmt.Errorf("peepal agent is not configured")
	}
	applied, err := r.Agent.Apply(ctx)
	if err != nil {
		return false, err
	}
	return applied, nil
}

func (r *Resolver) buildSystemUpdateStatus(ctx context.Context, tenantID string) (*model.SystemUpdateStatus, error) {
	out := &model.SystemUpdateStatus{
		InstalledBackend:    "",
		InstalledFrontend:   "",
		AvailableBackend:    "",
		AvailableFrontend:   "",
		UpdateAvailable:     false,
		Snoozed:             false,
		ActiveUsersInTenant: 0,
		AgentReachable:      false,
	}

	if r.Presence != nil {
		out.ActiveUsersInTenant = r.Presence.Count(tenantID)
	}

	var tenant models.Tenant
	if err := r.DB.WithContext(ctx).Select("update_snoozed_until").
		Where("id = ?", tenantID).First(&tenant).Error; err == nil {
		if tenant.UpdateSnoozedUntil != nil && tenant.UpdateSnoozedUntil.After(time.Now().UTC()) {
			out.Snoozed = true
			s := tenant.UpdateSnoozedUntil.UTC().Format(time.RFC3339)
			out.SnoozedUntil = &s
		} else if tenant.UpdateSnoozedUntil != nil {
			s := tenant.UpdateSnoozedUntil.UTC().Format(time.RFC3339)
			out.SnoozedUntil = &s
		}
	}

	if r.Agent == nil {
		return out, nil
	}
	st, err := r.Agent.UpdateStatus(ctx)
	if err != nil {
		// Soft-fail: agent unreachable → no updateAvailable, empty versions.
		return out, nil
	}
	out.AgentReachable = true
	out.InstalledBackend = st.InstalledBackend
	out.InstalledFrontend = st.InstalledFrontend
	out.AvailableBackend = st.AvailableBackend
	out.AvailableFrontend = st.AvailableFrontend
	out.UpdateAvailable = st.UpdateAvailable
	return out, nil
}
