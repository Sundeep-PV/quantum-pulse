# Engineering task split — 2 engineers

Two coherent, mostly-parallel lanes, following the same "each engineer owns a slice end-to-end" shape used for the related "Quantum in 10" and book-to-course builds already in this project, adapted for Pulse's two delivery formats.

## Engineer 1 — Backend, Messaging & Audio Pipeline

Owns `services/pulse-api/`, `content/synthesis/`, `scripts/seed.ts`.

1. Confirm with Quantinnel's platform team: DB target (schema vs. new instance), actual K8s/CI deploy target, and whether an existing scheduler can run `send-daily-lessons` hourly. Unblock `docs/architecture.md`'s open decisions — **do this first**, in parallel with #2.
2. Twilio WhatsApp Business + Meta sender verification. Long external lead time (1-3 weeks) — start immediately, don't sequence it after everything else.
3. Wire `checkout.ts` / `stripe-webhook.ts` to real Stripe test keys; verify the idempotent-upsert path with Stripe's CLI (`stripe trigger checkout.session.completed`).
4. Wire `whatsapp-inbound.ts` and `send-daily-lessons.ts` to real Twilio credentials; test STOP/HELP handling and the hourly send window logic across at least 2 timezones.
5. Stand up `content/synthesis`: install Kokoro-82M locally, replace the placeholder `articleBody` text in `content/lessons.json` with final copy (Engineer 1 + content owner), narrate all 21 days, upload to R2.
6. Add the Slack/email daily-summary post to `send-daily-lessons.ts` (sent/failed/opt-outs/completions) — cheapest useful monitoring per `docs/deployment.md`.

## Engineer 2 — Edge, Widget & Deployment

Owns `edge/access-worker/`, `edge/lesson-pages/`, `web-embed/pulse-widget/`, `.github/workflows/deploy-edge.yml`.

1. Provision the Cloudflare R2 bucket + KV namespace; fill in real IDs in `edge/access-worker/wrangler.toml`.
2. Wire `access-worker`'s `PULSE_API_BASE_URL` to Engineer 1's deployed `pulse-api`, and set `PULSE_API_SERVICE_TOKEN` as a Wrangler secret once that auth pattern is confirmed with Quantinnel's platform team.
3. Deploy `edge/lesson-pages` to Cloudflare Pages; confirm the worker route (`pulse.quantumreadyea.org` or similar subdomain) and DNS with whoever owns the `quantumreadyea.org` zone.
4. Build `web-embed/pulse-widget`, get the `<script>` + mount `<div>` snippet to whoever maintains quantumreadyea.org's templates, and confirm where the built `pulse-widget.js` gets hosted (CDN/asset path).
5. Test the full audio path end-to-end: signed link from a real WhatsApp message → lesson page → verify-access → range-streamed audio playback on both iOS and Android WhatsApp.
6. Own `deploy-edge.yml`'s Cloudflare secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) in GitHub Actions.

## Shared / converging work

- **Content lock:** the real 21-day curriculum (replacing the placeholder text in `content/lessons.json`) blocks both the audio synthesis pipeline (Engineer 1) and final lesson-page copy review (Engineer 2) — agree this early, same reasoning as the manifest-format dependency flagged in the book-to-course plan.
- **End-to-end pilot:** once both lanes are live, run a small pilot cohort (5-10 numbers) through a full signup → Day 0 → Day 1 → ... cycle before public launch, checking both delivery formats land correctly across timezones.
- **Launch checklist:** WhatsApp Business verification, Stripe live keys, R2/KV production bindings, and DNS all need to be confirmed working together — not just individually — before flipping to production traffic.
