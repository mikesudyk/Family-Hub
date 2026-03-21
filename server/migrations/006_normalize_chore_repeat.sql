-- Normalize chore repeat values stored in PostgreSQL array format
-- e.g. {"Mon","Wed"} or {Mon,Wed} → ["Mon","Wed"]
UPDATE chores
SET repeat = (
  SELECT json_agg(trim(both '"' from trim(val)))::text
  FROM unnest(string_to_array(trim(both '{}' from repeat), ',')) AS val
)
WHERE repeat IS NOT NULL
  AND repeat NOT IN ('daily', 'once')
  AND repeat NOT LIKE '[%]';
