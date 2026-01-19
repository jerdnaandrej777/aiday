-- Migration: Habit Tracking System
-- Erstellt: 2026-01-21
-- Feature: Wiederkehrende Gewohnheiten mit Streak-Tracking

-- ============================================
-- 1. Habits Tabelle (Gewohnheits-Definition)
-- ============================================

CREATE TABLE IF NOT EXISTS core.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '✨',                    -- Emoji oder Icon
  color TEXT DEFAULT '#6366f1',              -- Farbe für UI
  frequency TEXT NOT NULL DEFAULT 'daily',  -- daily, weekdays, 3x_week, weekly
  target_days INTEGER[] DEFAULT '{1,2,3,4,5,6,0}', -- 0=Sonntag, 1=Montag, etc.
  reminder_time TIME,                        -- Optional: Erinnerungszeit
  xp_reward INTEGER DEFAULT 5,               -- XP pro Completion
  current_streak INTEGER DEFAULT 0,          -- Aktuelle Streak
  best_streak INTEGER DEFAULT 0,             -- Beste Streak aller Zeiten
  total_completions INTEGER DEFAULT 0,       -- Gesamtzahl Completions
  is_active BOOLEAN DEFAULT true,            -- Aktiv oder pausiert
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kommentare
COMMENT ON TABLE core.habits IS 'Definition wiederkehrender Gewohnheiten';
COMMENT ON COLUMN core.habits.frequency IS 'Häufigkeit: daily, weekdays, 3x_week, weekly';
COMMENT ON COLUMN core.habits.target_days IS 'Ziel-Tage: 0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa';

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_habits_user ON core.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_active ON core.habits(user_id, is_active) WHERE is_active = true;

-- ============================================
-- 2. Habit Logs Tabelle (Tägliche Einträge)
-- ============================================

CREATE TABLE IF NOT EXISTS core.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES core.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  skipped BOOLEAN DEFAULT false,
  skip_reason TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(habit_id, date)
);

