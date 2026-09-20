"use client";

import { ShieldAlert, AlertTriangle, Sparkles } from "lucide-react";
import ResultTable from "./ResultTable";
import type { Exchange } from "./types";

// One question → answer exchange in the PeepalAI conversation.
export default function ExchangeCard({ exchange }: { exchange: Exchange }) {
  const { question, result, error } = exchange;
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-xl bg-primary/10 px-4 py-2 text-sm">{question}</div>
      </div>

      {error && (
        <Note icon={<AlertTriangle className="h-4 w-4" />} tone="amber" text={error} />
      )}

      {result?.denied && (
        <Note icon={<ShieldAlert className="h-4 w-4" />} tone="red" text={result.message} />
      )}

      {result && !result.denied && result.message && (
        <Note icon={<AlertTriangle className="h-4 w-4" />} tone="amber" text={result.message} />
      )}

      {result && !result.denied && !result.message && (
        <div className="max-w-full">
          {result.answer && (
            <div className="flex items-start gap-2 text-sm">
              <Sparkles className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <p>{result.answer}</p>
            </div>
          )}
          <ResultTable columns={result.columns} rows={result.rows} />
          {result.sql && (
            <details className="mt-1">
              <summary className="text-xs text-muted-foreground/70 cursor-pointer select-none">
                Show generated SQL
              </summary>
              <pre className="mt-1 rounded-lg bg-muted/40 p-3 text-xs overflow-x-auto font-mono">
                {result.sql}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function Note({ icon, tone, text }: { icon: React.ReactNode; tone: "red" | "amber"; text: string }) {
  const cls =
    tone === "red"
      ? "bg-destructive/10 text-destructive"
      : "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${cls}`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}
