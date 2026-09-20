package graph

import (
	"context"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// Vendor CRUD. Writes are admin/staff; reads are any authenticated user (PO
// forms use vendors as a dropdown, so the read stays unenforced in opAccess).

func (r *queryResolver) Vendors(ctx context.Context, active *bool) ([]*model.Vendor, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID)
	if active != nil {
		q = q.Where("active = ?", *active)
	}
	var rows []models.Vendor
	if err := q.Order("name ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Vendor, len(rows))
	for i, v := range rows {
		out[i] = vendorToModel(v)
	}
	return out, nil
}

func (r *mutationResolver) CreateVendor(ctx context.Context, input model.CreateVendorInput) (*model.Vendor, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, GQLErr("vendor name is required")
	}
	v := models.Vendor{
		ID: uuid.NewString(), TenantID: auth.TenantID, Name: name,
		Code: strVal(input.Code), GSTIN: strVal(input.Gstin),
		ContactName: strVal(input.ContactName), Phone: strVal(input.Phone),
		Email: strVal(input.Email), Address: strVal(input.Address),
		PaymentTerms: strVal(input.PaymentTerms), Active: true,
	}
	if input.Active != nil {
		v.Active = *input.Active
	}
	if err := r.DB.WithContext(ctx).Create(&v).Error; err != nil {
		return nil, uniqueErr(err, "a vendor with this name already exists")
	}
	return vendorToModel(v), nil
}

func (r *mutationResolver) UpdateVendor(ctx context.Context, id string, input model.UpdateVendorInput) (*model.Vendor, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	setStr(updates, "name", input.Name)
	setStr(updates, "code", input.Code)
	setStr(updates, "gstin", input.Gstin)
	setStr(updates, "contact_name", input.ContactName)
	setStr(updates, "phone", input.Phone)
	setStr(updates, "email", input.Email)
	setStr(updates, "address", input.Address)
	setStr(updates, "payment_terms", input.PaymentTerms)
	if input.Active != nil {
		updates["active"] = *input.Active
	}
	res := r.DB.WithContext(ctx).Model(&models.Vendor{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, uniqueErr(res.Error, "a vendor with this name already exists")
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	var v models.Vendor
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&v).Error; err != nil {
		return nil, err
	}
	return vendorToModel(v), nil
}

func (r *mutationResolver) DeleteVendor(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	// Referential guard: no DB FK exists, so block deletes that would orphan
	// purchase orders or invoices.
	var refs int64
	if err := r.DB.WithContext(ctx).Model(&models.PurchaseOrder{}).
		Where("vendor_id = ? AND tenant_id = ?", id, auth.TenantID).Count(&refs).Error; err != nil {
		return false, err
	}
	if refs == 0 {
		if err := r.DB.WithContext(ctx).Model(&models.PurchaseInvoice{}).
			Where("vendor_id = ? AND tenant_id = ?", id, auth.TenantID).Count(&refs).Error; err != nil {
			return false, err
		}
	}
	if refs > 0 {
		return false, GQLErr("vendor has purchase orders or invoices and cannot be deleted")
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.Vendor{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}
