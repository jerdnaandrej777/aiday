-- Migration: Notification Preferences
-- Erstellt: 2026-01-21
-- Feature: Benachrichtigungs-Einstellungen pro User

-- ============================================
-- 1. User Profile: Notification-Felder hinzufügen
-- ============================================

ALTER TABLE core.user_profile
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "push_enabled": true,
  "email_enabled": false,
  "in_app_enabled": true,
  "checkin_reminder": true,
  "checkin_reminder_time": "08:00",
  "evening_review": true,
  "evening_review_time": "20:00",
  "streak_alert": true,
  "achievement_notification": true,
  "weekly_report": true,
  "quiet_hours_enabled": false,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "07:00"
}'::jsonb;

COMMENT ON COLUMN core.user_profile.notification_preferences IS 'JSON mit allen Benachrichtigungs-Einstellungen';

-- ============================================
-- 2. Notification History Tabelle
-- ============================================

CREATE TABLE IF NOT EXISTS notifications.notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,            -- checkin_reminder, achievement, etc.
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  channel TEXT DEFAULT 'in_app',              -- push, email, in_app
  sent_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

-- Kommentare
COMMENT ON TABLE notifications.notification_history IS 'Historie aller gesendeten Benachrichtigungen';

-- Index
CREATE INDEX IF NOT EXISTS idx_notification_history_user
ON notifications.notification_history(user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_history_unread
ON notifications.notification_history(user_id, read_at) WHERE read_at IS NULL;

-- ============================================
-- 3. Row Level Security
-- ============================================

ALTER TABLE notifications.notification_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications.notification_history;
CREATE POLICY "Users can view own notifications" ON notifications.notification_history
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications.notification_history;
CREATE POLICY "Users can update own notifications" ON notifications.notification_history
  FOR UPDATE USING (user_id = auth.uid());

-- Service kann Notifications einfügen
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications.notification_history;
CREATE POLICY "Service can insert notifications" ON notifications.notification_history
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. Grants
-- ============================================

GRANT SELECT, UPDATE ON notifications.notification_history TO authenticated;
GRANT INSERT ON notifications.notification_history TO service_role;

-- ============================================
-- 5. Funktion: Prüfen ob Notification gesendet werden soll
-- ============================================

CREATE OR REPLACE FUNCTION notifications.should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT,
  p_channel TEXT DEFAULT 'in_app'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefs JSONB;
  v_quiet_start TIME;
  v_quiet_end TIME;
  v_current_time TIME := CURRENT_TIME;
  v_in_quiet_hours BOOLEAN := false;
BEGIN
  -- Hole Präferenzen
  SELECT notification_preferences INTO v_prefs
  FROM core.user_profile
  WHERE user_id = p_user_id;

  IF v_prefs IS NULL THEN
    RETURN true; -- Default: senden
  END IF;

  -- Prüfe Quiet Hours
  IF (v_prefs->>'quiet_hours_enabled')::boolean THEN
    v_quiet_start := (v_prefs->>'quiet_hours_start')::TIME;
    v_quiet_end := (v_prefs->>'quiet_hours_end')::TIME;

    -- Prüfe ob aktuelle Zeit in Quiet Hours liegt
    IF v_quiet_start > v_quiet_end THEN
      -- Über Mitternacht (z.B. 22:00 - 07:00)
      v_in_quiet_hours := v_current_time >= v_quiet_start OR v_current_time <= v_quiet_end;
    ELSE
      v_in_quiet_hours := v_current_time >= v_quiet_start AND v_current_time <= v_quiet_end;
    END IF;

    IF v_in_quiet_hours THEN
      RETURN false;
    END IF;
  END IF;

  -- Prüfe Channel
  IF p_channel = 'push' AND NOT (v_prefs->>'push_enabled')::boolean THEN
    RETURN false;
  END IF;

  IF p_channel = 'email' AND NOT (v_prefs->>'email_enabled')::boolean THEN
    RETURN false;
  END IF;

  IF p_channel = 'in_app' AND NOT (v_prefs->>'in_app_enabled')::boolean THEN
    RETURN false;
  END IF;

  -- Prüfe spezifischen Notification-Typ
  CASE p_notification_type
    WHEN 'checkin_reminder' THEN
      RETURN (v_prefs->>'checkin_reminder')::boolean;
    WHEN 'evening_review' THEN
      RETURN (v_prefs->>'evening_review')::boolean;
    WHEN 'streak_alert' THEN
      RETURN (v_prefs->>'streak_alert')::boolean;
    WHEN 'achievement' THEN
      RETURN (v_prefs->>'achievement_notification')::boolean;
    WHEN 'weekly_report' THEN
      RETURN (v_prefs->>'weekly_report')::boolean;
    ELSE
      RETURN true;
  END CASE;
END;
$$;

COMMENT ON FUNCTION notifications.should_send_notification IS 'Prüft ob eine Benachrichtigung gesendet werden soll basierend auf User-Präferenzen';

-- ============================================
-- 6. View: Ungelesene Notifications
-- ============================================

CREATE OR REPLACE VIEW notifications.unread_notifications AS
SELECT
  id,
  user_id,
  notification_type,
  title,
  body,
  data,
  channel,
  sent_at
FROM notifications.notification_history
WHERE read_at IS NULL
ORDER BY sent_at DESC;

COMMENT ON VIEW notifications.unread_notifications IS 'Alle ungelesenen Benachrichtigungen';
