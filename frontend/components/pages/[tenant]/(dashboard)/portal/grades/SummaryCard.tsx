"use client";

import type { GqlAcademicResult } from "@/types/grading";
import { overallPrimary } from "./metrics";

export default function SummaryCard({ result }: { result: GqlAcademicResult }) {
  const primary = overallPrimary(result.mode, result);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="card text-center">
        <p className="text-2xl font-bold text-foreground">{primary.value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{primary.label}</p>
      </div>
      <div className="card text-center">
        <p className="text-2xl font-bold text-foreground">{result.percentage}%</p>
        <p className="text-xs text-muted-foreground mt-0.5">Overall percentage</p>
      </div>
      <div className="card text-center">
        <p className="text-2xl font-bold text-foreground">{result.totalCredits}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Total credits</p>
      </div>
      <div className="card text-center">
        <p className={`text-2xl font-bold ${result.isPass ? "text-green-600" : "text-red-600"}`}>
          {result.isPass ? "Pass" : "Fail"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">Overall result</p>
      </div>
    </div>
  );
}
