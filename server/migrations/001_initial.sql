-- Aeramea Family Hub — initial schema
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Families ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_name    VARCHAR(100) NOT NULL DEFAULT 'My Hub',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Users (parents with login credentials) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  avatar        VARCHAR(10)  DEFAULT '👨',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Family members (all profiles — parents and kids) ────────────────────────
CREATE TABLE IF NOT EXISTS family_members (
  id         SERIAL PRIMARY KEY,
  family_id  UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,  -- null for kids
  name       VARCHAR(100) NOT NULL,
  avatar     VARCHAR(10)  DEFAULT '👦',
  role       VARCHAR(20)  NOT NULL DEFAULT 'child',  -- 'admin' | 'child'
  tier       VARCHAR(20)  NOT NULL DEFAULT 'child',  -- 'admin' | 'teen' | 'child' | 'infant'
  birthday   DATE,
  sort_order INT          DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Family settings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_settings (
  family_id          UUID PRIMARY KEY REFERENCES families(id) ON DELETE CASCADE,
  countdown_name     VARCHAR(200),
  countdown_date     DATE,
  countdown_mode     VARCHAR(50)  DEFAULT 'birthday',
  bg_image           TEXT,
  print_mode         VARCHAR(50)  DEFAULT 'day',
  active_list_event  JSONB
);

-- ─── Invite tokens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id  UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  email      VARCHAR(255) NOT NULL,
  token      VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  used       BOOLEAN      DEFAULT FALSE,
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  expires_at TIMESTAMPTZ  DEFAULT NOW() + INTERVAL '7 days'
);

-- ─── Chores ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chores (
  id            SERIAL PRIMARY KEY,
  family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id     INT  NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  icon          VARCHAR(10)  DEFAULT '✅',
  time          VARCHAR(50)  DEFAULT 'Any',
  done          BOOLEAN      DEFAULT FALSE,
  done_at       VARCHAR(100),
  fixed         BOOLEAN      DEFAULT FALSE,
  repeat        VARCHAR(50),
  list_event_id BIGINT,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── Chore lists (templates) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chore_lists (
  id         SERIAL PRIMARY KEY,
  family_id  UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name       VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chore_list_items (
  id            SERIAL PRIMARY KEY,
  chore_list_id INT NOT NULL REFERENCES chore_lists(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  icon          VARCHAR(10)  DEFAULT '✅'
);

-- ─── Goals (school goals for kids) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id         SERIAL PRIMARY KEY,
  family_id  UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id  INT  NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  due_date   DATE,
  done       BOOLEAN DEFAULT FALSE
);

-- ─── Family goals (daily shared) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_goals (
  id         SERIAL PRIMARY KEY,
  family_id  UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  text       TEXT NOT NULL,
  done       BOOLEAN DEFAULT FALSE
);

-- ─── Personal to-dos (per member, not day-scoped) ────────────────────────────
CREATE TABLE IF NOT EXISTS personal_todos (
  id         SERIAL PRIMARY KEY,
  family_id  UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id  INT  NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  done       BOOLEAN DEFAULT FALSE
);

-- ─── Parent priorities (per parent, per day) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS parent_priorities (
  id         SERIAL PRIMARY KEY,
  family_id  UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id  INT  NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  text       TEXT NOT NULL,
  done       BOOLEAN DEFAULT FALSE
);

-- ─── Meal library ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_library (
  id          SERIAL PRIMARY KEY,
  family_id   UUID    NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  photo_url   TEXT,
  ingredients TEXT[]  DEFAULT '{}'
);

-- ─── Meals on deck (daily, shared across parents) ────────────────────────────
CREATE TABLE IF NOT EXISTS meals_on_deck (
  id           SERIAL PRIMARY KEY,
  family_id    UUID    NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  date         DATE    NOT NULL,
  title        VARCHAR(200) NOT NULL,
  from_library BOOLEAN DEFAULT FALSE,
  meal_id      INT REFERENCES meal_library(id) ON DELETE SET NULL,
  ingredients  TEXT[]  DEFAULT '{}'
);

-- ─── Meal slots (breakfast / lunch / dinner per day) ─────────────────────────
CREATE TABLE IF NOT EXISTS meal_slots (
  id         SERIAL PRIMARY KEY,
  family_id  UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  slot       VARCHAR(50) NOT NULL,   -- 'Breakfast' | 'Lunch' | 'Dinner'
  value      TEXT,
  UNIQUE (family_id, date, slot)
);

-- ─── Shopping lists ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shopping_lists (
  id         SERIAL PRIMARY KEY,
  family_id  UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name       VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id         SERIAL PRIMARY KEY,
  list_id    INT  NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  family_id  UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name       VARCHAR(200) NOT NULL,
  store      VARCHAR(100),
  url        TEXT,
  checked    BOOLEAN DEFAULT FALSE
);

-- ─── Stores (per family) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
  id         SERIAL PRIMARY KEY,
  family_id  UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  sort_order INT          DEFAULT 0,
  UNIQUE (family_id, name)
);

-- ─── Calendar events (user-added) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id         SERIAL PRIMARY KEY,
  family_id  UUID         NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  date       DATE         NOT NULL,
  title      VARCHAR(200) NOT NULL,
  time       VARCHAR(100),
  color      VARCHAR(50)  DEFAULT 'gray',
  icon       VARCHAR(10)  DEFAULT '📅'
);
