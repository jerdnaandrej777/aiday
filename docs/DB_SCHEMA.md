# Datenbank-Schema

Hinweis: Die vollständige Definition steht in `db/001_init.sql`, `db/002_auth.sql` und `db/003_daily_coaching.sql`.

> **WICHTIG:** Diese Dokumentation ist die Spezifikation. Bei Diskrepanzen zwischen Dokumentation und SQL-Dateien sollten die SQL-Dateien aktualisiert werden.

---

## Schemas
- **core**: Benutzerprofile, Tageseinträge, Ziele, Tasks, Achievements, User-Achievements, **Habits**, **Habit_Logs**, **Streak_Recoveries**
- **coach**: AI-Vorschläge
- **notifications**: Push-Tokens, **Notification_History**
- **analytics**: Monatsstatistiken (Materialized View)
- **audit**: Event-Log

---

## Tabellen (Übersicht)

### core.user_profile
Basis-Profil zum Nutzer (auth.users -> core.user_profile via Trigger).

```sql
CREATE TABLE core.user_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),

  -- Präferenzen
  priority_areas TEXT[],
  motivations TEXT,
  time_budget_weekday INTEGER,
  energy_peak TEXT,
  obstacles TEXT[],
  coaching_style TEXT,
  checkin_schedule JSONB,
  constraints_json JSONB,
  quiet_hours JSONB,

  -- Persönliche Daten
  age INTEGER,                    -- Alter des Benutzers
  job TEXT,                       -- Beruf
  education TEXT,                 -- Bildungsabschluss
  family_status TEXT,             -- Familienstand
  hobbies TEXT,                   -- Hobbys und Interessen
  strengths TEXT,                 -- Persönliche Stärken
  challenges TEXT,                -- Größte Herausforderungen
  motivation TEXT,                -- Lebensmotto / Antrieb

  -- Gamification (NEU)
  total_xp INTEGER DEFAULT 0,     -- Gesamte XP
  level INTEGER DEFAULT 1,        -- Aktuelles Level

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### core.day_entries
Tages-Einträge (ein Eintrag pro Tag pro User).

```sql
CREATE TABLE core.day_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);
```

### core.goals
Ziele mit Details für AI-Analyse und integriertem Plan.

```sql
CREATE TABLE core.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  day_entry_id UUID REFERENCES core.day_entries(id),

  title TEXT NOT NULL,
  category TEXT DEFAULT 'general',

  -- Details für AI-Analyse
  why_important TEXT,             -- Warum ist das Ziel wichtig?
  previous_efforts TEXT,          -- Was wurde bisher versucht?
  believed_steps TEXT,            -- Eigene Ideen + Klarifizierungsantworten

  -- Status & Planung
  is_longterm BOOLEAN DEFAULT false,  -- TRUE für Hauptziele
  target_date DATE,                   -- Zieldatum (automatisch aus AI-Plan)
  status TEXT DEFAULT 'open',         -- 'open', 'in_progress', 'achieved', 'not_achieved'

  -- AI-Plan (NEU)
  plan_json JSONB,                    -- Direkt gespeicherter AI-Plan

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**plan_json Struktur:**
```json
{
  "duration_weeks": 12,
  "target_date": "2024-04-15",
  "success_metric": "Messbares Erfolgskriterium",
  "analysis": "AI-Analyse des Ziels",
  "motivation": "Motivierende Nachricht",
  "milestones": [
    { "week": 4, "target": "Zwischenziel", "metric": "Messbar" }
  ],
  "daily_tasks": [
    {
      "task": "Aufgabentext",
      "duration_minutes": 30,
      "frequency": "daily",
      "best_time": "morgens",
      "steps": ["Schritt 1", "Schritt 2"],
      "why": "Warum wichtig"
    }
  ],
  "weekly_tasks": ["Wöchentliche Aufgabe"]
}
```

### core.daily_checkins
Tägliche Check-ins.

```sql
CREATE TABLE core.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  mood TEXT,                      -- 'great', 'good', 'neutral', 'bad', 'terrible'
  mood_note TEXT,                 -- Freitext: Wie geht's?
  planned_today TEXT,             -- Was ist heute geplant?
  energy_level INTEGER,           -- 1-5 Skala

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);
```

### core.daily_tasks
Tägliche Aufgaben (von AI generiert oder manuell erstellt).

