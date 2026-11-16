import {
  response,
  sameOrigin,
  ensureSarvamKeyLoaded,
  providerFetch,
  scopeFor,
  reserveUsage,
} from "@/lib/server";
import { answerStoreAIQuestion } from "@/lib/ai-assistant";

import { z } from "zod";

const inputSchema = z.object({
  question: z.string().trim().min(1).max(1000),
  lang: z.enum(["en-IN", "hi-IN", "ta-IN"]).default("ta-IN"),
  storeContext: z.object({
    shopName: z.string().max(160).optional(),
    todaySales: z.number().finite().optional(),
    todayBills: z.number().finite().optional(),
    yesterdaySales: z.number().finite().optional(),
    topProducts: z.array(z.object({ name: z.string().max(160), quantity: z.number().finite(), amount: z.number().finite() })).max(100).optional(),
    zeroSaleProducts: z.array(z.string().max(160)).max(100).optional(),
    inactiveDeadHours: z.array(z.string().max(80)).max(100).optional(),
    weather: z.object({ temp: z.number().finite().optional(), condition: z.string().max(160).optional(), description: z.string().max(500).optional(), timeOfDay: z.string().max(80).optional() }).optional(),
    currentTime: z.string().max(80).optional(),
  }).default({}),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return response({ error: "forbidden" }, 403);
  let cookie: string | undefined;
  const reply = (data: unknown, status = 200) => response(data, status, cookie);
  try {
    const session = await scopeFor(req);
    cookie = session.cookie;
    const input = inputSchema.safeParse(await req.json());
    if (!input.success) return reply({ error: "invalidInput" }, 400);
    const { question, lang, storeContext } = input.data;
    const key = await ensureSarvamKeyLoaded();

    // If Sarvam is configured, call Sarvam 105b conversational model
    if (key) {
      await reserveUsage(session.scope);
      try {
        const langName =
          lang === "hi-IN"
            ? "Hindi (हिंदी)"
            : lang === "ta-IN"
              ? "Tamil (தமிழ்)"
              : "English";

        const systemPrompt = `You are DukaanPulse AI (துக்கான் பல்ஸ் AI), an expert retail store intelligence and business growth advisor for retail shop owners in India.
Your mission is to provide intelligent, encouraging, and highly actionable store advice based on real-time sales and environmental context.

Language requirement:
Respond fluently and naturally in ${langName}. If replying in Tamil, write in standard Tamil with natural retail clarity.

Store Context:
- Shop: ${storeContext.shopName || "Marina Tea & Snacks"}
- Today's Total Sales: ₹${storeContext.todaySales ?? 0} (${storeContext.todayBills ?? 0} bills)
- Yesterday's Total Sales: ₹${storeContext.yesterdaySales ?? 0}
- Top Selling Products Today: ${(storeContext.topProducts || []).map((p) => `${p.name} (${p.quantity} sold, ₹${p.amount})`).join(", ") || "No sales yet"}
- Products with 0 Sales Today: ${(storeContext.zeroSaleProducts || []).join(", ") || "None"}
- Dead / Low Sales Hours: ${(storeContext.inactiveDeadHours || []).join(", ") || "None recorded"}
- Current Weather / Climate: ${storeContext.weather?.temp ?? 28}°C, ${storeContext.weather?.condition || "Cloudy"} (${storeContext.weather?.description || ""}), Time: ${storeContext.weather?.timeOfDay || "Day"}
- Current Time: ${storeContext.currentTime || "Current Hour"}

Instructions:
1. Directly answer the merchant's question with precise figures from the context.
2. If sales are down or dead hours are active, give 2-3 specific, practical strategies (e.g. combo discounts, flash offers, adjusting item prep).
3. If weather is rainy or cold, recommend hot items (tea, coffee, samosa/snacks). If sunny/hot, recommend cold drinks, juices, lassi.
4. Output STRICT JSON format only:
{
  "title": "Short catchy title in ${langName}",
  "answer": "Complete, structured answer in ${langName} (with polite greetings and bullet points if helpful)",
  "topic": "sales" | "weather" | "timing" | "products" | "advice"
}`;

        const sarvamRes = await providerFetch(
          "/v1/chat/completions",
          JSON.stringify({
            model: "sarvam-105b-conversations",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: question },
            ],
            temperature: 0.3,
            max_tokens: 600,
          }),
        );

        if (sarvamRes.ok) {
          const sarvamData = (await sarvamRes.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
            id?: string;
          };
          const rawContent = sarvamData.choices?.[0]?.message?.content?.trim() || "";

          // Try parsing JSON from output
          let parsed: { title?: string; answer?: string; topic?: string } | null = null;
          try {
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsed = JSON.parse(jsonMatch[0]);
            }
          } catch {
            // parse error
          }

          if (parsed?.answer) {
            return reply({
              success: true,
              title: parsed.title || (lang === "ta-IN" ? "AI ஆலோசனை" : "AI Insights"),
              answer: parsed.answer,
              topic: parsed.topic || "advice",
              model: "sarvam-105b-conversations",
              source: "sarvam",
              requestId: sarvamData.id || null,
            });
          } else if (rawContent) {
            return reply({
              success: true,
              title: lang === "ta-IN" ? "AI பதில்" : "AI Response",
              answer: rawContent,
              topic: "advice",
              model: "sarvam-105b-conversations",
              source: "sarvam",
            });
          }
        }
      } catch (sarvamErr) {
        console.warn("Sarvam chat completion failed, falling back to local analysis:", sarvamErr);
      }
    }

    // Fallback if Sarvam API unavailable or not configured
    const fallback = answerStoreAIQuestion(
      question,
      [],
      new Date().toISOString().slice(0, 10),
      [],
      undefined,
      new Date().getHours(),
      lang,
    );

    return reply({
      success: true,
      title: fallback.title,
      answer: fallback.activeAnswer,
      topic: fallback.topic,
      source: "fallback",
    });
  } catch (err) {
    if (err instanceof Error && err.message === "rateLimit") {
      return reply({ error: "rateLimit", fallback: true }, 429);
    }

    if (err instanceof SyntaxError) return reply({ error: "invalidInput" }, 400);
    console.error("AI chat route error:", err);
    return reply({ error: "serverError", message: "Failed to process question" }, 500);
  }
}
