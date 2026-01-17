# Datenbank-Schema

Hinweis: Die vollständige Definition steht in `db/001_init.sql`, `db/002_auth.sql` und `db/003_daily_coaching.sql`.

> **WICHTIG:** Diese Dokumentation ist die Spezifikation. Bei Diskrepanzen zwischen Dokumentation und SQL-Dateien sollten die SQL-Dateien aktualisiert werden.

---

## Schemas
- **core**: Benutzerprofile, Tageseinträge, Ziele, Tasks
- **coach**: AI-Vorschläge
- **notifications**: Push-Tokens
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

  -- Persönliche Daten (NEU)
  age INTEGER,                    -- Alter des Benutzers
  job TEXT,                       -- Beruf
  education TEXT,                 -- Bildungsabschluss
  family_status TEXT,             -- Familienstand
  hobbies TEXT,                   -- Hobbys und Interessen
  strengths TEXT,                 -- Persönliche Stärken
  challenges TEXT,                -- Größte Herausforderungen
  motivation TEXT,                -- Lebensmotto / Antrieb

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
Ziele mit Details für AI-Analyse.

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
  target_date DATE,                   -- Zieldatum
  status TEXT DEFAULT 'open',         -- 'open', 'in_progress', 'achieved', 'not_achieved'

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
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
Tägliche Aufgaben.

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

  ai_generated BOOLEAN DEFAULT false,  -- Von AI erstellt
  estimated_minutes INTEGER,           -- Geschätzte Dauer

  created_at TIMESTAMPTZ DEFAULT now()
);
```

### coach.ai_suggestions
Gespeicherte AI-Vorschläge.

```sql
CREATE TABLE coach.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  kind TEXT NOT NULL,             -- 'goals_setup', 'plan_accepted', 'goal_clarify', etc.
  payload_json JSONB NOT NULL,    -- Plan, Meilensteine, etc.

  model TEXT,                     -- Verwendetes AI-Modell
  tokens_in INTEGER DEFAULT 0,    -- Input-Tokens
  tokens_out INTEGER DEFAULT 0,   -- Output-Tokens

  created_at TIMESTAMPTZ DEFAULT now()
);
```

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

---

## Migrationen

| Datei | Beschreibung |
|-------|--------------|
| `db/001_init.sql` | Hauptschema (Schemas, Tabellen, RLS) |
| `db/002_auth.sql` | Auth Trigger (auto-create profile) |
| `db/003_daily_coaching.sql` | Daily Coaching Tabellen |
| `supabase/migrations/20240103000000_profile_personal.sql` | Persönliche Profildaten |

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

- **Ziel-Limit pro Tag**: Max. 10 Ziele pro Tag (Trigger)
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
