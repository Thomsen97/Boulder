# Boulder: Implementation Plan

Source of truth for **what** to build: [`SPEC.md`](SPEC.md). Structure and rules: [`architecture.md`](architecture.md). Decisions: [`adr/`](adr/).

## How this plan is used

- **One phase per Claude Code session.** Start with `/implement-phase <N>`, run `/clear` between phases.
- **Branch and PR per phase.** Branch `phase/NN-short-slug`, one PR per phase, reviewed by the `pr-reviewer` subagent. **Sebastian merges** once CI is green. Claude never merges and never pushes to `main`.
- **UI first.** UI phases build screens against the mock layer (`EXPO_PUBLIC_API_MODE=mock`). The matching API phase implements the endpoints, regenerates the OpenAPI types and switches that feature to the live client. Small phases do both, UI first.
- **Done** means every "Done when" box is checked, the standard checks are green, and the PR is merged.
- **Deviations** are written under the phase's *Notes*. If a decision in SPEC.md or an ADR changes, update that file (or add a new ADR) in the same PR.
- **Standard checks** (must be green at the end of every phase; exact commands in `CLAUDE.md`): API build, API tests, mobile lint, typecheck and tests, OpenAPI/type drift check.

## Setup checklist for Sebastian

| Item | Needed before phase | Notes |
|---|---|---|
| .NET 10 SDK, Docker Desktop, Git, GitHub CLI (`gh auth login`), Claude Code | 0 | Docker is needed for local Postgres and Testcontainers |
| Public GitHub repo, secret scanning + push protection on | 0 | Settings → Code security |
| Branch protection on `main`: require PR and green CI | after 0 is merged | CI must exist first |
| Node LTS, Android Studio with emulator (or Android phone), Expo Go | 1 | Expo Go on an iPhone also works until phase 4 |
| Expo account | 4 | First development build |
| Supabase project (EU region), email OTP + Google provider | 4 | Keys go in `.env`, never in git |
| Google Cloud OAuth client IDs (Android, iOS, web) | 4 | For Google sign-in |
| Apple Developer Program (99 USD/year) | 4 for iOS testing, at the latest 23 | Needed for iOS dev builds on a real iPhone, Sign in with Apple, APNs and TestFlight |
| Cloudflare account with R2 (card required), dev bucket in EU jurisdiction | 11 | API token scoped to that bucket |
| Firebase project for FCM (Android push) | 18 | APNs key needs the Apple account |
| Oracle Cloud account (card required, EU home region), DuckDNS subdomain | 22 | Home region cannot be changed |
| Resend account (SMTP for Supabase), Sentry (optional), UptimeRobot | 22 | |
| Verified FBS data: arrow-color order, wall names, prices, coordinates | 23 (placeholders until then) | SPEC section 15 |

## Overview

| # | Phase | Tag | Depends on | Status |
|---|---|---|---|---|
| 0 | API foundation and CI | B1 | none | Done |
| 1 | Mobile foundation | B1 | 0 | In review |
| 2 | UI: onboarding, profile, settings | B1 | 1 | Not started |
| 3 | API: authentication, users, onboarding | B1 | 0 | Not started |
| 4 | Real sign-in and first development builds | B1 | 2, 3 | Not started |
| 5 | Social graph: follows, blocks, search | B1 | 4 | Not started |
| 6 | UI: groups | B1 | 1 | Not started |
| 7 | API: groups, roles, invites | B1 | 4, 6 | Not started |
| 8 | Visibility core and authorization test harness | B1 | 5, 7 | Not started |
| 9 | UI: gym, boulders, quick log | B1 | 1 | Not started |
| 10 | API: gyms, opening hours, grade scales, walls, FBS seed | B1 | 4, 9 | Not started |
| 11 | Media foundation: storage, photo pipeline, avatars | B1 | 4 | Not started |
| 12 | API: boulders and ascents | B1 | 8, 10, 11 | Not started |
| 13 | UI: composer, feeds, post detail, threads | B1 | 1 | Not started |
| 14 | Video pipeline on device | B1 | 11 | Not started |
| 15 | API: posts, audiences, publish flow, feeds, job worker | B1 | 8, 11, 12 | Not started |
| 16 | API: comments, reactions, mentions, spoiler flag | B1 | 13, 15 | Not started |
| 17 | Offline outbox | B1 | 14, 16 | Not started |
| 18 | Notifications: in-app list and push | B1 | 16 | Not started |
| 19 | Personal stats | B1 | 12 | Not started |
| 20 | Safety: reports, moderation, admin screens | B1 | 16 | Not started |
| 21 | Account deletion and data purge | B1 | 18, 20 | Not started |
| 22 | Production infrastructure and deploy | B1 | 15 | Not started |
| 23 | Beta 1 release | B1 | 17–22 | Not started |
| 24 | UI: group chat | B2 | 23 | Not started |
| 25 | API: chat, SignalR, chat push | B2 | 24 | Not started |
| 26 | Planned sessions | B2 | 25 | Not started |
| 27 | Check-in "På gymmen nå" | B2 | 25 | Not started |
| 28 | Beta 2 release | B2 | 26, 27 | Not started |

