"use client";

import { Trash2, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { emptyBand, TEN_POINT_BANDS, FOUR_POINT_BANDS, type BandRow } from "./types";

type Props = {
  bands: BandRow[];
  showGradePoint: boolean;
  onChange: (bands: BandRow[]) => void;
  disabled?: boolean;
};

export default function BandEditor({ bands, showGradePoint, onChange, disabled }: Props) {
  const update = (i: number, patch: Partial<BandRow>) =>
    onChange(bands.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const remove = (i: number) => onChange(bands.filter((_, idx) => idx !== i));
  const add = () => onChange([...bands, { ...emptyBand }]);
  const preset = (rows: BandRow[]) => onChange(rows.map((b) => ({ ...b })));

  const cols = showGradePoint ? 6 : 5;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-semibold text-foreground">Grade bands</h3>
          <p className="text-xs text-muted-foreground">
            A subject&apos;s percentage maps to the highest band it reaches.
          </p>
        </div>
        {!disabled && (
          <div className="flex gap-2">
            <button type="button" className="btn-secondary text-xs py-1" onClick={() => preset(TEN_POINT_BANDS)}>
              10-point
            </button>
            <button type="button" className="btn-secondary text-xs py-1" onClick={() => preset(FOUR_POINT_BANDS)}>
              4.0
            </button>
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="table-th">Letter</th>
              <th className="table-th">Min %</th>
              <th className="table-th">Max %</th>
              {showGradePoint && <th className="table-th">Grade point</th>}
              <th className="table-th">Pass</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {bands.map((b, i) => (
              <tr key={i}>
                <td className="table-td">
                  <input
                    className="input-field w-20"
                    value={b.letter}
                    onChange={(e) => update(i, { letter: e.target.value })}
                    disabled={disabled}
                  />
                </td>
                <td className="table-td">
                  <input
                    type="number"
                    className="input-field w-24"
                    value={b.minPercent}
                    onChange={(e) => update(i, { minPercent: e.target.value })}
                    disabled={disabled}
                  />
                </td>
                <td className="table-td">
                  <input
                    type="number"
                    className="input-field w-24"
                    value={b.maxPercent}
                    onChange={(e) => update(i, { maxPercent: e.target.value })}
                    disabled={disabled}
                  />
                </td>
                {showGradePoint && (
                  <td className="table-td">
                    <input
                      type="number"
                      step="0.1"
                      className="input-field w-24"
                      value={b.gradePoint}
                      onChange={(e) => update(i, { gradePoint: e.target.value })}
                      disabled={disabled}
                    />
                  </td>
                )}
                <td className="table-td">
                  <Switch
                    size="sm"
                    checked={b.isPass}
                    onCheckedChange={(v) => update(i, { isPass: v })}
                    disabled={disabled}
                  />
                </td>
                <td className="table-td">
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="text-red-500 hover:text-red-700"
                      aria-label="Remove band"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {bands.length === 0 && (
              <tr>
                <td colSpan={cols} className="table-td text-center text-muted-foreground/70 py-6">
                  No bands yet. Add one or pick a preset.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!disabled && (
        <button type="button" onClick={add} className="mt-2 text-sm text-blue-600 flex items-center gap-1">
          <Plus size={14} /> Add band
        </button>
      )}
    </div>
  );
}
