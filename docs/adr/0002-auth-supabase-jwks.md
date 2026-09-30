# ADR-0002: Supabase Auth for authentication only; API validates JWT via JWKS

**Status:** Accepted (2026-09-30)

## Context
Sign-in must support Apple (required on iOS when Google is offered), Google and email codes. Password storage, resets and token rotation are high-risk to build alone. Budget is 0 NOK/month.

## Decision
Use Supabase Auth (EU region) only for authentication. The app signs in with the Supabase client. The API validates Supabase access tokens (ES256) against the project's JWKS, and owns all user data in its own database. The Supabase database is not used for app data.

## Alternatives considered
- **Own auth (ASP.NET Identity / custom JWT):** more learning, but Sebastian would own password storage, resets and breach risk.
- **Clerk:** ready-made Expo UI components, more vendor lock-in.
- **Auth0:** known from a student project, heavier configuration, stricter free tier.

## Consequences
- Free projects pause after about a week of low database activity: a daily keep-alive job is required (phase 22).
- The API must keep users in sync with auth identities (`auth_subject`) and delete the auth user on account deletion through the admin API.
- Tests use a locally generated ES256 key and JWKS so the production validation path is exercised.
- The built-in email sender is only for testing; custom SMTP (Resend) is configured before beta.
