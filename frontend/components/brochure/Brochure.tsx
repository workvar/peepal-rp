import BrochureCover from "./BrochureCover";
import BrochureWhy from "./BrochureWhy";
import BrochureFeatures from "./BrochureFeatures";
import BrochureClosing from "./BrochureClosing";
import DownloadBar from "./DownloadBar";
import type { BrochureContent } from "@/lib/brochure/content";

// Presentational brochure document, rendered from content. The capture node id
// is used by DownloadBar to build the PDF from exactly what is on screen.
export const CAPTURE_ID = "brochure-capture";

export default function Brochure({ content }: { content: BrochureContent }) {
  return (
    <main className="brochure-page bg-white pb-28">
      <div id={CAPTURE_ID}>
        <BrochureCover cover={content.cover} />
        <BrochureWhy why={content.why} />
        <BrochureFeatures features={content.features} modules={content.modules} />
        <BrochureClosing closing={content.closing} />
      </div>
      <DownloadBar captureId={CAPTURE_ID} />
    </main>
  );
}
