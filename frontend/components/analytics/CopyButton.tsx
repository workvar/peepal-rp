"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { trackCodeCopy } from "@/lib/analytics/events";

interface Props {
  /** The text that will be written to the clipboard. */
  text: string;
  /** Optional language label forwarded into the GA event. */
  language?: string;
  /** Optional filename label forwarded into the GA event. */
  filename?: string;
  /** Optional className for layout tweaks at the call site. */
  className?: string;
}

/**
 * Small "Copy" button used by CodeBlock. Writes `text` to the
 * clipboard, flips to a "Copied!" state for 1.5s, and fires a
 * `code_copy` GA4 event.
 *
 * Designed so adding it to an existing CodeBlock doesn't change
 * the snippet's visual layout: the button is absolutely positioned
 * top-right of its containing element.
 */
export default function CopyButton({ text, language, filename, className }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      trackCodeCopy({
        language,
        filename,
        byte_length: new Blob([text]).size,
        page_path: typeof window !== "undefined" ? window.location.pathname : "",
      });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard write blocked (e.g. insecure context). Fail silently
      // so the user isn't shown a tracker-related error.
    }
  }, [text, language, filename]);

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? "Copied" : "Copy code"}
      className={
        "inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-white/10 transition " +
        (className ?? "")
      }
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
