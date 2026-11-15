import { z } from "zod";
import {
  State,
  Context,
  Experiment,
  Outcome,
  clone,
  validDate,
} from "./domain";
import { analyze, economics, parseCSV } from "./analytics";
import { sampleCSV, sampleContext } from "./fixtures";
const date = z.string().refine((s) => {
  try {
    return validDate(s);
  } catch {
    return false;
  }
}, "date");
const amount = z.number().int().min(0).max(100000000);
const clock = z.number().int().min(0).max(1440);
export const contextSchema = z
  .object({
    shop: z.string().trim().min(1).max(80),
    date,
    open: clock,
    close: clock,
    goal: z.enum(["count", "average"]),
    threshold: z.number().min(5).max(90),
    testDate: date,
    reviewDate: date,
    coverage: z
      .record(
        date,
        z
          .object({
            state: z.enum(["confirmed", "unknown"]),
            start: clock,
            end: clock,
          })
          .refine((v) => v.start < v.end),
      )
      .refine((v) => Object.keys(v).length <= 200),
    exceptions: z
      .record(
        date,
        z
          .object({
            closed: z.boolean(),
            open: clock,
            close: clock,
            exclude: z.boolean(),
            reason: z.string().max(200),
          })
          .refine(
            (v) =>
              (v.closed || v.open < v.close) &&
              (!v.exclude || v.reason.trim().length > 0),
          ),
      )
      .refine((v) => Object.keys(v).length <= 200),
    offer: z.object({
      name: z.object({
        "en-IN": z.string().trim().min(1).max(80),
        "hi-IN": z.string().trim().min(1).max(80),
        "ta-IN": z.string().trim().min(1).max(80),
      }),
      available: z.boolean(),
      price: amount,
      cost: amount,
      discount: amount,
      additional: amount,
      quantity: z.number().int().min(0).max(10000),
      limit: z.number().int().min(1).max(10000),
      budget: amount,
      floor: amount,
      referenceVolume: z.number().int().min(1).max(10000),
    }),
  })
  .refine(
    (v) =>
      v.open < v.close && v.testDate > v.date && v.reviewDate >= v.testDate,
  );
