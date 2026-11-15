import {
  response,
  sameOrigin,
  ensureSarvamKeyLoaded,
  providerFetch,
} from "@/lib/server";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return response({ error: "forbidden" }, 403);
  try {
    const { text, lang = "ta-IN", speaker } = (await req.json()) as {
      text?: string;
      lang?: "ta-IN" | "hi-IN" | "en-IN";
      speaker?: string;
    };

    if (!text || typeof text !== "string") {
      return response({ error: "invalidInput", message: "Text is required" }, 400);
    }

    const key = await ensureSarvamKeyLoaded();
    if (!key) {
      return response({ error: "notConfigured", fallback: true }, 200);
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
      return response({ error: "providerError", fallback: true }, 200);
    }

    const data = (await res.json()) as { audios?: string[]; request_id?: string };
    const audio = data.audios?.[0];

    if (!audio) {
      return response({ error: "noAudio", fallback: true }, 200);
    }

    return response({
      success: true,
      audio,
      mime: "audio/mpeg",
      model: "bulbul:v3",
      speaker: defaultSpeaker,
      source: "sarvam",
      requestId: data.request_id || null,
    });
  } catch (err) {
    console.error("AI TTS error:", err);
    return response({ error: "serverError", fallback: true }, 200);
  }
}
