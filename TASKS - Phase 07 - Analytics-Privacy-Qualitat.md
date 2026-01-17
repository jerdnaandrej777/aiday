## Phase 7 — Analytics, Privacy, Qualität

Analytics
- View und Materialized View zur Monatsstatistik.

SQL (View + Rollup)
```sql
-- Ad-hoc View
create or replace view analytics.v_month_stats as
select
  d.user_id,
  to_char(d.date, 'YYYY-MM') as month,
  count(g.id) as total_goals,
  count(*) filter (where g.status = 'achieved') as achieved,
  count(*) filter (where g.status = 'not_achieved') as not_achieved,
  case when count(g.id) = 0 then 0 else (count(*) filter (where g.status='achieved'))::numeric / nullif(count(g.id),0) end as success_rate
from core.day_entries d
left join core.goals g on g.day_entry_id = d.id
group by 1,2;

-- Rollup-Refresh (Beispielfunktion)
create or replace function analytics.refresh_month_rollup(p_user uuid, p_month text) returns void language plpgsql as $$
begin
  delete from analytics.month_rollup where user_id = p_user and month = p_month;
  insert into analytics.month_rollup(user_id, month, total_goals, achieved, not_achieved, success_rate, streak_days)
  select user_id, month, total_goals, achieved, not_achieved, success_rate, 0
  from analytics.v_month_stats where user_id = p_user and month = p_month;
end; $$;
```

Privacy
- Privacy-by-Design: minimale Felder; Opt-out sensibler Daten; Export/Löschen-Endpoint.
- Keine PII in Logs/AI-Prompts. Aufbewahrung: 12 Monate standard, konfigurierbar.

Qualität
- Sentry, strukturierte Logs, Golden Prompts/Outputs als Regressionstests.
- Policy-Tests (RLS) und Load-Tests für kritische Pfade.