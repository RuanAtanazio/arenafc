ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;

WITH source AS (
  SELECT
    id,
    lower(trim(both '_' from regexp_replace(coalesce(nullif(split_part(email, '@', 1), ''), name, 'jogador'), '[^a-zA-Z0-9_.-]+', '_', 'g'))) AS base
  FROM users
), normalized AS (
  SELECT id, CASE WHEN length(base) < 3 THEN 'player' ELSE left(base, 21) END AS base
  FROM source
), ranked AS (
  SELECT id, base, row_number() OVER (PARTITION BY base ORDER BY id) AS duplicate_number
  FROM normalized
)
UPDATE users AS target
SET username = CASE
  WHEN ranked.duplicate_number = 1 THEN ranked.base
  ELSE left(ranked.base, 21) || '_' || left(md5(ranked.id), 7)
END
FROM ranked
WHERE target.id = ranked.id AND target.username IS NULL;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users(username);
