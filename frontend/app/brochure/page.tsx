import type { Metadata } from "next";
import BrochureApp from "@/components/brochure/BrochureApp";

export const metadata: Metadata = {
  title: "Feature deep dives | Peepal",
  description:
    "Every Peepal module, up close — the workflows your teams live in. Download the brochure as a PDF.",
};

export default function BrochurePage() {
  return <BrochureApp />;
}
