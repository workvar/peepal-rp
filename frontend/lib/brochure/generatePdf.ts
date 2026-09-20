// Dynamically builds a PDF from the live brochure DOM (WYSIWYG) and downloads
// it. One continuous page sized to the content, so it does not depend on the
// browser print dialog and has no forced page breaks. Pure client-side.

export async function downloadBrochurePdf(
  captureId: string,
  fileName: string
): Promise<void> {
  const el = document.getElementById(captureId);
  if (!el) throw new Error(`Capture element #${captureId} not found`);

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const cssW = el.clientWidth;
  const cssH = el.scrollHeight;

  const canvas = await html2canvas(el, {
    scale: 2, // crisp output
    useCORS: true,
    backgroundColor: "#ffffff",
    windowWidth: cssW,
    width: cssW,
    height: cssH,
  });

  // One continuous page exactly the size of the rendered content.
  const pdf = new jsPDF({
    orientation: cssH >= cssW ? "portrait" : "landscape",
    unit: "px",
    format: [cssW, cssH],
    compress: true,
  });
  pdf.addImage(
    canvas.toDataURL("image/jpeg", 0.92),
    "JPEG",
    0,
    0,
    cssW,
    cssH
  );
  pdf.save(fileName);
}
