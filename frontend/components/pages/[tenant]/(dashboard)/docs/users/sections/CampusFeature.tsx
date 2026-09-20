"use client";

import DocSection from "../../_shared/DocSection";
import Callout from "../../_shared/Callout";

const cards = [
  { title: "Hostel",    body: "Block → Floor → Room hierarchy. Allocate rooms to students; track vacancies; reassign in one click." },
  { title: "Transport", body: "Bus routes, stops, fares. Assign students to a stop; print bus passes; report monthly utilisation." },
  { title: "Library",   body: "Book catalog with issue/return tracking, fines and member history." },
  { title: "Events",    body: "Campus calendar of events. Visible in dashboards, with optional RSVP." },
  { title: "Timetable", body: "Visual weekly grid per class. Conflicts (room/teacher double-booked) are flagged on save." },
  { title: "Calendar",  body: "Working days vs. holidays vs. half-days. Drives attendance % and leave accrual." },
];

export default function CampusFeature() {
  return (
    <DocSection
      id="campus"
      title="Campus modules"
      description="Operational modules that aren't core academics but matter to daily life on campus."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.title} className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-bold text-foreground mb-1">{c.title}</div>
            <div className="text-sm text-muted-foreground leading-relaxed">{c.body}</div>
          </div>
        ))}
      </div>

      <Callout variant="tip" title="All optional">
        Every campus module is independent — leave any of them empty if your
        institute doesn&apos;t need it. They appear on the dashboard but won&apos;t
        block other workflows.
      </Callout>
    </DocSection>
  );
}
