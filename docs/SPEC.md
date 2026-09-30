# Boulder: Product and Technical Specification

| | |
|---|---|
| Status | Draft v0.2 (v0.2: V ranges made optional, FBS has no official V mapping) |
| Date | 2026-09-30 |
| Owner | Sebastian Thomsen |
| Source | Requirements interview in Cowork, 2026-09-24/25 (decisions summarized in section 17) |
| Working name | "Boulder" (final app name is an open question) |

This file is the source of truth for **what** is built. `docs/PLAN.md` (phases), `docs/architecture.md` and `docs/adr/` are written next and must stay consistent with it. If implementation deviates, update this file or add an ADR in the same commit.

## 0. Conventions

- **MUST / SHOULD / MAY** as in RFC 2119.
- Requirement IDs (`POST-4`, `SEC-7`, ...) are referenced from PLAN.md, commits and tests.
- Scope tags: **B1** = Beta 1, **B2** = Beta 2, **Later** = after beta (see section 2).
- UI copy is Norwegian (bokmål) and shown in quotes, e.g. "Skrudd ned". Everything else (code, API, docs, commits) is English.
- **[VERIFY]** marks an assumption that must be confirmed before or during implementation.

---

## 1. Summary

Boulder is a mobile social hub for bouldering friend groups. Members share attempts and sends as photos and videos, log which boulders they have tried and topped, talk in comments and group chat, and plan gym sessions together. A post can be shared to one or more groups and/or to the user's own profile. Each gym has a page with practical info (opening hours, prices, address) and public content from that gym. The beta covers a single gym: **Fredrikstad Buldresenter (FBS)**.

### 1.1 Goals

- **G1** A friend group can use the app as its main place to share bouldering progress and plan sessions.
- **G2** Predictable privacy: a user can always tell who can see a given post, comment or log.
- **G3** Support different grading systems (color circuits, V scale, Font scale). Progress is always shown in each gym's own scale; comparison across gyms is only possible where a V mapping exists.
- **G4** Portfolio-quality backend: own ASP.NET Core API for the core domain, a real authorization model, automated tests and CI. Managed services are used where they remove heavy lifting (authentication, object storage, push delivery).
- **G5** 0 NOK/month in running costs during beta (the Apple Developer Program fee is accepted separately).

### 1.2 Non-goals for the beta

- More than one gym in the UI, gym discovery via Google Maps.
- Direct messages, public gym discussion threads, time polls, recurring sessions.
- Leaderboards, badges or other gamification beyond personal stats.
- Web client, rope climbing, outdoor crags, monetization.
- Automatic face blurring.
- Reading content offline.

### 1.3 Beta success criteria

- The friend group uses the app weekly for at least 4 consecutive weeks.
- Zero privacy leaks; the authorization test matrix (section 11) covers every endpoint that returns user content.
- Running cost stays at 0 NOK/month.

---

## 2. Release plan and scope

| Capability | B1 | B2 | Later |
|---|:-:|:-:|:-:|
| Sign-in (Apple, Google, email code), onboarding, profile | ✓ | | |
| Follow, private profiles | ✓ | | |
| Groups, roles, invite links/QR, direct invites | ✓ | | |
| Gym page for FBS (info + public posts), gym info suggestions | ✓ | | |
| Grade scales, walls, boulders (create, dedupe, archive, merge) | ✓ | | |
| Quick log (ascents) | ✓ | | |
| Posts with photos/videos, multiple audiences, per-audience comments and reactions | ✓ | | |
| Beta spoiler protection | ✓ | | |
| Personal stats (grade pyramid, progression) | ✓ | | |
| Offline outbox for posts and quick logs | ✓ | | |
| In-app + push notifications for posts, comments, reactions, mentions, follows, invites | ✓ | | |
| Block, report, in-app admin screens | ✓ | | |
| Account deletion | ✓ | | |
| Group chat (realtime) | | ✓ | |
| Planned sessions with RSVP and reminders | | ✓ | |
| Check-in "På gymmen nå" | | ✓ | |
| Notifications for chat, sessions and check-ins | | ✓ | |
| Direct messages, gym discussion threads, time polls, recurring sessions | | | ✓ |
| Gym discovery via Google Maps/Places, multiple gyms, gym staff role | | | ✓ |
| Privacy policy, terms, data export, store listings (required for public launch) | | | ✓ |
| Face blurring, group leaderboards, personal grade opinion ("føltes som V4") | | | maybe |

**Distribution.** Closed beta for the friend group, which uses both iPhone and Android. iOS through TestFlight (needs the Apple Developer Program, 99 USD/year). Android through EAS internal distribution (APK link, free) or Google Play internal testing (25 USD one-time, optional). Public store release is planned together with multi-gym support and Google Maps.

---

## 3. Users, roles and policies

### 3.1 Roles

- **User**: any registered account, minimum age 16.
- **Group roles**: `owner` (exactly one per group), `admin` (zero or more), `member`.
- **App admin**: global role for moderation, gym data, grade scales and boulder merges. Assigned only through database seed/migration, never through the API.
- **Gym staff**: Later.

### 3.2 Group permission matrix

| Action | Owner | Admin | Member |
|---|:-:|:-:|:-:|
| Post, comment, react, chat, create sessions, check in | ✓ | ✓ | ✓ |
| Edit group name, description, avatar | ✓ | ✓ | |
| Create and revoke invite links, direct-invite by username | ✓ | ✓ | |
| Remove a member (and ban from rejoining) | ✓ | ✓ (members only) | |
| Remove an admin, promote/demote admins | ✓ | | |
| Remove any post from the group, delete any comment in the group's threads, delete any chat message | ✓ | ✓ | |
| Transfer ownership, delete group | ✓ | | |
| Leave group | after transfer | ✓ | ✓ |

### 3.3 Age

- Minimum age is 16. Onboarding requires the checkbox "Jeg er 16 år eller eldre". Date of birth is **not** stored (data minimization).
- A report with reason "Under 16 år" lets an app admin suspend or delete the account.

### 3.4 Community guidelines (shown during onboarding, versioned)

Short Norwegian text covering: do not film or share other people without their consent (especially children), no harassment, no spam, keep content about climbing. The accepted version is stored on the user.

---

## 4. Glossary

| Term | Meaning |
|---|---|
| Gym | A climbing facility. Beta: FBS only. |
| Wall | A named sector inside a gym ("Vegg 3", "Hulen"). |
| Grade scale | Ordered list of grades used by a gym (colors, V or Font). |
| Grade | One step in a scale. May carry an approximate V range, but most color gyms publish none. |
| Boulder | A specific problem on a wall: gym, wall, grade, photo. Archived when the gym resets it. |
| Ascent / quick log | A user's record for one boulder: attempted, sent or flashed. No post needed. |
| Post | Caption and 0–5 media items, shared to zero or more audiences. |
| Media item | One photo or video in a post; may be tagged with a boulder and a result. |
| Audience | Where a post is shared: the author's `profile` or a `group`. No audience = only the author. |
| Thread | The comments and reactions of one post within one audience. |
| Planned session | A proposed climbing time in a group, with RSVPs (B2). |
| Check-in | "I am at the gym now", visible to chosen groups for up to 3 hours (B2). |

---

## 5. Privacy and visibility model

This section drives authorization everywhere. It is implemented once, centrally, on the server (see `SEC-3`), and every feed, list and detail endpoint goes through it.

### 5.1 Audiences

A post has zero or more active audiences:

- `profile`: the author's profile.
- `group:{id}`: a group the author is a member of **at the time the audience is added**.

A post with no active audience is private: only the author sees it (a personal archive).

### 5.2 Who can see a post

Definitions: *blocked pair* means either user has blocked the other. `V` is the viewer, `A` the author.

`V` can see published post `P` if at least one of these holds:

1. **Author**: `V = A`.
2. **Profile audience**: `P` has an active `profile` audience, there is no blocked pair between `V` and `A`, and either `A` is public or `V` follows `A` with status `accepted`.
3. **Group audience**: `P` has an active `group:g` audience and `V` is a current member of `g`. If `V` has blocked `A`, the post is returned only as a collapsed placeholder "Skjult innhold" in that group context. If `A` has blocked `V`, nothing changes for `V` inside the group.

App admins see reported content only through admin endpoints, never through normal feeds.

### 5.3 Threads (comments and reactions)

