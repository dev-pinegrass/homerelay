export type Suggestion = {
  recipient: string;
  reason: string;
  trace: unknown[];
  mode: string;
  model?: string;
};
export type Task = {
  id: string;
  owner: string;
  title: string;
  privateNote?: string;
  version: number;
  state: string;
  responsible: string | null;
  proposal?: { recipient: string; expires: number } | null;
  audit: { event: string; actor: string; at: string }[];
  suggestion?: Suggestion;
};