The dependency column is the minimum. UI phases (2, 6, 9, 13) can run earlier than the API work they feed.

---

## Beta 1

### Phase 0: API foundation and CI

**Goal:** A .NET 10 solution that builds, serves a health endpoint backed by local Postgres, generates an OpenAPI document and runs in CI.
**Spec:** 8.3, 8.5, 7 (observability), SEC-9, SEC-12.
**Files:** `api/**`, `infra/docker-compose.dev.yml`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `.gitignore`, `.editorconfig`, `.env.example`, `README.md`.
**Needs:** .NET 10 SDK, Docker Desktop, `gh` logged in.

Tasks:
- Solution `api/Boulder.sln` with `Boulder.Api`, `Boulder.Application`, `Boulder.Domain`, `Boulder.Infrastructure`, `Boulder.UnitTests`, `Boulder.IntegrationTests`; project references follow `architecture.md` 3.1.
- EF Core + Npgsql, snake_case naming, UUIDv7 ids, `citext` extension, first migration.
- `/health` (includes a DB check), global ProblemDetails handler, Serilog JSON console logs with request id, `TimeProvider` registered.
- OpenAPI document generation and a command that writes `api/openapi/v1.json`; Scalar UI in Development only.
- Integration test base: Testcontainers PostgreSQL + `WebApplicationFactory`.
- `infra/docker-compose.dev.yml` with Postgres 17.
- CI: build and test the API on every PR; fail if `api/openapi/v1.json` is out of date.
- Dependabot for NuGet, GitHub Actions and Docker.

Done when:
- [x] `dotnet build` and `dotnet test` are green locally and in CI
- [x] An integration test calls `/health` against Testcontainers Postgres and gets 200
- [x] `api/openapi/v1.json` is generated by a documented command, committed, and checked for drift in CI
- [x] `README.md` documents local setup on Windows (SDKs, Docker, compose, running the API)
- [x] `.env.example` lists every setting without real values; `.env` is git-ignored

After merge (Sebastian): enable branch protection on `main` (require PR and the CI check).

Notes:
- `dotnet run` changes the working directory to the project folder, so the OpenAPI export command requires an absolute output path — documented in CLAUDE.md and the CI workflow uses `$GITHUB_WORKSPACE`.
- `Microsoft.OpenApi` pinned to 2.12.0 to resolve NU1903 vulnerability in the transitively-pulled 2.0.0.
- `EFCore.NamingConventions` 10.0.1 added to `Boulder.Infrastructure` for snake_case table and column names per architecture.md 3.5. The `AddPersistence` extension centralises Npgsql options so `Program.cs` and the design-time factory cannot diverge.

---

### Phase 1: Mobile foundation

**Goal:** An Expo app with the navigation shell, i18n, theme tokens, generated API types and the mock/live switch.
**Spec:** 8.2, 8.6, 7 (language, accessibility), `architecture.md` section 4.
**Files:** `apps/mobile/**`, `.github/workflows/ci.yml` (mobile job).
**Needs:** Node LTS, Android emulator or phone with Expo Go.

