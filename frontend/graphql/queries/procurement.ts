import { gql } from "@apollo/client";

export const LIST_VENDORS = gql`
  query ListVendors($active: Boolean) {
    vendors(active: $active) {
      id name code gstin contactName phone email address paymentTerms active createdAt
    }
  }
`;

export const LIST_PURCHASE_ORDERS = gql`
  query ListPurchaseOrders($status: String, $vendorId: String) {
    purchaseOrders(status: $status, vendorId: $vendorId) {
      id poNumber vendorId status orderDate expectedDate subtotal taxTotal total notes
      vendor { id name }
      items { id itemId itemName qty receivedQty unitCost taxPct lineTotal }
    }
  }
`;

export const GET_PURCHASE_ORDER = gql`
  query GetPurchaseOrder($id: ID!) {
    purchaseOrder(id: $id) {
      id poNumber vendorId status orderDate expectedDate subtotal taxTotal total notes
      vendor { id name }
      items { id itemId itemName qty receivedQty unitCost taxPct lineTotal }
    }
  }
`;

export const LIST_PURCHASE_INVOICES = gql`
  query ListPurchaseInvoices($status: String) {
    purchaseInvoices(status: $status) {
      id invoiceNumber vendorId purchaseOrderId invoiceDate dueDate
      subtotal taxTotal total paidAmount status
      vendor { id name }
    }
  }
`;

export const EXPIRING_DRUGS = gql`
  query ExpiringDrugs($days: Int!) {
    expiringDrugs(days: $days) {
      id drugId drugName batchNo expiryDate qty unitCost
    }
  }
`;
