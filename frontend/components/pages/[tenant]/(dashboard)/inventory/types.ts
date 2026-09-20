// Shared types for the Inventory & stores page.

export type GqlInventoryItem = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  stockQty: number;
  reorderLevel: number;
  unitCost: number;
  linkedDrugId?: string | null;
  linkedDrugName?: string | null;
  active: boolean;
};

export type GqlStockTxn = {
  id: string;
  kind: string;
  qty: number;
  reason?: string | null;
  byName?: string | null;
  date?: string | null;
};

export const INVENTORY_CATEGORIES = ["consumable", "reagent", "drug", "equipment", "other"];

export type ItemForm = {
  code: string; name: string; category: string; unit: string;
  reorder_level: string; unit_cost: string; opening_stock: string; linked_drug_id: string;
};

export const emptyItemForm: ItemForm = {
  code: "", name: "", category: "consumable", unit: "unit",
  reorder_level: "", unit_cost: "", opening_stock: "", linked_drug_id: "",
};
