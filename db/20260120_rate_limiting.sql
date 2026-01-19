-- Migration: Rate Limiting & API Usage Tracking
-- Erstellt: 2026-01-20

-- ============================================
-- 1. Erweitere audit.event_log für Rate Limiting
-- ============================================

-- Neue Spalten hinzufügen (wenn nicht vorhanden)
ALTER TABLE audit.event_log
ADD COLUMN IF NOT EXISTS endpoint TEXT,
ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'api_call';

-- Umbenennung der alten Spalten (falls vorhanden)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'audit' AND table_name = 'event_log' AND column_name = 'meta_json') THEN
    ALTER TABLE audit.event_log RENAME COLUMN meta_json TO payload_json;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Spalte payload_json hinzufügen falls sie nicht existiert
ALTER TABLE audit.event_log
ADD COLUMN IF NOT EXISTS payload_json JSONB;

-- ============================================
-- 2. Index für Rate-Limiting Queries
-- ============================================

-- Index für schnelle Rate-Limit-Checks (User + Endpoint + Zeit)
CREATE INDEX IF NOT EXISTS idx_event_log_rate_limit
ON audit.event_log(user_id, endpoint, created_at DESC)
WHERE endpoint IS NOT NULL;

-- ============================================
-- 3. RLS Policy für Edge Functions (Service Role)
-- ============================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Service can insert event logs" ON audit.event_log;

-- Erlaube Service Role Inserts
CREATE POLICY "Service can insert event logs" ON audit.event_log
  FOR INSERT WITH CHECK (true);

-- Drop existing select policy if it exists
DROP POLICY IF EXISTS "Users can read own event logs" ON audit.event_log;

-- User können nur ihre eigenen Logs lesen
CREATE POLICY "Users can read own event logs" ON audit.event_log
  FOR SELECT USING (user_id = auth.uid());

-- ============================================
-- 4. API Usage Statistik View
-- ============================================

CREATE OR REPLACE VIEW audit.api_usage_hourly AS
SELECT
  user_id,
  endpoint,
  date_trunc('hour', created_at) AS hour,
  COUNT(*) AS request_count,
  COUNT(*) FILTER (WHERE kind = 'api_error') AS error_count
FROM audit.event_log
WHERE endpoint IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id, endpoint, date_trunc('hour', created_at);

COMMENT ON VIEW audit.api_usage_hourly IS 'Stündliche API-Nutzung pro User und Endpoint (letzte 24h)';

-- ============================================
-- 5. Kommentare
-- ============================================

COMMENT ON COLUMN audit.event_log.endpoint IS 'API-Endpoint z.B. goals-setup, daily-checkin';
COMMENT ON COLUMN audit.event_log.kind IS 'Art des Events: api_call, api_error, rate_limit_exceeded';
COMMENT ON INDEX audit.idx_event_log_rate_limit IS 'Optimiert Rate-Limit-Checks pro User und Endpoint';
