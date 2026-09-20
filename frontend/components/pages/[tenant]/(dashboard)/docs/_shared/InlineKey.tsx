"use client";

/** Inline monospace pill used for file paths, env vars, route segments. */
export default function InlineKey({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded-md bg-muted text-foreground text-[12px] font-mono border border-border">
      {children}
    </code>
  );
}
