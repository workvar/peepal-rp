// ── Healthcare Permission Groups ───────────────────────────────────────────
//
// Chips shown on the Roles & Permissions cards for hospital tenants. They are
// filtered out for other industries by permissionGroupsFor(), which keys off
// each group's `module`.
//
// These keys match the ones the backend seeds onto the ready-made Receptionist
// / Doctor / Pharmacist roles (backend/models/default_roles_healthcare.go).
// They are display labels only — actual enforcement lives in the access matrix
// (/org/access-control) as per-module CRUD rules.

import type { PermissionGroup } from "./permissions";

export const HEALTHCARE_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "Patients",
    module: "patients",
    color: "blue",
    permissions: [
      { key: "patients_read",  label: "View patients",   description: "See the patient register and profiles" },
      { key: "patients_write", label: "Manage patients", description: "Register, edit, and update patient records" },
    ],
  },
  {
    label: "Appointments",
    module: "appointments",
    color: "teal",
    permissions: [
      { key: "appointments_read",   label: "View appointments",   description: "See the appointment book and clinician availability" },
      { key: "appointments_manage", label: "Book appointments",   description: "Book, reschedule, and cancel appointments" },
    ],
  },
  {
    label: "OPD Visits",
    module: "encounters",
    color: "green",
    permissions: [
      { key: "encounters_read",  label: "View visits",    description: "Read consultation notes and prescriptions" },
      { key: "encounters_write", label: "Record visits",  description: "Create and edit clinical encounters" },
    ],
  },
  {
    label: "Laboratory",
    module: "laboratory",
    color: "violet",
    permissions: [
      { key: "lab_read",  label: "View lab results", description: "See lab orders and reports" },
      { key: "lab_order", label: "Order lab tests",  description: "Raise lab orders and enter results" },
    ],
  },
  {
    label: "Radiology",
    module: "radiology",
    color: "indigo",
    permissions: [
      { key: "radiology_read",  label: "View imaging",   description: "See radiology orders and reports" },
      { key: "radiology_order", label: "Order imaging",  description: "Raise imaging orders and file reports" },
    ],
  },
  {
    label: "Pharmacy",
    module: "pharmacy",
    color: "pink",
    permissions: [
      { key: "pharmacy_read",     label: "View pharmacy",    description: "See the drug catalog and stock levels" },
      { key: "pharmacy_dispense", label: "Dispense drugs",   description: "Dispense against prescriptions" },
      { key: "pharmacy_manage",   label: "Manage pharmacy",  description: "Maintain the drug catalog and stock" },
    ],
  },
  {
    label: "Inpatient",
    module: "admissions",
    color: "orange",
    permissions: [
      { key: "ipd_read",   label: "View admissions",   description: "See admitted patients, wards, and beds" },
      { key: "ipd_manage", label: "Manage admissions", description: "Admit, transfer, and discharge patients" },
    ],
  },
  {
    label: "Clinical Billing",
    module: "billing",
    color: "yellow",
    permissions: [
      { key: "billing_read",  label: "View invoices",  description: "See invoices, receipts, and dues" },
      { key: "billing_write", label: "Raise invoices", description: "Create invoices and record payments" },
    ],
  },
  {
    label: "Inventory & Stores",
    module: "inventory",
    color: "gray",
    permissions: [
      { key: "inventory_read",   label: "View stock",   description: "See central store items and stock levels" },
      { key: "inventory_manage", label: "Manage stock", description: "Receive, issue, and adjust stock" },
    ],
  },
];
