# Umgebungsvariablen

## Übersicht

| Variable | Erforderlich | Beschreibung |
|----------|--------------|--------------|
| `SUPABASE_URL` | Ja | Supabase Projekt-URL |
| `SUPABASE_ANON_KEY` | Ja | Öffentlicher API-Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Ja | Service-Role Key (nur Backend) |
| `OPENAI_API_KEY` | Ja | OpenAI API-Key für AI-Features |

---

## Supabase Variablen

### SUPABASE_URL
- **Format:** `https://your-project-id.supabase.co`
- **Wo finden:** Supabase Dashboard → Settings → API → Project URL
- **Verwendung:** Frontend & Backend

### SUPABASE_ANON_KEY
- **Format:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Wo finden:** Supabase Dashboard → Settings → API → anon public
- **Verwendung:** Frontend (öffentlich sicher)
- **Hinweis:** Dieser Key ist öffentlich einsehbar, RLS schützt die Daten

### SUPABASE_SERVICE_ROLE_KEY
- **Format:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Wo finden:** Supabase Dashboard → Settings → API → service_role
- **Verwendung:** Nur Backend (Edge Functions)
- **ACHTUNG:** Niemals im Frontend verwenden! Umgeht RLS.

---

## OpenAI Variable

### OPENAI_API_KEY
- **Format:** `sk-...`
- **Wo finden:** OpenAI Platform → API Keys
- **Verwendung:** Edge Functions (goals-setup, goal-clarify)
- **Modell:** GPT-4o-mini

---

## Lokale Entwicklung

Für lokale Supabase-Instanz:

```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<lokaler-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<lokaler-service-key>
```

Die lokalen Keys werden beim Start von `supabase start` angezeigt.

---

## Edge Functions Secrets

Secrets für Cloud-Deployment setzen:

```bash
# OpenAI Key setzen
supabase secrets set OPENAI_API_KEY=sk-your-key

# Alle Secrets auflisten
supabase secrets list
```

---

## Frontend Konfiguration

In `app.html` und `start-ui.html`:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

**Hinweis:** Diese Werte müssen manuell in den HTML-Dateien aktualisiert werden.

---

## Sicherheitshinweise

1. **Niemals** `SUPABASE_SERVICE_ROLE_KEY` im Frontend verwenden
2. **Niemals** `OPENAI_API_KEY` im Frontend verwenden
3. `.env` Datei in `.gitignore` aufnehmen
4. Secrets nicht in Code committen
