-- 002_auth.sql — Account-Funktion (Supabase Auth Integration)
begin;

create schema if not exists core;

-- Profile bootstrap on new auth.users
create or replace function core.handle_new_user() returns trigger language plpgsql security definer as $$
begin
insert into core.user_profile (user_id) values (new.id) on conflict (user_id) do nothing;
return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function core.handle_new_user();

-- RLS for user_profile
alter table if exists core.user_profile enable row level security;

do $$ begin
if not exists (select 1 from pg_policies where schemaname = 'core' and tablename = 'user_profile' and policyname = 'user_profile_self_select') then
create policy user_profile_self_select on core.user_profile for select using (user_id = auth.uid());
end if;
if not exists (select 1 from pg_policies where schemaname = 'core' and tablename = 'user_profile' and policyname = 'user_profile_self_update') then
create policy user_profile_self_update on core.user_profile for update using (user_id = auth.uid());
end if;
end $$;

revoke insert, delete on core.user_profile from anon, authenticated;

create or replace view core.current_user_profile as
select * from core.user_profile where user_id = auth.uid();

commit;