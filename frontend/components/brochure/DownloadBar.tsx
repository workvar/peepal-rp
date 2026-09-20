"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadBrochurePdf } from "@/lib/brochure/generatePdf";

// Generates the PDF dynamically from the live page (no browser print).
export default function DownloadBar({ captureId }: { captureId: string }) {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    if (busy) return;
    setBusy(true);
    try {
      await downloadBrochurePdf(captureId, "Peepal-Brochure.pdf");
    } catch (e) {
      console.error("Brochure PDF generation failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-5">
      <button
        type="button"
        onClick={handleDownload}
        disabled={busy}
        className="flex items-center gap-2 rounded-full bg-[#1f5d36] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#1f5d36]/30 transition-all hover:-translate-y-0.5 hover:bg-[#163f25] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? (
          <Loader2 size={17} className="animate-spin" />
        ) : (
          <Download size={17} />
        )}
        {busy ? "Preparing PDF…" : "Download brochure as PDF"}
      </button>
    </div>
  );
}
