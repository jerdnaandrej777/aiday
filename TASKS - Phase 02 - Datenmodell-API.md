## Phase 2 — Datenmodell & API (Supabase/Postgres)

Ziel
- Sauberes relationales Modell mit strikter Zugriffskontrolle (RLS) für MVP.
- Basis-CRUD via Supabase (PostgREST/JS-Client). Tests und Constraints sichern Datenqualität.

Entscheidung
- Backend: Supabase (Postgres, Auth, RLS, Edge Functions). Gründe: schnell, sicher, geringe Ops.

Datenbank-Migration (SQL)
- Erstdeployment über supabase db oder psql. Kommentare erläutern Entscheidungen.

---
SQL: Schema, Tabellen, Constraints, RLS

```sql
-- Extensions
create extension if not exists pgcrypto;         -- gen_random_uuid()
-- Optional: create extension if not exists vector;  -- für Embeddings später

-- Schemas
create schema if not exists core;
create schema if not exists coach;
create schema if not exists notifications;
create schema if not exists analytics;
create schema if not exists audit;

-- Nutzerprofil (1:1 zu auth.users)
create table if not exists core.user_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text default 'de-DE',
  priority_areas text[] default '{}',
  motivations text,
  time_budget_weekday text,
  energy_peak text,
  obstacles text[],
  coaching_style text,
  checkin_schedule text,
  constraints text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ein Tag (genau einer pro Datum und Nutzer)
create table if not exists core.day_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  created_at timestamptz default now(),
  closed_at timestamptz
);
create unique index if not exists ux_day_user_date on core.day_entries(user_id, date);

-- Ziele pro Tag (max. 10)
create table if not exists core.goals (
  id uuid primary key default gen_random_uuid(),
  day_entry_id uuid not null references core.day_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text,
  status text check (status in ('open','achieved','not_achieved','partial')) default 'open',
  note text,
  created_at timestamptz default now()
);
create index if not exists idx_goals_day on core.goals(day_entry_id);

-- Schritte pro Ziel (1–3 empfohlen)
create table if not exists core.action_steps (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references core.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  done boolean default false,
  step_order smallint default 1,
  reminder_at timestamptz
);
create index if not exists idx_steps_goal on core.action_steps(goal_id);

-- Optional: Abend-Review für zusätzlichen Kontext
create table if not exists core.reviews (
  id uuid primary key default gen_random_uuid(),
  day_entry_id uuid not null references core.day_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  helpful_one_thing text,
  obstacle text,
  measure_for_tomorrow text,
  mood smallint check (mood between 1 and 5),
  created_at timestamptz default now()
);
create unique index if not exists ux_review_day on core.reviews(day_entry_id);

-- AI Vorschläge und Begründungen (unverändert speicherbar)
create table if not exists coach.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references core.goals(id) on delete set null,
  kind text check (kind in ('plan','checkin','nudge')) not null,
  model text,
  tokens_in int,
  tokens_out int,
  payload_json jsonb not null,
  created_at timestamptz default now()
);
create index if not exists idx_ai_user_time on coach.ai_suggestions(user_id, created_at desc);

-- Push Tokens pro Gerät
create table if not exists notifications.push_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  token text not null,
  platform text check (platform in ('ios','android','web')),
  created_at timestamptz default now(),
  last_seen_at timestamptz,
  primary key (user_id, device_id)
);

-- Analytics Materialized Rollup (wird regelmäßig neu gebaut)
create table if not exists analytics.month_rollup (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null, -- YYYY-MM
  total_goals int not null default 0,
  achieved int not null default 0,
  not_achieved int not null default 0,
  success_rate numeric not null default 0,
  streak_days int not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, month)
);

-- Audit/Event Log (leichtgewichtig)
create table if not exists audit.event_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  entity text,
  entity_id uuid,
  action text,
  meta_json jsonb,
  created_at timestamptz default now()
);

-- Constraint: max 10 Ziele pro Tag
create or replace function core.enforce_max_goals() returns trigger language plpgsql as $$
begin
  if (select count(*) from core.goals g join core.day_entries d on d.id = g.day_entry_id where d.id = new.day_entry_id) >= 10 then
    raise exception 'Maximal 10 Ziele pro Tag erlaubt';
  end if;
  return new;
end; $$;

create trigger trg_goals_limit
before insert on core.goals
for each row execute function core.enforce_max_goals();

-- RLS aktivieren
alter table core.user_profile enable row level security;
alter table core.day_entries enable row level security;
alter table core.goals enable row level security;
alter table core.action_steps enable row level security;
alter table core.reviews enable row level security;
alter table coach.ai_suggestions enable row level security;
alter table notifications.push_tokens enable row level security;
alter table analytics.month_rollup enable row level security;
alter table audit.event_log enable row level security;

-- Policies (Nutzer sieht nur eigene Daten)
create policy p_select_own_profile on core.user_profile for select using (user_id = auth.uid());
create policy p_upsert_own_profile on core.user_profile for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy p_day_sel on core.day_entries for select using (user_id = auth.uid());
create policy p_day_ins on core.day_entries for insert with check (user_id = auth.uid());
create policy p_day_upd on core.day_entries for update using (user_id = auth.uid());
create policy p_day_del on core.day_entries for delete using (user_id = auth.uid());

create policy p_goals_all on core.goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_steps_all on core.action_steps for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_reviews_all on core.reviews for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy p_ai_sel on coach.ai_suggestions for select using (user_id = auth.uid());
create policy p_ai_ins_service on coach.ai_suggestions for insert to service_role with check (true);

create policy p_push_all on notifications.push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_analytics_sel on analytics.month_rollup for select using (user_id = auth.uid());

create policy p_audit_sel on audit.event_log for select using (user_id = auth.uid());
-- Inserts ins Audit-Log nur vom Service-Role-Key aus Edge Functions
create policy p_audit_ins_service on audit.event_log for insert to service_role with check (true);
```

API-Nutzung (Supabase Client)
- Direkter Zugriff: core.* Tabellen über Supabase JS (Row-Level Security schützt automatisch).
- AI/Analytics und Benachrichtigungen via Edge Functions (Service-Role Key).

Beispiele
```ts
// Day anlegen
const { data, error } = await supabase.from('core.day_entries').insert({ date: '2026-01-14', user_id: user.id }).select();

// Ziele lesen
const { data: goals } = await supabase.from('core.goals').select('*').eq('day_entry_id', dayId);
```

Tests/Validierung
- Unit: Trigger (max 10 Ziele), Status-Enums, RLS-Policies (Postgres Tests via pgTAP optional).
- E2E: CRUD-Flows mit Seed-User, Postman/Newman Collection.