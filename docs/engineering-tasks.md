# Engineering task split — 2 engineers

Two coherent, mostly-parallel lanes, following the same "each engineer owns a slice end-to-end" shape used for the related "Quantum in 10" and book-to-course builds already in this project, adapted for Pulse's two delivery formats.

## Assignments

| Engineer | Contact | Lane | Why this pairing |
|---|---|---|---|
| **Pamaiahgari Deekshitha** | deekshithapamaiahgari@gmail.com | Engineer 1 — Backend, Messaging & Audio Pipeline | Her strongest work is exactly this shape: a FastAPI + SQLAlchemy backend with a *versioned* schema and a diffing engine (QA Traceability API), and a second project wiring the Claude API into a FastAPI backend end-to-end (NL-to-SQL assistant). `services/pulse-api` is the same kind of work — an API layer over Postgres with external API integrations (Stripe, Twilio) — just in Fastify/TypeScript instead of FastAPI/Python. `content/synthesis` (the Kokoro TTS pipeline) is plain Python, directly in her strongest language, and her Claude/Groq LLM-API integration experience transfers straight to that pipeline's content-processing steps. |
| **J Sree Karnika** | karnikajanapala@gmail.com | Engineer 2 — Edge, Widget & Deployment | Her standout project is edge deployment under real constraints — a MobileNetV2 classifier deliberately built for resource-constrained, edge-device environments (Raspberry Pi), which is the same *category* of thinking `edge/access-worker` needs (a small, fast, constrained runtime — a Cloudflare Worker instead of a Pi, but the same "what can and can't run here" discipline). Her OCR/CV pipelines also show comfort gluing several small services together (OpenCV → Tesseract → TrOCR), similar to wiring the Worker, R2, Pages, and the widget together. Power BI experience is a direct fit for the monitoring dashboard TODO in `docs/deployment.md`. |

**A gap worth naming, not glossing over:** both candidates are strong Python/ML engineers; neither resume shows prior TypeScript, Node, React, or Cloudflare Workers experience. This repo's stack (Fastify, Prisma, React, Workers) was fixed by an earlier decision — reusing Quantinnel's existing Node/TS backend rather than introducing a second stack — so that choice isn't being revisited here. But it means **week 1 is genuinely a ramp-up week for both engineers**, not just a formality. `docs/DEVELOPER_GUIDE.md` has a TypeScript-for-Python-developers primer and curated links for exactly this gap. Budget for it in the timeline rather than assuming day-one productivity on the TS portions; both engineers' Python skills stay fully productive immediately on `content/synthesis` and any future Python tooling.

## Engineer 1 (Deekshitha) — Backend, Messaging & Audio Pipeline

Owns `services/pulse-api/`, `content/synthesis/`, `scripts/seed.ts`.

1. Read `docs/DEVELOPER_GUIDE.md` §"Ramping up on TypeScript + Fastify" before touching `services/pulse-api` — the route/service/repository shape maps closely to FastAPI + SQLAlchemy, but the syntax and tooling (npm, tsx, Prisma migrations vs. Alembic) are new.
2. Confirm with Quantinnel's platform team: DB target (schema vs. new instance), actual K8s/CI deploy target, and whether an existing scheduler can run `send-daily-lessons` hourly. Unblock `docs/architecture.md`'s open decisions — **do this first**, in parallel with #3.
3. Twilio WhatsApp Business + Meta sender verification. Long external lead time (1-3 weeks) — start immediately, don't sequence it after everything else.
4. Wire `checkout.ts` / `stripe-webhook.ts` to real Stripe test keys; verify the idempotent-upsert path with Stripe's CLI (`stripe trigger checkout.session.completed`) — this is the same "detect changed vs. unchanged vs. new" idempotency instinct as her QA Traceability API's diffing logic, just applied to webhook delivery instead of document versions.
5. Wire `whatsapp-inbound.ts` and `send-daily-lessons.ts` to real Twilio credentials; test STOP/HELP handling and the hourly send window logic across at least 2 timezones.
6. Stand up `content/synthesis`: install Kokoro-82M locally, replace the placeholder `articleBody` text in `content/lessons.json` with final copy (Engineer 1 + content owner), narrate all 21 days, upload to R2.
7. Add the Slack/email daily-summary post to `send-daily-lessons.ts` (sent/failed/opt-outs/completions) — cheapest useful monitoring per `docs/deployment.md`.

## Engineer 2 (Sree Karnika) — Edge, Widget & Deployment

Owns `edge/access-worker/`, `edge/lesson-pages/`, `web-embed/pulse-widget/`, `.github/workflows/deploy-edge.yml`.

1. Read `docs/DEVELOPER_GUIDE.md` §"Ramping up on Cloudflare Workers + React" first — Workers' request/response model and KV/R2 bindings are a genuinely different runtime than anything in her project list, closer conceptually to her edge-device deployment thinking than to a typical web backend.
2. Provision the Cloudflare R2 bucket + KV namespace; fill in real IDs in `edge/access-worker/wrangler.toml`.
3. Wire `access-worker`'s `PULSE_API_BASE_URL` to Engineer 1's deployed `pulse-api`, and set `PULSE_API_SERVICE_TOKEN` as a Wrangler secret once that auth pattern is confirmed with Quantinnel's platform team.
4. Deploy `edge/lesson-pages` to Cloudflare Pages; confirm the worker route (`pulse.quantumreadyea.org` or similar subdomain) and DNS with whoever owns the `quantumreadyea.org` zone.
5. Build `web-embed/pulse-widget`, get the `<script>` + mount `<div>` snippet to whoever maintains quantumreadyea.org's templates, and confirm where the built `pulse-widget.js` gets hosted (CDN/asset path).
6. Test the full audio path end-to-end: signed link from a real WhatsApp message → lesson page → verify-access → range-streamed audio playback on both iOS and Android WhatsApp — the same "does this actually hold up under real device constraints" testing discipline as her edge-AI project's deployment considerations.
7. Own `deploy-edge.yml`'s Cloudflare secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) in GitHub Actions.
8. Stretch, once the core path works: a simple Power BI (or equivalent) view over `PulseMessageLog` for delivery-rate/opt-out visibility — directly her strongest tool, and something the repo doesn't currently scaffold.

## Shared / converging work

- **Content lock:** the real 21-day curriculum (replacing the placeholder text in `content/lessons.json`) blocks both the audio synthesis pipeline (Deekshitha) and final lesson-page copy review (Sree Karnika) — agree this early, same reasoning as the manifest-format dependency flagged in the book-to-course plan.
- **End-to-end pilot:** once both lanes are live, run a small pilot cohort (5-10 numbers) through a full signup → Day 0 → Day 1 → ... cycle before public launch, checking both delivery formats land correctly across timezones.
- **Launch checklist:** WhatsApp Business verification, Stripe live keys, R2/KV production bindings, and DNS all need to be confirmed working together — not just individually — before flipping to production traffic.
- **Pairing suggestion:** given the shared TS ramp-up gap, a short daily sync (even 15 min) in week 1 to compare notes on TypeScript/npm/tooling friction will save both of them time independently hitting the same beginner issues.
