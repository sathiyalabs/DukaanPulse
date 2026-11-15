import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCSV,
  analyze,
  economics,
  timestamp,
  median,
  period,
} from "../lib/analytics";
import { sampleCSV, sampleContext } from "../lib/fixtures";
import { execute, interpretCorrection } from "../lib/commands";
import { emptyState, clone, LANGS } from "../lib/domain";
import { briefing, approvedTerms, translatedKeys, tr } from "../lib/i18n";
import { posterHTML } from "../lib/poster";
import { cacheIdentity, validFocus } from "../lib/provider";
const loaded = () =>
  execute(
    emptyState(),
    { type: "loadSample", kind: "valid", expectedVersion: 0 },
    "2026-11-15T00:00:00Z",
    "fixture",
  );
const apply = (s: ReturnType<typeof loaded>, c: Record<string, unknown>) =>
  execute(
    s,
    { ...c, expectedVersion: s.version },
    "2026-11-15T00:00:00Z",
    "exp-" + s.version,
  );
const wrap = (rows: string[]) =>
  "transaction_id,timestamp,amount,status\n" + rows.join("\n");
const tx = (
  id: string,
  amount = "40",
  status = "completed",
  date = "2026-11-14T16:00:00+05:30",
) => `${id},${date},${amount},${status}`;
test("synthetic totals derive from actual rows", () => {
  const s = loaded(),
    a = analyze(s.data.rows, s.context);
  assert.equal(a.total, 1842000);
  assert.equal(a.count, 92);
  assert.equal(Math.round(a.average), 20022);
  assert.deepEqual(
    a.windows.map((x) => x.count),
    [32, 24, 14, 22],
  );
  assert.deepEqual(
    a.history.map((x) => x.count),
    [21, 23, 26],
  );
  assert.equal(a.baseline, 23);
  assert.equal(a.flag, true);
});
test("string IDs, decimal paise and successful statuses", () => {
  const d = parseCSV(
    wrap([
      tx("001", "0.10"),
      tx("1", "0.20", "SUCCESS"),
      tx("2", "1.01", "successful"),
    ]),
  );
  assert.deepEqual(
    d.rows.map((x) => x.id),
    ["001", "1", "2"],
  );
  assert.equal(
    d.rows.reduce((n, t) => n + t.paise, 0),
    131,
  );
});
test("identical duplicates dedupe and conflicting IDs remove all versions", () => {
  const d = parseCSV(wrap([tx("a"), tx("a"), tx("b"), tx("b", "50")]));
  assert.equal(d.duplicates, 1);
  assert.deepEqual(
    d.rows.map((x) => x.id),
    ["a"],
  );
  assert.equal(d.issues.filter((i) => i.code === "conflict").length, 2);
});
test("excluded status conflict cannot leave a completed payment", () => {
  const d = parseCSV(wrap([tx("a"), tx("a", "40", "refunded")]));
  assert.equal(d.rows.length, 0);
});
test("invalid/ambiguous dates, missing, negative, precision and status excluded", () => {
  const d = parseCSV(
    wrap([
      tx("a", "40", "paid"),
      tx("b", "-1"),
      tx("c", "1.001"),
      tx("d", "40", "completed", "14/11/2026 16:00"),
      tx("e", "40", "completed", "2026-02-30T16:00:00+05:30"),
      "f,,40,completed",
    ]),
  );
  assert.equal(d.rows.length, 0);
  assert.equal(d.issues.length, 6);
});
test("documented non-completed statuses reported", () => {
  const d = parseCSV(
    wrap(
      ["pending", "failed", "cancelled", "refunded"].map((x) => tx(x, "40", x)),
    ),
  );
  assert.equal(d.rows.length, 0);
  assert.deepEqual(d.excluded, {
    pending: 1,
    failed: 1,
    cancelled: 1,
    refunded: 1,
  });
});
test("timestamps use Kolkata, explicit timezone, valid offset, no rollovers", () => {
  assert.deepEqual(timestamp("2026-11-14T12:00:00Z")?.minute, 1050);
  for (const t of [
    "2026-11-14 16:00",
    "2026-11-14T24:00:00+05:30",
    "2026-11-14T16:60:00Z",
    "2026-11-14T16:00:00+14:30",
  ])
    assert.equal(timestamp(t), null);
});
test("CSV mapping and quoted cells work, malformed quotes rejected", () => {
  const d = parseCSV(
    'id,when,value,state\n"a,b",2026-11-14T16:00:00+05:30,40,completed',
    {
      transaction_id: "id",
      timestamp: "when",
      amount: "value",
      status: "state",
    },
  );
  assert.equal(d.rows[0].id, "a,b");
  assert.throws(() => parseCSV("a,a\nx,y"), /duplicateHeaders/);
  assert.throws(() => parseCSV('a,b\n"unclosed'), /csvSyntax/);
});
test("practical file and row limits enforced", () => {
  assert.throws(() => parseCSV("x".repeat(2097153)), /fileSize/);
  assert.throws(
    () =>
      parseCSV(wrap(Array.from({ length: 10001 }, (_, i) => tx(String(i))))),
    /rowLimit/,
  );
});
test("closed, open zero and unknown remain distinct", () => {
  const c = sampleContext();
  assert.equal(period([], c, c.date).count, 0);
  assert.equal(period([], c, c.date).state, "eligible");
  delete c.coverage[c.date];
  assert.equal(period([], c, c.date).count, null);
  c.exceptions[c.date] = {
    closed: true,
    open: 720,
    close: 1200,
    exclude: false,
    reason: "",
  };
  assert.equal(period([], c, c.date).state, "closed");
});
test("early closure withdraws comparison", () => {
  const s = loaded();
  s.context.exceptions[s.context.date] = {
    closed: false,
    open: 720,
    close: 1020,
    exclude: false,
    reason: "owner closed at 17:00",
  };
  const a = analyze(s.data.rows, s.context);
  assert.equal(a.eligible, false);
  assert.equal(a.current.count, null);
  assert.equal(a.flag, false);
});
test("coverage gaps and exceptional history require new evidence", () => {
  const s = loaded();
  s.context.coverage[s.context.date].end = 1000;
  assert.equal(analyze(s.data.rows, s.context).eligible, false);
  s.context = sampleContext();
  s.context.exceptions["2026-10-31"] = {
    closed: false,
    open: 720,
    close: 1200,
    exclude: true,
    reason: "festival",
  };
  const a = analyze(s.data.rows, s.context);
  assert.equal(a.included.length, 2);
  assert.equal(a.baseline, null);
  assert.equal(a.eligible, false);
});
test("insufficient history abstains and median handles zero", () => {
  const c = sampleContext(),
    a = analyze(parseCSV(sampleCSV("insufficient")).rows, c);
  assert.equal(a.eligible, true);
  delete c.coverage["2026-10-24"];
  assert.equal(
    analyze(parseCSV(sampleCSV("insufficient")).rows, c).eligible,
    false,
  );
  assert.equal(median([0, 0, 0]), 0);
  const zero = analyze(parseCSV(sampleCSV("positive")).rows, sampleContext());
  assert.equal(zero.baseline, 0);
  assert.equal(zero.change, null);
  assert.equal(zero.flag, false);
});
test("contribution examples, budgets, stock and availability", () => {
  const o = sampleContext().offer;
  assert.equal(economics(o, "existing").contribution, 1200);
  assert.equal(economics(o, "discount").contribution, 700);
  o.discount = 1500;
  assert.equal(economics(o, "discount").contribution, -300);
  assert.equal(economics(o, "discount").eligible, false);
  o.discount = 500;
  o.budget = 9900;
  assert.equal(economics(o, "discount").reasons.includes("budget"), true);
  o.budget = 10000;
  o.quantity = 10;
  assert.equal(economics(o, "discount").reasons.includes("stock"), true);
  o.available = false;
  assert.equal(economics(o, "existing").eligible, false);
  assert.equal(economics(o, "investigate").eligible, true);
});
test("additional costs and scenario threshold are explicit", () => {
  const o = sampleContext().offer;
  assert.equal(economics(o, "discount").requiredVolume, 24);
  o.additional = 100;
  assert.equal(economics(o, "discount").contribution, 600);
});
test("approval blocked by floor, stale revision and duplicate submission", () => {
  let s = loaded();
  assert.throws(
    () => apply(s, { type: "approve", revision: 0, action: "discount" }),
    /staleApproval/,
  );
  s = apply(s, { type: "approve", revision: s.revision, action: "discount" });
  assert.equal(s.experiments.length, 1);
  assert.throws(
    () =>
      apply(s, { type: "approve", revision: s.revision, action: "discount" }),
    /duplicateExperiment/,
  );
  assert.throws(
    () =>
      execute(s, {
        type: "approve",
        revision: s.revision,
        action: "discount",
        expectedVersion: 1,
      }),
    /staleVersion/,
  );
  const blocked = loaded();
  blocked.context.offer.discount = 1500;
  assert.throws(
    () =>
      apply(blocked, {
        type: "approve",
        revision: blocked.revision,
        action: "discount",
      }),
    /ineligible/,
  );
});
test("context correction creates revision and stops earlier approved terms", () => {
  let s = loaded();
  s = apply(s, { type: "approve", revision: s.revision, action: "discount" });
  const c = clone(s.context);
  c.offer.cost = 3900;
  s = apply(s, {
    type: "context",
    context: c,
    reason: "merchant cost correction",
  });
  assert.equal(s.revision, 2);
  assert.equal(s.experiments[0].invalidated, true);
  assert.equal(s.experiments[0].stage, "Stopped");
  assert.throws(
    () =>
      apply(s, { type: "stage", id: s.experiments[0].id, stage: "Prepared" }),
    /staleApproval/,
  );
});
test("stages need materials and explicit run confirmation", () => {
  let s = loaded();
  s = apply(s, { type: "approve", revision: s.revision, action: "discount" });
  const id = s.experiments[0].id;
  assert.throws(
    () => apply(s, { type: "stage", id, stage: "Ran", confirmed: true }),
    /confirmRun/,
  );
  s = apply(s, { type: "stage", id, stage: "Prepared", lang: "ta-IN" });
  assert.equal(s.experiments[0].stage, "Prepared");
  assert.throws(
    () => apply(s, { type: "stage", id, stage: "Ran" }),
    /confirmRun/,
  );
  s = apply(s, { type: "stage", id, stage: "Ran", confirmed: true });
  assert.equal(s.experiments[0].stage, "Ran");
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
});
function reviewed(kind: string, extra: Record<string, unknown> = {}) {
  let s = loaded();
  s = apply(s, { type: "approve", revision: s.revision, action: "discount" });
  const id = s.experiments[0].id;
  s = apply(s, { type: "stage", id, stage: "Prepared" });
  s = apply(s, { type: "stage", id, stage: "Ran", confirmed: true });
  s = apply(s, {
    type: "review",
    id,
    csv: sampleCSV(kind),
    date: "2026-11-21",
    coverage: true,
    hours: true,
    ran: true,
    exception: "",
    ...extra,
  });
  return s.experiments[0];
}
test("positive follow-up is 19, +5 original and -4 median", () => {
  const o = reviewed("positive").outcome!;
  assert.equal(o.followup, 19);
  assert.equal(o.deltaOriginal, 5);
  assert.equal(o.deltaBaseline, -4);
  assert.equal(o.direction, "improved");
  assert.equal(o.records.length, 97);
});
test("negative and inconclusive results are preserved", () => {
  assert.equal(reviewed("negative").outcome!.direction, "deteriorated");
  assert.equal(
    reviewed("positive", { coverage: false }).outcome!.direction,
    "inconclusive",
  );
  assert.equal(
    reviewed("positive", { exception: "Road work" }).outcome!.direction,
    "inconclusive",
  );
});
test("average goal uses saved metric and baseline", () => {
  const s = loaded();
  s.context.goal = "average";
  const a = analyze(s.data.rows, s.context);
  assert.equal(a.current.average, 20000);
  assert.equal(a.baselineAverage, 20000);
});
test("languages preserve canonical numbers and exact approved terms", () => {
  const s = loaded(),
    a = analyze(s.data.rows, s.context);
  const e = apply(s, {
    type: "approve",
    revision: s.revision,
    action: "discount",
  }).experiments[0];
  for (const l of LANGS) {
    const b = briefing(a, s.context, l);
    assert.ok(b.includes("14"));
    assert.ok(b.includes("23"));
    const terms = approvedTerms(e, l);
    assert.ok(terms.includes("₹35"));
    assert.ok(terms.includes("20"));
    assert.ok(terms.includes("2026-11-21"));
    assert.ok(posterHTML(e, l).includes("₹35"));
    assert.ok(posterHTML(e, l).includes("18:00"));
    assert.ok(posterHTML(e, l, true).includes(tr(l, "Draft")));
  }
});
test("all registered interface keys have both translations", () => {
  for (const key of translatedKeys) {
    assert.notEqual(tr("hi-IN", key), key);
    assert.notEqual(tr("ta-IN", key), key);
  }
});
test("voice interpretations never approve and ambiguity requires manual form", () => {
  assert.deepEqual(interpretCorrection("Budget 200"), {
    field: "budget",
    value: 20000,
  });
  assert.deepEqual(interpretCorrection("बजट २००"), {
    field: "budget",
    value: 20000,
  });
  assert.deepEqual(interpretCorrection("பட்ஜெட் 200"), {
    field: "budget",
    value: 20000,
  });
  assert.deepEqual(interpretCorrection("close 5 pm"), {
    field: "close",
    value: 1020,
  });
  assert.equal(interpretCorrection("close at 5"), null);
  assert.equal(interpretCorrection("approve budget 200"), null);
  assert.equal(interpretCorrection("maybe 200 or 300 budget"), null);
});
test("provider outputs are constrained, numeric hallucinations rejected", () => {
  assert.deepEqual(validFocus('{"focus":"dates"}'), { focus: "dates" });
  assert.throws(() => validFocus('{"focus":"dates","revenue":999}'));
  assert.throws(() => validFocus('{"focus":"approve"}'));
});
test("cache identity changes with revision, language, model, focus, and scope", () => {
  const key = cacheIdentity(
    "owner",
    1,
    "en-IN",
    "audio",
    "summary",
    "",
    "bulbul:v3",
  );
  assert.equal(
    key,
    cacheIdentity("owner", 1, "en-IN", "audio", "summary", "", "bulbul:v3"),
  );
  for (const other of [
    cacheIdentity("owner", 2, "en-IN", "audio", "summary", "", "bulbul:v3"),
    cacheIdentity("owner", 1, "ta-IN", "audio", "summary", "", "bulbul:v3"),
    cacheIdentity("other", 1, "en-IN", "audio", "summary", "", "bulbul:v3"),
    cacheIdentity("owner", 1, "en-IN", "audio", "dates", "", "bulbul:v3"),
  ])
    assert.notEqual(key, other);
});
test("average-value goal abstains when fewer than three nonempty historical windows exist", () => {
  const c = sampleContext();
  c.goal = "average";
  const rows = parseCSV(sampleCSV()).rows.filter(
    (t) => t.date !== "2026-10-24",
  );
  const a = analyze(rows, c);
  assert.equal(a.baselineAverage, null);
  assert.equal(a.eligible, false);
});
