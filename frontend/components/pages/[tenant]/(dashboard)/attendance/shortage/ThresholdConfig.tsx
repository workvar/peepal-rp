"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import { UPDATE_ATTENDANCE_SETTINGS } from "@/graphql/mutations/calendar";
import { ATTENDANCE_SHORTAGE } from "@/graphql/queries/attendance";
import { Settings2, Check, X } from "lucide-react";

interface Props {
  currentThreshold: number;
}

export default function ThresholdConfig({ currentThreshold }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<number>(currentThreshold);

  const [updateSettings, { loading }] = useMutation(UPDATE_ATTENDANCE_SETTINGS, {
    refetchQueries: [{ query: ATTENDANCE_SHORTAGE }],
    onCompleted: () => setEditing(false),
  });

  function handleOpen() {
    setValue(currentThreshold);
    setEditing(true);
  }

  function handleCancel() {
    setValue(currentThreshold);
    setEditing(false);
  }

  function handleSave() {
    if (value < 1 || value > 100) return;
    void updateSettings({ variables: { input: { minAttendancePct: value } } });
  }

  if (!editing) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 hover:bg-muted/40 transition-colors"
        title="Configure threshold"
      >
        <Settings2 size={14} />
        Threshold: {currentThreshold}%
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Threshold:</span>
      <input
        type="number"
        min={1}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="input w-20 text-sm py-1 px-2"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") handleCancel();
        }}
      />
      <span className="text-sm text-muted-foreground">%</span>
      <button
        onClick={handleSave}
        disabled={loading || value < 1 || value > 100}
        className="btn btn-primary btn-sm py-1 px-2"
        title="Save"
      >
        <Check size={14} />
      </button>
      <button
        onClick={handleCancel}
        disabled={loading}
        className="btn btn-ghost btn-sm py-1 px-2"
        title="Cancel"
      >
        <X size={14} />
      </button>
    </div>
  );
}
