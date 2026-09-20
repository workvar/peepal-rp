"use client";

import { useEffect, useState } from "react";

interface LoggedEvent {
  id: number;
  timestamp: string;
  name: string;
  params: Record<string, unknown>;
}

/**
 * Live event console for the /dev/analytics reference page. Patches
 * window.dataLayer.push so we can mirror everything that gets sent to
 * GA4 (or that *would* be sent — works even when ANALYTICS_ENABLED is
 * false, since events are still pushed to dataLayer in dev).
 *
 * This is QA-only; mounted exclusively from the dev/analytics route.
 */
export default function EventConsole() {
  const [events, setEvents] = useState<LoggedEvent[]>([]);

  useEffect(() => {
    type DataLayer = unknown[] & { push: (...items: unknown[]) => number };
    const w = window as unknown as { dataLayer?: DataLayer };
    if (!w.dataLayer) w.dataLayer = [] as unknown as DataLayer;

    const original = w.dataLayer.push.bind(w.dataLayer);
    let counter = 0;

    w.dataLayer.push = ((...items: unknown[]) => {
      for (const item of items) {
        // gtag.js shoves an `arguments` object onto dataLayer, e.g.
        // { 0: 'event', 1: 'nav_click', 2: { ... } }. Normalise here.
        const args = item as Record<string | number, unknown> & { length?: number };
        if (args && typeof args === "object" && args[0] === "event") {
          const name = String(args[1] ?? "unknown");
          const params = (args[2] as Record<string, unknown>) ?? {};
          counter += 1;
          setEvents((prev) =>
            [{ id: counter, timestamp: new Date().toLocaleTimeString(), name, params }, ...prev].slice(0, 100)
          );
        }
      }
      return original(...items);
    }) as DataLayer["push"];

    return () => {
      w.dataLayer!.push = original;
    };
  }, []);

  return (
    <div className="mt-8 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Live event console</h2>
        <button
          onClick={() => setEvents([])}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </div>
      {events.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          No events captured yet. Click any nav link, copy a code sample, or scroll
          this page to see events appear here in real time.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {events.map((e) => (
            <li key={e.id} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs font-semibold text-foreground">{e.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{e.timestamp}</span>
              </div>
              <pre className="mt-1 overflow-x-auto rounded bg-muted/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
                {JSON.stringify(e.params, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