const base = { expectedVersion: z.number().int().nonnegative() };
export const commandSchema = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("loadSample"),
    kind: z.enum(["valid", "insufficient", "dirty"]),
  }),
  z.object({
    ...base,
    type: z.literal("upload"),
    csv: z.string().max(2097152),
    name: z.string().max(120),
    mapping: z.record(z.string()).optional(),
  }),
  z.object({
    ...base,
    type: z.literal("context"),
    context: contextSchema,
    reason: z.string().trim().min(1).max(240),
  }),
  z.object({
    ...base,
    type: z.literal("approve"),
    revision: z.number().int(),
    action: z.enum(["investigate", "existing", "discount"]),
  }),
  z.object({
    ...base,
    type: z.literal("reject"),
    revision: z.number().int(),
    action: z.enum(["investigate", "existing", "discount"]),
    reason: z.string().trim().min(1).max(240),
  }),
  z.object({
    ...base,
    type: z.literal("stage"),
    id: z.string().max(100),
    stage: z.enum(["Prepared", "Ran", "Skipped", "Stopped"]),
    lang: z.enum(["en-IN", "hi-IN", "ta-IN"]).optional(),
    confirmed: z.boolean().optional(),
  }),
  z.object({
    ...base,
    type: z.literal("review"),
    id: z.string().max(100),
    csv: z.string().max(2097152),
    mapping: z.record(z.string()).optional(),
    date,
    coverage: z.boolean(),
    hours: z.boolean(),
    ran: z.boolean(),
    exception: z.string().max(240),
  }),
  z.object({ ...base, type: z.literal("reset") }),
]);
export type Command = z.infer<typeof commandSchema>;
export class DomainError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
function revise(s: State, reason: string, at: string) {
  s.revision++;
  s.revisions.push({
    revision: s.revision,
    at,
    reason,
    context: clone(s.context),
    analysis: analyze(s.data.rows, s.context),
  });
  if (s.revisions.length > 80) throw new DomainError("historyLimit");
  for (const e of s.experiments) {
    if (
      e.revision !== s.revision &&
      !["Reviewed", "Skipped", "Stopped"].includes(e.stage)
    ) {
      e.invalidated = true;
      if (e.stage !== "Ran") {
        e.stage = "Stopped";
        e.events.push({ at, stage: "Stopped", note: "revisionChanged" });
      }
    }
  }
}
export function execute(
  state: State,
  input: unknown,
  at = new Date().toISOString(),
  id = crypto.randomUUID(),
): State {
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success) throw new DomainError("invalidInput");
  const cmd = parsed.data;
  if (cmd.expectedVersion !== state.version)
    throw new DomainError("staleVersion");
  const s = clone(state);
  if (cmd.type === "reset") {
    const fresh = {
      ...state,
      loaded: false,
      data: {
        rows: [],
        issues: [],
        excluded: {},
        duplicates: 0,
        totalRows: 0,
        headers: [],
        preview: [],
      },
      sourceName: "",
      context: sampleContext(),
      revision: 0,
      revisions: [],
      experiments: [],
      rejections: [],
      version: s.version + 1,
    } as State;
    return fresh;
  }
  if (cmd.type === "loadSample") {
    s.context = sampleContext(cmd.kind);
    s.data = parseCSV(sampleCSV(cmd.kind));
    s.loaded = true;
    s.sourceName = `synthetic-${cmd.kind}.csv`;
    revise(s, "sampleLoaded", at);
  }
  if (cmd.type === "upload") {
    s.data = parseCSV(cmd.csv, cmd.mapping);
    if (!s.data.rows.length) throw new DomainError("noValidRows");
    s.loaded = true;
    s.sourceName = cmd.name;
    const dates = [...new Set(s.data.rows.map((t) => t.date))].sort();
    s.context.date = dates[dates.length - 1];
    s.context.testDate = new Date(
      Date.parse(s.context.date + "T00:00:00Z") + 7 * 86400000,
    )
      .toISOString()
      .slice(0, 10);
    s.context.reviewDate = new Date(
      Date.parse(s.context.testDate + "T00:00:00Z") + 86400000,
    )
      .toISOString()
      .slice(0, 10);
    s.context.coverage = {};
    s.context.exceptions = {};
    revise(s, "uploadChanged", at);
  }
  if (cmd.type === "context") {
    if (JSON.stringify(s.context) === JSON.stringify(cmd.context)) return state;
    s.context = cmd.context as Context;
    revise(s, cmd.reason, at);
  }
  if (cmd.type === "approve") {
    if (cmd.revision !== s.revision || !s.loaded)
      throw new DomainError("staleApproval");
    if (
      s.experiments.some(
        (e) =>
          e.revision === s.revision &&
          !["Skipped", "Stopped"].includes(e.stage),
      )
    )
      throw new DomainError("duplicateExperiment");
    const analysis = analyze(s.data.rows, s.context),
      econ = economics(s.context.offer, cmd.action);
    if (
      cmd.action !== "investigate" &&
      (!analysis.eligible || !analysis.flag || !econ.eligible)
    )
      throw new DomainError("ineligible");
    if (s.experiments.length >= 50) throw new DomainError("historyLimit");
    const e: Experiment = {
      id,
      revision: s.revision,
      createdAt: at,
      stage: "Approved",
      action: cmd.action,
      context: clone(s.context),
      analysis,
      invalidated: false,
      events: [{ at, stage: "Approved", note: "merchantApproved" }],
    };
    s.experiments.push(e);
  }
  if (cmd.type === "reject") {
    if (cmd.revision !== s.revision) throw new DomainError("staleApproval");
    s.rejections.push({
      at,
      revision: s.revision,
      action: cmd.action,
      reason: cmd.reason,
    });
  }
  if (cmd.type === "stage") {
    const e = s.experiments.find((e) => e.id === cmd.id);
    if (!e) throw new DomainError("notFound");
    if (cmd.stage === "Prepared") {
      if (e.invalidated || e.revision !== s.revision)
        throw new DomainError("staleApproval");
      if (!["Approved", "Prepared"].includes(e.stage))
        throw new DomainError("transition");
      e.materials = { lang: cmd.lang || "en-IN", at };
    }
    if (
      cmd.stage === "Ran" &&
      (e.stage !== "Prepared" || !cmd.confirmed || e.invalidated)
    )
      throw new DomainError("confirmRun");
    if (
      ["Skipped", "Stopped"].includes(cmd.stage) &&
      ["Reviewed", "Skipped", "Stopped"].includes(e.stage)
    )
      throw new DomainError("transition");
    e.stage = cmd.stage;
    e.events.push({
      at,
      stage: cmd.stage,
      note: cmd.stage === "Ran" ? "merchantConfirmed" : "merchantAction",
    });
  }
  if (cmd.type === "review") {
    const e = s.experiments.find((e) => e.id === cmd.id);
    if (!e) throw new DomainError("notFound");
    if (e.stage !== "Ran") throw new DomainError("confirmRun");
    if (cmd.date <= e.context.date) throw new DomainError("followupDate");
    const data = parseCSV(cmd.csv, cmd.mapping),
      rows = data.rows.filter(
        (t) => t.date === cmd.date && t.minute >= 960 && t.minute < 1080,
      );
    const sameDay =
      new Date(cmd.date + "T00:00:00Z").getUTCDay() ===
      new Date(e.context.date + "T00:00:00Z").getUTCDay();
    const original =
        e.context.goal === "count"
          ? e.analysis.current.count
          : e.analysis.current.average,
      baseline =
        e.context.goal === "count"
          ? e.analysis.baseline
          : e.analysis.baselineAverage;
    const comparable =
      cmd.coverage &&
      cmd.hours &&
      cmd.ran &&
      !cmd.exception.trim() &&
      sameDay &&
      e.analysis.eligible &&
      data.issues.length === 0;
    const followup = cmd.coverage
      ? e.context.goal === "count"
        ? rows.length
        : rows.length
          ? rows.reduce((n, t) => n + t.paise, 0) / rows.length
          : null
      : null;
    const deltaOriginal =
        followup !== null && original !== null ? followup - original : null,
      deltaBaseline =
        followup !== null && baseline !== null ? followup - baseline : null;
    const { rows: allRows, ...rest } = data;
    const report = { ...rest };
    delete (report as { preview?: unknown }).preview;
    e.outcome = {
      at,
      date: cmd.date,
      original,
      baseline,
      followup,
      deltaOriginal,
      deltaBaseline,
      comparable,
      direction:
        comparable && deltaOriginal !== null
          ? deltaOriginal > 0
            ? "improved"
            : deltaOriginal < 0
              ? "deteriorated"
              : "unchanged"
          : "inconclusive",
      coverage: cmd.coverage,
      hours: cmd.hours,
      ran: cmd.ran,
      exception: cmd.exception,
      report,
      records: allRows,
    } as Outcome;
    e.stage = "Reviewed";
    e.events.push({ at, stage: "Reviewed", note: "arithmeticOnly" });
  }
  s.version++;
  return s;
}
export type Correction =
  | { field: "budget"; value: number }
  | { field: "close"; value: number }
  | { field: "available"; value: boolean }
  | { field: "goal"; value: "count" | "average" };
