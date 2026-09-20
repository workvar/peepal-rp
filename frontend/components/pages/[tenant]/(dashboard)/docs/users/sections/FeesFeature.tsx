"use client";

import DocSection from "../../_shared/DocSection";
import StepList from "../../_shared/StepList";
import ScreenshotPlaceholder from "../../_shared/ScreenshotPlaceholder";
import Callout from "../../_shared/Callout";

export default function FeesFeature() {
  return (
    <DocSection
      id="fees"
      eyebrow="Finance"
      title="Fees"
      description="Plan-based fee management: define fee codes once, compose structures with optional add-ons (transport, food, hostel), and allocate plans to departments, courses, batches, or individual students."
    >
      <ScreenshotPlaceholder label="Student fees table with plan, net, paid, due and status columns" />

      <h3 className="text-base font-bold text-foreground mb-2">Setup (admin)</h3>
      <StepList
        steps={[
          { title: "Create fee categories", body: "Fees → Categories. These are your fee codes: Tuition, Transport, Food, Hostel, Library deposit." },
          { title: "Build a fee structure", body: "Fees → Structures. Pick an academic year and add line items from your categories. Mark items like Transport or Food as add-ons." },
          { title: "Create fee plans", body: "Fees → Fee Plans. A plan is one variation of a structure, e.g. 'B.Tech with Transport + Food'. Choose the add-ons it includes and split the total into installments with due dates." },
          { title: "Allocate the plan", body: "Allocate a plan to a department, course, batch, or a single student. A fee record with installments is generated for every covered student. Use Sync later to pick up newly admitted students." },
          { title: "Apply discounts", body: "Fees → Student Fees. Expand a student and add scholarship or concession lines (fixed or percentage) before payments begin; installments rescale automatically." },
        ]}
      />

      <h3 className="text-base font-bold text-foreground mt-6 mb-2">Recording payments (staff)</h3>
      <StepList
        steps={[
          { title: "Open Fees → Payments", body: "Choose the student fee being paid. The outstanding balance is shown." },
          { title: "Record a payment", body: "Enter the amount, date, and mode (cash/online/cheque/DD). It applies to installments oldest-first, or pick a specific installment. A receipt number is generated immediately." },
          { title: "Cancel if needed", body: "Admins can cancel a payment; its amount is reversed from the installments." },
        ]}
      />

      <Callout variant="info" title="Student view">
        Students see their allocated plan, installment schedule with due dates,
        any discounts applied, and their full payment history under Fees.
      </Callout>
    </DocSection>
  );
}
