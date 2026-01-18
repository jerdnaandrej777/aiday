# AIDAY

KI-gestützter Tagesplaner - Progressive Web App (PWA) mit vollständigem täglichen Coaching-Flow auf Basis von Supabase und OpenAI GPT-4o-mini.

**Installierbar auf Homescreen (Android, iOS, Desktop) mit Offline-Funktionalität.**

## Inhaltsverzeichnis

- [Live-Demo & Installation](#live-demo--installation)
- [Features](#features)
- [PWA-Features](#pwa-features)
- [Schnellstart](#schnellstart)
- [Projektstruktur](#projektstruktur)
- [Datenbank](#datenbank)
- [API Testen](#api-testen)
- [UI-Design](#ui-design)
- [AI-Integration](#ai-integration)
- [Dokumentation](#dokumentation)
- [Tech Stack](#tech-stack)

---

## Live-Demo & Installation

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

### Test-Credentials
**Demo-Account:** `admin@aiday.test` / `admin1`

---

## Features

### Daily Coaching Flow (Hauptfeature)
- **Täglicher Check-in**: Stimmung, Energie, Notizen erfassen
- **Ziel-Definition**: Intelligente AI-Klarifizierung (z.B. "Bist du angestellt oder selbstständig?")
- **Personalisierte Pläne**: Meilensteine und tägliche Tasks basierend auf Kontext und Profil
- **Task-Management**: Aufgaben abhaken, löschen, Fortschritt verfolgen
- **Progress Dashboard**: Statistiken, Streak, alle Ziele im Überblick

### Profil-System (NEU)
- **Persönliche Daten**: Alter, Beruf, Bildung, Familienstand
- **Interessen**: Hobbys, Stärken, Herausforderungen, Motivation
- **AI-Personalisierung**: Profildaten werden für bessere Empfehlungen genutzt

### Backend
- **Authentifizierung**: Signup, Login, Password Reset (Supabase Auth)
- **AI-Integration**: OpenAI GPT-4o-mini für Klarifizierung und Plan-Generierung
- **GDPR-Konformität**: Datenexport und Account-Löschung
- **Push Notifications**: Firebase Cloud Messaging Integration

---

## PWA-Features

### Installierbar
- **Homescreen-Installation** auf Android, iOS und Desktop
- **App-Icons** in allen Größen (72px - 512px)
- **Standalone-Modus** ohne Browser-UI

### Offline-Funktionalität
- **Service Worker** mit Cache-First Strategie
- **Offline-Fallback** zu offline.html bei Verbindungsverlust
- **Automatische Update-Erkennung** bei neuen Versionen

### Mobile-Optimierung
- **Kein horizontales Scrollen** - volle Bildschirmbreite
- **Touch-optimierte Buttons** (56px Mindestgröße)
- **Swipe-Navigation** zwischen Screens

### Technische Details
```javascript
// Service Worker Strategien
- Cache-First: Statische Assets (HTML, CSS, JS, Icons)
- Network-First: API-Calls
- Offline-Fallback: offline.html
```

---

## Edge Functions (LIVE DEPLOYED)

#### Daily Coaching (Hauptfeatures)
| Function | Methode | Beschreibung |
|----------|---------|--------------|
| `daily-start` | GET/POST | Flow-Status (step: review/checkin/goals/dashboard) |
| `daily-checkin` | POST | Check-in speichern |
| `goal-clarify` | POST | AI-Klarifizierungsfragen |
| `goals-setup` | POST | Ziele + AI-Plan erstellen (nutzt Profildaten) |
| `accept-plan` | POST | Plan akzeptieren, Tasks erstellen |
| `task-update` | POST | Task abhaken/löschen |
| `daily-review` | POST | Tagesreview |

#### Auth & Profil
| Function | Methode | Beschreibung |
|----------|---------|--------------|
| `auth-profile` | **GET/POST** | Benutzerprofil abrufen/aktualisieren |
| `auth-onboarding` | POST | Profil einrichten |
| `auth-delete-account` | POST | Account löschen (GDPR) |
| `auth-export-data` | GET | Daten exportieren (GDPR) |
| `analytics-monthly` | GET | Monatsstatistik |

---

## Schnellstart

### Voraussetzungen
- [Supabase CLI](https://supabase.com/docs/reference/cli/installing)
- [Deno](https://deno.com/)
- OpenAI API Key (für AI-Features)
- FCM Server Key (für Push-Notifications)

### Installation

```bash
# 1. Repository klonen
git clone <repo-url>
cd aiday

# 2. Supabase einloggen
supabase login

# 3. Projekt verknüpfen
supabase link --project-ref $SUPABASE_PROJECT_REF

# 4. Lokale Entwicklungsumgebung starten
supabase start

# 5. Datenbank-Schema anwenden
supabase db reset
```

### Umgebungsvariablen

Kopiere `.env.example` nach `.env` und fülle die Werte aus:

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
FCM_SERVER_KEY=...
CRON_SECRET=...
```

### Edge Functions lokal testen

```bash
# Alle Functions starten
supabase functions serve

# Einzelne Function (Beispiel: daily-start)
supabase functions serve daily-start
```

### Deployment (Supabase Cloud)

```bash
# 1. Projekt verknüpfen
npx supabase link --project-ref <PROJECT_REF>

# 2. Datenbank-Migrationen anwenden
npx supabase db push

# 3. Schema-Berechtigungen setzen (einmalig im SQL Editor)
# Siehe unten: "Schema-Konfiguration"

# 4. Edge Functions deployen (WICHTIG: --no-verify-jwt)
npx supabase functions deploy --no-verify-jwt
```

### Schema-Konfiguration (SQL Editor)

Nach dem ersten Deployment diese SQL-Befehle im Supabase Dashboard SQL Editor ausführen:

```sql
-- Schemas für PostgREST API freigeben
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

### Wichtig: Schema-Verwendung in Edge Functions

Alle Datenbankabfragen müssen das Schema explizit angeben:

```typescript
// RICHTIG - Schema explizit angeben
supabase.schema('core').from('user_profile')
supabase.schema('coach').from('ai_suggestions')
supabase.schema('notifications').from('push_tokens')
supabase.schema('analytics').from('month_rollup')
supabase.schema('audit').from('event_log')

// FALSCH - sucht im public schema
supabase.from('user_profile')
```

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
│   │   ├── # Daily Coaching Flow
│   │   ├── daily-start/          # Flow-Status
│   │   ├── daily-checkin/        # Check-in speichern
│   │   ├── goal-clarify/         # AI-Klarifizierung
│   │   ├── goals-setup/          # Ziele + Plan erstellen
│   │   ├── accept-plan/          # Plan akzeptieren
│   │   ├── task-update/          # Tasks bearbeiten
│   │   ├── daily-review/         # Tagesreview
│   │   │
│   │   ├── # Auth & Utilities
│   │   ├── auth-profile/         # GET/POST Profil
│   │   ├── auth-onboarding/
│   │   ├── auth-delete-account/
│   │   ├── auth-export-data/
│   │   ├── analytics-monthly/
│   │   └── reminders-dispatch/
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
├── icons/                        # PWA App-Icons (alle Größen)
│   ├── icon.svg                  # Basis-SVG
│   └── icon-72.png ... icon-512.png
│
├── app.html                      # HAUPT-APP (Täglicher Coaching-Flow)
├── start-ui.html                 # Onboarding UI
├── offline.html                  # PWA Offline-Fallback
├── index.html                    # Redirect zu start-ui.html
├── manifest.json                 # PWA Manifest
├── sw.js                         # Service Worker
├── test-api.html                 # API Test Konsole
├── claude.md                     # Projektkontext für Claude Code
└── .env.example                  # Umgebungsvariablen Template
```

---

## Datenbank

### Schemas
- **core**: Benutzerprofile, Tageseinträge, Ziele, Aktionsschritte
- **coach**: AI-Vorschläge
- **notifications**: Push-Tokens
- **analytics**: Monatsstatistiken (Materialized View)
- **audit**: Event-Log

### Persönliche Profildaten (NEU)
```sql
core.user_profile
  - age               -- Alter (INTEGER)
  - job               -- Beruf (TEXT)
  - education         -- Bildungsabschluss (TEXT)
  - family_status     -- Familienstand (TEXT)
  - hobbies           -- Hobbys und Interessen (TEXT)
  - strengths         -- Persönliche Stärken (TEXT)
  - challenges        -- Größte Herausforderungen (TEXT)
  - motivation        -- Lebensmotto/Antrieb (TEXT)
```

### Row Level Security
Alle Tabellen haben RLS aktiviert. Benutzer können nur ihre eigenen Daten lesen/schreiben.

---

## API Testen

### Option 1: test-api.html (Empfohlen)
1. `test-api.html` im Browser öffnen (Doppelklick)
2. **"Demo Login (admin)"** klicken - erstellt automatisch Test-Account
3. Endpoints testen

**Test-Credentials:** `admin@aiday.test` / `admin1`

Der Demo-Login versucht zuerst ein Login. Falls der Account nicht existiert, wird er automatisch erstellt und dann eingeloggt.

### Option 2: Postman
1. `postman/aiday.postman_collection.json` importieren
2. `postman/aiday.postman_environment.json` importieren
3. Variablen setzen (SUPABASE_URL, SUPABASE_ANON_KEY, etc.)

---

## UI-Design

### Screens in app.html
| Screen | Beschreibung |
|--------|--------------|
| **Dashboard ("aiday")** | Tägliche Tasks, Fortschritt |
| Check-in | Stimmung, Energie, Notizen |
| Review | Aufgaben vom Vortag bewerten |
| Goals | Ziel mit Details eingeben |
| Clarify | AI-Klarifizierungsfragen beantworten |
| Plan | AI-Plan mit Meilensteinen prüfen, "Zurück zum Hauptmenü" |
| **Progress ("Mein Fortschritt")** | Statistiken, nur aktive Ziele (mit Plan) |
| Goal Detail | Ziel-Details mit Plan und Tasks |
| **Profile ("Mein Profil")** | Persönliche Daten bearbeiten |

### start-ui.html Features
- **Onboarding Slides**: Animierte Einführung mit Bokeh-Uhren
- **Login/Register**: Auth-Screens mit Glassmorphism
- **"Einlogdaten merken"**: Checkbox zum Speichern der Login-Daten
- **5 Ambient Orbs**: Erweiterte Hintergrund-Animationen

### Swipe-Navigation
- **Nach rechts wischen:** Zurück zur vorherigen Seite
- **Nach links wischen:** Vorwärts (wo sinnvoll)

### Design-System
- **Glassmorphism**: Transparente Cards mit Blur
- **SVG-Icons**: Konsistente Stroke-based Icons (statt Emojis)
- **Gradient-Buttons**: Blau-Cyan Gradient mit 30px border-radius
- **Globaler Header**: Auf allen Screens sichtbar (außer Loading)
- **Abgerundeter Header**: 24px border-radius unten
- **Unified "Zurück"-Button**: Transparent, 30px border-radius, innerhalb Cards
- **Einheitliche Abstände**: 28px links/rechts für bündige Ausrichtung
- **"Übersicht"**: Quick Actions Bereich im Dashboard
- **Loading-States**: Buttons zeigen Status ("Plan wird erstellt...", "Wird gespeichert...")

---

## AI-Integration

### Architektur
```
Frontend (app.html) → Edge Functions (Backend) → OpenAI GPT-4o-mini
                              ↓
                    Profildaten für Personalisierung
```

**Wichtig:** Der OpenAI API-Key ist nur im Backend verfügbar, NICHT im Frontend!

### Personalisierung
Die `goals-setup` Function lädt automatisch das Benutzerprofil und fügt es dem AI-Prompt hinzu für bessere, personalisierte Empfehlungen.

---

## Dokumentation

| Datei | Inhalt |
|-------|--------|
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) | **Schnellstart-Anleitung** |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | **Umgebungsvariablen** |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Systemarchitektur |
| [docs/DB_SCHEMA.md](docs/DB_SCHEMA.md) | Datenbankmodell |
| [docs/API.md](docs/API.md) | API Endpoints |
| [docs/EDGE_FUNCTIONS.md](docs/EDGE_FUNCTIONS.md) | Edge Functions Details |
| [docs/SECURITY.md](docs/SECURITY.md) | Sicherheit & RLS |
| [docs/TESTING.md](docs/TESTING.md) | Test-Strategie |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Deployment & Betrieb |
| [docs/ACCOUNT.md](docs/ACCOUNT.md) | Account-Management |
| [docs/UI_DESIGN.md](docs/UI_DESIGN.md) | UI Design-System |

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
supabase functions deploy daily-start --no-verify-jwt
supabase functions deploy daily-checkin --no-verify-jwt
supabase functions deploy daily-review --no-verify-jwt
supabase functions deploy task-update --no-verify-jwt
supabase functions deploy auth-profile --no-verify-jwt
supabase functions deploy auth-onboarding --no-verify-jwt
```

---

## Tech Stack

| Komponente | Technologie |
|------------|-------------|
| Backend | Supabase (Deno Edge Functions) |
| Datenbank | PostgreSQL mit Row Level Security |
| AI | OpenAI GPT-4o-mini |
| Push | Firebase Cloud Messaging (FCM) |
| Validation | Zod Schemas |
| Auth | Supabase Auth (JWT) |
| Frontend | Single HTML Files (PWA) |
| Hosting | GitHub Pages |
| PWA | Service Worker + Manifest |
