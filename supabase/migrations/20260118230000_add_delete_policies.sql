-- Add missing DELETE policies for RLS
-- Migration: 20260118230000_add_delete_policies

-- DELETE Policy für goals Tabelle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'goals_delete' AND tablename = 'goals'
  ) THEN
    CREATE POLICY goals_delete ON core.goals FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- DELETE Policy für ai_suggestions Tabelle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'ai_delete' AND tablename = 'ai_suggestions'
  ) THEN
    CREATE POLICY ai_delete ON coach.ai_suggestions FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- DELETE Policy für action_steps Tabelle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'steps_delete' AND tablename = 'action_steps'
  ) THEN
    CREATE POLICY steps_delete ON core.action_steps FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;
