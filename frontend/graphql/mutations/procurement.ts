import { gql } from "@apollo/client";

export const CREATE_VENDOR = gql`
  mutation CreateVendor($input: CreateVendorInput!) {
    createVendor(input: $input) { id name active }
  }
`;

export const UPDATE_VENDOR = gql`
  mutation UpdateVendor($id: ID!, $input: UpdateVendorInput!) {
    updateVendor(id: $id, input: $input) { id name active }
  }
`;

export const DELETE_VENDOR = gql`
  mutation DeleteVendor($id: ID!) { deleteVendor(id: $id) }
`;

export const CREATE_PURCHASE_ORDER = gql`
  mutation CreatePurchaseOrder($input: CreatePurchaseOrderInput!) {
    createPurchaseOrder(input: $input) { id poNumber status }
  }
`;

export const UPDATE_PURCHASE_ORDER = gql`
  mutation UpdatePurchaseOrder($id: ID!, $input: UpdatePurchaseOrderInput!) {
    updatePurchaseOrder(id: $id, input: $input) { id poNumber status }
  }
`;

export const SET_PURCHASE_ORDER_STATUS = gql`
  mutation SetPurchaseOrderStatus($id: ID!, $status: String!) {
    setPurchaseOrderStatus(id: $id, status: $status) { id status }
  }
`;

export const DELETE_PURCHASE_ORDER = gql`
  mutation DeletePurchaseOrder($id: ID!) { deletePurchaseOrder(id: $id) }
`;

export const RECEIVE_PURCHASE_ORDER = gql`
  mutation ReceivePurchaseOrder($id: ID!, $input: ReceivePurchaseOrderInput!) {
    receivePurchaseOrder(id: $id, input: $input) { id status }
  }
`;

export const CREATE_PURCHASE_INVOICE = gql`
  mutation CreatePurchaseInvoice($input: CreatePurchaseInvoiceInput!) {
    createPurchaseInvoice(input: $input) { id invoiceNumber status }
  }
`;

export const RECORD_PURCHASE_PAYMENT = gql`
  mutation RecordPurchasePayment($input: RecordPurchasePaymentInput!) {
    recordPurchasePayment(input: $input) { id status paidAmount }
  }
`;

export const DELETE_PURCHASE_INVOICE = gql`
  mutation DeletePurchaseInvoice($id: ID!) { deletePurchaseInvoice(id: $id) }
`;
