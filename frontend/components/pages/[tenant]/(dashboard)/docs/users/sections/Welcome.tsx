"use client";

import DocSection from "../../_shared/DocSection";
import StatGrid from "../../_shared/StatGrid";
import Callout from "../../_shared/Callout";
import { Users, GraduationCap, ClipboardCheck, FileText } from "lucide-react";

export default function Welcome() {
  return (
    <DocSection
      id="welcome"
      eyebrow="Start here"
      title="Welcome to Peepal"
      description="Peepal runs the day-to-day of an institute. People, classes, attendance, marks, leaves, fees and notices, all from a single dashboard."
    >
      <StatGrid
        cols={4}
        stats={[
          { label: "Roles",         value: "4",    icon: Users,           hint: "Admin · Teacher · Student · Staff" },
          { label: "Modules",       value: "30+",  icon: GraduationCap,   hint: "From attendance to payroll" },
          { label: "Approvals",     value: "Built-in", icon: ClipboardCheck, hint: "Multi-step, configurable" },
          { label: "Reports",       value: "Live", icon: FileText,        hint: "Attendance, marks, fees, payroll, leaves" },
        ]}
      />

      <Callout variant="tip" title="Who should read what?">
        <p>
          <strong>Admins</strong> read every section — you set up the institute
          and create everyone else. <strong>Teachers</strong> care about
          attendance, marks and leave approvals. <strong>Students &amp; Staff</strong> mostly use Profile, Leaves and Notices.
        </p>
      </Callout>
    </DocSection>
  );
}
