# Architecture Decision Records

One file per decision. Format: context, decision, alternatives, consequences. A new decision that replaces an old one gets a new number, and the old ADR is marked *Superseded by ADR-XXXX*.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-backend-aspnet-core-postgres.md) | Backend: ASP.NET Core (.NET 10) + PostgreSQL | Accepted |
| [0002](0002-auth-supabase-jwks.md) | Authentication: Supabase Auth only, API validates JWT via JWKS | Accepted |
| [0003](0003-media-r2-presigned.md) | Media: on-device processing, Cloudflare R2 with presigned URLs | Accepted |
| [0004](0004-hosting-oracle-always-free.md) | Hosting: Oracle Always Free VM with Docker Compose | Accepted |
| [0005](0005-central-visibility.md) | Authorization: central visibility component, 404 policy, matrix tests | Accepted |
| [0006](0006-minimal-apis-modular-monolith.md) | API style: Minimal APIs in a modular monolith, OpenAPI-generated TS types | Accepted |
| [0007](0007-postgres-job-queue.md) | Background jobs: Postgres job table with a hosted worker | Accepted |
| [0008](0008-mobile-data-layer.md) | Mobile data: TanStack Query, mock layer for UI-first, expo-sqlite outbox | Accepted |
| [0009](0009-dev-workflow-pr-review.md) | Workflow: branch per phase, PR, AI review subagent, human merge | Accepted |

## Pending

| Topic | Decided in |
|---|---|
| Video compression library and trimming component | Phase 14 |
