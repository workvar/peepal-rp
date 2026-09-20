"use client";

import ChartCard from "@/components/pages/[tenant]/(dashboard)/dashboard/sections/ChartCard";
import EmptyChart from "@/components/pages/[tenant]/(dashboard)/dashboard/sections/EmptyChart";
import DonutChart from "@/components/pages/[tenant]/(dashboard)/dashboard/charts/DonutChart";
import type { PlatformPeopleStats } from "../types";

// People: students vs employees split, plus the largest organisations by
// combined headcount.
export default function PeopleSection({ people }: { people: PlatformPeopleStats }) {
  const split = [
    { label: "Students", value: people.students },
    { label: "Employees", value: people.employees },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ChartCard title="People Split" subtitle={`${people.users.toLocaleString()} total accounts`}>
        {split.length > 0 ? (
          <DonutChart data={split} height={240} />
        ) : (
          <EmptyChart message="No people yet" height={240} />
        )}
      </ChartCard>

      <ChartCard
        className="lg:col-span-2"
        title="Largest Organisations"
        subtitle="By combined headcount"
      >
        {people.topTenants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Organisation</th>
                  <th className="py-2 px-3 font-medium text-right">Students</th>
                  <th className="py-2 px-3 font-medium text-right">Employees</th>
                  <th className="py-2 pl-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {people.topTenants.map((t) => (
                  <tr key={t.tenantId} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 text-foreground">{t.tenantName}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                      {t.students.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                      {t.employees.toLocaleString()}
                    </td>
                    <td className="py-2 pl-3 text-right tabular-nums font-semibold text-foreground">
                      {(t.students + t.employees).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyChart
            message="No people yet"
            hint="Add students or employees to rank your largest organisations."
            height={200}
          />
        )}
      </ChartCard>
    </div>
  );
}
