import { z } from "zod";
import {
  db,
  scopeFor,
  readState,
  response,
  settings,
  ensureSarvamKeyLoaded,
  reserveUsage,
  digest,
  providerFetch,
  sameOrigin,
} from "@/lib/server";
import { receiptProvider, ProviderPayload } from "@/lib/provider-service";
const schema = z.object({
  revision: z.number().int(),
  lang: z.enum(["en-IN", "hi-IN", "ta-IN"]),
  kind: z.enum(["explain", "audio"]),
  focus: z
    .enum(["summary", "dates", "missing", "economics"])
    .default("summary"),
  question: z.string().max(300).default(""),
});
export async function POST(req: Request) {
  if (!sameOrigin(req)) return response({ error: "forbidden" }, 403);
  try {
    const input = schema.parse(await req.json()),
      { scope } = await scopeFor(req),
      s = await readState(scope);
    await ensureSarvamKeyLoaded();
    const result = await receiptProvider(input, s, scope, !!settings().key, {
      key: digest,
      read: async (k) => {
        const row = await db()
          .prepare("SELECT status,payload FROM provider_cache WHERE key=?")
          .bind(k)
          .first<{ status: string; payload: string }>();
        return row?.status === "ready"
          ? (JSON.parse(row.payload) as ProviderPayload)
          : null;
      },
      claim: async (k) => {
        await db()
          .prepare(
            "DELETE FROM provider_cache WHERE key=? AND status!=? AND created_at<?",
          )
          .bind(k, "ready", Date.now() - 45000)
          .run();
        const r = await db()
          .prepare(
            "INSERT OR IGNORE INTO provider_cache(key,scope,status,created_at) VALUES(?,?,?,?)",
          )
          .bind(k, scope, "pending", Date.now())
          .run();
        return !!r.meta.changes;
      },
      save: async (k, p) => {
        await db()
          .prepare("UPDATE provider_cache SET status=?,payload=? WHERE key=?")
          .bind("ready", JSON.stringify(p), k)
          .run();
      },
      fail: async (k) => {
        await db()
          .prepare("UPDATE provider_cache SET status=? WHERE key=?")
          .bind("failed", k)
          .run();
      },
      reserve: () => reserveUsage(scope),
      transport: providerFetch,
    });
    return response(
      result,
      result.reason === "staleApproval"
        ? 409
        : result.reason === "rateLimit"
          ? 429
          : 200,
    );
  } catch {
    return response({ source: "fallback", reason: "providerUnavailable" }, 503);
  }
}
