-- Migration: Habit Benefits (AI-generierte Vorteile)
-- Erstellt: 2026-01-19

-- Spalte für AI-generierte Vorteile hinzufügen
ALTER TABLE core.habits
ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]';

-- Kommentar
COMMENT ON COLUMN core.habits.benefits IS 'AI-generierte Liste von Vorteilen für diese Gewohnheit';
