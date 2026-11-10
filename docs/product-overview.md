# Product overview

## Purpose

df-pmp (Digital Finance – Project Management Platform) is a custom enterprise platform intended to coordinate projects, task lists, meetings, decisions, approvals and follow-up work for Dialog Finance. It is not an off-the-shelf project-management product configuration. Its business rules should be shaped by actual company journeys gathered during discovery.

## Goals

- Provide a central, auditable view of project portfolios and their delivery.
- Support multiple projects, project membership, task lists, tasks, subtasks, assignments, dates, dependencies and progress.
- Support configurable meeting types, initially ITSSC and Operations, with agendas, attendees, attendance, minutes, decisions and action items.
- Let authorized administrators configure roles, permissions, scopes and workflow definitions without a deployment for routine policy changes.
- Connect company identity and Microsoft 365 capabilities through approved Entra ID and Microsoft APIs.
- Preserve clear ownership of data: PostgreSQL for df-pmp business records and SharePoint/OneDrive for managed documents.
- Provide authorized portfolio and operational reporting, including a planned Power BI integration.

## Out of scope for the initial definition

- Finalizing undocumented internal approval or project lifecycle rules.
- Replacing Microsoft 365 document management.
- Duplicating SharePoint document contents in PostgreSQL.
- Assuming all projects, meetings or task lists share one fixed workflow.
- Selecting production infrastructure, retention periods, RPO/RTO or tenant permissions without the relevant bank approvals.

## Initial user groups

The following are illustrative groups, not finalized built-in roles: system/application administrators, PMO administrators, project managers, meeting coordinators, ITSSC and Operations participants, team members, management report consumers and auditors. Actual role names and separation-of-duties rules are open.

## Product principles

1. Entra ID establishes identity; df-pmp authorization determines permitted actions.
2. Backend authorization is authoritative; frontend visibility is only a usability aid.
3. Business configuration is data-driven and validated, versioned and auditable.
4. Workflows and record scopes are explicit, with no implicit access based solely on email domain or UI state.
5. Microsoft integration is centralized behind a dedicated integration boundary.
6. Prefer a simple design until a confirmed journey requires added infrastructure such as Redis or asynchronous workers.

## Success measures to define

Candidate measures include active project coverage, on-time task completion, action-item closure, meeting record completeness, time to prepare portfolio reporting, and audit traceability. Baselines, targets, owners and reporting cadence need stakeholder agreement.
