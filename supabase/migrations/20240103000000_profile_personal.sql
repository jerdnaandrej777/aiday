-- Migration: Persönliche Profildaten
-- Fügt neue Felder für Persönlichkeitsanalyse hinzu

-- Neue Spalten zur user_profile Tabelle hinzufügen
ALTER TABLE core.user_profile
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS job TEXT,
ADD COLUMN IF NOT EXISTS education TEXT,
ADD COLUMN IF NOT EXISTS family_status TEXT,
ADD COLUMN IF NOT EXISTS hobbies TEXT,
ADD COLUMN IF NOT EXISTS strengths TEXT,
ADD COLUMN IF NOT EXISTS challenges TEXT,
ADD COLUMN IF NOT EXISTS motivation TEXT;

-- Kommentare für die neuen Felder
COMMENT ON COLUMN core.user_profile.age IS 'Alter des Benutzers';
COMMENT ON COLUMN core.user_profile.job IS 'Beruf des Benutzers';
COMMENT ON COLUMN core.user_profile.education IS 'Bildungsabschluss';
COMMENT ON COLUMN core.user_profile.family_status IS 'Familienstand';
COMMENT ON COLUMN core.user_profile.hobbies IS 'Hobbys und Interessen';
COMMENT ON COLUMN core.user_profile.strengths IS 'Persönliche Stärken';
COMMENT ON COLUMN core.user_profile.challenges IS 'Größte Herausforderungen';
COMMENT ON COLUMN core.user_profile.motivation IS 'Lebensmotto / Antrieb';
