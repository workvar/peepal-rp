// Shared types for the Purchase Orders (and supplier invoices) page.

export type GqlVendorRef = { id: string; name: string };

export type GqlInventoryItemRef = {
  id: string;
  code: string;
  name: string;
  linkedDrugId?: string | null;
};

export type GqlPOItem = {
  id: string;
  itemId?: string | null;
  itemName: string;
  qty: number;
  receivedQty: number;
  unitCost: number;
  taxPct: number;
  lineTotal: number;
};

export type GqlPurchaseOrder = {
  id: string;
  poNumber: string;
  vendorId: string;
  vendor?: GqlVendorRef | null;
  status: string;
  orderDate?: string | null;
  expectedDate?: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  notes?: string | null;
  items: GqlPOItem[];
};

export type GqlPurchaseInvoice = {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  vendor?: GqlVendorRef | null;
  purchaseOrderId?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  status: string;
};

// Form line for the PO create/edit modal (all strings for inputs).
export type POLineForm = {
  item_id: string; // "" = free-text / non-stock line
  item_name: string;
  qty: string;
  unit_cost: string;
  tax_pct: string;
};

export type POForm = {
  vendor_id: string;
  order_date: string;
  expected_date: string;
  notes: string;
  lines: POLineForm[];
};

export const emptyPOLine: POLineForm = {
  item_id: "",
  item_name: "",
  qty: "1",
  unit_cost: "0",
  tax_pct: "0",
};

export const emptyPOForm: POForm = {
  vendor_id: "",
  order_date: "",
  expected_date: "",
  notes: "",
  lines: [{ ...emptyPOLine }],
};

export const PO_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ordered: "Ordered",
  partially_received: "Partially received",
  received: "Received",
  cancelled: "Cancelled",
};
