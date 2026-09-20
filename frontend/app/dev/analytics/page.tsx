"use client";

import { EVENT_REGISTRY } from "@/lib/analytics/registry";
import { ANALYTICS_ENABLED, GA_MEASUREMENT_ID } from "@/lib/analytics/config";
import EventConsole from "@/components/analytics/EventConsole";
import CopyButton from "@/components/analytics/CopyButton";

/**
 * GA4 reference page — documents every event the app fires and provides
 * a live console so you can verify wiring without leaving the browser.
 *
 * Reachable at /dev/analytics. Not linked from primary navigation; this
 * page is for engineering and analytics QA only.
 */
export default function AnalyticsReference() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12 md:px-10">
      <header className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">
          Engineering reference
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
          GA4 event reference
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Every analytics event the app emits, what triggers it, and the
          parameter shape. Click around the rest of the site in another tab;
          this page&apos;s console mirrors what reaches the dataLayer in real
          time.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs">
          <span className={`inline-block h-2 w-2 rounded-full ${ANALYTICS_ENABLED ? "bg-green-500" : "bg-amber-500"}`} />
          {ANALYTICS_ENABLED ? (
            <span className="text-foreground">
              Live — sending to <span className="font-mono">{GA_MEASUREMENT_ID}</span>
            </span>
          ) : (
            <span className="text-foreground">
              Dev mode — events log to console, nothing sent to GA. Set{" "}
              <span className="font-mono">NEXT_PUBLIC_GA_MEASUREMENT_ID</span> to enable.
            </span>
          )}
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Events</h2>
        <ul className="space-y-4">
          {EVENT_REGISTRY.map((doc) => (
            <li key={doc.name} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-mono text-sm font-bold text-foreground">{doc.name}</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{doc.fires_when}</p>

              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Surfaces
              </p>
              <ul className="mt-1 list-disc pl-5 text-sm text-foreground">
                {doc.surfaces.map((s) => (
                  <li key={s} className="font-mono text-[12px]">{s}</li>
                ))}
              </ul>

              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Parameters
              </p>
              <ul className="mt-1 space-y-1 text-sm">
                {doc.params.map((p) => (
                  <li key={p.name} className="text-foreground">
                    <span className="font-mono text-[12px] font-semibold">{p.name}</span>
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground">{p.type}</span>
                    <span className="ml-2 text-muted-foreground">— {p.description}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Example payload
              </p>
              <div className="relative mt-1">
                <pre className="overflow-x-auto rounded-lg bg-muted/40 p-3 text-[12px] font-mono text-foreground">
                  {JSON.stringify(doc.example, null, 2)}
                </pre>
                <div className="absolute right-2 top-2">
                  <CopyButton
                    text={JSON.stringify(doc.example, null, 2)}
                    language="json"
                    filename={`${doc.name}.example.json`}
                    className="!border-border !bg-background !text-foreground"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mt-10 text-lg font-semibold">Live console</h2>
        <EventConsole />
      </section>
    </main>
  );
}
