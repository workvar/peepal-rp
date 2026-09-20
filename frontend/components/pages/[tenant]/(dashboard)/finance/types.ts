// Shared GraphQL result shapes + helpers for the Finance pages.

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export type GqlAccount = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  isSystem: boolean;
  systemKey: string | null;
  active: boolean;
  createdAt?: string | null;
};

export type GqlLedgerLine = {
  id: string;
  accountId: string;
  accountCode: string | null;
  accountName: string | null;
  debit: number;
  credit: number;
  memo: string | null;
};

export type GqlLedgerBatch = {
  id: string;
  date: string;
  memo: string | null;
  sourceType: string | null;
  sourceId: string | null;
  posted: boolean;
  reversed: boolean;
  createdAt?: string | null;
  lines: GqlLedgerLine[];
};

export type GqlTrialBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
};

export type GqlStatementLine = { code: string; name: string; amount: number };
export type GqlStatementSection = { title: string; total: number; lines: GqlStatementLine[] };
export type GqlStatement = {
  title: string;
  from?: string | null;
  to?: string | null;
  asOf?: string | null;
  total: number;
  balanced: boolean;
  sections: GqlStatementSection[];
};

export type GqlAgingRow = {
  partyId: string;
  partyName: string;
  reference: string;
  date: string | null;
  dueDate: string | null;
  amount: number;
  daysOverdue: number;
  bucket: string;
};

export const ACCOUNT_TYPES: AccountType[] = ["asset", "liability", "equity", "income", "expense"];

/** Format a number as money. Kept local so Finance has no cross-module coupling. */
export function money(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
