# Sicherheit & Compliance (Mobile + Backend)

Zugriffskontrolle
- RLS aktiv für alle Kern-Tabellen (nur eigene Datensätze).
- Service-Role ausschließlich serverseitig (Edge Functions/CRON).

Auth & Token
- JWTs von Supabase Auth; verify_jwt in Edge Functions.
- Token-Speicherung:
  - iOS: Keychain (z. B. react-native-keychain/SecureStore).
  - Android: Keystore (EncryptedSharedPreferences).
- Kein Service-Role-Key in der App.

Transport
- Nur HTTPS.
- Optional: TLS/Certificate Pinning (erhöhte Sicherheit).
- iOS ATS/Android Network Security Config korrekt konfigurieren.

Geräte-Sicherheit
- Optional: Jailbreak/Root-Erkennung, Debugger-Detection.
- Screenshots/Screen Recording ggf. einschränken bei sensiblen Views.

PII & Aufbewahrung
- PII-Minimierung, Recht auf Vergessenwerden, begrenzte Retention in Audit/Analytics.
- Lokal auf dem Gerät nur notwendige Daten, verschlüsselt.

Push Tokens
- Speicherung in notifications.push_tokens pro Gerät.
- Logout: Token serverseitig invalidieren/entfernen.

Härtung
- Eingaben validieren (Zod/Schema), Rate Limits (Edge), Indexpolicies.
- Regelmäßige RLS- und Penetrationstests.