Tasks:
- Expo app with TypeScript strict and Expo Router. Tabs: Hjem, Grupper, Gym, Varsler, Profil.
- `app.config.ts`: bundle identifier and Android package `no.swthomsen.boulder`, scheme `boulder`.
- i18n with i18next + expo-localization, resources in `src/i18n/nb.json`.
- Theme tokens (colors, spacing, typography) in `src/theme`.
- TanStack Query provider; API client with openapi-typescript + openapi-fetch generated from `api/openapi/v1.json`; `X-App-Version` header.
- Mock/live switch per feature via `EXPO_PUBLIC_API_MODE`, as described in `architecture.md` 4.2.
- ESLint, Prettier, Jest, React Native Testing Library.
- CI job: lint, typecheck, test, type-generation drift check.

Done when:
- [ ] The app starts in Expo Go on Android (checked on iOS, see Notes) and shows the five tabs with labels from `nb.json`
- [x] `npm run lint`, `npm run typecheck` and `npm test` are green locally and in CI
- [x] `npm run api:types` regenerates types; CI fails when the committed types differ
- [x] A test proves a sample feature works through the same interface in mock and live mode (live mocked at fetch level)
- [x] `app.config.ts` contains `no.swthomsen.boulder` and scheme `boulder`

Notes:

- Manual check pending (Sebastian): Expo Go on a device. Sebastian has an iPhone with Expo Go, so the check runs on iOS instead of Android. Steps: in `apps/mobile` run `npx expo start`, scan the QR code with the iPhone camera, and confirm the tab bar shows Hjem, Grupper, Gym, Varsler, Profil and each tab shows its Norwegian placeholder text. The Hjem tab also shows "Server: Tilkoblet" (mock mode).
- `/health` was a plain health-check endpoint and did not appear in the OpenAPI document. It is now a minimal API endpoint (`GetHealth`, text/plain 200 and 503), so the generated types contain a real path. `v1.json` was regenerated. Existing integration tests still pass.
- Expo Go is used for phase 1 because no custom native modules are needed yet. SPEC 8.2 (development builds) applies from the first phase that adds a native module.
- Peer dependency conflicts with Expo SDK 57 / TypeScript 6 / npm 12: `overrides` in `package.json` lets `openapi-typescript` (peer `typescript@^5`) use the project's TypeScript, and `react-dom` is pinned to 19.2.3 to match React. `expo install` fails under npm 12 (`--allow-scripts`), so packages were installed with `npm install` and verified with `npx expo install --check`.
- Dependencies beyond SPEC 8.2: `@expo/vector-icons` (tab icons), `expo-font` and `expo-asset` (peers of vector-icons), `react-dom` (optional peer of Expo), `expo-linking`, `expo-constants`, `react-native-screens`, `react-native-safe-area-context` (Expo Router requirements). Dev: `jest-expo`, `@testing-library/react-native`, `react-test-renderer`, `eslint-config-expo`, `prettier`, `openapi-typescript`, `@types/jest`.
- Tests sit next to the code (`*.test.ts(x)`) per architecture 6. `app.config.test.ts` and `tabs.test.tsx` are at the project root because files inside `app/` would become routes; `expo lint` covers only `src` and `app`, so those two are not linted (typecheck covers them).
- Typography tokens have no fixed `lineHeight`: at the largest iOS text size a fixed value clipped the titles (found in the manual check), so line height now follows the scaled font.
- `tsconfig.json` has `"types": ["jest"]` (TypeScript 6 no longer includes `@types/*` automatically), so Jest globals also type-check in app code. Accepted; a separate test tsconfig is a possible follow-up.
- Phase 0 was set to Done in this PR because its PR was already merged and the docs were stale (confirmed by Sebastian).
- `EXPO_PUBLIC_*` variables are documented in `apps/mobile/.env.example`, because Expo only reads `.env` from the app folder.
- `npm audit --omit=dev` reports transitive findings in packages from the Expo CLI and Metro tooling; none come from direct dependencies, and I have not traced whether any ship in the runtime bundle. Follow-up: trace them when Expo publishes a patch release.

---

### Phase 2: UI: onboarding, profile, settings (mock)

**Goal:** All identity screens work against mocks.
**Spec:** AUTH-3, AUTH-4, PROF-1 to PROF-7 (UI), LOG-6 and SPOIL-1 (settings), DEL-1 (UI only), 3.3, 3.4.

