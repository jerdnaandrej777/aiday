# Betrieb & Deployment (Backend + Mobile)

## Backend Deployment (Supabase Cloud)

### Erstmalige Einrichtung
```bash
# 1. Projekt verknüpfen
npx supabase link --project-ref <PROJECT_REF>

# 2. Datenbank-Schema deployen
npx supabase db push

# 3. Schema-Berechtigungen setzen (im SQL Editor)
# Siehe README.md oder claude.md für SQL-Befehle

# 4. Edge Functions deployen
npx supabase functions deploy --no-verify-jwt
```

### Laufender Betrieb
- `npx supabase db push` nach Schema-Änderungen
- `npx supabase functions deploy --no-verify-jwt` für Function-Updates

**Wichtig:** Immer `--no-verify-jwt` verwenden (JWT-Validierung erfolgt im Code).

CI/CD (Backend)
- .github/workflows/ci.yml: Lint/Typecheck; optional Deploy-Job (Secrets nötig).

Secrets (GitHub)
- SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD, FCM_SERVER_KEY, OPENAI_API_KEY.

Monitoring
- Backend: Sentry (Functions), Audit-Log, DB-Health via Supabase Dashboard.
- Mobile: Crashlytics/Sentry, In-App Logging, Optional Feature Flags.

Mobile Releaseprozess
- Signierung: iOS Certificates/Profiles; Android Keystore (sicher verwahren).
- Umgebungen: Staging/Prod (separate Supabase Projekte/Keys).
- Verteilung: TestFlight (iOS) / Internal Testing (Play Console).
- Versionierung: SemVer + Build-Nummern; Migrationsfenster berücksichtigen.
- Push: APNs/FCM Keys/Entitlements verwalten.
- OTA/Code Push (optional, je nach Tech-Stack).
- Datenschutz: App-Store Privacy Labels/Play Data Safety korrekt pflegen.
