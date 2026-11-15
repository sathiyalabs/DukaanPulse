# DukaanPulse complete project

Team Trio - Paytm Build for India AI Hackathon, Chennai - Track 1: Merchant Growth AI.

Read README.md for installation, database migration, development and testing commands.
Run `npm ci`, then follow the local setup steps in README.md.

Included: complete TypeScript source, dependency lockfile, server routes, database schema and migrations, tests, multilingual fonts, five synthetic datasets and context files, schema documentation, provider configuration instructions, original proposal, verification notes, mentor and jury scripts, reset instructions, and the five-slide finals deck in PDF and editable PowerPoint.

Credentials, dependency directories, generated builds and live merchant data are excluded. Configure your own local server secret using `node scripts/configure-sarvam.mjs`. The hosted secret is not included in this export.

## Current deployment status

Private deployed app: https://dukaanpulse-trio.sathiyalabs2606.chatgpt.site
Requires the owner's ChatGPT sign-in. Deployment succeeded with the Sarvam server secret configured. The key authenticated successfully against Sarvam's model-list endpoint. Live speech and transcription tests have not been completed. The reported balance of 100 credits, billing unit, expiry and service eligibility have not been independently verified.

README and verification notes describe the original build-time test state, before the hosted secret was configured. 35 automated tests, strict TypeScript and production build passed. The full merchant journey was exercised in the managed browser preview. No production Paytm integration is claimed.

The original proposal is preserved unchanged in docs/Original_Stage1_Proposal.pdf. Revised presentation materials are separate under finals/.
