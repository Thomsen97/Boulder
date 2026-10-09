# Boulder

Mobile social hub for bouldering friend groups: Expo (React Native, TypeScript) app, ASP.NET Core (.NET 10) API, PostgreSQL. The beta covers one gym, Fredrikstad Buldresenter.

## Read first

- `docs/SPEC.md`: what to build, with requirement IDs. Source of truth.
- `docs/PLAN.md`: phases, "Done when" checks, status.
- `docs/architecture.md`: structure and rules.
- `docs/adr/`: decisions and their reasons.

If the code and the docs disagree, or the SPEC is ambiguous, stop and ask. Do not silently pick one.

## Commands

Established in phases 0 and 1. Update this section in the same PR when a command changes.

API (from the repo root, Docker Desktop running):
- `docker compose -f infra/docker-compose.dev.yml up -d`: local Postgres
- `dotnet build api/Boulder.sln`
- `dotnet test api/Boulder.sln`
- `dotnet run --project api/src/Boulder.Api`
- `dotnet ef migrations add <Name> --project api/src/Boulder.Infrastructure --startup-project api/src/Boulder.Api`
- OpenAPI export: `dotnet run --project api/src/Boulder.Api -- --export-openapi --output-path "$(pwd)/api/openapi/v1.json"` (requires Postgres running; run from repo root)

Mobile (in `apps/mobile`):
- `npm run lint`, `npm run typecheck`, `npm test`
- `npm run api:types`: regenerate types from `api/openapi/v1.json`
- `npx expo start`

**Standard checks** (all must pass before a PR): API build, API tests, mobile lint, typecheck and tests, and `npm run api:types` leaves no git diff.

## Rules that are never broken

1. **Privacy.** Every read of user content goes through `IVisibility` (`architecture.md` 3.4). Inaccessible resources return 404. Every content endpoint has authorization matrix tests.
2. **Secrets.** Never read, print or commit secrets. `.env` files are off limits; add new variables to `.env.example` with placeholder values.
3. **Git.** Work on `phase/NN-slug`. Never push to `main`, never merge a PR, never force-push.
4. **Contract.** Every API change regenerates `api/openapi/v1.json` and the mobile types in the same PR.
5. **Language.** UI text is Norwegian bokmål and lives only in `apps/mobile/src/i18n/nb.json`. Code, comments, commits and docs are English.
6. **UI first.** Screens are built against the mock layer; the API phase switches the feature to live.
7. **Tests.** Every "Done when" item has a test or a documented manual check. Never skip, weaken or delete a test to make it pass.
8. **Record deviations** in the same PR: PLAN.md notes, a SPEC.md edit, or a new ADR.
9. **Dependencies.** Prefer those named in SPEC section 8. Explain every new dependency in the PR.

## Conventions

- Ids are UUIDv7; timestamps are `timestamptz`; use the injected `TimeProvider` for the current time.
- Errors are ProblemDetails with a `code` from `Boulder.Api/Errors/ErrorCodes.cs`.
- Commits follow Conventional Commits, e.g. `feat(groups): add invite links`. Keep them small.
- Branch `phase/NN-slug`, e.g. `phase/07-groups-api`. One PR per phase, using `.github/pull_request_template.md`.

## Workflow

- `/implement-phase N` runs a phase: plan, wait for OK, implement, checks, PR, review.
- The `pr-reviewer` subagent reviews a PR. Give it only the PR number and phase, never a summary of your own work.
- Sebastian merges.

## Environment

- Development machine is Windows (Git Bash). Use forward slashes in scripts. iOS builds only through EAS.
- Bundle identifier and Android package: `no.swthomsen.boulder`. Deep link scheme: `boulder`.
