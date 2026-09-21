# Data model

Full schema: `services/pulse-api/prisma/schema.prisma`. Summary below.

## `PulseSubscriber`

One row per paying subscriber. Nothing is written here until the Stripe webhook fires (`pending_payment` is implicit — an abandoned checkout never creates a row).

| Column | Type | Notes |
|---|---|---|
| `phone` | text, unique | E.164, e.g. `+14155551234` |
| `timezone` | text | IANA name — drives the hourly send window |
| `status` | enum | `active` / `completed` / `opted_out` / `failed` |
| `currentDay` | int | 0 after payment, increments as lessons send, gates access at the edge |
| `startDate` | datetime | subscriber's local "Day 1" date |
| `stripeCheckoutSessionId` | text, unique | idempotency key for webhook upserts |

## `PulseLesson`

Seeded from `content/lessons.json` via `scripts/seed.ts` — one row per day, 1 through 21. `audioFile`/`audioUrl` point at the R2 object the narrated version lives in (see `content/synthesis`).

## `PulseMessageLog`

One row **per delivery attempt, per channel** (`whatsapp_text` or `whatsapp_audio`). A single "day N send" produces up to two rows, so a failed audio send is visible and retryable independently of the text send. This is the table to query for delivery monitoring (see `docs/deployment.md`).

## `PulseQuizResult`

Optional; one row per subscriber per day they answer the lesson's quiz (`quizJson` on `PulseLesson`). Not required for launch — the course functions without quiz tracking, this just enables a completion/engagement view later.

## Why this shape

Mirrors the subscriber/message-log split already validated in the "Quantum in 10" plan in this project, extended with a `channel` column on message logs specifically because Pulse sends two formats per day instead of one. Table names are prefixed `Pulse` so this can share a Postgres instance/schema with Quantinnel's own tables without naming collisions, per the "backend reuses Quantinnel" decision in `docs/architecture.md`.
