"use client";

import MarketingShell from "@/components/marketing/layout/MarketingShell";
import InfoHero from "@/components/marketing/sections/InfoHero";
import LegalSection from "@/components/marketing/sections/LegalSection";

const SECTIONS = [
  {
    title: "1. Acceptance of terms",
    body: (
      <p>
        By accessing or using Peepal ("the Service"), you agree to be bound by
        these Terms &amp; Conditions. If you do not agree, you may not use the
        Service. These terms apply to admins, teachers, students, staff and any
        other authorised user of a Peepal workspace.
      </p>
    ),
  },
  {
    title: "2. Your account",
    body: (
      <>
        <p>
          Accounts are provisioned by an administrator of your institution.
          You are responsible for keeping your credentials confidential and for
          all activity that happens under your account.
        </p>
        <p>
          Notify your administrator immediately if you suspect unauthorised
          access. Peepal provides role-based access control — your permissions
          are set by your institution's administrator.
        </p>
      </>
    ),
  },
  {
    title: "3. Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Use the Service for anything unlawful or in breach of local regulations.</li>
          <li>Upload content you do not have the right to share.</li>
          <li>Attempt to gain access to accounts, data or systems you are not authorised to access.</li>
          <li>Introduce malicious code, viruses or other harmful material.</li>
          <li>Reverse-engineer, decompile or otherwise attempt to derive the source of the Service.</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Your institution's data",
    body: (
      <p>
        Your institution retains full ownership of the data it enters into
        Peepal. We process that data as a data processor acting on your
        institution's instructions. Administrators can export or delete data at
        any time. See our Privacy Policy for details.
      </p>
    ),
  },
  {
    title: "5. Service availability",
    body: (
      <p>
        We work hard to keep Peepal fast and available, but we do not
        guarantee uninterrupted access. Scheduled maintenance will be
        communicated in advance where possible. The Service is provided on an
        "as is" and "as available" basis.
      </p>
    ),
  },
  {
    title: "6. Intellectual property",
    body: (
      <p>
        Peepal, its logo, and the underlying software are the property of
        their respective owners. You receive a limited, non-transferable right
        to use the Service for its intended purpose while your account is active.
      </p>
    ),
  },
  {
    title: "7. Limitation of liability",
    body: (
      <p>
        To the maximum extent permitted by law, Peepal shall not be liable
        for indirect, incidental, special or consequential damages arising from
        your use of the Service, including loss of data, revenue or business
        opportunity.
      </p>
    ),
  },
  {
    title: "8. Termination",
    body: (
      <p>
        Your institution's administrator may suspend or terminate your account
        at any time. On termination, your right to access the Service ends, but
        your institution's data remains available to the institution per its
        retention settings.
      </p>
    ),
  },
  {
    title: "9. Changes to these terms",
    body: (
      <p>
        We may update these terms from time to time. Material changes will be
        communicated through the Service. Continued use of Peepal after such
        updates constitutes acceptance of the revised terms.
      </p>
    ),
  },
  {
    title: "10. Contact",
    body: (
      <p>
        Questions about these terms? Reach your institution's administrator or
        contact the Peepal team through the support channel provided to your
        organisation.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <MarketingShell>
      <InfoHero
        eyebrow="Terms &amp; Conditions"
        title="The rules, in plain language."
        subtitle="Last updated April 21, 2026. These terms govern your use of Peepal. We've tried to keep them short and easy to understand."
        accent="#14b8a6"
      />
      <LegalSection sections={SECTIONS} />
    </MarketingShell>
  );
}
