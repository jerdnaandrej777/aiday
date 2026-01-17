# AIDAY - KI-gestützter Tagesplaner

## Inhaltsverzeichnis

- [Projektübersicht](#projektübersicht)
- [Tech Stack](#tech-stack)
- [Projektstruktur](#projektstruktur)
- [Implementierte Features](#implementierte-features)
- [Datenbank-Schema](#datenbank-schema)
- [Edge Functions](#edge-functions)
- [Frontend (app.html)](#frontend-apphtml)
- [Design-System](#design-system)
- [Deployment](#deployment)

---

## Projektübersicht

AIDAY ist eine Web-App für tägliche Zielplanung mit KI-gestütztem Coaching. Das Backend basiert auf Supabase mit PostgreSQL und Deno Edge Functions.

**Vision:** Nutzer dabei unterstützen, ihre Träume in konkrete Tagesziele zu verwandeln und diese mit Hilfe eines KI-Coaches zu erreichen.

**Aktueller Stand:** Vollständiger täglicher Coaching-Flow mit:
- Check-in (Stimmung, Energie)
- Ziel-Definition mit AI-Klarifizierung
- **Personalisierte Aktionspläne basierend auf Benutzerprofil**
- Tägliche Tasks mit Fortschrittsverfolgung
- Progress-Dashboard mit Statistiken
- **Profil-Screen für persönliche Daten (AI-Personalisierung)**
- **Swipe-Navigation zwischen Screens**
- **Streak-Tracking für aufeinanderfolgende Tage**
- **"Einlogdaten merken" Funktion**
- **Mobile-optimiertes Layout (reduzierte Seitenränder)**

---

## Tech Stack

| Komponente | Technologie |
|------------|-------------|
| Backend | Supabase (Deno Edge Functions) |
| Datenbank | PostgreSQL mit Row Level Security |
| AI | OpenAI GPT-4o-mini |
| Push | Firebase Cloud Messaging (FCM) |
| Validation | Zod Schemas |
| Testing | Postman Collection + HTML Konsolen |
| Auth | Supabase Auth (JWT) |
| Frontend | Single HTML Files (app.html) |

---

## Projektstruktur

```
aiday/
├── supabase/
│   ├── functions/
│   │   ├── _shared/              # Shared Utilities
│   │   │   ├── cors.ts           # CORS Handler
│   │   │   ├── response.ts       # JSON Response Helper
│   │   │   ├── supabase.ts       # Client Factory
│   │   │   ├── validation.ts     # Zod Schemas
│   │   │   ├── openai.ts         # OpenAI Integration + Prompts
│   │   │   └── import_map.json   # Deno Dependencies
│   │   │
│   │   │── # === AUTH ===
│   │   ├── auth-profile/         # GET/POST - Profil abrufen/aktualisieren
│   │   ├── auth-onboarding/      # POST - Profil einrichten
│   │   ├── auth-delete-account/  # POST - GDPR Löschung
│   │   ├── auth-export-data/     # GET - GDPR Export
│   │   │
│   │   │── # === DAILY COACHING FLOW ===
│   │   ├── daily-start/          # GET/POST - Täglicher Flow-Status
│   │   ├── daily-checkin/        # POST - Check-in speichern
│   │   ├── goals-setup/          # POST - Ziele mit AI-Plan erstellen (nutzt Profildaten!)
│   │   ├── goal-clarify/         # POST - AI-Klarifizierungsfragen
│   │   ├── accept-plan/          # POST - Plan akzeptieren & Tasks erstellen
│   │   ├── daily-review/         # POST - Tagesreview
│   │   ├── task-update/          # POST - Task aktualisieren/löschen
│   │   │
│   │   │── # === LEGACY ===
│   │   ├── coach-plan/           # POST - AI Tagesplan (alt)
│   │   ├── coach-checkin/        # POST - AI Check-in (alt)
│   │   ├── analytics-monthly/    # GET - Monatsstatistik
│   │   └── reminders-dispatch/   # POST - Push versenden
│   │
│   └── migrations/
│       └── 20240103000000_profile_personal.sql  # Persönliche Profildaten
│
├── db/                           # SQL Migrations
│   ├── 001_init.sql              # Hauptschema
│   ├── 002_auth.sql              # Auth Trigger
│   └── 003_daily_coaching.sql    # Daily Coaching Tabellen
│
├── docs/                         # Dokumentation
├── postman/                      # API Collection
│
├── app.html                      # HAUPT-APP (Täglicher Coaching-Flow)
├── start-ui.html                 # Onboarding UI (Bokeh-Animationen)
├── test-api.html                 # API Test Konsole (Demo Login)
├── .env.example                  # Umgebungsvariablen
└── README.md                     # Hauptdokumentation
```

---

## Implementierte Features

### Backend (100%)
- [x] User Auth (Signup/Login/Logout via Supabase)
- [x] Onboarding Flow mit Präferenzen
- [x] GDPR-konform (Datenexport + Account-Löschung)
- [x] Audit Logging
- [x] **Profil-System mit persönlichen Daten**

### Daily Coaching Flow (100%)
- [x] Täglicher Check-in (Stimmung, Energie, Notizen)
- [x] Ziel-Definition mit AI-Klarifizierungsfragen
- [x] Kontext-Analyse (Angestellt vs. Selbstständig etc.)
- [x] **Personalisierte Aktionspläne basierend auf Benutzerprofil**
- [x] Automatische Task-Generierung
- [x] Task-Management (Abhaken, Löschen)
- [x] Fortschritts-Dashboard mit Statistiken
- [x] Streak-Berechnung

### AI-Features
- [x] Intelligente Klarifizierungsfragen basierend auf Zieltyp
- [x] Kontext-abhängige Planenerstellung
- [x] Spezifische Tasks statt generischer Phrasen
- [x] Meilenstein-Planung mit Zeitrahmen
- [x] **Personalisierung basierend auf Alter, Beruf, Hobbys etc.**

### Frontend (app.html)
- [x] Dashboard (Hauptscreen nach Login)
- [x] Check-in Screen
- [x] **Review Screen (Aufgaben vom Vortag bewerten)**
- [x] Goals Screen
- [x] Clarify Screen (AI-Fragen)
- [x] Plan Screen (AI-Plan anzeigen)
- [x] Progress Screen (Statistiken)
- [x] Goal Detail Screen
- [x] **Profile Screen (persönliche Daten)**
- [x] **SVG-Icons statt Emojis**
- [x] **Gradient-Buttons (Blau-Cyan, 30px border-radius)**
- [x] **Abgerundeter Header (24px)**
- [x] **Unified "Zurück"-Button (transparent, 30px border-radius)**
- [x] **Swipe-Navigation (links/rechts wischen)**
- [x] **Streak-Tracking-Anzeige**
- [x] **Mobile-optimiert (reduzierte Seitenränder, 12px padding)**

### Frontend (start-ui.html)
- [x] Onboarding Slides mit Bokeh-Animationen
- [x] Login/Register Screens
- [x] **"Einlogdaten merken" Checkbox**
- [x] **Erweiterte Hintergrund-Animationen (5 Orbs)**
- [x] **Mobile-optimiertes Layout (max-width: 500px)**
- [x] **Konsistente Button-Styles (30px border-radius)**

---

## Edge Functions

### Daily Coaching Flow (Haupt-Features)

| Function | Methode | Beschreibung |
|----------|---------|--------------|
| `daily-start` | GET/POST | Gibt aktuellen Flow-Status zurück (step: review/checkin/goals/dashboard) |
| `daily-checkin` | POST | Speichert Check-in (mood, energy, notes) |
| `goal-clarify` | POST | Analysiert Ziel und stellt Klarifizierungsfragen |
| `goals-setup` | POST | Erstellt Ziele und generiert AI-Plan mit Meilensteinen (**nutzt Profildaten**) |
| `accept-plan` | POST | Akzeptiert Plan und erstellt tägliche Tasks |
| `task-update` | POST | Task aktualisieren (complete/uncomplete) oder löschen |
| `daily-review` | POST | Tagesreview mit Blocker-Analyse |

### Auth & Profil

| Function | Methode | Beschreibung |
|----------|---------|--------------|
| `auth-profile` | **GET/POST** | Benutzerprofil abrufen oder aktualisieren |
| `auth-onboarding` | POST | Profil nach Registration einrichten |
| `auth-delete-account` | POST | Account löschen (GDPR) |
| `auth-export-data` | GET | Alle Daten exportieren (GDPR) |

### Legacy / Utilities

| Function | Methode | Beschreibung |
|----------|---------|--------------|
| `coach-plan` | POST | AI-generierter Tagesplan (alt) |
| `coach-checkin` | POST | AI-Feedback nach Check-in (alt) |
| `analytics-monthly` | GET | Monatsstatistik abrufen |
| `reminders-dispatch` | POST | Push-Notifications versenden |

### Wichtig: Schema-Verwendung in Functions
Alle Datenbankabfragen müssen das Schema explizit angeben:
```typescript
// RICHTIG
supabase.schema('core').from('user_profile')
supabase.schema('coach').from('ai_suggestions')
supabase.schema('notifications').from('push_tokens')
supabase.schema('analytics').from('month_rollup')
supabase.schema('audit').from('event_log')

// FALSCH (sucht in public schema)
supabase.from('user_profile')
```

---

## Datenbank-Schema

### Schemas
- **core**: user_profile, day_entries, goals, action_steps, daily_checkins, daily_tasks
- **coach**: ai_suggestions
- **notifications**: push_tokens
- **analytics**: month_rollup (Materialized View)
- **audit**: event_log

### Wichtige Tabellen

```sql
-- Benutzer & Profil (ERWEITERT)
core.user_profile     -- Benutzerpräferenzen + persönliche Daten
  - age               -- Alter (INTEGER)
  - job               -- Beruf (TEXT)
  - education         -- Bildungsabschluss (TEXT)
  - family_status     -- Familienstand (TEXT)
  - hobbies           -- Hobbys und Interessen (TEXT)
  - strengths         -- Persönliche Stärken (TEXT)
  - challenges        -- Größte Herausforderungen (TEXT)
  - motivation        -- Lebensmotto/Antrieb (TEXT)

core.day_entries      -- Ein Eintrag pro Tag pro User

-- Ziele (erweitert)
core.goals            -- Langzeit-Ziele mit Details
  - is_longterm       -- TRUE für Hauptziele
  - target_date       -- Zieldatum
  - why_important     -- Motivation
  - previous_efforts  -- Bisherige Versuche
  - believed_steps    -- Eigene Ideen + Klarifizierungsantworten
  - status            -- 'open', 'in_progress', 'achieved', 'not_achieved'

-- Daily Coaching
core.daily_checkins   -- Tägliche Check-ins
  - mood              -- 'great', 'good', 'neutral', 'bad', 'terrible'
  - energy_level      -- 1-5
  - mood_note         -- Freitext

core.daily_tasks      -- Tägliche Aufgaben
  - task_text         -- Aufgabentext
  - completed         -- Boolean
  - completed_at      -- Timestamp
  - goal_id           -- Verknüpfung zum Ziel
  - ai_generated      -- TRUE wenn von AI erstellt
  - estimated_minutes -- Geschätzte Dauer
  - skipped           -- Für Review übersprungen

-- AI & Coaching
coach.ai_suggestions  -- Gespeicherte AI-Vorschläge
  - kind              -- 'goals_setup', 'plan_accepted', 'goal_clarify', etc.
  - payload_json      -- Plan, Meilensteine, etc.
```

### Migrationen

| Datei | Beschreibung |
|-------|--------------|
| `db/001_init.sql` | Hauptschema |
| `db/002_auth.sql` | Auth Trigger |
| `db/003_daily_coaching.sql` | Daily Coaching Tabellen |
| `supabase/migrations/20240103000000_profile_personal.sql` | **Persönliche Profildaten** |

### Row Level Security
Alle Tabellen haben RLS aktiviert. Benutzer können nur ihre eigenen Daten sehen/bearbeiten.

---

## AI-Integration (OpenAI GPT-4o-mini)

### Architektur
```
Frontend (app.html) → Edge Functions (Backend) → OpenAI API
                              ↓
                    Profildaten für Personalisierung
```

**Wichtig:** Der OpenAI API-Key ist nur im Backend (Edge Functions) verfügbar, NICHT im Frontend!

### AI-Personalisierung (NEU)
Die `goals-setup` Function lädt automatisch das Benutzerprofil und fügt es dem AI-Prompt hinzu:

```typescript
// goals-setup/index.ts
const { data: userProfile } = await supabase
  .schema('core')
  .from('user_profile')
  .select('age, job, education, family_status, hobbies, strengths, challenges, motivation')
  .eq('user_id', userId)
  .maybeSingle()

// Profilkontext im Prompt:
profileContext = `
=== PERSÖNLICHER KONTEXT DES NUTZERS ===
Alter: 35 Jahre
Beruf: Softwareentwickler
Bildung: Master Informatik
Familienstand: Verheiratet, 2 Kinder
Hobbys: Gaming, Wandern
Stärken: Analytisches Denken
Herausforderungen: Wenig Zeit
Antrieb: Work-Life-Balance
===================================
`
```

### Task-Generierung
Basierend auf Kontext + Profil erstellt die AI:
- **SPEZIFISCHE** tägliche Aufgaben (keine generischen Phrasen)
- **MESSBARE** Meilensteine mit Zeitrahmen
- **KONTEXT-ABHÄNGIGE** Vorschläge

**Verboten:**
- "Nimm dir 10 Minuten Zeit..."
- "Reflektiere über..."
- "Denke nach über..."

**Gut:**
- "Dokumentiere 1 konkreten Arbeitserfolg" (Angestellter)
- "Kontaktiere 3 potenzielle Kunden" (Selbstständiger)
- "Ersetze Abendessen durch Salat mit Protein" (Abnehmen)

---

## UI-Design

### Screens in app.html

| Screen | Beschreibung |
|--------|--------------|
| **Dashboard ("aiday")** | Übersicht mit Quick Actions, Tasks, Ziele |
| Check-in | Stimmung, Energie, Notizen |
| Goals | Ziel mit Details eingeben |
| Clarify | AI-Klarifizierungsfragen beantworten |
| Plan | AI-Plan mit Meilensteinen prüfen |
| Progress | Statistiken, alle Ziele |
| Goal Detail | Ziel-Details mit Plan und Tasks |
| **Profile ("Mein Profil")** | Persönliche Daten bearbeiten |

### Globaler Header
Der Header mit "aiday", "Mein Fortschritt" Button und "Abmelden" ist auf allen Screens sichtbar (außer Loading-Screen). Die Abstände sind so gewählt, dass "aiday" bündig mit dem Card-Rand ist.

### Design-System
- **Dark-First**: Dunkler Hintergrund (#0a0a0f)
- **Glassmorphism**: Transparente Cards mit Blur
- **SVG-Icons**: Konsistente Stroke-based Icons
- **Animierte Slider-Cards**: Hover/Active-Effekte
- **Unified "Zurück"-Button**: Transparent, 30px border-radius, innerhalb der Cards
- **Gradient-Buttons**: `linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)`
- **Abgerundete Buttons**: Alle Buttons 30px border-radius
- **Globaler Header**: Auf allen Screens sichtbar (außer Loading)
- **Abgerundeter Header**: 24px border-radius unten
- **Einheitliche Abstände**: 28px links/rechts für Header, App-body, Screens
- **Card-Padding**: 16px innen für konsistente Textausrichtung

### SVG-Icons (statt Emojis)
Alle Icons sind als inline SVG implementiert mit:
- `stroke="currentColor"`
- `stroke-width="2"`
- `fill="none"`

### Hintergrund-Animationen (start-ui.html)
- **5 Ambient Orbs**: Dezente, langsam schwebende Farbkreise
- **Sanfte Animation**: 120s Dauer, minimale Bewegung
- **Bokeh-Uhren**: Animierte Uhren im Hintergrund
- **Floating Particles**: Langsam aufsteigende Partikel

---

## Konventionen

### Sprache
- **UI/Prompts**: Deutsch
- **Code-Kommentare**: Englisch erlaubt
- **Dokumentation**: Deutsch

### Code Style
- TypeScript/Deno für Edge Functions
- Zod für Input-Validierung
- Shared Utilities in `_shared/` verwenden
- Responses über `response.ts` Helper

### API Responses
```typescript
// Erfolg
{ success: true, data: {...} }

// Fehler
{ error: "Fehlermeldung" }
```

---

## Umgebungsvariablen

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
FCM_SERVER_KEY=...
CRON_SECRET=...
```

---

## Supabase Cloud Setup

### Projekt-Konfiguration
1. **Projekt erstellen** auf https://supabase.com/dashboard
2. **Region**: EU (Frankfurt) empfohlen
3. **E-Mail-Bestätigung deaktivieren**: Authentication → Providers → Email → "Confirm email" aus

### Datenbank-Migrationen deployen
```bash
cd aiday
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

### Schema-Berechtigungen (einmalig im SQL Editor ausführen)
```sql
-- Schemas für API freigeben
ALTER ROLE authenticator SET pgrst.db_schemas TO 'public, graphql_public, core, coach, notifications, analytics, audit';
NOTIFY pgrst, 'reload config';

-- Berechtigungen für authenticated Role
GRANT USAGE ON SCHEMA core TO authenticated, anon;
GRANT USAGE ON SCHEMA coach TO authenticated, anon;
GRANT USAGE ON SCHEMA notifications TO authenticated, anon;
GRANT USAGE ON SCHEMA analytics TO authenticated, anon;
GRANT USAGE ON SCHEMA audit TO authenticated, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA coach TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA notifications TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO authenticated;
```

### Edge Functions deployen
```bash
# WICHTIG: --no-verify-jwt Flag verwenden (eigene JWT-Validierung im Code)
npx supabase functions deploy --no-verify-jwt
```

---

## Lokale Entwicklung

### Voraussetzungen
- Supabase CLI (`npx supabase`)
- Deno
- Node.js (für Tooling)

### Mit Cloud-Projekt arbeiten
```bash
# Projekt verknüpfen
npx supabase link --project-ref <PROJECT_REF>

# Migrationen pushen
npx supabase db push

# Functions deployen
npx supabase functions deploy --no-verify-jwt
```

### Testen
1. `test-api.html` im Browser öffnen
2. **"Demo Login (admin)"** klicken (erstellt automatisch Test-Account)
3. Endpoints testen

**Test-Credentials:** `admin@aiday.test` / `admin1`

---

## Offene Tasks

### Nächste Schritte
- [ ] Mobile App Client (Flutter/React Native)
- [ ] OAuth Integration (Google, Apple)
- [ ] Offline-First Caching
- [ ] Unit Tests für Edge Functions

### Backlog
- [ ] Personality Insights (versteckte Analyse)
- [ ] Advanced Analytics Dashboard
- [ ] Performance Optimierung
- [ ] E2E Tests
