-- Make date optional now that meals on deck is a persistent list
ALTER TABLE meals_on_deck ALTER COLUMN date DROP NOT NULL;

-- Add archive support
ALTER TABLE meals_on_deck
  ADD COLUMN IF NOT EXISTS archived    BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
