"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import BulkUploadButton from "@/components/ui/BulkUpload/BulkUploadButton";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useVendors } from "./useVendors";
import VendorTable from "./VendorTable";
import VendorModal from "./VendorModal";
import type { GqlVendor, VendorForm } from "./types";

export default function VendorsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const canWrite = isAdmin || user?.role === "staff";

  const { vendors, loading, refetch, createMut, updateMut, deleteMut } = useVendors();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlVendor | null>(null);
  const [search, setSearch] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const openAdd = () => { setEditing(null); setShowModal(true); };
  const openEdit = (v: GqlVendor) => { setEditing(v); setShowModal(true); };

  const handleSave = async (form: VendorForm) => {
    const input = {
      name: form.name.trim(),
      code: form.code || null,
      gstin: form.gstin || null,
      contactName: form.contact_name || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      paymentTerms: form.payment_terms || null,
      active: form.active,
    };
    try {
      if (editing) {
        await updateMut({ variables: { id: editing.id, input } });
        toast.success("Vendor updated");
      } else {
        await createMut({ variables: { input } });
        toast.success("Vendor created");
      }
      setShowModal(false);
      setEditing(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save vendor");
    }
  };

  const handleDelete = (v: GqlVendor) => {
    setConfirmState({
      title: "Delete Vendor",
      message: `“${v.name}” will be removed. This is blocked if the vendor has purchase orders or invoices.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await deleteMut({ variables: { id: v.id } });
          toast.success("Deleted");
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Could not delete vendor");
        }
      },
    });
  };

  const handleDeleteMany = (list: GqlVendor[]) => {
    if (list.length === 0) return;
    setConfirmState({
      title: `Delete ${list.length} vendor${list.length > 1 ? "s" : ""}`,
      message: `${list.length} vendor${list.length > 1 ? "s" : ""} will be removed. Any that have purchase orders or invoices are protected and will be skipped.`,
      variant: "danger",
      confirmLabel: `Delete ${list.length}`,
      onConfirm: async () => {
        let ok = 0;
        for (const v of list) {
          try {
            await deleteMut({ variables: { id: v.id }, refetchQueries: [] });
            ok++;
          } catch {
            // continue; blocked vendors (with POs/invoices) are reported below
          }
        }
        await refetch();
        const failed = list.length - ok;
        if (failed === 0) toast.success(`Deleted ${ok}`);
        else toast.error(`Deleted ${ok}, ${failed} skipped (in use)`);
      },
    });
  };

  const filtered = search
    ? vendors.filter((v) =>
        [v.name, v.code, v.contactName, v.email].some((x) =>
          String(x ?? "").toLowerCase().includes(search.toLowerCase()),
        ),
      )
    : vendors;

  return (
    <div>
      <Header
        title="Vendors"
        subtitle="Suppliers you raise purchase orders and record invoices against"
        action={
          canWrite ? (
            <div className="flex gap-2">
              <Can module="vendors" action="create">
                <BulkUploadButton resource="vendors" onFinished={() => refetch()} />
              </Can>
              <Can module="vendors" action="create">
                <button className="btn-primary flex items-center gap-2" onClick={openAdd}>
                  <Plus size={16} /> Add Vendor
                </button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <div className="mb-4">
        <input
          className="input-field w-full"
          placeholder="Search vendor name, code, contact…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <VendorTable vendors={filtered} canWrite={canWrite} onEdit={openEdit} onDelete={handleDelete} onDeleteMany={handleDeleteMany} />
      )}

      <VendorModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        editing={editing}
        onSave={handleSave}
      />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
