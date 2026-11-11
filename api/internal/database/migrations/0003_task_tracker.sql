-- Task tracker: delivery task boards (Fintech, Infra) and the release calendar.
-- Replaces the shared Excel trackers; the initial import follows in 0004–0006.

CREATE TABLE tracker_boards (
  key         TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tone        TEXT NOT NULL DEFAULT 'blue',
  position    SMALLINT NOT NULL DEFAULT 0
);

INSERT INTO tracker_boards (key, name, description, tone, position) VALUES
  ('fintech', 'Fintech', 'Core banking, payments and fintech product delivery.', 'blue', 1),
  ('infra', 'Infra', 'Infrastructure, security and operations initiatives.', 'turquoise', 2);

CREATE SEQUENCE tracker_task_code_seq START 1001;
CREATE TABLE tracker_tasks (
  id             TEXT PRIMARY KEY DEFAULT 'TRK-' || nextval('tracker_task_code_seq')::text,
  board          TEXT NOT NULL REFERENCES tracker_boards (key),
  ref_no         INT,
  position       INT NOT NULL DEFAULT 0,
  title          TEXT NOT NULL CHECK (length(title) BETWEEN 2 AND 300),
  owners         TEXT[] NOT NULL DEFAULT '{}',
  bu_owner       TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL,
  -- Current target resolution date (NULL = to be decided) and every earlier target, oldest first.
  target_date    DATE,
  target_history DATE[] NOT NULL DEFAULT '{}',
  remarks        TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ
);
CREATE INDEX tracker_tasks_board_idx ON tracker_tasks (board, position);

-- Progress log: notes plus automatic entries for status and target changes.
CREATE TABLE tracker_task_updates (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id    TEXT NOT NULL REFERENCES tracker_tasks (id) ON DELETE CASCADE,
  author_id  BIGINT REFERENCES users (id) ON DELETE SET NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('created', 'note', 'status', 'target')),
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tracker_task_updates_task_idx ON tracker_task_updates (task_id, created_at DESC);

CREATE SEQUENCE tracker_release_code_seq START 101;
CREATE TABLE tracker_releases (
  id           TEXT PRIMARY KEY DEFAULT 'REL-' || nextval('tracker_release_code_seq')::text,
  release_date DATE NOT NULL,
  title        TEXT NOT NULL CHECK (length(title) BETWEEN 2 AND 300),
  type         TEXT NOT NULL,
  systems      TEXT NOT NULL DEFAULT '',
  layer        TEXT NOT NULL DEFAULT '',
  tech_owner   TEXT NOT NULL DEFAULT '',
  bu_spoc      TEXT NOT NULL DEFAULT '',
  sanity_test  TEXT NOT NULL DEFAULT '',
  qa_spoc      TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL,
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tracker_releases_date_idx ON tracker_releases (release_date);

INSERT INTO permissions (key, description) VALUES
  ('tracker:view', 'View task trackers and the release calendar'),
  ('tracker:create', 'Add tracker tasks and releases'),
  ('tracker:update', 'Update tracker tasks and releases, and post progress notes'),
  ('tracker:delete', 'Delete tracker tasks and releases')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM roles r JOIN permissions p ON p.key LIKE 'tracker:%'
WHERE r.key = 'project_manager'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM roles r JOIN permissions p ON p.key IN ('tracker:view', 'tracker:update')
WHERE r.key = 'team_member'
ON CONFLICT DO NOTHING;
