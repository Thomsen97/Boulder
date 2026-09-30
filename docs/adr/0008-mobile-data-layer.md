# ADR-0008: Mobile data layer: TanStack Query, per-feature mock layer, expo-sqlite outbox

**Status:** Accepted (2026-09-30)

## Context
Sebastian prefers building UI first, because the screens reveal what data is actually needed. The app must also queue posts and quick logs when the gym has poor coverage.

## Decision
- Server state in TanStack Query; small local state in Zustand.
- Each feature exposes an interface with a live implementation (generated client) and a mock implementation, selected per feature through `EXPO_PUBLIC_API_MODE` (`architecture.md` 4.2).
- The offline outbox is stored in expo-sqlite, with media files copied into app storage.

## Alternatives considered
- **MSW (mock service worker) for React Native:** mocks at the network level, but more setup and weaker typing of mock data.
- **MMKV or AsyncStorage for the outbox:** simpler key-value storage, but ordering, status queries and partial retries are easier in SQLite.

## Consequences
- Mock data must be kept realistic and close to the API types; the reviewer checks this.
- A feature switches to live in its API phase by changing the mode, not by rewriting screens.
- The UI-first risk (UI assuming data the privacy model cannot provide) is limited because SPEC section 5 is fixed before UI work.