Screens: welcome/sign-in (buttons only), onboarding (username with live availability check, display name, avatar placeholder, 16+ checkbox, guidelines), own profile, other user's profile, edit profile, settings (private profile, "Del loggene mine", "Skjul beta" with three modes, notification placeholder, "Slett konto" flow), follow requests, blocked users.

Done when:
- [ ] Every screen is reachable and has loading, empty and error states
- [ ] Username validation follows AUTH-4 (unit tests)
- [ ] Component tests: profile renders correctly as own, public other, private other not followed, pending request, followed, blocked
- [ ] No user-visible string literals outside `nb.json`
- [ ] Standard checks green

Notes:

---

### Phase 3: API: authentication, users, onboarding

**Goal:** The API trusts only valid Supabase tokens and manages users and onboarding.
**Spec:** AUTH-2 to AUTH-6, PROF-1, PROF-2, PROF-7 (own profile), 12.1 `users`, SEC-2, SEC-4, SEC-5, SEC-6 (username check).

Tasks:
- JwtBearer against the Supabase JWKS: ES256 only, issuer, audience `authenticated`, 60 s skew, refetch on unknown `kid`.
- Tests use a real ES256 key pair generated in the test host and a local JWKS, so the production validation path is exercised (no auth bypass).
- Onboarding gate (`onboarding_required`) and suspension gate (`account_suspended`).
- Endpoints: `GET /me`, `POST /me/onboarding`, `PATCH /me`, `GET /usernames/{name}/availability`, `GET /users/{username}`.
- Rate limiter infrastructure; error code catalogue.
- Regenerate OpenAPI and mobile types (the app stays on mocks until phase 4).

Done when:
- [ ] Integration tests: valid token accepted; expired, wrong issuer, wrong audience, HS256-signed and unsigned tokens get 401
- [ ] Not-onboarded user gets 403 `onboarding_required`; onboarding creates the user; duplicate username (any case) gets 409
- [ ] Username rules and the 30-day rename limit are unit tested
- [ ] Suspended user gets 403 `account_suspended` on everything except `GET /me`
- [ ] Username availability check returns 429 with `Retry-After` over the limit
- [ ] OpenAPI and mobile types regenerated without drift

Notes:

---

### Phase 4: Real sign-in and first development builds

**Goal:** Real accounts on a real phone, talking to the local API.
**Spec:** AUTH-1, AUTH-5, 8.2 (builds).
**Needs:** Expo account, Supabase project, Google OAuth client IDs. Apple Developer Program for iOS (otherwise iOS is deferred).

Tasks:
- Supabase client with the LargeSecureStore pattern; email one-time code; Google sign-in; Sign in with Apple on iOS if the Apple account exists.
- Token middleware in the API client; on 401 refresh once, then sign out.
- Switch `me`, onboarding and profile features to live.
- EAS project and `development` build profile; Android development build.
- Document how the phone reaches the local API in development (LAN address or tunnel).

Done when:
- [ ] On an Android development build: sign in with email code and with Google, finish onboarding, see the own profile from the real API
- [ ] The session survives an app restart; sign-out clears it and the old token is not used again
- [ ] Sign in with Apple works on iOS, or its deferral to phase 23 is written in Notes
- [ ] `README.md` documents the setup; no keys in git

Notes:

---

### Phase 5: Social graph: follows, blocks, search (UI + API)

**Goal:** Following, private profiles, blocking and user search work end to end.
**Spec:** PROF-2 to PROF-6, SAFE-1 (effects outside groups), 5.2 rule 2, 5.6 (profile switches), 12.1 `follows` and `blocks`, SEC-6.

Done when:
- [ ] Follow public gives accepted; follow private gives pending; accept, decline, cancel and remove follower work
- [ ] Switching private to public auto-accepts pending requests
- [ ] Blocking removes follows in both directions; a blocked pair gets 404 on each other's profile, is excluded from search and cannot follow
- [ ] Integration tests for all of the above; phase 2 screens switched to live

Notes:

---

### Phase 6: UI: groups (mock)

**Goal:** All group screens work against mocks.
**Spec:** GRP-1 to GRP-11, 3.2.

Screens: group list, create group, group home (header, feed placeholder, members), member management per the permission matrix, invite link sheet (expiry, max uses, QR, short code), join preview from `boulder://invite/<token>` and manual code entry, direct invites (send, inbox), leave/transfer/delete with confirmations, per-group mute.

