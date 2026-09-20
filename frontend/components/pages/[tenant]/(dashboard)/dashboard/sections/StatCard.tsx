import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Sparkline from "../charts/Sparkline";

export interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  href?: string;
  trend?: string;
  spark?: number[];
}

export default function StatCard({ label, value, icon: Icon, color, href, trend, spark }: StatCardProps) {
  const inner = (
    <div className="relative flex flex-col gap-3 p-4 rounded-2xl border border-border bg-card hover:shadow-md transition-all duration-200 h-full">
      <div className="flex items-start justify-between gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}1A`, color }}
        >
          <Icon size={18} />
        </div>
        {href && <ArrowUpRight size={15} className="text-muted-foreground" />}
      </div>

      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums leading-none">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-1.5">{label}</p>
      </div>

      <div className="flex items-end justify-between gap-2">
        {trend && <span className="text-[11px] font-medium" style={{ color }}>{trend}</span>}
        {spark && spark.length > 1 && (
          <div className="ml-auto">
            <Sparkline data={spark} color={color} />
          </div>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href} className="block h-full">{inner}</Link> : <div className="h-full">{inner}</div>;
}
