# Software requirements specification (initial)

**Status:** Proposed baseline for discovery. Requirements are intentionally phrased without inventing internal policy.

## 1. System context

df-pmp consists of a React/TypeScript web application (`web/`), Go REST API (`api/`), PostgreSQL database, Microsoft Entra ID authentication, a centralized Microsoft 365 integration layer and in-application reporting dashboards. Users access the web application through approved enterprise ingress. The API is the policy enforcement and business logic boundary.

## 2. Functional requirements

### Identity and administration

- **FR-IDENT-01:** The system shall authenticate company users through the approved Microsoft Entra ID tenant.
- **FR-IDENT-02:** The system shall map the authenticated subject to a df-pmp user record without using email-domain matching as proof of identity.
- **FR-ADMIN-01:** Authorized administrators shall manage application users, configurable roles, permissions and permitted assignments.
- **FR-ADMIN-02:** Authorized administrators shall be able to change role and permission configuration without an application deployment; changes shall be auditable and take effect promptly.
- **FR-ADMIN-03:** The system shall support multiple role assignments per user, subject to configurable controls and bank segregation-of-duties policy.

### Authorization

- **FR-AUTHZ-01:** The API shall authorize every protected operation and resource access.
- **FR-AUTHZ-02:** Authorization shall evaluate action, resource type and applicable scope; role membership alone shall not imply unrestricted access.
- **FR-AUTHZ-03:** The system shall support an extensible permission vocabulary including view, create, update, delete, approve, assign, export, manage and configure.
- **FR-AUTHZ-04:** Denied operations shall not disclose protected record data and shall be recorded according to the security logging policy.

### Projects and tasks

- **FR-PROJ-01:** Authorized users shall create and manage projects with configurable metadata, ownership, membership, status, dates and priority.
- **FR-PROJ-02:** A project shall contain one or more configurable task lists.
- **FR-TASK-01:** Authorized users shall create tasks and subtasks with assignment, due dates, progress/status and dependency relationships.
- **FR-TASK-02:** The system shall support linking meeting action items to an existing project/task list or creating follow-up work, subject to workflow policy.
- **FR-TASK-03:** The system shall retain meaningful change history for task status, assignment and due-date changes, subject to audit policy.

### Meetings

- **FR-MEET-01:** Authorized users shall manage meetings by configurable meeting type; ITSSC and Operations are the initial examples.
- **FR-MEET-02:** A meeting record shall support schedule, participants, agenda, attendance, minutes, decisions, action items and related document links.
- **FR-MEET-03:** Action items shall support an owner, due date, status and follow-up relationship; exact lifecycle is to be confirmed.
- **FR-MEET-04:** Meeting and action data shall be searchable only within the requesting user's authorized scope.

### Workflow, audit and reporting

- **FR-WF-01:** The platform shall be designed to support configurable workflow definitions, versions, steps, transitions and workflow instances.
- **FR-WF-02:** A workflow configuration change shall not silently rewrite active instances; migration behavior requires explicit policy.
- **FR-AUD-01:** The system shall record attributable audit events for security-sensitive administration and material business changes.
- **FR-REPORT-01:** Authorized reporting consumers shall be able to access approved portfolio and operational metrics through in-application dashboards; Power BI is not required.
- **FR-REPORT-02:** Export and reporting access shall be authorized and auditable.

### Microsoft 365

- **FR-M365-01:** df-pmp shall store stable Microsoft resource identifiers for linked documents and calendar/meeting resources where integration is approved.
- **FR-M365-02:** Microsoft communication shall be mediated through a centralized integration package/service.
- **FR-M365-03:** User-delegated and application-permission operations shall be separate, explicitly configured, and limited to approved use cases.

## 3. Non-functional requirements

- **NFR-SEC-01:** Use secure transport at approved ingress and protect session credentials with bank-approved controls.
- **NFR-SEC-02:** Secrets shall not be committed to source control; production secret storage shall follow bank standards.
- **NFR-SEC-03:** Containers should run as non-root with pinned, approved base images and a private database network.
- **NFR-SEC-04:** Sensitive data access, administrative changes and authorization failures shall be logged without logging credentials or tokens.
- **NFR-PRIV-01:** Collect and retain only data required for approved business purposes; retention and deletion rules require policy input.
- **NFR-REL-01:** Database backup, restoration, recovery objectives and availability targets shall be defined before production.
- **NFR-PERF-01:** Response-time, throughput and concurrency targets shall be agreed using expected user and portfolio volumes.
- **NFR-MAINT-01:** Database changes shall be versioned migrations; API contracts and configuration formats shall be documented.
- **NFR-ACCESS-01:** The web application should meet the organization's adopted accessibility standard.
- **NFR-OBS-01:** Services shall emit structured, correlated application logs and expose health/readiness status consistent with the hosting environment.

## 4. Core data concepts

Users, departments/organizational units, roles, permissions, scopes, projects, project memberships, task lists, tasks, meetings, meeting types, participants, agenda items, minutes, decisions, action items, workflow definitions/versions/instances, external resource links, audit events and notifications. The [data model](data-model.md) describes the initial conceptual relationships.

## 5. Acceptance direction

Before implementation begins, each business journey should identify initiator, actors, required fields, state transitions, authorization scope, approvals/rejections, notifications, exceptions and audit events. Product owners should approve the resulting requirements and policies. No final API contract or production schema is implied by this initial SRS.
