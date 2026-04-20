-- ============================================================
-- Studio Veille — Schéma complet Supabase
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: opportunities
-- ============================================================
CREATE TABLE IF NOT EXISTS opportunities (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  client        TEXT,
  source        TEXT NOT NULL DEFAULT 'manual',
  -- Sources: boamp | ao_public | linkedin | malt | lbf | behance | instagram | manual
  source_url    TEXT,
  source_ref    TEXT,           -- Référence BOAMP (ex: 24-12345)
  budget_min    INTEGER,
  budget_max    INTEGER,
  deadline      DATE,
  status        TEXT NOT NULL DEFAULT 'detected',
  -- Statuts: detected | qualified | drafting | sent | won | lost
  priority      TEXT NOT NULL DEFAULT 'medium',
  -- Priorités: high | medium | low
  notes         TEXT,
  tags          TEXT[],
  ao_raw_text   TEXT,           -- Texte brut de l'AO pour l'IA
  ai_analysis   JSONB,          -- Analyse IA stockée
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: opportunity_history
-- ============================================================
CREATE TABLE IF NOT EXISTS opportunity_history (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type     TEXT NOT NULL,
  -- Types: status_change | note_added | document_generated | email_sent | scan_found
  old_value      TEXT,
  new_value      TEXT,
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: documents
-- Les docs générés (emails, lettres, notes d'intention)
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type       TEXT NOT NULL,
  -- Types: email | lettre | note_intention | devis | proposition
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  is_template    BOOLEAN DEFAULT FALSE,
  version        INTEGER DEFAULT 1,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: templates
-- Modèle de réponse du studio (la "plantilla")
-- ============================================================
CREATE TABLE IF NOT EXISTS templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  doc_type    TEXT NOT NULL DEFAULT 'proposition',
  content     TEXT NOT NULL,
  variables   JSONB,
  -- Ex: {"studio_name": "...", "da_name": "...", "tagline": "..."}
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: scan_logs
-- Historique des scans hebdomadaires
-- ============================================================
CREATE TABLE IF NOT EXISTS scan_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sources_scanned TEXT[],
  opportunities_found INTEGER DEFAULT 0,
  new_count       INTEGER DEFAULT 0,
  raw_results     JSONB,
  status          TEXT DEFAULT 'success',
  error_message   TEXT,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  finished_at     TIMESTAMPTZ
);

-- ============================================================
-- TABLE: user_settings
-- Config sources, préférences, clés API
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  studio_name     TEXT DEFAULT 'Mon Studio',
  da_name         TEXT,
  studio_bio      TEXT,
  skills_keywords TEXT[],
  -- Mots-clés pour filtrer les AO
  sources_config  JSONB DEFAULT '{
    "boamp": {"enabled": true, "keywords": ["design graphique", "identité visuelle", "communication"]},
    "ao_public": {"enabled": true, "keywords": ["design", "charte graphique"]},
    "linkedin": {"enabled": true, "keywords": ["directeur artistique", "DA freelance", "brand design"]},
    "malt": {"enabled": true, "keywords": ["design graphique", "branding"]},
    "lbf": {"enabled": true, "keywords": ["design", "graphiste"]},
    "behance": {"enabled": false, "keywords": []},
    "instagram": {"enabled": false, "keywords": []}
  }',
  notification_email TEXT,
  scan_day        INTEGER DEFAULT 1,
  -- 1=lundi, cron chaque lundi
  anthropic_api_key TEXT,
  -- Optionnel: clé perso en override
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
ALTER TABLE opportunities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings       ENABLE ROW LEVEL SECURITY;

-- Policies: chaque user ne voit que SES données
CREATE POLICY "user_own_opportunities"
  ON opportunities FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_own_history"
  ON opportunity_history FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_own_documents"
  ON documents FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_own_templates"
  ON templates FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_own_scan_logs"
  ON scan_logs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_own_settings"
  ON user_settings FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS: updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_opportunities_updated
  BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_templates_updated
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_settings_updated
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION: log d'historique automatique sur changement statut
-- ============================================================
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO opportunity_history (opportunity_id, user_id, event_type, old_value, new_value)
    VALUES (NEW.id, NEW.user_id, 'status_change', OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_opportunity_status_log
  AFTER UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- ============================================================
-- INDEX pour les performances
-- ============================================================
CREATE INDEX idx_opps_user_status   ON opportunities(user_id, status);
CREATE INDEX idx_opps_user_deadline ON opportunities(user_id, deadline);
CREATE INDEX idx_history_opp        ON opportunity_history(opportunity_id);
CREATE INDEX idx_docs_opp           ON documents(opportunity_id);
CREATE INDEX idx_templates_user     ON templates(user_id, doc_type);
