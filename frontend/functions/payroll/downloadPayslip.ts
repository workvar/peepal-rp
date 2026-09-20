import { payrollAPI } from "@/api/services/finance";
import { PAYROLL_MONTHS } from "@/constants/payroll/months";
import type { GqlPayroll } from "@/types/pages/payroll/page";

// Downloads a paid payroll as a PDF by calling the backend endpoint
// `GET /payroll/:id/pdf`. The server returns a binary PDF which we
// save via a temporary object URL + anchor click.
//
// Throws if the network request fails — callers should surface an
// error toast so the user knows the download didn't happen.
export async function downloadPayslipAsPDF(payroll: GqlPayroll): Promise<void> {
  const res = await payrollAPI.downloadPDF(payroll.id);

  const blob: Blob =
    res.data instanceof Blob ? res.data : new Blob([res.data], { type: "application/pdf" });

  const filename = buildPayslipFilename(payroll);
  triggerBrowserDownload(blob, filename);
}

function buildPayslipFilename(p: GqlPayroll) {
  const month = PAYROLL_MONTHS[p.month - 1] ?? `${p.month}`;
  const code = p.employee?.employeeId || p.employeeId;
  // e.g. "payslip_EMP001_April_2026.pdf"
  return `payslip_${code}_${month}_${p.year}.pdf`;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Release the URL on the next tick so the download has kicked off.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
