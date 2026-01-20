-- aimdo initial schema
create extension if not exists "pgcrypto";
create schema if not exists core;
create schema if not exists coach;
create schema if not exists notifications;
create schema if not exists analytics;
create schema if not exists audit;

do $$ begin create type core.goal_status as enum ('open','achieved','not_achieved'); exception when duplicate_object then null; end $$;

create table if not exists core.user_profile (user_id uuid primary key references auth.users(id) on delete cascade, priority_areas text[] default '{}'::text[], motivations text, time_budget_weekday int, energy_peak text, obstacles text[], coaching_style text, checkin_schedule jsonb, constraints_json jsonb, quiet_hours jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists core.day_entries (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, date date not null, created_at timestamptz not null default now(), closed_at timestamptz);
create unique index if not exists day_entries_user_date_uidx on core.day_entries(user_id, date);

create table if not exists core.goals (id uuid primary key default gen_random_uuid(), day_entry_id uuid not null references core.day_entries(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, title text not null, category text, status core.goal_status not null default 'open', note text, created_at timestamptz not null default now());
create index if not exists goals_user_idx on core.goals(user_id);
create index if not exists goals_day_idx on core.goals(day_entry_id);

create table if not exists core.action_steps (id uuid primary key default gen_random_uuid(), goal_id uuid not null references core.goals(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, text text not null, done boolean not null default false, "order" int not null default 1, due_at timestamptz, reminder jsonb, created_at timestamptz not null default now());
create index if not exists action_steps_goal_idx on core.action_steps(goal_id);
create index if not exists action_steps_user_idx on core.action_steps(user_id);
create index if not exists action_steps_due_idx on core.action_steps(due_at);

create table if not exists audit.event_log (id bigserial primary key, user_id uuid, entity text, entity_id text, action text, meta_json jsonb, created_at timestamptz not null default now());
create index if not exists event_log_user_idx on audit.event_log(user_id);

create table if not exists coach.ai_suggestions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete set null, goal_id uuid references core.goals(id) on delete set null, kind text not null check (kind in ('plan','checkin','nudge')), payload_json jsonb not null, model text, tokens_in int, tokens_out int, created_at timestamptz not null default now());
create index if not exists ai_suggestions_user_idx on coach.ai_suggestions(user_id);
create index if not exists ai_suggestions_goal_idx on coach.ai_suggestions(goal_id);

create table if not exists notifications.push_tokens (user_id uuid not null references auth.users(id) on delete cascade, device_id text not null, token text not null, platform text not null check (platform in ('ios','android','web')), created_at timestamptz not null default now(), last_seen_at timestamptz, primary key (user_id, device_id));

create materialized view if not exists analytics.month_rollup as select g.user_id, to_char(de.date, 'YYYY-MM') as month, count(*) filter (where g.status in ('achieved','not_achieved')) as total_goals, count(*) filter (where g.status = 'achieved') as achieved, count(*) filter (where g.status = 'not_achieved') as not_achieved, case when count(*) filter (where g.status in ('achieved','not_achieved')) = 0 then 0 else round(100.0 * count(*) filter (where g.status='achieved') / nullif(count(*) filter (where g.status in ('achieved','not_achieved')),0), 2) end as success_rate, 0::int as streak_days from core.goals g join core.day_entries de on de.id = g.day_entry_id group by g.user_id, to_char(de.date, 'YYYY-MM');

create or replace view analytics.v_month_stats as select * from analytics.month_rollup;

create or replace function core.enforce_max_10_goals_per_day() returns trigger language plpgsql as $$ declare cnt int; begin select count(*) into cnt from core.goals g join core.day_entries de on de.id = g.day_entry_id where de.user_id = new.user_id and de.date = (select date from core.day_entries where id = new.day_entry_id); if cnt >= 10 then raise exception 'Max 10 goals per day exceeded'; end if; return new; end; $$;

drop trigger if exists trg_goals_limit on core.goals;
create trigger trg_goals_limit before insert on core.goals for each row execute procedure core.enforce_max_10_goals_per_day();

create or replace function core.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_user_profile_updated_at on core.user_profile;
create trigger trg_user_profile_updated_at before update on core.user_profile for each row execute procedure core.set_updated_at();

-- Enable RLS
alter table core.user_profile enable row level security;
alter table core.day_entries enable row level security;
alter table core.goals enable row level security;
alter table core.action_steps enable row level security;
alter table coach.ai_suggestions enable row level security;
alter table notifications.push_tokens enable row level security;
alter table audit.event_log enable row level security;

-- Policies for user_profile
drop policy if exists user_profile_select on core.user_profile;
create policy user_profile_select on core.user_profile for select using (user_id = auth.uid());
drop policy if exists user_profile_insert on core.user_profile;
create policy user_profile_insert on core.user_profile for insert with check (user_id = auth.uid());
drop policy if exists user_profile_update on core.user_profile;
create policy user_profile_update on core.user_profile for update using (user_id = auth.uid());

-- Policies for day_entries
drop policy if exists de_select on core.day_entries;
create policy de_select on core.day_entries for select using (user_id = auth.uid());
drop policy if exists de_insert on core.day_entries;
create policy de_insert on core.day_entries for insert with check (user_id = auth.uid());
drop policy if exists de_update on core.day_entries;
create policy de_update on core.day_entries for update using (user_id = auth.uid());

-- Policies for goals
drop policy if exists goals_select on core.goals;
create policy goals_select on core.goals for select using (user_id = auth.uid());
drop policy if exists goals_insert on core.goals;
create policy goals_insert on core.goals for insert with check (user_id = auth.uid());
drop policy if exists goals_update on core.goals;
create policy goals_update on core.goals for update using (user_id = auth.uid());

-- Policies for action_steps
drop policy if exists steps_select on core.action_steps;
create policy steps_select on core.action_steps for select using (user_id = auth.uid());
drop policy if exists steps_insert on core.action_steps;
create policy steps_insert on core.action_steps for insert with check (user_id = auth.uid());
drop policy if exists steps_update on core.action_steps;
create policy steps_update on core.action_steps for update using (user_id = auth.uid());

-- Policies for ai_suggestions
drop policy if exists ai_select on coach.ai_suggestions;
create policy ai_select on coach.ai_suggestions for select using (user_id = auth.uid());
drop policy if exists ai_insert on coach.ai_suggestions;
create policy ai_insert on coach.ai_suggestions for insert with check (user_id = auth.uid());

-- Policies for push_tokens
drop policy if exists token_select on notifications.push_tokens;
create policy token_select on notifications.push_tokens for select using (user_id = auth.uid());
drop policy if exists token_upsert on notifications.push_tokens;
create policy token_upsert on notifications.push_tokens for insert with check (user_id = auth.uid());
drop policy if exists token_update on notifications.push_tokens;
create policy token_update on notifications.push_tokens for update using (user_id = auth.uid());
