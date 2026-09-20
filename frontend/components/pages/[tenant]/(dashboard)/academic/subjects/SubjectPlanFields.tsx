"use client";

import { Plus, Trash2 } from "lucide-react";
import UnitCard from "./UnitCard";

export type UnitForm = {
  title: string;
  content: string;
  labActivities: string;
  fieldVisits: string;
  others: string;
};

export const emptyUnit = (): UnitForm => ({
  title: "",
  content: "",
  labActivities: "",
  fieldVisits: "",
  others: "",
});

// Course outcomes + the unit-by-unit course plan for a subject. These travel
// with the subject when it is assigned to a semester on the Curriculum page.
export default function SubjectPlanFields({
  outcomes,
  units,
  onOutcomesChange,
  onUnitsChange,
}: {
  outcomes: string[];
  units: UnitForm[];
  onOutcomesChange: (o: string[]) => void;
  onUnitsChange: (u: UnitForm[]) => void;
}) {
  const setOutcome = (i: number, v: string) =>
    onOutcomesChange(outcomes.map((o, idx) => (idx === i ? v : o)));
  const addOutcome = () => onOutcomesChange([...outcomes, ""]);
  const removeOutcome = (i: number) => onOutcomesChange(outcomes.filter((_, idx) => idx !== i));

  const setUnit = (i: number, patch: Partial<UnitForm>) =>
    onUnitsChange(units.map((u, idx) => (idx === i ? { ...u, ...patch } : u)));
  const addUnit = () => onUnitsChange([...units, emptyUnit()]);
  const removeUnit = (i: number) => onUnitsChange(units.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-5 border-t border-border/60 pt-4">
      {/* Course outcomes */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-foreground/80">Course Outcomes</label>
          <button type="button" onClick={addOutcome} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Plus size={13} /> Add outcome
          </button>
        </div>
        {outcomes.length === 0 && (
          <p className="text-xs text-muted-foreground/70">
            None yet. Outcomes attach to this subject and follow it when it&apos;s added to a semester.
          </p>
        )}
        <div className="space-y-2">
          {outcomes.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-9 shrink-0">CO{i + 1}</span>
              <input
                className="input-field flex-1"
                placeholder="e.g. Apply data structures to solve real problems"
                value={o}
                onChange={(e) => setOutcome(i, e.target.value)}
              />
              <button type="button" onClick={() => removeOutcome(i)} className="text-red-500 hover:text-red-700 p-1" aria-label="Remove outcome">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Course plan — units */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-foreground/80">Course Plan — Units</label>
          <button type="button" onClick={addUnit} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Plus size={13} /> Add unit
          </button>
        </div>
        {units.length === 0 ? (
          <p className="text-xs text-muted-foreground/70">No units yet. Add units to lay out the syllabus.</p>
        ) : (
          <div className="space-y-2">
            {units.map((u, i) => (
              <UnitCard
                key={i}
                index={i}
                unit={u}
                onChange={(patch) => setUnit(i, patch)}
                onRemove={() => removeUnit(i)}
                defaultOpen={!u.title && !u.content}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
