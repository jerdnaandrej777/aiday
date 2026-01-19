-- Migration: Idempotency-Key für Goals
-- Erstellt: 2026-01-19
-- Problem: Doppeltes Absenden = doppelte Einträge
-- Lösung: idempotency_key Spalte mit Index für schnelle Suche

-- Idempotency-Key Spalte hinzufügen
ALTER TABLE core.goals
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Index für schnelle Idempotency-Prüfung
CREATE INDEX IF NOT EXISTS idx_goals_idempotency
ON core.goals (user_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Kommentar zur Dokumentation
COMMENT ON COLUMN core.goals.idempotency_key IS
'Optionaler Key zur Vermeidung von doppelten Einträgen bei erneutem Absenden. Format: user_id-timestamp';
