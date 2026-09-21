# Contributing

Full onboarding lives in `docs/DEVELOPER_GUIDE.md` — read that first. This file is the quick-reference version.

## Workflow

1. Branch off `main`: `<lane>/<short-description>` (e.g. `backend/stripe-webhook-idempotency`, `edge/audio-range-requests`).
2. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).
3. Open a PR against `main` using the template in `.github/PULL_REQUEST_TEMPLATE.md` — small PRs preferred, even across your own lane's boundary.
4. CI (`.github/workflows/ci.yml`) must pass: lint, type-check, tests for whichever package(s) you touched.
5. Get a review — with a two-person team, review each other's work even outside your own lane; it's the fastest way to learn the other half of the system.

## Before you push

- `npm test --workspace <package>` for whatever you changed.
- No secrets or `.env` files — check `git status` before committing.
- If you touched `services/pulse-api/prisma/schema.prisma`, make sure a migration is included and committed (`npx prisma migrate dev --name ...`).
- If you changed architecture, data model, or who owns what, update the matching file in `docs/` in the same PR — stale docs are worse than no docs.

## Questions

See `docs/DEVELOPER_GUIDE.md` §10 ("Where to get unstuck").
