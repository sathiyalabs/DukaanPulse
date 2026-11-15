export type Lang = "en-IN" | "hi-IN" | "ta-IN";
export type Goal = "count" | "average";
export type Action = "investigate" | "existing" | "discount";
export type Stage =
  | "Approved"
  | "Prepared"
  | "Ran"
  | "Reviewed"
  | "Skipped"
  | "Stopped";
export type Tx = {
  id: string;
  timestamp: string;
  date: string;
  minute: number;
  paise: number;
  status: string;
};
export type Issue = { row: number; code: string; detail: string };
export type ImportResult = {
  rows: Tx[];
  issues: Issue[];
  excluded: Record<string, number>;
  duplicates: number;
  totalRows: number;
  headers: string[];
  preview: string[][];
};
export type Coverage = {
  state: "confirmed" | "unknown";
  start: number;
  end: number;
};
export type Exception = {
  closed: boolean;
  open: number;
  close: number;
  exclude: boolean;
  reason: string;
};
export type Offer = {
  name: Record<Lang, string>;
  available: boolean;
  price: number;
  cost: number;
  discount: number;
  additional: number;
  quantity: number;
  limit: number;
  budget: number;
  floor: number;
  referenceVolume: number;
};
export type Context = {
  shop: string;
  date: string;
  open: number;
  close: number;
  coverage: Record<string, Coverage>;
  exceptions: Record<string, Exception>;
  goal: Goal;
  threshold: number;
  offer: Offer;
  testDate: string;
  reviewDate: string;
};
export type Period = {
  date: string;
  state: "eligible" | "closed" | "partial" | "unknown" | "excluded";
  count: number | null;
  average: number | null;
  reason: string;
};
export type Analysis = {
  total: number;
  count: number;
  average: number;
  windows: {
    start: number;
    end: number;
    count: number;
    state: Period["state"];
  }[];
  current: Period;
  history: Period[];
  included: Period[];
  baseline: number | null;
  baselineAverage: number | null;
  flag: boolean;
  change: number | null;
  eligible: boolean;
};
export type Revision = {
  revision: number;
  at: string;
  reason: string;
  context: Context;
  analysis: Analysis;
};
export type Outcome = {
  at: string;
  date: string;
  original: number | null;
  baseline: number | null;
  followup: number | null;
  deltaOriginal: number | null;
  deltaBaseline: number | null;
  comparable: boolean;
  direction: "improved" | "deteriorated" | "unchanged" | "inconclusive";
  coverage: boolean;
  hours: boolean;
  ran: boolean;
  exception: string;
  records: Tx[];
  report: Omit<ImportResult, "rows" | "preview">;
};
export type Experiment = {
  id: string;
  revision: number;
  createdAt: string;
  stage: Stage;
  action: Action;
  context: Context;
  analysis: Analysis;
  invalidated: boolean;
  events: { at: string; stage: Stage; note: string }[];
  materials?: { lang: Lang; at: string };
  outcome?: Outcome;
};
export type State = {
  schema: 1;
  version: number;
  loaded: boolean;
  sourceName: string;
  data: ImportResult;
  context: Context;
  revision: number;
  revisions: Revision[];
  experiments: Experiment[];
  rejections: {
    at: string;
    revision: number;
    action: Action;
    reason: string;
  }[];
};
export const LANGS: Lang[] = ["en-IN", "hi-IN", "ta-IN"];
export const MAX_BYTES = 2 * 1024 * 1024,
  MAX_ROWS = 10000;
export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
export function money(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: paise % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}
export function time(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
export function minute(s: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(s);
  if (!m || +m[1] > 23 || +m[2] > 59) throw Error("time");
  return +m[1] * 60 + +m[2];
}
export function validDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s
  );
}
export function addDays(date: string, n: number) {
  return new Date(Date.parse(date + "T00:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function defaultContext(): Context {
  return {
    shop: "Marina Tea & Snacks",
    date: "2026-11-14",
    open: 720,
    close: 1200,
    goal: "count",
    threshold: 25,
    coverage: {},
    exceptions: {},
    testDate: "2026-11-21",
    reviewDate: "2026-11-22",
    offer: {
      name: {
        "en-IN": "Tea + snack combo",
        "hi-IN": "चाय + नाश्ता कॉम्बो",
        "ta-IN": "தேநீர் + சிற்றுண்டி காம்போ",
      },
      available: true,
      price: 4000,
      cost: 2800,
      discount: 500,
      additional: 0,
      quantity: 40,
      limit: 20,
      budget: 10000,
      floor: 0,
      referenceVolume: 14,
    },
  };
}
export function emptyState(): State {
  return {
    schema: 1,
    version: 0,
    loaded: false,
    sourceName: "",
    data: {
      rows: [],
      issues: [],
      excluded: {},
      duplicates: 0,
      totalRows: 0,
      headers: [],
      preview: [],
    },
    context: defaultContext(),
    revision: 0,
    revisions: [],
    experiments: [],
    rejections: [],
  };
}
