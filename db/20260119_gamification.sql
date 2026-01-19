-- Migration: Gamification-System (XP, Levels, Achievements)
-- Erstellt: 2026-01-19

-- ============================================
-- 1. User-Profile erweitern (XP und Level)
-- ============================================

ALTER TABLE core.user_profile
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Kommentare zur Dokumentation
COMMENT ON COLUMN core.user_profile.total_xp IS 'Gesammelte Erfahrungspunkte des Users';
COMMENT ON COLUMN core.user_profile.level IS 'Aktuelles Level basierend auf XP. Level = floor(sqrt(total_xp / 100)) + 1';

-- ============================================
-- 2. Achievements/Badges Tabelle
-- ============================================

CREATE TABLE IF NOT EXISTS core.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,        -- Eindeutiger Code: 'first_goal', 'streak_7', etc.
  name TEXT NOT NULL,               -- Anzeigename: 'Erster Schritt'
  description TEXT,                 -- Beschreibung: 'Erstelle dein erstes Ziel'
  icon TEXT,                        -- Emoji oder Icon-Name
  xp_reward INTEGER DEFAULT 0,      -- XP-Belohnung für Achievement
  category TEXT DEFAULT 'general',  -- Kategorie: 'streak', 'tasks', 'goals', 'daily'
  threshold INTEGER,                -- Schwellenwert z.B. 7 für 'streak_7'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Kommentare
COMMENT ON TABLE core.achievements IS 'Definition aller möglichen Achievements/Badges';
COMMENT ON COLUMN core.achievements.code IS 'Eindeutiger Identifier für programmatischen Zugriff';
COMMENT ON COLUMN core.achievements.threshold IS 'Schwellenwert zum Freischalten (z.B. 7 für streak_7)';

-- ============================================
-- 3. User-Achievements (verknüpft User mit Achievements)
-- ============================================

CREATE TABLE IF NOT EXISTS core.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES core.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON core.user_achievements(user_id);

-- Kommentare
COMMENT ON TABLE core.user_achievements IS 'Verknüpfung welcher User welche Achievements freigeschaltet hat';

-- ============================================
-- 4. Row Level Security
-- ============================================

ALTER TABLE core.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievements sind für alle lesbar (öffentliche Liste)
DROP POLICY IF EXISTS "Anyone can read achievements" ON core.achievements;
CREATE POLICY "Anyone can read achievements" ON core.achievements
  FOR SELECT USING (true);

-- User können nur ihre eigenen Achievements lesen
DROP POLICY IF EXISTS "Users can read own achievements" ON core.user_achievements;
CREATE POLICY "Users can read own achievements" ON core.user_achievements
  FOR SELECT USING (user_id = auth.uid());

-- Nur System/Service kann Achievements vergeben (Edge Functions)
DROP POLICY IF EXISTS "Service can insert achievements" ON core.user_achievements;
CREATE POLICY "Service can insert achievements" ON core.user_achievements
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 5. Initial Achievements einfügen
-- ============================================

INSERT INTO core.achievements (code, name, description, icon, xp_reward, category, threshold) VALUES
  -- Ziel-Achievements
  ('first_goal', 'Erster Schritt', 'Erstelle dein erstes Ziel', '🎯', 50, 'goals', 1),
  ('goal_achieved', 'Zielerreicher', 'Erstes Ziel erreicht', '🎉', 200, 'goals', 1),
  ('goals_5', 'Ambitioniert', '5 Ziele erstellt', '🚀', 150, 'goals', 5),
  ('goals_10', 'Visionär', '10 Ziele erstellt', '🌟', 300, 'goals', 10),

  -- Task-Achievements
  ('first_task', 'Macher', 'Erledige deine erste Aufgabe', '✅', 25, 'tasks', 1),
  ('tasks_10', 'Fleißig', '10 Aufgaben erledigt', '⭐', 100, 'tasks', 10),
  ('tasks_50', 'Produktiv', '50 Aufgaben erledigt', '🌟', 300, 'tasks', 50),
  ('tasks_100', 'Unstoppbar', '100 Aufgaben erledigt', '💎', 500, 'tasks', 100),
  ('tasks_500', 'Legende', '500 Aufgaben erledigt', '👑', 1000, 'tasks', 500),

  -- Streak-Achievements
  ('streak_3', 'Dranbleiber', '3 Tage in Folge aktiv', '🔥', 100, 'streak', 3),
  ('streak_7', 'Wochenkämpfer', '7 Tage Streak', '💪', 250, 'streak', 7),
  ('streak_14', 'Zweiwöchler', '14 Tage Streak', '🏅', 500, 'streak', 14),
  ('streak_30', 'Monatsmeister', '30 Tage Streak', '🏆', 1000, 'streak', 30),
  ('streak_100', 'Unsterblich', '100 Tage Streak', '🌈', 5000, 'streak', 100),

  -- Tägliche Achievements
  ('perfect_day', 'Perfekter Tag', 'Alle Tagesaufgaben erledigt', '🌈', 75, 'daily', 1),
  ('early_bird', 'Frühaufsteher', 'Check-in vor 7 Uhr', '🐦', 50, 'daily', 1),
  ('night_owl', 'Nachteule', 'Aufgaben nach 22 Uhr erledigt', '🦉', 50, 'daily', 1)

ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 6. Hilfsfunktion: Level berechnen
-- ============================================

CREATE OR REPLACE FUNCTION core.calculate_level(xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Level 1: 0-99 XP
  -- Level 2: 100-399 XP
  -- Level 3: 400-899 XP
  -- Level n: (n-1)^2 * 100 bis n^2 * 100 - 1
  RETURN FLOOR(SQRT(xp / 100.0)) + 1;
END;
$$;

COMMENT ON FUNCTION core.calculate_level IS 'Berechnet das Level basierend auf XP. Formel: floor(sqrt(xp/100)) + 1';

-- ============================================
-- 7. Trigger: Level automatisch aktualisieren
-- ============================================

CREATE OR REPLACE FUNCTION core.update_user_level()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.level := core.calculate_level(NEW.total_xp);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_user_level ON core.user_profile;
CREATE TRIGGER trigger_update_user_level
  BEFORE UPDATE OF total_xp ON core.user_profile
  FOR EACH ROW
  EXECUTE FUNCTION core.update_user_level();

-- ============================================
-- 8. Hilfsfunktion: XP für nächstes Level
-- ============================================

CREATE OR REPLACE FUNCTION core.xp_for_next_level(current_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- XP benötigt für Level n+1 = n^2 * 100
  RETURN current_level * current_level * 100;
END;
$$;

COMMENT ON FUNCTION core.xp_for_next_level IS 'Gibt die XP zurück, die für das nächste Level benötigt werden';

-- ============================================
-- 9. View: User-Gamification-Statistiken
-- ============================================

CREATE OR REPLACE VIEW core.user_gamification_stats AS
SELECT
  up.user_id,
  up.total_xp,
  up.level,
  core.xp_for_next_level(up.level) AS xp_for_next_level,
  (SELECT COUNT(*) FROM core.user_achievements ua WHERE ua.user_id = up.user_id) AS achievements_count,
  (SELECT COUNT(*) FROM core.achievements) AS total_achievements
FROM core.user_profile up;

COMMENT ON VIEW core.user_gamification_stats IS 'Aggregierte Gamification-Statistiken pro User';
