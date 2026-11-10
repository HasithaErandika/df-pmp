-- Microsoft 365 integration, server-side sessions and administration.

-- Base roles exist in every environment (not only demo). Administrators implicitly hold every permission.
INSERT INTO roles (key, name, description) VALUES
  ('administrator', 'Administrator', 'Full access to every feature, including administration'),
  ('project_manager', 'Project manager', 'Manage projects, work, meetings and documents'),
  ('team_member', 'Team member', 'View delivery data and update assigned work')
ON CONFLICT (key) DO NOTHING;

INSERT INTO permissions (key, description) VALUES
  ('user:manage', 'Manage users and role assignments'),
  ('directory:search', 'Search the organization directory and add people'),
  ('document:view', 'View project documents'),
  ('document:upload', 'Upload project documents')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM roles r JOIN permissions p ON p.key IN (
  'project:view', 'project:create', 'project:update', 'work:view', 'work:create', 'work:update',
  'work:delete', 'meeting:view', 'meeting:create', 'meeting:update', 'meeting:delete',
  'directory:search', 'document:view', 'document:upload'
) WHERE r.key = 'project_manager'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM roles r JOIN permissions p ON p.key IN (
  'project:view', 'work:view', 'work:update', 'meeting:view', 'document:view'
) WHERE r.key = 'team_member'
ON CONFLICT DO NOTHING;

-- Server-side sessions (BFF). Only a SHA-256 hash of the cookie value is stored; OAuth tokens are encrypted.
CREATE TABLE sessions (
  id_hash         BYTEA PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  token_encrypted BYTEA
);
CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_expires_idx ON sessions (expires_at);

-- Outlook event linkage. df-pmp is the source of truth; Outlook is updated after each change.
ALTER TABLE meetings
  ADD COLUMN outlook_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN teams_meeting      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN outlook_event_id   TEXT,
  ADD COLUMN outlook_ical_uid   TEXT,
  ADD COLUMN outlook_organizer  BIGINT REFERENCES users (id),
  ADD COLUMN outlook_web_link   TEXT NOT NULL DEFAULT '',
  ADD COLUMN online_meeting_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN sync_status        TEXT NOT NULL DEFAULT 'not_synced'
    CHECK (sync_status IN ('not_synced', 'synced', 'failed')),
  ADD COLUMN sync_error         TEXT NOT NULL DEFAULT '';
CREATE INDEX meetings_ical_uid_idx ON meetings (outlook_ical_uid);

-- SharePoint folder per project (identifiers only; document bodies stay in SharePoint).
ALTER TABLE projects
  ADD COLUMN sharepoint_folder_id  TEXT,
  ADD COLUMN sharepoint_folder_url TEXT NOT NULL DEFAULT '';