Done when:
- [ ] Every screen has loading, empty and error states
- [ ] Component tests: actions are shown or hidden per 3.2 for owner, admin and member
- [ ] The deep link opens the join preview (mock token)
- [ ] Standard checks green

Notes:

---

### Phase 7: API: groups, roles, invites

**Goal:** Groups with roles, invite links, direct invitations and bans.
**Spec:** GRP-1 to GRP-11, 3.2, SEC-7, 12.2.

Done when:
- [ ] Integration tests cover every action in the 3.2 matrix for owner, admin, member and non-member
- [ ] Invite tokens are stored only as hashes; expiry, max uses (including a concurrent-accept test), revocation and bans are enforced
- [ ] Leaving or being removed revokes access immediately; removal adds a ban; ownership transfer works; the sole owner leaving deletes the group; limits of 50 members and 20 groups apply
- [ ] Direct invitations work; accepting as an existing member is an idempotent success
- [ ] Group screens switched to live

Notes:

---

### Phase 8: Visibility core and authorization test harness

**Goal:** Implement SPEC section 5 once, centrally, before any content endpoint exists.
**Spec:** 5.1 to 5.7, SEC-3, section 11 (authorization matrix), `architecture.md` 3.4.

Tasks:
- Add the `posts` and `post_audiences` tables (no endpoints yet) so post rules can be tested at query level.
- Visibility component in the Application layer: profile content access, group membership, blocked pair, blocker-in-group placeholder, ascent visibility (5.4), post visibility and accessible audiences as EF expressions.
- Authorization matrix harness in `Boulder.IntegrationTests/Authorization`: seeds every viewer type from SPEC section 11 and asserts a table of expected results per endpoint.

Done when:
- [ ] Tests prove every rule and every edge-case row in SPEC 5.2 to 5.6 at query level, executed against Postgres
- [ ] The harness is used by the profile and follow endpoints from phases 3 and 5
- [ ] `architecture.md` 3.4 matches the implementation

Notes:

---

### Phase 9: UI: gym, boulders, quick log (mock)

**Goal:** Gym page, boulder browsing and creation, and quick logging against mocks.
**Spec:** GYM-2, GYM-3, GRADE-4, GRADE-5, BLD-2 to BLD-8, BLD-2a, LOG-1 to LOG-3, 5.4.

Screens: gym page (info, week hours with today highlighted, "Åpent nå", prices, contact, "Åpne i kart", arrow-color legend, walls, public feed placeholder), "Foreslå endring", boulder list with filters (wall, grade, hold color, "Vis nedskrudde"), create boulder (wall, grade, hold color, duplicate grid, photo, details), boulder page ("Rød pil · blå grep", "Hvem har toppet", media placeholder, quick-log buttons), archive, restore and wall-reset confirmations.

Done when:
- [ ] Component tests: quick-log buttons follow LOG-2 for none, attempted, sent and flash
- [ ] Grade chips show text and swatch; white has a border
- [ ] Unit test: duplicate matching follows BLD-3, including `blandet`
- [ ] Photo capture and pick work on a device (upload still mocked)
- [ ] Standard checks green

Notes:

---

### Phase 10: API: gyms, opening hours, grade scales, walls, FBS seed

**Goal:** Gym data, including correct "open now", with FBS seeded.
**Spec:** GYM-1 to GYM-4, GRADE-1 to GRADE-5, BLD-1, 12.3 (gyms, hours, prices, suggestions, walls, scales, grades). Admin editing endpoints here; admin screens in phase 20.

Done when:
- [ ] FBS seeded per GYM-4 and GRADE-5 (no V range) with placeholder walls; seed values marked [VERIFY] in code comments
- [ ] "Open now" and today's hours are correct with exceptions and across DST changes (unit tests with a fixed `TimeProvider`, Europe/Oslo)
- [ ] The grades check constraint (both V values null or both set) is enforced
- [ ] Gym suggestions: create, list (admin), resolve
- [ ] Gym screens switched to live

Notes:

---

### Phase 11: Media foundation: storage, photo pipeline, avatars

**Goal:** Secure direct uploads and downloads, used first for avatars.
**Spec:** 9.1 to 9.5 (photos), POST-4, POST-5 (photos), POST-10, SEC-8.
**Needs:** Cloudflare R2 dev bucket and scoped API token.

