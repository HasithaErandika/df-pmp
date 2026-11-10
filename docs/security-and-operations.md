# Security and operations

**Status:** Requirements direction; production controls must be aligned with Dialog Finance standards.

## Identity and sessions

- Restrict sign-in to the approved Entra tenant and validate token issuer/audience and cryptographic validity.
- Evaluate a Go BFF with secure, HTTP-only, same-site cookies and appropriate CSRF protection. If direct SPA auth is selected, use authorization code with PKCE and approved token handling.
- Define session lifetime, idle timeout, revocation, logout, MFA/Conditional Access dependencies and emergency account procedures with identity owners.
- Do not use a company email suffix as the authentication boundary.

## Application and data security

- Enforce authorization in the API on every operation, including exports and related-object reads.
- Validate inputs, protect against injection and insecure object references, and use least-privileged database credentials.
- Keep secrets out of Git, images, logs and ordinary configuration. Use the bank-approved secret store for production.
- Apply TLS at approved ingress and protect service-to-service traffic according to infrastructure policy.
- Classify fields and files; minimize sensitive data and define retention, deletion, backup and legal-hold rules.
- Audit role/permission changes, authentication/security events and material project, task, meeting and approval transitions.

## Container and infrastructure direction

- Use approved, minimal, pinned images; run services as non-root where feasible.
- Isolate PostgreSQL on a private network; expose only approved ingress endpoints.
- Define health/readiness checks, resource limits, vulnerability scanning, image provenance and patch cadence.
- Keep development, test and production configurations separate; production secrets and data must not be copied into local environments without approval.
- Docker Compose is a development baseline, not an assumption about the bank's production orchestrator or hosting service.

## Reliability and observability

- Emit structured logs with correlation IDs and useful service/module context; redact tokens, credentials and unnecessary sensitive content.
- Define metrics and alerts for API errors/latency, database health, integration failures, sync lag, workflow backlog and authentication events.
- Define database backup frequency, restore testing, recovery point/time objectives, availability targets and incident ownership before launch.
- External integration calls should have timeouts, bounded retries, throttling awareness and idempotent handling where possible.

## Operational questions

Hosting location and residency, network zones, ingress ownership, certificate lifecycle, SIEM integration, audit retention, incident response, disaster recovery, monitoring platform, support hours, release approval and production access controls require infrastructure/security review.
