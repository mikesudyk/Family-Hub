-- Calendar provider connections (Google, Outlook, iCloud)
CREATE TABLE IF NOT EXISTS calendar_connections (
  id           SERIAL PRIMARY KEY,
  family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id    INT  NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  provider     VARCHAR(20) NOT NULL,         -- 'google' | 'outlook' | 'icloud'
  access_token TEXT,
  refresh_token TEXT,
  expires_at   TIMESTAMPTZ,
  calendar_id  VARCHAR(255) DEFAULT 'primary',
  sync_token   VARCHAR(255),                -- Google incremental sync token
  webhook_channel_id  VARCHAR(255),
  webhook_expiry      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, provider)
);

-- Add external tracking columns to calendar_events
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS member_id  INT REFERENCES family_members(id);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS provider    VARCHAR(20);

-- Unique constraint to prevent duplicate synced events
CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_external_idx
  ON calendar_events(family_id, external_id, provider)
  WHERE external_id IS NOT NULL;
