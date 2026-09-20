"use client";

// Printable OPD slip page. Opened in a new tab from the Appointments list;
// the toolbar is screen-only (.no-print) so the sheet prints clean.

import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import OpdSlip from "@/components/opd-slip/OpdSlip";
import { useOpdSlipConfig } from "@/components/opd-slip/useOpdSlipConfig";
import { Printer } from "lucide-react";
import { useSlipData } from "./useSlipData";

export default function PrintOpdSlipPage() {
  const params = useParams();
  const search = useSearchParams();
  const id = params.id as string;

  const { data, loading } = useSlipData(id);
  const { config, loading: configLoading } = useOpdSlipConfig();
  const printed = useRef(false);

  // Print mode hides the dashboard chrome (sidebar, top bar) so only the slip
  // reaches the printer. See the .opd-print-mode rules in globals.css.
  useEffect(() => {
    document.body.classList.add("opd-print-mode");
    return () => document.body.classList.remove("opd-print-mode");
  }, []);

  // ?auto=1 opens the browser print dialog once, as soon as the slip is on
  // screen — the front desk's one-click flow. A manual visit just previews.
  useEffect(() => {
    if (printed.current) return;
    if (loading || configLoading || !data) return;
    if (search.get("auto") !== "1") return;
    printed.current = true;
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, [loading, configLoading, data, search]);

  if (loading || configLoading) return <LoadingSpinner />;
  if (!data) {
    return (
      <div className="card text-center py-12 text-muted-foreground/70">
        Appointment not found, or you do not have access to it.
      </div>
    );
  }

  return (
    <div className="opd-print-root">
      {/* The sheet the browser prints must match the configured paper. */}
      <style>{`@media print { @page { size: ${config.paperSize} portrait; margin: 0; } }`}</style>

      <div className="no-print mb-4 flex items-center gap-3">
        <button className="btn-primary flex items-center gap-2" onClick={() => window.print()}>
          <Printer size={16} /> Print slip
        </button>
        <span className="text-sm text-muted-foreground">
          Layout comes from the OPD Slip Designer.
        </span>
      </div>

      <div className="flex justify-center">
        <div className="shadow-sm print:shadow-none">
          <OpdSlip config={config} data={data} />
        </div>
      </div>
    </div>
  );
}
