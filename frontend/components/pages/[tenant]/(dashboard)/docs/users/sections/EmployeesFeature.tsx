"use client";

import DocSection from "../../_shared/DocSection";
import StepList from "../../_shared/StepList";
import ScreenshotPlaceholder from "../../_shared/ScreenshotPlaceholder";
import Callout from "../../_shared/Callout";

export default function EmployeesFeature() {
  return (
    <DocSection
      id="employees"
      title="Employees"
      description="Profiles for everyone who works at the institute — teaching staff and non-teaching staff alike. Each employee row links to a login User."
    >
      <ScreenshotPlaceholder label="Employee list with department filters" />

      <StepList
        steps={[
          { title: "Open Employees", body: "People → Employees. You see a list grouped by department." },
          { title: "Click 'Add Employee'", body: "Fill in name, designation, employee ID, department, joining date, employment type (permanent/contract/part-time)." },
          { title: "Add personal details", body: "Phone, address, blood group, emergency contact, photo. These power profile cards and ID-card prints." },
          { title: "Save", body: "A login User is created automatically. Share the email + temporary password with the new hire." },
          { title: "Edit anytime", body: "Click any row to open a side-panel with editable fields. Changes are saved per-section." },
        ]}
      />

      <Callout variant="tip" title="Bulk import">
        For a large initial import, use the bulk upload widget at the top right
        of the employee list. Download the CSV template, fill rows, upload —
        any errors are reported per-row so you can fix and retry.
      </Callout>
    </DocSection>
  );
}