Tasks:
- Storage abstraction over the S3 SDK: R2 in dev/prod, MinIO (Testcontainers) in integration tests.
- Presigned PUT with signed Content-Type and Content-Length; HEAD verification on finalize; presigned GET.
- `media` table, `POST /media/uploads`, finalize, per-user storage usage and quota.
- App photo pipeline: resize to 2048 px, JPEG, EXIF removed by re-encoding, 480 px thumbnail; upload helper with progress.
- Avatar change end to end.

Done when:
- [ ] Integration tests (MinIO): wrong size or type is rejected at finalize and the object deleted; a missing object gives 409; GET URLs are only issued to viewers allowed to see the media
- [ ] Documented device check: an uploaded photo has no EXIF/GPS
- [ ] Avatar change works end to end on a device
- [ ] Exceeding the quota gives a clear error in the app

Notes:

---

### Phase 12: API: boulders and ascents

**Goal:** Shared boulders, duplicate check, archiving, merging and quick logs.
**Spec:** BLD-1 to BLD-8, BLD-2a, LOG-1 to LOG-6, 5.4, SEC-6, 12.3 (boulders, events, ascents).

Done when:
- [ ] Creating requires a ready photo owned by the caller; hold color is validated against the palette
- [ ] Duplicate query matches wall, grade and hold color (`blandet`: wall and grade)
- [ ] Archive and restore (14 days for users, always for admin), wall archive-all, events logged, concurrent archive is idempotent
- [ ] Admin merge combines ascents per BLD-5, repoints media tags, and the merged boulder returns a pointer
- [ ] Ascent transitions and the `occurredAt` window are enforced; "who topped" follows 5.4 through the visibility component, with matrix tests
- [ ] Boulder and quick-log screens switched to live

Notes:

---

### Phase 13: UI: composer, feeds, post detail, threads (mock)

**Goal:** The complete posting and reading experience against mocks.
**Spec:** POST-1, POST-2, POST-6, POST-7, FEED-1 to FEED-4, CMT-1 to CMT-5 (UI), SPOIL-3 to SPOIL-5 (UI), 5.3.

Screens: composer (up to 5 media, audience picker with "Bare meg", boulder tag and result per item, bystander checkbox, caption), home/group/profile/gym feeds, boulder media list, post card with context label, post detail with thread switcher, comments with mention autocomplete, reactions, edit post, delete post, spoiler overlay.

Done when:
- [ ] Unit tests: composer validation per POST-1, POST-2 and POST-6
- [ ] The thread switcher shows only accessible threads (mock data with several groups)
- [ ] Component tests: spoiler overlay blurs the thumbnail, never autoplays, "Vis likevel" works per item
- [ ] Feeds use FlashList, cached thumbnails, pull to refresh and pagination
- [ ] Standard checks green

Notes:

---

### Phase 14: Video pipeline on device

**Goal:** Reliable trimming and compression of videos on both platforms.
**Spec:** POST-3, POST-5 (video), 9.4 (video and metadata).
**Needs:** An Android device and, for iOS, an iPhone with a development build (Apple Developer Program).

Tasks:
- Evaluate and choose a compression library and a trimming component; record the choice in a new ADR.
- Compress to at most 1280 px, about 1.2 to 1.5 Mbit/s, at most 25 MB and 60 s; require trimming above 60 s; thumbnails.

Done when:
- [ ] ADR written for the compression and trimming libraries
- [ ] A 60 s 4K clip from each platform ends at 25 MB or less, 1280 px or less, and plays in expo-video
- [ ] A clip longer than 60 s cannot continue without trimming
- [ ] Documented check (e.g. exiftool or ffprobe) that output has no location metadata on iOS and Android, or iOS deferral written in Notes

Notes:

---

### Phase 15: API: posts, audiences, publish flow, feeds, job worker

**Goal:** Posts can be created, published, edited and read through every feed, with correct visibility.
**Spec:** POST-1 to POST-12, 5.1 to 5.7, 9.2, FEED-1 to FEED-3, OFF-6, 12.4, 12.5 (`jobs`), SEC-6, `architecture.md` 3.6.

