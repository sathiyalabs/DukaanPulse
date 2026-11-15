# Verification record

Date: 15 November 2026. All tested shop activity is synthetic. Automated fixtures and provider responses use no real customer records and no billable API requests.

## Automated checks

35 automated tests pass using Node's test runner through the TypeScript loader. Strict TypeScript checking passes. The deployable Worker build passes. See `tests/domain.test.ts` and `tests/provider.test.ts` for executable cases.

Coverage includes exact fixture totals/window counts/median; integer paise and string IDs; duplicate and conflicting IDs; excluded and invalid statuses; ambiguous/impossible dates; quoted CSV and mapping; size/row limits; zero baseline; closed/open-zero/unknown distinctions; early closure; coverage gaps; historical exclusion and insufficient history; availability, stock, budget, contribution and additional-cost limits; scenario threshold; stale version/approval and duplicate experiment prevention; material-change invalidation; stage confirmation; positive, negative and inconclusive follow-up; saved average-value goal; all three languages' numeric/term parity; poster HTML terms and draft label; typed/voice-interpretation ambiguity; structured-output grounding; cache identity, cache replay and concurrent single-flight; missing credentials, rate caps, provider failure, no retry and reset-cache isolation.

Provider orchestration tests use injected mock transport and in-memory storage. They do not prove live endpoint entitlement, pronunciation, billing, regional reachability or hosted D1 concurrency under load.

## Browser checks actually performed

Desktop: cloud Chromium, approximately 1348 × 926 viewport. Phone CSS viewport: the actual app inside a 390 × 844 iframe test harness, not a separate mockup. Phone hardware and mobile browser engines were not tested.

| Check | Observed result |
|---|---|
| Load generated records | ₹18,420, 92, ₹200.22; windows 32/24/14/22; 14 vs 23 receipt |
| Upload actual valid CSV | Mapping and preview visible, 162 validated records |
| Coverage reset on upload | Advice withdrawn with “Coverage unknown”, no fabricated zero |
| Confirm four synthetic dates and save | 14 vs 23 comparison restored with a new revision |
| Type closing-time correction | Confirmation readback showed 17:00 on 2026-11-14 |
| Apply early closure | Complete-window comparison invalid, offer advice withdrawn |
| Restore 20:00 | New revision, eligible comparison restored |
| Set ₹15 discount | −₹3 contribution, exposure ₹300 versus ₹100 budget, approval disabled |
| Restore ₹5 | ₹7 contribution, ₹100 maximum discount exposure |
| Tamil approval | Exact ₹35, 20 redemptions, date/time/expiry readback preserved |
| Prepare Tamil poster | Actual HTML downloaded with embedded Tamil and Devanagari fonts; stage became Prepared |
| Confirm actual run | Explicit checkbox allowed Ran only after Prepared |
| Refresh | Current records, revision and saved experiment persisted; language restored |
| Actual follow-up CSV upload | 97 valid rows, target 19; review persisted +5 original / −4 baseline, non-causal caveat |
| Missing-key receipt request | Labelled rule-based explanation; offered device-voice fallback without claiming Sarvam |
| Hindi at phone width | Numbers and receipt visible; no horizontal clipping in inspected pulse |
| Tamil desktop | Navigation, form labels, economics and saved terms rendered without missing glyphs |

Screenshots in `docs/screenshots` are actual browser captures. Live Sarvam audio and microphone transcription were not performed, because no key is configured. Matching device-voice availability was not verified. A small authorised live integration set is described in PROVIDERS.md. Real Paytm API integration and customer delivery are absent.

## Scope and remaining operational checks

A browser walkthrough is not a cross-browser, accessibility or security certification. Server-side command validation, optimistic versioning and client locks are implemented; database contention/load testing remains outstanding. The dialog uses the native focus trap/Escape behaviour and restores focus. Keyboard focus, labels, contrast styling and reduced-motion CSS are implemented, but assistive-technology and full keyboard audits remain to be performed. Core responsive states were inspected, not every possible translated error and screen width.

The hosted publication result is recorded separately in the delivery summary. Local D1 and hosted D1 are separate, and the first hosted visit starts with an empty workspace. No merchant adoption, retention improvement, revenue lift or prediction-quality claim follows from these checks.
