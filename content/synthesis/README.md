# Lesson audio synthesis

Turns the 21 `articleBody` entries in `content/lessons.json` into narrated `.m4b` audio files, one per day, and (optionally) uploads them to the Cloudflare R2 bucket the access-worker streams from.

This mirrors the local-synthesis pattern already used elsewhere for Quantum Ready audio content: run the TTS model **once, locally**, not per-request — there is no synthesis-on-demand server to operate or pay for.

## Setup

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
# Synthesize all 21 days to content/audio/day-XX.m4b (local only)
python synthesize_lessons.py

# Synthesize + upload to R2 (needs CF_ACCOUNT_ID / R2 access key env vars, see root .env.example)
python synthesize_lessons.py --upload-r2

# Re-synthesize a single day after a content edit
python synthesize_lessons.py --day 5
```

## Why local + R2, not a synthesis API on request

- **Cost:** narrating 21 short lessons once is a fixed, one-time job; there's no reason to pay per-request TTS latency/cost for content that doesn't change per subscriber.
- **Consistency:** every subscriber hears the identical, QA'd audio file — no per-request generation variance.
- **R2 egress:** Cloudflare R2 has no egress fee, so serving the same ~20 files to any number of subscribers costs the same as serving them to one (see `docs/deployment.md`).

## Output naming

`content/audio/day-{NN}.m4b`, matching each lesson's `audioFile` field in `content/lessons.json` — the pulse-api Prisma schema and the send-daily-lessons job both key off that filename, so don't rename files without updating `lessons.json` too.
