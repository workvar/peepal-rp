"use client";

// Live preview. The slip is laid out in millimetres for print, so it is scaled
// down to fit the editor column without changing the component.

import OpdSlip from "@/components/opd-slip/OpdSlip";
import type { OpdSlipConfig, SlipData } from "@/components/opd-slip/types";

export default function PreviewPane({
  config,
  data,
}: {
  config: OpdSlipConfig;
  data: SlipData;
}) {
  return (
    <div className="card overflow-hidden">
      <h3 className="mb-3 font-semibold">Live preview</h3>
      <div className="overflow-auto rounded border border-border bg-muted/30 p-3">
        <div
          style={{ transform: "scale(0.62)", transformOrigin: "top left", width: "162%" }}
          className="shadow-sm"
        >
          <OpdSlip config={config} data={data} />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Sample data shown. Real bookings fill these values in automatically.
      </p>
    </div>
  );
}
