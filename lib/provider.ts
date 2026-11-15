import { z } from "zod";
import { Lang } from "./domain";
export const focusSchema = z
  .object({ focus: z.enum(["summary", "dates", "missing", "economics"]) })
  .strict();
export function validFocus(raw: string) {
  try {
    return focusSchema.parse(JSON.parse(raw));
  } catch {
    throw Error("invalidProviderOutput");
  }
}
export const voiceFor = (l: Lang) => (l === "hi-IN" ? "priya" : "ishita");
export function cacheIdentity(
  scope: string,
  revision: number,
  lang: Lang,
  kind: string,
  focus: string,
  question: string,
  model: string,
) {
  return JSON.stringify({
    scope,
    revision,
    lang,
    kind,
    focus,
    question,
    provider: "sarvam",
    model,
    voice: voiceFor(lang),
    pace: 1,
    sampleRate: 16000,
    templateVersion: 1,
  });
}
