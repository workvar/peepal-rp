/**
 * Single source of truth for documenting every GA4 event the app fires.
 * The reference page at /dev/analytics renders this directly. Update
 * this file whenever you add or change an event so the docs page stays
 * accurate without a separate writeup.
 */
import type { GA4EventName } from "./types";

export interface EventDoc {
  name: GA4EventName;
  /** When the event fires. */
  fires_when: string;
  /** Where in the app it's wired. */
  surfaces: string[];
  /** Param names + short descriptions. */
  params: { name: string; type: string; description: string }[];
  /** Example payload. */
  example: Record<string, unknown>;
}

export const EVENT_REGISTRY: EventDoc[] = [
  {
    name: "page_view",
    fires_when: "Every App Router client-side navigation, plus the initial mount.",
    surfaces: ["app/layout.tsx → PageViewTracker"],
    params: [
      { name: "page_path", type: "string", description: "Pathname incl. query string." },
      { name: "page_title", type: "string", description: "document.title at time of fire." },
    ],
    example: { page_path: "/modules/students", page_title: "Students — Peepal" },
  },
  {
    name: "nav_click",
    fires_when: "User clicks any link in primary navigation (header, sidebar).",
    surfaces: ["MarketingNav", "TrackedLink (kind='nav')"],
    params: [
      { name: "location", type: "string", description: "Logical surface — e.g. \"marketing_nav\"." },
      { name: "item_id", type: "string", description: "Stable id — usually the slug." },
      { name: "item_name", type: "string", description: "Visible label." },
      { name: "link_url", type: "string", description: "Destination href." },
    ],
    example: { location: "marketing_nav", item_id: "modules", item_name: "Modules", link_url: "/modules" },
  },
  {
    name: "cta_click",
    fires_when: "User clicks a primary call-to-action button (Get started, etc.).",
    surfaces: ["MarketingNav 'Get started'"],
    params: [
      { name: "location", type: "string", description: "Surface — e.g. \"marketing_nav\"." },
      { name: "item_id", type: "string", description: "CTA id — e.g. \"get_started\"." },
      { name: "item_name", type: "string", description: "Visible label." },
      { name: "link_url", type: "string", description: "Destination href." },
    ],
    example: { location: "marketing_nav", item_id: "get_started", item_name: "Get started", link_url: "/login" },
  },
  {
    name: "module_card_click",
    fires_when: "User clicks a module card on the /modules directory.",
    surfaces: ["app/modules/page.tsx"],
    params: [
      { name: "location", type: "string", description: "Always \"modules_directory\"." },
      { name: "item_id", type: "string", description: "Module slug — e.g. \"students\"." },
      { name: "item_name", type: "string", description: "Module name." },
      { name: "link_url", type: "string", description: "Destination — /modules/<slug>." },
    ],
    example: { location: "modules_directory", item_id: "students", item_name: "Students", link_url: "/modules/students" },
  },
  {
    name: "footer_link_click",
    fires_when: "User clicks any link inside the marketing footer.",
    surfaces: ["MarketingFooter via TrackedLink"],
    params: [
      { name: "location", type: "string", description: "Footer column — e.g. \"footer_platform\", \"footer_legal\"." },
      { name: "item_id", type: "string", description: "Slug or short token." },
      { name: "item_name", type: "string", description: "Visible label." },
      { name: "link_url", type: "string", description: "Destination href." },
    ],
    example: { location: "footer_legal", item_id: "privacy", item_name: "Privacy Policy", link_url: "/privacy" },
  },
  {
    name: "code_copy",
    fires_when: "User clicks the Copy button on a code snippet.",
    surfaces: ["CodeBlock → CopyButton"],
    params: [
      { name: "language", type: "string?", description: "Snippet language label." },
      { name: "filename", type: "string?", description: "Filename shown in the snippet header." },
      { name: "byte_length", type: "number", description: "UTF-8 byte length of the copied text." },
      { name: "page_path", type: "string", description: "Pathname where the snippet lives." },
    ],
    example: { language: "bash", filename: "install.sh", byte_length: 184, page_path: "/dev/analytics" },
  },
  {
    name: "search",
    fires_when: "User has stopped typing for ~700ms in any tracked search input.",
    surfaces: ["useTrackedSearch hook (wire into existing search inputs)"],
    params: [
      { name: "search_term", type: "string", description: "Trimmed query." },
      { name: "location", type: "string", description: "Where the input lives — e.g. \"students_list\"." },
      { name: "result_count", type: "number?", description: "Result count if known." },
    ],
    example: { search_term: "math", location: "students_list", result_count: 12 },
  },
  {
    name: "filter_apply",
    fires_when: "Any tracked filter dict changes (one event per changed key).",
    surfaces: ["useTrackedFilters hook"],
    params: [
      { name: "location", type: "string", description: "Filter group — e.g. \"students_list\"." },
      { name: "filter_name", type: "string", description: "Field being filtered." },
      { name: "filter_value", type: "string", description: "Selected value (string-cast)." },
    ],
    example: { location: "students_list", filter_name: "department", filter_value: "Computer Science" },
  },
  {
    name: "scroll_depth",
    fires_when: "User scrolls past 25% / 50% / 75% / 100% of the page (once per threshold).",
    surfaces: ["MarketingShell → ScrollDepthTracker (auto on every public page)"],
    params: [
      { name: "page_path", type: "string", description: "Pathname being read." },
      { name: "percent_scrolled", type: "25 | 50 | 75 | 100", description: "Threshold reached." },
    ],
    example: { page_path: "/modules/students", percent_scrolled: 50 },
  },
  {
    name: "outbound_click",
    fires_when: "User clicks a TrackedLink with kind=\"outbound\". Reserved for future use — wire on links to external partners/docs.",
    surfaces: ["TrackedLink (kind='outbound')"],
    params: [
      { name: "location", type: "string", description: "Logical surface." },
      { name: "item_id", type: "string", description: "Identifier." },
      { name: "item_name", type: "string?", description: "Display name." },
      { name: "link_url", type: "string", description: "External URL." },
    ],
    example: { location: "footer_partners", item_id: "anthropic", item_name: "Anthropic", link_url: "https://anthropic.com" },
  },
];
