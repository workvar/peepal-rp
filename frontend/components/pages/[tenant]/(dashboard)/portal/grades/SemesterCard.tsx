"use client";

import { GPA_MODES, type GradeMode, type GqlSemesterResult } from "@/types/grading";
import { pctTier, semesterPrimary } from "./metrics";

type Props = { sem: GqlSemesterResult; mode: GradeMode; gpaMax: number };

export default function SemesterCard({ sem, mode, gpaMax }: Props) {
  const isGpa = GPA_MODES.includes(mode);
  const primary = semesterPrimary(mode, sem, gpaMax);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Semester {sem.semester}</h3>
        <div className="text-right">
          <p className="text-xl font-bold text-foreground">{primary.value}</p>
          <p className="text-xs text-muted-foreground">{primary.label}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="py-1 font-medium">Subject</th>
              <th className="py-1 font-medium">Marks</th>
              <th className="py-1 font-medium">%</th>
              {isGpa && <th className="py-1 font-medium">Grade pt</th>}
              <th className="py-1 font-medium">Grade</th>
              <th className="py-1 font-medium text-right">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {sem.subjects.map((s, i) => (
              <tr key={i}>
                <td className="py-2">{s.subject}</td>
                <td className="py-2 font-mono">
                  {s.marksObtained}/{s.maxMarks}
                </td>
                <td className="py-2">{s.percentage}%</td>
                {isGpa && <td className="py-2">{s.gradePoint}</td>}
                <td className="py-2">
                  <span className={`${pctTier(s.percentage)} text-white text-xs px-2 py-0.5 rounded font-bold`}>
                    {s.letter}
                  </span>
                </td>
                <td className="py-2 text-right">
                  <span className={s.isPass ? "text-green-600" : "text-red-600"}>
                    {s.isPass ? "Pass" : "Fail"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground mt-3 pt-2 border-t border-border">
        <span>Credits: {sem.totalCredits}</span>
        <span>
          Total: {sem.marksObtained}/{sem.maxMarks} ({sem.percentage}%)
        </span>
        <span className={sem.isPass ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
          {sem.isPass ? "Semester passed" : "Semester failed"}
        </span>
      </div>
    </div>
  );
}
