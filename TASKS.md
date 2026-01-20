# AImDo — Projekt-Tasks

## Aktueller Stand: Phase 3 (UI) teilweise, Phase 4-6 abgeschlossen

---

## Abgeschlossen

### Phase 2 — Datenmodell & API
- [x] Datenbank-Schema (db/001_init.sql)
- [x] Auth-Trigger (db/002_auth.sql)
- [x] Row Level Security (RLS) für alle Tabellen
- [x] 5 Schemas: core, coach, notifications, analytics, audit
- [x] Materialized View für Analytics

### Phase 4 — Backend-Foundation
- [x] Shared Utilities (_shared/)
  - [x] cors.ts - CORS Handler
  - [x] response.ts - JSON Response Helper
  - [x] supabase.ts - Client Factory
  - [x] validation.ts - Zod Schemas
  - [x] openai.ts - OpenAI Integration
  - [x] import_map.json - Deno Dependencies
- [x] auth-profile (GET) - Profil abrufen
- [x] auth-onboarding (POST) - Profil einrichten
- [x] auth-delete-account (POST) - GDPR Löschung
- [x] auth-export-data (GET) - GDPR Export
- [x] analytics-monthly (GET) - Monatsstatistik
- [x] reminders-dispatch (POST) - Push Notifications (FCM)

### Phase 6 — AI-Integration
- [x] coach-plan (POST) - AI Tagesplanung
  - [x] OpenAI GPT-4o-mini Integration
  - [x] Structured JSON Output
  - [x] Fallback bei API-Fehler
  - [x] Token-Tracking
- [x] coach-checkin (POST) - AI Check-in Feedback
  - [x] Motivierendes Feedback
  - [x] Gegenmaßnahmen für Blocker
  - [x] Goal-Status Update

### Dokumentation & Testing
- [x] Postman Collection (postman/)
- [x] test-api.html - API Test Konsole
- [x] start-ui.html - Onboarding UI Demo
- [x] testseite.html - Test Interface Demo
- [x] claude.md - Projektkontext
- [x] README.md - Hauptdokumentation
- [x] docs/ - Detaillierte Dokumentation
- [x] docs/UI_DESIGN.md - Design-System Dokumentation

---

## In Arbeit

Keine offenen Tasks.

---

## Kürzlich Abgeschlossen

### Supabase Cloud Deployment
- [x] Supabase Cloud Projekt eingerichtet
- [x] Edge Functions mit `--no-verify-jwt` deployed
- [x] Schema-Berechtigungen konfiguriert (core, coach, notifications, analytics, audit)
- [x] Alle Edge Functions auf Schema-spezifische Queries umgestellt
- [x] auth-onboarding auf UPSERT umgestellt (statt UPDATE)
- [x] test-api.html mit Demo-Login erweitert
- [x] Dokumentation aktualisiert (claude.md, TASKS.md, README.md)

---

## Ausstehend

### Phase 3 — UX/UI
- [x] Design-System definiert (docs/UI_DESIGN.md)
  - [x] Farbpalette (Dark Theme)
  - [x] CSS-Variablen
  - [x] Komponenten (Cards, Buttons, Inputs)
  - [x] Animationen (Orbs, FadeIn, Transitions)
  - [x] Hintergrund-Effekte (Ambient Orbs, Grid Pattern)
- [x] Demo-UIs mit Design-System
  - [x] start-ui.html (Onboarding)
  - [x] test-api.html (API-Konsole)
  - [x] testseite.html (Test-Interface)
- [ ] Wireframes finalisieren
- [ ] Mobile App Mockups

### Phase 5 — App (Client) MVP
- [ ] Mobile App Framework wählen (Flutter/React Native)
- [ ] Projekt-Setup
- [ ] Heute-Screen
- [ ] Ziel-Detail Screen
- [ ] Monatsauswertung Screen
- [ ] Historie Screen
- [ ] Onboarding Flow
- [ ] Offline-Cache implementieren
- [ ] Push-Token Registration

### OAuth Integration
- [ ] Google Sign-In
- [ ] Apple Sign-In

### Phase 7 — Analytics, Privacy, Qualität
- [ ] Event-Tracking implementieren
- [ ] Consent-Management
- [ ] Crash-Reporting
- [ ] Performance-Monitoring

### Phase 8 — Beta & Feinschliff
- [ ] Closed Beta Setup
- [ ] Bug-Tracking
- [ ] App-Store Metadaten
- [ ] Screenshots & Videos

### Phase 9 — Release
- [ ] App Store Submission
- [ ] Play Store Submission
- [ ] Marketing-Website
- [ ] Feedback-Kanäle

---

## Backlog (Nice-to-Have)

- [ ] Unit Tests für Edge Functions
- [ ] E2E Tests
- [ ] CI/CD Pipeline erweitern
- [ ] Advanced Analytics Dashboard
- [ ] Performance Optimierung (DB Queries)
- [ ] Multi-Language Support
- [ ] Widgets (iOS/Android)
- [ ] Apple Watch Integration
- [ ] Gamification Features

---

## Phasen-Übersicht

| Phase | Status | Beschreibung |
|-------|--------|--------------|
| 0 - Discovery | Done | Produktziele, Stack-Entscheidung |
| 1 - Produktdefinition | Done | MVP-Spezifikation |
| 2 - Datenmodell & API | Done | DB-Schema, RLS |
| 3 - UX/UI | In Progress | Design-System done, Wireframes pending |
| 4 - Backend-Foundation | Done | Auth, Functions, Push |
| 5 - App Client MVP | Pending | Mobile App |
| 6 - AI-Integration | Done | OpenAI Coaching |
| 7 - Analytics & Privacy | Pending | Tracking, GDPR |
| 8 - Beta & Feinschliff | Pending | Testing, Polish |
| 9 - Release | Pending | Store Launch |

---

## Nächste Prioritäten

1. **Mobile App Client starten** (Phase 5)
   - Framework-Entscheidung (Flutter empfohlen)
   - Basis-Navigation aufsetzen
   - Auth-Flow implementieren

2. **OAuth Integration**
   - Google Sign-In für Android
   - Apple Sign-In für iOS (App Store Requirement)

3. **Offline-First Architektur**
   - Lokale Datenbank (Hive/SQLite)
   - Sync-Strategie definieren
