"use client";

import DocSection from "../../_shared/DocSection";
import StepList from "../../_shared/StepList";
import Callout from "../../_shared/Callout";

export default function CommunicationsFeature() {
  return (
    <DocSection
      id="communications"
      title="Notices & Notifications"
      description="Two parallel channels: long-form Notices (announcements board) and short-form Notifications (in-app bell)."
    >
      <h3 className="text-base font-bold text-foreground mb-2">Posting a notice</h3>
      <StepList
        steps={[
          { title: "Open Notices", body: "Communications → Notices." },
          { title: "Compose", body: "Title, body (rich text), and target audience — All / Students / Employees / a specific Department or Course." },
          { title: "Schedule or publish", body: "Choose a publish date. Notices auto-expire on the end date if you set one." },
        ]}
      />

      <Callout variant="info" title="Notifications">
        Many actions trigger automatic in-app notifications — leave decisions,
        marks published, fee reminders. Users see a bell badge and a pop-over
        list. No setup required.
      </Callout>
    </DocSection>
  );
}
