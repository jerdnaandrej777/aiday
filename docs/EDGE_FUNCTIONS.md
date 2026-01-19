# Edge Functions

## Allgemein
- JWT-Validierung erfolgt im Code (nicht durch Supabase)
- **Deployment immer mit `--no-verify-jwt` Flag**
- Antwort-Header enthalten CORS
- Fehlerkonvention: `{ error: string }` mit passenden HTTP-Statuscodes

## Deployment

```bash
# WICHTIG: --no-verify-jwt verwenden (eigene JWT-Validierung im Code)
npx supabase functions deploy --no-verify-jwt
```

## Schema-Verwendung

Alle Datenbankabfragen müssen das Schema explizit angeben:

```typescript
// Core-Tabellen
supabase.schema('core').from('user_profile')
supabase.schema('core').from('day_entries')
supabase.schema('core').from('goals')
supabase.schema('core').from('daily_checkins')
supabase.schema('core').from('daily_tasks')

// Andere Schemas
supabase.schema('coach').from('ai_suggestions')
supabase.schema('notifications').from('push_tokens')
supabase.schema('analytics').from('month_rollup')
supabase.schema('audit').from('event_log')
```

**Wichtig:** Ohne `.schema()` sucht Supabase im `public` Schema und findet die Tabellen nicht!

---

## Daily Coaching Flow (Haupt-Features)

### daily-start
Pfad: `functions/v1/daily-start`
- Methode: GET/POST
- Auth: required
- **Lädt `plan_json` für jedes Ziel für Detailansicht**
- **AUTO-GENERATE: Erstellt automatisch tägliche Tasks für aktive Ziele**
  - Prüft ob Ziele mit `status: 'in_progress'` und `plan_json` existieren
  - Erstellt automatisch Tasks aus `plan_json.daily_tasks` falls für heute keine existieren
  - Tasks werden jeden Tag neu aus dem Plan generiert bis das Ziel erreicht ist
- Response:
```json
{
  "step": "review|checkin|goals|dashboard",
  "data": {
    "checkin_done": true,
    "has_goals": true,
    "pending_review": [],
    "today_tasks": [...],
    "longterm_goals": [
      {
        "id": "uuid",
        "title": "Ziel-Titel",
        "status": "in_progress",
        "target_date": "2024-04-15",
        "plan_json": { ... }  // NEU: Vollständiger AI-Plan
      }
    ],
    "streak": 5
  }
}
```

### daily-checkin
Pfad: `functions/v1/daily-checkin`
- Methode: POST
- Body:
```json
{
  "mood": "great|good|neutral|bad|terrible",
  "mood_note": "Optional text",
  "planned_today": "Optional",
  "energy_level": 1-5
}
```

### goal-clarify
Pfad: `functions/v1/goal-clarify`
- Methode: POST
- Body: `{ "goal_title": "50% mehr verdienen" }`
- AI analysiert Ziel und stellt Kontext-Fragen (z.B. angestellt vs selbstständig)
- Response:
```json
{
  "needs_clarification": true,
  "goal_type": "financial",
  "questions": [
    {"id": "employment_status", "question": "Bist du angestellt oder selbstständig?", "placeholder": "..."}
  ]
}
```

### goals-setup
Pfad: `functions/v1/goals-setup`
- Methode: POST
- Body:
```json
{
  "goals": [{
    "title": "50% mehr verdienen",
    "why_important": "...",
    "previous_efforts": "...",
    "believed_steps": "... + Klarifizierungsantworten"
  }]
}
```
- **Lädt automatisch Profildaten für AI-Personalisierung**
- AI generiert Plan mit Meilensteinen und **detaillierten** täglichen Tasks
- **NEU: Speichert Plan direkt in `goals.plan_json`**
- **WICHTIG: Neue Ziele werden HINZUGEFÜGT, nicht überschrieben!** (seit 2026-01-19)
- Response enthält `requires_acceptance: true`
- **Detaillierte Tasks** beinhalten:
  - `best_time`: Beste Tageszeit (morgens/mittags/abends/flexibel)
  - `steps[]`: Schritt-für-Schritt Anleitung (3-5 Schritte)
  - `why`: Erklärung warum die Aufgabe wichtig ist