```sql
CREATE TABLE core.daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  goal_id UUID REFERENCES core.goals(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  task_text TEXT NOT NULL,        -- Aufgabentext
  task_order INTEGER DEFAULT 0,   -- Reihenfolge

  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  skipped BOOLEAN DEFAULT false,  -- Für Review übersprungen
  skip_reason TEXT,               -- Grund für Überspringen

  ai_generated BOOLEAN DEFAULT true,   -- Von AI erstellt
  estimated_minutes INTEGER DEFAULT 15, -- Geschätzte Dauer in Minuten

  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Hinweis:** Die `estimated_minutes` Spalte muss existieren, da die `accept-plan` Edge Function diese Spalte verwendet. Falls sie fehlt:
```sql
ALTER TABLE core.daily_tasks
ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 15;
```

### coach.ai_suggestions
Gespeicherte AI-Vorschläge und History.

```sql
CREATE TABLE coach.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  goal_id UUID REFERENCES core.goals(id),  -- Optional: Verknüpfung zum Ziel

  kind TEXT NOT NULL,             -- Erlaubte Werte (CHECK Constraint)
  payload_json JSONB NOT NULL,    -- Plan, Meilensteine, etc.

  model TEXT,                     -- Verwendetes AI-Modell
  tokens_in INTEGER DEFAULT 0,    -- Input-Tokens
  tokens_out INTEGER DEFAULT 0,   -- Output-Tokens

  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT ai_suggestions_kind_check CHECK (kind IN (
    'plan',
    'checkin',
    'nudge',
    'goals_setup',
    'plan_accepted',
    'plan_regenerated'
  ))
);
```

**Kind-Werte:**
| Kind | Beschreibung |
|------|--------------|
| `plan` | Legacy: AI-Tagesplan |
| `checkin` | Legacy: AI-Check-in Feedback |
| `nudge` | Push-Notification Vorschlag |
| `goals_setup` | Initiale Ziel-Erstellung mit Plan |
| `plan_accepted` | Akzeptierter Plan |
| `plan_regenerated` | Neu generierter Plan für bestehendes Ziel |

### notifications.push_tokens
Geräte-Tokens für Push-Notifications.

```sql
CREATE TABLE notifications.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  token TEXT NOT NULL,
  platform TEXT NOT NULL,         -- 'ios', 'android', 'web'
  locale TEXT,
  app_version TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### audit.event_log
Ereignisprotokoll.

```sql
CREATE TABLE audit.event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### core.achievements (NEU - Gamification)
Verfügbare Achievements/Badges.

```sql
CREATE TABLE core.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,        -- 'first_goal', 'streak_7', etc.
  name TEXT NOT NULL,               -- 'Erster Schritt'
  description TEXT,                 -- 'Erstelle dein erstes Ziel'
  icon TEXT,                        -- Emoji oder SVG
  xp_reward INTEGER DEFAULT 0,      -- XP für Achievement
  category TEXT DEFAULT 'general',  -- 'streak', 'tasks', 'goals', 'daily'
  threshold INTEGER                 -- z.B. 7 für 'streak_7'
);
```

**17 vordefinierte Achievements:**
| Code | Name | Kategorie | XP |
|------|------|-----------|-----|
| first_goal | Erster Schritt | goals | 50 |
| first_task | Macher | tasks | 25 |
| streak_3 | Dranbleiber | streak | 100 |
| streak_7 | Wochenkämpfer | streak | 250 |
| streak_14 | Zweiwochenmeister | streak | 500 |
| streak_30 | Monatslegende | streak | 1000 |
| tasks_10 | Fleißig | tasks | 100 |
| tasks_25 | Produktiv | tasks | 200 |
| tasks_50 | Effizient | tasks | 300 |
| tasks_100 | Unstoppbar | tasks | 500 |
| goal_achieved | Zielerreicher | goals | 200 |
| perfect_day | Perfekter Tag | daily | 75 |
| early_bird | Frühaufsteher | daily | 50 |
| night_owl | Nachteule | daily | 50 |
| balanced | Ausgeglichen | general | 150 |
| zen_master | Zen-Meister | general | 300 |
| unstoppable | Unaufhaltbar | general | 500 |

### core.user_achievements (NEU - Gamification)
Verdiente Achievements pro User.

```sql
CREATE TABLE core.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES core.achievements(id),
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);
```

### core.habits (NEU - Phase 4)
Wiederkehrende Gewohnheiten.

```sql
CREATE TABLE core.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily',  -- 'daily', 'weekdays', '3x_week', 'weekly'
  target_days INTEGER[] DEFAULT '{1,2,3,4,5,6,0}',  -- 0=So, 1=Mo, ..., 6=Sa
  xp_reward INTEGER DEFAULT 5,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### core.habit_logs (NEU - Phase 4)
Completion-Log für Habits.

```sql
CREATE TABLE core.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES core.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(habit_id, date)
);
```

### core.streak_recoveries (NEU - Phase 5)
Streak Recovery Challenges.

```sql
CREATE TABLE core.streak_recoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recovery_date DATE NOT NULL,
  previous_streak INTEGER NOT NULL,
  recovered_streak INTEGER NOT NULL,
  challenge_start_date DATE,
  challenge_end_date DATE,
  challenge_days_completed INTEGER DEFAULT 0,
  recovery_challenge_completed BOOLEAN DEFAULT false,
  bonus_xp_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### notifications.notification_history (NEU - Phase 7)
Versendete Benachrichtigungen.

```sql
CREATE TABLE notifications.notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,  -- 'checkin_reminder', 'streak_warning', etc.
  title TEXT,
  body TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);
