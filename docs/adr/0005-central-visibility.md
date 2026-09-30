# ADR-0005: Central visibility component, 404 policy and authorization matrix tests

**Status:** Accepted (2026-09-30)

## Context
Privacy is the core promise (SPEC goal G2). Posts can have several audiences with separate threads, profiles can be private, blocks behave differently inside and outside groups, and ascents follow their own rule. Scattering these checks across endpoints would make leaks likely and hard to review.

## Decision
- SPEC section 5 is implemented once in `Boulder.Application/Visibility` as EF expressions and small services (`architecture.md` 3.4).
- Handlers must go through it for every read of user content.
- Resources the viewer may not see return 404.
- Every content endpoint has a test in the authorization matrix harness covering all viewer types in SPEC section 11.

## Alternatives considered
- **Checks in each endpoint:** simple at first, error-prone as rules grow.
- **Postgres row-level security:** strong guarantees, but harder to express per-audience threads and block placeholders, and harder to test from .NET.

## Consequences
- Phase 8 builds this before any content endpoint exists.
- New rules are added in one place, with tests.
- The PR reviewer checks for direct queries on content tables that bypass the component.
