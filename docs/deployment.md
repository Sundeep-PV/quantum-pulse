# Deployment

## What has to happen before this goes live

1. **Twilio WhatsApp Business + Meta verification** — the long pole (1-3 week approval lead time). Start this on day one, in parallel with everything else, not after the code is ready.
2. **Stripe** — live secret key, webhook endpoint registered (`/pulse/stripe-webhook`) with `checkout.session.completed` subscribed, and the real one-time price object created.
3. **Cloudflare** — R2 bucket + KV namespace provisioned, `access-worker` deployed and bound to a subdomain of `quantumreadyea.org` (DNS change needed from whoever owns that zone), Pages project created for the lesson pages.
4. **Quantinnel platform coordination** — confirm the DB target, the actual CI/CD deploy target (`.github/workflows/deploy-api.yml` is a placeholder), and whether `send-daily-lessons` runs via an existing scheduler or needs its own. See the open decisions list in `docs/architecture.md`.
5. **Content** — replace every `PLACEHOLDER` `articleBody` in `content/lessons.json` with final copy, then re-run `content/synthesis/synthesize_lessons.py --upload-r2` and `scripts/seed.ts`.
6. **Widget embed** — hand the built `web-embed/pulse-widget/dist/pulse-widget.js` + embed snippet to whoever maintains quantumreadyea.org's templates.

## Environments

Recommend the standard three: **local** (docker-compose Postgres, Wrangler dev, Vite dev server — see root README quickstart), **staging** (Quantinnel's staging DB schema + Stripe/Twilio test keys, a Pages preview deploy), **production**. Wire secrets per environment via GitHub Actions environment protection rules once the Quantinnel deploy pipeline specifics are confirmed.

## Monitoring (minimum viable, cheapest useful setup)

Have `send-daily-lessons` post a one-line daily summary to Slack (or email) after each hourly run: sent today, failed, new signups since last run, opt-outs, completions, split by channel (text vs. audio). This is a TODO in `services/pulse-api/src/jobs/send-daily-lessons.ts` — catches a broken template, a stalled cron, or an R2/audio delivery regression within hours rather than days.

Query `PulseMessageLog` filtered by `status = 'failed'` grouped by `channel` for a quick view of whether text or audio delivery is the one having problems.

## Rollback / retry behavior

A failed text send leaves `currentDay` unchanged so the subscriber is retried on the next hourly tick (capped, recommend 3 attempts across 3 hours per the pattern already validated in "Quantum in 10", then flag for manual review). A failed *audio* send does not block progression — the text message and the lesson page (which also embeds an audio player) already deliver the lesson content, so audio is treated as a secondary format that can be retried without holding up the subscriber's day count.
