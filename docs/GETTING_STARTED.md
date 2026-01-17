# AIDAY - Schnellstart-Anleitung

## Voraussetzungen

- Node.js 18+
- Supabase CLI (`npm install -g supabase`)
- Git

---

## 1. Repository klonen

```bash
git clone <repository-url>
cd aiday
```

---

## 2. Umgebungsvariablen einrichten

Erstelle eine `.env` Datei im Root-Verzeichnis:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (für AI-Features)
OPENAI_API_KEY=sk-your-openai-key
```

**Werte findest du in:**
- Supabase Dashboard → Settings → API
- OpenAI Platform → API Keys

---

## 3. Supabase lokal starten (optional)

```bash
# Supabase lokal starten
supabase start

# Datenbank initialisieren
supabase db reset
```

**Lokale URLs:**
- API: `http://localhost:54321`
- Studio: `http://localhost:54323`

---

## 4. Edge Functions deployen

```bash
# Alle Functions deployen (Cloud)
npx supabase functions deploy --no-verify-jwt

# Oder lokal testen
supabase functions serve
```

---

## 5. App starten

Öffne `app.html` im Browser:

```bash
# Mit einem lokalen Server (empfohlen)
npx serve .

# Oder direkt öffnen
open app.html
```

---

## Projekt-Struktur

```
aiday/
├── app.html                    # Haupt-App (Single Page)
├── start-ui.html               # Login/Registrierung
├── test-api.html               # API-Test-Tool
├── db/                         # SQL-Migrationen
│   ├── 001_init.sql
│   ├── 002_auth.sql
│   └── 003_daily_coaching.sql
├── supabase/
│   └── functions/              # Edge Functions
│       ├── daily-start/
│       ├── daily-checkin/
│       ├── goals-setup/
│       ├── accept-plan/
│       ├── task-update/
│       ├── daily-review/
│       ├── auth-profile/
│       └── _shared/            # Shared Utilities
└── docs/                       # Dokumentation
```

---

## Nächste Schritte

1. **Registrieren:** Öffne `start-ui.html` und erstelle einen Account
2. **Check-in:** Beantworte die täglichen Fragen
3. **Ziele setzen:** Definiere deine Ziele
4. **AI-Plan:** Erhalte einen personalisierten Plan

---

## Hilfe

- **Dokumentation:** Siehe `docs/` Ordner
- **API-Referenz:** `docs/API.md`
- **Datenbank:** `docs/DB_SCHEMA.md`
- **Design:** `docs/UI_DESIGN.md`
