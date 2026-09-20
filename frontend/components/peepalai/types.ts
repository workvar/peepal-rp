// Shared types for the Ask PeepalAI UI.

export type PeepalAnswer = {
  answer: string;
  sql: string;
  columns: string[];
  rows: string[][];
  denied: boolean;
  message: string;
};

export type Exchange = {
  id: number;
  question: string;
  result?: PeepalAnswer;
  error?: string;
};