Tasks:
- Job table and worker (first consumers: pending-post cleanup, post purge, removed-audience thread purge).
- Create pending post, presign, publish with HEAD verification; idempotent on `clientId`.
- Audience add/remove with 30-day restore; group audience requires membership; lost membership handled per OFF-6.
- Ascents upserted from media tags, upgrade only.
- Feeds: home, group, profile, gym, boulder media; cursor on (`published_at`, `id`); dedupe; context selection per FEED-2.

Done when:
- [ ] The full publish sequence is tested, including repeat with the same `clientId` and the 409 missing-object path
- [ ] Audience changes and the 30-day restore are tested
- [ ] LOG-4 upgrade-only behavior is tested
- [ ] The authorization matrix covers every post and feed endpoint for all viewer types in SPEC section 11
- [ ] Jobs are enqueued in the same transaction and retried with backoff (tests)

Notes:

---

### Phase 16: API: comments, reactions, mentions, spoiler flag

**Goal:** Per-audience threads and spoiler protection, and the posting UI goes live.
**Spec:** CMT-1 to CMT-6, SPOIL-1 to SPOIL-6, 5.3, SAFE-1 (blocked content in shared groups), SEC-6.

Done when:
- [ ] A comment in group A's thread is invisible to a member of group B only (test)
- [ ] The author loses access to the thread of a group they left
- [ ] Mentions only resolve for users with thread access
- [ ] Post authors and group admins can moderate as specified
- [ ] The spoiler flag is correct for all three modes, and a send removes it
- [ ] A blocker sees the blocked user's posts and comments in shared groups as "Skjult innhold"
- [ ] Composer, feeds and threads switched to live

Notes:

---

### Phase 17: Offline outbox

**Goal:** Posts and quick logs made without network are sent later, exactly once.
**Spec:** OFF-1 to OFF-7, LOG-5.

Done when:
- [ ] The outbox is persisted in expo-sqlite (ADR 0008) and survives the app being killed
- [ ] Unit tests: ordering, backoff, the failed state after 5 attempts, idempotency key reuse
- [ ] Manual test: in airplane mode, a post with two videos and a quick log are sent after reconnecting, with no duplicates
- [ ] Signing out with unsent items shows the warning

Notes:

---

### Phase 18: Notifications: in-app list and push

**Goal:** Users are told about what matters to them, and nothing else.
**Spec:** NOTIF-1 to NOTIF-5 (B1 types), GRP-11, 12.1 (`notifications`, `push_tokens`, `notification_preferences`).
**Needs:** Firebase project (FCM). APNs key for iOS.

Done when:
- [ ] Notifications are enqueued in the triggering transaction and sent after commit with retries; `DeviceNotRegistered` removes the token
- [ ] Access is rechecked at send time; blocked pairs are never notified; mutes and preferences are respected; reaction pushes are batched
- [ ] In-app activity list with unread badge
- [ ] A push arrives on an Android device for every B1 type

Notes:

---

### Phase 19: Personal stats

**Goal:** Grade pyramid and progression on the profile.
**Spec:** STAT-1, STAT-2, GRADE-3, 5.4.

Done when:
- [ ] The stats endpoint follows 5.4 (matrix tests)
- [ ] Hardest send and pyramid use the ordinal within the gym's scale; totals and sends per month span gyms
- [ ] Profile stats UI with empty state

Notes:

---

### Phase 20: Safety: reports, moderation, admin screens

**Goal:** Users can report, and the admin can act, all audited.
**Spec:** SAFE-2 to SAFE-5, ADM-1, ADM-2, SEC-15, GYM-3 (admin side), BLD-5 (merge UI), POST-10 (quota), 9.5.

Done when:
- [ ] Reports work for every target type; "Jeg er med i denne" hides the media immediately for everyone but the author and admins
- [ ] Admin endpoints require `AdminOnly`, and every admin action writes to `admin_audit_log` (tests)
- [ ] Admin screens: reports, gym editor, gym suggestions, walls, grade scales, boulder merge, user lookup (suspend, quota), storage overview

Notes:

---

### Phase 21: Account deletion and data purge

**Goal:** A user can leave completely.
**Spec:** DEL-1 to DEL-5, GRP-9.

