import { sendEvent } from "./gtag";
import type {
  ClickParams,
  CodeCopyParams,
  FilterParams,
  ScrollDepthParams,
  SearchParams,
} from "./types";

/**
 * Typed wrappers around sendEvent. Components import these instead of
 * calling sendEvent directly so the param shape is checked at compile
 * time and we don't end up with "navigation_clicked" vs "nav_click"
 * spelling drift across the codebase.
 */

export function trackNavClick(params: ClickParams): void {
  sendEvent("nav_click", params);
}

export function trackCtaClick(params: ClickParams): void {
  sendEvent("cta_click", params);
}

export function trackModuleCardClick(params: ClickParams): void {
  sendEvent("module_card_click", params);
}

export function trackFooterLinkClick(params: ClickParams): void {
  sendEvent("footer_link_click", params);
}

export function trackOutboundClick(params: ClickParams): void {
  sendEvent("outbound_click", params);
}

export function trackCodeCopy(params: CodeCopyParams): void {
  sendEvent("code_copy", params);
}

export function trackSearch(params: SearchParams): void {
  sendEvent("search", params);
}

export function trackFilterApply(params: FilterParams): void {
  sendEvent("filter_apply", params);
}

export function trackScrollDepth(params: ScrollDepthParams): void {
  sendEvent("scroll_depth", params);
}
