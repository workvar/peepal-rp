"use client";

import DocSection from "../../_shared/DocSection";
import StepList from "../../_shared/StepList";
import ScreenshotPlaceholder from "../../_shared/ScreenshotPlaceholder";
import Callout from "../../_shared/Callout";

export default function LeavesFeature() {
  return (
    <DocSection
      id="leaves"
      title="Leaves"
      description="A simple submit → approve → notify cycle. Anyone can apply; routing is decided by the configured approval flow."
    >
      <ScreenshotPlaceholder label="Apply leave form with type, dates and reason" />

      <h3 className="text-base font-bold text-foreground mb-2">Applying for leave</h3>
      <StepList
        steps={[
          { title: "Open Leaves", body: "From the dashboard click Leaves. You'll see your past applications and a button to apply for a new one." },
          { title: "Pick a leave type", body: "Casual, Sick, Earned, On-Duty etc. Types are configured by the admin under Org → Leave Types." },
          { title: "Select date range", body: "Start and end. Half-day option is available for single-day leaves." },
          { title: "Add a reason", body: "Plain text. The approver will see this verbatim." },
          { title: "Submit", body: "The request is routed to step 1 of the configured approval flow. You'll see live status — Pending / Approved / Rejected." },
        ]}
      />

      <h3 className="text-base font-bold text-foreground mt-6 mb-2">Approving (teacher / admin)</h3>
      <StepList
        steps={[
          { title: "Check My Approvals", body: "If a request is waiting on you, the bell badge updates and the My Approvals page lists it at the top." },
          { title: "Open the request", body: "You see the requester, dates, type, reason and the trail of any prior steps." },
          { title: "Approve or reject", body: "Add an optional comment and act. The engine routes to the next step or closes the loop." },
        ]}
      />

      <Callout variant="info" title="Leave balances">
        Each user has a per-type quota that auto-deducts on approval. Admins
        can adjust balances from a user&apos;s profile if a manual correction is
        needed.
      </Callout>
    </DocSection>
  );
}
