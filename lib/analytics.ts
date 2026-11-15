import {
  Analysis,
  Context,
  ImportResult,
  Issue,
  MAX_BYTES,
  MAX_ROWS,
  Period,
  Tx,
  validDate,
  addDays,
  Offer,
  Action,
} from "./domain";

export const REQUIRED = ["transaction_id", "timestamp", "amount", "status"];
const SUCCESS = new Set(["completed", "success", "successful"]);
const EXCLUDED = new Set([
  "pending",
  "failed",
  "cancelled",
  "canceled",
  "refunded",
]);
export function splitCSV(text: string): string[][] {
  if (new TextEncoder().encode(text).length > MAX_BYTES)
    throw Error("fileSize");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!quoted && cell.length) throw Error("csvSyntax");
      else quoted = !quoted;
    } else if (!quoted && (ch === "," || ch === "\n" || ch === "\r")) {
      row.push(cell.trim());
      cell = "";
      if (ch !== ",") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (rows.length > MAX_ROWS + 1) throw Error("rowLimit");
      }
    } else cell += ch;
  }
  if (quoted) throw Error("csvSyntax");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length > MAX_ROWS + 1) throw Error("rowLimit");
  return rows;
}
export function paise(s: string): number | null {
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(s)) return null;
  const [a, b = ""] = s.split(".");
  const p = Number(a) * 100 + Number(b.padEnd(2, "0"));
  return Number.isSafeInteger(p) ? p : null;
}
export function timestamp(
  s: string,
): { date: string; minute: number; iso: string } | null {
  // Only ISO 8601 with an explicit timezone. Calendar and offset validation precede Date parsing.
  const m =
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})$/.exec(
      s,
    );
  if (!m) return null;
  try {
    if (!validDate(m[1]) || +m[2] > 23 || +m[3] > 59 || +(m[4] || 0) > 59)
      return null;
  } catch {
    return null;
  }
  const tz = m[5];
  if (
    tz !== "Z" &&
    (+tz.slice(1, 3) > 14 ||
      +tz.slice(4) > 59 ||
      (+tz.slice(1, 3) === 14 && +tz.slice(4) > 0))
  )
    return null;
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return null;
  const local = new Date(d.getTime() + 330 * 60000).toISOString();
  return {
    date: local.slice(0, 10),
    minute: +local.slice(11, 13) * 60 + +local.slice(14, 16),
    iso: d.toISOString(),
  };
}
export function parseCSV(
  text: string,
  mapping: Record<string, string> = {},
): ImportResult {
  const matrix = splitCSV(text);
  if (matrix.length < 2) throw Error("emptyCsv");
  const headers = matrix[0];
  if (new Set(headers).size !== headers.length) throw Error("duplicateHeaders");
  const indices = REQUIRED.map((k) => headers.indexOf(mapping[k] || k));
  if (indices.some((i) => i < 0) || new Set(indices).size !== 4)
    throw Error("mappingRequired");
  const issues: Issue[] = [],
    excluded: Record<string, number> = {},
    seen = new Map<
      string,
      { fingerprint: string; tx: Tx | null; row: number }
    >(),
    conflicts = new Set<string>();
  let duplicates = 0;
  matrix.slice(1).forEach((r, i) => {
    const row = i + 2;
    if (r.length !== headers.length) {
      issues.push({ row, code: "columns", detail: String(r.length) });
      return;
    }
    const [id, stamp, amount, rawStatus] = indices.map((j) => r[j]);
    if (!id || !stamp || !amount || !rawStatus) {
      issues.push({ row, code: "missing", detail: id || "—" });
      return;
    }
    if (id.length > 128) {
      issues.push({ row, code: "idLength", detail: id.slice(0, 40) });
      return;
    }
    const status = rawStatus.toLowerCase();
    const fingerprint = JSON.stringify([stamp, amount, status]);
    const prev = seen.get(id);
    if (prev) {
      if (prev.fingerprint === fingerprint) {
        duplicates++;
        return;
      }
      conflicts.add(id);
      issues.push({ row, code: "conflict", detail: id });
      return;
    }
    // Register IDs even for invalid/excluded rows so conflicts cannot be hidden by a failure status.
    seen.set(id, { fingerprint, tx: null, row });
    const dt = timestamp(stamp);
    if (!dt) {
      issues.push({ row, code: "date", detail: stamp });
      return;
    }
    if (amount.startsWith("-")) {
      issues.push({ row, code: "negative", detail: id });
      return;
    }
    const p = paise(amount);
    if (p === null) {
      issues.push({ row, code: "amount", detail: amount });
      return;
    }
    if (!SUCCESS.has(status) && !EXCLUDED.has(status)) {
      issues.push({ row, code: "status", detail: status });
      return;
    }
    if (EXCLUDED.has(status)) {
      excluded[status] = (excluded[status] || 0) + 1;
      return;
    }
    seen.get(id)!.tx = {
      id,
      timestamp: dt.iso,
      date: dt.date,
      minute: dt.minute,
      paise: p,
      status,
    };
  });
  const rows = [...seen.entries()]
    .filter(([id, v]) => v.tx && !conflicts.has(id))
    .map(([, v]) => v.tx!);
  for (const id of conflicts) {
    const v = seen.get(id)!;
    issues.push({ row: v.row, code: "conflict", detail: id });
  }
  return {
    rows,
    issues,
    excluded,
    duplicates,
    totalRows: matrix.length - 1,
    headers,
    preview: matrix.slice(1, 6),
  };
}
export function median(v: number[]): number | null {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  return s.length % 2
    ? s[(s.length - 1) / 2]
    : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}
