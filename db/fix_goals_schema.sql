-- FIX: Fehlende Spalten und ENUM-Werte für goals Tabelle
-- Führe dieses SQL im Supabase SQL Editor aus

-- 1. Füge in_progress zum goal_status ENUM hinzu
DO $$
BEGIN
  ALTER TYPE core.goal_status ADD VALUE IF NOT EXISTS 'in_progress';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

-- 2. Füge fehlende Spalten zur goals Tabelle hinzu
ALTER TABLE core.goals
ADD COLUMN IF NOT EXISTS target_date DATE;

ALTER TABLE core.goals
ADD COLUMN IF NOT EXISTS is_longterm BOOLEAN DEFAULT false;

ALTER TABLE core.goals
ADD COLUMN IF NOT EXISTS why_important TEXT;

ALTER TABLE core.goals
ADD COLUMN IF NOT EXISTS previous_efforts TEXT;

ALTER TABLE core.goals
ADD COLUMN IF NOT EXISTS believed_steps TEXT;

-- 3. Falls status nicht als ENUM funktioniert, konvertiere zu TEXT
-- (Supabase hat manchmal Probleme mit ENUM-Updates)
DO $$
BEGIN
  -- Prüfe ob status Spalte existiert und aktualisiere sie
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'core'
    AND table_name = 'goals'
    AND column_name = 'status'
  ) THEN
    -- Versuche Typ zu TEXT zu ändern für mehr Flexibilität
    ALTER TABLE core.goals ALTER COLUMN status TYPE TEXT USING status::TEXT;
    ALTER TABLE core.goals ALTER COLUMN status SET DEFAULT 'open';
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Status Spalte konnte nicht geändert werden: %', SQLERRM;
END $$;

-- 4. Verifiziere die Änderungen
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'core' AND table_name = 'goals'
ORDER BY ordinal_position;
