package graph

// device_tokens.resolvers.go — a mobile install announcing that it can receive
// push notifications, and withdrawing that when it signs out.
//
// Every operation here is self-service: the caller acts on their own install
// and nothing else, which is why none of them appear in opAccess. The tenant
// and user always come from the token, never from the input, so there is no
// argument a client can pass that points these at somebody else's device.

import (
	"context"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"
)

// RegisterDeviceToken records this install's push token for the calling user.
//
// Re-registering is the normal case, not the exception: the app calls this on
// every launch, because a push token can be rotated by the OS at any time and
// the server has no way to learn that on its own.
func (r *mutationResolver) RegisterDeviceToken(ctx context.Context, input model.RegisterDeviceTokenInput) (*model.DeviceToken, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	row, err := models.RegisterDeviceToken(r.DB.WithContext(ctx), models.RegisterDeviceTokenInput{
		TenantID:   auth.TenantID,
		UserID:     auth.UserID,
		Token:      input.Token,
		Platform:   input.Platform,
		DeviceID:   strVal(input.DeviceID),
		DeviceName: strVal(input.DeviceName),
		AppVersion: strVal(input.AppVersion),
	})
	if err != nil {
		if err == models.ErrInvalidPushToken {
			// A malformed token would fail on every future send, so it is
			// refused here where the client can still do something about it.
			return nil, GQLErr("That is not a valid push token.")
		}
		return nil, err
	}
	return deviceTokenToModel(*row), nil
}

// RevokeDeviceToken stops delivery to one install.
//
// Scoped to the caller's own tokens: a revoke naming somebody else's token
// silently does nothing rather than reporting failure, since telling a caller
// whether a token exists would let them probe for other people's devices.
func (r *mutationResolver) RevokeDeviceToken(ctx context.Context, token string) (bool, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return false, err
	}
	now := time.Now()
	if err := r.DB.WithContext(ctx).Model(&models.DeviceToken{}).
		Where("token = ? AND tenant_id = ? AND user_id = ? AND disabled_at IS NULL", token, auth.TenantID, auth.UserID).
		Updates(map[string]any{
			"disabled_at":     now,
			"disabled_reason": models.DeviceRevokeLogout,
		}).Error; err != nil {
		return false, err
	}
	return true, nil
}

// MyDeviceTokens lists the caller's live installs for the "signed-in devices"
// screen.
func (r *queryResolver) MyDeviceTokens(ctx context.Context) ([]*model.DeviceToken, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := models.MyDeviceTokens(r.DB.WithContext(ctx), auth.TenantID, auth.UserID)
	if err != nil {
		return nil, err
	}
	out := make([]*model.DeviceToken, len(rows))
	for i, row := range rows {
		out[i] = deviceTokenToModel(row)
	}
	return out, nil
}

// deviceTokenToModel maps the stored row to its GraphQL shape.
//
// The push token itself is deliberately NOT exposed. It is a delivery
// credential: anything holding it can send a notification that appears to come
// from us, and the device list has no need for it.
func deviceTokenToModel(d models.DeviceToken) *model.DeviceToken {
	return &model.DeviceToken{
		ID:         d.ID,
		Platform:   d.Platform,
		DeviceID:   toStrPtr(d.DeviceID),
		DeviceName: toStrPtr(d.DeviceName),
		AppVersion: toStrPtr(d.AppVersion),
		LastSeenAt: d.LastSeenAt.Format(time.RFC3339),
		CreatedAt:  d.CreatedAt.Format(time.RFC3339),
	}
}
