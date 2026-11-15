import {
  scopeFor,
  readState,
  settings,
  ensureSarvamKeyLoaded,
  response,
  reserveUsage,
  providerFetch,
  sameOrigin,
} from "@/lib/server";
import { interpretCorrection } from "@/lib/commands";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return response({ error: "forbidden" }, 403);
  try {
    const { scope } = await scopeFor(req),
      s = await readState(scope),
      form = await req.formData(),
      file = form.get("file"),
      revision = Number(form.get("revision")),
      lang = form.get("lang");
    if (s.revision !== revision)
      return response({ error: "staleApproval" }, 409);
    await ensureSarvamKeyLoaded();
    if (!settings().key) return response({ error: "notConfigured" }, 503);
    if (
      !(file instanceof File) ||
      file.size > 1024 * 1024 ||
      !["en-IN", "hi-IN", "ta-IN"].includes(String(lang))
    )
      return response({ error: "invalidInput" }, 400);
    await reserveUsage(scope);
    const body = new FormData();
    body.append("file", file);
    body.append("model", settings().stt);
    body.append("language_code", String(lang));
    body.append("mode", "transcribe");
    const res = await providerFetch("/speech-to-text", body, true);
    if (!res.ok) throw Error("providerUnavailable");
    const data = (await res.json()) as {
      transcript?: string;
      request_id?: string;
    };
    const transcript = String(data.transcript || "").slice(0, 500);
    return response({
      transcript,
      correction: interpretCorrection(transcript),
      requestId: data.request_id || null,
      source: "sarvam",
    });
  } catch {
    return response({ error: "providerUnavailable" }, 503);
  }
}
