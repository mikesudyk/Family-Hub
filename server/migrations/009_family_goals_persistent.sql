-- Make family goals persistent (not date-scoped)
-- date column is repurposed as created_date
ALTER TABLE family_goals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
