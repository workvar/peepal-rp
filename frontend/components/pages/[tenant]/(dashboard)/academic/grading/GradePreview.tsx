"use client";

import { useState } from "react";
import { GPA_MODES } from "@/types/grading";
import { previewBand, type SchemeForm } from "./types";

export default function GradePreview({ form }: { form: SchemeForm }) {
  const [pct, setPct] = useState("75");
  const band = previewBand(form.bands, parseFloat(pct));
  const isGpa = GPA_MODES.includes(form.mode);

  return (
    <div className="card">
      <h3 className="font-semibold text-foreground mb-3">Preview</h3>
      <div className="flex items-center gap-3 flex-wrap text-sm">
        <span className="text-muted-foreground">A subject scoring</span>
        <input
          type="number"
          className="input-field w-24"
          value={pct}
          onChange={(e) => setPct(e.target.value)}
        />
        <span className="text-muted-foreground">% →</span>
        {band ? (
          <span className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
              {band.letter || "—"}
            </span>
            {isGpa && <span className="text-foreground">point {band.gradePoint || "0"}</span>}
            <span className={band.isPass ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
              {band.isPass ? "Pass" : "Fail"}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">no matching band</span>
        )}
      </div>
    </div>
  );
}
