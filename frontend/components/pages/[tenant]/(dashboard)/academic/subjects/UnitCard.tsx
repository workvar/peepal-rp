"use client";

import { useState } from "react";
import { ChevronRight, Trash2, Plus, Minus } from "lucide-react";
import type { UnitForm } from "./SubjectPlanFields";

// A single collapsible unit row in the subject's course plan. Collapsed it shows
// just the unit number + title; expanded it reveals the content, with the
// optional Lab / Field visit / Others fields tucked behind a "More details"
// toggle so the modal stays uncluttered when there are many units.
export default function UnitCard({
  index,
  unit,
  onChange,
  onRemove,
  defaultOpen = false,
}: {
  index: number;
  unit: UnitForm;
  onChange: (patch: Partial<UnitForm>) => void;
  onRemove: () => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasOptional = Boolean(unit.labActivities || unit.fieldVisits || unit.others);
  const [showMore, setShowMore] = useState(hasOptional);

  return (
    <div className="rounded-lg border border-border">
      {/* Header row — click to expand/collapse */}
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
          aria-expanded={open}
        >
          <ChevronRight
            size={15}
            className={"text-muted-foreground transition-transform shrink-0 " + (open ? "rotate-90" : "")}
          />
          <span className="text-xs font-medium text-muted-foreground shrink-0">Unit {index + 1}</span>
          <span className={"truncate text-sm " + (unit.title ? "font-medium" : "text-muted-foreground/60 italic")}>
            {unit.title || "Untitled unit"}
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 p-1 shrink-0"
          aria-label={`Remove unit ${index + 1}`}
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Body — only mounted when open */}
      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/60 pt-3">
          <input
            className="input-field font-medium"
            placeholder={`Unit ${index + 1} title`}
            value={unit.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
          <textarea
            className="input-field"
            rows={2}
            placeholder="Content / topics covered"
            value={unit.content}
            onChange={(e) => onChange({ content: e.target.value })}
          />

          <button
            type="button"
            onClick={() => setShowMore((s) => !s)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            {showMore ? <Minus size={13} /> : <Plus size={13} />}
            {showMore ? "Hide extra details" : "More details (lab, field visits, others)"}
          </button>

          {showMore && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <textarea className="input-field" rows={2} placeholder="Lab activities (optional)" value={unit.labActivities} onChange={(e) => onChange({ labActivities: e.target.value })} />
              <textarea className="input-field" rows={2} placeholder="Field visits (optional)" value={unit.fieldVisits} onChange={(e) => onChange({ fieldVisits: e.target.value })} />
              <textarea className="input-field" rows={2} placeholder="Others (optional)" value={unit.others} onChange={(e) => onChange({ others: e.target.value })} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
