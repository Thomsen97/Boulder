# ADR-0007: Background jobs in a Postgres job table with a hosted worker

**Status:** Accepted (2026-09-30)

## Context
Notifications, purges, cleanups and reminders must run after a transaction commits, survive restarts and retry on failure. There is one API instance and one database.

## Decision
A `jobs` table (SPEC 12.5) written in the same transaction as the triggering change (outbox pattern), processed by a hosted `BackgroundService` that claims rows with `FOR UPDATE SKIP LOCKED` and retries with exponential backoff. Handlers are idempotent.

## Alternatives considered
- **Hangfire / Quartz.NET:** feature-rich, but extra schemas and dashboards that are not needed at this scale.
- **Fire-and-forget tasks:** lost on restart, no retries.
- **External queue (Redis, SQS):** extra infrastructure and cost.

## Consequences
- Small amount of custom code that must be well tested (claiming, retries, backoff).
- No dashboard; failed jobs are visible through `last_error` and logs.