-- Kommentare
COMMENT ON TABLE core.habit_logs IS 'Tägliche Habit-Completion-Einträge';

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON core.habit_logs(habit_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON core.habit_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_logs_completed ON core.habit_logs(habit_id, completed) WHERE completed = true;

-- ============================================
-- 3. Row Level Security
-- ============================================

ALTER TABLE core.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.habit_logs ENABLE ROW LEVEL SECURITY;

-- Habits Policies
DROP POLICY IF EXISTS "Users can view own habits" ON core.habits;
CREATE POLICY "Users can view own habits" ON core.habits
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own habits" ON core.habits;
CREATE POLICY "Users can insert own habits" ON core.habits
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own habits" ON core.habits;
CREATE POLICY "Users can update own habits" ON core.habits
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own habits" ON core.habits;
CREATE POLICY "Users can delete own habits" ON core.habits
  FOR DELETE USING (user_id = auth.uid());

-- Habit Logs Policies
DROP POLICY IF EXISTS "Users can view own habit logs" ON core.habit_logs;
CREATE POLICY "Users can view own habit logs" ON core.habit_logs
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own habit logs" ON core.habit_logs;
CREATE POLICY "Users can insert own habit logs" ON core.habit_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own habit logs" ON core.habit_logs;
CREATE POLICY "Users can update own habit logs" ON core.habit_logs
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own habit logs" ON core.habit_logs;
CREATE POLICY "Users can delete own habit logs" ON core.habit_logs
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 4. Grants für authenticated Role
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON core.habits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.habit_logs TO authenticated;

-- ============================================
-- 5. Trigger: updated_at für Habits
-- ============================================

DROP TRIGGER IF EXISTS trg_habits_updated_at ON core.habits;
CREATE TRIGGER trg_habits_updated_at
  BEFORE UPDATE ON core.habits
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- ============================================
-- 6. Funktion: Streak berechnen und aktualisieren
-- ============================================

CREATE OR REPLACE FUNCTION core.update_habit_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_habit RECORD;
  v_consecutive_days INTEGER := 0;
  v_check_date DATE;
  v_has_completion BOOLEAN;
BEGIN
  -- Nur bei Completion
  IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
    -- Hole Habit-Details
    SELECT * INTO v_habit FROM core.habits WHERE id = NEW.habit_id;

    -- Zähle konsekutive Tage rückwärts
    v_check_date := NEW.date;
    LOOP
      -- Prüfe ob es einen Eintrag für diesen Tag gibt
      SELECT EXISTS(
        SELECT 1 FROM core.habit_logs
        WHERE habit_id = NEW.habit_id
          AND date = v_check_date
          AND completed = true
      ) INTO v_has_completion;

      IF v_has_completion THEN
        v_consecutive_days := v_consecutive_days + 1;
        v_check_date := v_check_date - INTERVAL '1 day';
      ELSE
        EXIT;
      END IF;

      -- Sicherheit: max 365 Tage zurück
      IF v_consecutive_days > 365 THEN
        EXIT;
      END IF;
    END LOOP;

    -- Update Habit Statistiken
    UPDATE core.habits
    SET
      current_streak = v_consecutive_days,
      best_streak = GREATEST(best_streak, v_consecutive_days),
      total_completions = total_completions + 1,
      updated_at = now()
    WHERE id = NEW.habit_id;

    -- Setze completed_at
    NEW.completed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_habit_log_streak ON core.habit_logs;
CREATE TRIGGER trg_habit_log_streak
  BEFORE INSERT OR UPDATE OF completed ON core.habit_logs
  FOR EACH ROW EXECUTE FUNCTION core.update_habit_streak();

-- ============================================
-- 7. Funktion: Streak bei verpasstem Tag zurücksetzen
-- ============================================

CREATE OR REPLACE FUNCTION core.reset_habit_streaks()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_habit RECORD;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_has_completion BOOLEAN;
BEGIN
  -- Für jeden aktiven Habit prüfen
  FOR v_habit IN SELECT id FROM core.habits WHERE is_active = true
  LOOP
    -- Prüfe ob gestern completed wurde
    SELECT EXISTS(
      SELECT 1 FROM core.habit_logs
      WHERE habit_id = v_habit.id
        AND date = v_yesterday
        AND completed = true
    ) INTO v_has_completion;

    -- Wenn nicht, setze Streak zurück
    IF NOT v_has_completion THEN
      UPDATE core.habits
      SET current_streak = 0, updated_at = now()
      WHERE id = v_habit.id AND current_streak > 0;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION core.reset_habit_streaks IS 'Wird täglich per Cron aufgerufen um Streaks zurückzusetzen';

-- ============================================
-- 8. View: Habit-Statistiken mit Kalender-Daten
-- ============================================

CREATE OR REPLACE VIEW core.habit_calendar AS
SELECT
  h.id AS habit_id,
  h.user_id,
  h.title,
  h.icon,
  h.color,
  h.frequency,
  h.current_streak,
  h.best_streak,
  h.total_completions,
  hl.date,
  COALESCE(hl.completed, false) AS completed,
  hl.note
FROM core.habits h
LEFT JOIN core.habit_logs hl ON hl.habit_id = h.id
WHERE h.is_active = true
ORDER BY h.created_at, hl.date DESC;

COMMENT ON VIEW core.habit_calendar IS 'Kalender-Ansicht für Habit-Tracking';

-- ============================================
-- 9. Limit: Max 20 Habits pro User
-- ============================================

CREATE OR REPLACE FUNCTION core.enforce_max_habits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM core.habits WHERE user_id = NEW.user_id;
  IF cnt >= 20 THEN
    RAISE EXCEPTION 'Maximum of 20 habits per user exceeded';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_habits_limit ON core.habits;
CREATE TRIGGER trg_habits_limit
  BEFORE INSERT ON core.habits
  FOR EACH ROW EXECUTE FUNCTION core.enforce_max_habits();

-- ============================================
-- 10. Habit-spezifische Achievements hinzufügen
-- ============================================

INSERT INTO core.achievements (code, name, description, icon, xp_reward, category, threshold) VALUES
  ('habit_created', 'Gewohnheitstier', 'Erstelle deine erste Gewohnheit', '🔄', 50, 'habits', 1),
  ('habit_streak_7', 'Habit-Woche', '7 Tage Habit-Streak', '📅', 150, 'habits', 7),
  ('habit_streak_30', 'Habit-Meister', '30 Tage Habit-Streak', '🏆', 500, 'habits', 30),
  ('habits_5', 'Multi-Tasker', '5 aktive Gewohnheiten', '🎯', 200, 'habits', 5)
ON CONFLICT (code) DO NOTHING;