Done when:
- [ ] Deletion requires a sign-in within 10 minutes and the typed username
- [ ] The Supabase auth user is deleted through the admin API
- [ ] The purge job removes everything in DEL-3 including R2 objects; comments and messages become "Slettet melding"; group ownership moves per GRP-9; the username is freed
- [ ] A test asserts no rows reference the user afterwards, except the allowed ones (audit log, nulled authors)

Notes:

---

### Phase 22: Production infrastructure and deploy

**Goal:** The API runs reliably on the Oracle VM and can be rebuilt from scratch.
**Spec:** 8.4, SEC-1, SEC-9 to SEC-14, 7 (availability, observability), 14 (runbook cases).
**Needs:** Oracle Cloud, DuckDNS, Resend, Sentry (optional), UptimeRobot, GitHub secrets.

Done when:
- [ ] A provisioning script (cloud-init + compose) creates a working VM from nothing, proven by rebuilding once
- [ ] `docker-compose.prod.yml` with API, Postgres and Caddy; HTTPS works; Postgres is not exposed; firewall allows only 22, 80, 443
- [ ] GitHub Actions builds an arm64 image to GHCR and deploys through a manually triggered workflow
- [ ] Nightly encrypted backup to R2 with 7-day retention; a restore has been tested and documented
- [ ] Supabase keep-alive cron, custom SMTP, Sentry in app and API, uptime monitor on `/health`
- [ ] Logs do not contain tokens; retention 14 days
- [ ] Runbooks in `infra/runbooks/`: rebuild VM, restore backup, resume Supabase, rotate secrets

Notes:

---

### Phase 23: Beta 1 release

**Goal:** The friend group has the app on both platforms.
**Spec:** 2 (distribution), 7 (client compatibility), 3.4, section 15 items for FBS.
**Needs:** Apple Developer Program, verified FBS data.

Done when:
- [ ] Minimum app version and the `426` "Oppdater appen" flow work
- [ ] FBS data verified and the seed updated (arrow colors, walls, prices, coordinates)
- [ ] Sign in with Apple works on iOS (if deferred earlier)
- [ ] EAS production builds are on TestFlight and Android internal distribution
- [ ] The manual release checklist in SPEC section 11 has passed on both platforms
- [ ] Community guidelines text is final

Notes:

---

## Beta 2

### Phase 24: UI: group chat (mock)

**Spec:** CHAT-1 to CHAT-5, CHAT-7.

Done when:
- [ ] Chat screen with history paging, reply, mentions, up to 4 photos, edit within 15 minutes, delete, unread badge
- [ ] Optimistic send with retry state (component tests)
- [ ] Standard checks green

Notes:

---

### Phase 25: API: chat, SignalR, chat push

**Spec:** CHAT-1 to CHAT-8, SEC-10, NOTIF-3 (chat), 12.6 (`messages`, `message_mentions`), `architecture.md` 3.9.

Done when:
- [ ] Membership is checked on hub join and on every send; leaving, removal or ban drops the connection from the group channel immediately (test)
- [ ] Dedupe on `clientId`; cursor paging; edit window; admin delete
- [ ] The `access_token` query string never appears in logs (test on the logging configuration)
- [ ] Push only to members not connected, respecting mute
- [ ] Chat UI switched to live

Notes:

---

### Phase 26: Planned sessions (UI + API)

**Spec:** SES-1 to SES-6, NOTIF-3 (sessions), 12.6 (`sessions`, `session_rsvps`).

Done when:
- [ ] Create, edit, cancel, RSVP; the session card appears in the group chat
- [ ] Reminder 60 minutes before start; an edit to less than 60 minutes sends only the change notification (tests with a fixed clock)
- [ ] Warning when outside opening hours

Notes:

---

### Phase 27: Check-in "På gymmen nå" (UI + API)

**Spec:** CHK-1 to CHK-4, 12.6 (`checkins`, `checkin_groups`).

Done when:
- [ ] One active check-in per user; expiry after 3 hours; manual check-out
- [ ] Visible only to the chosen groups; blocks respected
- [ ] Push throttled to one per user per group per 6 hours (test)

Notes:

---

### Phase 28: Beta 2 release

Done when:
- [ ] New builds on TestFlight and Android internal distribution
- [ ] The manual release checklist has passed on both platforms, including chat on a weak network

Notes:
