"use client";

// The printable OPD slip. One component drives both the configurator preview
// and the real print page, so what an admin sees while editing is exactly what
// the patient carries to the doctor.
//
// Sizing is in millimetres so the browser's print output matches the on-screen
// preview. Everything here is print-safe: no interactive elements, no colours
// that vanish when the browser drops backgrounds.

import SlipHeader from "./SlipHeader";
import SlipFieldGrid from "./SlipFieldGrid";
import SlipCodes from "./SlipCodes";
import type { OpdSlipConfig, SlipData } from "./types";

const PAPER_WIDTH_MM: Record<OpdSlipConfig["paperSize"], number> = { A4: 210, A5: 148 };

export default function OpdSlip({
  config,
  data,
}: {
  config: OpdSlipConfig;
  data: SlipData;
}) {
  return (
    <div
      className="opd-slip bg-white text-black"
      style={{
        width: `${PAPER_WIDTH_MM[config.paperSize]}mm`,
        padding: "12mm",
        boxSizing: "border-box",
      }}
    >
      <SlipHeader config={config} data={data} />
      <SlipFieldGrid config={config} data={data} />

      {config.showNotes && (
        <div className="mt-2">
          <div
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: config.accentColor }}
          >
            {config.notesLabel}
          </div>
          <div
            className="mt-1 rounded border border-gray-300"
            style={{ height: `${config.notesHeightMm}mm` }}
          />
        </div>
      )}

      {config.showSignatureLine && (
        <div className="mt-4 flex justify-end">
          <div className="text-center">
            <div className="w-[55mm] border-b border-gray-500" />
            <div className="mt-1 text-[10px] text-gray-600">{config.signatureLabel}</div>
          </div>
        </div>
      )}

      <SlipCodes config={config} data={data} />

      {config.showFooter && (
        <div className="mt-3 border-t border-gray-300 pt-2 text-[10px] text-gray-500">
          {config.footerLines.filter(Boolean).map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
