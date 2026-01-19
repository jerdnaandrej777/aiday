-- Migration: Fix Race Condition bei Task-Generierung
-- Erstellt: 2026-01-19
-- Problem: Wenn daily-start zweimal schnell aufgerufen wird, entstehen doppelte Tasks
-- Lösung: Unique Constraint auf daily_tasks Tabelle

-- Unique Constraint hinzufügen
-- Verhindert doppelte Tasks für denselben User, Ziel, Datum und Task-Text
ALTER TABLE core.daily_tasks
ADD CONSTRAINT IF NOT EXISTS unique_daily_task_per_goal
UNIQUE (user_id, goal_id, date, task_text);

-- Falls der Constraint bereits existiert, ignorieren wir den Fehler
-- PostgreSQL wirft einen Fehler wenn ADD CONSTRAINT IF NOT EXISTS nicht unterstützt wird
-- Alternativ mit DO Block:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_daily_task_per_goal'
    AND conrelid = 'core.daily_tasks'::regclass
  ) THEN
    ALTER TABLE core.daily_tasks
    ADD CONSTRAINT unique_daily_task_per_goal
    UNIQUE (user_id, goal_id, date, task_text);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Index für bessere Performance bei der Constraint-Prüfung
CREATE INDEX IF NOT EXISTS idx_daily_tasks_unique_lookup
ON core.daily_tasks (user_id, goal_id, date, task_text);

-- Kommentar zur Dokumentation
COMMENT ON CONSTRAINT unique_daily_task_per_goal ON core.daily_tasks IS
'Verhindert Race Condition bei mehrfachem Aufruf von daily-start - keine doppelten Tasks';
