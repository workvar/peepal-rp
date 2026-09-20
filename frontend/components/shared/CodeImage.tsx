"use client";

// Reusable QR / barcode image with a loading skeleton and alt text. Points at
// the backend /codes endpoints via lib/codes helpers. Used by hall tickets and
// ID-card views. For same-origin the auth cookie rides along automatically.

import { useState } from "react";
import { qrSrc, barcodeSrc } from "@/lib/codes";

type Props = {
  content: string;
  kind?: "qr" | "barcode";
  size?: number; // qr edge, px
  width?: number; // barcode width, px
  height?: number; // barcode height, px
  alt?: string;
  className?: string;
};

export default function CodeImage({
  content,
  kind = "qr",
  size = 256,
  width = 300,
  height = 80,
  alt = "code",
  className = "",
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const src = kind === "qr" ? qrSrc(content, size) : barcodeSrc(content, width, height);
  const box =
    kind === "qr"
      ? { width: size, height: size }
      : { width, height };

  return (
    <span
      className={`inline-block relative ${className}`}
      style={box}
    >
      {!loaded && (
        <span className="absolute inset-0 animate-pulse rounded bg-gray-200" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={box.width}
        height={box.height}
        onLoad={() => setLoaded(true)}
        className={loaded ? "opacity-100" : "opacity-0"}
      />
    </span>
  );
}
