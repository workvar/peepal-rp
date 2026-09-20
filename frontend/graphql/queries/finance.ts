import { gql } from "@apollo/client";

export const LIST_ACCOUNTS = gql`
  query ListAccounts($type: String, $activeOnly: Boolean) {
    accounts(type: $type, activeOnly: $activeOnly) {
      id code name type parentId isSystem systemKey active createdAt
    }
  }
`;

export const LEDGER_BATCHES = gql`
  query LedgerBatches($from: String, $to: String, $sourceType: String) {
    ledgerBatches(from: $from, to: $to, sourceType: $sourceType) {
      id date memo sourceType sourceId posted reversed createdAt
      lines { id accountId accountCode accountName debit credit memo }
    }
  }
`;

export const ACCOUNT_LEDGER = gql`
  query AccountLedger($accountId: ID!, $from: String, $to: String) {
    accountLedger(accountId: $accountId, from: $from, to: $to) {
      account { id code name type }
      openingBalance
      closingBalance
      rows { batchId date memo debit credit balance }
    }
  }
`;

export const TRIAL_BALANCE = gql`
  query TrialBalance($asOf: String) {
    trialBalance(asOf: $asOf) {
      accountId code name type debit credit
    }
  }
`;

export const PROFIT_AND_LOSS = gql`
  query ProfitAndLoss($from: String!, $to: String!) {
    profitAndLoss(from: $from, to: $to) {
      title from to total balanced
      sections { title total lines { code name amount } }
    }
  }
`;

export const BALANCE_SHEET = gql`
  query BalanceSheet($asOf: String!) {
    balanceSheet(asOf: $asOf) {
      title asOf total balanced
      sections { title total lines { code name amount } }
    }
  }
`;

export const AR_AGING = gql`
  query ArAging($asOf: String) {
    accountsReceivableAging(asOf: $asOf) {
      partyId partyName reference date dueDate amount daysOverdue bucket
    }
  }
`;

export const AP_AGING = gql`
  query ApAging($asOf: String) {
    accountsPayableAging(asOf: $asOf) {
      partyId partyName reference date dueDate amount daysOverdue bucket
    }
  }
`;
