// Shared types for the Vendors (suppliers) page.

export type GqlVendor = {
  id: string;
  name: string;
  code?: string | null;
  gstin?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  paymentTerms?: string | null;
  active: boolean;
  createdAt?: string | null;
};

export type VendorForm = {
  name: string;
  code: string;
  gstin: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  payment_terms: string;
  active: boolean;
};

export const emptyVendorForm: VendorForm = {
  name: "",
  code: "",
  gstin: "",
  contact_name: "",
  phone: "",
  email: "",
  address: "",
  payment_terms: "",
  active: true,
};
