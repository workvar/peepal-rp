"use client";

// Slip header: hospital logo + name/address on the left, the doctor block on
// the right — the layout printed OPD slips have used for decades.

import type { OpdSlipConfig, SlipData } from "./types";

export default function SlipHeader({
  config,
  data,
}: {
  config: OpdSlipConfig;
  data: SlipData;
}) {
  const name = config.hospitalName || data.org?.name || "";
  const logo = config.logoUrl || data.org?.logoUrl || "";
  const doctorLines = config.doctorBlockLines.filter(Boolean);

  return (
    <div
      className="flex items-start justify-between gap-6 pb-3"
      style={{ borderBottom: `2px solid ${config.accentColor}` }}
    >
      <div className="flex items-start gap-3">
        {config.showLogo && logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" style={{ height: "16mm" }} className="object-contain" />
        ) : null}
        <div>
          <div className="text-xl font-bold leading-tight">{name}</div>
          {data.org?.tagline ? (
            <div className="text-[11px] text-gray-600">{data.org.tagline}</div>
          ) : null}
          {config.addressLines.filter(Boolean).map((line, i) => (
            <div key={i} className="text-[11px] text-gray-600">{line}</div>
          ))}
        </div>
      </div>

      {config.showDoctorBlock && (
        <div className="text-right">
          <div className="text-base font-semibold leading-tight">
            {data.appointment.clinicianName || ""}
          </div>
          {data.appointment.departmentName ? (
            <div className="text-[11px] text-gray-600">{data.appointment.departmentName}</div>
          ) : null}
          {doctorLines.map((line, i) => (
            <div key={i} className="text-[11px] text-gray-600">{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
