"use client";

import DocSection from "../../_shared/DocSection";

const faqs: { q: string; a: string }[] = [
  { q: "I forgot my password.", a: "There is no self-serve reset by design. Contact your admin — they can reset it from People → Users." },
  { q: "I see fewer modules than my colleague.", a: "Module visibility is role-based. Ask your admin for a custom role with the extra permissions, or to change your base role." },
  { q: "Marks I entered aren't showing for the student.", a: "Marks are visible to students only after they're 'published' for that exam. Open the marks screen and click Publish." },
  { q: "My leave is stuck on 'Pending'.", a: "It's waiting on the next approver in the chain. Open the request to see who. If they're unavailable, an admin can delegate the step." },
  { q: "I need to import 500 students at once.", a: "Use the bulk-upload widget on the Students page. Download the CSV template, fill it, upload — errors are reported per row." },
  { q: "How do I change the dashboard's branding?", a: "Org → Profile lets the admin set the institute name, logo, and theme colour. Changes take effect on next login." },
  { q: "Can students see each other's data?", a: "No. Students only see their own attendance, marks, fees and leaves. The portal is per-user." },
  { q: "Where do uploaded photos go?", a: "Photos and PDFs (payslips, receipts) live on the server under backend/uploads/. Backups should include this directory." },
];

export default function Faq() {
  return (
    <DocSection
      id="faq"
      title="FAQ"
      description="Quick answers to the questions support hears most often."
    >
      <div className="space-y-2">
        {faqs.map((f, i) => (
          <details
            key={i}
            className="group rounded-xl border border-border bg-card open:bg-muted/20"
          >
            <summary className="cursor-pointer list-none flex items-center justify-between p-4 text-sm font-bold text-foreground">
              {f.q}
              <span className="text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
              {f.a}
            </div>
          </details>
        ))}
      </div>
    </DocSection>
  );
}
