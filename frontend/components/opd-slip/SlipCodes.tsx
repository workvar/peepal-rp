"use client";

// Scannable codes. The QR encodes the appointment id so a scan at any counter
// pulls up the booking; the barcode encodes the patient MRN, which is what the
// records room and lab actually scan.

import { qrSrc, barcodeSrc } from "@/lib/codes";
import type { OpdSlipConfig, SlipData } from "./types";

export default function SlipCodes({
  config,
  data,
}: {
  config: OpdSlipConfig;
  data: SlipData;
}) {
  if (!config.showQr && !config.showBarcode) return null;
  const mrn = data.appointment.patientMrn;

  return (
    <div className="flex items-end justify-between gap-6 pt-2">
      {config.showBarcode && mrn ? (
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={barcodeSrc(mrn, 420, 90)} alt="" style={{ height: "14mm" }} />
          <div className="font-mono text-[10px] tracking-widest">{mrn}</div>
        </div>
      ) : (
        <span />
      )}

      {config.showQr ? (
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc(data.appointment.id, 256)} alt="" style={{ height: "20mm", width: "20mm" }} />
          <div className="text-[9px] text-gray-500">Scan at counter</div>
        </div>
      ) : null}
    </div>
  );
}
