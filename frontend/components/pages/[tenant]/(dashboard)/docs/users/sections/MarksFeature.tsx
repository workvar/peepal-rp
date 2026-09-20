"use client";

import DocSection from "../../_shared/DocSection";
import StepList from "../../_shared/StepList";
import ScreenshotPlaceholder from "../../_shared/ScreenshotPlaceholder";
import Callout from "../../_shared/Callout";

const grades: { letter: string; range: string; gpa: string }[] = [
  { letter: "O",  range: "90 – 100", gpa: "10" },
  { letter: "A+", range: "80 – 89",  gpa: "9" },
  { letter: "A",  range: "70 – 79",  gpa: "8" },
  { letter: "B+", range: "60 – 69",  gpa: "7" },
  { letter: "B",  range: "50 – 59",  gpa: "6" },
  { letter: "C",  range: "40 – 49",  gpa: "5" },
  { letter: "F",  range: "< 40",     gpa: "0" },
];

export default function MarksFeature() {
  return (
    <DocSection
      id="marks"
      title="Marks & Grades"
      description="Teachers enter raw marks; Peepal auto-computes the grade and GPA. Results consolidate marks across subjects per term."
    >
      <ScreenshotPlaceholder label="Marks entry table — students × subjects" />

      <StepList
        steps={[
          { title: "Open Marks", body: "Academics → Marks. Pick the academic year, semester, course and subject." },
          { title: "Choose the exam", body: "Marks are per-exam (Mid Sem 1, End Sem, …). Exams are configured under Academics → Exam Schedules." },
          { title: "Enter scores", body: "Type marks per student. Out-of-range values are highlighted instantly. Hit Tab to move to the next row." },
          { title: "Save", body: "Grades and GPA are computed and shown alongside the score. Students see their marks in their portal once published." },
        ]}
      />

      <h3 className="text-base font-bold text-foreground mt-4 mb-2">Default grading scale</h3>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">Grade</th>
              <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">Marks (%)</th>
              <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">GPA</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((g) => (
              <tr key={g.letter} className="border-t border-border/60">
                <td className="py-2 px-4 font-bold text-foreground">{g.letter}</td>
                <td className="py-2 px-4 text-muted-foreground">{g.range}</td>
                <td className="py-2 px-4 text-muted-foreground">{g.gpa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Callout variant="tip" title="Custom scales">
        The bands above are the default. Admins can change the cutoffs per
        academic year from <em>Academics → Subjects</em>.
      </Callout>
    </DocSection>
  );
}
