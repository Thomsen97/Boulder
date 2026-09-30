# ADR-0004: Host API and database on an Oracle Always Free VM with Docker Compose

**Status:** Accepted (2026-09-30)

## Context
Realtime chat (SignalR) needs a server that does not sleep. Budget is 0 NOK/month.

## Decision
One Oracle Cloud Always Free Ampere A1 VM (ARM64) in an EU home region, running Docker Compose with Caddy (automatic HTTPS), the API and PostgreSQL. Images are built for arm64 in GitHub Actions and pulled from GHCR.

## Alternatives considered
- **Render free + Neon:** easy deploys, but the API sleeps after inactivity (cold starts, broken realtime connections).
- **Azure App Service F1 + Neon:** native .NET hosting, but limited CPU time per day and no always-on.

## Consequences
- Oracle can reclaim Always Free instances that are idle for 7 days (CPU p95, network and memory all under 20 %), on any account type. Mitigations: right-size the VM, scripted provisioning so it can be rebuilt quickly, backups stored in R2.
- Sebastian operates the server: updates, firewall, backups, restore drills (runbooks in phase 22).
- The home region cannot be changed after sign-up.
