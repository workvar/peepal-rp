"use client";

// The identity grid: two columns of "Label: value" rows. Fields set to
// "blank" print a ruled line instead of a value so the counter can write on
// the printed slip.

import type { OpdSlipConfig, SlipData } from "./types";
import { readFieldValue } from "./fields";

export default function SlipFieldGrid({
  config,
  data,
}: {
  config: OpdSlipConfig;
  data: SlipData;
}) {
  const rows = config.fields.filter((f) => f.enabled);
  if (rows.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-1 py-3 text-[12px]">
      {rows.map((f) => {
        const value = readFieldValue(f, data);
        return (
          <div key={f.key} className="flex gap-2">
            <span className="shrink-0 font-semibold text-gray-700" style={{ minWidth: "32mm" }}>
              {f.label}:
            </span>
            {f.source === "blank" ? (
              <span className="flex-1 border-b border-dotted border-gray-400" />
            ) : (
              <span className="flex-1 break-words">{value || "—"}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
