-- Migration: Streak Rescue Feature
-- Erstellt: 2026-01-21
-- Feature: Streak-Wiederherstellung nach verpasstem Tag (max 1x/Monat)

-- ============================================
-- 1. Streak Recovery Tabelle
-- ============================================

CREATE TABLE IF NOT EXISTS core.streak_recoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recovery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  previous_streak INTEGER NOT NULL,           -- Streak vor dem Verlust
  recovered_streak INTEGER NOT NULL,          -- Wiederhergestellter Streak
  recovery_challenge_completed BOOLEAN DEFAULT false,
  challenge_start_date DATE,
  challenge_end_date DATE,                    -- 3 Tage nach Start
  challenge_days_completed INTEGER DEFAULT 0, -- Wie viele Tage geschafft
  bonus_xp_awarded INTEGER DEFAULT 0,         -- Bonus XP bei Erfolg
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Kommentare
COMMENT ON TABLE core.streak_recoveries IS 'Tracker für Streak-Wiederherstellungen (max 1x/Monat)';
COMMENT ON COLUMN core.streak_recoveries.recovery_challenge_completed IS '3-Tage Recovery Challenge erfolgreich?';

-- Index
CREATE INDEX IF NOT EXISTS idx_streak_recoveries_user_date
ON core.streak_recoveries(user_id, recovery_date DESC);

-- ============================================
-- 2. Row Level Security
-- ============================================

ALTER TABLE core.streak_recoveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own recoveries" ON core.streak_recoveries;
CREATE POLICY "Users can view own recoveries" ON core.streak_recoveries
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own recoveries" ON core.streak_recoveries;
CREATE POLICY "Users can insert own recoveries" ON core.streak_recoveries
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own recoveries" ON core.streak_recoveries;
CREATE POLICY "Users can update own recoveries" ON core.streak_recoveries
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- 3. Grants
-- ============================================

GRANT SELECT, INSERT, UPDATE ON core.streak_recoveries TO authenticated;

-- ============================================
-- 4. Funktion: Prüfen ob Recovery verfügbar
-- ============================================

CREATE OR REPLACE FUNCTION core.can_use_streak_recovery(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_last_recovery DATE;
  v_one_month_ago DATE := CURRENT_DATE - INTERVAL '30 days';
BEGIN
  -- Prüfe letzte Recovery
  SELECT recovery_date INTO v_last_recovery
  FROM core.streak_recoveries
  WHERE user_id = p_user_id
  ORDER BY recovery_date DESC
  LIMIT 1;

  -- Wenn keine Recovery existiert oder mehr als 30 Tage her
  IF v_last_recovery IS NULL OR v_last_recovery < v_one_month_ago THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION core.can_use_streak_recovery IS 'Prüft ob User Streak Recovery nutzen kann (max 1x/30 Tage)';

-- ============================================
-- 5. Funktion: Streak Recovery starten
-- ============================================

CREATE OR REPLACE FUNCTION core.start_streak_recovery(
  p_user_id UUID,
  p_previous_streak INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_recovery_id UUID;
  v_can_recover BOOLEAN;
BEGIN
  -- Prüfe ob Recovery möglich
  SELECT core.can_use_streak_recovery(p_user_id) INTO v_can_recover;

  IF NOT v_can_recover THEN
    RAISE EXCEPTION 'Streak Recovery bereits in diesem Monat verwendet';
  END IF;

  -- Erstelle Recovery-Eintrag
  INSERT INTO core.streak_recoveries (
    user_id,
    previous_streak,
    recovered_streak,
    challenge_start_date,
    challenge_end_date
  ) VALUES (
    p_user_id,
    p_previous_streak,
    GREATEST(1, p_previous_streak - 1), -- 1 Tag Abzug
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '3 days'
  )
  RETURNING id INTO v_recovery_id;

  RETURN v_recovery_id;
END;
$$;

COMMENT ON FUNCTION core.start_streak_recovery IS 'Startet die 3-Tage Recovery Challenge';

-- ============================================
-- 6. Streak-spezifische Achievements hinzufügen
-- ============================================

INSERT INTO core.achievements (code, name, description, icon, xp_reward, category, threshold) VALUES
  ('streak_recovered', 'Comeback Kid', 'Streak erfolgreich wiederhergestellt', '🔄', 100, 'streak', 1),
  ('recovery_challenge', 'Durchhalter', '3-Tage Recovery Challenge geschafft', '💪', 200, 'streak', 1)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 7. User Profile: Streak-Felder hinzufügen
-- ============================================

ALTER TABLE core.user_profile
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active_date DATE;

COMMENT ON COLUMN core.user_profile.current_streak IS 'Aktuelle Streak (konsekutive Tage aktiv)';
COMMENT ON COLUMN core.user_profile.best_streak IS 'Längste Streak aller Zeiten';
COMMENT ON COLUMN core.user_profile.last_active_date IS 'Letzter aktiver Tag (für Streak-Berechnung)';
