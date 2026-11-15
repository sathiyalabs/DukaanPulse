# Provider configuration record

Checked against official Sarvam API documentation on 15 November 2026. No authorised Sarvam dashboard or organiser account documentation was available. No API key was supplied. No live billable calls were made.

| Provider        | Task                             | Documented service selected                                                                                                  | Credential                            | Balance / billing unit                                              | Expiry / eligibility             | Bounds and fallback                                                                                                                                                        |
| --------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sarvam          | Requested receipt speech         | `POST https://api.sarvam.ai/text-to-speech`, `bulbul:v3`, `ishita` English/Tamil, `priya` Hindi, 16 kHz, MP3                 | `SARVAM_API_KEY` server-only, missing | Not verified. 500 organiser credits are user-reported; unit unknown | Not verified                     | 1,200 characters, 20-second timeout, cached per revision/language/settings, no automatic retry. Rule-based text plus explicitly labelled device speech if available        |
| Sarvam          | Short correction transcription   | `POST https://api.sarvam.ai/speech-to-text`, multipart `saaras:v3`, `mode: transcribe`, explicit `en-IN` / `hi-IN` / `ta-IN` | Same missing key                      | Not verified                                                        | Not verified                     | 15-second recording, 1 MB cap, 20-second timeout. Touch and typed correction available                                                                                     |
| Sarvam          | Evidence-question interpretation | `POST https://api.sarvam.ai/v1/chat/completions`, `sarvam-105b`, reasoning disabled                                          | Same missing key                      | Not verified                                                        | Not verified                     | 300-character question, 100 output tokens, temperature 0. Strict focus enum, no model-written figures. Fixed-language templates supply answer. Cached. Rule-based fallback |
| ChatGPT         | Development assistance           | Current development session                                                                                                  | Separate from runtime                 | API credits not inferred                                            | Runtime eligibility not inferred | No OpenAI API dependency                                                                                                                                                   |
| Other providers | None selected                    | None assumed                                                                                                                 | Not configured                        | Unknown                                                             | Unknown                          | No added paid dependency                                                                                                                                                   |

The official documentation also lists newer Bulbul v4 Flash and Saaras v4. The explicitly supported stable v3 contracts were selected to keep voice names and a narrow input contract deterministic. Account entitlement still needs verification. Sarvam-M is deprecated and is not used.

The application enforces 12 attempts/workspace/UTC-day plus 100/deployment/UTC-day. These are local hard caps, never an authoritative Sarvam balance. If a global reservation fails after the workspace reservation, the workspace counter can conservatively include that unused attempt. Failures never automatically retry. Repeated simultaneous requests for one cache key have a single database claim. Failed locks cool down for 45 seconds. Model-provided request IDs and usage metadata are kept only when returned. No token price or cost per call was guessed.

## Secure activation and one small live check set

1. Account owner verifies organiser allocation in their authorised Sarvam dashboard: unit, current balance, expiry, permitted APIs and model eligibility. Do not purchase or enable top-ups.
2. Enter the existing key through a secure host secret configuration. For local code use `node scripts/configure-sarvam.mjs` in your own terminal. For the hosted Site set the native runtime variable `SARVAM_API_KEY` marked secret and redeploy the saved version. Local files do not configure hosted secrets.
3. Record only non-secret configuration status and verified account facts. Never screenshot or log the key.
4. With permission to use the existing allocation, make one short English TTS, one Tamil TTS, one Hindi TTS, one short correction transcription and one explanation-question call. Replay an unchanged request and confirm a cache hit without a new provider call. Keep all other tests mocked. This set is proposed, not performed.
5. Verify pronunciation of currency and dates with native speakers, check the actual usage metadata/dashboard movement, and record only observed charges with their verified unit.

## Official sources

- REST speech: https://docs.sarvam.ai/api-reference/text-to-speech/convert
- Voice support: https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/overview
- Speech recognition: https://docs.sarvam.ai/api-reference/speech-to-text/transcribe
- Language codes: https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/how-to/specify-language-codes
- Chat: https://docs.sarvam.ai/api/token-factory/chat-completions

API authentication uses the `api-subscription-key` server-side header. No runtime calls send individual transaction rows or customer contacts. Speech sends only the code-generated receipt text. Question classification sends the question and evidence eligibility flags. Correction audio is sent only on the user's explicit recording request.
