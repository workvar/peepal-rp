"use client";

import CopyButton from "@/components/analytics/CopyButton";

interface Props {
  language?: string;
  filename?: string;
  children: string;
}

/**
 * Lightweight, dependency-free code block with optional filename header.
 * Now includes an instrumented copy button — see CopyButton for the
 * GA event fired on click (`code_copy`). The button sits in the header
 * row when one is shown, otherwise floats top-right of the snippet.
 */
export default function CodeBlock({ language, filename, children }: Props) {
  const hasHeader = Boolean(filename || language);
  return (
    <div className="relative rounded-xl border border-border bg-[#0e1116] dark:bg-[#0a0c10] overflow-hidden">
      {hasHeader && (
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 text-xs">
          <span className="text-slate-200 font-mono">{filename ?? ""}</span>
          <div className="flex items-center gap-2">
            {language && (
              <span className="text-slate-400 uppercase tracking-wider text-[10px]">{language}</span>
            )}
            <CopyButton text={children} language={language} filename={filename} />
          </div>
        </div>
      )}
      {!hasHeader && (
        <div className="absolute right-2 top-2 z-10">
          <CopyButton text={children} language={language} filename={filename} />
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-[12.5px] leading-relaxed text-slate-100 font-mono">
        <code>{children}</code>
      </pre>
    </div>
  );
}
