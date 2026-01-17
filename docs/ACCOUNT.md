# Account (Mobile Flows)

Überblick
- Auth: Supabase Auth (GoTrue). Unterstützt E-Mail/Passwort, Magic Links, OAuth (Google/Apple/GitHub).
- Daten: core.user_profile wird bei Nutzer-Erstellung automatisch angelegt (Trigger).
- Zugriff: RLS aktiv, Nutzer sieht/bearbeitet nur eigene Daten.

Konfiguration
1) Supabase Auth im Dashboard aktivieren (SMTP/OAuth).
2) .env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (nur Server), APP_URL/DEEP_LINK_URL setzen.
3) Migrationen: supabase db push bzw. supabase db reset (lokal).

Mobile Flows
- Registrierung (E-Mail/Passwort)
  - signUp({ email, password, options: { emailRedirectTo: "aiday://auth-callback" } })
  - Alternativ Universal Link: https://aiday.app/auth/callback
- Magic Link / OAuth Callback
  - App erhält Deep Link, ruft exchangeCodeForSession() auf (PKCE/Code-Flow).
- Login (Password)
  - signInWithPassword({ email, password })
- Passwort-Reset
  - resetPasswordForEmail(email, { redirectTo: "aiday://reset" })
  - Nach Deep Link: updateUser({ password: newPassword })
- Session-Handling
  - Tokens sicher im Secure Storage (Keychain/Keystore) halten.
  - Auto-Refresh aktivieren oder manuell erneuern; bei 401 erneut anmelden.

Edge Function: auth-profile
- GET {SUPABASE_URL}/functions/v1/auth-profile mit Authorization: Bearer <access_token>.

Postman (Backend-Validierung)
- Signup/Login/Recover-Requests siehe Postman-Collection.

Sicherheit
- E-Mail-Bestätigung erzwingen, Domain/Redirect-Whitelist, JWT-Ablauf prüfen.
- Keine Service-Role Keys im Client.
