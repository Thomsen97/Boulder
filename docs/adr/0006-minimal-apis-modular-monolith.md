# ADR-0006: Minimal APIs in a modular monolith; OpenAPI as the contract

**Status:** Accepted (2026-09-30)

## Context
One developer, one deployable, many features. The mobile app needs typed access to the API, and the UI-first workflow needs a stable contract once an endpoint exists.

## Decision
- A single ASP.NET Core application, organized by feature across four projects (Api, Application, Domain, Infrastructure).
- Endpoints use Minimal APIs with one endpoint group per feature. Use cases are plain handler classes (no mediator library).
- The built-in OpenAPI generation writes `api/openapi/v1.json`, which is committed. The app generates its types from it (openapi-typescript + openapi-fetch). CI fails on drift in either direction.

## Alternatives considered
- **Controllers:** familiar, but more ceremony for the same result.
- **Microservices:** no benefit at this scale.
- **Hand-written TS types:** drift between API and app is likely.

## Consequences
- Every API change must regenerate the OpenAPI file and the app types in the same PR.
- Endpoint groups stay thin; logic lives in handlers, which are easy to test.
