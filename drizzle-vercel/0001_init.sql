CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email_login_enabled INTEGER NOT NULL DEFAULT 1,
  email_verified INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  ea_id TEXT,
  discord_id TEXT UNIQUE,
  avatar_key TEXT,
  role TEXT NOT NULL DEFAULT 'player',
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS admin_invites (
  email TEXT PRIMARY KEY,
  created_by TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_permissions (
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY(user_id, permission)
);
CREATE TABLE IF NOT EXISTS email_verifications (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  ea_id TEXT,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  game TEXT NOT NULL,
  format TEXT NOT NULL,
  fee INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL,
  rules TEXT NOT NULL DEFAULT '',
  prize TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'X1',
  starts_at TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  owner_id TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  game TEXT NOT NULL,
  mode TEXT NOT NULL,
  platform TEXT NOT NULL,
  ea_id TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  roster TEXT NOT NULL DEFAULT '[]',
  crest_key TEXT,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS tournament_groups (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  name TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  UNIQUE(tournament_id, ordinal)
);
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  captain_id TEXT NOT NULL,
  club_id TEXT,
  group_id TEXT,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  ea_id TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL,
  UNIQUE(tournament_id, captain_id)
);
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  group_id TEXT,
  home_id TEXT NOT NULL,
  away_id TEXT NOT NULL,
  home_goals INTEGER,
  away_goals INTEGER,
  home_penalties INTEGER,
  away_penalties INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  round INTEGER NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS bracket_slots (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  round INTEGER NOT NULL,
  slot INTEGER NOT NULL,
  home_id TEXT,
  away_id TEXT,
  winner_id TEXT,
  match_id TEXT UNIQUE,
  UNIQUE(tournament_id, round, slot)
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  home_goals INTEGER NOT NULL,
  away_goals INTEGER NOT NULL,
  home_penalties INTEGER,
  away_penalties INTEGER,
  created_at BIGINT NOT NULL,
  UNIQUE(match_id, user_id)
);
CREATE TABLE IF NOT EXISTS player_stats (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  player_name TEXT NOT NULL DEFAULT '',
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  approved INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS recruitment (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  position TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS recruitment_interest (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE(post_id, user_id)
);