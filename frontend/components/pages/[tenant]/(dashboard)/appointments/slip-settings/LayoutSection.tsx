"use client";

// Paper, notes space, codes, signature, and footer.

import type { OpdSlipConfig } from "@/components/opd-slip/types";

export default function LayoutSection({
  config,
  set,
}: {
  config: OpdSlipConfig;
  set: (patch: Partial<OpdSlipConfig>) => void;
}) {
  return (
    <div className="card space-y-4">
      <h3 className="font-semibold">Layout &amp; extras</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground/80">Paper size</label>
          <select
            className="input-field"
            value={config.paperSize}
            onChange={(e) => set({ paperSize: e.target.value as OpdSlipConfig["paperSize"] })}
          >
            <option value="A4">A4</option>
            <option value="A5">A5</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground/80">
            Notes space (mm)
          </label>
          <input
            type="number"
            min={0}
            max={200}
            className="input-field"
            value={config.notesHeightMm}
            onChange={(e) => set({ notesHeightMm: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.showNotes}
          onChange={(e) => set({ showNotes: e.target.checked })}
        />
        Leave blank space for the doctor&apos;s notes
      </label>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/80">Notes heading</label>
        <input
          className="input-field"
          value={config.notesLabel}
          onChange={(e) => set({ notesLabel: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.showQr}
            onChange={(e) => set({ showQr: e.target.checked })}
          />
          QR code (appointment)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.showBarcode}
            onChange={(e) => set({ showBarcode: e.target.checked })}
          />
          Barcode (patient ID)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.showSignatureLine}
            onChange={(e) => set({ showSignatureLine: e.target.checked })}
          />
          Signature line
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.showFooter}
            onChange={(e) => set({ showFooter: e.target.checked })}
          />
          Footer
        </label>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/80">
          Signature label
        </label>
        <input
          className="input-field"
          value={config.signatureLabel}
          onChange={(e) => set({ signatureLabel: e.target.value })}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/80">
          Footer lines <span className="text-muted-foreground/60">(one per line)</span>
        </label>
        <textarea
          className="input-field"
          rows={2}
          value={config.footerLines.join("\n")}
          onChange={(e) => set({ footerLines: e.target.value.split("\n") })}
        />
      </div>
    </div>
  );
}
