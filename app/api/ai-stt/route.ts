import {
  response,
  sameOrigin,
  ensureSarvamKeyLoaded,
  providerFetch,
  scopeFor,
  reserveUsage,
} from "@/lib/server";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return response({ error: "forbidden" }, 403);
  let cookie: string | undefined;
  const reply = (data: unknown, status = 200) => response(data, status, cookie);
  try {
    const session = await scopeFor(req);
    cookie = session.cookie;
    const key = await ensureSarvamKeyLoaded();
    if (!key) return reply({ error: "notConfigured", fallback: true }, 200);

    const formData = await req.formData();
    const file = formData.get("file");
    const lang = (formData.get("lang") as string) || "ta-IN";

    if (!(file instanceof File) || !file.size || file.size > 1024 * 1024 || !["en-IN", "hi-IN", "ta-IN"].includes(lang)) {
      return reply({ error: "invalidInput", message: "Audio file is required" }, 400);
    }

    await reserveUsage(session.scope);
    const sarvamForm = new FormData();
    sarvamForm.append("file", file, file.name || "recording.webm");
    sarvamForm.append("model", "saaras:v3");
    sarvamForm.append("language_code", lang);
    sarvamForm.append("mode", "transcribe");

    const res = await providerFetch("/speech-to-text", sarvamForm, true);
    if (!res.ok) {
      const err = await res.text();
      console.warn("Sarvam STT error:", res.status, err);
      return reply({ error: "providerError", fallback: true }, 200);
    }

    const data = (await res.json()) as { transcript?: string; request_id?: string };
    return reply({
      success: true,
      transcript: data.transcript || "",
      model: "saaras:v3",
      source: "sarvam",
      requestId: data.request_id || null,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "rateLimit") {
      return reply({ error: "rateLimit", fallback: true }, 429);
    }

    console.error("AI STT error:", err);
    return reply({ error: "serverError", fallback: true }, 200);
  }
}
