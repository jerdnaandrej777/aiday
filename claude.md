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
│   │   ├── goal-delete/          # POST - Ziel löschen (mit Bestätigung)
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

### PWA-Features (NEU)
- [x] **Installierbar auf Homescreen** (Android, iOS, Desktop)
- [x] **Offline-Funktionalität** mit Service Worker
- [x] **App-Icons** in allen Größen (72px - 512px)
- [x] **Push-Notification-Unterstützung**
- [x] **Automatische Update-Erkennung**
- [x] **Offline-Banner bei Verbindungsverlust**

### Frontend (app.html) - 11 Screens
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
| `task-update` | POST | Task abhaken/löschen | - |
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
  - estimated_minutes INTEGER DEFAULT 15  -- NEU: Geschätzte Dauer
  - created_at TIMESTAMPTZ
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
