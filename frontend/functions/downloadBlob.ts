// Saves a binary response (a PDF streamed from the backend) to the user's
// machine via a temporary object URL + anchor click. Shared by every
// backend-generated PDF download (payslip, fee schedule, fee receipts, grades).
export function downloadBlobResponse(data: Blob | ArrayBuffer, filename: string): void {
  const blob = data instanceof Blob ? data : new Blob([data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Release on the next tick so the download has kicked off.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
