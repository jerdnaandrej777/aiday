## Phase 6 — AI-Integration (Planner, Coach, Reviewer)

Ziel
- Zuverlässige, kurze, strukturierte AI-Antworten mit Kostenkontrolle.

Provider/Modelle
- OpenAI (o3-mini/gpt-4o-mini) oder Anthropic (Haiku/Sonnet). Start: günstiges, schnelles Modell; fallback auf präziseres.

JSON-Schema (Output)
```json
{
  "next_step": "string (<=120 Zeichen)",
  "steps": ["2..5 kurze Teilsteps"],
  "if_then": "Wenn [Trigger], dann [Aktion]",
  "timebox": "Dauer oder Zeitfenster",
  "plan_b": "2-Minuten-Variante",
  "nudge_texts": ["1..3 Push-Texte"],
  "priority": ["Top 1..3 Ziele"],
  "rationale": "kurze Begründung (<=180 Wörter)"
}
```

Prompt-Template (Planner)
```
Rolle: Strukturierter Mini-Schritt-Planer. Antworte ausschließlich als valides JSON laut Schema.
Kontext: {profileSnapshot}, Datum: {date}
Ziele (max 10, fokussiere Top 1–3): {goals}
Regeln: kurze Sprache, konkret messbar, Reibung minimieren, keine Schuldzuweisungen.
```

Check-in Prompt
```
Rolle: Reviewer. Nenne Ursache (kurz), Gegenmaßnahme, neuen Mini-Schritt. JSON-Output laut Schema.
Input: {results}, {profileSnapshot}
```

Robustheit
- Strict JSON via response_format oder Tooling; doppelt validieren (Zod). Retries bei Schemafehlern (max 1).
- PII minimieren, keine sensiblen Freitexte an Provider senden.

Persistenz
- Roh-Output unverändert in coach.ai_suggestions.payload_json speichern; Tokens/Model mitloggen.

Kosten
- Nur bei Bedarf generieren (Morgen/Abend), Caching von Vorschlägen pro Tag, Kürzeste Prompts.