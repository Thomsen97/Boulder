# ADR-0001: Backend on ASP.NET Core (.NET 10) and PostgreSQL

**Status:** Accepted (2026-09-30)

## Context
The project has two goals: a useful app for a friend group, and a portfolio piece for backend developer jobs in Norway. The domain has a non-trivial authorization model (SPEC section 5), realtime chat in B2, and background work. Sebastian has experience with .NET (PageProbe, favorite subject), Node/Express and PostgreSQL.

## Decision
Own API in ASP.NET Core on .NET 10 (LTS) with EF Core and PostgreSQL. SignalR for realtime in B2.

## Alternatives considered
- **Node.js + TypeScript (Fastify/NestJS):** same language as the app and shared types, fastest start. Less aligned with the Norwegian backend job market.
- **Supabase as backend (Postgres + RLS + Edge Functions):** fastest to ship, but little backend code to show, and the privacy model would live in RLS policies that are harder to test and review.

## Consequences
- Two languages in the repo; the contract between them is the generated OpenAPI document (ADR-0006).
- Strong typing, mature testing (xUnit, Testcontainers) and good performance on a small ARM VM.
- Sebastian owns more code, which is the point for the portfolio.