```

### core.user_profile Erweiterungen (NEU - Phase 7)
Notification Preferences als JSONB.

```sql
-- Neue Spalte
ALTER TABLE core.user_profile
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "push_enabled": true,
  "checkin_reminder": true,
  "checkin_reminder_time": "08:00",
  "quiet_hours_enabled": false,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "07:00",
  "streak_warning": true,
  "weekly_report": true,
  "recovery_mode_active": false,
  "recovery_mode_start": null,
  "recovery_mode_end": null,
  "task_reduction_percent": null
}'::jsonb;
```

### core.daily_tasks Erweiterungen (NEU - Phase 4)
Task Priorität und variable XP.

```sql
ALTER TABLE core.daily_tasks
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'
  CHECK (priority IN ('high', 'medium', 'low'));

ALTER TABLE core.daily_tasks
ADD COLUMN IF NOT EXISTS xp_reward INTEGER;
```

**XP nach Priorität:**
| Priorität | XP |
|-----------|-----|
| high | 20 |
| medium | 10 |
| low | 5 |

---

## Migrationen

| Datei | Beschreibung |
|-------|--------------|
| `db/001_init.sql` | Hauptschema (Schemas, Tabellen, RLS) |
| `db/002_auth.sql` | Auth Trigger (auto-create profile) |
| `db/003_daily_coaching.sql` | Daily Coaching Tabellen + Goals-Erweiterungen |
| `db/fix_goals_schema.sql` | **FIX:** Fehlende Spalten (target_date, is_longterm, etc.) |
| `supabase/migrations/20240103000000_profile_personal.sql` | Persönliche Profildaten |
| `supabase/migrations/20260118234500_add_plan_json_to_goals.sql` | **NEU:** plan_json Spalte für goals |
| `supabase/migrations/20260118235600_migrate_plans_to_goals.sql` | **NEU:** Bestehende Pläne migrieren |
| `supabase/migrations/20260119001000_fix_ai_suggestions_kind.sql` | **NEU:** CHECK Constraint erweitern |
| `db/20260119_increase_goals_limit.sql` | Ziel-Limit von 10 auf 10.000 erhöht |
| `db/20260119_fix_task_race_condition.sql` | Unique Constraint für Tasks (Race Condition Fix) |
| `db/20260119_add_idempotency_key.sql` | Idempotency-Key Spalte für Goals |
| `db/20260119_gamification.sql` | Gamification-Schema (XP, Level, Achievements) |
| `supabase/migrations/20260121000000_habit_tracking.sql` | **NEU:** Habits + Habit_Logs Tabellen |
| `supabase/migrations/20260121000001_task_priority.sql` | **NEU:** Task Priorität + XP Reward |
| `supabase/migrations/20260121000002_streak_recovery.sql` | **NEU:** Streak Recovery Tabelle |
| `supabase/migrations/20260121000003_notification_preferences.sql` | **NEU:** Notification Preferences + History |

### Bekannte Schema-Probleme & Fixes

**Problem:** Die `core.goals` Tabelle hat möglicherweise fehlende Spalten, die für den Daily Coaching Flow benötigt werden.

**Symptom:** "Deine Ziele" auf dem Dashboard zeigt keine Ziele an.

**Lösung:** `db/fix_goals_schema.sql` im Supabase SQL Editor ausführen:
```sql
ALTER TABLE core.goals
ADD COLUMN IF NOT EXISTS target_date DATE;

ALTER TABLE core.goals
ADD COLUMN IF NOT EXISTS is_longterm BOOLEAN DEFAULT false;

-- Status zu TEXT für in_progress Support
ALTER TABLE core.goals ALTER COLUMN status TYPE TEXT USING status::TEXT;
```

---

## RLS (Row Level Security)

### Beispiele

```sql
-- user_profile: Nutzer darf nur eigene Zeile lesen/aktualisieren
CREATE POLICY "Users can view own profile" ON core.user_profile
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON core.user_profile
  FOR UPDATE USING (auth.uid() = user_id);

-- goals: Nur eigene Datensätze
CREATE POLICY "Users can manage own goals" ON core.goals
  FOR ALL USING (auth.uid() = user_id);

-- daily_tasks: Nur eigene Tasks
CREATE POLICY "Users can manage own tasks" ON core.daily_tasks
  FOR ALL USING (auth.uid() = user_id);
```

---

## Trigger/Constraints

- **Ziel-Limit pro Tag**: Max. 10.000 Ziele pro Tag (Trigger `enforce_max_10_goals_per_day`)
- **Timestamps**: `updated_at` via Trigger
- **Auto-Profile**: Bei User-Registration wird automatisch Profil erstellt

---

## Migrationen ausführen

```bash
# Lokal
supabase start
supabase db reset

# Cloud
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```
