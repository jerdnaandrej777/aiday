## Phase 4 — Backend-Foundation (Auth, Jobs, Push, Observability)

Ziel
- Auth stabil, Cron-Jobs für Summary/Reminders, Push-Basis, Logging/Monitoring.

Auth
- Supabase Auth: E-Mail/Passwort + Magic Link. OAuth (optional) später.
- Service-Role Key nur in Edge Functions verwenden.

Edge Functions (TypeScript)
- Endpunkte und Cron-Jobs. Beispiel-Skelette:

coach/plan
```ts
// deno-lint-ignore-file
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { date, goals, profileSnapshot } = await req.json();
  // call AI provider (OpenAI/Anthropic) → striktes JSON
  // persist in coach.ai_suggestions
  return new Response(JSON.stringify({ suggestions: [] }), { headers: { "Content-Type": "application/json" } });
});
```

coach/checkin
```ts
import { serve } from "https://deno.land/std/http/server.ts";
serve(async (req) => {
  const { date, results, profileSnapshot } = await req.json();
  // generiere Gegenmaßnahmen, aktualisiere Ziele optional
  return new Response(JSON.stringify({ adjustments: [] }), { headers: { "Content-Type": "application/json" } });
});
```

reminders/dispatch (Cron, jede Minute)
```ts
import { serve } from "https://deno.land/std/http/server.ts";
serve(async (_req) => {
  // finde fällige reminders (action_steps.reminder_at <= now and not done)
  // sende via FCM (per fetch an FCM HTTP v1) und logge in audit.event_log
  return new Response("ok");
});
```

analytics/monthly
```ts
import { serve } from "https://deno.land/std/http/server.ts";
serve(async (req) => {
  const url = new URL(req.url);
  const month = url.searchParams.get('month');
  // lese aggregierte Daten aus analytics.month_rollup (oder berechne ad hoc)
  return new Response(JSON.stringify({ month, success_rate: 0.0 }));
});
```

Push (FCM)
- Speichere Tokens in notifications.push_tokens.
- Versand: FCM HTTP v1 mit Server Key in Secret. Quiet Hours aus user_profile berücksichtigen.

Observability
- Sentry in Edge Functions (DSN als Secret), strukturierte Logs, Audit-Events.

Deployment/CI
- supabase functions deploy [name]; Scheduled Functions für Cron.
- GitHub Actions: Lint/Typecheck, Tests, Deploy.

Sicherheit
- Rate-Limits je Function (IP/User). Input-Validierung (Zod). Secrets strikt trennen pro Env.