import {
  response,
  sameOrigin,
  ensureSarvamKeyLoaded,
  providerFetch,
} from "@/lib/server";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return response({ error: "forbidden" }, 403);
  try {
    const key = await ensureSarvamKeyLoaded();
    if (!key) return response({ error: "notConfigured", fallback: true }, 200);

    const formData = await req.formData();
    const file = formData.get("file");
    const lang = (formData.get("lang") as string) || "ta-IN";

    if (!file || typeof file === "string") {
      return response({ error: "invalidInput", message: "Audio file is required" }, 400);
    }

    const sarvamForm = new FormData();
    sarvamForm.append("file", file, "recording.mp3");
    sarvamForm.append("model", "saaras:v3");
    sarvamForm.append("language_code", lang);
    sarvamForm.append("mode", "transcribe");

    const res = await providerFetch("/speech-to-text", sarvamForm, true);
    if (!res.ok) {
      const err = await res.text();
      console.warn("Sarvam STT error:", res.status, err);
      return response({ error: "providerError", fallback: true }, 200);
    }

    const data = (await res.json()) as { transcript?: string; request_id?: string };
    return response({
      success: true,
      transcript: data.transcript || "",
      model: "saaras:v3",
      source: "sarvam",
      requestId: data.request_id || null,
    });
  } catch (err) {
    console.error("AI STT error:", err);
    return response({ error: "serverError", fallback: true }, 200);
  }
}