export function period(
  rows: Tx[],
  c: Context,
  date: string,
  start = 960,
  end = 1080,
): Period {
  const e = c.exceptions[date],
    open = e ? e.open : c.open,
    close = e ? e.close : c.close,
    cov = c.coverage[date];
  let state: Period["state"] = "eligible",
    reason = "";
  if (e?.exclude) {
    state = "excluded";
    reason = e.reason;
  } else if (e?.closed || close <= start || open >= end) {
    state = "closed";
    reason = "closed";
  } else if (open > start || close < end) {
    state = "partial";
    reason = "partial";
  } else if (
    !cov ||
    cov.state !== "confirmed" ||
    cov.start > start ||
    cov.end < end
  ) {
    state = "unknown";
    reason = "unknown";
  }
  const tx = rows.filter(
    (t) => t.date === date && t.minute >= start && t.minute < end,
  );
  return {
    date,
    state,
    reason,
    count: state === "eligible" ? tx.length : null,
    average:
      state === "eligible" && tx.length
        ? tx.reduce((s, t) => s + t.paise, 0) / tx.length
        : null,
  };
}
export function analyze(rows: Tx[], c: Context): Analysis {
  const today = rows.filter((t) => t.date === c.date),
    total = today.reduce((s, t) => s + t.paise, 0),
    count = today.length,
    current = period(rows, c, c.date);
  const history: Array<Period> = [];
  for (let w = 1; w <= 8; w++) {
    const date = addDays(c.date, -w * 7);
    if (
      rows.some((t) => t.date === date) ||
      c.coverage[date] ||
      c.exceptions[date]
    )
      history.push(period(rows, c, date));
  }
  const included = history.filter((p) => p.state === "eligible"),
    averages = included
      .map((p) => p.average)
      .filter((n): n is number => n !== null),
    baseline =
      included.length >= 3 ? median(included.map((p) => p.count!)) : null,
    baselineAverage = averages.length >= 3 ? median(averages) : null,
    eligible =
      current.state === "eligible" &&
      included.length >= 3 &&
      (c.goal === "count" ||
        (current.average !== null && baselineAverage !== null));
  const change =
    eligible && baseline !== null && baseline > 0
      ? ((current.count! - baseline) / baseline) * 100
      : null;
  return {
    total,
    count,
    average: count ? total / count : 0,
    current,
    history,
    included,
    baseline,
    baselineAverage,
    eligible,
    flag:
      eligible && baseline !== null && baseline > 0 && change! <= -c.threshold,
    change,
    windows: [720, 840, 960, 1080].map((start) => {
      const p = period(rows, c, c.date, start, start + 120);
      return {
        start,
        end: start + 120,
        count: today.filter((t) => t.minute >= start && t.minute < start + 120)
          .length,
        state: p.state,
      };
    }),
  };
}
export function economics(o: Offer, action: Action) {
  const discount = action === "existing" ? 0 : o.discount,
    contribution = o.price - discount - o.cost - o.additional,
    referenceContribution = o.price - o.cost - o.additional,
    exposure = discount * o.limit;
  const reasons: string[] = [];
  if (!o.available) reasons.push("unavailable");
  if (contribution < o.floor) reasons.push("floor");
  if (o.limit < 1 || o.limit > o.quantity) reasons.push("stock");
  if (exposure > o.budget) reasons.push("budget");
  return {
    discount,
    contribution,
    referenceContribution,
    exposure,
    requiredVolume:
      contribution > 0
        ? Math.ceil((o.referenceVolume * referenceContribution) / contribution)
        : null,
    eligible: action === "investigate" || reasons.length === 0,
    reasons,
  };
}
