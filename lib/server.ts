import { env } from "cloudflare:workers";
import { State, emptyState } from "./domain";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run(): Promise<{ meta: { changes: number; last_row_id?: number } }>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

let localFallbackDb: D1DatabaseLike | null = null;

function getFallbackDb(): D1DatabaseLike {
  if (localFallbackDb) return localFallbackDb;

  try {
    const sqliteModule = require("node:sqlite");
    const path = require("node:path");
    const fs = require("node:fs");
    const os = require("node:os");

    let dbFile = path.join(os.tmpdir(), "dukaanpulse.sqlite");
    const wranglerDir = path.resolve(".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
    if (fs.existsSync(wranglerDir)) {
      const files = fs.readdirSync(wranglerDir);
      const sqliteFile = files.find(
        (f: string) => f.endsWith(".sqlite") && !f.startsWith("metadata")
      );
      if (sqliteFile) {
        dbFile = path.join(wranglerDir, sqliteFile);
      }
    }

    const sqlite = new sqliteModule.DatabaseSync(dbFile);
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        scope text PRIMARY KEY NOT NULL,
        version integer NOT NULL,
        payload text NOT NULL,
        updated_at text NOT NULL
      );
      CREATE TABLE IF NOT EXISTS provider_cache (
        key text PRIMARY KEY NOT NULL,
        scope text NOT NULL,
        status text NOT NULL,
        payload text,
        created_at integer NOT NULL
      );
      CREATE TABLE IF NOT EXISTS provider_usage (
        key text PRIMARY KEY NOT NULL,
        count integer NOT NULL
      );
    `);

    localFallbackDb = {
      prepare(sql: string): D1PreparedStatementLike {
        let boundParams: unknown[] = [];
        const stmtObj: D1PreparedStatementLike = {
          bind(...params: unknown[]) {
            boundParams = params;
            return stmtObj;
          },
          async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
            const stmt = sqlite.prepare(sql);
            const row = stmt.get(...boundParams) as Record<string, unknown> | undefined;
            if (!row) return null;
            if (colName && typeof colName === "string") return row[colName] as unknown as T;
            return row as unknown as T;
          },
          async run() {
            const stmt = sqlite.prepare(sql);
            const result = stmt.run(...boundParams);
            return {
              meta: {
                changes: Number(result.changes),
                last_row_id: Number(result.lastInsertRowid),
              },
            };
          },
          async all<T = Record<string, unknown>>() {
            const stmt = sqlite.prepare(sql);
            const rows = stmt.all(...boundParams);
            return { results: rows as unknown as T[] };
          },
        };
        return stmtObj;
      },
    };
    return localFallbackDb;
  } catch {
    // In-memory fallback with /tmp file persistence
    const os = require("node:os");
    const path = require("node:path");
    const fs = require("node:fs");

    const tmpJsonPath = path.join(os.tmpdir(), "dukaanpulse-workspaces.json");
    const workspaces = new Map<string, { scope: string; version: number; payload: string; updated_at: string }>();
    try {
      if (fs.existsSync(tmpJsonPath)) {
        const raw = fs.readFileSync(tmpJsonPath, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item?.scope) workspaces.set(item.scope, item);
          }
        }
      }
    } catch {
      // Ignore initial file read errors
    }

    const flushWorkspaces = () => {
      try {
        const list = Array.from(workspaces.values());
        fs.writeFileSync(tmpJsonPath, JSON.stringify(list), "utf-8");
      } catch {
        // Ignore file write errors
      }
    };

    const providerCache = new Map<string, { key: string; scope: string; status: string; payload: string; created_at: number }>();
    const providerUsage = new Map<string, number>();

    localFallbackDb = {
      prepare(sql: string): D1PreparedStatementLike {
        let boundParams: unknown[] = [];
        const stmtObj: D1PreparedStatementLike = {
          bind(...params: unknown[]) {
            boundParams = params;
            return stmtObj;
          },
          async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
            if (sql.includes("FROM workspaces WHERE scope=?")) {
              const row = workspaces.get(boundParams[0] as string);
              if (!row) return null;
              return (colName ? (row as Record<string, unknown>)[colName] : row) as unknown as T;
            }
            if (sql.includes("WHERE scope='config:sarvam'")) {
              const row = workspaces.get("config:sarvam");
              if (!row) return null;
              return (colName ? (row as Record<string, unknown>)[colName] : row) as unknown as T;
            }
            if (sql.includes("FROM provider_cache WHERE key=?")) {
              const row = providerCache.get(boundParams[0] as string);
              if (!row) return null;
              return (colName ? (row as Record<string, unknown>)[colName] : row) as unknown as T;
            }
            return null;
          },
          async run() {
            let changes = 0;
            if (sql.includes("INSERT OR IGNORE INTO workspaces")) {
              const [scope, version, payload, updated_at] = boundParams as [string, number, string, string];
              if (!workspaces.has(scope)) {
                workspaces.set(scope, { scope, version, payload, updated_at });
                flushWorkspaces();
                changes = 1;
              }
            } else if (sql.includes("INSERT OR REPLACE INTO workspaces")) {
              const [scope, version, payload, updated_at] = boundParams as [string, number, string, string];
              workspaces.set(scope, { scope, version, payload, updated_at });
              flushWorkspaces();
              changes = 1;
            } else if (sql.includes("UPDATE workspaces SET")) {
              const [version, payload, updated_at, scope, previous] = boundParams as [number, string, string, string, number];
              const existing = workspaces.get(scope);
              if (existing && existing.version === previous) {
                workspaces.set(scope, { scope, version, payload, updated_at });
                flushWorkspaces();
                changes = 1;
              }
            } else if (sql.includes("INSERT OR IGNORE INTO provider_usage")) {
              const [key] = boundParams as [string];
              if (!providerUsage.has(key)) {
                providerUsage.set(key, 0);
                changes = 1;
              }
            } else if (sql.includes("UPDATE provider_usage SET count=count+1")) {
              const [key, limit] = boundParams as [string, number];
              const cur = providerUsage.get(key) ?? 0;
              if (cur < limit) {
                providerUsage.set(key, cur + 1);
                changes = 1;
              }
            } else if (sql.includes("INSERT OR IGNORE INTO provider_cache")) {
              const [key, scope, status, created_at] = boundParams as [string, string, string, number];
              if (!providerCache.has(key)) {
                providerCache.set(key, { key, scope, status, payload: "", created_at });
                changes = 1;
              }
            } else if (sql.includes("UPDATE provider_cache SET status=?,payload=?")) {
              const [status, payload, key] = boundParams as [string, string, string];
              const item = providerCache.get(key);
              if (item) {
                item.status = status;
                item.payload = payload;
                changes = 1;
              }
            } else if (sql.includes("UPDATE provider_cache SET status=?")) {
              const [status, key] = boundParams as [string, string];
              const item = providerCache.get(key);
              if (item) {
                item.status = status;
                changes = 1;
              }
            }
            return { meta: { changes, last_row_id: 1 } };
          },
          async all<T = Record<string, unknown>>() {
            return { results: [] as unknown as T[] };
          },
        };
        return stmtObj;
      },
    };
    return localFallbackDb;
  }
}

export function db(): D1DatabaseLike {
  if ((env as unknown as { DB?: D1DatabaseLike })?.DB) {
    return (env as unknown as { DB: D1DatabaseLike }).DB;
  }
  return getFallbackDb();
}
export async function scopeFor(req: Request) {
  const owner = req.headers.get("oai-authenticated-user-id");
  if (owner) return { scope: "owner:" + owner, cookie: undefined };
  const match = /(?:^|; )dp_session=([a-f0-9]{64})(?:;|$)/.exec(
    req.headers.get("cookie") || "",
  );
  if (match) return { scope: "session:" + match[1], cookie: undefined };
  const id = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return {
    scope: "session:" + id,
    cookie: `dp_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`,
  };
}
export async function readState(scope: string): Promise<State> {
  const row = await db()
    .prepare("SELECT payload FROM workspaces WHERE scope=?")
    .bind(scope)
    .first<{ payload: string }>();
  return row ? JSON.parse(row.payload) : emptyState();
}
export async function saveState(scope: string, s: State, previous: number) {
  const payload = JSON.stringify(s);
  if (new TextEncoder().encode(payload).length > 8 * 1024 * 1024)
    throw Error("historyLimit");
  if (previous === 0) {
    const r = await db()
      .prepare(
        "INSERT OR IGNORE INTO workspaces(scope,version,payload,updated_at) VALUES(?,?,?,?)",
      )
      .bind(scope, s.version, payload, new Date().toISOString())
      .run();
    if (r.meta.changes) return;
  }
  const r = await db()
    .prepare(
      "UPDATE workspaces SET version=?,payload=?,updated_at=? WHERE scope=? AND version=?",
    )
    .bind(s.version, payload, new Date().toISOString(), scope, previous)
    .run();
  if (!r.meta.changes) throw Error("staleVersion");
}
export function response(data: unknown, status = 200, cookie?: string) {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (cookie) h["Set-Cookie"] = cookie;
  return new Response(JSON.stringify(data), { status, headers: h });
}
export function sameOrigin(req: Request) {
  return req.headers.get("sec-fetch-site") !== "cross-site";
}

let runtimeMemoryKey = "";

export function setMemoryKey(k: string) {
  runtimeMemoryKey = k;
  if (typeof globalThis !== "undefined") {
    (globalThis as unknown as { __SARVAM_KEY?: string }).__SARVAM_KEY = k;
  }
}

export function getMemoryKey(): string {
  if (runtimeMemoryKey) return runtimeMemoryKey;
  if (typeof globalThis !== "undefined") {
    const gk = (globalThis as unknown as { __SARVAM_KEY?: string }).__SARVAM_KEY;
    if (gk) return gk;
  }
  if (typeof process !== "undefined" && process.env?.SARVAM_API_KEY) {
    return process.env.SARVAM_API_KEY;
  }
  return "";
}

export async function ensureSarvamKeyLoaded(): Promise<string> {
  const current = getMemoryKey();
  if (current) return current;
  try {
    const row = await db()
      .prepare("SELECT payload FROM workspaces WHERE scope='config:sarvam'")
      .first<{ payload: string }>();
    if (row?.payload) {
      const data = JSON.parse(row.payload) as { key?: string };
      if (data?.key) {
        setMemoryKey(data.key);
        return data.key;
      }
    }
  } catch {
    // Ignore database lookup errors if table not ready
  }
  return "";
}

export function settings() {
  const e = env as unknown as Record<string, string | undefined>;
  const activeKey = getMemoryKey() || e.SARVAM_API_KEY || "";
  return {
    key: activeKey,
    tts: "bulbul:v3",
    stt: "saaras:v3",
    chat: "sarvam-105b",
    daily: 12,
    global: 100,
  };
}
export async function reserveUsage(scope: string) {
  const day = new Date().toISOString().slice(0, 10),
    keys = [`${day}:${scope}`, `${day}:global`],
    limits = [settings().daily, settings().global];
  for (let i = 0; i < keys.length; i++) {
    await db()
      .prepare("INSERT OR IGNORE INTO provider_usage(key,count) VALUES(?,0)")
      .bind(keys[i])
      .run();
    const r = await db()
      .prepare(
        "UPDATE provider_usage SET count=count+1 WHERE key=? AND count<?",
      )
      .bind(keys[i], limits[i])
      .run();
    if (!r.meta.changes) throw Error("rateLimit");
  }
}
export async function digest(v: string) {
  const a = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(a), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
let liveVerifiedState = false;

export function setLiveVerified(v = true) {
  liveVerifiedState = v;
  if (typeof globalThis !== "undefined") {
    (globalThis as unknown as { __SARVAM_LIVE_VERIFIED?: boolean }).__SARVAM_LIVE_VERIFIED = v;
  }
}

export function isLiveVerified(): boolean {
  if (liveVerifiedState) return true;
  if (typeof globalThis !== "undefined") {
    return !!(globalThis as unknown as { __SARVAM_LIVE_VERIFIED?: boolean }).__SARVAM_LIVE_VERIFIED;
  }
  return false;
}

export async function providerFetch(
  path: string,
  body: BodyInit,
  form = false,
) {
  const { key } = settings();
  if (!key) throw Error("notConfigured");
  const res = await fetch("https://api.sarvam.ai" + path, {
    method: "POST",
    headers: {
      "api-subscription-key": key,
      ...(form ? {} : { "Content-Type": "application/json" }),
    },
    body,
    signal: AbortSignal.timeout(20000),
  });
  if (res.ok) {
    setLiveVerified(true);
  }
  return res;
}
