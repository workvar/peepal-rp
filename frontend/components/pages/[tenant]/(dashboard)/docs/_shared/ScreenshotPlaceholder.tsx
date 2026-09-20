"use client";

import { ImageIcon } from "lucide-react";

interface Props {
  label: string;
  caption?: string;
  ratio?: "video" | "wide" | "square";
}

const ratios = { video: "aspect-[16/9]", wide: "aspect-[21/9]", square: "aspect-square" };

/** Stylised placeholder where a screenshot of the actual UI should be embedded. */
export default function ScreenshotPlaceholder({ label, caption, ratio = "video" }: Props) {
  return (
    <figure className="my-2">
      <div
        className={`${ratios[ratio]} w-full rounded-xl border border-dashed border-border bg-gradient-to-br from-muted/40 to-muted/10 flex flex-col items-center justify-center gap-2 text-center p-6`}
      >
        <ImageIcon size={28} className="text-muted-foreground" />
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground max-w-md">
          Screenshot placeholder · drop a PNG into <code className="font-mono">/public/docs/</code> and replace this block.
        </div>
      </div>
      {caption && (
        <figcaption className="text-xs text-muted-foreground mt-2 text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
