# Boulder

Mobile social hub for bouldering friend groups — Expo (React Native) app, ASP.NET Core (.NET 10) API, PostgreSQL. The beta covers one gym: Fredrikstad Buldresenter.

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| .NET SDK | 10.x | [Download](https://dotnet.microsoft.com/download) |
| Docker Desktop | latest | Required for local Postgres and integration tests (Testcontainers) |
| Git | any | |
| GitHub CLI (`gh`) | any | `gh auth login` before working with PRs |
| Node.js LTS | 22+ | Mobile app (`apps/mobile`); CI uses 24 |

## Local API setup (Windows)

### 1. Start the database

```sh
docker compose -f infra/docker-compose.dev.yml up -d
```

This starts a Postgres 18 container on port 5433 (5432 is often taken by a Postgres installed on the PC) with:
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

The app reads two optional variables (copy `apps/mobile/.env.example` to `apps/mobile/.env`; Expo only reads `.env` from that folder): `EXPO_PUBLIC_API_MODE` (`mock`, `live` or a list such as `live,groups:mock`; default `mock`) and `EXPO_PUBLIC_API_URL`. A phone cannot reach `localhost` on the PC; use the PC's LAN address for live mode.

## Real sign-in on a phone (development build)

Phase 4 connects the app to Supabase Auth and to the local API. Expo Go cannot be used for this; you need a development build (Android, built by EAS in the cloud).

### 1. Supabase project (authentication only)

Create a project in an EU region. Then:
- Authentication, Sign In / Providers: enable **Email** and **Google**; keep **Allow anonymous sign-ins** off. Under Email set **Email OTP Length** to **6** (the app only accepts 6 digits).
- Authentication, Emails (Templates): Supabase sends a link unless the template contains the code. In both the **Magic link** and the **Confirm signup** template replace `{{ .ConfirmationURL }}` with `{{ .Token }}` (for example "Din kode er: {{ .Token }}"). Without this the email contains a link and sign-in with a code cannot be finished (AUTH-1: 6 digits, no magic links). Supabase only lets you edit the templates after you set up **custom SMTP** (Authentication, Emails, SMTP Settings): with Resend use host `smtp.resend.com`, port `465`, username `resend` and an API key as the password. Without your own verified domain Resend only delivers to your own account address, which is enough for testing; friends need a verified domain.
- Authentication, URL Configuration: add `boulder://**` to the redirect URLs.
- Settings, JWT Signing Keys: the current key must be asymmetric (ECC P-256). The API only accepts ES256.
- Google: in Google Cloud Console create an OAuth consent screen (External, Testing; add every tester as a test user) and a **Web application** OAuth client whose authorized redirect URI is the callback URL shown on Supabase's Google provider page (`https://<project-ref>.supabase.co/auth/v1/callback`). Put its Client ID and secret into the Supabase Google provider. The app uses the system browser for Google sign-in, so no Android client ID is needed yet.
- Sign in with Apple (iOS) needs a paid Apple Developer Program membership and is deferred to phase 23. Live mode does not show the Apple button.

Give the API the project settings with the `dotnet user-secrets` commands in [Environment variables](#environment-variables).

### 2. Let the phone reach the API

`localhost` on the phone is the phone itself. With the phone on the same Wi-Fi as the PC:

1. Find the PC's LAN address (`ipconfig`, the IPv4 address of the Wi-Fi adapter), for example `192.168.1.10`.
2. Start the API on all interfaces: `dotnet run --project api/src/Boulder.Api --urls http://0.0.0.0:5158`.
3. Allow the port once in an administrator PowerShell: `New-NetFirewallRule -DisplayName "Boulder API (dev)" -Direction Inbound -Protocol TCP -LocalPort 5158 -Action Allow -Profile Private`. Remove it with `Remove-NetFirewallRule -DisplayName "Boulder API (dev)"` when you are done.
4. Check from the phone's browser: `http://192.168.1.10:5158/health` answers `Healthy`.

If the PC and phone are not on the same network, use a tunnel instead (for example `cloudflared tunnel --url http://localhost:5158`) and use its HTTPS address as the API URL.

### 3. Build and install the development build

From `apps/mobile` (the EAS CLI runs through `npx`, nothing to install globally):

```sh
npx eas-cli login
npx eas-cli init                      # creates the EAS project and prints its id; add it to app.config.ts as extra.eas.projectId
npx eas-cli env:create --environment development --name EXPO_PUBLIC_API_MODE --value live --visibility plaintext
npx eas-cli env:create --environment development --name EXPO_PUBLIC_API_URL --value http://192.168.1.10:5158 --visibility plaintext
npx eas-cli env:create --environment development --name EXPO_PUBLIC_SUPABASE_URL --value https://<project-ref>.supabase.co --visibility plaintext
npx eas-cli env:create --environment development --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value <publishable key> --visibility plaintext
npx eas-cli build --profile development --platform android
```

`EXPO_PUBLIC_API_MODE=live` makes every feature live; a list such as `live,social:mock` keeps single features on mocks. `profile` needs `auth` to be live too (without a signed-in session every call is answered 401), so do not set `auth:mock` together with `profile:live`.

`EXPO_PUBLIC_` values are bundled into the app, so only the public values go here: the Supabase URL and the **publishable** key, never the service role key. The values live in your Expo account, not in git. When the LAN address changes, update `EXPO_PUBLIC_API_URL` (`npx eas-cli env:update`) and rebuild, or run Metro with a local `apps/mobile/.env` (copy `.env.example`) and start `npx expo start --dev-client`: the dev client then reads `.env` from the Metro server and no rebuild is needed.

The `development` profile is a debug build, which Android allows to use plain HTTP, so the app can reach `http://<PC IP>:5158`. A release build would need HTTPS (a tunnel). Local builds (`npx expo run:android`) are debug builds too and work the same way.

Install the APK from the link EAS prints (open it on the phone), then start Metro on the PC with `npx expo start --dev-client` and open the app.

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

For local development `ConnectionStrings__Default` is already set in `appsettings.Development.json` to match the docker-compose defaults, so no `.env` file is needed for the API. The API does **not** read `.env` itself: `dotnet run` takes its settings from `appsettings*.json`, environment variables and (in Development) .NET user secrets. `appsettings.Development.json` holds placeholders for `Supabase:JwksUrl` and `Supabase:Issuer`: the API starts and exports OpenAPI with them, but accepts no real token. To accept tokens from your Supabase project, set the real values once as user secrets (stored outside the repository):

```sh
dotnet user-secrets set "Supabase:JwksUrl" "https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json" --project api/src/Boulder.Api
dotnet user-secrets set "Supabase:Issuer" "https://<project-ref>.supabase.co/auth/v1" --project api/src/Boulder.Api
```

Outside Development the API refuses to start without these two settings; there they come from environment variables (`Supabase__JwksUrl`, `Supabase__Issuer`, see `.env.example`). The other variables (Cloudflare R2, etc.) are used by the production deployment and by later phases; see `.env.example` for details.
