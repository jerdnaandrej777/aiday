-- Migration: Task Priorität (3-Stufen System)
-- Erstellt: 2026-01-21
-- Feature: High/Medium/Low Priorität für Tasks mit unterschiedlichen XP

-- ============================================
-- 1. Priorität-Spalte zu daily_tasks hinzufügen
-- ============================================

ALTER TABLE core.daily_tasks
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'
  CHECK (priority IN ('high', 'medium', 'low'));

-- Kommentar
COMMENT ON COLUMN core.daily_tasks.priority IS 'Task-Priorität: high (+20 XP), medium (+10 XP), low (+5 XP)';

-- ============================================
-- 2. XP-Reward-Spalte für variable XP-Vergabe
-- ============================================

ALTER TABLE core.daily_tasks
ADD COLUMN IF NOT EXISTS xp_reward INTEGER;

-- Setze Default-XP basierend auf Priorität für existierende Tasks
UPDATE core.daily_tasks
SET xp_reward = CASE
  WHEN priority = 'high' THEN 20
  WHEN priority = 'medium' THEN 10
  WHEN priority = 'low' THEN 5
  ELSE 10
END
WHERE xp_reward IS NULL;

-- Kommentar
COMMENT ON COLUMN core.daily_tasks.xp_reward IS 'XP-Belohnung bei Completion: high=20, medium=10, low=5';

-- ============================================
-- 3. Trigger: Automatisch XP setzen bei Insert
-- ============================================

CREATE OR REPLACE FUNCTION core.set_task_xp_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.xp_reward IS NULL THEN
    NEW.xp_reward := CASE NEW.priority
      WHEN 'high' THEN 20
      WHEN 'medium' THEN 10
      WHEN 'low' THEN 5
      ELSE 10
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_xp_reward ON core.daily_tasks;
CREATE TRIGGER trg_task_xp_reward
  BEFORE INSERT ON core.daily_tasks
  FOR EACH ROW EXECUTE FUNCTION core.set_task_xp_reward();

-- ============================================
-- 4. Index für Sortierung nach Priorität
-- ============================================

CREATE INDEX IF NOT EXISTS idx_daily_tasks_priority
ON core.daily_tasks(user_id, date, priority);

-- ============================================
-- 5. View: Tasks sortiert nach Priorität
-- ============================================

CREATE OR REPLACE VIEW core.daily_tasks_sorted AS
SELECT
  *,
  CASE priority
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
    ELSE 2
  END AS priority_order
FROM core.daily_tasks
ORDER BY date DESC, priority_order, task_order;

COMMENT ON VIEW core.daily_tasks_sorted IS 'Tasks sortiert nach Priorität (high zuerst)';
