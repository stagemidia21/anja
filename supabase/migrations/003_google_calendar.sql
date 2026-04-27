-- Google Calendar tokens
CREATE TABLE IF NOT EXISTS google_tokens (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date   BIGINT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own tokens"
  ON google_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Task scheduling columns
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS scheduled_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS gcal_event_id   TEXT;

CREATE INDEX IF NOT EXISTS tasks_scheduled_at_idx ON tasks (user_id, scheduled_at);
