# Boulder: Architecture

How the code is organized and which rules it follows. The product requirements live in [`SPEC.md`](SPEC.md); the reasons behind the big choices live in [`adr/`](adr/). When the code and this file disagree, fix one of them in the same PR.

## 1. System overview

```
Expo app ──HTTPS REST (+ SignalR in B2)──▶ Caddy ──▶ ASP.NET Core API ──▶ PostgreSQL
   │                                                    │
   ├── Supabase Auth (sign-in, tokens)                  ├── Supabase JWKS (token validation)
   └── Cloudflare R2 (presigned PUT/GET) ◀──────────────┼── R2 (presign, HEAD, delete)
                                                        └── Expo Push ──▶ APNs / FCM
```

- The API owns all domain data. Supabase is used only for authentication.
- Media bytes go directly between the app and R2; the API only signs URLs and verifies objects.
- Production: one Oracle VM running Docker Compose (Caddy, API, Postgres). See SPEC 8.4.

## 2. Repository layout

```
/apps/mobile/                  Expo app (section 4)
/api/
  Boulder.sln
  openapi/v1.json              generated, committed, drift-checked in CI
  src/Boulder.Api/
  src/Boulder.Application/
  src/Boulder.Domain/
  src/Boulder.Infrastructure/
  tests/Boulder.UnitTests/
  tests/Boulder.IntegrationTests/
/infra/                        compose files, Caddyfile, provisioning, backup scripts, runbooks/
/docs/                         SPEC.md, PLAN.md, architecture.md, adr/
/.claude/                      settings.json, skills/, agents/
/.github/                      workflows/, pull_request_template.md, dependabot.yml
```

## 3. Backend

### 3.1 Layers and dependency rule

| Project | Contains | May reference |
|---|---|---|
| `Boulder.Domain` | Entities, value objects, enums, pure domain rules (ascent transitions, invite use rules, merge rules) | nothing |
| `Boulder.Application` | Use-case handlers, the visibility component, interfaces for infrastructure (`IObjectStorage`, `IPushSender`, `IAuthAdmin`, `IJobQueue`), DTOs, validation | Domain |
| `Boulder.Infrastructure` | EF Core `DbContext`, configurations, migrations, R2/S3 storage, Expo Push client, Supabase admin client, job worker | Application, Domain |
| `Boulder.Api` | Minimal API endpoint groups, authentication, rate limiting, ProblemDetails, OpenAPI, SignalR hubs (B2), composition root | Application, Infrastructure (composition only) |

Handlers are plain classes, one per use case (for example `CreatePostHandler`), registered in DI. No mediator library.

### 3.2 Feature folders

Each feature has the same name in every layer: `Users`, `Social` (follows, blocks), `Groups`, `Gyms`, `Boulders`, `Posts`, `Threads` (comments, reactions), `Media`, `Notifications`, `Moderation`, `Admin`, `Chat` (B2), `Sessions` (B2), `Checkins` (B2).

```
Boulder.Api/Features/Groups/GroupEndpoints.cs
Boulder.Application/Groups/CreateGroupHandler.cs
Boulder.Application/Groups/GroupDtos.cs
Boulder.Domain/Groups/Group.cs
Boulder.Infrastructure/Persistence/Configurations/GroupConfiguration.cs
Boulder.IntegrationTests/Groups/GroupEndpointsTests.cs
```

### 3.3 Request pipeline

1. Caddy terminates TLS (HSTS) and forwards to the API.
2. Exception handler → ProblemDetails with a `code` (catalogue in `Boulder.Api/Errors/ErrorCodes.cs`).
3. Request logging with scrubbing (no `access_token` query values, no bodies).
4. Minimum app version check (`X-App-Version`) → `426`.
5. Authentication (JwtBearer, Supabase JWKS, ES256 only).
6. Account gate: onboarding (`onboarding_required`) and suspension (`account_suspended`).
7. Rate limiter (policies named after SEC-6 rows).
8. Endpoint → request validation → handler.