### accept-plan
Pfad: `functions/v1/accept-plan`
- Methode: POST
- Body:
```json
{
  "goal_id": "uuid",
  "plan": {
    "duration_weeks": 12,
    "target_date": "2024-04-15",
    "milestones": [...],
    "daily_tasks": [...]
  }
}
```
- Erstellt tägliche Tasks in `daily_tasks` Tabelle
- Aktualisiert Goal-Status auf `in_progress`

### task-update
Pfad: `functions/v1/task-update`
- Methode: POST
- Body: `{ "task_id": "uuid", "action": "complete|uncomplete|delete" }`
- Nur heutige Tasks können bearbeitet werden

### goal-delete
Pfad: `functions/v1/goal-delete`
- Methode: POST
- Auth: required
- Body: `{ "goal_id": "uuid" }`
- Löscht ein Ziel und alle zugehörigen Daten:
  - Tägliche Tasks (`daily_tasks`)
  - AI-Suggestions (`ai_suggestions`)
  - Das Ziel selbst (`goals`)
- Response:
```json
{
  "success": true,
  "message": "Ziel erfolgreich gelöscht",
  "deleted_goal": "Ziel-Titel"
}
```

### goal-regenerate-plan
Pfad: `functions/v1/goal-regenerate-plan`
- Methode: POST
- Auth: required
- Body: `{ "goal_id": "uuid" }`
- Generiert einen neuen AI-Plan für ein bestehendes Ziel ohne Plan
- Lädt Benutzerprofil für Personalisierung
- Speichert Plan direkt in `goals.plan_json`
- Speichert History in `ai_suggestions` mit `kind: 'plan_regenerated'`
- Response:
```json
{
  "success": true,
  "goal_id": "uuid",
  "plan": {
    "duration_weeks": 12,
    "target_date": "2024-04-15",
    "milestones": [...],
    "daily_tasks": [...],
    "weekly_tasks": [...],
    "success_metric": "...",
    "analysis": "...",
    "motivation": "..."
  }
}
```

### daily-review
Pfad: `functions/v1/daily-review`
- Methode: POST
- Body:
```json
{
  "reviews": [{
    "task_id": "uuid",
    "completed": true,
    "blockers": ["keine Zeit"],
    "note": "..."
  }]
}
```

---

## Auth & Profil

### auth-profile
Pfad: `functions/v1/auth-profile`
- **Methode: GET und POST**
- Auth: required

**GET** - Profil abrufen:
```json
{
  "user": { "id": "...", "email": "..." },
  "profile": {
    "user_id": "...",
    "age": 35,
    "job": "Softwareentwickler",
    "education": "Master Informatik",
    "family_status": "Verheiratet",
    "hobbies": "Gaming, Wandern",
    "strengths": "Analytisches Denken",
    "challenges": "Wenig Zeit",
    "motivation": "Work-Life-Balance",
    ...
  }
}
```

**POST** - Profil aktualisieren:
```json
{
  "age": 35,
  "job": "Softwareentwickler",
  "education": "Master Informatik",
  "family_status": "Verheiratet",
  "hobbies": "Gaming, Wandern",
  "strengths": "Analytisches Denken",
  "challenges": "Wenig Zeit",
  "motivation": "Work-Life-Balance"
}
```

Erlaubte Felder für Update:
- `age`, `job`, `education`, `family_status`
- `hobbies`, `strengths`, `challenges`, `motivation`
- `priority_areas`, `motivations`, `time_budget_weekday`
- `energy_peak`, `obstacles`, `coaching_style`

### auth-onboarding
Pfad: `functions/v1/auth-onboarding`
- Methode: POST
- Body: Onboarding-Präferenzen

### auth-delete-account
Pfad: `functions/v1/auth-delete-account`
- Methode: POST
- Body: `{ "confirmation": "DELETE" }`

