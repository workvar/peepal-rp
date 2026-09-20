"use client";

import Link, { type LinkProps } from "next/link";
import type { ReactNode, MouseEventHandler } from "react";
import {
  trackFooterLinkClick,
  trackNavClick,
  trackOutboundClick,
} from "@/lib/analytics/events";

type TrackKind = "nav" | "footer" | "outbound";

interface Props extends Omit<LinkProps, "onClick"> {
  /** Which event helper to fire. Defaults to "nav". */
  kind?: TrackKind;
  /** Logical surface — e.g. "footer_platform". */
  location: string;
  /** Stable id (slug or short token). */
  itemId: string;
  /** Display name (link text). */
  itemName?: string;
  className?: string;
  children: ReactNode;
  /** Extra onClick the caller wants to chain. */
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

/**
 * Drop-in wrapper around `next/link` that fires a typed analytics event
 * on click. Use it from server components — keeps the parent serverable
 * because all the tracking lives inside this client island.
 */
export default function TrackedLink({
  kind = "nav",
  location,
  itemId,
  itemName,
  href,
  className,
  children,
  onClick,
  ...rest
}: Props) {
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (e) => {
    const params = {
      location,
      item_id: itemId,
      item_name: itemName,
      link_url: typeof href === "string" ? href : undefined,
    };
    if (kind === "footer") trackFooterLinkClick(params);
    else if (kind === "outbound") trackOutboundClick(params);
    else trackNavClick(params);
    onClick?.(e);
  };

  return (
    <Link href={href} className={className} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
