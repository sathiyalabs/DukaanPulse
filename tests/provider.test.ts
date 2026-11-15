import { test } from "node:test";
import assert from "node:assert/strict";
import {
  receiptProvider,
  ProviderDeps,
  ProviderPayload,
  ProviderInput,
} from "../lib/provider-service";
import { execute } from "../lib/commands";
import { emptyState } from "../lib/domain";
const state = () =>
  execute(
    emptyState(),
    { type: "loadSample", kind: "valid", expectedVersion: 0 },
    "2026-11-15T00:00:00Z",
  );
const input: ProviderInput = {
  revision: 1,
  lang: "ta-IN",
  kind: "explain",
  focus: "summary",
  question: "Why these dates?",
};
function mock(transport: ProviderDeps["transport"]) {
  const cache = new Map<string, ProviderPayload>(),
    locks = new Set<string>();
  let calls = 0,
    used = 0;
  const deps: ProviderDeps = {
    key: async (s) => s,
    read: async (k) => cache.get(k) || null,
    claim: async (k) => {
      if (locks.has(k)) return false;
      locks.add(k);
      return true;
    },
    save: async (k, p) => {
      cache.set(k, p);
    },
    fail: async () => {},
    reserve: async () => {
      used++;
    },
    transport: async (p, b) => {
      calls++;
      return transport(p, b);
    },
  };
  return { deps, count: () => ({ calls, used }) };
}
const good = async () =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: '{"focus":"dates"}' } }],
      usage: { total_tokens: 41 },
    }),
  );
test("repeated explanation uses cache and consumes one mocked request", async () => {
  const m = mock(good),
    s = state();
  const a = await receiptProvider(input, s, "owner", true, m.deps),
    b = await receiptProvider(input, s, "owner", true, m.deps);
  assert.equal(a.source, "sarvam");
  assert.equal(a.cached, false);
  assert.equal(b.cached, true);
  assert.equal(b.text, a.text);
  assert.deepEqual(b.usage, { total_tokens: 41 });
  assert.deepEqual(m.count(), { calls: 1, used: 1 });
});
test("double request has one provider call", async () => {
  const m = mock(good),
    s = state();
  const out = await Promise.all([
    receiptProvider(input, s, "owner", true, m.deps),
    receiptProvider(input, s, "owner", true, m.deps),
  ]);
  assert.equal(out.filter((x) => x.reason === "rateLimit").length, 1);
  assert.equal(m.count().calls, 1);
});
test("missing credential and stale revision consume zero calls", async () => {
  const m = mock(good),
    s = state();
  assert.equal(
    (await receiptProvider(input, s, "owner", false, m.deps)).reason,
    "notConfigured",
  );
  assert.equal(
    (await receiptProvider({ ...input, revision: 0 }, s, "owner", true, m.deps))
      .reason,
    "staleApproval",
  );
  assert.equal(m.count().calls, 0);
});
test("provider failure gives grounded labelled fallback and no retry", async () => {
  const m = mock(async () => new Response("", { status: 503 }));
  const r = await receiptProvider(input, state(), "owner", true, m.deps);
  assert.equal(r.source, "fallback");
  assert.equal(r.reason, "providerUnavailable");
  assert.ok(r.text.includes("14"));
  assert.equal(m.count().calls, 1);
});
test("numeric model hallucinations rejected", async () => {
  const m = mock(
    async () =>
      new Response(
        JSON.stringify({
          choices: [
            { message: { content: '{"focus":"dates","payments":999}' } },
          ],
        }),
      ),
  );
  const r = await receiptProvider(input, state(), "owner", true, m.deps);
  assert.equal(r.source, "fallback");
  assert.ok(!r.text.includes("999"));
});
test("application limit fails before transport", async () => {
  const m = mock(good);
  m.deps.reserve = async () => {
    throw Error("rateLimit");
  };
  const r = await receiptProvider(input, state(), "owner", true, m.deps);
  assert.equal(r.reason, "rateLimit");
  assert.equal(m.count().calls, 0);
});
test("audio cache preserves voice settings and language separates cache", async () => {
  const m = mock(async (_p, body) => {
    const b = JSON.parse(body);
    assert.equal(b.model, "bulbul:v3");
    assert.equal(b.speech_sample_rate, 16000);
    return new Response(
      JSON.stringify({ audios: ["SUQzAAAA"], request_id: "fixture" }),
    );
  });
  const s = state();
  const i = { ...input, kind: "audio" as const };
  const a = await receiptProvider(i, s, "owner", true, m.deps);
  const b = await receiptProvider(i, s, "owner", true, m.deps);
  await receiptProvider({ ...i, lang: "hi-IN" }, s, "owner", true, m.deps);
  assert.equal(a.audio, b.audio);
  assert.equal(b.cached, true);
  assert.equal(m.count().calls, 2);
});
test("new immutable revision and reset timestamp cannot use stale audio", async () => {
  const m = mock(good),
    s = state();
  await receiptProvider(input, s, "owner", true, m.deps);
  const newer = state();
  newer.revisions[0].at = "2026-11-16T00:00:00Z";
  await receiptProvider(input, newer, "owner", true, m.deps);
  assert.equal(m.count().calls, 2);
});
