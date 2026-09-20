"use client";

import PageHeader from "@/components/ui/PageHeader";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Plus } from "lucide-react";
import { useAdminsPage } from "./useAdminsPage";
import AdminsTable from "./AdminsTable";
import { CreateAdminDialog, EditProfileDialog } from "./AdminModals";

export default function AdminsPage() {
  const page = useAdminsPage();
  const { setIsCreateOpen, confirmState, setConfirmState, confirmLoading } = page;

  return (
    <div>
      <PageHeader
        title="Super Admin Accounts"
        subtitle="Manage accounts and their platform-level access"
        actions={
          <button onClick={() => setIsCreateOpen(true)} className="btn-primary">
            <Plus size={16} /> Add Super Admin
          </button>
        }
      />

      <AdminsTable page={page} />

      <CreateAdminDialog page={page} />
      <EditProfileDialog page={page} />

      <ConfirmDialog
        state={confirmState}
        onClose={() => setConfirmState(null)}
        loading={confirmLoading}
      />
    </div>
  );
}
