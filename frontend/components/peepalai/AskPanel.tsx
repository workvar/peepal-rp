"use client";

// Ask PeepalAI panel — shared by the tenant page and the super-admin console.
// All permission checks happen in the backend; this UI only renders what the
// server returns (answer text, table, or the denial message).

import { useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { apolloClient } from "@/lib/apollo";
import { ASK_PEEPAL_AI } from "@/graphql/queries/peepalai";
import ExchangeCard from "./ExchangeCard";
import type { Exchange, PeepalAnswer } from "./types";

const EXAMPLES = [
  "How many leaves can I apply and still maintain 75% attendance?",
  "List my top 10 performing students in the History subject",
  "How many pending leave applications are there this month?",
];

export default function AskPanel() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || loading) return;
    const id = nextId.current++;
    setExchanges((xs) => [...xs, { id, question: text }]);
    setQuestion("");
    setLoading(true);
    try {
      const { data } = await apolloClient.query<{ askPeepalAI: PeepalAnswer }>({
        query: ASK_PEEPAL_AI,
        variables: { question: text },
        fetchPolicy: "no-cache",
      });
      setExchanges((xs) => xs.map((x) => (x.id === id ? { ...x, result: data.askPeepalAI } : x)));
    } catch {
      setExchanges((xs) =>
        xs.map((x) => (x.id === id ? { ...x, error: "PeepalAI could not process that question. Please try again." } : x)),
      );
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {exchanges.length === 0 && (
        <div className="card py-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Ask a question about your data in plain language. Try:
          </p>
          <div className="flex flex-col items-center gap-2">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                onClick={() => ask(e)}
                className="text-sm text-primary hover:underline"
              >
                “{e}”
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {exchanges.map((x) => (
          <ExchangeCard key={x.id} exchange={x} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> PeepalAI is thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex gap-2 sticky bottom-0 bg-background py-2"
      >
        <input
          className="input-field flex-1"
          placeholder="Ask PeepalAI about your data…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> Ask
        </button>
      </form>
    </div>
  );
}
