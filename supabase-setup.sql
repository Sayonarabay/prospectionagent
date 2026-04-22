-- ============================================================
-- VEILLE STUDIO — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── 1. EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search later

-- ── 2. ENUMS ───────────────────────────────────────────────────
CREATE TYPE opportunity_status AS ENUM (
  'detected',
  'qualified',
  'in_progress',
  'submitted',
  'won',
  'lost'
);

CREATE TYPE opportunity_source AS ENUM (
  'boamp',
  'place',
  'maximilien',
  'malt',
  'les_bons_freelances',
  'behance',
  'welcometothejungle',
  'google_alert',
  'linkedin',
  'reseau',
  'manual',
  'autre'
);

-- ── 3. CORE TABLE: opportunities ───────────────────────────────
-- One row = one opportunity/lead
-- user_id links to auth.users (Supabase Auth) for RLS isolation
CREATE TABLE IF NOT EXISTS opportunities (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  title         TEXT NOT NULL,
  organization  TEXT,
  description   TEXT,

  -- Provenance
  source        opportunity_source NOT NULL DEFAULT 'manual',
  source_url    TEXT,
  is_manual     BOOLEAN NOT NULL DEFAULT true,

  -- Qualification
  score         SMALLINT DEFAULT 0 CHECK (score >= 0 AND score <= 10),
  tags          TEXT[] DEFAULT '{}',  -- ['branding', 'web', ...]
  budget        TEXT,
  deadline      DATE,
  location      TEXT,
  attention     TEXT,  -- Warning message shown in detail panel

  -- Pipeline
  status        opportunity_status NOT NULL DEFAULT 'detected',
  position      INTEGER NOT NULL DEFAULT 0,  -- Sort order within column

  -- Notes (flat for now; see notes table below for full history)
  notes         TEXT DEFAULT '',

  -- Timeline stored as JSONB: [{s: 'detected', d: '12 avr.'}, ...]
  timeline      JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  detected_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX opportunities_user_id_idx ON opportunities(user_id);
CREATE INDEX opportunities_status_idx  ON opportunities(status);
CREATE INDEX opportunities_position_idx ON opportunities(user_id, status, position);
CREATE INDEX opportunities_tags_idx    ON opportunities USING gin(tags);
-- Full-text search on title + organization
CREATE INDEX opportunities_fts_idx ON opportunities
  USING gin(to_tsvector('french', coalesce(title,'') || ' ' || coalesce(organization,'')));

-- ── 4. NOTES TABLE (optional, for full note history) ───────────
-- Separate from the flat `notes` field in opportunities.
-- Use this if you want per-note history with timestamps.
CREATE TABLE IF NOT EXISTS notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id  UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX notes_opportunity_id_idx ON notes(opportunity_id);

-- ── 5. TAGS TABLE (optional, for managed tag list) ─────────────
-- The app uses a TEXT[] column directly, but this table lets you
-- manage the allowed tag list and add colors/icons later.
CREATE TABLE IF NOT EXISTS tags (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = system tag
  name       TEXT NOT NULL,
  color_bg   TEXT DEFAULT '#EFEDE8',
  color_text TEXT DEFAULT '#5C5750',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Seed system tags
INSERT INTO tags (name, color_bg, color_text) VALUES
  ('branding',  '#EEF2FD', '#2355E8'),
  ('web',       '#F0EEFA', '#6A20B8'),
  ('editorial', '#FEF3E8', '#C05C00'),
  ('print',     '#E8F5EE', '#1A7A4A'),
  ('sign',      '#FDF8E8', '#927200'),
  ('motion',    '#FDEEEE', '#C02020')
ON CONFLICT DO NOTHING;

-- ── 6. ROW LEVEL SECURITY (RLS) ────────────────────────────────
-- CRITICAL: Each user can only see/modify their own data.

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- opportunities: full CRUD for owner only
CREATE POLICY "opportunities_select" ON opportunities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "opportunities_insert" ON opportunities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "opportunities_update" ON opportunities
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "opportunities_delete" ON opportunities
  FOR DELETE USING (auth.uid() = user_id);

-- notes: owner only
CREATE POLICY "notes_select" ON notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notes_insert" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_delete" ON notes
  FOR DELETE USING (auth.uid() = user_id);

-- tags: system tags visible to all authenticated users; personal tags owner only
CREATE POLICY "tags_select" ON tags
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "tags_insert" ON tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tags_delete" ON tags
  FOR DELETE USING (auth.uid() = user_id);

-- ── 7. REAL-TIME (optional) ────────────────────────────────────
-- Enable real-time updates for the opportunities table.
-- In Supabase Dashboard → Database → Replication → enable opportunities.
-- Then in the app:
--
--   SB.channel('opps')
--     .on('postgres_changes',
--       { event: '*', schema: 'public', table: 'opportunities',
--         filter: `user_id=eq.${user.id}` },
--       payload => { loadData(); }
--     ).subscribe();