- Each (post, audience) pair has its own thread. Comments and reactions never cross audiences.
- `V` can read and write the thread for `profile` if rule 2 holds, and the thread for `group:g` if `V` is a current member of `g`.
- The author can read all threads of their own post, **except** threads of groups they are no longer a member of.
- The post detail screen opens the thread of the context it was opened from, with a switcher listing the other threads `V` can access.
- Reaction and comment lists only show people who can access that thread.

### 5.4 Ascent visibility

Ascents never appear in feeds and never trigger notifications. They appear in "Hvem har toppet" on a boulder page and in the user's stats. They are visible to:

- the user,
- anyone who can see the user's profile (public profile, or accepted follower of a private one),
- co-members of any group the user is in,

unless the user has turned off "Del loggene mine" (default on), in which case only the user sees them. Blocked pairs never see each other's ascents.

### 5.5 Gym page visibility

A post appears on a gym page if it has an active `profile` audience, the author's profile is public, the post is linked to that gym, and the viewer is not in a blocked pair with the author. The gym page shows the `profile` thread.

### 5.6 Consequences and edge cases

| Situation | Behavior |
|---|---|
| Viewer is in groups A and B and follows the author | Post appears once in the home feed; thread switcher shows A, B and profile threads. |
| Author leaves or is removed from a group | The post keeps its group audience (content stays). The author loses access to that group's thread but can still remove the group audience from the post. |
| Audience removed from a post | The thread is hidden. If the same audience is re-added within 30 days the thread is restored; after 30 days it is purged by a job. |
| Group deleted | All its audiences are removed and its threads and chat purged. Posts with no remaining audience become private to their author. |
| Profile switched private → public | Confirmation: "Alle innlegg på profilen din blir synlige for alle, også på gymsiden". Pending follow requests are auto-accepted. |
| Profile switched public → private | Existing followers stay. Profile posts disappear from gym pages. |
| Unfollow, or follower removed | Loses profile access immediately, including threads. |
| Inaccessible resource requested by id | `404 Not Found`, never `403`, so existence is not revealed. |
| Caching | No shared/server caches of user content; every feed response is computed per viewer. |

### 5.7 Media access

All media objects live in a **private** bucket. Clients only receive short-lived presigned GET URLs in API responses, and only for media the viewer may see under 5.2. Details in section 9.

---

## 6. Functional requirements

### 6.1 Authentication and onboarding (AUTH), B1

- **AUTH-1** Sign-in through Supabase Auth with: Sign in with Apple (required on iOS because Google is offered), Google, and email one-time code (6 digits, no magic links).
- **AUTH-2** The API accepts only Supabase access tokens signed with an asymmetric key (ES256), validated against the project's JWKS (`/auth/v1/.well-known/jwks.json`): signature, `iss`, `aud = authenticated`, `exp` (clock skew ≤ 60 s). JWKS is cached and refetched on an unknown `kid`.
- **AUTH-3** First sign-in leads to onboarding: username, display name, optional avatar, 16+ checkbox, acceptance of the community guidelines. Until onboarding is complete, all other endpoints return `403` with code `onboarding_required`.
- **AUTH-4** Username: 3–20 characters `[a-z0-9._]`, starts with a letter, unique case-insensitively, reserved words blocked (`admin`, `support`, `boulder`, ...). Can be changed at most once per 30 days. Mentions are stored by user id, so a rename does not break them.
- **AUTH-5** The Supabase session is stored with the "LargeSecureStore" pattern (encrypted payload, key in SecureStore) because SecureStore values are size-limited.
- **AUTH-6** Suspended users get `403 account_suspended` on everything except `GET /me`.
- Edge cases: same verified email via Google and email code is linked by Supabase to one identity. Apple "Hide my email" gives a separate identity, which is accepted. A user who deletes the account and signs up again gets a new, empty account.

### 6.2 Profile and following (PROF), B1

- **PROF-1** Profile shows avatar, display name, username, bio (≤ 160 chars), stats summary and profile posts.
- **PROF-2** Profiles are public by default and can be set private.
- **PROF-3** Following a public profile is immediate. Following a private profile creates a request that the target accepts or declines; the requester can cancel it.
- **PROF-4** A user can remove any follower.
- **PROF-5** The profile header (avatar, names, follower counts, private flag) is visible to every signed-in user who is not in a blocked pair, even for private profiles. Posts, stats, ascents and follower lists follow section 5.
- **PROF-6** User search by username/display name prefix. Blocked pairs never find each other.
- **PROF-7** On their own profile, users see all their posts (including group-only and private) with audience badges.

### 6.3 Groups (GRP), B1

- **GRP-1** Any user can create a group: name (≤ 40 chars), optional description and avatar. The creator becomes owner.
- **GRP-2** Invite links (owner/admin): expiry 1 day, 7 days (default), 30 days or never; max uses 1, 10 (default) or unlimited. Shown as link, QR code and short code for manual entry. Revocable.
- **GRP-3** Opening an invite shows a preview (group name, avatar, member count, who created the link) and requires sign-in. Accepting makes the user a member. Accepting when already a member is an idempotent success.
- **GRP-4** Direct invite by username (owner/admin): the invitee gets a notification and accepts or declines.
- **GRP-5** Permissions per section 3.2.
- **GRP-6** Leaving: the member's posts, comments and messages stay in the group. Access is lost immediately, including open realtime connections. The owner must transfer ownership first, unless they are the only member (then leaving deletes the group after confirmation).
- **GRP-7** Removing a member works like leaving and also adds a ban, so old links cannot be used to rejoin. Admins can lift the ban.
- **GRP-8** Limits in beta: 50 members per group, 20 groups per user.
- **GRP-9** If the owner deletes their account, ownership passes to the longest-serving admin, else the longest-serving member; if no one is left the group is deleted.
- **GRP-10** Deleting a group (owner) requires typing the group name. Effects per 5.6.
- **GRP-11** Each member can mute notifications per group.
- Edge case: concurrent joins on a link with max uses are handled atomically (`UPDATE ... SET use_count = use_count + 1 WHERE use_count < max_uses`).

### 6.4 Gyms (GYM), B1

- **GYM-1** The data model supports many gyms. The beta seeds only FBS. The UI has a gym list/selector even though it has one entry, and never hard-codes FBS.
- **GYM-2** Gym page: name, address with "Åpne i kart" (opens Apple/Google Maps by URL, no API key), today's hours and the full week, "Åpent nå"/"Stengt" computed in the gym's time zone, date exceptions (holidays), prices grouped by category, contact info, website, "Sist oppdatert" date, grade scale legend, walls, active boulders, and the public post feed (5.5).
- **GYM-3** "Foreslå endring": any user submits a free-text suggestion. The app admin reviews it in the admin screens, edits the structured data, and marks it applied or rejected. The submitter is notified.
- **GYM-4** FBS seed data (all **[VERIFY]**, collected from fkk.no on 2026-09-24):

| Field | Value |
|---|---|
| Name | Fredrikstad Buldresenter |
| Operator | Fredrikstad Klatreklubb (FKK) |
| Address | Pancoveien 8, 1624 Fredrikstad (Gressvik) |
| Coordinates | TBD |
| Time zone | Europe/Oslo |
| Hours | Mon–Thu 08:00–22:00, Fri 08:00–20:00, Sat–Sun 10:00–18:00 |
| Contact | buldresenter@fkk.no, +47 411 28 024 |
| Website | https://www.fkk.no/fredrikstad-buldresenter/ |
| Access types | Drop-in, klippekort, periodekort; rental equipment |
| Prices (fkk.no/priser, unclear if they apply to FBS) | Drop-in: adult 150, student/senior 130, child 2–15 110, family 490. 10-klipp 1190–1350, 25-klipp 2590–3150 (depends on membership). Monthly (requires FKK membership): adult 650, student/senior 450, child 350, family 990. Shoe rental 50. |

### 6.5 Grade scales (GRADE), B1

- **GRADE-1** A grade scale is an ordered list of grades of kind `color`, `v` or `font`. Each grade has a label, ordinal, optional color hex, and an **optional** approximate V range (`v_min`, `v_max`, both set or both empty; `VB` is stored as -1; for V scales `v_min = v_max`). Color gyms usually publish no V mapping, so the range stays empty unless the gym itself states one. The app never invents a mapping.
- **GRADE-2** A gym has one active scale. If a gym changes system, a new scale is created; existing boulders keep their grade.
- **GRADE-3** Stats and "hardest" comparisons use the ordinal within the gym's scale and are shown with the gym's own labels and colors. Grades from different scales are never mixed. Cross-gym comparison is out of scope for the beta (one gym); see section 15 and 16.
- **GRADE-4** Grade chips always show text next to the color swatch (color-blind users; white needs a visible border).
- **GRADE-5** FBS scale: kind `color`, no V range (FBS publishes no V mapping). Order is the user's best recollection **[VERIFY]**:

| Ordinal | Label |
|---|---|
| 1 | Hvit |
| 2 | Grønn |
| 3 | Blå |
| 4 | Gul |
| 5 | Rød |
| 6 | Svart |
| 7 | Lilla |

### 6.6 Walls and boulders (BLD), B1

- **BLD-1** Walls belong to a gym, have a name and sort order, and are managed by the app admin. FBS wall names **[VERIFY]**.
- **BLD-2** Any user can create a boulder: wall, grade and photo are required (taken in-app or picked from the library); hold color, short name/note (≤ 60 chars) and set date are optional.
- **BLD-3** Duplicate check: after choosing wall and grade, the app shows the active boulders with the same wall and grade as a photo grid ("Er det en av disse?"). A new boulder is only created after "Ingen av disse".
- **BLD-4** Archiving: any user can mark a boulder "Skrudd ned", or use "Hele veggen er skrudd om" to archive every active boulder on a wall (with confirmation). Any user can restore within 14 days; the admin can always restore. Every change is recorded in `boulder_events` with the actor.
- **BLD-5** Merge (admin): the duplicate's ascents and media tags move to the kept boulder. If a user has ascents on both, the result keeps the best status (sent over attempted), flash if either was a flash, the earliest `first_logged_at` and the earliest `sent_at`. The duplicate gets status `merged` with `merged_into_id`, and API reads of it return a pointer to the kept boulder.
- **BLD-6** The creator and the admin can edit grade, wall, photo and notes. A regrade changes stats retroactively (stats are computed on read).
- **BLD-7** Boulder page: photo, grade, wall, status, set date, "Hvem har toppet" (5.4, friends first), media tagged to the boulder that the viewer may see (spoiler rules apply), and quick-log buttons.
- **BLD-8** Archived boulders are hidden from default lists ("Vis nedskrudde" shows them) and can still be logged, with the note "Denne er skrudd ned".
- Boulders are never hard-deleted, only archived or merged.

### 6.7 Quick log / ascents (LOG), B1

- **LOG-1** The boulder page has "Prøvd", "Toppet" and "Flash". There is one ascent record per (user, boulder).
- **LOG-2** Allowed transitions: none → attempted, sent or flash; attempted → sent. "Flash" is hidden once a record exists. The user can edit or delete their record to correct mistakes.
- **LOG-3** Optional attempt count (1–999).
- **LOG-4** Tagging a media item with a boulder and a result upserts the ascent, but only upgrades it (an "attempt" video never downgrades a send).
- **LOG-5** Offline logs carry a client `occurredAt`, accepted within [now − 14 days, now + 5 min].
- **LOG-6** Setting "Del loggene mine" (default on); visibility per 5.4.

### 6.8 Posts and media (POST), B1

- **POST-1** Composer: 0–5 media items (photos and videos mixed), caption ≤ 2000 chars (at least one of media or caption), optional gym (set automatically when a media item is tagged with a boulder), audience picker with "Profil" and each of the user's groups (multi-select). Nothing selected means "Bare meg".
- **POST-2** Each media item can be tagged with a boulder (picker: gym → wall → grade → photo grid) and a result: "Forsøk", "Toppet" or "Flash" (a result requires a boulder). The composer nudges tagging: "Tagg bulderen så vennene dine slipper spoilere".
- **POST-3** Video: max 60 s, trimmed in-app if longer; compressed on the device to ≤ 1280 px on the long edge, H.264/AAC MP4, target around 1.2–1.5 Mbit/s (about 10 MB per minute); hard cap 25 MB per file.
- **POST-4** Photos: resized to ≤ 2048 px on the long edge, JPEG quality about 0.8, re-encoded on the device so EXIF (including GPS) is removed; HEIC is converted to JPEG; hard cap 5 MB.
- **POST-5** Thumbnails (480 px JPEG) are generated on the device; for videos from a frame around 1 s.
- **POST-6** Bystander confirmation: if the `profile` audience is selected and the post has media, a required checkbox "Alle som er med i bildene/videoene har godtatt at de deles".
- **POST-7** After publishing, the author can edit the caption, boulder tags and results, and audiences (add/remove per 5.6), and can remove individual media items (at least one media item or a caption must remain). Adding media after publishing is not supported. Edited posts show "redigert".
- **POST-8** Deleting a post hides it immediately. Media objects and threads are purged by a job within 24 hours.
- **POST-9** A group audience can only be added by a current member of that group.
- **POST-10** Per-user storage quota: 500 MB in beta, adjustable by the admin. Over quota the upload is refused with "Du har brukt opp lagringsplassen din".
- **POST-11** Publishing follows the sequence in 9.2 and is idempotent on the client-generated `clientId`.
- **POST-12** On publish, members of each group audience are notified ("Ola la ut noe i Tirsdagsgjengen"). Followers get the post in their feed but no push.

### 6.9 Comments and reactions (CMT), B1

- **CMT-1** One thread per (post, audience) (5.3). Comments are flat, plain text, ≤ 1000 chars.
- **CMT-2** @mentions with autocomplete limited to users who can access the thread. A mention only notifies someone who can access the thread.
- **CMT-3** Users can edit their comments (shows "redigert") and delete them (body cleared, shown as "Slettet kommentar").
- **CMT-4** The post author can delete any comment in threads they can access; group owner/admins can delete comments in their group's thread.
- **CMT-5** Reactions per thread from a fixed set of five (`fire`, `strong`, `clap`, `wow`, `haha`, rendered as emoji). One reaction per user per thread, changeable. Counts and "who reacted" are only shown to users with thread access.
- **CMT-6** The post author is notified of new comments and reactions (reaction pushes batched to at most one per post per 15 min); mentioned users are notified.

### 6.10 Beta spoiler protection (SPOIL), B1

- **SPOIL-1** Setting "Skjul beta" with three modes: "Av", "Prosjektene mine" (default: boulders I have attempted but not sent) and "Alle buldere jeg ikke har toppet".
- **SPOIL-2** For viewer `V` and a media item tagged with boulder `B`, where `V` is not the author: the item is a spoiler if the mode is "Prosjektene mine" and `V`'s ascent on `B` is `attempted`, or if the mode is "Alle ..." and `V` has no send on `B`.
- **SPOIL-3** The API computes `spoiler: true|false` per media item for the viewer. The app shows a strongly blurred thumbnail, never autoplays, and overlays "Beta-spoiler · Vis likevel". Revealing is per item and not persisted.
- **SPOIL-4** Applies everywhere media is shown: feeds, profile, boulder page, gym page.
- **SPOIL-5** Logging a send on `B` removes the blur for `B` immediately (the app invalidates affected queries).
- **SPOIL-6** Push notifications never contain media.
- Limitation: untagged media cannot be protected.

### 6.11 Feeds (FEED), B1

- **FEED-1** Home feed: the viewer's own posts, posts in the viewer's groups, and profile posts of people the viewer follows. Each post appears once. Sorted by server `published_at` descending; cursor pagination, 20 per page.
- **FEED-2** A card's context (and default thread) is the first group audience the viewer is a member of, otherwise the profile. The card shows the context: "i Tirsdagsgjengen" or "på profilen".
- **FEED-3** Other feeds: group feed, profile feed, gym feed (5.5), boulder media list.
- **FEED-4** Pull to refresh and a "Nye innlegg" indicator.

### 6.12 Personal stats (STAT), B1

