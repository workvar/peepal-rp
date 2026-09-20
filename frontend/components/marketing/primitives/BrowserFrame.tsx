"use client";

import Image from "next/image";

export interface BrowserFrameProps {
  src: string;
  alt: string;
  variant?: "browser" | "mac";
  url?: string;
  tilt?: number;
  shadow?: "sm" | "md" | "lg";
  priority?: boolean;
  className?: string;
  width?: number;
  height?: number;
}

const SHADOWS: Record<NonNullable<BrowserFrameProps["shadow"]>, string> = {
  sm: "shadow-md",
  md: "shadow-lg",
  lg: "shadow-xl",
};

/**
 * BrowserFrame — decorative chrome around a marketing screenshot.
 *
 * Previously animated entry with framer-motion (initial → animate). The
 * fade/slide on mount has been moved to a CSS animation (`marketing-rise`
 * defined in globals.css) so this primitive no longer drags framer-motion
 * into every marketing page that renders a screenshot.
 */
export default function BrowserFrame({
  src,
  alt,
  variant = "browser",
  url,
  tilt = -1,
  shadow = "lg",
  priority = false,
  className,
  width = 1280,
  height = 800,
}: BrowserFrameProps) {
  const displayUrl = url ?? "peepal.app";

  return (
    <div
      style={{ transform: `rotate(${tilt}deg)` }}
      className={`overflow-hidden rounded-xl border border-[#e7e7e3] bg-white animate-marketing-rise ${SHADOWS[shadow]} ${className ?? ""}`}
    >
      <div className="flex items-center gap-2 border-b border-[#e7e7e3] bg-[#fafaf9] px-3 py-2">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" aria-hidden />
        </div>
        {variant === "browser" && (
          <div className="ml-2 flex-1 truncate rounded-md bg-white px-2.5 py-1 text-[11px] text-[#737370] border border-[#ececea]">
            {displayUrl}
          </div>
        )}
      </div>

      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes="(min-width: 1024px) 720px, 100vw"
        className="block h-auto w-full"
      />
    </div>
  );
}