export function interpretCorrection(text: string): Correction | null {
  const t = text
    .toLowerCase()
    .replace(/[०-९]/g, (c) => String(c.charCodeAt(0) - 0x0966))
    .replace(/[௦-௯]/g, (c) => String(c.charCodeAt(0) - 0x0be6));
  if (/approv|confirm|मंजूर|स्वीकृत|ஒப்புதல்|அனுமதி/.test(t)) return null;
  if (/budget|बजट|பட்ஜெட்/.test(t)) {
    const nums = t.match(/\d+(?:\.\d{1,2})?/g);
    if (nums?.length === 1 && +nums[0] <= 100000)
      return { field: "budget", value: Math.round(+nums[0] * 100) };
  }
  if (/clos|बंद|மூட/.test(t)) {
    const m = /(?:^|\s)(\d{1,2})(?::(\d{2}))?\s*(pm|am)?\b/.exec(t);
    if (m) {
      let h = +m[1];
      if (m[3] === "pm" && h < 12) h += 12;
      if (m[3] === "am" && h === 12) h = 0;
      if ((m[3] || m[2] || h >= 13) && h < 24 && +(m[2] || 0) < 60)
        return { field: "close", value: h * 60 + +(m[2] || 0) };
    }
  }
  if (
    /unavailable|out of stock|उपलब्ध नहीं|खत्म|இருப்பு இல்லை|கிடைக்கவில்லை/.test(
      t,
    )
  )
    return { field: "available", value: false };
  if (/average|औसत|சராசரி/.test(t)) return { field: "goal", value: "average" };
  if (/payment count|भुगतान संख्या|பரிவர்த்தனை எண்ணிக்கை/.test(t))
    return { field: "goal", value: "count" };
  return null;
}