### 3.4 Authorization and visibility

SPEC section 5 is implemented once, in `Boulder.Application/Visibility/`.

- `IVisibility` exposes query building blocks, for example:
  - `IQueryable<Post> VisiblePosts(Guid viewerId)`
  - `IQueryable<PostAudience> AccessibleAudiences(Guid viewerId, Guid postId)`
  - `Task<ProfileAccess> GetProfileAccess(Guid viewerId, Guid userId)` (none / header only / full)
  - `IQueryable<Ascent> VisibleAscents(Guid viewerId)`
  - `Task<BlockState> GetBlockState(Guid viewerId, Guid otherId)`
- The rules are EF expressions, so filtering happens in SQL and works with pagination.
- **Rule:** handlers never read content tables (`posts`, `post_audiences`, `media`, `comments`, `reactions`, `ascents`, `messages`) for a viewer without going through `IVisibility`. The reviewer checks this in every PR.
- **Rule:** a resource the viewer may not see returns `404`, never `403`. `403` is only for "you can see it but may not do this" (for example a member trying an admin action).
- Blocked content inside shared groups is returned as a placeholder DTO (`hidden: true`, no body, no media), decided by `IVisibility`, not by the endpoint.
- Media URLs are presigned only after the media item has passed the same checks.
- The authorization matrix harness (`Boulder.IntegrationTests/Authorization/`) seeds all viewer types from SPEC section 11. Every content endpoint has a matrix test.

### 3.5 Persistence

- PostgreSQL through EF Core with Npgsql; snake_case names; UUIDv7 ids generated in the application (`Guid.CreateVersion7()`).
- All timestamps are `timestamptz`; the current time comes from `TimeProvider` (tests use a fake).
- Enums are stored as text with check constraints.
- Soft deletion uses `deleted_at` columns where SPEC requires it. There are no global query filters for visibility; visibility is always explicit (3.4).
- Migrations live in `Boulder.Infrastructure/Persistence/Migrations` and are applied by a separate command at deploy, not on API startup.
- Cursor pagination uses (`published_at`, `id`) or `id` (UUIDv7) and returns `{ items, nextCursor }`.
- Counters that can race (invite use count) are updated with conditional `UPDATE` statements.

### 3.6 Background jobs

- Table `jobs` (SPEC 12.5). `IJobQueue.Enqueue(...)` adds a row through the same `DbContext`, so the job commits or rolls back with the change that caused it (outbox pattern).
- A hosted `BackgroundService` polls every few seconds, claims rows with `FOR UPDATE SKIP LOCKED`, runs the handler registered for the job type, and retries with exponential backoff up to `max_attempts`.
- Job handlers are idempotent.
- Job types: `notification.send`, `post.purge_pending`, `post.purge`, `audience.purge_thread`, `media.delete_objects`, `account.purge`, `storage.compute_usage`, `backup.check` (optional), and in B2 `session.remind`, `checkin.expire`.

### 3.7 Media flow

```
App                       API                              R2
 │ POST /posts ──────────▶ validate, create pending,
 │                         presign PUT (type+length) ─────▶
 │ ◀───────── upload URLs
 │ PUT file ─────────────────────────────────────────────▶ stored
 │ POST /posts/{id}/publish ▶ HEAD each object ───────────▶
 │                         size/type ok → ready, publish,
 │                         upsert ascents, enqueue jobs
 │ ◀───────── post DTO (presigned GET URLs, 60 min)
```

Object keys and limits: SPEC 9.1 and 9.4. Integration tests use MinIO through Testcontainers.

### 3.8 Notifications

1. A handler enqueues `notification.send` jobs in its transaction.
2. The job re-checks that the recipient can still see the subject, respects preferences, mutes and blocks, writes a `notifications` row and sends an Expo push when enabled.
3. Push receipts are checked later; `DeviceNotRegistered` deletes the token.

### 3.9 Realtime (B2)

