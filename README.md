# Boulder

Mobile social hub for bouldering friend groups — Expo (React Native) app, ASP.NET Core (.NET 10) API, PostgreSQL. The beta covers one gym: Fredrikstad Buldresenter.

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| .NET SDK | 10.x | [Download](https://dotnet.microsoft.com/download) |
| Docker Desktop | latest | Required for local Postgres and integration tests (Testcontainers) |
| Git | any | |
| GitHub CLI (`gh`) | any | `gh auth login` before working with PRs |
| Node.js LTS | 20+ | Mobile app (`apps/mobile`) |

## Local API setup (Windows)

### 1. Start the database

```sh
docker compose -f infra/docker-compose.dev.yml up -d
```

This starts a Postgres 17 container on port 5432 with:
- database: `boulder_dev`
- user/password: `boulder` / `boulder`

### 2. Apply migrations

```sh
dotnet ef database update --project api/src/Boulder.Infrastructure --startup-project api/src/Boulder.Api
```

### 3. Run the API

```sh
dotnet run --project api/src/Boulder.Api
```

The API starts on `http://localhost:5158` (or as configured). In development you can browse the API docs at `http://localhost:5158/scalar/v1`.

### 4. Health check

```sh
curl http://localhost:5158/health
```

Should return `Healthy`.

## Building and testing

```sh
# Build the solution
dotnet build api/Boulder.sln

# Run all tests (requires Docker Desktop for integration tests)
dotnet test api/Boulder.sln

# Export the OpenAPI document (requires Postgres running; run from repo root)
dotnet run --project api/src/Boulder.Api -- --export-openapi --output-path "$(pwd)/api/openapi/v1.json"
```

## Mobile app setup

From `apps/mobile`:

```sh
npm ci
npx expo start        # scan the QR code with Expo Go (phase 1 uses no custom native modules)
npm run lint
npm run typecheck
npm test
npm run api:types     # regenerate src/lib/api/schema.d.ts from api/openapi/v1.json
```

The app reads two optional variables (see `.env.example`): `EXPO_PUBLIC_API_MODE` (`mock`, `live` or a list such as `live,groups:mock`; default `mock`) and `EXPO_PUBLIC_API_URL`. A phone cannot reach `localhost` on the PC; use the PC's LAN address for live mode.

## Adding a migration

```sh
dotnet ef migrations add <Name> --project api/src/Boulder.Infrastructure --startup-project api/src/Boulder.Api
```

## Project structure

```
api/
  Boulder.sln
  src/
    Boulder.Api/           endpoints, middleware, health, OpenAPI
    Boulder.Application/   use-case handlers, interfaces
    Boulder.Domain/        entities, value objects, domain rules
    Boulder.Infrastructure/  EF Core, Npgsql, migrations
  tests/
    Boulder.UnitTests/
    Boulder.IntegrationTests/  Testcontainers Postgres
  openapi/v1.json          generated — do not edit by hand

apps/mobile/               Expo app (React Native, TypeScript)
infra/                     docker-compose files, runbooks
docs/                      SPEC.md, PLAN.md, architecture.md, ADRs
```

## Environment variables

`.env.example` documents every variable the application reads. `.env` is git-ignored and must never be committed.

For local development `ConnectionStrings__Default` is already set in `appsettings.Development.json` to match the docker-compose defaults, so no `.env` file is needed for the API. The other variables (Supabase, Cloudflare R2, etc.) are used by the production deployment and by later phases; see `.env.example` for details.
