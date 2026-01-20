# AIDAY - KI-gestützter Tagesplaner

## Inhaltsverzeichnis

- [Projektübersicht](#projektübersicht)
- [Live-Demo & Deployment](#live-demo--deployment)
- [Tech Stack](#tech-stack)
- [Projektstruktur](#projektstruktur)
- [Implementierte Features](#implementierte-features)
- [PWA-Features](#pwa-features)
- [Datenbank-Schema](#datenbank-schema)
- [Edge Functions](#edge-functions)
- [Frontend (app.html)](#frontend-apphtml)
- [Design-System](#design-system)
- [Deployment](#deployment)

---

## Projektübersicht

AIDAY ist eine Progressive Web App (PWA) für tägliche Zielplanung mit KI-gestütztem Coaching. Das Backend basiert auf Supabase mit PostgreSQL und Deno Edge Functions.

**Vision:** Nutzer dabei unterstützen, ihre Träume in konkrete Tagesziele zu verwandeln und diese mit Hilfe eines KI-Coaches zu erreichen.

**Aktueller Stand:** Vollständige PWA mit täglichem Coaching-Flow:
- Check-in (Stimmung, Energie) mit animierter Pflichtfeld-Validierung
- Ziel-Definition mit AI-Klarifizierung
- **Personalisierte Aktionspläne basierend auf Benutzerprofil**
- Tägliche Tasks mit Fortschrittsverfolgung
- Progress-Dashboard mit Statistiken
- **Profil-Screen für persönliche Daten (AI-Personalisierung)**
- **Swipe-Navigation zwischen Screens**
- **Streak-Tracking für aufeinanderfolgende Tage**
- **"Einlogdaten merken" Funktion**
- **Mobile-optimiertes Layout**
- **Installierbar als PWA (Android, iOS, Desktop)**
- **Offline-Funktionalität**
- **Disziplin-Motivations-Feature** (Zitate bei schlechter Stimmung)
- **Einheitliches Sprechblasen-Design** (weiß, Pfeil links)
- **Gamification-System** (XP, Level, Achievements)
- **Timezone-Support** für korrekte Datumsberechnung
- **Idempotency-Keys** verhindert doppelte Einträge
- **Habit Tracking System** mit Streak-Berechnung pro Habit
- **AI-generierte Habit Benefits** - Automatische Vorteile pro Gewohnheit
- **Habit Detail Screen** - Eigener Screen für Habit-Details (wie Goal-Details) ← NEU
- **Onboarding nach jedem Login** - Wird bei jeder neuen Session angezeigt ← NEU
- **Pomodoro Timer** (25min Fokus + 5min Pause)
- **Task Priorität** (High/Medium/Low mit variablen XP)
- **Streak Recovery** (3-Tage Comeback-Challenge, max 1x/Monat)
- **Weekly Deep Review** mit AI-Analyse
- **Burnout Detection** mit automatischer Warnung
- **Notification Preferences** (Quiet Hours, Reminder-Zeit)
- **Coaching Style Personalisierung** (supportive/challenging/balanced)
- **Dark Mode Quick Action** - 6. Button im Dashboard ← NEU
- **Einheitliche Badges** - "X Habits" statt "X/Y" ← NEU

---

## Live-Demo & Deployment

### URLs
| Was | URL |
|-----|-----|
| **App (Hauptseite)** | https://jerdnaandrej777.github.io/aiday/app.html |
| **Start/Login** | https://jerdnaandrej777.github.io/aiday/start-ui.html |
| **Repository** | https://github.com/jerdnaandrej777/aiday |
| **Supabase Dashboard** | https://supabase.com/dashboard/project/boghlkwclgywpiienmtm |

### PWA Installation
- **Android Chrome:** Menü (⋮) → "App installieren"
- **iPhone Safari:** Teilen (□↑) → "Zum Home-Bildschirm"
- **Desktop Chrome/Edge:** Install-Icon (⊕) in Adressleiste

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
| Frontend | Single HTML Files (PWA) |
| Hosting | GitHub Pages |
| PWA | Service Worker + Manifest |

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
│   │   │   ├── utils.ts          # Timezone & Idempotency Utilities (NEU)
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
│   │   ├── goals-setup/          # POST - Ziele mit AI-Plan erstellen
│   │   ├── goal-clarify/         # POST - AI-Klarifizierungsfragen
│   │   ├── accept-plan/          # POST - Plan akzeptieren & Tasks erstellen
│   │   ├── daily-review/         # POST - Tagesreview
│   │   ├── task-update/          # POST - Task aktualisieren/löschen
│   │   ├── goal-delete/          # POST - Ziel löschen (mit Bestätigung)
│   │   │
│   │   │── # === PHASE 4-7 FEATURES (NEU) ===
│   │   ├── habit-update/         # POST - Habit CRUD + Complete/Uncomplete
│   │   ├── task-adjust-ai/       # POST - AI-basiertes Task-Splitting
│   │   ├── streak-recovery/      # POST - 3-Tage Streak Recovery Challenge
│   │   ├── weekly-reflection/    # POST - Weekly Deep Review mit AI
│   │   ├── burnout-assessment/   # POST - Burnout Detection + Recovery Mode
│   │   │
│   │   │── # === LEGACY ===
│   │   ├── coach-plan/           # POST - AI Tagesplan (alt)
│   │   ├── coach-checkin/        # POST - AI Check-in (alt)
│   │   ├── analytics-monthly/    # GET - Monatsstatistik
│   │   └── reminders-dispatch/   # POST - Push versenden
│   │
│   └── migrations/
│       ├── 20240103000000_profile_personal.sql
│       ├── 20260121000000_habit_tracking.sql      # NEU: Habits + Habit_Logs
│       ├── 20260121000001_task_priority.sql       # NEU: Task Priorität
│       ├── 20260121000002_streak_recovery.sql     # NEU: Streak Recovery
│       └── 20260121000003_notification_preferences.sql  # NEU: Notifications
│
├── db/                           # SQL Migrations
│   ├── 001_init.sql              # Basis-Schema
│   ├── 002_auth.sql              # Auth Trigger
│   ├── 003_daily_coaching.sql    # Daily Coaching Tabellen
│   └── fix_goals_schema.sql      # FIX: Fehlende Spalten
│
├── docs/                         # Dokumentation
├── postman/                      # API Collection
├── icons/                        # PWA App-Icons (alle Größen)
│   ├── icon.svg                  # Basis-SVG
│   ├── icon-72.png ... icon-512.png
│
├── app.html                      # HAUPT-APP (Täglicher Coaching-Flow)
├── start-ui.html                 # Onboarding UI (Bokeh-Animationen)
├── offline.html                  # PWA Offline-Fallback
├── index.html                    # Redirect zu start-ui.html
├── manifest.json                 # PWA Manifest
├── sw.js                         # Service Worker
├── test-api.html                 # API Test Konsole
├── .env.example                  # Umgebungsvariablen
└── README.md                     # Hauptdokumentation
```

---

## Implementierte Features

### Backend (100% - DEPLOYED)
- [x] User Auth (Signup/Login/Logout via Supabase)
- [x] Onboarding Flow mit Präferenzen
- [x] GDPR-konform (Datenexport + Account-Löschung)
- [x] Audit Logging
- [x] **Profil-System mit persönlichen Daten**
- [x] **Edge Functions live deployed**

### Daily Coaching Flow (100%)
- [x] Täglicher Check-in (Stimmung, Energie, Notizen)
- [x] Ziel-Definition mit AI-Klarifizierungsfragen
- [x] Kontext-Analyse (Angestellt vs. Selbstständig etc.)
- [x] **Personalisierte Aktionspläne basierend auf Benutzerprofil**
- [x] Automatische Task-Generierung
- [x] **Automatische tägliche Tasks aus Plan** (jeden Tag bis Ziel erreicht)
- [x] Task-Management (Abhaken, Löschen)
- [x] **Ziel-Löschung mit Bestätigungsdialog**
- [x] Fortschritts-Dashboard mit Statistiken
- [x] Streak-Berechnung

### AI-Features (GPT-4o-mini)
- [x] Intelligente Klarifizierungsfragen basierend auf Zieltyp
- [x] Kontext-abhängige Planenerstellung
- [x] Spezifische Tasks statt generischer Phrasen
- [x] Meilenstein-Planung mit Zeitrahmen
- [x] **Personalisierung basierend auf Alter, Beruf, Hobbys etc.**
- [x] **Detaillierte tägliche Aufgaben mit:**
  - Beste Tageszeit (🌅 Morgens, ☀️ Mittags, 🌙 Abends)
  - Schritt-für-Schritt Anleitung (3-5 konkrete Schritte)
  - Erklärung warum die Aufgabe wichtig ist
- [x] **Coaching Style Personalisierung** (NEU)
  - Supportive: Einfühlsam, ermutigend
  - Challenging: Direkt, fordernd
  - Balanced: Ausgewogen
- [x] **Smart Task Adjustment** - AI splittet schwierige Tasks (NEU)
- [x] **Weekly Reflection AI** - Wochenanalyse mit Patterns (NEU)
- [x] **Burnout Detection AI** - Recovery-Vorschläge (NEU)
- [x] **Streak Recovery AI** - 3-Tage Comeback-Plan (NEU)

### Phase 4-7 Features (NEU)
- [x] **Habit Tracking System**
  - Wiederkehrende Gewohnheiten (täglich, wochentags, 3x/Woche)
  - Streak-Berechnung pro Habit (aktuell + bester)
  - +5 XP pro Habit-Completion
  - Grüne-Felder-Kalender UI
  - **AI-generierte Benefits** pro Habit (GPT-4o-mini)
  - **Habit Detail Modal** mit Statistiken und Vorteilen
  - **"Neu generieren" Button** für Benefits
- [x] **Pomodoro Timer**
  - 25min Fokus + 5min Pause (konfigurierbar)
  - Visual Countdown im Task-Detail
  - Audio-Alert bei Fertig
  - Pause/Resume Funktion
- [x] **Task Priorität**
  - 🔴 High (Must-Do) → +20 XP
  - 🟡 Medium (Should-Do) → +10 XP
  - 🟢 Low (Nice-to-Have) → +5 XP
  - Sortierung nach Priorität
- [x] **Streak Recovery Challenge**
  - "Streak Rescue" bei verlorener Streak
  - 3-Tage Recovery Challenge mit AI-Plan
  - +200 Bonus XP bei erfolgreicher Rückkehr
  - Max 1x pro Monat nutzbar
- [x] **Weekly Deep Review**
  - Reflexions-Fragen nach Weekly Report
  - AI analysiert Patterns
  - Vorschläge für nächste Woche
- [x] **Burnout Detection**
  - Automatische Warnung bei Completion Rate <30%
  - Analyse von Mood + Energy Trends
  - "Recovery Mode" aktivierbar (7 Tage, 50% weniger Tasks)
- [x] **Notification Preferences**
  - Check-in Reminder Zeit einstellen
  - Quiet Hours (z.B. 22:00-07:00)
  - Benachrichtigungs-Typen an/aus

### PWA-Features (NEU)
- [x] **Installierbar auf Homescreen** (Android, iOS, Desktop)
- [x] **Offline-Funktionalität** mit Service Worker
- [x] **App-Icons** in allen Größen (72px - 512px)
- [x] **Push-Notification-Unterstützung**
- [x] **Automatische Update-Erkennung**
- [x] **Offline-Banner bei Verbindungsverlust**

### Frontend (app.html) - 12+ Screens
- [x] Dashboard (Hauptscreen nach Login)
- [x] Check-in Screen
- [x] **Review Screen (Aufgaben vom Vortag bewerten)**
- [x] Goals Screen
- [x] Clarify Screen (AI-Fragen)
- [x] Plan Screen (AI-Plan anzeigen)
- [x] **Progress Screen (Heutige Aufgaben)**
- [x] **Goals Overview Screen (Alle Ziele mit Klick auf Details)**
- [x] Goal Detail Screen (Beschreibung, Plan, Meilensteine, Fortschritt)
- [x] **Erreichte Ziele Screen** (Abgeschlossene Ziele mit Statistiken) ← NEU
- [x] **Profile Screen (persönliche Daten)**
- [x] **SVG-Icons statt Emojis**
- [x] **Gradient-Buttons (Blau-Cyan, 30px border-radius)**
- [x] **Abgerundeter Header (24px)**
- [x] **Unified "Zurück"-Button**
- [x] **Swipe-Navigation (links/rechts wischen)**
- [x] **Streak-Tracking-Anzeige**
- [x] **Klickbare "Aktive Ziele" Stat-Box → Goals Overview**
- [x] **"Erreichte Ziele" Button im Header** (Pokal-Icon)
- [x] **Toast Notifications** für alle Aktionen (statt alerts)
- [x] **Confetti-Animation** bei Erledigung aller Aufgaben
- [x] **Verbesserte Empty States** mit Action-Buttons
- [x] **Animiertes Mood Face** im Dashboard (lächelt, blinzelt basierend auf Stimmung)
- [x] **Klickbare Mood Face** mit mood-spezifischen Animationen + Speech Bubble
- [x] **Dynamischer Header-Button** (Dashboard ↔ Mein Fortschritt)
- [x] **Animierte Energielevel-Validierung** (Puls-Animation + Sprechblase)
- [x] **Animierte Stimmungs-Validierung** (Puls-Animation + Sprechblase) ← NEU
- [x] **Einheitliches Sprechblasen-Design** (weiß, Pfeil außen links) ← NEU
- [x] **Dashboard Sprechblase über "Heute"** beim Mood Face Klick ← NEU
- [x] **Disziplin-Motivations-Feature** (~40 Zitate, 4h Cooldown) ← NEU
- [x] **Erhöhte API-Timeouts** (60-120s für AI-Calls) ← NEU
- [x] **Mobile-optimiert (kein horizontales Scrollen)**
- [x] **Runde Emoji-Buttons im Check-in**
- [x] **Loading-States für Buttons** ("Plan wird erstellt...", "Wird gespeichert...")
- [x] **Plan-Screen: "Zurück zum Hauptmenü"** führt zum Dashboard

---

## PWA-Features

### manifest.json
```json
{
  "name": "AIDAY - KI-gestützter Tagesplaner",
  "short_name": "AIDAY",
  "start_url": "./app.html",
  "display": "standalone",
  "background_color": "#0a0a0f",
  "theme_color": "#6366f1",
  "icons": [...],
  "shortcuts": [
    { "name": "Check-in starten", "url": "./app.html?action=checkin" },
    { "name": "Neues Ziel", "url": "./app.html?action=newgoal" }
  ]
}
```

### Service Worker (sw.js)
- **Cache-First** für statische Assets
- **Network-First** für API-Calls
- **Offline-Fallback** zu offline.html
- **Push-Notification-Handling**
- **Background Sync** für Offline-Actions

### App-Icons
Generiert in allen Größen: 16, 32, 72, 96, 120, 128, 144, 152, 180, 192, 384, 512px

---

## Edge Functions

### Deployed Functions (LIVE)

| Function | Methode | Beschreibung | AI |
|----------|---------|--------------|-----|
| `goals-setup` | POST | Ziele + AI-Plan erstellen (speichert plan_json in goals) | GPT-4o-mini |
| `goal-clarify` | POST | AI-Klarifizierungsfragen | GPT-4o-mini |
| `goal-regenerate-plan` | POST | AI-Plan für bestehendes Ziel regenerieren | GPT-4o-mini |
| `goal-delete` | POST | Ziel mit allen zugehörigen Daten löschen | - |
| `accept-plan` | POST | Plan akzeptieren & Tasks erstellen | - |
| `daily-start` | GET/POST | Täglicher Flow-Status (lädt plan_json, AUTO-generiert Tasks) | - |
| `daily-checkin` | POST | Check-in speichern | - |
| `daily-review` | POST | Tagesreview mit AI-Feedback | GPT-4o-mini |
| `task-update` | POST | Task abhaken/löschen + XP vergeben | - |
| `gamification-award` | POST | XP vergeben & Achievements prüfen | - |
| `habit-update` | POST | Habit CRUD + Complete/Uncomplete + AI Benefits | GPT-4o-mini |
| `task-adjust-ai` | POST | AI-basiertes Task-Splitting | GPT-4o-mini |
| `streak-recovery` | POST | 3-Tage Streak Recovery Challenge | GPT-4o-mini |
| `weekly-reflection` | POST | Weekly Deep Review mit AI-Analyse | GPT-4o-mini |
| `burnout-assessment` | POST | Burnout Detection + Recovery Mode | GPT-4o-mini |
| `coach-plan` | POST | AI-Tagesplan (LEGACY) | GPT-4o-mini |
| `coach-checkin` | POST | AI-Coaching Feedback (LEGACY) | GPT-4o-mini |
| `auth-profile` | GET/POST | Benutzerprofil | - |
| `auth-onboarding` | POST | Profil einrichten | - |

### Schema-Verwendung
```typescript
// RICHTIG - Schema explizit angeben
supabase.schema('core').from('user_profile')
supabase.schema('coach').from('ai_suggestions')

// FALSCH
supabase.from('user_profile')
```

---

## Datenbank-Schema

### Schemas
- **core**: user_profile, day_entries, goals, action_steps, daily_checkins, daily_tasks, achievements, user_achievements, **habits**, **habit_logs**, **streak_recoveries**
- **coach**: ai_suggestions
- **notifications**: push_tokens, **notification_history**
- **analytics**: month_rollup (Materialized View)
- **audit**: event_log

### Wichtige Tabellen

```sql
-- Benutzer & Profil
core.user_profile
  - age, job, education, family_status
  - hobbies, strengths, challenges, motivation
  - total_xp INTEGER DEFAULT 0          -- Gamification XP
  - level INTEGER DEFAULT 1             -- Gamification Level

-- Ziele (vollständig)
core.goals
  - id UUID PRIMARY KEY
  - user_id UUID (FK auth.users)
  - day_entry_id UUID (FK core.day_entries)
  - title TEXT NOT NULL
  - category TEXT
  - status TEXT DEFAULT 'open'  -- 'open', 'in_progress', 'achieved', 'not_achieved'
  - why_important TEXT          -- Warum wichtig?
  - previous_efforts TEXT       -- Bisherige Versuche
  - believed_steps TEXT         -- Eigene Ideen
  - is_longterm BOOLEAN         -- Langzeit-Ziel Flag
  - target_date DATE            -- Zieldatum
  - plan_json JSONB             -- AI-generierter Plan (NEU)
  - created_at TIMESTAMPTZ

-- Daily Coaching
core.daily_checkins   -- mood, energy_level, mood_note
core.daily_tasks      -- task_text, completed, goal_id, estimated_minutes

-- AI
coach.ai_suggestions  -- kind, payload_json
```

### Gamification-Tabellen (NEU)
```sql
-- Achievements/Badges Definition
core.achievements
  - id UUID PRIMARY KEY
  - code TEXT UNIQUE NOT NULL        -- 'first_goal', 'streak_7', etc.
  - name TEXT NOT NULL               -- 'Erster Schritt'
  - description TEXT                 -- 'Erstelle dein erstes Ziel'
  - icon TEXT                        -- Emoji oder SVG
  - xp_reward INTEGER DEFAULT 0      -- XP für Achievement
  - category TEXT DEFAULT 'general'  -- 'streak', 'tasks', 'goals', 'daily'
  - threshold INTEGER                -- z.B. 7 für 'streak_7'

-- User-Achievements (welche Badges hat der User)
core.user_achievements
  - id UUID PRIMARY KEY
  - user_id UUID (FK auth.users)
  - achievement_id UUID (FK achievements)
  - earned_at TIMESTAMPTZ DEFAULT now()
  - UNIQUE(user_id, achievement_id)
```

### daily_tasks Tabelle (vollständig)
```sql
core.daily_tasks
  - id UUID PRIMARY KEY
  - user_id UUID (FK auth.users)
  - goal_id UUID (FK core.goals)
  - date DATE
  - task_text TEXT
  - task_order INT
  - completed BOOLEAN
  - completed_at TIMESTAMPTZ
  - skipped BOOLEAN
  - skip_reason TEXT
  - ai_generated BOOLEAN
  - estimated_minutes INTEGER DEFAULT 15  -- Geschätzte Dauer
  - priority TEXT DEFAULT 'medium'        -- NEU: 'high', 'medium', 'low'
  - xp_reward INTEGER                     -- NEU: Variable XP basierend auf Priorität
  - created_at TIMESTAMPTZ
```

### Habit Tracking Tabellen (NEU - Phase 4)
```sql
-- Habits Definition
core.habits
  - id UUID PRIMARY KEY
  - user_id UUID (FK auth.users)
  - title TEXT NOT NULL
  - description TEXT
  - icon TEXT DEFAULT '✨'                 -- Emoji-Icon
  - color TEXT DEFAULT '#6366f1'           -- Hex-Farbe
  - frequency TEXT DEFAULT 'daily'         -- 'daily', 'weekdays', '3x_week', 'weekly'
  - target_days INTEGER[]                  -- z.B. {1,2,3,4,5} für Mo-Fr
  - xp_reward INTEGER DEFAULT 5
  - current_streak INTEGER DEFAULT 0
  - best_streak INTEGER DEFAULT 0
  - total_completions INTEGER DEFAULT 0
  - benefits JSONB DEFAULT '[]'            -- AI-generierte Vorteile ← NEU
  - is_active BOOLEAN DEFAULT true
  - created_at TIMESTAMPTZ

-- Habit Completion Logs
core.habit_logs
  - id UUID PRIMARY KEY
  - habit_id UUID (FK habits)
  - user_id UUID (FK auth.users)
  - date DATE NOT NULL
  - completed BOOLEAN DEFAULT true
  - created_at TIMESTAMPTZ
  - UNIQUE(habit_id, date)
```

### Streak Recovery Tabelle (NEU - Phase 5)
```sql
core.streak_recoveries
  - id UUID PRIMARY KEY
  - user_id UUID (FK auth.users)
  - recovery_date DATE NOT NULL
  - previous_streak INTEGER NOT NULL      -- Streak vor dem Verlust
  - recovered_streak INTEGER NOT NULL     -- Wiederhergestellte Streak (-1 Tag)
  - challenge_start_date DATE
  - challenge_end_date DATE
  - challenge_days_completed INTEGER DEFAULT 0  -- 0-3
  - recovery_challenge_completed BOOLEAN DEFAULT false
  - bonus_xp_awarded INTEGER DEFAULT 0
  - created_at TIMESTAMPTZ
```

### Notification History (NEU - Phase 7)
```sql
notifications.notification_history
  - id UUID PRIMARY KEY
  - user_id UUID (FK auth.users)
  - notification_type TEXT NOT NULL       -- 'checkin_reminder', 'streak_warning', etc.
  - title TEXT
  - body TEXT
  - sent_at TIMESTAMPTZ DEFAULT now()
  - read_at TIMESTAMPTZ
```

### user_profile Erweiterungen (NEU)
```sql
-- Notification Preferences (JSONB)
core.user_profile.notification_preferences DEFAULT '{
  "push_enabled": true,
  "checkin_reminder": true,
  "checkin_reminder_time": "08:00",
  "quiet_hours_enabled": false,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "07:00",
  "streak_warning": true,
  "weekly_report": true,
  "recovery_mode_active": false
}'
```

---

## Design-System

### Mobile-Optimierung
```css
html, body {
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
}

.screen {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  padding-bottom: 16px;
}

.mood-btn {
  width: 56px;
  height: 56px;
  min-width: 56px;
  max-width: 56px;
  border-radius: 50%;
  aspect-ratio: 1 / 1;
}
```

### Farben
- **Primary Gradient**: `linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)`
- **Background**: `#0a0a0f` (dark), `#f8fafc` (light)
- **Accent**: `#6366f1` (Indigo)
- **Accent 2**: `#22d3ee` (Cyan)

### Layout
- **Header Padding**: 12px 28px
- **Screen Padding**: 12px 28px
- **Card Padding**: 16px
- **Border Radius**: 30px (Buttons), 20px (Cards), 24px (Header)

### Globaler Header
Auf allen Screens sichtbar (außer Loading):
- Logo "aiday" links
- "Mein Fortschritt" Button Mitte
- "Abmelden" rechts

---

## Deployment

### GitHub Pages (Frontend)
```bash
# Repository: https://github.com/jerdnaandrej777/aiday
git add -A
git commit -m "Update"
git push
# GitHub Pages baut automatisch
```

### Supabase Edge Functions
```bash
# CLI installieren (via Scoop auf Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Projekt verknüpfen
cd aiday
supabase link --project-ref boghlkwclgywpiienmtm

# Secrets setzen
supabase secrets set OPENAI_API_KEY=sk-...

# Functions deployen
supabase functions deploy goals-setup --no-verify-jwt
supabase functions deploy goal-clarify --no-verify-jwt
supabase functions deploy accept-plan --no-verify-jwt
# ... etc.
```

### Umgebungsvariablen (Supabase Secrets)
```
OPENAI_API_KEY=sk-...
FCM_SERVER_KEY=...
CRON_SECRET=...
```

---

## Konventionen

### Sprache
- **UI/Prompts**: Deutsch
- **Code-Kommentare**: Englisch erlaubt
- **Dokumentation**: Deutsch

### API Responses
```typescript
// Erfolg
{ success: true, data: {...} }

// Fehler
{ error: "Fehlermeldung" }
```

---

## Test-Credentials

**Demo-Account:** `admin@aiday.test` / `admin1`

Zum Testen: `test-api.html` öffnen → "Demo Login (admin)" klicken

---

## Frontend-Architektur (app.html)

### API-Call System
```javascript
// Alle API-Calls haben 30s Timeout
async function apiCall(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    // ...
  } catch (error) {
    if (error.name === 'AbortError') {
      return { error: 'Zeitüberschreitung' };
    }
  }
}
```

### acceptPlan Flow
```javascript
// Plan annehmen mit Fehlerbehandlung
async function acceptPlan() {
  // 1. Button disabled + "Wird gespeichert..."
  // 2. Für jeden Plan: API-Call zu accept-plan
  // 3. Bei Erfolg: Button → "Gespeichert!"
  // 4. Nach 500ms: loadDailyStart() → Dashboard
  // 5. Bei Fehler: Alert + Button zurücksetzen
}
```

### Fehlerbehandlung
- **try/catch** um alle async Funktionen
- **Alert** bei Benutzer-relevanten Fehlern
- **Console.error** für Debug-Informationen
- **Button-Reset** bei Fehlern (nicht disabled bleiben)

---

## Bekannte Fixes & Lösungen

### 1. "estimated_minutes" Spalte fehlt
**Problem:** `Could not find the 'estimated_minutes' column of 'daily_tasks'`

**Lösung:** SQL im Supabase Dashboard ausführen:
```sql
ALTER TABLE core.daily_tasks
ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 15;
```

### 2. Button bleibt auf "Wird gespeichert..."
**Problem:** acceptPlan hatte keine Fehlerbehandlung

**Lösung:**
- try/catch Block hinzugefügt
- Bei Fehler: Alert anzeigen + Button zurücksetzen
- Bei Erfolg: "Gespeichert!" → Dashboard

### 3. API-Calls hängen ohne Timeout
**Problem:** fetch() wartet ewig wenn Server nicht antwortet

**Lösung:** AbortController mit 30s Timeout:
```javascript
const controller = new AbortController();
setTimeout(() => controller.abort(), 30000);
fetch(url, { signal: controller.signal });
```

### 4. Horizontales Scrollen auf Mobile
**Problem:** Seiten scrollen horizontal über UI hinaus

**Lösung:**
```css
html, body, .container, .screen {
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
}
```

### 5. Emoji-Buttons nicht rund
**Problem:** Mood-Buttons werden oval statt rund

**Lösung:**
```css
.mood-btn {
  width: 56px;
  height: 56px;
  min-width: 56px;
  max-width: 56px;
  border-radius: 50%;
  aspect-ratio: 1 / 1;
  flex-shrink: 0;
}
```

### 6. "Deine Ziele" zeigt keine Ziele an
**Problem:** Fehlende Spalten in der `goals` Tabelle:
- `target_date` fehlt
- `is_longterm` fehlt
- `in_progress` Status nicht unterstützt

**Lösung:** SQL im Supabase Dashboard ausführen (`db/fix_goals_schema.sql`):
```sql
-- Fehlende Spalten hinzufügen
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

-- Status zu TEXT konvertieren (für in_progress Support)
DO $$
BEGIN
  ALTER TABLE core.goals ALTER COLUMN status TYPE TEXT USING status::TEXT;
  ALTER TABLE core.goals ALTER COLUMN status SET DEFAULT 'open';
EXCEPTION
  WHEN others THEN NULL;
END $$;
```

### 7. Quick Actions Buttons nicht zentriert
**Problem:** Buttons Check-in, Neues Ziel, etc. waren nicht mit anderen UI-Elementen ausgerichtet

**Lösung:**
```css
.quick-actions-title {
  /* padding-left entfernt */
}
.quick-actions-grid {
  width: 100%;
  gap: 8px; /* von 12px reduziert */
}
```

### 8. showScreen zeigt Screen nicht an (Goals Overview → Detail)
**Problem:** `showScreen()` hatte zwei Code-Pfade:
- Mit Animation: Setzt `style.display = 'none/block'`
- Ohne Animation: Setzte nur CSS-Klassen, NICHT `display`

Wenn von der Goals-Übersicht zum Detail navigiert wurde, blieb der Detail-Screen unsichtbar.

**Lösung:**
```javascript
} else {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active', ...);
    s.style.display = 'none';  // NEU
  });
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.style.display = 'block';  // NEU
    targetScreen.classList.add('active');
  }
}
```

### 9. showGoalDetail try-catch nicht geschlossen
**Problem:** Ein `try`-Block wurde geöffnet aber nie mit `catch` geschlossen → JavaScript Syntax-Fehler

**Lösung:** Korrektes Schließen mit catch-Block:
```javascript
      showScreen('goalDetailScreen');
    } catch (error) {
      console.error('Error in showGoalDetail:', error);
      alert('Fehler beim Laden der Zieldetails: ' + error.message);
    }
}
```

### 10. Blink-Effekte in Login-Animationen
**Problem:** GPU-Optimierungen (`will-change`, `backface-visibility: hidden`, `translateZ(0)`) verursachten Blink-Effekte

**Lösung:** Diese Eigenschaften von `.bokeh-circle`, `.particle`, `.clock-layer` entfernt

### 11. Plan-Daten nicht im Ziel-Detail angezeigt
**Problem:** AI-Pläne wurden nur in `ai_suggestions` gespeichert, aber nicht mit dem Ziel verknüpft

**Lösung:**
- Neue `plan_json` Spalte in `core.goals` Tabelle
- `goals-setup` speichert Plan direkt im Ziel
- `daily-start` lädt `plan_json` für Zieldetails
- Migration für bestehende Pläne erstellt (`20260118235600_migrate_plans_to_goals.sql`)

### 12. AI-Plan für bestehendes Ziel regenerieren
**Problem:** Ziele ohne Plan konnten keinen neuen Plan erhalten

**Lösung:**
- Neue Edge Function `goal-regenerate-plan`
- Button "AI-Plan generieren" im Goal-Detail wenn kein Plan existiert
- CHECK Constraint für `ai_suggestions.kind` erweitert (`20260119001000_fix_ai_suggestions_kind.sql`)

### 13. Task-Checkbox erscheint nicht sofort
**Problem:** `querySelector` findet nur das erste Element, aber Tasks sind auf mehreren Screens

**Lösung:**
- `querySelectorAll` statt `querySelector` in `toggleTask()`
- Alle Task-Elemente mit gleicher ID werden gleichzeitig aktualisiert

### 14. Ruckelige Animationen auf Mobile (start-ui.html)
**Problem:** Login-Animationen liefen auf Smartphones ruckelig

**Lösung:**
- GPU-Beschleunigung mit `will-change`, `translateZ(0)`, `backface-visibility: hidden`
- Reduzierte Blur-Werte auf Mobile (30px statt 80px)
- Weniger Partikel auf Mobile (12 statt 35)
- `prefers-reduced-motion` Support
- Verstecke unnötige Elemente auf Mobile (.clock-4, .clock-5, .orb-4, .orb-5)

### 15. Tägliche Aufgaben nur am Erstellungstag sichtbar
**Problem:** Tasks wurden nur am Tag der Plan-Akzeptierung erstellt und an Folgetagen nicht angezeigt

**Lösung:**
- `daily-start` Edge Function erweitert mit AUTO-GENERATE Logik
- Bei jedem API-Call prüft `daily-start` ob aktive Ziele (`status: 'in_progress'`) mit `plan_json` existieren
- Falls für heute keine Tasks existieren, werden automatisch Tasks aus `plan_json.daily_tasks` erstellt
- Tasks erscheinen nun jeden Tag bis das Ziel erreicht ist

### 16. Aggressive Mobile-Performance-Optimierungen (start-ui.html)
**Problem:** Selbst mit reduzierten Animationen ruckelten Login-Seiten auf Smartphones

**Lösung:** Alle Animationen auf Mobile komplett deaktiviert:
```css
@media (max-width: 768px) {
  .bokeh-clock, .clock-layer, .bokeh-circle, .clock-hand,
  .pulse-ring, .wave, .light-rays, .particles, .particle {
    display: none !important;
    animation: none !important;
  }
  .orb {
    animation: none !important;
    filter: blur(100px);
    opacity: 0.3;
  }
  .orb-3, .orb-4, .orb-5 { display: none !important; }
}
```
- Nur 2 statische Orbs auf Mobile (statt 5 animierte)
- Keine Partikel auf Mobile (`particleCount = 0`)
- Keine Backdrop-Filter auf Mobile

### 17. "Erreichte Ziele" Feature
**Problem:** Keine Übersicht für abgeschlossene Ziele

**Lösung:**
- Neuer "Erreichte Ziele" Button im Header (ersetzt "Mein Fortschritt")
- Pokal-Icon (Trophy SVG)
- Neuer `achievedGoalsScreen` mit:
  - Liste aller Ziele mit `status: 'achieved'`
  - Statistiken: Wochen, Meilensteine, Tasks
  - Klick auf Ziel öffnet Goal-Detail
- Funktionen: `showAchievedGoalsScreen()`, `renderAchievedGoals()`, `showAchievedGoalDetail()`

### 18. Toast Notifications System
**Problem:** `alert()` Dialoge blockieren die UI und sind nicht benutzerfreundlich

**Lösung:**
- Neues Toast Notification System implementiert
- Typen: `success` (grün), `error` (rot), `warning` (orange), `info` (blau)
- Aufruf: `showToast('Nachricht', 'success', 3000)`
- Alle `alert()` Aufrufe durch `showToast()` ersetzt
- Toast-Container fest am unteren Bildschirmrand positioniert
- Auto-Remove nach konfigurierbarer Dauer
- Slide-In/Out Animationen

### 19. Confetti-Animation bei Task-Completion
**Problem:** Kein visuelles Feedback bei wichtigen Erfolgen

**Lösung:**
- Canvas-basierte Confetti-Animation
- Wird ausgelöst wenn alle täglichen Aufgaben erledigt sind
- 80 Partikel in App-Farben (#6366f1, #22d3ee, #10b981, etc.)
- 2 Sekunden Dauer mit Physics-Simulation (Gravitation)
- Aufruf: `showConfetti()`

### 20. Verbesserte Empty States
**Problem:** Leere Listen zeigten nur minimalen Text ohne Handlungsaufforderung

**Lösung:**
- Neue CSS-Klassen: `.empty-state-title`, `.empty-state-btn`
- Positive, motivierende Texte
- Action-Buttons für direkten nächsten Schritt
- Größere Icons (48px statt 40px)
- Angepasste Farben (Accent statt Muted)
- Beispiel:
  ```html
  <div class="empty-state">
    <div class="empty-state-icon">...</div>
    <div class="empty-state-title">Bereit für neue Aufgaben!</div>
    <p>Definiere ein Ziel, um deine ersten Aufgaben zu erhalten.</p>
    <button class="empty-state-btn" onclick="editGoals()">Ziel erstellen</button>
  </div>
  ```

### 21. Security Fix: Auth-Token Comparison
**Problem:** `reminders-dispatch` verwendete `.includes()` für Token-Vergleich, was unsicher ist

**Lösung:**
- Bearer Token korrekt extrahieren
- Explizite Gleichheitsprüfung statt `.includes()`
- Prüfung auf leere/undefinierte Secrets
- Code:
  ```typescript
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader

  const isValidCronSecret = cronSecret && cronSecret.length > 0 && bearerToken === cronSecret
  const isValidServiceKey = serviceKey && serviceKey.length > 0 && bearerToken === serviceKey

  if (!isValidCronSecret && !isValidServiceKey) {
    return errorResponse('Unauthorized', 401)
  }
  ```

---

## Troubleshooting

### Edge Function Fehler debuggen
1. Supabase Dashboard → Edge Functions → Logs
2. Browser Console (F12) → Network Tab
3. `console.log()` in Edge Functions verwenden

### Datenbank-Schema prüfen
```sql
-- Spalten einer Tabelle anzeigen
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'core' AND table_name = 'daily_tasks';
```

### Cache leeren
- Browser: Ctrl+Shift+R (Hard Refresh)
- Service Worker: DevTools → Application → Service Workers → Unregister
- Supabase Schema Cache: Edge Function neu deployen

### Lokale Tests (file://) - Erwartete Fehler
Beim Öffnen der App direkt von der Festplatte (file://) erscheinen diese Fehler:

```
[PWA] Service Worker registration failed: TypeError
→ Service Worker funktioniert nur über HTTP/HTTPS

AbortError: signal is aborted without reason
→ API-Timeout (normal wenn offline)

CORS policy: Cross origin requests are only supported...
→ manifest.json kann nicht von file:// geladen werden
```

**Diese Fehler sind NORMAL bei lokalem Testen!**

Für korrektes Testen:
1. **GitHub Pages nutzen:** https://jerdnaandrej777.github.io/aiday/app.html
2. **Oder lokalen Server starten:** `npx serve .` oder `python -m http.server 8000`

### 22. Animiertes Mood Face im Dashboard
**Feature:** Interaktives animiertes Gesicht im "Heute"-Block

**Implementierung:**
- SVG-basiertes animiertes Gesicht mit Augen, Mund, Wangen, Tränen, Funkeln
- 5 Stimmungs-Modi mit unterschiedlichen Expressionen:
  - `great`: Großes Lächeln, Funkeln, orange Wangen
  - `good`: Freundliches Lächeln, leichtes Blinzeln
  - `neutral`: Gerader Mund, normales Blinzeln
  - `bad`: Trauriger Mund, blaue Wangen
  - `terrible`: Sehr traurig, Tränen-Animation
- CSS-Animationen: Blinzeln, Lächeln, Wangen-Pulsieren

**Code-Struktur:**
```javascript
function updateMoodFace(mood) {
  const moodFace = document.getElementById('moodFace');
  moodFace.className = 'mood-face ' + mood;
  // Mund-Pfad wird je nach Stimmung angepasst
}
```

### 23. Klickbare Mood Face mit Animationen
**Feature:** Bei Klick auf das Mood Face werden mood-spezifische Animationen ausgelöst

**Animationen pro Stimmung:**
- `great`: Tanzen (Hüpfen + Drehen)
- `good`: Zunge rausstrecken + Lachen
- `neutral`: Verrückte Augen + Wackeln
- `bad`: Winken + Herz-Animation
- `terrible`: Virtuelle Umarmung + Herzen

**Speech Bubble:**
- Erscheint über dem Mood Face (nicht als Toast unten)
- Zufällige aufmunternde Nachrichten mit Emojis
- Mood-spezifische Gradient-Farben
- Pop-In Animation + Fade-Out nach 2 Sekunden

**Code:**
```javascript
function onMoodFaceClick() {
  const bubble = document.getElementById('moodSpeechBubble');
  bubble.textContent = randomMessage;
  bubble.className = 'mood-speech-bubble ' + currentMood + ' show';
}
```

### 24. Dynamischer Header-Navigation Button
**Problem:** Der Header-Button war statisch und zeigte immer "Mein Fortschritt"

**Lösung:**
- Auf dem **Dashboard**: Button zeigt "Mein Fortschritt" → navigiert zu Progress Screen
- Auf **allen anderen Screens**: Button zeigt "Dashboard" → navigiert zurück zum Dashboard
- Icon wechselt dynamisch (Chart-Icon ↔ Grid-Icon)

**Code:**
```javascript
function updateHeaderNavButton(screenId) {
  const navText = document.getElementById('headerNavText');
  if (screenId === 'dashboardScreen') {
    navText.textContent = 'Mein Fortschritt';
    // Chart-Icon
  } else {
    navText.textContent = 'Dashboard';
    // Grid-Icon
  }
}

function onHeaderNavClick() {
  if (activeScreen.id === 'dashboardScreen') {
    showProgressScreen();
  } else {
    showScreen('dashboardScreen', 'back');
  }
}
```

### 25. Header Button Höhe auf Mobile
**Problem:** "Mein Fortschritt" brach auf zwei Zeilen um, was den Header höher machte als "Dashboard"

**Lösung:**
```css
.progress-btn {
  white-space: nowrap;  /* Kein Zeilenumbruch */
  font-size: 13px;      /* Etwas kleiner */
  padding: 10px 16px;   /* Kompakter */
  gap: 6px;
}
```

### 26. Animierte Energielevel-Validierung
**Problem:** Beim Check-in ohne Energielevel kam eine Fehlermeldung

**Lösung:** Statt Fehlermeldung wird eine aufmerksamkeitsstarke Animation ausgelöst:
- Wellenförmige Puls-Animation der 1-5 Buttons (nacheinander)
- Sprechblase erscheint über dem Label "Wie ist dein Energielevel?"
- Text: "Bitte wähle dein Energielevel! ⚡"
- Gradient-Hintergrund (lila-cyan), nicht transparent
- Auto-Scroll zum Energy-Slider
- Shake-Animation der Sprechblase

**CSS:**
```css
.energy-slider.needs-attention .energy-level {
  animation: energyPulse 0.6s ease-in-out;
}

.energy-slider.needs-attention .energy-level:nth-child(1) { animation-delay: 0s; }
.energy-slider.needs-attention .energy-level:nth-child(2) { animation-delay: 0.08s; }
/* ... usw. für Welleneffekt */

@keyframes energyPulse {
  0%, 100% { transform: scale(1); }
  25% { transform: scale(1.15); border-color: var(--accent); }
  50% { transform: scale(0.95); }
  75% { transform: scale(1.1); }
}

.energy-speech-bubble {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #6366f1, #22d3ee);
  /* Überdeckt das Label vollständig */
}
```

**JavaScript:**
```javascript
async function submitCheckin() {
  if (!checkinData.energy_level) {
    showEnergyAttention();
    return;
  }
  // ... rest of function
}

function showEnergyAttention() {
  formGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
  slider.classList.add('needs-attention');
  bubble.classList.add('show');
}
```

### 27. Einheitliches Sprechblasen-Design
**Feature:** Alle Sprechblasen (Mood, Energy, Dashboard) haben jetzt ein einheitliches weißes Design

**Design-Eigenschaften:**
- Weißer Hintergrund mit leichtem Schatten
- Border: 1px solid var(--glass-border)
- Border-radius: 20px (abgerundete Ecken)
- Padding: 12px 24px (mehr Breite für Text)
- Pfeil außen links (nicht zentriert)

**CSS:**
```css
.mood-speech-bubble,
.energy-speech-bubble {
  position: absolute;
  top: -20px;
  left: 0;
  right: 0;
  background: white;
  color: var(--text-primary);
  padding: 12px 24px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--glass-border);
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mood-speech-bubble::after,
.energy-speech-bubble::after {
  content: '';
  position: absolute;
  bottom: -15px;
  left: 24px;
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 16px solid white;
}
```

### 28. Dashboard Sprechblase über "Heute"
**Feature:** Beim Klick auf das Mood Face erscheint die Sprechblase über dem Wort "Heute"

**HTML-Struktur:**
```html
<div class="progress-card-header">
  <div class="heute-container">
    <h3>Heute</h3>
    <div class="mood-speech-bubble dashboard-bubble" id="moodSpeechBubble"></div>
  </div>
  <span class="progress-date" id="progressDate"></span>
</div>
```

**CSS:**
```css
.heute-container {
  position: relative;
}

.dashboard-bubble {
  position: absolute;
  bottom: calc(100% + 18px);
  left: 0;
  background: white;
  padding: 12px 24px;
  border-radius: 20px;
  white-space: nowrap;
  width: max-content;
  min-width: 120px;
  max-width: 300px;
}

.dashboard-bubble::after {
  top: 100%;
  left: 20px;
  border-top: 16px solid white;
}
```

### 29. Animierte Stimmungs-Validierung
**Feature:** Pflichtfeld-Validierung für Stimmungsauswahl mit Animation (wie bei Energielevel)

**Auslöser:** Klick auf "Weiter" ohne Stimmungsauswahl

**Animation:**
- Wellenförmige Puls-Animation der 5 Emoji-Buttons
- Sprechblase "Wie fühlst du dich heute? 🤔" erscheint
- Auto-Scroll zum Mood-Bereich

**JavaScript:**
```javascript
function showMoodAttention() {
  const formGroup = document.getElementById('moodFormGroup');
  const buttons = document.getElementById('moodButtons');
  const bubble = document.getElementById('moodSpeechBubbleCheckin');

  if (buttons && bubble && formGroup) {
    formGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      buttons.classList.add('needs-attention');
      bubble.classList.add('show');
      setTimeout(() => { buttons.classList.remove('needs-attention'); }, 1000);
      setTimeout(() => { bubble.classList.remove('show'); }, 2500);
    }, 100);
  }
}
```

### 30. Disziplin-Motivations-Feature
**Feature:** Motivierende Zitate bei nicht-positiver Stimmung oder unerledigten Tasks

**Trigger:**
- Nach Check-in bei neutral/bad/terrible Stimmung
- Abends (nach 18:00) bei <50% erledigten Tasks

**Cooldown:** Max 1x pro 4 Stunden (localStorage: `aiday_last_motivation`)

**Zitate-Sammlung:** ~40 Zitate von:
- Stoikern (Marc Aurel, Epiktet)
- Modernen Persönlichkeiten (Jim Rohn, Steve Jobs, Henry Ford)
- Klassikern (Goethe, Einstein, Edison)

**JavaScript-Funktionen:**
```javascript
let lastMotivationTime = 0;
const MOTIVATION_COOLDOWN = 4 * 60 * 60 * 1000; // 4 Stunden
let pendingMotivationMood = null;

function initMotivationSystem() { /* Lädt Cooldown aus localStorage */ }
function canShowMotivation() { /* Prüft 4h-Cooldown */ }
function getRandomQuote() { /* Holt zufälliges Zitat */ }
function showMotivationQuote(triggerType) { /* Zeigt Bubble */ }
function checkMoodForMotivation(mood) { /* Prüft nach Check-in */ }
function checkTasksForMotivation(tasks) { /* Prüft abends */ }
```

### 31. Detaillierte Task-Anleitungen (AI-generiert)
**Feature:** Ausführliche Schritt-für-Schritt Anleitungen für jede Tagesaufgabe

**Inhalt pro Task:**
- **Warum:** Erklärung der Wichtigkeit
- **Schritte:** 3-5 konkrete Handlungsschritte
- **Kategorie-spezifisch:** Angepasst an Entspannung, Sport, Lernen, etc.

**JavaScript:**
```javascript
function generateTaskGuidance(task) {
  const category = detectTaskCategory(task);
  return {
    why: getCategoryWhy(category),
    steps: getCategorySteps(category, task)
  };
}
```

### 32. Erhöhte API-Timeouts
**Problem:** Timeout-Fehler bei AI-Plan-Generierung

**Lösung:** Timeouts erhöht:
- Standard: 60 Sekunden (vorher 30s)
- goal-clarify: 90 Sekunden
- goal-regenerate-plan: 90 Sekunden
- goals-setup: 120 Sekunden

**Code:**
```javascript
const timeoutMs = options.timeout || 60000;
// Bei AI-Calls: timeout: 90000 oder 120000
```

### 33. Dashboard Sprechblase über Stats positioniert
**Feature:** Sprechblase beim Mood-Face-Klick erscheint über den "Heute"-Stats

**Positionierung:**
- Eigener Container `.dashboard-bubble-container` direkt vor dem Stats-Bereich
- Überlappt das Wort "Heute" mit `top: -45px`
- Pfeil zeigt auf das Stimmungs-Emoji

**CSS:**
```css
.dashboard-bubble-container {
  position: relative;
  width: 100%;
  height: 0;
  margin: 0 -16px;
  padding: 0 16px;
}

.dashboard-bubble {
  position: absolute;
  top: -45px;
  left: -8px;
  right: -8px;
}
```

### 34. Dashboard Sprechblase breitere Darstellung
**Feature:** Sprechblase nutzt die volle Kartenbreite

**Änderungen:**
- Negative Margins (`left: -8px; right: -8px`) für volle Kartenbreite
- `white-space: nowrap` verhindert Textumbruch
- Text bleibt einzeilig für bessere Lesbarkeit

**CSS:**
```css
.dashboard-bubble {
  left: -8px;
  right: -8px;
  white-space: nowrap;
  text-align: center;
}
```

### 35. Ziele werden nicht mehr überschrieben
**Problem:** Beim Erstellen neuer Ziele wurden alle vorhandenen Tagesziele gelöscht

**Ursache:**
- `goals-setup` Edge Function löschte alle Ziele vom gleichen Tag vor dem Einfügen
- Auch Langzeit-Ziele wurden gelöscht

**Lösung:**
1. DELETE-Logik aus `goals-setup/index.ts` entfernt
2. DB-Limit von 10 auf 10.000 Ziele pro Tag erhöht
3. Frontend-Limit (max 5 Ziele auf einmal) entfernt

**Vorher (goals-setup):**
```typescript
// GELÖSCHT - Diese Logik überschrieb alle Ziele!
const { error: deleteError } = await supabase
  .schema('core')
  .from('goals')
  .delete()
  .eq('day_entry_id', dayEntry.id)
```

**Nachher:**
- Neue Ziele werden einfach hinzugefügt
- Keine automatische Löschung mehr
- Max 10.000 Ziele pro Tag (DB-Trigger)

**Migration:** `db/20260119_increase_goals_limit.sql`
```sql
CREATE OR REPLACE FUNCTION core.enforce_max_10_goals_per_day()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM core.goals g
  JOIN core.day_entries de ON de.id = g.day_entry_id
  WHERE de.user_id = new.user_id
    AND de.date = (SELECT date FROM core.day_entries WHERE id = new.day_entry_id);
  IF cnt >= 10000 THEN
    RAISE EXCEPTION 'Max 10000 goals per day exceeded';
  END IF;
  RETURN new;
END;
$$;
```

### 36. Gamification-System (XP, Level, Achievements)
**Feature:** Vollständiges Gamification-System mit XP, Levels und Achievements

**XP-Vergabe:**
| Aktion | XP |
|--------|-----|
| Task erledigt | +10 |
| Alle Tages-Tasks erledigt | +50 Bonus |
| Streak fortgesetzt | +20 |
| Ziel erreicht | +100 |
| Achievement freigeschaltet | Variable |

**Level-Berechnung:**
```javascript
const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;
// Level 1: 0-99 XP
// Level 2: 100-399 XP
// Level 3: 400-899 XP
```

**17 Achievements:** first_goal, first_task, streak_3/7/14/30, tasks_10/25/50/100, goal_achieved, perfect_day, early_bird, night_owl, balanced, zen_master, unstoppable

**Dateien:**
- `db/20260119_gamification.sql` - Datenbank-Schema
- `supabase/functions/gamification-award/index.ts` - XP/Achievement-Vergabe
- `supabase/functions/task-update/index.ts` - Automatische XP bei Task-Completion
- `app.html` - UI (Level-Badge, XP-Bar, Achievement-Popup)

### 37. Timezone-Support
**Problem:** `new Date().toISOString().split('T')[0]` gibt UTC zurück, nicht User-Timezone

**Lösung:** User-Timezone aus Browser verwenden

**Neue Utility-Funktionen** (`_shared/utils.ts`):
```typescript
// Korrekte Datumsberechnung mit User-Timezone
export function getUserToday(timezoneOffset?: number): string {
  const now = new Date();
  if (timezoneOffset !== undefined) {
    const userTime = new Date(now.getTime() - (timezoneOffset * 60 * 1000));
    return userTime.toISOString().split('T')[0];
  }
  return now.toISOString().split('T')[0];
}

// Timezone-Offset aus Request extrahieren
export function extractTimezoneOffset(req: Request, body?: any): number | undefined
```

**Frontend:**
```javascript
const userTimezoneOffset = new Date().getTimezoneOffset();
// Bei API-Calls automatisch mitgesendet
```

**Geänderte Edge Functions:** daily-start, goals-setup, task-update

### 38. Idempotency-Keys
**Problem:** Doppelklick auf "Plan erstellen" → doppelte Einträge

**Lösung:** Idempotency-Key Header verhindert Duplikate

**Neue Utility-Funktion** (`_shared/utils.ts`):
```typescript
export function extractIdempotencyKey(req: Request): string | undefined {
  return req.headers.get('x-idempotency-key') || undefined;
}
```

**Frontend:**
```javascript
function generateIdempotencyKey() {
  return `${currentUser?.id || 'anon'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Bei goals-setup:
await apiCall('goals-setup', {
  headers: { 'X-Idempotency-Key': generateIdempotencyKey() },
  body: { goals }
});
```

**Backend prüft** ob Goal mit gleichem idempotency_key bereits existiert und gibt cached zurück.

**Migration:** `db/20260119_add_idempotency_key.sql`

### 39. userTimezoneOffset Initialization Error
**Problem:** `Cannot access 'userTimezoneOffset' before initialization` - JavaScript-Fehler

**Ursache:** Variable wurde nach der init() IIFE deklariert, die sofort ausgeführt wird

**Lösung:** `userTimezoneOffset` vor die init() Funktion verschieben:
```javascript
// RICHTIG - Vor init()
const userTimezoneOffset = new Date().getTimezoneOffset();

;(async function init() {
  // ... nutzt userTimezoneOffset
})();
```

### 40. AI-generierte Habit Benefits
**Feature:** Jeder Habit bekommt automatisch AI-generierte Vorteile

**Implementierung:**
- Beim Erstellen eines Habits generiert GPT-4o-mini 4-5 spezifische Vorteile
- Basierend auf Habit-Titel und Beschreibung
- Neue `benefits` JSONB-Spalte in `core.habits`
- Button "Vorteile generieren" für ältere Habits ohne Benefits
- Button "Neu generieren" für Habits mit bestehenden Benefits

**Edge Function** (`habit-update`):
```typescript
async function generateHabitBenefits(title: string, description?: string): Promise<string[]> {
  const prompt = `Generiere 4-5 konkrete Vorteile für: ${title}...`;
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  });
  // Parse JSON und entferne Markdown Code-Blöcke
  return benefits;
}
```

**Migration:** `db/20260119_habit_benefits.sql`
```sql
ALTER TABLE core.habits
ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]';
```

### 41. Habit Detail Modal
**Feature:** Klickbare Habits öffnen ein Detail-Modal mit Statistiken und Vorteilen

**Inhalte des Modals:**
- Habit-Icon und Titel
- Beschreibung (falls vorhanden)
- Statistiken: Aktuelle Streak, Beste Streak, Gesamt-Completions
- AI-generierte Vorteile (mit "Neu generieren" Button)
- Frequenz-Anzeige
- Löschen-Button

**Code:**
```javascript
function showHabitDetail(habitId) {
  const habit = habitsData.habits?.find(h => h.id === habitId);
  // Modal-Daten füllen
  document.getElementById('habitDetailModal').style.display = 'flex';
}
```

### 42. Dark Mode Quick Action Button
**Feature:** 6. Button in Quick Actions für Dark Mode Toggle

**Implementierung:**
- Mond-Icon (🌙) im Light Mode
- Sonnen-Icon (☀️) im Dark Mode
- Label wechselt zwischen "Dark Mode" und "Light Mode"
- Ruft `toggleDarkMode()` auf

**Code:**
```javascript
function updateThemeToggleUI() {
  const darkModeLabel = document.getElementById('darkModeLabel');
  const darkModeIcon = document.getElementById('darkModeIcon');
  if (isDarkMode) {
    darkModeLabel.textContent = 'Light Mode';
    darkModeIcon.innerHTML = '<circle cx="12" cy="12" r="5"/>...'; // Sonne
  } else {
    darkModeLabel.textContent = 'Dark Mode';
    darkModeIcon.innerHTML = '<path d="M21 12.79A9..."/>'; // Mond
  }
}
```

### 43. Neuer Habit Button im Habits-Screen
**Feature:** Prominenter "+ Neuer Habit" Button zwischen Stats und Habits-Liste

**Position:** Zwischen "Aktive Habits/Beste Streak/Heute" Stats und "Heute zu erledigen" Block

**Code:**
```html
<button class="btn btn-primary" onclick="showAddHabitModal()" style="width: 100%;">
  <svg>...</svg> Neuer Habit
</button>
```

### 44. Löschen-Button Fix (CSS)
**Problem:** Text im Löschen-Button nicht sichtbar

**Ursache:** CSS verwendete `var(--error)` die nicht definiert war

**Lösung:**
```css
/* VORHER (falsch) */
.btn-danger { background: var(--error); }

/* NACHHER (korrekt) */
.btn-danger { background: var(--danger); color: white; }
```

### 45. Habit Calendar Wochentage Fix
**Problem:** Kalender zeigte statisch "So, Mo, Di, Mi, Do, Fr, Sa" unabhängig vom Datum

**Lösung:** Wochentage dynamisch basierend auf den tatsächlichen Daten generieren:
```javascript
function renderHabitCalendar() {
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    headerHtml += `<div class="habit-calendar-header">${dayNames[dayOfWeek]}</div>`;
  }
}
```

### 46. Einheitliche Badges (Aufgaben/Habits)
**Problem:** "Heutige Aufgaben" zeigte "3 Aufgaben", "Heutige Habits" zeigte "3/3"

**Lösung:** Beide Badges im gleichen Format:
- "3 Aufgaben"
- "3 Habits"

```javascript
progressCount.textContent = `${activeHabits.length} Habits`;
```

### 47. Loading-State für Habit-Erstellung
**Feature:** Button zeigt "⏳ Wird erstellt..." während der AI die Benefits generiert

**Code:**
```javascript
async function createHabit() {
  const btn = document.getElementById('createHabitBtn');
  btn.disabled = true;
  btn.innerHTML = '⏳ Wird erstellt...';

  // API-Call...

  btn.disabled = false;
  btn.innerHTML = 'Erstellen';
}
```

### 48. AI Benefits Markdown-Fix
**Problem:** OpenAI gibt manchmal Markdown Code-Blöcke zurück: \`\`\`json [...] \`\`\`

**Lösung:** Code-Blöcke vor dem JSON-Parsing entfernen:
```typescript
let jsonContent = content.trim();
if (jsonContent.startsWith('```json')) {
  jsonContent = jsonContent.slice(7);
}
if (jsonContent.endsWith('```')) {
  jsonContent = jsonContent.slice(0, -3);
}
const benefits = JSON.parse(jsonContent.trim());
```

### 49. Alle Habits im Dashboard anzeigen
**Problem:** Dashboard zeigte nur 3 Habits (`.slice(0, 3)`)

**Lösung:** Begrenzung entfernt, alle Habits werden angezeigt:
```javascript
// VORHER
const previewHabits = activeHabits.slice(0, 3);

// NACHHER
list.innerHTML = activeHabits.map(habit => {...}).join('');
```

### 50. XP-Anzeige Fix
**Problem:** XP wurden nicht im Level-Block angezeigt (immer 0/100)

**Ursachen:**
1. `loadGamificationData()` las aus `profileResult.data.total_xp` statt `profileResult.data.profile.total_xp`
2. `handleGamificationFeedback()` aktualisierte die XP-Anzeige nicht

**Lösung:**
```javascript
// Fix 1: Korrekter Pfad zu den Profildaten
if (profileResult.success && profileResult.data?.profile) {
  gamificationData.total_xp = profileResult.data.profile.total_xp || 0;
  gamificationData.level = profileResult.data.profile.level || 1;
}

// Fix 2: XP-Anzeige sofort aktualisieren
function handleGamificationFeedback(gamification) {
  if (gamification.total_xp !== undefined) {
    document.getElementById('currentXp').textContent = xpInCurrentLevel;
    document.getElementById('userLevel').textContent = gamification.level;
    document.getElementById('xpProgress').style.width = `${progress}%`;
  }
}
```

### 51. Onboarding nach jedem Login anzeigen
**Feature:** Onboarding erscheint nach jedem erfolgreichen Login (einmal pro Session)

**Implementierung:**
```javascript
function shouldShowOnboarding() {
  // sessionStorage statt localStorage - wird bei jedem Login zurückgesetzt
  const onboardingShownThisSession = sessionStorage.getItem('aiday_onboarding_shown_this_session');
  return !onboardingShownThisSession;
}

function completeOnboarding() {
  sessionStorage.setItem('aiday_onboarding_shown_this_session', 'true');
}

// Bei Logout wird sessionStorage automatisch gelöscht
function logout() {
  sessionStorage.removeItem('aiday_onboarding_shown_this_session');
  // ...
}
```

### 52. "Alle Habits" als Modal
**Feature:** "Alle Habits" Block durch Popup-Modal ersetzt

**Grund:** Vermeidet Verwirrung, da dieselben Habits in "Heute zu erledigen" und "Alle Habits" erschienen

**Implementierung:**
- Button "📋 Alle Habits verwalten" öffnet Modal
- Modal zeigt alle Habits mit Bearbeiten/Löschen-Optionen
- "+ Neuer Habit" Button im Modal

### 53. Habit-Details als eigener Screen
**Feature:** Habit-Details werden als vollständiger Screen angezeigt, nicht als Modal

**Grund:** Konsistenz mit Goal-Detail-Screen, bessere UX

**Implementierung:**
- Modal durch `<div class="screen" id="habitDetailScreen">` ersetzt
- Verwendet `goal-detail-section` und `plan-steps` CSS-Klassen
- "Zurück" Button am Ende des Screens
- "Habit löschen" Button im gleichen Stil wie "Ziel löschen"
- `showScreen('habitDetailScreen')` statt Modal-Display

**Code:**
```javascript
function showHabitDetail(habitId) {
  // ... Daten füllen ...
  previousScreen = 'habitsScreen';
  showScreen('habitDetailScreen');
}

function closeHabitDetail() {
  showScreen(previousScreen || 'habitsScreen', 'back');
  currentHabitDetail = null;
}
```

### 54. Fix: currentUser is not defined
**Problem:** `ReferenceError: currentUser is not defined` in `generateIdempotencyKey`

**Ursache:** Variable `currentUser` existierte nicht global

**Lösung:** User aus localStorage holen:
```javascript
function generateIdempotencyKey() {
  const user = localStorage.getItem('aiday_user');
  const userId = user ? JSON.parse(user)?.id : 'anon';
  return `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

### 55. Fix: CORS Header für Idempotency-Key
**Problem:** `x-idempotency-key is not allowed by Access-Control-Allow-Headers`

**Ursache:** Custom Header nicht in CORS-Konfiguration erlaubt

**Lösung:** Header in `_shared/cors.ts` hinzugefügt:
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key, x-timezone-offset',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}
```

**Betroffene Edge Functions:** Alle (shared cors.ts) - neu deployed
