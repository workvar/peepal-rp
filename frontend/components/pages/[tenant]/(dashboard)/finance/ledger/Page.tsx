"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useLedger } from "./useLedger";
import BatchList from "./BatchList";
import StatementsTab from "./StatementsTab";
import { todayISO } from "../types";

type Tab = "journal" | "statements";

const yearStart = () => `${new Date().getFullYear()}-01-01`;

export default function LedgerPage() {
  const [tab, setTab] = useState<Tab>("journal");
  const [from, setFrom] = useState(yearStart());
  const [to, setTo] = useState(todayISO());
  const { batches, loading } = useLedger({ from, to });

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`px-4 py-2 text-sm font-medium rounded-lg ${
        tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <Header title="General Ledger" subtitle="Every posting the system makes, and the financial statements it rolls up to." />

      <div className="flex gap-2 mb-4">
        {tabBtn("journal", "Journal")}
        {tabBtn("statements", "Statements")}
      </div>

      {tab === "journal" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              <span className="block mb-1 text-muted-foreground">From</span>
              <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="block mb-1 text-muted-foreground">To</span>
              <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          {loading ? <LoadingSpinner /> : <BatchList batches={batches} />}
        </div>
      ) : (
        <StatementsTab />
      )}
    </div>
  );
}
