/**
 * Event-name registry. Keep this list in sync with the reference page
 * at /dev/analytics. New events get added here first so the typed
 * helpers in events.ts catch typos at compile time.
 *
 * GA4 naming convention: snake_case, <40 chars, verb_noun ordering.
 * Names mirror Google's recommended events where one applies (search,
 * select_content) and use noun_action elsewhere (nav_click, code_copy).
 */
export type GA4EventName =
  | "page_view"
  | "nav_click"
  | "cta_click"
  | "module_card_click"
  | "footer_link_click"
  | "code_copy"
  | "search"
  | "filter_apply"
  | "scroll_depth"
  | "outbound_click";

/** Common params shared by most click-style events. */
export interface ClickParams {
  /** Logical surface — e.g. "marketing_nav", "footer_platform", "sidebar". */
  location: string;
  /** Stable id for the thing clicked — slug or short token. */
  item_id: string;
  /** Human-readable label (button/link text). */
  item_name?: string;
  /** Destination URL when relevant. */
  link_url?: string;
}

export interface ScrollDepthParams {
  /** Pathname the user is reading (without query string). */
  page_path: string;
  /** 25, 50, 75, or 100. */
  percent_scrolled: 25 | 50 | 75 | 100;
}

export interface SearchParams {
  /** Query the user typed. Trimmed. */
  search_term: string;
  /** Where the search input lives — e.g. "modules_directory", "students_list". */
  location: string;
  /** Optional result count, when known at fire time. */
  result_count?: number;
}

export interface FilterParams {
  /** Filter group — e.g. "students_list". */
  location: string;
  /** Field being filtered — e.g. "department", "status". */
  filter_name: string;
  /** Selected value (string-cast). */
  filter_value: string;
}

export interface CodeCopyParams {
  /** Programming language label, when known (e.g. "bash", "ts"). */
  language?: string;
  /** Optional filename shown above the snippet. */
  filename?: string;
  /** Bytes copied — useful for spotting unusually large copies. */
  byte_length: number;
  /** Page where the snippet lives. */
  page_path: string;
}
