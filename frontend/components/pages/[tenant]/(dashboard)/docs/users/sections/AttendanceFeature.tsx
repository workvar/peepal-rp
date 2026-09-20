"use client";

import DocSection from "../../_shared/DocSection";
import AttendanceFlowDiagram from "../../diagrams/AttendanceFlowDiagram";
import StepList from "../../_shared/StepList";
import Callout from "../../_shared/Callout";
import ScreenshotPlaceholder from "../../_shared/ScreenshotPlaceholder";

export default function AttendanceFeature() {
  return (
    <DocSection
      id="attendance"
      eyebrow="Operations"
      title="Attendance"
      description="One screen for marking, three views for reading. Works for both students and employees."
    >
      <AttendanceFlowDiagram />

      <ScreenshotPlaceholder label="Bulk-mark screen with Present / Absent / Leave / Half-day toggle" />

      <h3 className="text-base font-bold text-foreground mt-4 mb-2">Marking attendance (teacher)</h3>
      <StepList
        steps={[
          { title: "Open Attendance", body: "From the dashboard click Attendance. Pick the date and the class/section." },
          { title: "Bulk-set the default", body: "Use the 'mark all present' shortcut, then flip only the absentees. Faster than marking each one." },
          { title: "Per-row override", body: "Click any row's status pill to cycle Present → Absent → Leave → Half-day." },
          { title: "Save", body: "Records are upserted — re-saving the same date overwrites earlier values cleanly." },
        ]}
      />

      <h3 className="text-base font-bold text-foreground mt-6 mb-2">Reading attendance</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { t: "Summary",  v: "Per-user / per-class % over a date range." },
          { t: "Shortage", v: "Auto-flagged students below your threshold (default 75%)." },
          { t: "Export",   v: "CSV download for any range — pick fields and filters." },
        ].map((c) => (
          <div key={c.t} className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-bold text-foreground mb-1">{c.t}</div>
            <div className="text-sm text-muted-foreground">{c.v}</div>
          </div>
        ))}
      </div>

      <Callout variant="tip" title="Half-day & leaves count differently">
        Half-days count as 0.5; approved leave days are excluded from the
        denominator (so a sick week doesn&apos;t hurt the % unfairly).
        Configure this from <em>Org → Profile → Attendance</em>.
      </Callout>
    </DocSection>
  );
}
