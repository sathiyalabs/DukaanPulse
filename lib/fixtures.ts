import { Context, defaultContext, addDays } from "./domain";
export const REFERENCE = "2026-11-14";
export function sampleCSV(kind = "valid") {
  const out = ["transaction_id,timestamp,amount,status"];
  let id = 0;
  const day = (date: string, counts: number[], special = false) =>
    counts.forEach((count, w) => {
      for (let i = 0; i < count; i++) {
        const m = 720 + w * 120 + Math.floor((i * 115) / Math.max(count, 1));
        const amount = special && w === 0 && i === 0 ? "220.00" : "200.00";
        out.push(
          `SYN-${String(++id).padStart(5, "0")},${date}T${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00+05:30,${amount},completed`,
        );
      }
    });
  if (kind === "positive" || kind === "negative") {
    day(addDays(REFERENCE, 7), [32, 24, kind === "positive" ? 19 : 9, 22]);
    return out.join("\n");
  }
  day(REFERENCE, [32, 24, 14, 22], true);
  [21, 23, 26]
    .slice(0, kind === "insufficient" ? 2 : 3)
    .forEach((n, i) => day(addDays(REFERENCE, -7 * (i + 1)), [0, 0, n, 0]));
  if (kind === "dirty") {
    out.push(
      out[1],
      `SYN-00002,2026-11-14T12:03:00+05:30,999.00,completed`,
      "BAD-DATE,14/11/2026 16:00,40,completed",
      "NEG,2026-11-14T16:00:00+05:30,-20,completed",
      "PENDING,2026-11-14T16:00:00+05:30,20,pending",
      "REFUND,2026-11-14T16:00:00+05:30,20,refunded",
      "MISSING,,40,completed",
      "UNKNOWN,2026-11-14T16:00:00+05:30,20,paid",
    );
  }
  return out.join("\n");
}
export function sampleContext(kind = "valid"): Context {
  const c = defaultContext();
  [0, -7, -14, -21, 7].forEach((n) => {
    c.coverage[addDays(REFERENCE, n)] = {
      state: "confirmed",
      start: 720,
      end: 1200,
    };
  });
  if (kind === "insufficient") delete c.coverage[addDays(REFERENCE, -21)];
  return c;
}