- **STAT-1** On the profile (visibility per 5.4): total sends, flashes, hardest send (highest ordinal in the gym's scale, shown with the gym's label), grade pyramid (sends per grade in the gym's scale) and sends per month for the last 12 months. Grade-based stats are per gym; totals and sends per month can span gyms.
- **STAT-2** Computed on read from `ascents`; fast enough at beta scale with an index on `(user_id, sent_at)`. Archived and merged boulders count.

### 6.13 Notifications (NOTIF), B1 and B2

- **NOTIF-1** In-app activity list with unread badge.
- **NOTIF-2** Push through the Expo Push Service. Tokens are registered per device, removed on sign-out, and deleted when Expo reports `DeviceNotRegistered`.
- **NOTIF-3** Types (all on by default):
  - B1: new post in a group, comment on my post, reaction on my post (batched), mention, new follower / follow request / request accepted, group invite, gym suggestion resolved, media hidden by a report.
  - B2: chat message (per-group mute), session created/changed/cancelled, session reminder 60 min before start (to "Kommer" and "Kanskje"), group member checked in (throttled, see CHK-4).
- **NOTIF-4** Preferences per type, plus mute per group. Setting "Vis forhåndsvisning" (default on) controls whether message/comment text is included in pushes.
- **NOTIF-5** Notifications are enqueued in the job table in the same transaction as the triggering change, and sent after commit with retries. Access is rechecked at send time; blocked pairs never notify each other.

### 6.14 Safety: block, report, moderation (SAFE), B1

- **SAFE-1** Block from a profile or any content menu. Effects: follows in both directions are removed; outside groups the pair is invisible to each other (profiles return 404, search, lists, ascents, gym page, mentions); inside shared groups the blocker sees the blocked user's posts, comments and messages as collapsed "Skjult innhold"; no notifications between them. The blocked user is not told.
- **SAFE-2** Report any post, media item, comment, message, user or boulder. Reasons: "Spam", "Trakassering", "Upassende innhold", "Jeg er med i denne", "Under 16 år", "Annet" (optional text ≤ 500 chars). The reporter sees "Takk, vi ser på det".
- **SAFE-3** A "Jeg er med i denne" report hides the media item immediately for everyone except its author and admins until reviewed. The author is notified.
- **SAFE-4** Admin report queue with target preview and actions: dismiss, remove content, hide media, restore, suspend/unsuspend user (with reason). The queue shows the reporter's history so abuse of SAFE-3 is visible. All actions go to `admin_audit_log`.
- **SAFE-5** Group owner/admins moderate inside their group: remove posts from the group, delete comments in the group's threads and chat messages, remove and ban members.

### 6.15 Account deletion (DEL), B1

- **DEL-1** Settings → "Slett konto". Requires a sign-in within the last 10 minutes (otherwise re-authenticate) and typing the username.
- **DEL-2** Immediately: status `deleted`, the Supabase auth user is deleted through the admin API, and all the user's content is hidden.
- **DEL-3** A purge job (within 24 hours) hard-deletes posts, media objects in R2, ascents, follows, blocks, reactions, push tokens, notifications and group memberships (ownership per GRP-9). Comments and chat messages keep their row but lose body and author, shown as "Slettet melding" so threads keep their structure. Boulders the user created remain with the creator removed (photos show walls, not people). Reports keep the target reference but drop the reporter. The admin audit log keeps the user id.
- **DEL-4** Backups may contain deleted data for up to 7 days (backup retention); to be stated in the privacy policy.
- **DEL-5** The username becomes available again.

### 6.16 Admin screens (ADM), B1

- **ADM-1** In-app screens visible only to the app admin: report queue, gym info editor (hours, exceptions, prices, contact, "verified" date), gym suggestion queue, wall editor, grade scale editor, boulder merge tool, user lookup (suspend, storage quota), storage usage overview.
- **ADM-2** All admin endpoints live under `/api/v1/admin`, require the `AdminOnly` policy, and are audited.

### 6.17 Offline outbox (OFF), B1

- **OFF-1** Creating a post (with media copied into app storage) and quick logs are written to a persistent outbox on the device and sent when the network is back. Reading requires network; offline shows a banner and whatever is already loaded in memory.
- **OFF-2** Every outbox item has a client UUID used as idempotency key; the server deduplicates on `(author_id, client_id)`.
- **OFF-3** The outbox is processed on reconnect (NetInfo), on app foreground and on manual retry. Order is preserved per item type. Exponential backoff; after 5 failures the item shows "Kunne ikke sendes" with "Prøv igjen" and "Slett".
- **OFF-4** Uploads resume at file granularity: media the server already marked uploaded are not sent again; expired presigned URLs are refreshed.
- **OFF-5** Pending posts appear on the user's own profile and home feed with "Venter på nett ..." or upload progress. Background uploading is best effort; if the OS kills the app, uploads resume on next launch.
- **OFF-6** If the user lost membership of a group before a queued post is sent, that audience is dropped, the post is published to the remaining audiences (or becomes private), and the user is told.
- **OFF-7** Signing out with unsent items warns: "Du har X innlegg som ikke er sendt. De slettes hvis du logger ut."
- Creating boulders requires network (the duplicate check needs the server).

### 6.18 Group chat (CHAT), B2

- **CHAT-1** One chat per group. Messages: text ≤ 2000 chars, up to 4 photos (same pipeline as posts; no video in B2), reply-to, @mentions.
- **CHAT-2** Realtime through a SignalR hub; REST for history and as fallback for sending.
- **CHAT-3** Edit own message within 15 minutes ("redigert"). Delete own message → "Slettet melding". Group owner/admins can delete any message.
- **CHAT-4** Unread counts per group via `last_read_message_id`. No per-message read receipts or typing indicators in B2.
- **CHAT-5** Sending is optimistic with a client id; the server deduplicates; failed messages can be retried.
- **CHAT-6** Membership is checked on hub join and on every send. When a member leaves, is removed or banned, the server removes their connections from the group channel immediately.
- **CHAT-7** History is paged by cursor (UUIDv7 order). New members see the full history **[VERIFY]**.
- **CHAT-8** Push for new messages to members not connected to that group channel, respecting mute, collapsed per group.

### 6.19 Planned sessions (SES), B2

- **SES-1** Any member creates a session in a group: gym (FBS preselected), start date/time, optional end, optional note (≤ 500 chars).
- **SES-2** RSVP: "Kommer", "Kanskje", "Kommer ikke". The creator is set to "Kommer".
- **SES-3** The creator and group admins can edit or cancel; everyone who answered "Kommer" or "Kanskje" is notified.
- **SES-4** Reminder 60 minutes before start to "Kommer" and "Kanskje". If an edit moves the start to less than 60 minutes away, only the change notification is sent.
- **SES-5** The group has a "Planlagt" list (upcoming, plus the last 30 days). A new session is also posted as a card in the group chat.
- **SES-6** Times are stored in UTC and shown in the device time zone. The app warns if the session falls outside the gym's opening hours.

### 6.20 Check-in "På gymmen nå" (CHK), B2

- **CHK-1** "Jeg er på FBS nå": choose groups (default all), optional short note ("til ca. 20"). Manual only, no GPS.
- **CHK-2** Expires after 3 hours or on "Sjekk ut". One active check-in per user.
- **CHK-3** Visible only to members of the chosen groups (group header shows "På gymmen nå: Ola, Kari"). Never on the public gym page.
- **CHK-4** Push to members of the chosen groups, throttled to at most one check-in push per user per group per 6 hours.
- Blocks apply per SAFE-1.

---

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Platforms | iOS and Android from day one, minimum OS versions as required by the Expo SDK in use. |
| Language | UI in Norwegian bokmål through i18n (i18next + expo-localization) with all strings in resource files from the start, so English can be added later. |
| Scale assumption | Beta: ≤ 50 users, ≤ 10 groups, ≤ 10 GB media in total. |
| Performance | API p95 < 300 ms for feed and list endpoints on the beta VM. App cold start < 3 s on a mid-range Android phone. Feeds scroll smoothly with a recycling list (FlashList) and cached thumbnails (expo-image). |
| Availability | Best effort, single VM. RPO 24 h (nightly backups), RTO < 2 h (scripted re-provisioning, see 8.4). |
| Time | Stored as `timestamptz` (UTC). Displayed in the device time zone. Gyms carry an IANA time zone for opening hours. |
| Accessibility | Labels on all interactive elements, dynamic type respected, color never the only signal. |
| Privacy by design | No date of birth, no GPS, EU regions for every processor that offers one. |
| Observability | Structured logs (Serilog) with request ids and user ids, no tokens, emails or message bodies. Sentry (free plan) for app and API errors. `/health` endpoint with an external uptime monitor. |
| Client compatibility | The app sends `X-App-Version`. The API can answer `426 Upgrade Required` below a configured minimum version, and the app then shows "Oppdater appen". |

---

## 8. Architecture and tech stack

### 8.1 Overview

```
 ┌──────────────────────┐   HTTPS REST + SignalR (B2)   ┌──────────────────────────────── Oracle VM ─┐
 │  Expo app (iOS/And.) │ ────────────────────────────▶ │ Caddy ─▶ ASP.NET Core API ─▶ PostgreSQL    │
 └──────────────────────┘                               └────────────────────────────────────────────┘
    │ sign-in, tokens           │ presigned PUT/GET              │           │            │
    ▼                           ▼                                ▼           ▼            ▼
 Supabase Auth ◀── JWKS ── (API)     Cloudflare R2 (private) ◀── presign, HEAD, delete   Expo Push ── APNs/FCM
```

- The API owns all domain data. Supabase is used **only** for authentication; its database is not used for app data.
- Media bytes never pass through the API: the app uploads to and downloads from R2 with presigned URLs.

### 8.2 Mobile app

| Concern | Choice |
|---|---|
| Framework | Expo (latest SDK at project start), React Native, TypeScript in strict mode, Expo Router |
| Builds | Development builds, not Expo Go (native modules are needed). iOS builds through EAS Build in the cloud because development happens on Windows. Android builds locally when possible to save the EAS free build quota. |
| Server state | TanStack Query |
| Local state | Zustand, kept small |
| Forms | react-hook-form + zod |
| API client | TypeScript types generated from the API's OpenAPI document (openapi-typescript + openapi-fetch); regenerated in CI with a drift check |
| Media | expo-image-picker, expo-image-manipulator (resize, EXIF removal), a video compression library such as react-native-compressor **[ADR]**, a trimming component **[ADR]**, expo-video-thumbnails, expo-video for playback, expo-image for display (cache key = media id) |
| Storage | Session via LargeSecureStore; outbox in expo-sqlite **[ADR]** |
| Other | expo-notifications, @react-native-community/netinfo, @microsoft/signalr (B2) |
| Tests | Jest + React Native Testing Library; Maestro end-to-end tests Later |

### 8.3 Backend

| Concern | Choice |
|---|---|
| Runtime | .NET 10 (LTS), ASP.NET Core |
| API style | Minimal APIs with endpoint groups per feature **[ADR]** |
| Structure | Modular monolith organized by feature (Users, Groups, Gyms, Boulders, Posts, Social, Notifications, Moderation, Chat, Sessions); layering detailed in `docs/architecture.md` |
| Data | PostgreSQL 17 or newer, EF Core with Npgsql, EF migrations, `citext` for usernames |
| IDs | UUIDv7 (`Guid.CreateVersion7()`), serialized as strings; gives time-ordered cursors |
| Authorization | One central visibility component implementing section 5 (query filters/specifications). Endpoints never hand-roll visibility checks. |
| Validation and errors | Request validation on every endpoint; errors as RFC 9457 ProblemDetails with a machine-readable `code` |
| Background work | Postgres job table processed by a hosted `BackgroundService` using `FOR UPDATE SKIP LOCKED` (notifications, media purge, pending-post cleanup, thread purge, reminders, check-in expiry, storage usage) **[ADR: custom vs Hangfire/Quartz]** |
| Realtime (B2) | SignalR on a single instance, no backplane |
| Object storage | AWS SDK for S3 against the R2 endpoint (presign PUT/GET, HEAD, DELETE) |
| Push | Expo Push HTTP API with an access token; receipt checking |
| API docs | Built-in OpenAPI document generation; Scalar UI in development only |
| Tests | xUnit, Testcontainers (PostgreSQL; needs Docker Desktop on Windows), WebApplicationFactory with a test authentication handler |

### 8.4 Infrastructure at 0 NOK/month

| Concern | Choice | Notes and risks |
|---|---|---|
| API + database host | Oracle Cloud Always Free, Ampere A1 VM (ARM64), home region in the EU (Stockholm or Frankfurt) | Current Oracle docs list 2 OCPU / 12 GB for A1 on Always Free. The home region cannot be changed later. **Idle instances can be reclaimed** (7 days with CPU p95 < 20 %, network < 20 % and memory < 20 %), and this applies to all account types. Mitigation: size the VM so normal memory use stays above 20 %, provision with a script (cloud-init + Docker Compose) so the VM can be recreated in under 2 hours, and keep backups outside the VM. |
| Runtime | Docker Compose with `api`, `postgres`, `caddy` | Images built for `linux/arm64` in GitHub Actions and pushed to GHCR. Postgres is only reachable on the internal Compose network. |
| TLS and domain | Caddy with automatic HTTPS on a free DNS name (e.g. DuckDNS) | A real domain is needed later for universal links; the beta uses the custom scheme `boulder://`. |
| Authentication | Supabase Auth, EU region, auth only | Free projects are paused after about 7 days of low database activity. Mitigation: a daily keep-alive request from a GitHub Actions cron job. Configure custom SMTP (e.g. Resend free tier) for email codes; the built-in email sender is only meant for testing. |
| Media | Cloudflare R2, one private bucket, EU jurisdiction | Free tier: 10 GB storage, 1 M Class A and 10 M Class B operations per month, no egress fees. A payment method must be registered on the Cloudflare account. |
| Push | Expo Push Service with FCM (Android) and APNs (iOS) | Free |
| Error tracking | Sentry, free plan (EU data region if available **[VERIFY]**) | |
| CI/CD | GitHub Actions: build, test, generate OpenAPI, build ARM image, deploy over SSH | |
| Backups | Nightly `pg_dump`, compressed and encrypted (age), uploaded to R2 under `backups/`, 7-day retention. Restore tested monthly. | Counts toward the 10 GB |
| Uptime | Free external monitor on `/health` | |
| Accepted costs | Apple Developer Program 99 USD/year. Optional: Google Play 25 USD one-time. | |

### 8.5 Repository layout (proposal, finalized in `docs/architecture.md`)

```
/apps/mobile/                 Expo app
/api/
  Boulder.sln
  src/Boulder.Api/            endpoints, auth, SignalR hubs, composition root
  src/Boulder.Application/    use cases, visibility rules, DTOs
  src/Boulder.Domain/         entities, value objects, domain rules
  src/Boulder.Infrastructure/ EF Core, R2, Expo Push, Supabase admin client, jobs
  tests/Boulder.UnitTests/
  tests/Boulder.IntegrationTests/
/infra/                       docker-compose.yml, Caddyfile, cloud-init, backup scripts, runbooks
/docs/                        SPEC.md, PLAN.md, architecture.md, adr/
```

### 8.6 Development approach

Each feature is built UI first: screens are built against a typed mock API layer that uses the same generated TypeScript types, to find the data the UI actually needs. Then the endpoints are implemented, and the mocks are swapped for the real client. Once an endpoint exists, its OpenAPI document is the contract. The trade-off is that a UI can assume data the privacy model cannot provide; this is limited by section 5 being fixed before any UI work. PLAN.md phases follow this order.

---

## 9. Media pipeline

### 9.1 Object layout

- `media/{ownerId}/{mediaId}/original.{jpg|mp4}` and `media/{ownerId}/{mediaId}/thumb.jpg`
- `backups/{yyyy-mm-dd}.sql.gz.age`

Keys contain random UUIDs, but security relies on the bucket being private, not on unguessable keys.

### 9.2 Upload and publish sequence (posts)

1. The app prepares every media item (compress, resize, strip metadata, thumbnail) and records content type, byte size, dimensions and duration.
2. `POST /api/v1/posts` with `clientId`, caption, gym, audiences, media descriptors (kind, content type, bytes, thumb bytes, width, height, duration, boulder, result) and bystander consent. The server validates limits, quota, audiences and boulders, and creates the post as `pending`. The response contains, per media item, presigned PUT URLs for original and thumbnail with the headers to send. Repeating the call with the same `clientId` returns the same post.
3. The app uploads the files directly to R2. Content-Type and Content-Length are part of the signature; URLs expire after 15 minutes and can be refreshed (`POST /posts/{id}/media/{mediaId}/upload-urls`).
4. `POST /api/v1/posts/{id}/publish`. The server sends HEAD for every object and checks size and type. Missing or mismatching objects give `409` with the list of affected media ids, so the app can re-upload. On success: media → `ready`, post → `published`, ascents upserted from tags (LOG-4), storage usage updated, notifications enqueued.
5. A cleanup job deletes pending posts older than 24 hours, including their objects.

Avatars, boulder photos and chat photos use the same idea through `POST /api/v1/media/uploads` (purpose-specific limits); the returned `mediaId` is then referenced by the owning request, and the server checks that the media belongs to the caller and is `ready`.

### 9.3 Delivery

- API responses include presigned GET URLs (`url`, `thumbUrl`, TTL 60 min) only for media the viewer may see. Media hidden by a report are left out.
- The app caches images by media id, not by URL, so rotating URLs do not cause re-downloads.

### 9.4 Limits and validation

| | Photo | Video |
|---|---|---|
| Max size | 5 MB | 25 MB |
| Max dimensions | 2048 px long edge | 1280 px long edge |
| Duration | n/a | ≤ 60 s (1 s tolerance) |
| Content type | `image/jpeg` | `video/mp4` |
| Per post | 5 items in total | |

- The server cannot check codec or duration without downloading the file. In beta it trusts the client-reported duration, and the signed size cap limits abuse. Later: a verification worker with ffprobe.
- Metadata: photos are re-encoded on the device, which removes EXIF and GPS. Videos must lose location metadata during compression; this is an acceptance test on both platforms for the chosen library **[VERIFY]**. Stripping on the device only protects the uploader's own data, which is acceptable in beta.

### 9.5 Budget guard

- Per-user quota 500 MB (POST-10).
- A daily job computes bucket usage. At 8 GB the admin is notified; at 9.5 GB new uploads are refused with a clear message.

---

## 10. Security requirements

- **SEC-1** HTTPS only (Caddy, HSTS). Port 80 only redirects.
- **SEC-2** Token validation per AUTH-2. `alg: none` and symmetric algorithms are rejected.
- **SEC-3** Authorization is centralized (section 5). Every endpoint that reads or changes user content has negative tests (section 11). Inaccessible resources return 404.
- **SEC-4** Ownership and membership are always resolved from the authenticated user on the server, never from ids in the request body.
- **SEC-5** Every text field has a length limit and is stored and rendered as plain text. Mentions are parsed on the server.
- **SEC-6** Rate limits with the ASP.NET Core rate limiter, per user (per IP when unauthenticated), answering `429` with `Retry-After`:

| Action | Limit |
|---|---|
| Create post | 30 / hour |
| Presign media upload | 100 / hour |
| Comment | 60 / 10 min |
| Reaction | 120 / 10 min |
| Follow / follow request | 60 / hour |
| Invite preview / accept | 30 / hour, 10 / hour |
| Report | 20 / day |
| Create boulder / archive boulder | 30 / day, 60 / day |
| Username availability check | 30 / min |
| Chat message (B2) | 30 / min |

- **SEC-7** Invite tokens: 128 bits from a CSPRNG, base64url, stored only as SHA-256 hash, looked up by hash. Expiry, max uses and revocation are enforced atomically. Banned users cannot join.
- **SEC-8** Media: private bucket; R2 credentials only on the server, scoped to the one bucket; presigned PUT with signed Content-Type and Content-Length (15 min); verification on publish; presigned GET (60 min).
- **SEC-9** Secrets live in environment variables / `.env` on the server and in GitHub Actions secrets, never in git. Claude Code is denied read access to `.env*` files (configured in `.claude/settings.json` later).
- **SEC-10** SignalR (B2): the access token is passed in the `access_token` query string only for WebSocket connections and is scrubbed from Caddy and ASP.NET request logs. Hub methods authorize on every call.
- **SEC-11** Logs contain user ids only: no tokens, emails, captions, comments or message bodies. Log retention 14 days.
- **SEC-12** Dependabot for NuGet, npm, GitHub Actions and Docker. CI fails on known vulnerable NuGet packages.
- **SEC-13** Server hardening: SSH with keys only, firewall open for 22/80/443 only, automatic security updates, the application uses a Postgres role without superuser rights.
- **SEC-14** Backups are encrypted before upload.
- **SEC-15** The admin role is assigned only through the database. Every admin action is written to `admin_audit_log`.
- **SEC-16** Deep links never perform an action without user confirmation; invite tokens are validated on the server.
- **SEC-17** GDPR: processors in EU regions where offered (Supabase, R2 EU jurisdiction, Oracle EU home region). Expo's push service is outside the EU and must be listed in the privacy policy. Privacy policy, terms and self-service data export are required before public launch; during the closed beta, access requests are handled manually.

---

## 11. Testing strategy

- **Unit tests (API)**: domain rules such as ascent transitions and merge logic, visibility predicates, invite use counting, spoiler calculation, "open now" across DST changes.
- **Integration tests (API)**: Testcontainers PostgreSQL + WebApplicationFactory. Every endpoint has a happy-path test.
- **Authorization matrix**: every endpoint that returns or changes user content is tested for these viewers, with the expected result written as a table in the test:
  author · group member · non-member · former member · banned member · follower (accepted) · follower (pending) · stranger vs. public profile · stranger vs. private profile · blocker · blocked · suspended user · deleted user · app admin (normal endpoint).
- **Contract**: CI generates the OpenAPI document and the mobile types; a diff fails the build.
- **Mobile**: unit tests for the outbox, audience picker rules and grade display; component tests for the composer and spoiler overlay.
- **Manual release checklist** (both platforms): upload on a weak network, app backgrounded and killed during upload, deep link invite, push delivery, account deletion.

---

## 12. Data model

PostgreSQL. All ids are UUIDv7 unless noted. All timestamps are `timestamptz`. `NULL` columns are optional.

### 12.1 Users and social graph

| Table | Columns | Constraints and indexes |
|---|---|---|
| `users` | `id`, `auth_subject`, `username` (citext), `display_name`, `bio`, `avatar_media_id` NULL, `is_private`, `share_ascents` (default true), `spoiler_mode` (`off`/`projects`/`all_unsent`, default `projects`), `role` (`user`/`admin`), `status` (`active`/`suspended`/`deleted`), `storage_quota_bytes`, `storage_used_bytes`, `username_changed_at`, `age_confirmed_at`, `guidelines_version`, `created_at`, `deleted_at` | unique `auth_subject`; unique `username` where not deleted |
| `follows` | `follower_id`, `followee_id`, `status` (`pending`/`accepted`), `created_at`, `accepted_at` | PK (`follower_id`, `followee_id`); check follower ≠ followee; index (`followee_id`, `status`) |
| `blocks` | `blocker_id`, `blocked_id`, `created_at` | PK (`blocker_id`, `blocked_id`); index `blocked_id` |
| `push_tokens` | `id`, `user_id`, `expo_token`, `platform`, `app_version`, `created_at`, `last_used_at` | unique `expo_token` |
| `notification_preferences` | `user_id`, `type`, `enabled` | PK (`user_id`, `type`) |
| `notifications` | `id`, `recipient_id`, `type`, `actor_id` NULL, `group_id` NULL, `post_id` NULL, `comment_id` NULL, `boulder_id` NULL, `session_id` NULL, `data` jsonb, `created_at`, `read_at` | index (`recipient_id`, `created_at` desc) |

### 12.2 Groups

| Table | Columns | Constraints and indexes |
|---|---|---|
| `groups` | `id`, `name`, `description`, `avatar_media_id` NULL, `owner_id`, `created_at`, `deleted_at` | |
| `group_members` | `group_id`, `user_id`, `role` (`owner`/`admin`/`member`), `joined_at`, `muted`, `last_read_message_id` NULL | PK (`group_id`, `user_id`); partial unique index: one `owner` per group; index `user_id` |
| `group_bans` | `group_id`, `user_id`, `banned_by`, `created_at` | PK (`group_id`, `user_id`) |
| `group_invite_links` | `id`, `group_id`, `token_hash` (bytea), `created_by`, `expires_at` NULL, `max_uses` NULL, `use_count`, `revoked_at` NULL, `created_at` | unique `token_hash` |
| `group_invitations` | `id`, `group_id`, `invitee_id`, `inviter_id`, `status` (`pending`/`accepted`/`declined`/`cancelled`), `created_at`, `responded_at` | partial unique (`group_id`, `invitee_id`) where pending |

### 12.3 Gyms, grades, boulders, ascents

| Table | Columns | Constraints and indexes |
|---|---|---|
| `gyms` | `id`, `slug`, `name`, `operator_name`, `street`, `postal_code`, `city`, `country`, `latitude`, `longitude`, `phone`, `email`, `website_url`, `timezone`, `active_grade_scale_id`, `info_verified_at`, `google_place_id` NULL, `created_at` | unique `slug`; unique `google_place_id` |
| `gym_opening_hours` | `gym_id`, `iso_weekday` (1–7), `opens_at` (time), `closes_at` (time) | PK (`gym_id`, `iso_weekday`, `opens_at`); allows split hours |
| `gym_opening_exceptions` | `gym_id`, `date`, `is_closed`, `opens_at` NULL, `closes_at` NULL, `note` | PK (`gym_id`, `date`) |
| `gym_prices` | `id`, `gym_id`, `category` (`drop_in`/`punch_card`/`subscription`/`annual`/`rental`/`other`), `label`, `amount_nok` (numeric), `conditions`, `sort_order` | |
| `gym_info_suggestions` | `id`, `gym_id`, `author_id` NULL, `body`, `status` (`open`/`applied`/`rejected`), `reviewed_by`, `reviewed_at`, `created_at` | index (`status`, `created_at`) |
| `walls` | `id`, `gym_id`, `name`, `sort_order`, `is_active` | unique (`gym_id`, `name`) |
| `grade_scales` | `id`, `name`, `kind` (`color`/`v`/`font`), `gym_id` NULL, `created_at`, `retired_at` | |
| `grades` | `id`, `scale_id`, `ordinal`, `label`, `color_hex` NULL, `v_min` NULL, `v_max` NULL | unique (`scale_id`, `ordinal`); check both null, or both set with `v_min ≤ v_max` |
| `boulders` | `id`, `gym_id`, `wall_id`, `grade_id`, `hold_color` NULL, `name` NULL, `photo_media_id`, `set_on` NULL (date), `status` (`active`/`archived`/`merged`), `archived_at`, `archived_by`, `merged_into_id` NULL, `created_by` NULL, `created_at`, `updated_at` | index (`gym_id`, `status`, `wall_id`, `grade_id`) |
| `boulder_events` | `id`, `boulder_id`, `actor_id` NULL, `type` (`created`/`edited`/`archived`/`restored`/`merged`), `details` jsonb, `created_at` | index (`boulder_id`, `created_at`) |
| `ascents` | `user_id`, `boulder_id`, `status` (`attempted`/`sent`), `is_flash`, `attempts` NULL, `first_logged_at`, `sent_at` NULL, `updated_at` | PK (`user_id`, `boulder_id`); check `is_flash` implies `sent`; index (`boulder_id`, `status`); index (`user_id`, `sent_at`) |

### 12.4 Posts, media, threads

| Table | Columns | Constraints and indexes |
|---|---|---|
| `posts` | `id`, `author_id`, `client_id`, `caption`, `gym_id` NULL, `status` (`pending`/`published`/`deleted`), `bystander_consent_at` NULL, `created_at`, `published_at`, `edited_at`, `deleted_at` | unique (`author_id`, `client_id`); index (`author_id`, `published_at` desc); index (`gym_id`, `published_at` desc) |
| `post_audiences` | `id`, `post_id`, `kind` (`profile`/`group`), `group_id` NULL, `post_published_at` (denormalized for feed ordering), `added_at`, `removed_at` NULL | unique (`post_id`, `kind`, `group_id`) nulls not distinct; check `kind = group` iff `group_id` is not null; index (`group_id`, `post_published_at` desc) where `removed_at` is null |
| `media` | `id`, `owner_id`, `purpose` (`post`/`avatar`/`boulder_photo`/`chat`), `post_id` NULL, `message_id` NULL, `sort_order`, `kind` (`image`/`video`), `content_type`, `object_key`, `thumb_object_key`, `bytes`, `thumb_bytes`, `width`, `height`, `duration_ms` NULL, `status` (`pending`/`ready`/`deleted`), `boulder_id` NULL, `result` (`attempt`/`sent`/`flash`) NULL, `hidden_reason` NULL, `created_at`, `ready_at` | check `result` requires `boulder_id`; index `post_id`; index (`boulder_id`) where status = ready |
| `comments` | `id`, `post_audience_id`, `author_id` NULL, `body` NULL, `created_at`, `edited_at`, `deleted_at` | index (`post_audience_id`, `created_at`) |
| `comment_mentions` | `comment_id`, `user_id` | PK |
| `reactions` | `post_audience_id`, `user_id`, `kind` (`fire`/`strong`/`clap`/`wow`/`haha`), `created_at` | PK (`post_audience_id`, `user_id`) |

### 12.5 Moderation and operations

| Table | Columns | Constraints and indexes |
|---|---|---|
| `reports` | `id`, `reporter_id` NULL, `target_type`, `target_id`, `reason`, `note`, `status` (`open`/`actioned`/`dismissed`), `resolved_by`, `resolved_at`, `resolution_note`, `created_at` | index (`status`, `created_at`) |
| `admin_audit_log` | `id`, `admin_id`, `action`, `target_type`, `target_id`, `details` jsonb, `created_at` | append-only |
| `jobs` | `id`, `type`, `payload` jsonb, `run_at`, `attempts`, `max_attempts`, `locked_until`, `last_error`, `created_at`, `completed_at` | index (`run_at`) where `completed_at` is null |

### 12.6 Beta 2

| Table | Columns | Constraints and indexes |
|---|---|---|
| `messages` | `id`, `group_id`, `author_id` NULL, `client_id`, `body` NULL, `reply_to_id` NULL, `created_at`, `edited_at`, `deleted_at` | unique (`author_id`, `client_id`); index (`group_id`, `id` desc) |
| `message_mentions` | `message_id`, `user_id` | PK |
| `sessions` | `id`, `group_id`, `created_by`, `gym_id`, `starts_at`, `ends_at` NULL, `note`, `cancelled_at`, `created_at`, `updated_at` | index (`group_id`, `starts_at`) |
| `session_rsvps` | `session_id`, `user_id`, `status` (`going`/`maybe`/`not_going`), `updated_at` | PK (`session_id`, `user_id`) |
| `checkins` | `id`, `user_id`, `gym_id`, `note`, `started_at`, `expires_at`, `ended_at` | partial unique (`user_id`) where active |
| `checkin_groups` | `checkin_id`, `group_id` | PK |

---

## 13. API surface (indicative)

Base path `/api/v1`. JSON with camelCase. Lists use cursor pagination (`?cursor=&limit=`, response `{ items, nextCursor }`). Errors are ProblemDetails with `code`. The final contract is the generated OpenAPI document; this list is the starting point for the UI-first work.

**Me and users**
- `GET /me` · `POST /me/onboarding` · `PATCH /me` (profile, privacy, spoiler mode, share ascents) · `DELETE /me`
- `GET /usernames/{name}/availability`
- `PUT /me/push-tokens` · `DELETE /me/push-tokens/{token}` · `GET|PUT /me/notification-preferences`
- `GET /users/search?q=` · `GET /users/{username}` · `GET /users/{id}/posts` · `GET /users/{id}/stats` · `GET /users/{id}/ascents`
- `GET /users/{id}/followers` · `GET /users/{id}/following`

**Follows and blocks**
- `POST|DELETE /users/{id}/follow` · `DELETE /users/{id}/follower`
- `GET /me/follow-requests` · `POST /me/follow-requests/{userId}/accept|decline`
- `POST|DELETE /users/{id}/block` · `GET /me/blocks`

**Groups**
- `POST /groups` · `GET /me/groups` · `GET|PATCH|DELETE /groups/{id}`
- `GET /groups/{id}/members` · `PATCH /groups/{id}/members/{userId}` (role) · `DELETE /groups/{id}/members/{userId}` (remove + ban) · `DELETE /groups/{id}/bans/{userId}`
- `POST /groups/{id}/leave` · `POST /groups/{id}/transfer-ownership`
- `POST /groups/{id}/invite-links` · `GET /groups/{id}/invite-links` · `DELETE /groups/{id}/invite-links/{linkId}`
- `GET /invites/{token}` (preview) · `POST /invites/{token}/accept`
- `POST /groups/{id}/invitations` · `GET /me/invitations` · `POST /me/invitations/{id}/accept|decline`
- `GET /groups/{id}/feed`

**Gyms, walls, grades, boulders, ascents**
- `GET /gyms` · `GET /gyms/{id}` · `GET /gyms/{id}/posts` · `GET /gyms/{id}/walls` · `POST /gyms/{id}/suggestions`
- `GET /gyms/{id}/boulders?wallId=&gradeId=&status=` · `POST /boulders` · `GET|PATCH /boulders/{id}`
- `POST /boulders/{id}/archive` · `POST /boulders/{id}/restore` · `POST /walls/{id}/archive-all`
- `GET /boulders/{id}/ascents` · `GET /boulders/{id}/media`
- `PUT|DELETE /boulders/{id}/ascent` (own quick log)

**Posts, media, threads, feed**
- `POST /posts` · `POST /posts/{id}/publish` · `POST /posts/{id}/media/{mediaId}/upload-urls`
- `GET|PATCH|DELETE /posts/{id}` · `PUT /posts/{id}/audiences` · `DELETE /posts/{id}/media/{mediaId}`
- `GET /feed`
- `GET|POST /post-audiences/{audienceId}/comments` · `PATCH|DELETE /comments/{id}`
- `PUT|DELETE /post-audiences/{audienceId}/reaction`
- `POST /media/uploads`

**Notifications and reports**
- `GET /notifications` · `POST /notifications/read`
- `POST /reports`

**Admin** (`AdminOnly`)
- `GET /admin/reports` · `POST /admin/reports/{id}/resolve`
- `PUT /admin/gyms/{id}` (+ hours, exceptions, prices) · `GET /admin/gym-suggestions` · `POST /admin/gym-suggestions/{id}/resolve`
- `POST|PATCH /admin/walls` · `POST|PATCH /admin/grade-scales` · `POST /admin/boulders/{id}/merge`
- `GET /admin/users/{id}` · `POST /admin/users/{id}/suspend|unsuspend` · `PATCH /admin/users/{id}/quota` · `GET /admin/storage`

**B2**
- `GET|POST /groups/{id}/messages` · `PATCH|DELETE /messages/{id}` · `POST /groups/{id}/messages/read`
- `GET|POST /groups/{id}/sessions` · `PATCH|DELETE /sessions/{id}` · `PUT /sessions/{id}/rsvp`
- `POST /checkins` · `DELETE /checkins/current` · `GET /groups/{id}/checkins`
- SignalR hub `/hubs/groups`: client → `JoinGroups`, `SendMessage`; server → `MessageCreated`, `MessageUpdated`, `MessageDeleted`, `CheckinChanged`, `SessionChanged`

---

## 14. Cross-cutting edge cases

| Case | Expected behavior |
|---|---|
| Two users archive or restore the same boulder at once | Idempotent; last write wins; both events logged. |
| Two users create the same boulder at once | Both created; the admin merges (BLD-5). |
| Device clock is wrong for offline logs | Server clamps per LOG-5; feeds order by server `published_at`. |
| "Åpent nå" around DST changes | Computed with the gym's IANA time zone; covered by unit tests. |
| Feed pagination while new posts arrive | Cursor on (`published_at`, `id`) so pages never repeat or skip. |
| Content by a deleted user in groups | Posts gone; comments and messages shown as "Slettet melding". |
| Username renamed | Mentions stored by id and rendered with the current username. |
| Account deleted while another device has queued items | Server returns 401/403; the app clears the outbox and signs out. |
| Old app version after a breaking API change | `426` + "Oppdater appen" (section 7). |
| Supabase project paused | Sign-in fails; prevented by the keep-alive job; runbook explains how to resume. |
| Oracle VM reclaimed or broken | Re-provision from `/infra` scripts and restore the latest backup (runbook). |
| R2 close to the free limit | Budget guard (9.5). |
| User in 20 groups posts to all of them | Allowed; 20 audiences, 20 separate threads. |
| Media item hidden by a report | Omitted from responses to everyone except author and admins; the post still shows its other items. |

---

## 15. Open questions and items to verify

1. FBS grade colors and order (current recollection: hvit, grønn, blå, gul, rød, svart, lilla).
2. Does FBS mark grades by hold color or by tags/tape? Decides whether `hold_color` is useful or redundant.
3. FBS wall/sector names and how often walls are reset.
4. FBS coordinates, holiday hours, and whether the prices on fkk.no/priser apply to FBS.
5. App name (affects bundle id, deep link scheme and store listings).
6. Expected number of beta users (affects the 500 MB quota).
7. Should new group members see the full chat history (default yes)?
8. Sentry EU data region on the free plan.
9. Oracle A1 capacity in the chosen EU home region at sign-up time.
10. Cross-gym grade comparison when more gyms are added. Options: (a) no comparison, stats per gym only; (b) admin-estimated V range per color, clearly labelled as an estimate; (c) crowd-sourced "føltes som" grades from users, aggregated per grade. Decide before multi-gym.

---

## 16. Later / roadmap

- **Multi-gym and discovery**: search for bouldering gyms near the user with Google Maps/Places, gym creation by admin from a Place ID, opening hours from Places. Requires a Google billing account and quota limits.
- Gym staff role that maintains gym info and boulders.
- Public gym discussion threads (need moderation tooling first), direct messages.
- Time polls and recurring sessions.
- Typing indicators and read receipts in chat.
- Group leaderboards, personal grade opinion ("føltes som V4"), which could also feed an estimated V range for color grades.
- Cross-gym grade comparison (open question 10).
- Automatic face blurring before upload.
- Self-service data export, privacy policy, terms, store listings.
- Server-side media verification (ffprobe) and video variants.
- Real domain with universal links / app links.

---

## 17. Decision log (interview 2026-09-24/25)

| # | Topic | Decision | Main reason |
|---|---|---|---|
| 1 | Project goal | Balanced: own API for the core, managed services for heavy parts | Portfolio value without building auth/video infrastructure |
| 2 | Distribution | Closed beta now, public later with multi-gym | Lower legal and moderation load in beta |
| 3 | Platforms | iOS and Android from day one | Friend group uses both |
| 4 | Social model | Follow with optional private profile (public by default) | Instagram-like, familiar |
| 5 | Backend | ASP.NET Core (.NET 10) + PostgreSQL | .NET is common in Norwegian backend jobs; existing .NET experience |
| 6 | Auth | Managed: Supabase Auth (Apple, Google, email code); API validates JWT via JWKS | No password storage; free tier fits |
| 7 | Video | Compress on device, presigned upload to Cloudflare R2, MP4 playback | Cheapest; no egress fees |
| 8 | Budget | 0 NOK/month (Apple fee excluded) | |
| 9 | Hosting | Oracle Always Free VM with Docker Compose | Always-on server needed for realtime; free |
| 10 | Grades | Gym-specific scale; V range optional and only set when the gym publishes one (revised 2026-09-30) | FBS and most color gyms have no official V mapping, so the app must not invent one |
| 11 | Boulders | Shared boulder entity; anyone creates with duplicate check; anyone archives with undo; admin merges | Enables "who topped this" without an admin bottleneck |
| 12 | Logging | No sessions. Media items carry boulder + result; separate quick log without posting | Matches how the group actually shares |
| 13 | Spoilers | Automatic blur of beta videos for boulders you are projecting | Protects the fun of projecting |
| 14 | Media limits | Video ≤ 60 s, ≤ 5 media per post | Fits one attempt; keeps within 10 GB |
| 15 | Comments | Separate thread per audience | No leaks between groups |
| 16 | Gym page | Only public profile posts | Group content never becomes public by accident |
| 17 | Leaving a group | Content stays | Conversations stay intact |
| 18 | Account deletion | Delete everything; comments/messages become "Slettet melding" | GDPR plus readable threads |
| 19 | Group access | Invite link/QR with expiry and max uses + direct invites; owner/admin/member roles | Controlled growth of groups |
| 20 | Gym info | Admin maintains; users suggest changes | Accurate data without scraping |
| 21 | Conversations | Group chat, comments (beta); gym threads, DMs (later) | |
| 22 | Planning | RSVP sessions and check-in (beta); time polls, recurring (later) | |
| 23 | Offline | Outbox for posts and quick logs; reading needs network | Weak coverage in the gym, without full sync complexity |
| 24 | Notifications | New in group, reactions/replies, planning, friend at gym; configurable | |
| 25 | Age | 16+ | Lower risk with DMs, public profiles and filming |
| 26 | Bystanders | Consent checkbox for profile sharing + fast "Jeg er med i denne" takedown | Children and strangers appear in gym videos |
| 27 | Blocking | Mutual invisibility outside groups; blocker sees collapsed content in shared groups | Groups keep working |
| 28 | Stats | Personal progression only | No competition pressure in v1 |
| 29 | Language | App in Norwegian (i18n-ready), code and docs in English | Readable for employers |
| 30 | Releases | Beta 1 (core social + logging), Beta 2 (chat, sessions, check-in) | Friends get the app sooner |
| 31 | Admin | In-app admin screens | No extra frontend to host |
| 32 | Editing audiences | Allowed; removed audience's thread hidden, restorable for 30 days | Mistakes can be fixed without losing comments |

