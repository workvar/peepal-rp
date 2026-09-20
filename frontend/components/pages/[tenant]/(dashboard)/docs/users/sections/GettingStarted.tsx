"use client";

import DocSection from "../../_shared/DocSection";
import UserOnboardingFlow from "../../diagrams/UserOnboardingFlow";
import StepList from "../../_shared/StepList";
import Callout from "../../_shared/Callout";
import ScreenshotPlaceholder from "../../_shared/ScreenshotPlaceholder";

export default function GettingStarted() {
  return (
    <DocSection
      id="getting-started"
      title="Getting started — admin&#39;s first day"
      description="A 30-minute walkthrough that takes a brand-new institute from empty to fully operational."
    >
      <UserOnboardingFlow />

      <ScreenshotPlaceholder
        label="Org Profile screen"
        caption="Org → Profile is the very first screen to fill out."
      />

      <StepList
        steps={[
          { title: "Log in", body: "Open https://<your-org>/login and sign in with the admin credentials provided to you. If you forgot them, the platform owner (super admin) can reset them from the platform console." },
          { title: "Set the org profile", body: "Go to Org → Profile. Add the institute name, logo, address, theme colour. This rebrands the entire app for your tenant." },
          { title: "Pick the right terminology", body: "Inside Org → Profile, choose your vertical (College / School / Training / Healthcare). Labels like 'Student' will switch to 'Member' / 'Patient' automatically." },
          { title: "Create departments", body: "Org → Departments. Create the academic departments (CSE, ME) or operational ones (HR, Admin). Employees and approval flows route through these." },
          { title: "Set the academic year", body: "Org → Academic Years. Mark the current year so timetables, attendance and marks attach to it." },
          { title: "Add holidays", body: "Org → Holidays. The calendar excludes these from working days, attendance and shortage reports." },
          { title: "Create users", body: "People → Users. Add your first teachers, staff, and a few students. Each new user gets an email + temporary password." },
          { title: "You're live", body: "Teachers can now mark attendance, students can log in, leaves and approvals start flowing. Everything else is incremental." },
        ]}
      />

      <Callout variant="success" title="Default credentials">
        Out of the box, the seeded admin is{" "}
        <code className="font-mono">admin@college.edu</code> /{" "}
        <code className="font-mono">Admin@123</code>. Change this immediately
        from My Profile → Change Password.
      </Callout>
    </DocSection>
  );
}
