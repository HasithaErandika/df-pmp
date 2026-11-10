# Workflows and business journeys

## Configurable workflow direction

Do not assume every project, meeting, task list or approval follows the same lifecycle. A workflow definition may describe a subject type, version, states/steps, allowed transitions, required data, responsible role or assignment rule, approval gates, notifications and audit events. The API must validate that a requested transition is allowed for the current instance and actor.

Published definitions should be versioned and immutable. New instances use an explicitly selected active version. Existing-instance migration, cancellation, rollback and emergency override behavior must be defined before implementation. Configuration should be validated before publication and all changes audited.

## Journey discovery order

1. User and administrator access
2. ITSSC and Operations meeting lifecycle
3. Project initiation, assignment, delivery and closure
4. Task-list and task lifecycle
5. Approval, decision, rejection and escalation
6. Microsoft 365 document, calendar and collaboration journeys

## Journey capture template

For each journey, record:

| Prompt | Details to capture |
| --- | --- |
| Name and purpose | Business outcome and trigger |
| Initiator | Person, role, event or external system |
| Actors | Responsible, consulted, informed and approver roles |
| Preconditions | Required records, access and data |
| Information | Required/optional fields, validation and classification |
| Steps and states | Normal path, transitions and responsible actor |
| Decision rules | Approval criteria, rejection, rework and escalation |
| Exceptions | Cancellation, reassignment, overdue, duplicate, outage |
| Notifications | Recipient, channel, timing, content and preference rules |
| Integrations | Graph/SharePoint/Outlook/Teams interaction and failure handling |
| Authorization | Actions and record scopes at each step |
| Audit | Events, actor, timestamp, outcome and evidence needed |
| Completion | Definition of done, downstream effects and retention |

## Initial candidate journeys (not finalized)

- **Meeting:** coordinator schedules a typed meeting; participants and agenda are maintained; minutes, attendance and decisions are recorded; action items are assigned, tracked and optionally linked to projects/tasks.
- **Project:** a project is registered, ownership and membership assigned, task lists configured, work tracked, approved milestones handled where required, and closure recorded.
- **Administration:** an authorized administrator configures roles and scoped grants; changes are validated, applied and audited.

These sketches identify capabilities only. They do not establish who initiates, approves, or receives notifications in Dialog Finance's processes.
