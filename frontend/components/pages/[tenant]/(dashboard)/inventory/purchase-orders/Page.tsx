"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { Plus, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { usePurchaseOrders } from "./usePurchaseOrders";
import POTable from "./POTable";
import POModal from "./POModal";
import BulkPOModal from "./BulkPOModal";
import ReceiveModal, { type ReceivePayload } from "./ReceiveModal";
import InvoicesPanel from "./InvoicesPanel";
import InvoiceModal, { type InvoiceForm } from "./InvoiceModal";
import PaymentModal from "./PaymentModal";
import type { GqlPurchaseOrder, GqlPurchaseInvoice, POForm } from "./types";

type Tab = "orders" | "invoices";

export default function PurchaseOrdersPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const canWrite = isAdmin || user?.role === "staff";

  const {
    orders, invoices, vendors, items, loading, refetch, refetchOrders,
    createPO, updatePO, receivePO, deletePO, createInvoice, recordPayment, deleteInvoice,
  } = usePurchaseOrders();

  const [tab, setTab] = useState<Tab>("orders");
  const [showPO, setShowPO] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingPO, setEditingPO] = useState<GqlPurchaseOrder | null>(null);
  const [receiving, setReceiving] = useState<GqlPurchaseOrder | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [paying, setPaying] = useState<GqlPurchaseInvoice | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const savePO = async (form: POForm) => {
    const input = {
      vendorId: form.vendor_id,
      orderDate: form.order_date || null,
      expectedDate: form.expected_date || null,
      notes: form.notes || null,
      items: form.lines.map((l) => ({
        itemId: l.item_id || null,
        itemName: l.item_name.trim(),
        qty: parseFloat(l.qty) || 0,
        unitCost: parseFloat(l.unit_cost) || 0,
        taxPct: parseFloat(l.tax_pct) || 0,
      })),
    };
    try {
      if (editingPO) {
        await updatePO({ variables: { id: editingPO.id, input } });
        toast.success("Purchase order updated");
      } else {
        await createPO({ variables: { input } });
        toast.success("Purchase order created");
      }
      setShowPO(false);
      setEditingPO(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save order");
    }
  };

  const doReceive = async (payload: ReceivePayload) => {
    if (!receiving) return;
    try {
      await receivePO({ variables: { id: receiving.id, input: payload } });
      toast.success("Stock received");
      setReceiving(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to receive stock");
    }
  };

  const saveInvoice = async (form: InvoiceForm) => {
    const input = {
      invoiceNumber: form.invoice_number.trim(),
      vendorId: form.vendor_id,
      purchaseOrderId: form.purchase_order_id || null,
      invoiceDate: form.invoice_date || null,
      dueDate: form.due_date || null,
      subtotal: parseFloat(form.subtotal) || 0,
      taxTotal: parseFloat(form.tax_total) || 0,
      total: parseFloat(form.total) || 0,
    };
    try {
      await createInvoice({ variables: { input } });
      toast.success("Invoice recorded");
      setShowInvoice(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save invoice");
    }
  };

  const doPay = async (amount: number) => {
    if (!paying) return;
    try {
      await recordPayment({ variables: { input: { invoiceId: paying.id, amount } } });
      toast.success("Payment recorded");
      setPaying(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    }
  };

  const deleteOrders = (list: GqlPurchaseOrder[]) => {
    if (list.length === 0) return;
    const n = list.length;
    const label = n === 1 ? `“${list[0].poNumber}”` : `${n} purchase orders`;
    setConfirmState({
      title: n === 1 ? "Delete Purchase Order" : `Delete ${n} Purchase Orders`,
      message: `${label} and their line items will be removed. This cannot be undone.`,
      variant: "danger",
      confirmLabel: n === 1 ? "Delete" : `Delete ${n}`,
      onConfirm: async () => {
        let ok = 0;
        for (const p of list) {
          try {
            await deletePO({ variables: { id: p.id } });
            ok++;
          } catch {
            // continue; report the tally at the end
          }
        }
        await refetchOrders();
        const failed = n - ok;
        if (failed === 0) toast.success(`Deleted ${ok}`);
        else toast.error(`Deleted ${ok}, ${failed} failed`);
      },
    });
  };

  const removeInvoice = (inv: GqlPurchaseInvoice) => {
    setConfirmState({
      title: "Delete Invoice",
      message: `Invoice “${inv.invoiceNumber}” will be removed.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteInvoice({ variables: { id: inv.id } });
        toast.success("Deleted");
      },
    });
  };

  return (
    <div>
      <Header
        title="Purchase Orders"
        subtitle="Order stock from vendors, receive into inventory, and track supplier invoices"
        action={
          canWrite ? (
            tab === "orders" ? (
              <Can module="purchase-orders" action="create">
                <div className="flex items-center gap-2">
                  <button className="btn-secondary flex items-center gap-2" onClick={() => setShowBulk(true)}>
                    <Upload size={16} /> Bulk Add
                  </button>
                  <button className="btn-primary flex items-center gap-2" onClick={() => { setEditingPO(null); setShowPO(true); }}>
                    <Plus size={16} /> New PO
                  </button>
                </div>
              </Can>
            ) : (
              <Can module="purchase-orders" action="create">
                <button className="btn-primary flex items-center gap-2" onClick={() => setShowInvoice(true)}>
                  <Plus size={16} /> New Invoice
                </button>
              </Can>
            )
          ) : undefined
        }
      />

      <div className="flex gap-1 mb-4 border-b border-border/60">
        {(["orders", "invoices"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "orders" ? "Orders" : "Invoices"}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : tab === "orders" ? (
        <POTable
          orders={orders}
          canWrite={canWrite}
          onEdit={(p) => { setEditingPO(p); setShowPO(true); }}
          onReceive={(p) => setReceiving(p)}
          onDelete={deleteOrders}
        />
      ) : (
        <InvoicesPanel invoices={invoices} canWrite={canWrite} onPay={(inv) => setPaying(inv)} onDelete={removeInvoice} />
      )}

      <POModal
        isOpen={showPO}
        onClose={() => { setShowPO(false); setEditingPO(null); }}
        editing={editingPO}
        vendors={vendors}
        items={items}
        onSave={savePO}
      />

      <ReceiveModal
        isOpen={!!receiving}
        onClose={() => setReceiving(null)}
        po={receiving}
        items={items}
        onReceive={doReceive}
      />

      <InvoiceModal
        isOpen={showInvoice}
        onClose={() => setShowInvoice(false)}
        vendors={vendors}
        orders={orders}
        onSave={saveInvoice}
      />

      <BulkPOModal
        open={showBulk}
        vendors={vendors}
        items={items}
        onClose={() => setShowBulk(false)}
        onFinished={refetch}
      />

      <PaymentModal isOpen={!!paying} onClose={() => setPaying(null)} invoice={paying} onPay={doPay} />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
