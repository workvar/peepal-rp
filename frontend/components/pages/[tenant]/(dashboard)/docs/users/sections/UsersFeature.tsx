"use client";

import DocSection from "../../_shared/DocSection";
import StepList from "../../_shared/StepList";
import Callout from "../../_shared/Callout";
import ScreenshotPlaceholder from "../../_shared/ScreenshotPlaceholder";

export default function UsersFeature() {
  return (
    <DocSection
      id="users"
      eyebrow="People"
      title="Users — creating accounts"
      description="The Users module is admin-only. It is where every login account in the institute is born."
    >
      <ScreenshotPlaceholder label="Users list with 'Add User' button" />

      <StepList
        steps={[
          { title: "Open Users", body: "From the dashboard go to People → Users. You'll see a searchable list of every account in the institute." },
          { title: "Click 'Add User'", body: "A modal opens. Enter name, work email, base role (admin/teacher/student/staff) and an initial password." },
          { title: "Optionally pick a custom role", body: "If you've defined custom roles under Org → Roles, you can attach one for extra permissions." },
          { title: "Optionally pick a manager / department", body: "Setting a manager wires the user into the org chart. Manager-based approval steps will route requests upward." },
          { title: "Save", body: "The user is created instantly. They can log in immediately with the credentials you set." },
        ]}
      />

      <Callout variant="info" title="Users vs. Employees vs. Students">
        Every account in the institute is a <strong>User</strong>. Employees
        and Students are extra <strong>profiles</strong> attached to a User
        with HR / academic data. Creating a Student or Employee creates the
        underlying User automatically.
      </Callout>

      <Callout variant="warn" title="Deactivate, don't delete">
        Use the active/inactive toggle to revoke access without losing history
        (attendance, marks, leaves). Deletion is reserved for typos.
      </Callout>
    </DocSection>
  );
}
