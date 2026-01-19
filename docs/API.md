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
| `task-update` | POST | Task abhaken/löschen + XP vergeben |
| `daily-review` | POST | Tagesreview |
| `gamification-award` | POST | XP vergeben & Achievements prüfen (NEU) |

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

---

## Gamification-System (NEU)

### gamification-award
XP vergeben und Achievements prüfen.

**POST** `/functions/v1/gamification-award`

```json
// Request
{
  "action": "task_complete" | "all_tasks_complete" | "goal_achieved" | "streak_continued" | "checkin_done",
  "metadata": {
    "streak_days": 7,           // optional
    "tasks_completed_today": 3,  // optional
    "total_tasks_completed": 45, // optional
    "goals_count": 2             // optional
  }
}

// Response
{
  "xp_earned": 60,
  "total_xp": 1240,
  "level": 5,
  "previous_level": 5,
  "level_up": false,
  "new_achievements": [
    {
      "code": "tasks_50",
      "name": "Produktiv",
      "icon": "🌟",
      "xp_reward": 300
    }
  ]
}
```

### task-update (mit Gamification)
Task-Completion vergibt automatisch XP.

**POST** `/functions/v1/task-update`

```json
// Request
{
  "task_id": "uuid",
  "action": "complete" | "uncomplete" | "delete",
  "timezone_offset": -60  // optional, für korrekte Datumsberechnung
}

// Response bei action: "complete"
{
  "success": true,
  "action": "complete",
  "completed": true,
  "gamification": {
    "xp_earned": 60,
    "total_xp": 1240,
    "level": 5,
    "previous_level": 4,
    "level_up": true,
    "new_achievements": [...],
    "all_tasks_completed": true
  }
}
```

### XP-Werte
| Aktion | XP |
|--------|-----|
| Task erledigt | +10 |
| Alle Tages-Tasks erledigt | +50 Bonus |
| Streak fortgesetzt | +20 (+ bis zu 145 Bonus für längere Streaks) |
| Ziel erreicht | +100 |
| Check-in erledigt | +5 |

### Level-Berechnung
```javascript
const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;
```

---

## Timezone-Support (NEU)

Alle relevanten Endpoints akzeptieren `timezone_offset` für korrekte Datumsberechnung:

```json
// Request Body oder Header
{
  "timezone_offset": -60  // Minuten, z.B. -60 für UTC+1
}

// Alternativ als Header
X-Timezone-Offset: -60
```

**Unterstützte Endpoints:** daily-start, goals-setup, task-update

---

## Idempotency-Keys (NEU)

Für kritische Operationen (goals-setup, accept-plan) kann ein Idempotency-Key gesendet werden:

```javascript
// Header
X-Idempotency-Key: user123-1705600000000-abc123xyz

// Verhindert doppelte Einträge bei Doppelklick
// Bei Duplikat wird cached Response zurückgegeben
```

---

## Postman-Collection
- Siehe `postman/aiday.postman_collection.json`
