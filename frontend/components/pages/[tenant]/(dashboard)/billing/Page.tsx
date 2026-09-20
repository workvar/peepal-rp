"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useBilling } from "./useBilling";
import ServicesTab from "./ServicesTab";
import InvoicesTab, { type PaymentForm } from "./InvoicesTab";
import InvoiceModal from "./InvoiceModal";
import type { GqlBillableService, GqlInvoice, ServiceForm, InvoiceForm } from "./types";

type Tab = "invoices" | "services";

export default function BillingPage() {
  const {
    services, invoices, patients, loading,
    createServiceMut, updateServiceMut, deleteServiceMut,
    createInvoiceMut, cancelInvoiceMut, recordPaymentMut,
  } = useBilling();

  const [tab, setTab] = useState<Tab>("invoices");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const saveService = async (editing: GqlBillableService | null, form: ServiceForm) => {
    const base = {
      code: form.code.trim(),
      name: form.name.trim(),
      category: form.category,
      unitPrice: parseFloat(form.unit_price) || 0,
    };
    try {
      if (editing) {
        await updateServiceMut({ variables: { id: editing.id, input: { ...base, active: form.active } } });
        toast.success("Service updated");
      } else {
        await createServiceMut({ variables: { input: base } });
        toast.success("Service added");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save service");
      throw err;
    }
  };

  const deleteService = (s: GqlBillableService) => {
    setConfirmState({
      title: "Delete Service",
      message: `“${s.name}” will be removed from the catalog. Existing invoice lines keep their frozen copy.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteServiceMut({ variables: { id: s.id } });
        toast.success("Deleted");
      },
    });
  };

  const saveInvoice = async (form: InvoiceForm) => {
    const input = {
      patientId: form.patient_id,
      date: form.date,
      discount: parseFloat(form.discount) || 0,
      notes: form.notes || null,
      items: form.lines.map((l) => ({
        serviceId: l.service_id || null,
        description: l.description.trim(),
        qty: parseFloat(l.qty) || 1,
        unitPrice: parseFloat(l.unit_price) || 0,
      })),
    };
    try {
      await createInvoiceMut({ variables: { input } });
      toast.success("Invoice created");
      setShowInvoiceModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
    }
  };

  const cancelInvoice = (inv: GqlInvoice) => {
    setConfirmState({
      title: "Cancel Invoice",
      message: `${inv.invoiceNo} for ${inv.patientName} will be voided. This cannot be undone.`,
      variant: "danger",
      confirmLabel: "Cancel Invoice",
      onConfirm: async () => {
        await cancelInvoiceMut({ variables: { id: inv.id } });
        toast.success("Invoice cancelled");
      },
    });
  };

  const recordPayment = async (inv: GqlInvoice, form: PaymentForm) => {
    try {
      await recordPaymentMut({
        variables: {
          input: {
            invoiceId: inv.id,
            amount: parseFloat(form.amount) || 0,
            mode: form.mode,
            reference: form.reference || null,
          },
        },
      });
      toast.success("Payment recorded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
      throw err;
    }
  };

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <Header
        title="Billing"
        subtitle="Bill patients for consultations and procedures, and track payments"
        action={
          tab === "invoices" ? (
            <Can module="billing" action="create">
              <button className="btn-primary flex items-center gap-2" onClick={() => setShowInvoiceModal(true)}>
                <Plus size={16} /> New Invoice
              </button>
            </Can>
          ) : undefined
        }
      />

      <div className="flex gap-2 mb-4">
        {tabBtn("invoices", "Invoices")}
        {tabBtn("services", "Service Catalog")}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : tab === "invoices" ? (
        <InvoicesTab invoices={invoices} onCancel={cancelInvoice} onRecordPayment={recordPayment} />
      ) : (
        <ServicesTab services={services} onSave={saveService} onDelete={deleteService} />
      )}

      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        patients={patients}
        services={services}
        onSave={saveInvoice}
      />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
