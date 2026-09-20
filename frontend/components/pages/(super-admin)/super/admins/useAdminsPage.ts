"use client";

import { useEffect, useState } from "react";
import { superAdminAPI } from "@/lib/api";
import { type ConfirmState } from "@/components/ui/ConfirmDialog";
import toast from "react-hot-toast";
import { ALL_PERMISSIONS, parsePerms, serializePerms } from "./permissions";

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  permissions: string;   // JSON array string e.g. '["manage_tenants","view_reports"]'
  created_at?: string;
}

// All admins page state and handlers; the table and dialogs consume this hook.
export function useAdminsPage() {
  const [admins, setAdmins] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [formPerms, setFormPerms] = useState<string[]>(ALL_PERMISSIONS.map((p) => p.key));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Per-row editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  // Edit profile (name + password)
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfileAdminId, setEditProfileAdminId] = useState<string | null>(null);
  const [editProfileData, setEditProfileData] = useState<{ name: string; password: string }>({ name: "", password: "" });
  const [editProfileErrors, setEditProfileErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const res = await superAdminAPI.listAdmins();
      setAdmins(res.data.data ?? []);
    } catch {
      toast.error("Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAdmins(); }, []);

  // ── Create ─────────────────────────────────────────────────

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())                  e.name = "Name is required";
    if (!form.email.trim())                 e.email = "Email is required";
    if (!form.password || form.password.length < 8) e.password = "Minimum 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setCreating(true);
      await superAdminAPI.createAdmin({
        ...form,
        permissions: serializePerms(formPerms),
      });
      toast.success("Super admin created");
      setIsCreateOpen(false);
      setForm({ name: "", email: "", password: "" });
      setFormPerms(ALL_PERMISSIONS.map((p) => p.key));
      loadAdmins();
    } catch {
      toast.error("Failed to create admin — email may already be in use");
    } finally {
      setCreating(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────────

  const handleToggleActive = (admin: SuperAdminUser) => {
    const next = !admin.is_active;
    if (!next) {
      // Deactivating — confirm first
      setConfirmState({
        title: "Deactivate Admin",
        message: `Deactivate ${admin.name}? They won't be able to log in until re-activated.`,
        variant: "warning",
        confirmLabel: "Deactivate",
        onConfirm: async () => {
          setConfirmLoading(true);
          try {
            setAdmins((prev) => prev.map((a) => a.id === admin.id ? { ...a, is_active: false } : a));
            await superAdminAPI.updateAdmin(admin.id, { is_active: false });
            toast.success("Admin deactivated");
          } catch {
            setAdmins((prev) => prev.map((a) => a.id === admin.id ? { ...a, is_active: true } : a));
            toast.error("Failed to update admin");
          } finally {
            setConfirmLoading(false);
          }
        },
      });
    } else {
      // Re-activating — no confirm needed
      setAdmins((prev) => prev.map((a) => a.id === admin.id ? { ...a, is_active: true } : a));
      superAdminAPI.updateAdmin(admin.id, { is_active: true })
        .then(() => toast.success("Admin activated"))
        .catch(() => {
          setAdmins((prev) => prev.map((a) => a.id === admin.id ? { ...a, is_active: false } : a));
          toast.error("Failed to update admin");
        });
    }
  };

  // ── Permissions inline edit ────────────────────────────────

  const startEditPerms = (admin: SuperAdminUser) => {
    setEditingId(admin.id);
    setEditPerms(parsePerms(admin.permissions));
  };

  const savePerms = async (id: string) => {
    try {
      setSavingPerms(true);
      await superAdminAPI.updateAdmin(id, { permissions: serializePerms(editPerms) });
      setAdmins((prev) => prev.map((a) => a.id === id ? { ...a, permissions: serializePerms(editPerms) } : a));
      toast.success("Permissions updated");
      setEditingId(null);
    } catch {
      toast.error("Failed to save permissions");
    } finally {
      setSavingPerms(false);
    }
  };

  // ── Edit profile (name + password) ────────────────────────

  const openEditProfile = (admin: SuperAdminUser) => {
    setEditProfileAdminId(admin.id);
    setEditProfileData({ name: admin.name, password: "" });
    setEditProfileErrors({});
    setEditProfileOpen(true);
  };

  const validateProfileForm = () => {
    const e: Record<string, string> = {};
    if (!editProfileData.name.trim()) e.name = "Name is required";
    if (editProfileData.password && editProfileData.password.length < 8) {
      e.password = "Minimum 8 characters";
    }
    setEditProfileErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validateProfileForm() || !editProfileAdminId) return;

    try {
      setSavingProfile(true);
      const updateData: { name?: string; password?: string } = { name: editProfileData.name };
      if (editProfileData.password) {
        updateData.password = editProfileData.password;
      }
      await superAdminAPI.updateAdmin(editProfileAdminId, updateData);
      setAdmins((prev) =>
        prev.map((a) =>
          a.id === editProfileAdminId ? { ...a, name: editProfileData.name } : a
        )
      );
      toast.success("Profile updated");
      setEditProfileOpen(false);
      setEditProfileAdminId(null);
      setEditProfileData({ name: "", password: "" });
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  return {
    admins, loading,
    isCreateOpen, setIsCreateOpen, creating,
    form, setForm, formPerms, setFormPerms, errors, setErrors,
    confirmState, setConfirmState, confirmLoading,
    editingId, setEditingId, editPerms, setEditPerms, savingPerms,
    editProfileOpen, setEditProfileOpen,
    editProfileData, setEditProfileData, editProfileErrors, setEditProfileErrors, savingProfile,
    handleCreate, handleToggleActive, startEditPerms, savePerms,
    openEditProfile, handleSaveProfile,
  };
}

export type AdminsPageState = ReturnType<typeof useAdminsPage>;
