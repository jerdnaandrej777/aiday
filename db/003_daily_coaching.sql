-- Migration: 003_daily_coaching.sql
-- Täglicher Coaching-Flow mit Persönlichkeitsanalyse

-- ============================================
-- 1. Neue Tabelle: core.daily_checkins
-- ============================================
CREATE TABLE IF NOT EXISTS core.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood TEXT CHECK (mood IN ('great', 'good', 'neutral', 'bad', 'terrible')),
  mood_note TEXT,
  done_today TEXT,
  planned_today TEXT,
  energy_level INT CHECK (energy_level >= 1 AND energy_level <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date
ON core.daily_checkins(user_id, date DESC);

-- RLS aktivieren
ALTER TABLE core.daily_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own checkins" ON core.daily_checkins;
CREATE POLICY "Users can view own checkins" ON core.daily_checkins
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own checkins" ON core.daily_checkins;
CREATE POLICY "Users can insert own checkins" ON core.daily_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own checkins" ON core.daily_checkins;
CREATE POLICY "Users can update own checkins" ON core.daily_checkins
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 2. Neue Tabelle: core.personality_insights (versteckt)
-- ============================================
CREATE TABLE IF NOT EXISTS core.personality_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  insight_data JSONB NOT NULL DEFAULT '{}',
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  source_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_personality_insights_user
ON core.personality_insights(user_id, insight_type);

-- RLS aktivieren - KEIN SELECT für User (nur Backend mit Service Role)
ALTER TABLE core.personality_insights ENABLE ROW LEVEL SECURITY;

-- Keine SELECT Policy für User - nur Service Role kann lesen
-- Insert/Update nur durch Service Role

-- ============================================
-- 3. Erweitere core.goals Tabelle
-- ============================================
ALTER TABLE core.goals
ADD COLUMN IF NOT EXISTS why_important TEXT,
ADD COLUMN IF NOT EXISTS previous_efforts TEXT,
ADD COLUMN IF NOT EXISTS believed_steps TEXT,
ADD COLUMN IF NOT EXISTS is_longterm BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_goal_id UUID REFERENCES core.goals(id) ON DELETE SET NULL;

-- Index für Langzeit-Ziele
CREATE INDEX IF NOT EXISTS idx_goals_longterm
ON core.goals(user_id, is_longterm) WHERE is_longterm = true;

-- ============================================
-- 4. Neue Tabelle: core.daily_tasks (Tagesaufgaben aus AI-Plan)
-- ============================================
CREATE TABLE IF NOT EXISTS core.daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES core.goals(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  task_text TEXT NOT NULL,
  task_order INT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  skipped BOOLEAN DEFAULT false,
  skip_reason TEXT,
  ai_generated BOOLEAN DEFAULT true,
  estimated_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Falls Tabelle bereits existiert, Spalte hinzufügen
ALTER TABLE core.daily_tasks
ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 15;

-- Index
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date
ON core.daily_tasks(user_id, date DESC);

-- RLS
ALTER TABLE core.daily_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tasks" ON core.daily_tasks;
CREATE POLICY "Users can view own tasks" ON core.daily_tasks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tasks" ON core.daily_tasks;
CREATE POLICY "Users can insert own tasks" ON core.daily_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON core.daily_tasks;
CREATE POLICY "Users can update own tasks" ON core.daily_tasks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tasks" ON core.daily_tasks;
CREATE POLICY "Users can delete own tasks" ON core.daily_tasks
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 5. Grants für authenticated Role
-- ============================================
GRANT SELECT, INSERT, UPDATE ON core.daily_checkins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.daily_tasks TO authenticated;
-- personality_insights: KEIN Grant für authenticated (nur service_role)

-- ============================================
-- 6. Trigger für updated_at
-- ============================================
CREATE OR REPLACE FUNCTION core.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_personality_insights_updated ON core.personality_insights;
CREATE TRIGGER trg_personality_insights_updated
  BEFORE UPDATE ON core.personality_insights
  FOR EACH ROW EXECUTE FUNCTION core.update_updated_at();
