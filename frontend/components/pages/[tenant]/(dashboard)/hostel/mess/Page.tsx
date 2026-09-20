"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import MenuGrid from "./MenuGrid";
import MessAttendanceGrid from "./MessAttendanceGrid";
import ExpenseTable from "./ExpenseTable";
import ExpenseModal from "./ExpenseModal";
import { useMessMenu, useMessAttendance, useMessExpenses } from "./useMess";
import type { ExpenseForm, GqlMessExpense } from "./types";
import { MEALS, MEAL_LABELS } from "./types";
import SearchableSelect from "@/components/ui/SearchableSelect";

type Tab = "menu" | "attendance" | "expenses";

/** First day of the current month, the natural window for expense reporting. */
function monthStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function MessPage() {
  const user = useAppSelector((s) => s.auth.user);
  const canWrite = user?.role === "admin" || user?.role === "super_admin" || user?.role === "staff";

  const [tab, setTab] = useState<Tab>("menu");
  const [blockId, setBlockId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [meal, setMeal] = useState<string>("lunch");
  const [range, setRange] = useState({ from: monthStart(), to: new Date().toISOString().slice(0, 10) });

  const { menu, blocks, loading: menuLoading, setMenuMut } = useMessMenu(blockId);
  const { rows, loading: attendanceLoading, markMut } = useMessAttendance(date, meal, blockId);
  const {
    expenses, total, vendors, purchaseOrders, loading: expenseLoading,
    createMut, updateMut, deleteMut,
  } = useMessExpenses(range.from, range.to);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GqlMessExpense | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const saveMenuCell = async (dayOfWeek: number, meal: string, items: string) => {
    try {
      await setMenuMut({
        variables: { input: { dayOfWeek, meal, items, hostelBlockId: blockId || null } },
      });
      toast.success("Menu updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save menu");
    }
  };

  const saveAttendance = async (studentIds: string[]) => {
    try {
      const res = await markMut({ variables: { date, meal, studentIds } });
      const marked = res.data?.markMessAttendance?.marked ?? studentIds.length;
      toast.success(`${marked} marked for ${MEAL_LABELS[meal]}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save attendance");
    }
  };

  const saveExpense = async (current: GqlMessExpense | null, form: ExpenseForm) => {
    const input = {
      date: form.date,
      category: form.category,
      description: form.description || null,
      amount: Number(form.amount || 0),
      vendorId: form.vendor_id || null,
      purchaseOrderId: form.purchase_order_id || null,
    };
    try {
      if (current) {
        await updateMut({ variables: { id: current.id, input } });
        toast.success("Expense updated");
      } else {
        await createMut({ variables: { input } });
        toast.success("Expense added");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save expense");
      throw err;
    }
  };

  const removeExpense = (e: GqlMessExpense) =>
    setConfirmState({
      title: "Delete Expense",
      message: `The ${e.category} entry of ${e.amount.toFixed(2)} on ${e.date} will be removed.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteMut({ variables: { id: e.id } });
        toast.success("Deleted");
      },
    });

  const tabs: { id: Tab; label: string }[] = [
    { id: "menu", label: "Weekly Menu" },
    { id: "attendance", label: "Meal Attendance" },
    { id: "expenses", label: "Expenses" },
  ];

  return (
    <div>
      <Header
        title="Mess & Canteen"
        subtitle="Menus, meal attendance and provisioning spend"
        action={
          tab === "expenses" ? (
            <Can module="mess" action="create">
              <button className="btn-primary flex items-center gap-2"
                onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }}>
                <Plus size={16} /> Add Expense
              </button>
            </Can>
          ) : undefined
        }
      />

      <div className="mb-4 flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <button key={t.id}
            className={`px-4 py-2 text-sm ${tab === t.id ? "border-b-2 border-primary font-medium" : "text-muted-foreground/70"}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "expenses" && (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground/70 block mb-1">Hostel Block</label>
            <div className="w-56">
              <SearchableSelect
                value={blockId}
                onChange={setBlockId}
                options={blocks.map((b) => ({ value: b.id, label: b.name }))}
                placeholder="Campus-wide"
              />
            </div>
          </div>
          {tab === "attendance" && (
            <>
              <div>
                <label className="text-xs text-muted-foreground/70 block mb-1">Date</label>
                <input type="date" className="input-field" value={date}
                  onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground/70 block mb-1">Meal</label>
                <select className="input-field w-40" value={meal}
                  onChange={(e) => setMeal(e.target.value)}>
                  {MEALS.map((m) => <option key={m} value={m}>{MEAL_LABELS[m]}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "expenses" && (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground/70 block mb-1">From</label>
            <input type="date" className="input-field" value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground/70 block mb-1">To</label>
            <input type="date" className="input-field" value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground/70">Total spend</p>
            <p className="text-xl font-semibold font-mono">{total.toFixed(2)}</p>
          </div>
        </div>
      )}

      {tab === "menu" &&
        (menuLoading ? <LoadingSpinner /> : (
          <MenuGrid menu={menu} canWrite={canWrite} onSave={saveMenuCell} />
        ))}

      {tab === "attendance" && (
        <MessAttendanceGrid rows={rows} loading={attendanceLoading} canWrite={canWrite} onSave={saveAttendance} />
      )}

      {tab === "expenses" &&
        (expenseLoading ? <LoadingSpinner /> : (
          <ExpenseTable expenses={expenses} canWrite={canWrite}
            onEdit={(e) => { setEditingExpense(e); setShowExpenseModal(true); }}
            onDelete={removeExpense} />
        ))}

      <ExpenseModal
        isOpen={showExpenseModal}
        editing={editingExpense}
        vendors={vendors}
        purchaseOrders={purchaseOrders}
        onClose={() => { setShowExpenseModal(false); setEditingExpense(null); }}
        onSave={saveExpense}
      />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
