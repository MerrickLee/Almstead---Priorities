-- The app reads and writes sort_order on branches and lists.
ALTER TABLE branches ADD COLUMN IF NOT EXISTS sort_order float8 NOT NULL DEFAULT 0;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS sort_order float8 NOT NULL DEFAULT 0;

UPDATE branches SET sort_order = CASE id
  WHEN 'nr' THEN 1024
  WHEN 'ha' THEN 2048
  WHEN 'st' THEN 3072
  WHEN 'nh' THEN 4096
  ELSE sort_order
END
WHERE sort_order = 0;

UPDATE lists SET sort_order = CASE id
  WHEN 'nr-jr' THEN 1024
  WHEN 'nr-mo' THEN 2048
  ELSE sort_order
END
WHERE sort_order = 0;
