"use client";

// Header branding: logo, hospital name/address, doctor block, accent colour.

import type { OpdSlipConfig } from "@/components/opd-slip/types";

export default function BrandingSection({
  config,
  set,
}: {
  config: OpdSlipConfig;
  set: (patch: Partial<OpdSlipConfig>) => void;
}) {
  return (
    <div className="card space-y-4">
      <h3 className="font-semibold">Header &amp; branding</h3>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.showLogo}
          onChange={(e) => set({ showLogo: e.target.checked })}
        />
        Print the hospital logo
      </label>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/80">
          Logo URL <span className="text-muted-foreground/60">(blank uses your org profile logo)</span>
        </label>
        <input
          className="input-field"
          placeholder="https://…/logo.png"
          value={config.logoUrl}
          onChange={(e) => set({ logoUrl: e.target.value })}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/80">
          Hospital name <span className="text-muted-foreground/60">(blank uses your org name)</span>
        </label>
        <input
          className="input-field"
          value={config.hospitalName}
          onChange={(e) => set({ hospitalName: e.target.value })}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/80">
          Address lines <span className="text-muted-foreground/60">(one per line)</span>
        </label>
        <textarea
          className="input-field"
          rows={3}
          value={config.addressLines.join("\n")}
          onChange={(e) => set({ addressLines: e.target.value.split("\n") })}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.showDoctorBlock}
          onChange={(e) => set({ showDoctorBlock: e.target.checked })}
        />
        Print the doctor block (top right)
      </label>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/80">
          Extra doctor block lines
          <span className="text-muted-foreground/60"> (qualifications, booking phone — one per line)</span>
        </label>
        <textarea
          className="input-field"
          rows={3}
          placeholder={"MS, M.Ch (Surgical Oncology)\nFor appointments: 99906 03631"}
          value={config.doctorBlockLines.join("\n")}
          onChange={(e) => set({ doctorBlockLines: e.target.value.split("\n") })}
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-foreground/80">Accent colour</label>
        <input
          type="color"
          className="h-9 w-14 cursor-pointer rounded border border-border"
          value={config.accentColor}
          onChange={(e) => set({ accentColor: e.target.value })}
        />
      </div>
    </div>
  );
}
