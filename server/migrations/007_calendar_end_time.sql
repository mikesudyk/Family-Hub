-- Add end_time to calendar_events for storing synced event end times
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS end_time VARCHAR(5);
