# Demo guide and scripts

The proposal is preserved unchanged as `Original_Stage1_Proposal.pdf`. The finals deck and this script describe the implemented prototype. Every shop and payment example below is synthetic, with fixed reference date **14 November 2026**. Never describe a mock or fallback as a live Sarvam call.

## 60-second mentor demo

**0–10 seconds:** “A tea-shop owner sees lower evening collections but still has to choose what to try. DukaanPulse turns a payment pattern into a decision the owner can inspect.” Load the synthetic shop or start from the prepared uploaded dataset.

**10–23 seconds:** Open the receipt. “Fourteen payments versus a median of twenty-three on the same earlier weekdays. The exact dates, coverage and minimum sample are visible.”

**23–35 seconds:** Type `close 5 pm`, interpret and confirm. “If the shop closed early, the comparison becomes invalid. The app withdraws offer advice.” Restore `close 8 pm`.

**35–48 seconds:** Compare the discount. “A forty-rupee combo with twenty-eight-rupee variable cost contributes seven rupees after a five-rupee discount. A fifteen-rupee discount loses three and is blocked.” Show Tamil terms. Say clearly if speech is pending setup.

**48–60 seconds:** Show the prepared poster and reviewed result. “The owner approves exact terms and confirms it ran. Nineteen later payments are five above the original and four below the historical median. That records an outcome, without claiming the offer caused it.”

## Three-minute jury demonstration

**0:00–0:25, shopkeeper and upload**

“Imagine the owner of a neighbourhood tea-and-snacks shop. Checking collections is easy. Choosing a small, sensible next step is harder. DukaanPulse is a multilingual merchant growth partner. This shop and every payment in this demonstration are synthetic. We upload records, preview the columns, inspect exclusions, and confirm the shop's hours and coverage.”

For a timed demo, preselect `valid.csv` and have coverage confirmed before the presentation starts. Show the upload screen rather than spending the entire slot choosing a file.

**0:25–0:55, receipt and evidence**

“These records produce ₹18,420 from 92 completed payments. The 4–6 PM window contains fourteen. We compare earlier Saturdays in exactly that window: twenty-one, twenty-three and twenty-six, giving a median of twenty-three. The app shows the dates, sample and configurable threshold. Three periods are a prototype minimum, not statistical proof.”

**0:55–1:20, judge changes context**

“Suppose the owner says, ‘We closed at five.’ We interpret that correction, show what we heard, and require confirmation. Now the complete window is invalid, and offer advice withdraws. Unknown upload coverage also blocks the comparison. Restoring the actual hours creates another receipt revision. Earlier approval or speech cannot silently survive that change.”

Type `close 5 pm`, confirm, then `close 8 pm`, confirm.

**1:20–1:55, economics and language**

“The owner can investigate without an offer, promote an available existing offer, or enter a discount. This combo costs forty rupees and has twenty-eight rupees variable cost. A five-rupee discount leaves seven rupees contribution before fixed costs. A fifteen-rupee discount produces minus three and cannot pass a nonnegative floor. Stock, redemption cap and maximum discount exposure also constrain the choice. These are feasibility checks, not predicted demand. Switching to Tamil or Hindi keeps the same figures and terms.”

Set ₹15, save and select the discount to show the block, then restore ₹5. Request speech only if configured. Otherwise state: “The server-side Sarvam integration is implemented and mocked tests pass, but no API credential is configured here. This text is the labelled rule-based fallback.”

**1:55–2:25, approval and real material**

“Only the owner can approve. The app reads back the exact item, thirty-five-rupee price, twenty-redemption limit, validity and expiry. We prepare a downloadable local-language counter poster. That does not send messages, execute payments or imply the experiment ran. The owner separately confirms execution. Saved terms and history survive refresh.”

Check the approval box, approve, prepare, open the downloaded HTML if time permits, and confirm ran. A pre-reviewed history entry is a permitted rehearsal fallback, clearly described as earlier synthetic activity.

**2:25–3:00, outcome and Paytm value**

“The follow-up file has nineteen target-window payments: five above fourteen, and four below twenty-three. The app preserves negative and inconclusive outcomes too. It cannot prove causation. For Paytm, the hypothesis is a useful workflow after collections, bringing owners back to understand, try and review. We propose measuring comprehension, completed experiments and return-to-review behaviour in a small opt-in pilot. No Paytm production connection, traction or revenue lift is claimed.”

## Rehearsal and reset

1. Export the receipt/history before reset if any synthetic history should be retained.
2. Desktop: Settings & provider → Reset demo → explicit confirmation. Mobile: open the settings icon beside the language selector, then Reset demo. Do not clear production account data during a jury demo.
3. Click Load synthetic shop for the fastest repeatable path. It loads 162 actual records and the labelled context. Alternatively upload the CSV and confirm four dates manually.
4. Reference date 2026-11-14, test date 2026-11-21, review 2026-11-22, regular hours 12:00–20:00.
5. Set offer price 40, variable cost 28, discount 5, additional cost 0, quantity 40, cap 20, budget 100, floor 0, reference volume 14. Owner statements are labelled context.
6. Keep `valid.csv`, `positive.csv`, `negative.csv` and their context companions downloaded locally. No contact information exists in them.
7. If credit account or network access is unavailable, use the built-in evidence explanations. Label device speech as device speech. Do not play pre-recorded audio and imply it was generated live.
8. To show a negative result without overwriting history, create a fresh current receipt revision with a recorded context change, approve another synthetic experiment, prepare, confirm ran and use `negative.csv`. Reviews are immutable once saved.

## Judge challenges to invite

- Close at 17:00, then reopen. Check advice and revision history.
- Remove current coverage, or exclude a historical day with a reason. Check abstention.
- Set stock unavailable. Eligible offers disappear.
- Set ₹15 discount, ₹200 cost, insufficient budget or cap above quantity. Check the block.
- Change the goal. Check saved measurement definition.
- Switch all three languages after approval. Terms must remain unchanged.
- Double-click approval, refresh, and inspect history.
- Supply negative or incomplete follow-up. Preserve the result and limits.
