-- Fix: Fehlende DELETE RLS-Policies für goals und ai_suggestions
-- Erstellt: 2026-01-18

-- 1. DELETE Policy für goals Tabelle
CREATE POLICY IF NOT EXISTS goals_delete ON core.goals
  FOR DELETE
  USING (user_id = auth.uid());

-- 2. DELETE Policy für ai_suggestions Tabelle
CREATE POLICY IF NOT EXISTS ai_delete ON coach.ai_suggestions
  FOR DELETE
  USING (user_id = auth.uid());

-- 3. DELETE Policy für action_steps Tabelle (falls benötigt)
CREATE POLICY IF NOT EXISTS steps_delete ON core.action_steps
  FOR DELETE
  USING (user_id = auth.uid());

-- Hinweis: Diese Policies erlauben Benutzern, ihre eigenen Daten zu löschen.
-- Führe dieses Script im Supabase SQL Editor aus.
