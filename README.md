# Quantum Ready Pulse

A 21-day, one-lesson-a-day quantum computing literacy course delivered over **WhatsApp**, with **two delivery formats per lesson**: a WhatsApp text message (hook + link) and a matching **audio file** (TTS-narrated, sent as a WhatsApp voice-note media message and embedded as a player on the lesson page). Subscribers pay once via **Stripe**.

- **Signup UI:** embedded into the existing site, [quantumreadyea.org](https://quantumreadyea.org/), as a drop-in widget (`web-embed/pulse-widget`).
- **Payments:** Stripe Checkout, one-time price.
- **Delivery formats:**
  - *WhatsApp text* — daily template message with the day's hook + lesson link, sent by `services/pulse-api`'s cron job via Twilio.
  - *Audio file* — each lesson is narrated via local TTS (`content/synthesis`, Kokoro-82M + ffmpeg, same local-synthesis pattern used for Quantum Ready's audiobook pipeline) into a per-day `.m4b`, stored on Cloudflare R2 (zero egress fees), and sent as a WhatsApp media message alongside the text, plus embedded as an `<audio>` player on the static lesson page.
- **Backend:** extends Quantinnel's existing Node/TypeScript + Fastify + Postgres/Prisma service (`services/pulse-api`) rather than standing up new infra. WhatsApp delivery goes through Twilio, since WhatsApp isn't part of Quantinnel's stack today.
- **Lesson delivery:** static, zero-backend lesson pages on Cloudflare's edge network (`edge/lesson-pages`), access-gated by a small Cloudflare Worker + KV store (`edge/access-worker`) that also proxies/streams the R2-hosted audio files so a lesson link (text or audio) can't be shared past a paying subscriber's course window.
- **Team:** 2 engineers — see `docs/engineering-tasks.md` for the split.

This repo is deliberately structured as **one thing added to Quantinnel's existing platform**, not a parallel system: the only genuinely new pieces are the WhatsApp send loop (text + audio), the Stripe-to-WhatsApp handoff, the TTS synthesis pipeline, and the static lesson pages. Everything else (auth patterns, DB conventions, CI/CD shape) follows what's already running in Quantinnel.

## Repo layout

```
quantum-pulse/
├── services/pulse-api/       # Fastify + Prisma backend (extends Quantinnel's service pattern)
├── edge/access-worker/       # Cloudflare Worker: Stripe webhook -> KV token, verify-access, audio proxy/stream
├── edge/lesson-pages/        # Static, zero-dependency lesson pages w/ embedded audio player (Cloudflare Pages)
├── web-embed/pulse-widget/   # Embeddable signup/checkout widget for quantumreadyea.org
├── content/                  # lessons.json (text source of truth) + synthesis/ (TTS pipeline -> R2)
├── docs/                     # Architecture, data model, task split, deployment
├── infra/                    # Local dev infra (docker-compose Postgres)
├── scripts/                  # One-off/dev scripts (DB seed, etc.)
└── .github/workflows/        # CI + deploy pipelines
```

See `docs/architecture.md` for how the pieces connect, `docs/data-model.md` for the Prisma schema, and `docs/engineering-tasks.md` for how the 2-engineer build splits.

## Quickstart (local dev)

```bash
# 1. Backend
cd services/pulse-api
cp .env.example .env        # fill in Stripe/Twilio/DB test keys
npm install
docker compose -f ../../infra/docker-compose.yml up -d   # local Postgres
npx prisma migrate dev
npm run dev                 # Fastify on :3000

# 2. Edge worker (in a separate shell)
cd edge/access-worker
npm install
npx wrangler dev

# 3. Lesson pages
cd edge/lesson-pages
npm install
npm run build                # generates dist/day-01 ... dist/day-21 from content/lessons.json

# 4. Embeddable widget
cd web-embed/pulse-widget
npm install
npm run dev

# 5. Audio synthesis (run once per content update, not per-request)
cd content/synthesis
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python synthesize_lessons.py --upload-r2   # narrates all 21 days, uploads .m4b files to R2
```

## Status

Scaffold only — routes, schema, and worker are stubbed with the real contracts and TODOs, not yet wired to live Stripe/Twilio/Quantinnel credentials. See `docs/deployment.md` for what has to happen before this goes live (A2P/WhatsApp Business verification is the long pole — start it first).
