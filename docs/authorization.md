# Authorization model

## Model

Use database-driven RBAC as the baseline, with scoped assignments and optional ABAC predicates for justified cases. Identity comes from Entra ID; application roles and detailed business permission grants live in PostgreSQL. Entra groups or app roles may complement the model, but should not accidentally override df-pmp's policy.

## Permission vocabulary

Candidate actions include `view`, `create`, `update`, `delete`, `approve`, `assign`, `export`, `manage` and `configure`. Permissions should identify a resource/module and action, with explicit scope constraints where applicable. Naming and granularity should be reviewed against real journeys.

## Candidate scopes

| Scope | Intended boundary |
| --- | --- |
| Global | All records the grant is intended to cover |
| Department | Records within an assigned organizational unit |
| Meeting type | Records of specified configured meeting types |
| Project | Explicitly assigned projects |
| Task | Explicitly assigned tasks or task lists |
| Own records | Records created by the user, only where ownership is the correct policy |

These are examples, not an authorization hierarchy. A grant should not silently widen when a relationship is missing. Define precedence, inheritance and intersection behavior explicitly.

## Evaluation approach

For every protected API operation:

1. Resolve the authenticated subject to an active application user.
2. Load current role grants and relevant scope assignments (with safe cache invalidation if caching is introduced).
3. Check the requested action on the resource type.
4. Check the target record and related attributes against scope and policy conditions.
5. Enforce any separation-of-duties or workflow-state rule.
6. Deny by default and record required security events.

The UI can hide or disable unavailable actions for usability but cannot be relied on for protection. Resource-level checks must avoid insecure direct-object reference vulnerabilities.

## Administration controls

Permission and role changes should require their own configure/manage grants, validation, audit attribution and effective time. Consider preventing removal of the last active system administrator and protecting built-in technical permissions from invalid configuration. Whether dual approval is required is open. Role changes should take effect promptly; if permissions are cached, define invalidation and maximum staleness.

## Open policy items

Role catalog, default onboarding, emergency access, privileged-role review, access recertification, incompatible role combinations, delegate access, temporary grants, user deactivation, group synchronization and row-level reporting policy all require owner decisions.
