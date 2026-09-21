"use client";

import { useAccess } from "@/lib/useAccess";
import ChartCard from "./ChartCard";
import EmptyChart from "./EmptyChart";
import LineChart from "../charts/LineChart";
import BarChart from "../charts/BarChart";
import DonutChart from "../charts/DonutChart";
import GroupedBarChart from "../charts/GroupedBarChart";
import { compactMoney } from "../analytics/format";
import type { DashboardAnalytics } from "../analytics/types";
import { useTerminology } from "@/store/hooks/useTerminology";

interface PeopleStats {
  students?: number;
  employees?: number;
  teachers?: number;
  patients?: number;
  occupiedBeds?: number;
  availableBeds?: number;
  todayOpd?: number;
  activeAdmissions?: number;
}

export default function AnalyticsGrid({
  data,
  stats,
}: {
  data: DashboardAnalytics;
  stats: PeopleStats;
}) {
  const { canViewHref } = useAccess();
  const t = useTerminology();
  const canAttendance = canViewHref("/attendance");
  const canMarks = canViewHref("/marks");
  const canFees = canViewHref("/fees");
  const canLeaves = canViewHref("/leaves");
  const canPayroll = canViewHref("/payroll");
  const canPatients = canViewHref("/patients");
  const canWards = canViewHref("/wards");
  const canOpd = canViewHref("/encounters");
  const canIpd = canViewHref("/ipd");

  const attendanceHasData = data.attendance.trend.some((row) => row.total > 0);

  // People tally: split the workforce into the terminology "staff" role
  // (teachers / clinicians / managers) and everyone else, so nobody is
  // double-counted — that group is a subset of employees. Patients are
  // a separate registry (not students with a relabel), so they get their
  // own slice when the clinical module is visible.
  const teaching = stats.teachers ?? 0;
  const nonTeaching = Math.max((stats.employees ?? 0) - teaching, 0);
  const people = [
    ...(canPatients
      ? [{ label: "Patients", value: stats.patients ?? 0 }]
      : [{ label: t.member_plural, value: stats.students ?? 0 }]),
    { label: t.staff_plural, value: teaching },
    { label: "Other employees", value: nonTeaching },
  ].filter((p) => p.value > 0);

  const beds = [
    { label: "Occupied", value: stats.occupiedBeds ?? 0 },
    { label: "Available", value: stats.availableBeds ?? 0 },
  ].filter((p) => p.value > 0);

  const careMix = [
    { label: "OPD today", value: stats.todayOpd ?? 0 },
    { label: "IPD admitted", value: stats.activeAdmissions ?? 0 },
  ].filter((p) => p.value > 0);

  return (
    <div className="space-y-4">
      {/* Attendance trend — full width */}
      {canAttendance && (
        <ChartCard title="Attendance Trend" subtitle="Daily attendance rate, last 14 days">
          {attendanceHasData ? (
            <LineChart
              data={data.attendance.trend.map((t) => ({ label: t.label, value: t.percentage }))}
              color="var(--color-category-blue)"
              unit="%"
              height={220}
            />
          ) : (
            <EmptyChart message="No attendance recorded yet" hint="Mark attendance to see the daily trend here." />
          )}
        </ChartCard>
      )}

      {/* People tally + grade distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="People Tally" subtitle={`Headcount across your ${t.organization.toLowerCase()}`}>
          {people.length > 0 ? (
            <DonutChart data={people} />
          ) : (
            <EmptyChart message="No people on record yet" />
          )}
        </ChartCard>

        {canMarks && (
          <ChartCard title="Grade Distribution" subtitle="Grade buckets across assessments">
            {data.marks.grades.length > 0 ? (
              <BarChart data={data.marks.grades} color="var(--color-category-purple)" />
            ) : (
              <EmptyChart message="No marks entered yet" hint="Enter marks to see grade buckets." />
            )}
          </ChartCard>
        )}
      </div>

      {/* Clinical occupancy — hospital tenants only (canViewHref hides these elsewhere). */}
      {(canWards || canOpd || canIpd) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {canWards && (
            <ChartCard title="Bed Occupancy" subtitle="Occupied vs available beds">
              {beds.length > 0 ? (
                <DonutChart data={beds} />
              ) : (
                <EmptyChart message="No beds configured yet" hint="Add wards and beds to see occupancy here." />
              )}
            </ChartCard>
          )}
          {(canOpd || canIpd) && (
            <ChartCard title="Care mix today" subtitle="Outpatient visits vs inpatients currently admitted">
              {careMix.length > 0 ? (
                <DonutChart data={careMix} />
              ) : (
                <EmptyChart message="No OPD or IPD activity yet" hint="Record a visit or admit a patient to see the mix." />
              )}
            </ChartCard>
          )}
        </div>
      )}

      {/* Leave status + fees by mode */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {canLeaves && (
          <ChartCard title="Leave Status" subtitle="Requests this year by status">
            {data.leaves.status.length > 0 ? (
              <DonutChart data={data.leaves.status} />
            ) : (
              <EmptyChart message="No leave requests yet" />
            )}
          </ChartCard>
        )}

        {canFees && (
          <ChartCard title="Fees by Payment Mode" subtitle="Collected amount per mode">
            {data.fees.byMode.length > 0 ? (
              <DonutChart data={data.fees.byMode} />
            ) : (
              <EmptyChart message="No payments yet" />
            )}
          </ChartCard>
        )}
      </div>

      {/* Fee collection trend — full width */}
      {canFees && (
        <ChartCard title="Monthly Fee Collection" subtitle="Collected amount per month">
          {data.fees.monthly.length > 0 ? (
            <BarChart
              data={data.fees.monthly}
              color="var(--color-category-green)"
              formatValue={(v) => `₹${compactMoney(v)}`}
            />
          ) : (
            <EmptyChart message="No collections yet" hint="Recorded fee payments will chart here by month." />
          )}
        </ChartCard>
      )}

      {/* Payroll gross vs net — full width */}
      {canPayroll && (
        <ChartCard title="Payroll Trend" subtitle="Gross vs net salary paid per month">
          {data.payroll.monthly.length > 0 ? (
            <GroupedBarChart
              data={data.payroll.monthly}
              series={[
                { name: "Gross", color: "var(--color-category-orange)" },
                { name: "Net", color: "var(--color-category-indigo)" },
              ]}
              formatValue={(v) => `₹${compactMoney(v)}`}
            />
          ) : (
            <EmptyChart message="No payroll processed yet" hint="Finalised payrolls will chart here by month." />
          )}
        </ChartCard>
      )}
    </div>
  );
}
