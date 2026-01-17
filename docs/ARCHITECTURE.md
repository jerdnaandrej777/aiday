# Architektur

## Überblick

- **Plattform**: Supabase (Postgres, Auth, Edge Functions)
- **Frontend**: Single HTML Files (app.html)
- **Sprachen**: SQL (DB), TypeScript (Deno Edge Functions), JavaScript (Frontend)
- **Auth**: Supabase Auth (E-Mail/Passwort, optional OAuth/Apple/Google)
- **AI**: OpenAI GPT-4o-mini (nur Backend)
- **Sicherheit**: RLS für alle sensiblen Tabellen, Least Privilege
- **Observability**: Audit-Event-Log (Server)

---

## System-Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (app.html)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              GLOBALER HEADER (auf allen Screens)         │   │
│  │  aiday    [Mein Fortschritt]    user@email.com  Abmelden │   │
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

### Screens
| Screen | Funktion |
|--------|----------|
| Dashboard ("aiday") | Übersicht, Quick Actions, Tasks, Ziele |
| Check-in | Stimmung, Energie erfassen |
| Review | Aufgaben vom Vortag bewerten |
| Goals | Ziele definieren |
| Clarify | AI-Klarifizierungsfragen |
| Plan | AI-Plan anzeigen |
| Progress | Statistiken |
| Goal Detail | Ziel-Details |
| Profile | Persönliche Daten |

### Globaler Header (NEU)
- **Sichtbar auf allen Screens** (außer Loading-Screen)
- **Inhalt**: "aiday" Logo, "Mein Fortschritt" Button, E-Mail, "Abmelden"
- **Abstände**: 28px links/rechts für Bündigkeit mit Card-Rand

### Navigation
- **Swipe-Navigation**: Nach rechts wischen = zurück, nach links wischen = vorwärts
- **Zurück-Buttons**: Innerhalb der Cards am unteren Rand
- **Header**: Global sichtbar mit Gradient-Button für "Mein Fortschritt"

### Design-System
- **Farbpalette**: Blau (#6366f1) + Cyan (#22d3ee) Gradient
- **Buttons**: Abgerundete Gradient-Buttons (30px border-radius)
- **Header**: Abgerundete untere Ecken (24px), 28px seitliches Padding
- **Glassmorphism**: Transparente Cards mit backdrop-filter
- **SVG-Icons**: Konsistente Stroke-based Icons
- **Animationen**: Slide-Animationen, Hover-Effekte
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

-- Ziele
core.goals
  - is_longterm, target_date, status
  - why_important, previous_efforts, believed_steps

-- Tägliche Tasks
core.daily_tasks
  - task_text, completed, goal_id
  - ai_generated, estimated_minutes
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
| `daily-start` | Flow-Status (review/checkin/goals/dashboard) |
| `daily-checkin` | Check-in speichern |
| `goal-clarify` | AI-Klarifizierungsfragen |
| `goals-setup` | Ziele + AI-Plan erstellen |
| `accept-plan` | Plan akzeptieren, Tasks erstellen |
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

### Frontend
- Statische HTML-Dateien
- Kein Build-Prozess nötig
- Direkt im Browser öffnen

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
