/**
 * Peepal Brand Logo
 *
 * Concept: Three ascending bars forming a staircase — a literal "step up",
 * signalling progress, momentum and the platform lifting every workflow.
 * The shortest bar is the boldest (foundation); the tallest tilts with a
 * subtle arrow notch (forward motion). Forest gradient signals reliability
 * and growth.
 *
 * Usage:
 *   <Logo />                        — default (32 × 32 icon)
 *   <Logo size={48} />              — larger icon
 *   <Logo withText />               — icon + "Peepal" wordmark beside it
 *   <Logo variant="white" />        — all-white (for dark sidebar)
 *   <Logo variant="gradient" />     — forest gradient fill (default)
 *   <Logo variant="mono" />         — flat forest fill
 */

import { CSSProperties } from "react";

type LogoVariant = "gradient" | "white" | "mono";

interface LogoProps {
  size?: number;
  withText?: boolean;
  variant?: LogoVariant;
  className?: string;
  style?: CSSProperties;
}

const GRAD_ID  = "peepal-logo-grad";
const GRAD2_ID = "peepal-logo-grad2";

export function Logo({
  size = 32,
  withText = false,
  variant = "gradient",
  className,
  style,
}: LogoProps) {
  const isGradient = variant === "gradient";
  const isWhite    = variant === "white";

  const fill  = isWhite ? "#ffffff" : isGradient ? `url(#${GRAD_ID})`  : "#1f5d36";
  const fill2 = isWhite ? "rgba(255,255,255,0.70)" : isGradient ? `url(#${GRAD2_ID})` : "#2d7a4a";
  const fill3 = isWhite ? "rgba(255,255,255,0.45)" : isGradient ? `url(#${GRAD2_ID})` : "#4f9268";

  return (
    <div
      className={`inline-flex items-center gap-2.5 ${className ?? ""}`}
      style={style}
    >
      {/* ── Icon mark ─────────────────────────────────────────────────── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Peepal logo"
      >
        <defs>
          <linearGradient id={GRAD_ID} x1="0" y1="40" x2="40" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#1f5d36" />
            <stop offset="100%" stopColor="#4f9268" />
          </linearGradient>
          <linearGradient id={GRAD2_ID} x1="0" y1="40" x2="40" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#2d7a4a" />
            <stop offset="100%" stopColor="#93c2a0" />
          </linearGradient>
        </defs>

        {/* ── Step 1 — foundation (shortest, boldest) ── */}
        <rect x="5"  y="26" width="9" height="9" rx="2.5" fill={fill3} opacity={isWhite ? 1 : 0.85} />

        {/* ── Step 2 — middle ── */}
        <rect x="15.5" y="18" width="9" height="17" rx="2.5" fill={fill2} />

        {/* ── Step 3 — summit, with an arrow notch on top (forward motion) ── */}
        <path
          d="M26 10
             L31.5 5
             L35 10
             L35 35
             L26 35 Z"
          fill={fill}
        />
      </svg>

      {/* ── Wordmark ──────────────────────────────────────────────────── */}
      {withText && (
        <span
          className="font-black tracking-tight leading-none select-none"
          style={{
            fontSize: size * 0.5,
            color: isWhite ? "#ffffff" : "#1f5d36",
          }}
        >
          Peepal<span
            style={{
              fontSize: "0.5em",
              color: isWhite ? "rgba(255,255,255,0.85)" : "#2d7a4a",
            }}
          >RP</span>
        </span>
      )}
    </div>
  );
}

export default Logo;
