# Transaction and fixture contract

Required header: `transaction_id,timestamp,amount,status`. Extra columns can be ignored through explicit mapping. Required mapped columns must be distinct. CSV supports commas inside quoted fields, doubled quotes, UTF-8 BOM and CRLF. Maximum 2 MB and 10,000 data rows. Preview displays the first three rows, plus bounded validation details.

| Field          | Accepted                                                           | Rejected                                                                                      |
| -------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| transaction_id | Nonempty string up to 128 characters, preserving zero prefixes     | Missing ID, overly long ID                                                                    |
| timestamp      | `YYYY-MM-DDTHH:mm[:ss]Z` or `YYYY-MM-DDTHH:mm[:ss]±HH:mm`          | Timezone-free, slash dates, impossible calendars, rollover hours, invalid offsets             |
| amount         | Nonnegative rupee decimal, at most 8 integer digits and 2 decimals | Negative, exponential, currency symbols, grouping commas in amount, more than 2 decimals      |
| status         | `completed`, `success`, `successful` count (case insensitive)      | Unknown status rejected. Pending, failed, cancelled, canceled, refunded reported and excluded |

All windowing uses Asia/Kolkata. [12:00,14:00), [14:00,16:00), [16:00,18:00), [18:00,20:00). Day totals count every valid completed record on that local date, including outside these four chart windows. They do not claim complete business revenue. Zero-valued completed payments count and are permitted explicitly.

The historical candidate dates are earlier same-weekday dates represented by rows, coverage or exceptions within eight weeks. Eligible dates require full-window opening, complete declared coverage, no owner exclusion. Coverage is an explicit merchant statement, not inferred from row density. A known fully covered open day without rows is a real zero count; an absent coverage declaration is unknown. The median uses every eligible historical count. Three historical periods are the prototype minimum, without a significance claim.

## Reproducible synthetic shop

Reference Saturday **2026-11-14**, regular hours 12:00–20:00 IST.

| Dataset          |               Current-day records | Target 4–6 PM | Context                                                                                                                 |
| ---------------- | --------------------------------: | ------------: | ----------------------------------------------------------------------------------------------------------------------- |
| valid.csv        |                                92 |            14 | Full reference and three previous Saturdays                                                                             |
| insufficient.csv |                                92 |            14 | Only two eligible previous Saturdays; the absent third has unknown coverage                                             |
| dirty.csv        | 91 valid after conflict filtering |            14 | Identical duplicate, conflicting ID, invalid/ambiguous date, negative, missing value, unknown status, pending, refunded |
| positive.csv     |                  97 on 2026-11-21 |            19 | Merchant must confirm complete follow-up coverage and execution                                                         |
| negative.csv     |                  87 on 2026-11-21 |             9 | Same confirmation rules                                                                                                 |

`valid.csv` contains 162 rows: 92 current + 70 historical target-window payments. Current amounts are ₹220 once and ₹200 for 91 payments, totaling ₹18,420. Average ₹18,420 / 92 = ₹200.217391… (₹200.22 displayed). Current windows have 32,24,14,22 payments. Historical target counts on 2026-11-07, 2026-10-31, 2026-10-24 are 21,23,26; median 23. No contact fields exist.

`lib/fixtures.ts` generates the files. Displayed results always use the same parser and analytics as uploads. For follow-up, counts are relative to the saved original and baseline; 19−14=5 and 19−23=−4. Negative: 9−14=−5 and 9−23=−14. No estimate of the offer's causal effect is produced.

## Economics

All monetary inputs are integer paise internally. The owner enters item names in three languages, price, variable cost per redemption, additional cost, discount, available quantity, redemption cap, discount budget, contribution floor and reference volume. One redemption represents one listed combo/unit.

Contribution = price − discount − variable cost − additional cost. Existing-offer promotion has no new discount. Maximum discount exposure = discount × redemption cap. Require availability, contribution ≥ floor, cap ≤ available quantity, cap ≥ 1, and exposure ≤ budget. The investigation option has no consumer offer.

Scenario threshold = ceil(reference volume × reference contribution / discounted contribution), only when discounted contribution > 0. Fixed costs, unchanged unit mix, unchanged price/cost assumptions and uncertain demand are disclosed. This is an arithmetic threshold, not predicted demand, ROI or guaranteed profitability.
