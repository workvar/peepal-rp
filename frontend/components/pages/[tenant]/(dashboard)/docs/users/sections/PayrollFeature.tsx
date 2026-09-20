"use client";

import DocSection from "../../_shared/DocSection";
import StepList from "../../_shared/StepList";
import ScreenshotPlaceholder from "../../_shared/ScreenshotPlaceholder";
import Callout from "../../_shared/Callout";

export default function PayrollFeature() {
  return (
    <DocSection
      id="payroll"
      title="Payroll"
      description="Templates define the salary structure (Basic, HRA, allowances, deductions). Assignments attach a template to an employee. Payslips are generated per-month."
    >
      <ScreenshotPlaceholder label="Salary template editor with components, formulas and totals" />

      <StepList
        steps={[
          { title: "Create a salary template", body: "Salary → Templates. Add components — Basic, HRA, Special Allowance, PF, Professional Tax. Each can be a fixed amount or a % formula." },
          { title: "Assign to employees", body: "Salary → Assignments. Pick an employee and the template; set the effective date." },
          { title: "Run payroll for the month", body: "Payroll → Run for {month}. Attendance and approved leaves automatically adjust the payable days." },
          { title: "Generate payslips", body: "PDF payslips are produced per employee. Bulk-download or email them." },
        ]}
      />

      <Callout variant="warn" title="Frozen on generation">
        Once payslips are generated for a month, edits to the template no
        longer affect that month — you'd have to revert the run first. This
        keeps historical records honest.
      </Callout>
    </DocSection>
  );
}
