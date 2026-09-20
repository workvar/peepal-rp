"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import { Download } from "lucide-react";
import { API_BASE_URL } from "@/config";
import { PROFIT_AND_LOSS, BALANCE_SHEET, TRIAL_BALANCE } from "@/graphql/queries/finance";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import StatementView from "./StatementView";
import { money, todayISO, type GqlStatement, type GqlTrialBalanceRow } from "../types";

type View = "pl" | "balance" | "trial";

const yearStart = () => `${new Date().getFullYear()}-01-01`;

export default function StatementsTab() {
  const [view, setView] = useState<View>("pl");
  const [from, setFrom] = useState(yearStart());
  const [to, setTo] = useState(todayISO());
  const [asOf, setAsOf] = useState(todayISO());

  const pl = useQuery(PROFIT_AND_LOSS, { variables: { from, to }, skip: view !== "pl" });
  const bs = useQuery(BALANCE_SHEET, { variables: { asOf }, skip: view !== "balance" });
  const tb = useQuery(TRIAL_BALANCE, { variables: { asOf }, skip: view !== "trial" });

  const pdfHref =
    view === "pl"
      ? `${API_BASE_URL}/finance/reports/pl?from=${from}&to=${to}`
      : view === "balance"
        ? `${API_BASE_URL}/finance/reports/balance-sheet?asOf=${asOf}`
        : `${API_BASE_URL}/finance/reports/trial-balance?asOf=${asOf}`;

  const tabBtn = (v: View, label: string) => (
    <button
      onClick={() => setView(v)}
      className={`px-3 py-1.5 text-sm rounded-lg ${
        view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  const loading = pl.loading || bs.loading || tb.loading;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-2">
          {tabBtn("pl", "Profit & Loss")}
          {tabBtn("balance", "Balance Sheet")}
          {tabBtn("trial", "Trial Balance")}
        </div>
        <a href={pdfHref} target="_blank" rel="noreferrer" className="btn-secondary flex items-center gap-2 text-sm">
          <Download size={15} /> PDF
        </a>
      </div>

      <div className="flex flex-wrap gap-3">
        {view === "pl" ? (
          <>
            <label className="text-sm">
              <span className="block mb-1 text-muted-foreground">From</span>
              <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="block mb-1 text-muted-foreground">To</span>
              <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </>
        ) : (
          <label className="text-sm">
            <span className="block mb-1 text-muted-foreground">As of</span>
            <input type="date" className="input" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </label>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : view === "pl" ? (
        <StatementView statement={pl.data?.profitAndLoss as GqlStatement} headlineLabel="Net Profit" />
      ) : view === "balance" ? (
        <StatementView statement={bs.data?.balanceSheet as GqlStatement} headlineLabel="Total Assets" />
      ) : (
        <TrialBalanceTable rows={(tb.data?.trialBalance as GqlTrialBalanceRow[]) ?? []} />
      )}
    </div>
  );
}

function TrialBalanceTable({ rows }: { rows: GqlTrialBalanceRow[] }) {
  const totDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totCredit = rows.reduce((s, r) => s + r.credit, 0);
  return (
    <div className="max-w-2xl border rounded-lg divide-y">
      <div className="grid grid-cols-12 px-4 py-2 text-xs text-muted-foreground">
        <span className="col-span-6">Account</span>
        <span className="col-span-3 text-right">Debit</span>
        <span className="col-span-3 text-right">Credit</span>
      </div>
      {rows.map((r) => (
        <div key={r.accountId} className="grid grid-cols-12 px-4 py-1.5 text-sm">
          <span className="col-span-6">
            <span className="font-mono text-muted-foreground">{r.code}</span> {r.name}
          </span>
          <span className="col-span-3 text-right">{r.debit ? money(r.debit) : ""}</span>
          <span className="col-span-3 text-right">{r.credit ? money(r.credit) : ""}</span>
        </div>
      ))}
      <div className="grid grid-cols-12 px-4 py-2 text-sm font-medium bg-muted/40">
        <span className="col-span-6">Total</span>
        <span className="col-span-3 text-right">{money(totDebit)}</span>
        <span className="col-span-3 text-right">{money(totCredit)}</span>
      </div>
    </div>
  );
}
