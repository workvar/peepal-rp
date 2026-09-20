"use client";

import MarketingShell from "@/components/marketing/layout/MarketingShell";
import InfoHero from "@/components/marketing/sections/InfoHero";
import LegalSection from "@/components/marketing/sections/LegalSection";

const SECTIONS = [
  {
    title: "1. Who this applies to",
    body: (
      <p>
        This policy describes how Peepal handles data on behalf of
        institutions that use the Service, and the individuals (admins,
        teachers, students, staff, guardians) whose data lives inside those
        Peepal workspaces.
      </p>
    ),
  },
  {
    title: "2. What we collect",
    body: (
      <>
        <p>We only collect the data your institution asks us to store, which includes:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li><strong>Account data</strong> — name, email, role, profile photo.</li>
          <li><strong>Academic data</strong> — enrollments, marks, attendance, leaves, reports.</li>
          <li><strong>HR data</strong> — employee profiles, payroll and payment details.</li>
          <li><strong>Financial data</strong> — fee ledgers, payments, receipts.</li>
          <li><strong>Operational telemetry</strong> — logs, error reports, request metadata needed to operate the Service securely.</li>
        </ul>
      </>
    ),
  },
  {
    title: "3. How we use it",
    body: (
      <>
        <p>Data is used strictly to deliver the Service:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Running the workflows your institution has configured.</li>
          <li>Enforcing role-based access and auditing.</li>
          <li>Sending notifications you or your admin have opted into.</li>
          <li>Diagnosing issues and improving reliability.</li>
        </ul>
        <p>We do not sell, rent or trade personal data. We do not use workspace data to train third-party models.</p>
      </>
    ),
  },
  {
    title: "4. Where it lives",
    body: (
      <p>
        Workspace data is stored in managed cloud databases with encryption at
        rest and in transit. Backups are encrypted and retained for a short,
        bounded window. Sensitive fields (e.g. payment details) have
        column-level encryption on top of the transport layer.
      </p>
    ),
  },
  {
    title: "5. Who can see it",
    body: (
      <p>
        Peepal's role-based access control means users only see what their
        role entitles them to. Our engineering team accesses production data
        only when necessary to resolve a specific support or reliability issue,
        and that access is logged.
      </p>
    ),
  },
  {
    title: "6. Your rights",
    body: (
      <>
        <p>Depending on where you live, you may have rights to:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Access the personal data held about you.</li>
          <li>Correct inaccurate data.</li>
          <li>Request deletion of your data, subject to your institution's retention requirements.</li>
          <li>Port your data in a machine-readable format.</li>
        </ul>
        <p>Raise any of these requests with your institution's administrator, who can action them directly or escalate to us.</p>
      </>
    ),
  },
  {
    title: "7. Cookies and similar tech",
    body: (
      <p>
        Peepal uses strictly necessary cookies to keep you signed in and to
        protect your session. We do not use advertising or cross-site tracking
        cookies inside the product.
      </p>
    ),
  },
  {
    title: "8. Data retention",
    body: (
      <p>
        We retain workspace data for as long as your institution's account is
        active. On termination, data is retained for a short wind-down period
        for export, after which it is securely deleted.
      </p>
    ),
  },
  {
    title: "9. Minors",
    body: (
      <p>
        Peepal is used inside institutions that may include minors. We do
        not collect data from minors directly; all data is collected and
        managed by their institution under its own policies and consent
        frameworks.
      </p>
    ),
  },
  {
    title: "10. Changes to this policy",
    body: (
      <p>
        We'll update this page when material changes happen, and surface
        notices in the product for changes that affect how data is handled.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <InfoHero
        eyebrow="Privacy Policy"
        title="Your data. Your rules."
        subtitle="Last updated April 21, 2026. We only collect what we need, and we never sell it. Here's how we handle data at Peepal."
        accent="#3b82f6"
      />
      <LegalSection sections={SECTIONS} />
    </MarketingShell>
  );
}
