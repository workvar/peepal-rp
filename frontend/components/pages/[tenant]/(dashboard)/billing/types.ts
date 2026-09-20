// Shared types for the clinical Billing page.

export type GqlBillableService = {
  id: string;
  code: string;
  name: string;
  category: string;
  unitPrice: number;
  active: boolean;
};

export type GqlInvoiceItem = {
  id: string;
  serviceId?: string | null;
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

export type GqlInvoicePayment = {
  id: string;
  amount: number;
  mode: string;
  reference?: string | null;
  paidAt?: string | null;
};

export type GqlInvoice = {
  id: string;
  invoiceNo: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  patientUhid?: string | null;
  encounterId?: string | null;
  encounterCrNumber?: string | null;
  date: string;
  items: GqlInvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  payments?: GqlInvoicePayment[];
  status: string;
  notes?: string | null;
  createdAt?: string | null;
};

export type ServiceForm = {
  code: string;
  name: string;
  category: string;
  unit_price: string;
  active: boolean;
};

export const emptyServiceForm: ServiceForm = {
  code: "",
  name: "",
  category: "consultation",
  unit_price: "",
  active: true,
};

export const SERVICE_CATEGORIES = ["consultation", "procedure", "lab", "radiology", "other"];
export const PAYMENT_MODES = ["cash", "card", "upi", "online", "cheque"];

export type InvoiceLineForm = {
  service_id: string; // "" = free-text line
  description: string;
  qty: string;
  unit_price: string;
};

export const emptyInvoiceLine: InvoiceLineForm = {
  service_id: "",
  description: "",
  qty: "1",
  unit_price: "",
};

export type InvoiceForm = {
  patient_id: string;
  date: string;
  discount: string;
  notes: string;
  lines: InvoiceLineForm[];
};

export const emptyInvoiceForm: InvoiceForm = {
  patient_id: "",
  date: "",
  discount: "",
  notes: "",
  lines: [{ ...emptyInvoiceLine }],
};

export function lineAmount(l: InvoiceLineForm): number {
  return (parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0);
}

export function invoiceFormSubtotal(f: InvoiceForm): number {
  return f.lines.reduce((sum, l) => sum + lineAmount(l), 0);
}
