# Boulder

Mobile social hub for bouldering friend groups — Expo (React Native) app, ASP.NET Core (.NET 10) API, PostgreSQL. The beta covers one gym: Fredrikstad Buldresenter.

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| .NET SDK | 10.x | [Download](https://dotnet.microsoft.com/download) |
| Docker Desktop | latest | Required for local Postgres and integration tests (Testcontainers) |
| Git | any | |
| GitHub CLI (`gh`) | any | `gh auth login` before working with PRs |
| Node.js LTS | 20+ | Required from phase 1 for the mobile app |

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

# Export the OpenAPI document (requires Postgres running)
dotnet run --project api/src/Boulder.Api -- --export-openapi --output-path api/openapi/v1.json
```

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

Copy `.env.example` to `.env` and fill in the values. `.env` is git-ignored and must never be committed.

See `.env.example` for all supported variables. The only required one for local development is `ConnectionStrings__Default`, which is already set in `appsettings.Development.json` to match the docker-compose defaults.