- One SignalR hub (`/hubs/groups`). A connection joins SignalR groups named `group:{id}` only after a membership check.
- Every hub method re-checks membership.
- When membership ends, the handler removes that user's connections from the SignalR group through `IHubContext` and a connection registry.
- Single instance, no backplane.

### 3.10 Configuration and secrets

- `appsettings.json` holds non-secret defaults. Secrets come from environment variables (`.env` in compose, GitHub Actions secrets in CI).
- `.env.example` documents every variable. `.env` files are git-ignored and denied to Claude Code in `.claude/settings.json`.
- Environments: `Development` (local), `Test` (integration tests), `Production` (Oracle VM).

## 4. Mobile app

### 4.1 Folder layout

```
apps/mobile/
  app/                         Expo Router routes only (thin: read params, render a feature screen)
  src/features/<feature>/
    screens/                   screen components
    components/                feature components
    hooks.ts                   TanStack Query hooks
    api.ts                     interface + live implementation
    mock.ts                    mock implementation with realistic data
    types.ts                   view models if they differ from API types
  src/lib/api/                 openapi-fetch client, generated types, middleware (auth, app version, errors)
  src/lib/auth/                Supabase client, LargeSecureStore, session hooks
  src/lib/media/               photo and video processing, upload helper
  src/lib/outbox/              persistent outbox (expo-sqlite)
  src/i18n/                    i18next setup, nb.json
  src/theme/                   tokens and shared UI primitives
```

### 4.2 Data access and the mock layer

- Each feature's `api.ts` exports an interface (for example `GroupsApi`) and a live implementation that uses the generated client. `mock.ts` exports an implementation of the same interface.
- `src/lib/api/mode.ts` picks mock or live per feature from `EXPO_PUBLIC_API_MODE` (`mock`, `live`, or a comma list such as `live,groups:mock`), so a feature can switch to live as soon as its API phase is done.
- Screens only use hooks; hooks only use the feature interface. Nothing else knows whether data is mocked.
- Query keys follow `[feature, entity, id?, params?]`. Mutations invalidate the keys they affect; a quick log also invalidates the boulder's media queries so spoiler blur updates (SPOIL-5).

### 4.3 Authentication

- Supabase client with the LargeSecureStore pattern.
- API middleware adds the access token; on `401` it refreshes once, then signs out.
- `403 onboarding_required` routes to onboarding; `403 account_suspended` shows a blocking screen; `426` shows "Oppdater appen".

### 4.4 Media and outbox

- Photos and videos are processed on the device before upload (SPEC 9.4). Video libraries are chosen in phase 14.
- The outbox stores post drafts, copied media files and quick logs with client UUIDs. It is processed on reconnect, on foreground and on manual retry (SPEC 6.17).

### 4.5 UI rules

- No user-visible string literals in components; every string comes from `nb.json`.
- Every screen handles loading, empty, error and offline states.
- Lists use FlashList; images use expo-image with `cacheKey` set to the media id.
- Interactive elements have accessibility labels; grade chips always show text next to the color.

## 5. Environments and local development

| | API | Database | Storage | Auth |
|---|---|---|---|---|
| Local | `dotnet run` on the host | Postgres in `infra/docker-compose.dev.yml` | R2 dev bucket | Supabase project |
| Integration tests | `WebApplicationFactory` | Testcontainers Postgres | Testcontainers MinIO | Test ES256 key + local JWKS |
| Production | Container on Oracle VM | Postgres container on the VM | R2 production bucket | Same Supabase project |

The phone reaches the local API through the PC's LAN address or a tunnel (documented in `README.md` in phase 4).

## 6. Testing layout

- `Boulder.UnitTests`: domain rules and pure logic.
- `Boulder.IntegrationTests`: endpoint tests per feature, plus `Authorization/` for the matrix harness.
- `apps/mobile`: Jest + React Native Testing Library next to the code (`*.test.ts(x)`).
- Every "Done when" item in PLAN.md maps to at least one automated test or a documented manual check.
