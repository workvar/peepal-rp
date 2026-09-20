"use client";

import PageHeader from "@/components/ui/PageHeader";
import OnPageNav from "../_shared/OnPageNav";
import Welcome from "./sections/Welcome";
import GettingStarted from "./sections/GettingStarted";
import Login from "./sections/Login";
import Roles from "./sections/Roles";
import UsersFeature from "./sections/UsersFeature";
import EmployeesFeature from "./sections/EmployeesFeature";
import StudentsFeature from "./sections/StudentsFeature";
import AttendanceFeature from "./sections/AttendanceFeature";
import MarksFeature from "./sections/MarksFeature";
import LeavesFeature from "./sections/LeavesFeature";
import ApprovalsFeature from "./sections/ApprovalsFeature";
import FeesFeature from "./sections/FeesFeature";
import PayrollFeature from "./sections/PayrollFeature";
import CommunicationsFeature from "./sections/CommunicationsFeature";
import CampusFeature from "./sections/CampusFeature";
import ReportsFeature from "./sections/ReportsFeature";
import Faq from "./sections/Faq";

const anchors = [
  { id: "welcome",         label: "Welcome" },
  { id: "getting-started", label: "Getting started" },
  { id: "login",           label: "Logging in" },
  { id: "roles",           label: "Roles" },
  { id: "users",           label: "Users" },
  { id: "employees",       label: "Employees" },
  { id: "students",        label: "Students" },
  { id: "attendance",      label: "Attendance" },
  { id: "marks",           label: "Marks & Grades" },
  { id: "leaves",          label: "Leaves" },
  { id: "approvals",       label: "Approvals" },
  { id: "fees",            label: "Fees" },
  { id: "payroll",         label: "Payroll" },
  { id: "communications",  label: "Notices" },
  { id: "campus",          label: "Campus" },
  { id: "reports",         label: "Reports" },
  { id: "faq",             label: "FAQ" },
];

/** Long-form user-facing documentation for every module. */
export default function UsersPage() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_180px] gap-8">
      <div className="min-w-0">
        <PageHeader
          title="User Guide"
          subtitle="How to use every feature in Peepal, written for admins, teachers, students and staff."
        />
        <Welcome />
        <GettingStarted />
        <Login />
        <Roles />
        <UsersFeature />
        <EmployeesFeature />
        <StudentsFeature />
        <AttendanceFeature />
        <MarksFeature />
        <LeavesFeature />
        <ApprovalsFeature />
        <FeesFeature />
        <PayrollFeature />
        <CommunicationsFeature />
        <CampusFeature />
        <ReportsFeature />
        <Faq />
      </div>
      <aside className="hidden xl:block">
        <OnPageNav anchors={anchors} />
      </aside>
    </div>
  );
}
