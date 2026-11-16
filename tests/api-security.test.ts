import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

// Exercise the actual routes with an in-memory D1-compatible database.
// Provider traffic is mocked; these tests never spend credits.
const sqlite = new DatabaseSync(":memory:");
sqlite.exec("CREATE TABLE provider_usage (key TEXT PRIMARY KEY, count INTEGER NOT NULL)");
const database = {
  prepare(sql: string) {
    let params: unknown[] = [];
    return {
      bind(...values: unknown[]) { params = values; return this; },
      async run() {
        const result = sqlite.prepare(sql).run(...params as never[]);
        return { meta: { changes: Number(result.changes) } };
      },
      async first() { return sqlite.prepare(sql).get(...params as never[]) ?? null; },
    };
  },
};
Object.assign(globalThis, { __dukaanTestEnv: { DB: database, SARVAM_API_KEY: "test-only-placeholder" } });
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "cloudflare:workers") {
      return { url: "data:text/javascript,export const env = globalThis.__dukaanTestEnv;", shortCircuit: true };
    }
    return next(specifier, context);
  },
});
const config = await import("../app/api/config-sarvam/route");
const chat = await import("../app/api/ai-chat/route");
const tts = await import("../app/api/ai-tts/route");
const stt = await import("../app/api/ai-stt/route");
const server = await import("../lib/server");
const cookie = "dp_session=" + "a".repeat(64);
function jsonRequest(path: string, body: unknown, existingSession = true) {
  return new Request("https://dukaan.example/api/" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(existingSession ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}
function audioRequest() {
  const form = new FormData();
  form.append("file", new File(["test audio"], "sample.webm", { type: "audio/webm" }));
  form.append("lang", "ta-IN");
  return new Request("https://dukaan.example/api/ai-stt", { method: "POST", headers: { Cookie: cookie }, body: form });
}
test("public provider configuration is denied without changing the key", async () => {
  const before = server.settings().key;
  const result = await config.POST();
  assert.equal(result.status, 403);
  assert.equal(server.settings().key, before);
});
test("chat, transcription and speech share a 12-call workspace quota", async (t) => {
  sqlite.exec("DELETE FROM provider_usage");
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({ choices: [{ message: { content: '{"answer":"Test answer"}' } }], transcript: "Test", audios: ["test"] });
  });
  for (let i = 0; i < 12; i++) {
    const result = i % 3 === 0
      ? await chat.POST(jsonRequest("ai-chat", { question: "How are sales?" }))
      : i % 3 === 1
        ? await tts.POST(jsonRequest("ai-tts", { text: "Test speech" }))
        : await stt.POST(audioRequest());
    assert.equal(result.status, 200);
  }
  for (const result of [
    await chat.POST(jsonRequest("ai-chat", { question: "How are sales?" })),
    await tts.POST(jsonRequest("ai-tts", { text: "Test speech" })),
    await stt.POST(audioRequest()),
  ]) assert.equal(result.status, 429);
  assert.equal(calls, 12, "Denied requests must never reach the provider");
});
test("deployment quota applies even to a new anonymous workspace", async (t) => {
  sqlite.exec("DELETE FROM provider_usage");
  const day = new Date().toISOString().slice(0, 10);
  sqlite.prepare("INSERT INTO provider_usage VALUES (?, ?)").run(day + ":global", 100);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return Response.json({}); });
  const result = await chat.POST(jsonRequest("ai-chat", { question: "Help" }, false));
  assert.equal(result.status, 429);
  assert.match(result.headers.get("Set-Cookie") || "", /dp_session=/);
  assert.equal(calls, 0);
});
test("invalid inputs do not spend quota", async (t) => {
  sqlite.exec("DELETE FROM provider_usage");
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return Response.json({}); });
  assert.equal((await chat.POST(jsonRequest("ai-chat", { question: "x".repeat(1001) }))).status, 400);
  assert.equal((await tts.POST(jsonRequest("ai-tts", { text: "Hello", lang: "invalid" }))).status, 400);
  assert.equal((await chat.POST(jsonRequest("ai-chat", { question: "Help", storeContext: { topProducts: "bad" } }))).status, 400);
  const form = new FormData();
  form.append("file", new File([new Uint8Array(1024 * 1024 + 1)], "large.webm"));
  const result = await stt.POST(new Request("https://dukaan.example/api/ai-stt", { method: "POST", body: form }));
  assert.equal(result.status, 400);
  assert.equal(calls, 0);
  assert.equal((sqlite.prepare("SELECT COUNT(*) AS n FROM provider_usage").get() as { n: number }).n, 0);
});
test("transcription preserves the actual audio filename and MIME type", async (t) => {
  sqlite.exec("DELETE FROM provider_usage");
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    const audio = (init.body as FormData).get("file") as File;
    assert.equal(audio.name, "sample.webm");
    assert.equal(audio.type, "audio/webm");
    return Response.json({ transcript: "Test" });
  });
  assert.equal((await stt.POST(audioRequest())).status, 200);
});
