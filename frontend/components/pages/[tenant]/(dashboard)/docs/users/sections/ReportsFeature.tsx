"use client";

import DocSection from "../../_shared/DocSection";
import Callout from "../../_shared/Callout";

const reports = [
  { name: "Attendance",   what: "Per-class %, shortage trends, daily heatmap." },
  { name: "Marks",        what: "Subject-wise averages, top performers, grade distribution." },
  { name: "Fees",         what: "Collected vs. outstanding, by category, by month." },
  { name: "Payroll",      what: "Total payout per month, component breakdown, employee count." },
  { name: "Leaves",       what: "Most-used leave types, peak weeks, balance audit." },
];

export default function ReportsFeature() {
  return (
    <DocSection
      id="reports"
      title="Reports"
      description="Five built-in dashboards. Every chart has an export button — CSV for raw rows, PNG for the chart image."
    >
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left py-2.5 px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">Report</th>
              <th className="text-left py-2.5 px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">What you see</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.name} className="border-t border-border/60">
                <td className="py-2.5 px-4 font-bold text-foreground">{r.name}</td>
                <td className="py-2.5 px-4 text-muted-foreground">{r.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Callout variant="info" title="Live data">
        Reports query live data on every open. No nightly batch — you always
        see the current state.
      </Callout>
    </DocSection>
  );
}
