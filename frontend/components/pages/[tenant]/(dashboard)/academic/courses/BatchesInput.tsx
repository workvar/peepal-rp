"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface BatchRow {
  key: number;
  startYear: string;
}

interface Props {
  batches: BatchRow[];
  onChange: (batches: BatchRow[]) => void;
}

let keyCounter = 0;

export function makeBatchRow(startYear = ""): BatchRow {
  return { key: ++keyCounter, startYear };
}

export default function BatchesInput({ batches, onChange }: Props) {
  const [inputVal, setInputVal] = useState("");

  function add() {
    const year = inputVal.trim();
    if (!year) return;
    const num = parseInt(year);
    if (isNaN(num) || num < 1900 || num > 2100) return;
    onChange([...batches, makeBatchRow(year)]);
    setInputVal("");
  }

  function remove(key: number) {
    onChange(batches.filter((b) => b.key !== key));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); add(); }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-foreground/80 mb-2">
        Batches <span className="text-muted-foreground font-normal text-xs">(optional — add start years)</span>
      </label>

      {batches.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {batches.map((b) => (
            <span
              key={b.key}
              className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs font-medium px-2.5 py-1 rounded-full"
            >
              {b.startYear}
              <button
                type="button"
                onClick={() => remove(b.key)}
                className="ml-0.5 text-emerald-600 hover:text-red-500"
              >
                <Trash2 size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="number"
          min="1900"
          max="2100"
          className="input-field flex-1"
          placeholder={`e.g. ${new Date().getFullYear()}`}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          onClick={add}
          className="btn-secondary flex items-center gap-1 shrink-0"
        >
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  );
}
