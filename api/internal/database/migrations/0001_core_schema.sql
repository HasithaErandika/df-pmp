-- Core df-pmp schema: identity, authorization, projects, work items, meetings and audit.

CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  display_name  TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
  email         TEXT NOT NULL UNIQUE,
  entra_subject TEXT UNIQUE,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE permissions (
  key         TEXT PRIMARY KEY,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE role_permissions (
  role_id        BIGINT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permissions (key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE user_roles (
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE SEQUENCE project_code_seq START 100;
CREATE TABLE projects (
  id          TEXT PRIMARY KEY DEFAULT 'DF-PROJ-' || lpad(nextval('project_code_seq')::text, 3, '0'),
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  description TEXT NOT NULL DEFAULT '',
  owner_id    BIGINT NOT NULL REFERENCES users (id),
  status      TEXT NOT NULL,
  tone        TEXT NOT NULL DEFAULT 'blue',
  progress    SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE SEQUENCE work_item_code_seq START 200;
CREATE TABLE work_items (
  id          TEXT PRIMARY KEY DEFAULT 'DF-' || nextval('work_item_code_seq')::text,
  project_id  TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  subject     TEXT NOT NULL CHECK (length(subject) BETWEEN 2 AND 200),
  type        TEXT NOT NULL,
  status      TEXT NOT NULL,
  priority    TEXT NOT NULL,
  assignee_id BIGINT REFERENCES users (id),
  due_date    DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX work_items_project_idx ON work_items (project_id);
CREATE INDEX work_items_assignee_idx ON work_items (assignee_id);

CREATE TABLE meeting_types (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  tone TEXT NOT NULL DEFAULT 'blue'
);

CREATE SEQUENCE meeting_code_seq START 100;
CREATE TABLE meetings (
  id         TEXT PRIMARY KEY DEFAULT 'MTG-' || nextval('meeting_code_seq')::text,
  title      TEXT NOT NULL CHECK (length(title) BETWEEN 2 AND 160),
  type_id    TEXT NOT NULL REFERENCES meeting_types (id),
  project_id TEXT REFERENCES projects (id) ON DELETE SET NULL,
  starts_at  TIMESTAMPTZ NOT NULL,
  ends_at    TIMESTAMPTZ NOT NULL,
  location   TEXT NOT NULL DEFAULT '',
  agenda     TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX meetings_starts_at_idx ON meetings (starts_at);

CREATE TABLE meeting_participants (
  meeting_id TEXT NOT NULL REFERENCES meetings (id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users (id),
  PRIMARY KEY (meeting_id, user_id)
);

CREATE TABLE audit_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id    BIGINT REFERENCES users (id),
  action      TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id   TEXT NOT NULL,
  request_id  TEXT NOT NULL DEFAULT '',
  summary     TEXT NOT NULL DEFAULT ''
);
CREATE INDEX audit_events_object_idx ON audit_events (object_type, object_id);

-- Technical permission vocabulary. Roles and grants are data and can change without deployment.
INSERT INTO permissions (key, description) VALUES
  ('project:view', 'View projects'),
  ('project:create', 'Create projects'),
  ('project:update', 'Update projects'),
  ('project:delete', 'Delete projects'),
  ('work:view', 'View work items'),
  ('work:create', 'Create work items'),
  ('work:update', 'Update work items'),
  ('work:delete', 'Delete work items'),
  ('meeting:view', 'View meetings'),
  ('meeting:create', 'Schedule meetings'),
  ('meeting:update', 'Update meetings'),
  ('meeting:delete', 'Cancel meetings'),
  ('audit:view', 'View audit history');
