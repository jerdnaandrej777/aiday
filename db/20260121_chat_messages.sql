-- Migration: Chat Messages Tabelle für AI-Coaching Chat
-- Datum: 21.01.2026
-- Beschreibung: Speichert Chat-Historie zwischen Nutzer und AI-Coach

-- Chat Messages Tabelle
CREATE TABLE IF NOT EXISTS core.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'ai', 'system')),
  content TEXT NOT NULL,
  context_data JSONB DEFAULT NULL, -- Optional: Kontext-Daten die für diese Nachricht verwendet wurden
  tokens_used INTEGER DEFAULT 0, -- Token-Verbrauch für AI-Antworten
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON core.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON core.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created ON core.chat_messages(user_id, created_at DESC);

-- RLS aktivieren
ALTER TABLE core.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own chat messages" ON core.chat_messages;
CREATE POLICY "Users can view own chat messages"
  ON core.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chat messages" ON core.chat_messages;
CREATE POLICY "Users can insert own chat messages"
  ON core.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own chat messages" ON core.chat_messages;
CREATE POLICY "Users can delete own chat messages"
  ON core.chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Funktion zum Aufräumen alter Chat-Nachrichten (behält die letzten 100 pro User)
CREATE OR REPLACE FUNCTION core.cleanup_old_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM core.chat_messages
  WHERE id IN (
    SELECT id FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
      FROM core.chat_messages
    ) ranked
    WHERE rn > 100
  );
END;
$$;

-- Optional: Kommentar zur Tabelle
COMMENT ON TABLE core.chat_messages IS 'Speichert Chat-Verlauf zwischen Nutzer und AI-Coach für Kontext und Analytics';
COMMENT ON COLUMN core.chat_messages.role IS 'Rolle der Nachricht: user, ai, oder system';
COMMENT ON COLUMN core.chat_messages.context_data IS 'JSON mit Kontext-Daten (Ziele, Habits, Stimmung) die für AI-Antwort verwendet wurden';

-- ============================================
-- Erweitere ai_suggestions CHECK Constraint um 'chat' kind
-- ============================================

-- Entferne altes CHECK Constraint (falls vorhanden)
DO $$
BEGIN
  -- Versuche das Constraint zu entfernen (Name kann variieren)
  ALTER TABLE coach.ai_suggestions DROP CONSTRAINT IF EXISTS ai_suggestions_kind_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Füge neues CHECK Constraint mit 'chat' hinzu
DO $$
BEGIN
  ALTER TABLE coach.ai_suggestions
  ADD CONSTRAINT ai_suggestions_kind_check
  CHECK (kind IN ('plan', 'checkin', 'nudge', 'daily_review', 'goal_clarify', 'goal_plan', 'habit_benefits', 'task_adjust', 'streak_recovery', 'weekly_reflection', 'burnout_assessment', 'chat'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
