# Developer Guide

Welcome to Quantum Ready Pulse. This guide is the "day one" doc — read this before `docs/architecture.md` (the system design) or `docs/engineering-tasks.md` (who's building what). If you only read one doc before writing code, read this one.

## 1. What we're building, in one paragraph

A 21-day quantum-computing course, one lesson a day, delivered over WhatsApp — as both a text message (hook + link) and a narrated audio file. Someone signs up and pays through a widget embedded on quantumreadyea.org, Stripe confirms payment, and from then on the entire experience lives on WhatsApp: no app to install, no login. The backend is a new service added to Quantinnel's existing infrastructure, not a separate system.

## 2. Prerequisites

Install before your first day:

| Tool | Version | Check with |
|---|---|---|
| Node.js | 20.x | `node -v` |
| npm | bundled with Node 20 | `npm -v` |
| Docker | any recent | `docker -v` |
| Python | 3.10+ (only needed for `content/synthesis`) | `python3 -V` |
| Git | any recent | `git -v` |

You'll also want, but don't need on day one:
- A [Cloudflare](https://dash.cloudflare.com) account (free tier) with `wrangler` CLI access — Engineer 2's lane.
- Stripe and Twilio **test-mode** API keys — Engineer 1's lane. Ask Sundeep for these rather than creating your own test accounts, so everyone's testing against the same sandbox data.

## 3. Repo tour

```
quantum-pulse/
├── services/pulse-api/       Fastify + Prisma backend — checkout, webhooks, WhatsApp send job
├── edge/access-worker/       Cloudflare Worker — gates lesson text + audio to paying subscribers
├── edge/lesson-pages/        Static HTML lesson pages, generated from content/lessons.json
├── web-embed/pulse-widget/   The signup form embedded on quantumreadyea.org
├── content/                  lessons.json (curriculum) + synthesis/ (text-to-speech pipeline)
├── docs/                     You are here. architecture.md, data-model.md, deployment.md, engineering-tasks.md
├── infra/                    Local Postgres for dev (docker-compose.yml)
└── scripts/                  seed.ts — loads content/lessons.json into the database
```

Five packages, one npm workspace (`package.json` at the repo root). Each package has its own `package.json`, but `npm install` at the root installs all of them.

## 4. First-time setup (do this once)

```bash
git clone https://github.com/Sundeep-PV/quantum-pulse.git
cd quantum-pulse
npm install                                      # installs all 4 workspace packages

cp services/pulse-api/.env.example services/pulse-api/.env
# fill in services/pulse-api/.env with the test-mode Stripe/Twilio keys you were given

docker compose -f infra/docker-compose.yml up -d  # starts local Postgres on :5432
cd services/pulse-api
npx prisma migrate dev                            # creates tables
npx tsx ../../scripts/seed.ts                      # loads the 21 lessons into the DB
cd ../..
```

Verify it worked:

```bash
npm run dev:api          # starts Fastify on :3000
curl localhost:3000/health   # should return {"ok":true,"service":"pulse-api"}
```

## 5. Day-to-day commands

| I want to... | Run |
|---|---|
| Start the backend | `npm run dev:api` |
| Start the Cloudflare Worker locally | `npm run dev:worker` (needs `npx wrangler login` once, first time) |
| Rebuild the 21 static lesson pages | `npm run build:lessons` |
| Preview the signup widget standalone | `npm run dev:widget` |
| Run the backend's test suite | `npm test --workspace services/pulse-api` |
| Manually trigger the daily-send job (don't run against real subscribers without asking) | `npm run job:send-daily-lessons --workspace services/pulse-api` |
| Re-narrate lesson audio after a content edit | see `content/synthesis/README.md` |

## 6. How the pieces talk to each other (short version)

1. Someone fills out the widget on quantumreadyea.org → `POST /pulse/checkout-session` on `pulse-api` → redirected to Stripe.
2. Stripe calls `POST /pulse/stripe-webhook` on payment → a `PulseSubscriber` row is created → a WhatsApp confirmation goes out.
3. Every hour, `send-daily-lessons` checks who's due for their next lesson *in their own timezone* and sends both a WhatsApp text and a WhatsApp audio message.
4. Tapping the link opens a static page (`edge/lesson-pages`) that asks the Cloudflare Worker "is this phone number allowed to see this day?" before showing the audio player.

Full diagram and rationale: `docs/architecture.md`.

## 7. Conventions

- **TypeScript strict mode** is on everywhere (`tsconfig.json` in each package) — don't turn it off to silence an error; fix the type.
- **Branch naming:** `<lane>/<short-description>`, e.g. `backend/stripe-webhook-idempotency`, `edge/audio-range-requests`.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) style (`feat:`, `fix:`, `docs:`, `chore:`) — matches Quantinnel's existing convention, see `group1-implementation-playbook` if you have access to it.
- **PRs:** open small, review each other's PRs even across lanes (you'll learn the other half of the system faster that way) — use `.github/PULL_REQUEST_TEMPLATE.md`, it's short on purpose.
- **Don't commit `.env` files** — they're gitignored; `.env.example` in each package lists what's needed.
- **Prisma schema changes:** edit `services/pulse-api/prisma/schema.prisma`, then `npx prisma migrate dev --name <what_changed>` — never hand-edit a migration file.

## 8. Ramping up on TypeScript + Fastify

*(for Deekshitha, and anyone else coming from Python/FastAPI)*

The shape will feel familiar — route handlers, request/response objects, middleware, an ORM — the syntax and a few concepts are what's new:

| FastAPI / SQLAlchemy concept | Fastify / Prisma equivalent | Where to see it in this repo |
|---|---|---|
| `@app.post("/route")` decorator | `app.post("/route", handler)` registration | `services/pulse-api/src/routes/checkout.ts` |
| Pydantic request models | TypeScript interfaces on the route's generic (`app.post<{ Body: X }>`) | same file |
| SQLAlchemy models | Prisma schema (`schema.prisma`) — declarative, generates a typed client | `services/pulse-api/prisma/schema.prisma` |
| Alembic migrations | `npx prisma migrate dev` | §7 above |
| `pytest` | `vitest` | `services/pulse-api/test/health.test.ts` |
| `venv` / `pip install` | `npm install` (reads `package.json`) | — |
| `uvicorn app:app --reload` | `npm run dev` (uses `tsx watch`) | — |

Suggested first hour: read `services/pulse-api/src/app.ts` top to bottom, then `src/routes/checkout.ts` — it's the shortest complete route and touches config, an external API call (Stripe), and error handling. Official docs worth bookmarking: [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) (skim, don't read cover to cover), [Fastify docs](https://fastify.dev/docs/latest/), [Prisma docs](https://www.prisma.io/docs).

## 9. Ramping up on Cloudflare Workers + React

*(for Sree Karnika, and anyone else without prior web/edge-runtime experience)*

A Cloudflare Worker is the closest thing in web infrastructure to the edge-deployment constraints you've already worked with (MobileNetV2 on a Pi): small, fast, no persistent memory between requests, and you explicitly provision what storage it can touch (KV, R2) rather than assuming a full filesystem/database is there. The mental model:

- **No server to keep running.** A Worker is a function that wakes up per request and disappears. There's no process to restart, no server to SSH into — deploy replaces the previous version instantly.
- **KV** (`QUANTUM_AUTH_KV` in this repo) is a small, fast, eventually-consistent key-value cache — think of it like a lightweight Redis you can't run complex queries against.
- **R2** is Cloudflare's S3-compatible object storage — this repo stores the narrated `.m4b` audio files there.
- Read `edge/access-worker/src/worker.ts` top to bottom — it's under 130 lines and touches both bindings plus a `fetch()` call out to `pulse-api`.

For the widget (`web-embed/pulse-widget`): it's a small React app, but note it builds to a single embeddable script (`vite.config.ts`'s `lib` mode), not a normal React app — `src/embed.ts` is the real entry point, `src/main.tsx` is only a local dev preview. Official docs: [Cloudflare Workers docs](https://developers.cloudflare.com/workers/), [Workers KV](https://developers.cloudflare.com/kv/), [R2](https://developers.cloudflare.com/r2/), [React docs](https://react.dev/learn) (the "Describing the UI" and "Managing State" sections cover everything used here — this widget doesn't need routing, global state, or anything advanced).

Suggested first hour: `npx wrangler dev` in `edge/access-worker`, hit `http://localhost:8787/verify-access?phone=+15555550100&day=1` with curl, and read the response against the code in `worker.ts` line by line.

## 10. Where to get unstuck

- **Architecture questions** ("why does X call Y") → `docs/architecture.md` has the diagram and the reasoning behind each decision.
- **"What's my task list"** → `docs/engineering-tasks.md`.
- **Data model questions** → `docs/data-model.md`.
- **Deploy/launch questions** → `docs/deployment.md`.
- **Still stuck** → open a draft PR early and ask for a review even if it's not done; don't sit on a blocker solo for more than half a day given the tight, two-person team.
