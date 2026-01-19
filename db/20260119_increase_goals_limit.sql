-- Migration: Erhöhe max Ziele pro Tag von 10 auf 10000
-- Datum: 2026-01-19
-- Grund: App soll unbegrenzt viele Ziele erlauben

-- Ersetze die bestehende Funktion mit neuem Limit
CREATE OR REPLACE FUNCTION core.enforce_max_10_goals_per_day()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt
  FROM core.goals g
  JOIN core.day_entries de ON de.id = g.day_entry_id
  WHERE de.user_id = new.user_id
    AND de.date = (SELECT date FROM core.day_entries WHERE id = new.day_entry_id);

  -- Limit von 10 auf 10000 erhöht
  IF cnt >= 10000 THEN
    RAISE EXCEPTION 'Max 10000 goals per day exceeded';
  END IF;

  RETURN new;
END;
$$;

-- Hinweis: Der Trigger trg_goals_limit muss NICHT geändert werden,
-- da er die aktualisierte Funktion automatisch verwendet.
