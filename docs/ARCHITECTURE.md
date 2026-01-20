# Architektur

## Überblick

- **Plattform**: Supabase (Postgres, Auth, Edge Functions)
- **Frontend**: Progressive Web App (PWA) - Single HTML Files
- **Hosting**: GitHub Pages (https://jerdnaandrej777.github.io/aiday/)
- **Sprachen**: SQL (DB), TypeScript (Deno Edge Functions), JavaScript (Frontend)
- **Auth**: Supabase Auth (E-Mail/Passwort, optional OAuth/Apple/Google)
- **AI**: OpenAI GPT-4o-mini (nur Backend)
- **PWA**: Service Worker + Manifest (installierbar, offline-fähig)
- **Sicherheit**: RLS für alle sensiblen Tabellen, Least Privilege
- **Observability**: Audit-Event-Log (Server)

---

## System-Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (app.html)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              GLOBALER HEADER (auf allen Screens)         │   │
│  │  AImDo    [Erreichte Ziele 🏆]   user@email.com  Abmelden │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │Check-in │ │ Goals   │ │ Clarify │ │  Plan   │ │Dashboard│   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
│       │           │           │           │           │         │
│       └───────────┴───────────┴───────────┴───────────┘         │
│                              │                                   │
│                        API Calls (JWT)                           │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ daily-start  │  │ goals-setup  │  │ auth-profile │          │
│  │ daily-checkin│  │ goal-clarify │  │ task-update  │          │
│  │ daily-review │  │ accept-plan  │  │ analytics    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         │     ┌────────────┴────────────┐    │                  │
│         │     │      OpenAI API         │    │                  │
│         │     │    (GPT-4o-mini)        │    │                  │
│         │     └─────────────────────────┘    │                  │
│         │                                     │                  │
│         └─────────────────┬──────────────────┘                  │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      POSTGRESQL (Supabase)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   core   │  │  coach   │  │  notif.  │  │  audit   │        │
│  │ profiles │  │ ai_sugg. │  │  tokens  │  │  logs    │        │
│  │ goals    │  │          │  │          │  │          │        │
│  │ tasks    │  │          │  │          │  │          │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│                    Row Level Security (RLS)                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Frontend (app.html)

### Architektur
- **Single-Page Application**: Alle Screens in einer HTML-Datei
- **State Management**: JavaScript-Variablen (currentUser, currentGoals, etc.)
- **Networking**: Fetch API mit JWT im Authorization-Header
- **Styling**: CSS-Variablen, Glassmorphism, SVG-Icons

### Screens (11 Screens)
| Screen | Funktion |
|--------|----------|
| Dashboard ("AImDo") | Übersicht, Quick Actions, Tasks, klickbare Stat-Boxes |
| Check-in | Stimmung, Energie erfassen |
| Review | Aufgaben vom Vortag bewerten |
| Goals | Ziele definieren |
| Clarify | AI-Klarifizierungsfragen |
| Plan | AI-Plan anzeigen |
| Progress | Heutige Aufgaben |
| **Goals Overview** | Übersicht aller Ziele (klickbar → Goal Detail) |
| Goal Detail | Ziel-Details, Meilensteine, Fortschritt |
| **Erreichte Ziele** | Abgeschlossene Ziele mit Statistiken (NEU) |
| Profile | Persönliche Daten |

### Globaler Header
- **Sichtbar auf allen Screens** (außer Loading-Screen)
- **Inhalt**: "AImDo" Logo, "Erreichte Ziele" Button (Pokal-Icon), E-Mail, "Abmelden"
- **Abstände**: 28px links/rechts für Bündigkeit mit Card-Rand

### Navigation
- **Swipe-Navigation**: Nach rechts wischen = zurück, nach links wischen = vorwärts
- **Zurück-Buttons**: Innerhalb der Cards am unteren Rand
- **Dynamischer Header-Button**:
  - Auf Dashboard: "Mein Fortschritt" → Progress Screen
  - Auf anderen Screens: "Dashboard" → zurück zum Dashboard
- **Klickbare Stat-Boxes**: "Aktive Ziele" → Goals Overview Screen

### Interaktive UI-Elemente
- **Animiertes Mood Face**: SVG-basiertes Gesicht im "Heute"-Block
  - 5 Expressionen basierend auf Check-in Stimmung (great/good/neutral/bad/terrible)
  - Animationen: Blinzeln, Lächeln, Wangen-Pulsieren, Tränen
  - Klickbar mit mood-spezifischen Animationen (Tanzen, Zunge, Umarmung etc.)
  - Speech Bubble mit aufmunternden Nachrichten
- **Energielevel-Validierung**:
  - Wellenförmige Puls-Animation statt Fehlermeldung
  - Sprechblase über dem Label
  - Auto-Scroll zum Energy-Slider
- **Toast Notifications**: Ersetzen alle alert() Dialoge
- **Confetti-Animation**: Bei Erledigung aller täglichen Aufgaben

### Design-System
- **Farbpalette**: Blau (#6366f1) + Cyan (#22d3ee) Gradient
- **Buttons**: Abgerundete Gradient-Buttons (30px border-radius)
- **Header**: Abgerundete untere Ecken (24px), 28px seitliches Padding
- **Glassmorphism**: Transparente Cards mit backdrop-filter
- **SVG-Icons**: Konsistente Stroke-based Icons
- **Animationen**: Slide-Animationen, Hover-Effekte, Puls-Animationen
- **Speech Bubbles**: Gradient-Hintergrund mit Pfeil, mood-spezifische Farben
- **Einheitliche Abstände**: 28px links/rechts für Header, Screens, App-body
- **Card-Padding**: 16px für inneren Abstand

---

## Auth & Sessions

- Supabase Auth (E-Mail/Passwort, Magic Link, OAuth)
- Access/Refresh Token im localStorage
- JWT im Authorization-Header für alle API-Calls

---

## AI-Integration

### Architektur
```
Frontend → Edge Function → OpenAI API
               ↓
        Profildaten laden
               ↓
        Personalisierter Prompt
```

### Wichtig
- OpenAI API-Key nur im Backend (Edge Functions)
- NIEMALS API-Key im Frontend!
- Profildaten werden automatisch geladen und im Prompt verwendet

### Verwendete Functions
| Function | AI-Nutzung |
|----------|------------|
| `goal-clarify` | Analysiert Ziel, stellt Klarifizierungsfragen |
| `goals-setup` | Generiert Plan mit Meilensteinen und Tasks |

---

## Datenbank

### Schemas
- **core**: user_profile, day_entries, goals, action_steps, daily_checkins, daily_tasks
- **coach**: ai_suggestions
- **notifications**: push_tokens
- **analytics**: month_rollup (Materialized View)
- **audit**: event_log

### Wichtige Tabellen

```sql
-- Benutzer & Profil (mit persönlichen Daten)
core.user_profile
  - age, job, education, family_status
  - hobbies, strengths, challenges, motivation

-- Ziele (mit integriertem AI-Plan)
core.goals
  - is_longterm, target_date, status
  - why_important, previous_efforts, believed_steps
  - plan_json (JSONB)  -- NEU: Direkt gespeicherter AI-Plan

-- Tägliche Tasks
core.daily_tasks
  - task_text, completed, goal_id
  - ai_generated, estimated_minutes

-- AI-History
coach.ai_suggestions
  - kind: 'goals_setup', 'plan_accepted', 'plan_regenerated', etc.
  - goal_id (optional), payload_json
```

### Policies
- Strikte RLS pro Tabelle
- User sieht nur eigene Daten
- Service-Role-Ausnahmen für AI/Audit/CRON

---

## Edge Functions

### Daily Coaching Flow
| Function | Beschreibung |
|----------|--------------|
| `daily-start` | Flow-Status, lädt plan_json, **AUTO-generiert tägliche Tasks** |
| `daily-checkin` | Check-in speichern |
| `goal-clarify` | AI-Klarifizierungsfragen |
| `goals-setup` | Ziele + AI-Plan erstellen (speichert plan_json) |
| `goal-regenerate-plan` | AI-Plan für bestehendes Ziel regenerieren |
| `goal-delete` | Ziel mit allen Daten löschen |
| `accept-plan` | Plan akzeptieren, initiale Tasks erstellen |
| `task-update` | Task bearbeiten |
| `daily-review` | Tagesreview |

### Auth & Profil
| Function | Beschreibung |
|----------|--------------|
| `auth-profile` | GET/POST Profil |
| `auth-onboarding` | Profil einrichten |
| `auth-delete-account` | Account löschen |
| `auth-export-data` | GDPR Export |

### Wichtig
- JWT-Validierung im Code (nicht durch Supabase)
- Deployment: `--no-verify-jwt` Flag
- Schema explizit angeben: `supabase.schema('core').from(...)`

---

## Build & Deploy

### Backend
```bash
# Migrationen
npx supabase db push

# Functions
npx supabase functions deploy --no-verify-jwt
```

### Frontend (GitHub Pages)
```bash
# Repository: https://github.com/jerdnaandrej777/aiday
git add -A
git commit -m "Update"
git push
# GitHub Pages baut automatisch
```

---

## PWA-Architektur

### Komponenten
```
┌─────────────────────────────────────────────────────────────┐
│                    PWA FRONTEND                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │   app.html     │  │  start-ui.html │  │  offline.html  │ │
│  │  (Haupt-App)   │  │  (Login/Reg)   │  │  (Fallback)    │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
│                              │                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   SERVICE WORKER (sw.js)                ││
│  │  • Cache-First: Statische Assets                        ││
│  │  • Network-First: API-Calls                             ││
│  │  • Offline-Fallback: offline.html                       ││
│  └─────────────────────────────────────────────────────────┘│
│                              │                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   MANIFEST (manifest.json)              ││
│  │  • App-Name, Icons, Theme-Farben                        ││
│  │  • Standalone-Modus, Start-URL                          ││
│  │  • Shortcuts für Quick-Actions                          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Service Worker Strategien
| Ressource | Strategie | Beschreibung |
|-----------|-----------|--------------|
| HTML, CSS, JS | Cache-First | Schnelles Laden aus Cache |
| Icons, Bilder | Cache-First | Offline verfügbar |
| API-Calls | Network-First | Frische Daten, Fallback zu Cache |
| Unbekannte URLs | Network-Only | Offline → offline.html |

### PWA-Dateien
| Datei | Funktion |
|-------|----------|
| `manifest.json` | App-Metadaten, Icons, Theme |
| `sw.js` | Service Worker (Caching, Offline) |
| `offline.html` | Offline-Fallback-Seite |
| `icons/` | App-Icons (72px - 512px) |

### Installation
- **Android**: Chrome Menü → "App installieren"
- **iOS**: Safari Teilen → "Zum Home-Bildschirm"
- **Desktop**: Chrome/Edge Install-Icon in Adressleiste

---

## Sicherheit

### Frontend
- Keine API-Keys im Code
- JWT für Authentifizierung
- Alle sensiblen Operationen über Edge Functions

### Backend
- Row Level Security (RLS)
- Zod-Validierung für alle Inputs
- Audit-Logging
- GDPR-Konformität (Export, Löschung)
