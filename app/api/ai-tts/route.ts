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
    const { text, lang = "ta-IN", speaker } = (await req.json()) as {
      text?: string;
      lang?: "ta-IN" | "hi-IN" | "en-IN";
      speaker?: string;
    };

    if (!text || typeof text !== "string" || !text.trim() || text.length > 1200 || !["en-IN", "hi-IN", "ta-IN"].includes(lang) || (speaker !== undefined && (typeof speaker !== "string" || !/^[a-z-]{1,40}$/.test(speaker)))) {
      return reply({ error: "invalidInput", message: "Text is required" }, 400);
    }

    const key = await ensureSarvamKeyLoaded();
    if (!key) {
      return reply({ error: "notConfigured", fallback: true }, 200);
    }

    // Available speakers for bulbul:v3:
    // ta-IN: kavitha (female), gokul (male), vijay (male), mani (male)
    // hi-IN: priya (female), pooja (female), aditya (male), rahul (male)
    // en-IN: kavya (female), ishita (female), rohan (male)
    const defaultSpeaker =
      speaker ||
      (lang === "hi-IN"
        ? "priya"
        : lang === "ta-IN"
          ? "kavitha"
          : "kavya");

    // Clean text: strip markdown characters (*, #, _, [, ]) so TTS reads smoothly
    const cleanText = text
      .replace(/[*#_~`\[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 480); // Optimal chunk size for single utterance

    if (!cleanText) return reply({ error: "invalidInput" }, 400);
    await reserveUsage(session.scope);
    const res = await providerFetch(
      "/text-to-speech",
      JSON.stringify({
        text: cleanText,
        language_code: lang,
        model: "bulbul:v3",
        speaker: defaultSpeaker,
        pace: 1.0,
        speech_sample_rate: 16000,
        output_audio_codec: "mp3",
      }),
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.warn("Sarvam TTS error:", res.status, errBody);
      return reply({ error: "providerError", fallback: true }, 200);
    }

    const data = (await res.json()) as { audios?: string[]; request_id?: string };
    const audio = data.audios?.[0];

    if (!audio) {
      return reply({ error: "noAudio", fallback: true }, 200);
    }

    return reply({
      success: true,
      audio,
      mime: "audio/mpeg",
      model: "bulbul:v3",
      speaker: defaultSpeaker,
      source: "sarvam",
      requestId: data.request_id || null,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "rateLimit") {
      return reply({ error: "rateLimit", fallback: true }, 429);
    }

    if (err instanceof SyntaxError || err instanceof TypeError) return reply({ error: "invalidInput" }, 400);
    console.error("AI TTS error:", err);
    return reply({ error: "serverError", fallback: true }, 200);
  }
}
