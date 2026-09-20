"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutUser } from "@/store/slices/authSlice";
import {
  fetchTenants,
  createTenant,
  updateTenantStatus,
  hardDeleteTenant,
  selectTenant,
  clearTenantError,
} from "@/store/slices/tenantSlice";
import { superAdminAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { invitePasswordPayload } from "@/components/ui/InvitePasswordField";
import type { Tenant } from "@/types";

// Supported verticals. "college"/"enterprise" are kept as legacy values for
// existing rows but new tenants should be created as one of the canonical
// types (education/corporate/healthcare/nonprofit).
export type CreateTenantType =
  | "education"
  | "corporate"
  | "healthcare"
  | "nonprofit";

export interface CreateTenantForm {
  name: string;
  type: CreateTenantType;
  subdomain: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
  // Super-admin capability: may this tenant send invite/system mail at all?
  email_sending_allowed: boolean;
  // Identity policy. true (default) = that population logs in with email.
  // false = they sign in by Employee ID / Roll Number and email is optional.
  staff_email_required: boolean;
  student_email_required: boolean;
}

// All tenants page state and handlers; the table, panels, and modals consume
// this hook.
export function useTenantsPage() {
  const dispatch = useAppDispatch();
  const { tenants, selected, loading, error } = useAppSelector((s) => s.tenant);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    timezone: "",
    currency: "",
    email_sending_allowed: true,
  });
  const [editLoading, setEditLoading] = useState(false);
  // Whether the admin-password temporary field is revealed in the create modal.
  const [tempOpen, setTempOpen] = useState(false);
  const { register, handleSubmit, reset, watch, setValue } = useForm<CreateTenantForm>({
    defaultValues: {
      type: "education",
      admin_password: "",
      email_sending_allowed: true,
      staff_email_required: true,
      student_email_required: true,
    },
  });

  useEffect(() => {
    dispatch(fetchTenants(statusFilter !== "all" ? { status: statusFilter } : undefined));
  }, [dispatch, statusFilter]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearTenantError());
    }
  }, [error, dispatch]);

  const onCreateSubmit = async (data: CreateTenantForm) => {
    // admin_password is driven by setValue (the InvitePasswordField is
    // controlled, not registered), so read it live from watch to be safe.
    const pay = invitePasswordPayload({
      canSendEmail: data.email_sending_allowed,
      tempOpen,
      password: watch("admin_password") || "",
    });
    const result = await dispatch(
      createTenant({
        name: data.name,
        type: data.type,
        subdomain: data.subdomain,
        primary_admin_name: data.admin_name,
        primary_admin_email: data.admin_email,
        primary_admin_password: pay.password,
        send_invite: pay.sendInvite,
        email_sending_allowed: data.email_sending_allowed,
        staff_email_required: data.staff_email_required,
        student_email_required: data.student_email_required,
      })
    );

    if (createTenant.fulfilled.match(result)) {
      const invite = result.payload.invite;
      if (invite && !invite.sent) {
        // No SMTP delivered the mail — hand the super admin the link to share.
        await navigator.clipboard?.writeText(invite.link).catch(() => {});
        toast.success("Tenant created — invite link copied (email not sent)");
      } else if (invite?.sent) {
        toast.success("Tenant created — admin invite email sent");
      } else {
        toast.success("Tenant created successfully!");
      }
      setIsCreateModalOpen(false);
      setTempOpen(false);
      reset();
      dispatch(fetchTenants());
    }
  };

  const handleViewDetails = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      dispatch(selectTenant(tenant));
      setIsDetailsPanelOpen(true);
    }
  };

  const handleStatusToggle = async (tenantId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    const result = await dispatch(
      updateTenantStatus({
        id: tenantId,
        status: newStatus,
      })
    );

    if (updateTenantStatus.fulfilled.match(result)) {
      toast.success(`Tenant ${newStatus}!`);
    }
  };

  const handleImpersonate = async (tenantId: string) => {
    try {
      // The backend swaps the httpOnly auth cookie for a short-lived
      // tenant-admin session; no token is exposed to JavaScript.
      const res = await superAdminAPI.impersonateTenant(tenantId);
      const subdomain: string | undefined = res.data.data?.tenant?.subdomain;
      toast.success(`Impersonating ${selected?.name}`);
      if (subdomain) {
        window.location.href = `/${subdomain}/dashboard`;
      }
    } catch {
      toast.error("Failed to impersonate tenant");
    }
  };

  // "Go to Login Page": the super admin intentionally leaves the console to
  // sign in as this organisation.
  //
  // AWAIT the logout so the server clears the shared httpOnly cookie before we
  // leave; otherwise the super session overlaps with the org login. Then do a
  // HARD navigation (window.location, not router.replace): a full page load
  // tears down the super-admin layout, so its auth guard can't fire its own
  // redirect to /super/login and clobber our destination.
  const handleGoToOrgLogin = async (subdomain: string) => {
    await dispatch(logoutUser());
    window.location.assign(`/${subdomain}/login`);
  };

  const handleHardDelete = async () => {
    if (!selected) return;
    setDeleteLoading(true);
    const result = await dispatch(hardDeleteTenant({ id: selected.id, password: deletePassword }));
    setDeleteLoading(false);
    if (hardDeleteTenant.fulfilled.match(result)) {
      toast.success("Organization permanently deleted");
      setIsDeleteModalOpen(false);
      setIsDetailsPanelOpen(false);
      setDeletePassword("");
    } else {
      toast.error((result.payload as string) || "Failed to delete organization");
    }
  };

  const openEditModal = (tenant: Tenant) => {
    setEditFormData({
      name: tenant.name,
      timezone: tenant.timezone || "Asia/Kolkata",
      currency: tenant.currency || "INR",
      email_sending_allowed: tenant.email_sending_allowed ?? true,
    });
    dispatch(selectTenant(tenant));
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setEditLoading(true);
    try {
      await superAdminAPI.updateTenant(selected.id, {
        name: editFormData.name,
        timezone: editFormData.timezone,
        currency: editFormData.currency,
        email_sending_allowed: editFormData.email_sending_allowed,
      });
      toast.success("Tenant updated successfully!");
      setIsEditModalOpen(false);
      dispatch(fetchTenants(statusFilter !== "all" ? { status: statusFilter } : undefined));
    } catch {
      toast.error("Failed to update tenant");
    } finally {
      setEditLoading(false);
    }
  };

  const filteredTenants =
    statusFilter === "all"
      ? tenants
      : tenants.filter((t) => t.status === statusFilter);

  return {
    selected, loading,
    isCreateModalOpen, setIsCreateModalOpen,
    isDetailsPanelOpen, setIsDetailsPanelOpen,
    statusFilter, setStatusFilter,
    isDeleteModalOpen, setIsDeleteModalOpen,
    deletePassword, setDeletePassword, deleteLoading,
    isEditModalOpen, setIsEditModalOpen,
    editFormData, setEditFormData, editLoading,
    register, handleSubmit, reset, watch, setValue,
    tempOpen, setTempOpen,
    onCreateSubmit, handleViewDetails, handleStatusToggle, handleImpersonate,
    handleGoToOrgLogin,
    handleHardDelete, openEditModal, handleEditSubmit, filteredTenants,
  };
}

export type TenantsPageState = ReturnType<typeof useTenantsPage>;
