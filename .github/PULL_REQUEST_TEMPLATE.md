## What changed

<!-- One or two sentences. Link the task in docs/engineering-tasks.md if this closes one. -->

## Lane

- [ ] Backend, Messaging & Audio Pipeline (`services/pulse-api`, `content/synthesis`)
- [ ] Edge, Widget & Deployment (`edge/`, `web-embed/`)
- [ ] Docs / shared

## How to verify

<!-- Commands to run, or steps to click through. Assume the reviewer has the repo cloned but hasn't run this code yet. -->

## Checklist

- [ ] `npm test --workspace <package>` passes
- [ ] No `.env` values or secrets committed
- [ ] If this touched `prisma/schema.prisma`, a migration is included (`npx prisma migrate dev --name ...`)
- [ ] Updated the relevant doc in `docs/` if this changes architecture, data model, or task ownership
