// Shared types and constants for the Mess & Canteen page (Phase 6b).

export type GqlMessMenu = {
  id: string;
  dayOfWeek: number;
  meal: string;
  items?: string | null;
  hostelBlockId?: string | null;
  hostelBlockName?: string | null;
};

export type GqlMessAttendanceRow = {
  id?: string | null;
  studentId: string;
  studentName: string;
  rollNumber?: string | null;
  date: string;
  meal: string;
  present: boolean;
};

export type GqlMessExpense = {
  id: string;
  date: string;
  category: string;
  description?: string | null;
  amount: number;
  vendorId?: string | null;
  vendorName?: string | null;
  purchaseOrderId?: string | null;
  poNumber?: string | null;
};

export type PickerBlock = { id: string; name: string; type?: string | null };
export type PickerVendor = { id: string; name: string };
export type PickerPO = { id: string; poNumber: string };

export const MEALS = ["breakfast", "lunch", "snacks", "dinner"] as const;
export const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snacks: "Snacks",
  dinner: "Dinner",
};

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const EXPENSE_CATEGORIES = ["groceries", "gas", "staff", "other"] as const;

export type ExpenseForm = {
  date: string;
  category: string;
  description: string;
  amount: string;
  vendor_id: string;
  purchase_order_id: string;
};

export const emptyExpenseForm: ExpenseForm = {
  date: new Date().toISOString().slice(0, 10),
  category: "groceries",
  description: "",
  amount: "",
  vendor_id: "",
  purchase_order_id: "",
};

/** Key for one cell of the weekly grid. */
export function cellKey(dayOfWeek: number, meal: string): string {
  return `${dayOfWeek}:${meal}`;
}
