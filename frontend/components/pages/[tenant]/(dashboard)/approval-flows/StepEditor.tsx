"use client";

import { useRef, useState } from "react";
import { ArrowDown, GripVertical, Trash2 } from "lucide-react";
import ApproverInput from "./ApproverInput";
import StepCondition from "./StepCondition";
import type { ApprovalStep, FormField } from "@/api/services/approvals";

type OrgUser = { id: string; name: string; email: string; role: string };
type Department = { id: string; name: string };

interface Props {
  steps: ApprovalStep[];
  users: OrgUser[];
  departments: Department[];
  formFields: FormField[];
  onChange: (steps: ApprovalStep[]) => void;
}

// StepEditor lets the admin add / remove / re-order approval steps. Reorder
// is via native HTML5 drag-and-drop on the grip handle.
export default function StepEditor({ steps, users, departments, formFields, onChange }: Props) {
  const dragSrc = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const renumber = (list: ApprovalStep[]) =>
    list.map((s, i) => ({ ...s, step_order: i + 1 }));

  const addStep = () =>
    onChange(
      renumber([
        ...steps,
        {
          step_order: steps.length + 1,
          name: `Step ${steps.length + 1}`,
          approver_type: "manager",
          manager_level: 1,
        },
      ]),
    );

  const removeStep = (idx: number) =>
    onChange(renumber(steps.filter((_, i) => i !== idx)));

  const updateStep = (idx: number, next: ApprovalStep) => {
    const copy = [...steps];
    copy[idx] = next;
    onChange(copy);
  };

  const onDragStart = (idx: number) => (e: React.DragEvent) => {
    dragSrc.current = idx;
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(idx);
  };

  const onDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const from = dragSrc.current;
    dragSrc.current = null;
    if (from === null || from === idx) return;
    const copy = [...steps];
    const [moved] = copy.splice(from, 1);
    copy.splice(idx, 0, moved);
    onChange(renumber(copy));
  };

  return (
    <div className="space-y-3">
      {steps.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No steps yet — without any steps the action is auto-approved.
        </p>
      )}
      {steps.map((step, idx) => (
        <div
          key={idx}
          onDragOver={onDragOver(idx)}
          onDrop={onDrop(idx)}
          onDragLeave={() => setDragOver(null)}
        >
          <div
            className="card p-3 space-y-2"
            style={{
              borderColor: dragOver === idx ? "rgb(var(--primary))" : undefined,
              background: dragOver === idx ? "rgb(var(--primary) / 0.05)" : undefined,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <span
                  draggable
                  onDragStart={onDragStart(idx)}
                  className="cursor-grab text-muted-foreground hover:text-foreground"
                  title="Drag to reorder"
                >
                  <GripVertical size={16} />
                </span>
                <span
                  className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-semibold shrink-0"
                  style={{
                    background: "rgb(var(--primary) / 0.12)",
                    color: "rgb(var(--primary))",
                  }}
                >
                  {idx + 1}
                </span>
                <input
                  className="input-field flex-1"
                  value={step.name}
                  onChange={(e) => updateStep(idx, { ...step, name: e.target.value })}
                  placeholder="Step label (e.g. Manager Approval)"
                />
              </div>
              <button
                type="button"
                className="text-red-600 hover:text-red-800 p-1"
                onClick={() => removeStep(idx)}
                aria-label="Remove step"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <ApproverInput
              step={step}
              users={users}
              departments={departments}
              onChange={(next) => updateStep(idx, next)}
            />
            {step.approver_type === "manager" && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Levels up the chain (1 = immediate manager)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="input-field max-w-[6rem]"
                  value={step.manager_level ?? 1}
                  onChange={(e) =>
                    updateStep(idx, {
                      ...step,
                      manager_level: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                />
              </div>
            )}
            {formFields.length > 0 && (
              <StepCondition
                step={step}
                formFields={formFields}
                onChange={(next) => updateStep(idx, next)}
              />
            )}
          </div>
          {idx < steps.length - 1 && (
            <div className="flex justify-center my-1 text-muted-foreground">
              <ArrowDown size={16} />
            </div>
          )}
        </div>
      ))}
      <button type="button" className="btn-ghost" onClick={addStep}>
        + Add step
      </button>
    </div>
  );
}
