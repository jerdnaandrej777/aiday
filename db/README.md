File: ..\..\..\..\..\Desktop\Apps\aiday\db\README.md

     1	# DB Migrations
     2	
     3	- Place SQL migrations here.
     4	- Apply locally via Supabase CLI:
     5	
     6	Commands:
     7	  supabase start
     8	  supabase db reset   (applies db/001_init.sql)
     9	  supabase db diff -f db/002_next_change.sql
    10	

## Migrations-Cheat-Sheet
- supabase db diff --linked --file db/003_next.sql
- supabase db push (nach Review)
- supabase db reset (lokal, Vorsicht: löscht Daten)

## Reihenfolge
- 001_init.sql (Basisschema)
- 002_auth.sql (Auth-Integration)
- 003_*.sql (weitere Änderungen)

## Troubleshooting
- Prüfe RLS mit dem SQL-Editor (auth.uid()).
- Prüfe Trigger/Policies via information_schema + pg_catalog.
