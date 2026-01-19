-- Migration: Tag-System für Goals
-- Erstellt: 2026-01-20

-- ============================================
-- 1. Goal Tags Tabelle
-- ============================================

CREATE TABLE IF NOT EXISTS core.goal_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES core.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  color TEXT DEFAULT 'blue', -- blue, green, red, yellow, purple, cyan
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(goal_id, tag)
);

-- Kommentare
COMMENT ON TABLE core.goal_tags IS 'Tags/Labels für Ziele zur besseren Organisation';
COMMENT ON COLUMN core.goal_tags.tag IS 'Tag-Name z.B. "dringend", "beruf", "privat"';
COMMENT ON COLUMN core.goal_tags.color IS 'Farbe des Tags: blue, green, red, yellow, purple, cyan';

-- ============================================
-- 2. Indizes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_goal_tags_goal ON core.goal_tags(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_tags_user ON core.goal_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_tags_tag ON core.goal_tags(user_id, tag);

-- ============================================
-- 3. Row Level Security
-- ============================================

ALTER TABLE core.goal_tags ENABLE ROW LEVEL SECURITY;

-- User können nur ihre eigenen Tags sehen
DROP POLICY IF EXISTS "Users can read own tags" ON core.goal_tags;
CREATE POLICY "Users can read own tags" ON core.goal_tags
  FOR SELECT USING (user_id = auth.uid());

-- User können nur für ihre eigenen Goals Tags erstellen
DROP POLICY IF EXISTS "Users can insert own tags" ON core.goal_tags;
CREATE POLICY "Users can insert own tags" ON core.goal_tags
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- User können nur ihre eigenen Tags löschen
DROP POLICY IF EXISTS "Users can delete own tags" ON core.goal_tags;
CREATE POLICY "Users can delete own tags" ON core.goal_tags
  FOR DELETE USING (user_id = auth.uid());

-- User können nur ihre eigenen Tags aktualisieren
DROP POLICY IF EXISTS "Users can update own tags" ON core.goal_tags;
CREATE POLICY "Users can update own tags" ON core.goal_tags
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- 4. Vordefinierte Tags (optional)
-- ============================================

-- View für verfügbare Tag-Farben
CREATE OR REPLACE VIEW core.tag_colors AS
SELECT unnest(ARRAY['blue', 'green', 'red', 'yellow', 'purple', 'cyan']) AS color;

-- View für häufig verwendete Tags eines Users
CREATE OR REPLACE VIEW core.popular_tags AS
SELECT
  user_id,
  tag,
  color,
  COUNT(*) AS usage_count
FROM core.goal_tags
GROUP BY user_id, tag, color
ORDER BY usage_count DESC;

COMMENT ON VIEW core.popular_tags IS 'Zeigt die am häufigsten verwendeten Tags pro User';

-- ============================================
-- 5. Limit: Max 5 Tags pro Goal
-- ============================================

CREATE OR REPLACE FUNCTION core.enforce_max_tags_per_goal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  tag_count INT;
BEGIN
  SELECT COUNT(*) INTO tag_count
  FROM core.goal_tags
  WHERE goal_id = NEW.goal_id;

  IF tag_count >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 Tags pro Ziel erlaubt';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_max_tags_per_goal ON core.goal_tags;
CREATE TRIGGER trg_max_tags_per_goal
  BEFORE INSERT ON core.goal_tags
  FOR EACH ROW
  EXECUTE FUNCTION core.enforce_max_tags_per_goal();
