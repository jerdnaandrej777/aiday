File: ..\..\..\..\..\Desktop\Apps\aiday\db\002_auth.sql

     1	-- 002_auth.sql — Account-Funktion (Supabase Auth Integration)
     2	begin;
     3	
     4	create schema if not exists core;
     5	
     6	-- Profile bootstrap on new auth.users
     7	create or replace function core.handle_new_user() returns trigger language plpgsql security definer as $$
     8	begin
     9	  insert into core.user_profile (user_id) values (new.id) on conflict (user_id) do nothing;
    12	  return new;
    13	end; $$;
    14	
    15	drop trigger if exists on_auth_user_created on auth.users;
    16	create trigger on_auth_user_created
    17	  after insert on auth.users
    18	  for each row execute function core.handle_new_user();
    19	
    20	-- RLS for user_profile
    21	alter table if exists core.user_profile enable row level security;
    22	
    23	do $$ begin
    24	  if not exists (select 1 from pg_policies where schemaname = 'core' and tablename = 'user_profile' and policyname = 'user_profile_self_select') then
    25	    create policy user_profile_self_select on core.user_profile for select using (user_id = auth.uid());
    26	  end if;
    27	  if not exists (select 1 from pg_policies where schemaname = 'core' and tablename = 'user_profile' and policyname = 'user_profile_self_update') then
    28	    create policy user_profile_self_update on core.user_profile for update using (user_id = auth.uid());
    29	  end if;
    30	end $$;
    31	
    32	revoke insert, delete on core.user_profile from anon, authenticated;
    33	
    34	create or replace view core.current_user_profile as
    35	select * from core.user_profile where user_id = auth.uid();
    36	
    37	commit;