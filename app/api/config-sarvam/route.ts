import { response, sameOrigin, setMemoryKey, db } from "@/lib/server";
import fs from "node:fs/promises";
import path from "node:path";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return response({ error: "forbidden" }, 403);
  try {
    const body = (await req.json()) as { key?: string };
    const key = body.key?.trim() || "";

    if (!key || key.length < 10 || /[\r\n]/.test(key)) {
      return response({ error: "invalidKey", message: "API key must be at least 10 characters." }, 400);
    }

    // 1. Immediately activate in runtime memory and process env
    setMemoryKey(key);
    if (typeof process !== "undefined" && process.env) {
      process.env.SARVAM_API_KEY = key;
    }

    // 2. Persist in D1 database so it survives page reloads
    try {
      await db()
        .prepare(
          "INSERT OR REPLACE INTO workspaces(scope,version,payload,updated_at) VALUES(?,1,?,?)",
        )
        .bind("config:sarvam", JSON.stringify({ key }), new Date().toISOString())
        .run();
    } catch (d1Err) {
      console.warn("Could not save to D1:", d1Err);
    }

    // 3. Attempt writing to .dev.vars (best-effort; workerd sandbox may restrict runtime fs writes)
    try {
      const devVarsPath = path.join(process.cwd(), ".dev.vars");
      await fs.writeFile(devVarsPath, `SARVAM_API_KEY=${JSON.stringify(key)}\n`);
    } catch {
      // Sandbox restricts filesystem writes at runtime; safely ignored as memory & D1 are active
    }

    return response({
      success: true,
      message: "Sarvam API Key successfully configured and activated.",
    });
  } catch (err) {
    console.error("Failed to activate Sarvam key:", err);
    return response({ error: "saveFailed", message: "Failed to configure key." }, 500);
  }
}
