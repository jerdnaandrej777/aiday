# Tests & Qualität (Mobile + Backend)

## Backend lokal
- `supabase start`
- `supabase db reset` (führt Migrationen aus)
- `supabase functions serve <name>`

## API-Tests (Cloud)

### test-api.html (Empfohlen)
1. `test-api.html` im Browser öffnen
2. **"Demo Login (admin)"** klicken
3. Endpoints testen

**Test-Credentials:** `admin@aimdo.test` / `admin1`

### Postman
- Collection importieren; optional Newman im CI.

RLS-Tests
- Positiv: Nutzer sieht eigene Datensätze.
- Negativ: Nutzer sieht fremde Datensätze nicht.

Type/Lint
- Deno fmt/lint/typecheck (siehe GitHub Actions).

Mobile Tests
- Unit/UI: Framework abhängig (z. B. Jest + React Native Testing Library / Flutter test).
- E2E: Detox (React Native) oder Appium.
- Device Farms: Firebase Test Lab, BrowserStack, AWS Device Farm.
- Deep Links: aimdo://auth-callback und Universal Links testen.
- Offline/Sync: Netzwerk on/off, Konflikte, Retries.
- Push: FCM/APNs in Staging testen.
