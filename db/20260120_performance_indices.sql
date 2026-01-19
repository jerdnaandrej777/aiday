-- Migration: Performance-Indizes für häufige Queries
-- Erstellt: 2026-01-20

-- ============================================
-- 1. Indizes für daily_tasks (häufigste Queries)
-- ============================================

-- Index für Tasks nach User und Goal (für Goal-Detail-Ansicht)
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_goal
ON core.daily_tasks(user_id, goal_id);

-- Index für erledigte Tasks nach Datum (für Dashboard/Progress)
CREATE INDEX IF NOT EXISTS idx_daily_tasks_completed
ON core.daily_tasks(user_id, completed, date DESC);

-- Index für Tasks nach Datum (für tägliche Abfragen)
CREATE INDEX IF NOT EXISTS idx_daily_tasks_date
ON core.daily_tasks(user_id, date DESC);

-- ============================================
-- 2. Indizes für goals
-- ============================================

-- Index für Ziele nach Status (für Goals Overview)
CREATE INDEX IF NOT EXISTS idx_goals_status
ON core.goals(user_id, status);

-- Index für Ziele nach day_entry (für tägliche Zuordnung)
CREATE INDEX IF NOT EXISTS idx_goals_day_entry
ON core.goals(day_entry_id);

-- ============================================
-- 3. Indizes für user_achievements
-- ============================================

-- Index für Achievements nach Datum (für Achievement-Timeline)
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned
ON core.user_achievements(user_id, earned_at DESC);

-- ============================================
-- 4. Indizes für daily_checkins
-- ============================================

-- Index für Check-ins nach Datum (für Dashboard/Analytics)
CREATE INDEX IF NOT EXISTS idx_daily_checkins_date
ON core.daily_checkins(user_id, date DESC);

-- ============================================
-- 5. Indizes für day_entries
-- ============================================

-- Index für Einträge nach Datum (für tägliche Abfragen)
CREATE INDEX IF NOT EXISTS idx_day_entries_date
ON core.day_entries(user_id, date DESC);

-- ============================================
-- 6. Kommentare
-- ============================================

COMMENT ON INDEX core.idx_daily_tasks_user_goal IS 'Beschleunigt Goal-Detail-Ansicht und Task-Filterung nach Ziel';
COMMENT ON INDEX core.idx_daily_tasks_completed IS 'Beschleunigt Dashboard-Statistiken und erledigte Tasks Abfragen';
COMMENT ON INDEX core.idx_daily_tasks_date IS 'Beschleunigt tägliche Task-Abfragen';
COMMENT ON INDEX core.idx_goals_status IS 'Beschleunigt Goals Overview nach Status-Filter';
COMMENT ON INDEX core.idx_goals_day_entry IS 'Beschleunigt Ziel-Abfragen nach Tag';
COMMENT ON INDEX core.idx_user_achievements_earned IS 'Beschleunigt Achievement-Timeline und Sortierung';
COMMENT ON INDEX core.idx_daily_checkins_date IS 'Beschleunigt Dashboard-Check-in-Abfragen';
COMMENT ON INDEX core.idx_day_entries_date IS 'Beschleunigt tägliche Eintrags-Abfragen';
