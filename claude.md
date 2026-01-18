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
- Check-in (Stimmung, Energie)
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
│   │   │
│   │   │── # === LEGACY ===
│   │   ├── coach-plan/           # POST - AI Tagesplan (alt)
│   │   ├── coach-checkin/        # POST - AI Check-in (alt)
│   │   ├── analytics-monthly/    # GET - Monatsstatistik
│   │   └── reminders-dispatch/   # POST - Push versenden
│   │
│   └── migrations/
│       └── 20240103000000_profile_personal.sql
│
├── db/                           # SQL Migrations
│   ├── 001_init.sql
│   ├── 002_auth.sql
│   └── 003_daily_coaching.sql
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
- [x] Task-Management (Abhaken, Löschen)
- [x] Fortschritts-Dashboard mit Statistiken
- [x] Streak-Berechnung

### AI-Features (GPT-4o-mini)
- [x] Intelligente Klarifizierungsfragen basierend auf Zieltyp
- [x] Kontext-abhängige Planenerstellung
- [x] Spezifische Tasks statt generischer Phrasen
- [x] Meilenstein-Planung mit Zeitrahmen
- [x] **Personalisierung basierend auf Alter, Beruf, Hobbys etc.**

### PWA-Features (NEU)
- [x] **Installierbar auf Homescreen** (Android, iOS, Desktop)
- [x] **Offline-Funktionalität** mit Service Worker
- [x] **App-Icons** in allen Größen (72px - 512px)
- [x] **Push-Notification-Unterstützung**
- [x] **Automatische Update-Erkennung**
- [x] **Offline-Banner bei Verbindungsverlust**

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
- [x] **Unified "Zurück"-Button**
- [x] **Swipe-Navigation (links/rechts wischen)**
- [x] **Streak-Tracking-Anzeige**
- [x] **Mobile-optimiert (kein horizontales Scrollen)**
- [x] **Runde Emoji-Buttons im Check-in**

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
| `goals-setup` | POST | Ziele + AI-Plan erstellen | GPT-4o-mini |
| `goal-clarify` | POST | AI-Klarifizierungsfragen | GPT-4o-mini |
| `accept-plan` | POST | Plan akzeptieren & Tasks erstellen | - |
| `daily-start` | GET/POST | Täglicher Flow-Status | - |
| `daily-checkin` | POST | Check-in speichern | - |
| `daily-review` | POST | Tagesreview mit AI-Feedback | GPT-4o-mini |
| `task-update` | POST | Task abhaken/löschen | - |
| `coach-plan` | POST | AI-Tagesplan | GPT-4o-mini |
| `coach-checkin` | POST | AI-Coaching Feedback | GPT-4o-mini |
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
- **core**: user_profile, day_entries, goals, action_steps, daily_checkins, daily_tasks
- **coach**: ai_suggestions
- **notifications**: push_tokens
- **analytics**: month_rollup (Materialized View)
- **audit**: event_log

### Wichtige Tabellen

```sql
-- Benutzer & Profil
core.user_profile
  - age, job, education, family_status
  - hobbies, strengths, challenges, motivation

-- Ziele
core.goals
  - title, category, status
  - why_important, previous_efforts, believed_steps
  - is_longterm, target_date

-- Daily Coaching
core.daily_checkins   -- mood, energy_level, mood_note
core.daily_tasks      -- task_text, completed, goal_id

-- AI
coach.ai_suggestions  -- kind, payload_json
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
