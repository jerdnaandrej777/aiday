# API & Endpunkte

## Auth
- Supabase Auth (E-Mail/Passwort, Magic Links, OAuth)
- Token wird per `Authorization: Bearer <jwt>` gesendet

---

## Edge Functions (Hauptfeatures)

### Daily Coaching Flow
| Function | Methode | Beschreibung |
|----------|---------|--------------|
| `daily-start` | GET/POST | Flow-Status (step: review/checkin/goals/dashboard) |
| `daily-checkin` | POST | Check-in speichern (mood, energy) |
| `goal-clarify` | POST | AI-Klarifizierungsfragen für Ziel |
| `goals-setup` | POST | Ziele erstellen + AI-Plan generieren (nutzt Profildaten) |
| `accept-plan` | POST | Plan akzeptieren, Tasks erstellen |
| `task-update` | POST | Task abhaken/löschen |
| `daily-review` | POST | Tagesreview |

### Auth & Profil
| Function | Methode | Beschreibung |
|----------|---------|--------------|
| `auth-profile` | **GET/POST** | Benutzerprofil abrufen/aktualisieren |
| `auth-onboarding` | POST | Profil einrichten |
| `auth-delete-account` | POST | Account löschen (GDPR) |
| `auth-export-data` | GET | Daten exportieren (GDPR) |

### Utilities
| Function | Methode | Beschreibung |
|----------|---------|--------------|
| `analytics-monthly` | GET | Monatsstatistiken |
| `reminders-dispatch` | POST | Push-Notifications (CRON) |

Details siehe [EDGE_FUNCTIONS.md](EDGE_FUNCTIONS.md)

---

## REST (Supabase Auto-API)

### Core-Tabellen
```
GET    /rest/v1/core.day_entries
POST   /rest/v1/core.day_entries
PATCH  /rest/v1/core.day_entries?id=eq.<id>

GET    /rest/v1/core.goals
GET    /rest/v1/core.daily_checkins
GET    /rest/v1/core.daily_tasks
GET    /rest/v1/core.user_profile
```

### Push-Token registrieren
```
POST {SUPABASE_URL}/rest/v1/notifications.push_tokens
Headers:
  apikey: {SUPABASE_ANON_KEY}
  Authorization: Bearer {ACCESS_TOKEN}
  Content-Type: application/json
Body:
  {
    "token": "<FCM/APNs-Token>",
    "platform": "ios"|"android",
    "locale": "de-DE",
    "app_version": "1.0.0"
  }
```

---

## Beispiel: Typischer App-Flow

```javascript
// 1. Login
const { data: auth } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// 2. Daily Start aufrufen
const startResult = await fetch(`${SUPABASE_URL}/functions/v1/daily-start`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${auth.session.access_token}` }
});
const { step, data } = await startResult.json();

// 3. Je nach step entsprechenden Screen zeigen
switch(step) {
  case 'review':   // Zeige Review-Screen
  case 'checkin':  // Zeige Check-in Screen
  case 'goals':    // Zeige Goals-Setup Screen
  case 'dashboard': // Zeige Dashboard mit Tasks
}

// 4. Check-in senden
await fetch(`${SUPABASE_URL}/functions/v1/daily-checkin`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    mood: 'good',
    energy_level: 4,
    mood_note: 'Gut gelaunt heute'
  })
});

// 5. Ziel mit Klarifizierung
const clarifyResult = await fetch(`${SUPABASE_URL}/functions/v1/goal-clarify`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ goal_title: '50% mehr verdienen' })
});
// → Zeigt Fragen wie "Bist du angestellt oder selbstständig?"

// 6. Plan erstellen
const planResult = await fetch(`${SUPABASE_URL}/functions/v1/goals-setup`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    goals: [{
      title: '50% mehr verdienen',
      why_important: 'Für mehr Freiheit',
      believed_steps: '--- Zusätzliche Details ---\nAngestellt als Developer'
    }]
  })
});

// 7. Plan akzeptieren
await fetch(`${SUPABASE_URL}/functions/v1/accept-plan`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    goal_id: 'uuid',
    plan: planResult.ai_plan.plans[0]
  })
});

// 8. Profil abrufen (GET)
const profileResult = await fetch(`${SUPABASE_URL}/functions/v1/auth-profile`, {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});

// 9. Profil aktualisieren (POST)
await fetch(`${SUPABASE_URL}/functions/v1/auth-profile`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    age: 35,
    job: 'Softwareentwickler',
    hobbies: 'Gaming, Wandern',
    challenges: 'Wenig Zeit'
  })
});
```

---

## Postman-Collection
- Siehe `postman/aiday.postman_collection.json`