### auth-export-data
Pfad: `functions/v1/auth-export-data`
- Methode: GET
- GDPR-Datenexport

---

## Legacy / Utilities

> **DEPRECATED:** Die folgenden Functions sind veraltet und werden nicht mehr aktiv verwendet. Nutze stattdessen den neuen Daily Coaching Flow (`daily-start`, `goals-setup`, etc.)

### coach-plan (DEPRECATED)
Pfad: `functions/v1/coach-plan`
- Methode: POST
- Body: `{ date: string (YYYY-MM-DD), goals: Goal[] }`
- **Ersetzt durch:** `goals-setup` + `accept-plan`

### coach-checkin (DEPRECATED)
Pfad: `functions/v1/coach-checkin`
- Methode: POST
- Body: `{ date: string, results: Result[] }`
- **Ersetzt durch:** `daily-checkin` + `daily-review`

### analytics-monthly
Pfad: `functions/v1/analytics-monthly`
- Methode: GET (z. B. ?month=YYYY-MM)
- Auth: required oder CRON

### reminders-dispatch
Pfad: `functions/v1/reminders-dispatch`
- Methode: POST/GET (Server/Scheduled)
- Auth: Service-Role/Intern

---

## AI-Personalisierung in goals-setup

Die `goals-setup` Function lädt automatisch das Benutzerprofil und fügt es dem AI-Prompt hinzu:

```typescript
// goals-setup/index.ts
const { data: userProfile } = await supabase
  .schema('core')
  .from('user_profile')
  .select('age, job, education, family_status, hobbies, strengths, challenges, motivation')
  .eq('user_id', userId)
  .maybeSingle()

// Falls Profildaten vorhanden:
profileContext = `
=== PERSÖNLICHER KONTEXT DES NUTZERS ===
Alter: ${userProfile.age} Jahre
Beruf: ${userProfile.job}
Bildung: ${userProfile.education}
Familienstand: ${userProfile.family_status}
Hobbys: ${userProfile.hobbies}
Stärken: ${userProfile.strengths}
Herausforderungen: ${userProfile.challenges}
Antrieb: ${userProfile.motivation}
===================================
`
```

Die AI nutzt diese Informationen für:
- Realistische Zeitschätzungen (basierend auf Beruf, Familie)
- Passende Aufgaben (basierend auf Hobbys, Stärken)
- Motivierende Nachrichten (basierend auf persönlichem Antrieb)
- Berücksichtigung von Herausforderungen

---

## Datenbank-Anforderungen

### Benötigte Spalten für Edge Functions

Die Edge Functions benötigen bestimmte Spalten in der Datenbank:

**core.goals** (für `daily-start`, `goals-setup`, `accept-plan`):
```sql
-- Falls diese Spalten fehlen, DB-Fix ausführen:
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

-- Status muss TEXT sein (nicht ENUM) für 'in_progress' Support
ALTER TABLE core.goals ALTER COLUMN status TYPE TEXT USING status::TEXT;
```

**core.daily_tasks** (für `accept-plan`):
```sql
ALTER TABLE core.daily_tasks
ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 15;
```

### Vollständiger Fix
Siehe `db/fix_goals_schema.sql` für das komplette Fix-Script.

---

## Troubleshooting

### "Deine Ziele" zeigt keine Ziele
- **Ursache:** `is_longterm` oder `target_date` Spalte fehlt
- **Lösung:** `db/fix_goals_schema.sql` ausführen

### accept-plan gibt "estimated_minutes" Fehler
- **Ursache:** `estimated_minutes` Spalte fehlt in `daily_tasks`
- **Lösung:** `ALTER TABLE core.daily_tasks ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 15;`

### Status 'in_progress' nicht möglich
- **Ursache:** `status` ist ein ENUM ohne 'in_progress' Wert
- **Lösung:** Status zu TEXT konvertieren: `ALTER TABLE core.goals ALTER COLUMN status TYPE TEXT;`
