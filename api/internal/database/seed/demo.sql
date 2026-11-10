-- Demo data for local development and UI preview. Applied only when SEED_DEMO_DATA=true
-- and the database contains no users. Replace with approved onboarding data in other environments.

INSERT INTO roles (key, name, description) VALUES
  ('administrator', 'Administrator', 'Full access for platform administration'),
  ('project_manager', 'Project manager', 'Manage projects, work and meetings'),
  ('team_member', 'Team member', 'View delivery data and update assigned work');

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM roles r CROSS JOIN permissions p WHERE r.key = 'administrator';

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM roles r JOIN permissions p ON p.key IN (
  'project:view', 'project:create', 'project:update', 'work:view', 'work:create', 'work:update',
  'work:delete', 'meeting:view', 'meeting:create', 'meeting:update', 'meeting:delete'
) WHERE r.key = 'project_manager';

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM roles r JOIN permissions p ON p.key IN (
  'project:view', 'work:view', 'work:update', 'meeting:view'
) WHERE r.key = 'team_member';

INSERT INTO users (display_name, email) VALUES
  ('Hasitha Erandika', 'hasitha@example.com'),
  ('Nadeesha Perera', 'nadeesha@example.com'),
  ('Kasun Silva', 'kasun@example.com'),
  ('Amal Jayawardena', 'amal@example.com'),
  ('Ishara Fernando', 'ishara@example.com'),
  ('Thilini de Silva', 'thilini@example.com'),
  ('Ruwan Dias', 'ruwan@example.com');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.key = CASE
  WHEN u.email = 'hasitha@example.com' THEN 'administrator'
  WHEN u.email IN ('nadeesha@example.com', 'kasun@example.com', 'amal@example.com') THEN 'project_manager'
  ELSE 'team_member' END;

INSERT INTO meeting_types (id, name, tone) VALUES
  ('itssc', 'ITSSC', 'blue'),
  ('operations', 'Operations', 'red');

INSERT INTO projects (id, name, description, owner_id, status, tone, progress, start_date, end_date)
SELECT v.id, v.name, v.description, u.id, v.status, v.tone, v.progress, v.start_date::date, v.end_date::date
FROM (VALUES
  ('DF-PROJ-024', 'Digital Onboarding', 'Paperless customer onboarding journey.', 'nadeesha@example.com', 'In progress', 'blue', 72, '2026-09-01', '2026-12-18'),
  ('DF-PROJ-018', 'Branch Transformation', 'Modernised branch service model.', 'kasun@example.com', 'In progress', 'red', 48, '2026-08-15', '2027-01-30'),
  ('DF-PROJ-011', 'Core Banking Upgrade', 'Core platform upgrade and data migration.', 'amal@example.com', 'Planning', 'gold', 31, '2026-10-01', '2027-03-31')
) AS v (id, name, description, owner, status, tone, progress, start_date, end_date)
JOIN users u ON u.email = v.owner;

INSERT INTO work_items (id, project_id, subject, type, status, priority, assignee_id, due_date)
SELECT v.id, v.project, v.subject, v.type, v.status, v.priority, u.id, v.due::date
FROM (VALUES
  ('DF-142', 'DF-PROJ-018', 'Finalize branch operations requirements', 'Task', 'In progress', 'High', 'hasitha@example.com', '2026-11-14'),
  ('DF-138', 'DF-PROJ-024', 'Review vendor security assessment', 'Action', 'At risk', 'High', 'kasun@example.com', '2026-11-12'),
  ('DF-131', 'DF-PROJ-024', 'Prepare UAT test scenarios', 'Task', 'In progress', 'Normal', 'hasitha@example.com', '2026-11-18'),
  ('DF-126', 'DF-PROJ-011', 'Operations steering committee review', 'Milestone', 'To do', 'Normal', 'amal@example.com', '2026-11-20'),
  ('DF-119', 'DF-PROJ-018', 'Publish updated service procedures', 'Task', 'Done', 'Low', 'thilini@example.com', '2026-11-08'),
  ('DF-113', 'DF-PROJ-011', 'Confirm data migration window', 'Action', 'In progress', 'High', 'ruwan@example.com', '2026-11-16')
) AS v (id, project, subject, type, status, priority, assignee, due)
JOIN users u ON u.email = v.assignee;

INSERT INTO meetings (id, title, type_id, project_id, starts_at, ends_at, location, agenda) VALUES
  ('MTG-001', 'ITSSC Project Review', 'itssc', 'DF-PROJ-024', '2026-11-12T10:00:00+05:30', '2026-11-12T11:00:00+05:30', 'Conference Room 2', 'Delivery status and risks'),
  ('MTG-002', 'Operations Weekly Sync', 'operations', 'DF-PROJ-018', '2026-11-14T14:30:00+05:30', '2026-11-14T15:30:00+05:30', 'Microsoft Teams', 'Branch rollout readiness'),
  ('MTG-003', 'Technology Risk Checkpoint', 'itssc', 'DF-PROJ-011', '2026-11-18T09:30:00+05:30', '2026-11-18T10:15:00+05:30', 'Conference Room 1', 'Migration risk review');

INSERT INTO meeting_participants (meeting_id, user_id)
SELECT m.id, u.id FROM meetings m CROSS JOIN users u
WHERE (m.id = 'MTG-001' AND u.email IN ('hasitha@example.com', 'nadeesha@example.com', 'kasun@example.com'))
   OR (m.id = 'MTG-002' AND u.email IN ('kasun@example.com', 'thilini@example.com', 'ruwan@example.com', 'hasitha@example.com'))
   OR (m.id = 'MTG-003' AND u.email IN ('amal@example.com', 'ruwan@example.com'));
