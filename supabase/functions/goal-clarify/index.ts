// Edge Function: goal-clarify
// POST - Analysiert ein Ziel und stellt IMMER intelligente Rückfragen für einen personalisierten Plan

import { handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { getOpenAIClient } from '../_shared/openai.ts'
import { z } from 'https://esm.sh/zod@3'

const RequestSchema = z.object({
  goal_title: z.string().min(1),
  why_important: z.string().optional(),
  previous_efforts: z.string().optional(),
  believed_steps: z.string().optional(),
})

const CLARIFY_SYSTEM_PROMPT = `Du bist ein erfahrener Coach der JEDEN Menschen dabei unterstützt, seine Ziele zu erreichen.

Deine Aufgabe: Stelle 3-4 INTELLIGENTE Fragen zu dem Ziel, um einen PERFEKT PERSONALISIERTEN Aktionsplan erstellen zu können.

WICHTIG - ZUERST DIE GRUNDSITUATION KLÄREN:
Viele Ziele können VERSCHIEDENE KONTEXTE haben. Kläre IMMER zuerst die Grundsituation!

BEISPIELE für mehrdeutige Ziele:

"50% mehr verdienen" / "Mehr Geld verdienen" / "Gehalt erhöhen":
→ ERSTE FRAGE MUSS SEIN: Bist du angestellt oder selbstständig/Unternehmer?
→ Bei Angestellten: Branche, Position, Gehalt aktuell, Qualifikationen
→ Bei Selbstständigen: Geschäftsmodell, Produkt, Umsatz, Vertrieb

"Abnehmen" / "Fitter werden":
→ ERSTE FRAGE: Wie ist dein aktueller Stand? (Gewicht, Fitness-Level)
→ Dann: Zeit, Einschränkungen, was hat funktioniert/nicht

"Neuen Job finden" / "Karriere machen":
→ ERSTE FRAGE: In welcher Branche/Bereich arbeitest du?
→ Dann: Aktuelle Position, gewünschte Position, Qualifikationen

"Sprache lernen" / "Programmieren lernen":
→ ERSTE FRAGE: Warum willst du das lernen? (Beruf, Reisen, Hobby)
→ Dann: Aktueller Stand, verfügbare Zeit, Lernstil

KATEGORIEN UND IHRE ERSTEN FRAGEN:

💰 FINANZIELLE ZIELE:
1. ZUERST: "Bist du angestellt oder selbstständig/Unternehmer?"
2. DANN je nach Antwort:
   - Angestellt: Branche, Position, aktuelles Gehalt, Karriereziel
   - Selbstständig: Geschäftsmodell, Produkt/Service, Umsatz, Vertriebsweg

🏃 FITNESS/GESUNDHEIT:
1. ZUERST: "Wie ist dein aktueller Stand?" (Gewicht, Fitness, Gesundheit)
2. DANN: Verfügbare Zeit, Einschränkungen, was hat früher geklappt

📚 LERNEN/SKILLS:
1. ZUERST: "Wofür brauchst du diesen Skill?" (Beruf, Hobby, persönlich)
2. DANN: Aktueller Kenntnisstand, Lernzeit, Lernstil

💼 KARRIERE:
1. ZUERST: "In welcher Branche/Bereich bist du tätig?"
2. DANN: Aktuelle Position, Zielposition, fehlende Qualifikationen

🏠 PERSÖNLICHE ZIELE (Beziehungen, Gewohnheiten, Lifestyle):
1. ZUERST: "Was genau bedeutet Erfolg für dich bei diesem Ziel?"
2. DANN: Aktuelle Situation, Hindernisse, verfügbare Zeit

REGELN:
1. ERSTE FRAGE klärt IMMER den KONTEXT (angestellt/selbstständig, Branche, Bereich)
2. KURZ - max. 12 Wörter pro Frage
3. SPEZIFISCH - keine generischen Fragen wie "Was ist dein Ziel?"
4. HANDLUNGSORIENTIERT - Antworten müssen zu konkreten Aufgaben führen
5. PLACEHOLDER zeigen Beispiele für BEIDE möglichen Kontexte

Antworte IMMER im JSON-Format:
{
  "needs_clarification": true,
  "reason": "Kurze Erklärung was du herausfinden willst (1 Satz)",
  "goal_type": "financial|fitness|learning|career|personal|other",
  "questions": [
    {
      "id": "eindeutige_id",
      "question": "Deine Frage?",
      "placeholder": "Beispielantwort...",
      "type": "text"
    }
  ]
}`

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const authResult = await getAuthUser(req)
    if (authResult.error || !authResult.user) {
      return errorResponse(authResult.error || 'Unauthorized', 401)
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 400)
    }

    const validation = RequestSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse(`Validation error: ${validation.error.message}`, 400)
    }

    const { goal_title, why_important, previous_efforts, believed_steps } = validation.data

    try {
      const openai = getOpenAIClient()

      const userPrompt = `Analysiere dieses Ziel und stelle 3-4 intelligente Fragen:

ZIEL: "${goal_title}"
${why_important ? `MOTIVATION: ${why_important}` : ''}
${previous_efforts ? `BISHERIGE VERSUCHE: ${previous_efforts}` : ''}
${believed_steps ? `EIGENE IDEEN: ${believed_steps}` : ''}

Stelle Fragen die mir helfen:
1. Die SITUATION des Users vollständig zu verstehen
2. REALISTISCHE tägliche Aufgaben zu erstellen
3. HINDERNISSE vorab zu identifizieren
4. Den BESTEN Ansatz für DIESE Person zu finden

Passe die Fragen an das spezifische Ziel an!`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: CLARIFY_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 1000
      })

      const content = completion.choices[0]?.message?.content
      if (content) {
        const parsed = JSON.parse(content)

        // Log für Analytics
        const token = extractToken(req)
        if (token) {
          const supabase = createSupabaseClient(token)
          await supabase
            .schema('coach')
            .from('ai_suggestions')
            .insert({
              user_id: authResult.user.id,
              kind: 'goal_clarify',
              payload_json: {
                goal_title,
                goal_type: parsed.goal_type,
                questions_count: parsed.questions?.length || 0
              },
              model: 'gpt-4o-mini',
              tokens_in: completion.usage?.prompt_tokens || 0,
              tokens_out: completion.usage?.completion_tokens || 0
            })
        }

        return successResponse({
          needs_clarification: true, // IMMER true - wir wollen immer Fragen stellen
          reason: parsed.reason || 'Um dir den besten Plan zu erstellen, brauche ich noch ein paar Details.',
          goal_type: parsed.goal_type || 'other',
          questions: parsed.questions || []
        })
      }

      // Fallback wenn AI keine Antwort gibt
      return successResponse(getSmartFallback(goal_title))

    } catch (aiError: any) {
      // Detailliertes Error-Logging
      console.error('OpenAI Clarify Error:', {
        code: aiError?.code,
        message: aiError?.message,
        status: aiError?.status,
        type: aiError?.type
      })

      // User-freundliche Fehlermeldungen für bekannte Fehler
      if (aiError?.status === 429) {
        return errorResponse('Zu viele Anfragen an die KI. Bitte warte 1 Minute und versuche es erneut.', 429)
      }
      if (aiError?.status === 503 || aiError?.status === 502) {
        return errorResponse('Der KI-Service ist momentan überlastet. Bitte versuche es in ein paar Minuten erneut.', 503)
      }

      // Fallback für alle anderen Fehler
      console.log('Using smart fallback for goal clarification')
      return successResponse(getSmartFallback(goal_title))
    }

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})

// Intelligenter Fallback basierend auf Zieltyp
function getSmartFallback(goalTitle: string) {
  const titleLower = goalTitle.toLowerCase()

  // Finanzielle Ziele - ZUERST Kontext klären (angestellt vs selbstständig)
  if (titleLower.includes('umsatz') || titleLower.includes('€') || titleLower.includes('euro') ||
      titleLower.includes('geld') || titleLower.includes('verdien') || titleLower.includes('einnahm') ||
      titleLower.includes('gewinn') || titleLower.includes('revenue') || titleLower.includes('einkommen') ||
      titleLower.includes('gehalt') || titleLower.includes('mehr geld') || titleLower.includes('%') ||
      titleLower.includes('prozent')) {
    return {
      needs_clarification: true,
      reason: 'Für einen maßgeschneiderten Finanzplan muss ich zuerst deine Situation verstehen.',
      goal_type: 'financial',
      questions: [
        {
          id: 'employment_status',
          question: 'Bist du angestellt oder selbstständig/Unternehmer?',
          placeholder: 'z.B. Angestellt bei Firma X, Freelancer, eigenes Unternehmen...',
          type: 'text'
        },
        {
          id: 'industry_role',
          question: 'In welcher Branche und Position bist du tätig?',
          placeholder: 'z.B. IT als Developer, Vertrieb als Account Manager, E-Commerce mit Online-Shop...',
          type: 'text'
        },
        {
          id: 'current_income',
          question: 'Wie hoch ist dein aktuelles Einkommen/Umsatz?',
          placeholder: 'z.B. 3.500€ Gehalt, 5.000€ mtl. Umsatz, noch kein Einkommen...',
          type: 'text'
        },
        {
          id: 'biggest_lever',
          question: 'Was glaubst du hat das größte Potenzial für mehr Einkommen?',
          placeholder: 'z.B. Gehaltsverhandlung, mehr Kunden, neuer Job, Nebengeschäft...',
          type: 'text'
        }
      ]
    }
  }

  // Fitness/Gewicht
  if (titleLower.includes('abnehm') || titleLower.includes('kg') || titleLower.includes('gewicht') ||
      titleLower.includes('fitness') || titleLower.includes('sport') || titleLower.includes('muskel') ||
      titleLower.includes('laufen') || titleLower.includes('marathon') || titleLower.includes('gesund')) {
    return {
      needs_clarification: true,
      reason: 'Für einen effektiven Fitness-Plan brauche ich ein paar Infos.',
      goal_type: 'fitness',
      questions: [
        {
          id: 'current_state',
          question: 'Wie ist dein aktueller Stand?',
          placeholder: 'z.B. 85kg, unsportlich / 70kg, jogge 1x Woche...',
          type: 'text'
        },
        {
          id: 'available_time',
          question: 'Wie viel Zeit hast du täglich für Bewegung?',
          placeholder: 'z.B. 15 Min, 30 Min, 1 Stunde, nur Wochenende...',
          type: 'text'
        },
        {
          id: 'restrictions',
          question: 'Gibt es Einschränkungen oder Vorlieben?',
          placeholder: 'z.B. Knieprobleme, kein Fitnessstudio, vegetarisch...',
          type: 'text'
        },
        {
          id: 'past_attempts',
          question: 'Was hat früher funktioniert oder nicht funktioniert?',
          placeholder: 'z.B. Diäten gescheitert, Joggen war gut, abends Heißhunger...',
          type: 'text'
        }
      ]
    }
  }

  // Lernen
  if (titleLower.includes('lern') || titleLower.includes('sprache') || titleLower.includes('programmier') ||
      titleLower.includes('kurs') || titleLower.includes('zertifik') || titleLower.includes('skill') ||
      titleLower.includes('englisch') || titleLower.includes('spanisch') || titleLower.includes('python') ||
      titleLower.includes('instrument') || titleLower.includes('gitarre') || titleLower.includes('klavier')) {
    return {
      needs_clarification: true,
      reason: 'Für einen effektiven Lernplan brauche ich mehr Details.',
      goal_type: 'learning',
      questions: [
        {
          id: 'current_level',
          question: 'Wie ist dein aktueller Kenntnisstand?',
          placeholder: 'z.B. Anfänger, Grundkenntnisse, Fortgeschritten...',
          type: 'text'
        },
        {
          id: 'learning_time',
          question: 'Wie viel Zeit kannst du täglich/wöchentlich investieren?',
          placeholder: 'z.B. 30 Min täglich, 2 Stunden am Wochenende...',
          type: 'text'
        },
        {
          id: 'purpose',
          question: 'Wofür brauchst du diesen Skill konkret?',
          placeholder: 'z.B. Für den Job, Urlaub, Hobby, Karrierewechsel...',
          type: 'text'
        },
        {
          id: 'learning_style',
          question: 'Wie lernst du am liebsten?',
          placeholder: 'z.B. Videos, Bücher, Learning by Doing, mit Tutor...',
          type: 'text'
        }
      ]
    }
  }

  // Karriere - ZUERST klären: Angestellt, selbstständig oder auf Jobsuche
  if (titleLower.includes('job') || titleLower.includes('karriere') || titleLower.includes('beförder') ||
      titleLower.includes('selbstständ') || titleLower.includes('gründ') ||
      titleLower.includes('position') || titleLower.includes('führung') || titleLower.includes('manager') ||
      titleLower.includes('beruf') || titleLower.includes('arbeit')) {
    return {
      needs_clarification: true,
      reason: 'Für einen Karriereplan muss ich zuerst deine aktuelle Situation verstehen.',
      goal_type: 'career',
      questions: [
        {
          id: 'work_status',
          question: 'Bist du aktuell angestellt, selbstständig oder auf Jobsuche?',
          placeholder: 'z.B. Angestellt Vollzeit, Freelancer, aktuell arbeitslos, Student...',
          type: 'text'
        },
        {
          id: 'industry_position',
          question: 'In welcher Branche und welcher Position bist du?',
          placeholder: 'z.B. IT als Junior Developer, Marketing Manager, Handwerk Meister...',
          type: 'text'
        },
        {
          id: 'target_clear',
          question: 'Was genau willst du erreichen?',
          placeholder: 'z.B. Beförderung, Jobwechsel, Selbstständigkeit, eigenes Team...',
          type: 'text'
        },
        {
          id: 'blockers',
          question: 'Was hält dich aktuell davon ab?',
          placeholder: 'z.B. Fehlende Qualifikation, kein Netzwerk, unsicher wie anfangen...',
          type: 'text'
        }
      ]
    }
  }

  // Produktivität/Gewohnheiten
  if (titleLower.includes('produktiv') || titleLower.includes('gewohnheit') || titleLower.includes('routine') ||
      titleLower.includes('aufräum') || titleLower.includes('organis') || titleLower.includes('prokrastin') ||
      titleLower.includes('früh aufsteh') || titleLower.includes('meditation') || titleLower.includes('lesen')) {
    return {
      needs_clarification: true,
      reason: 'Für neue Gewohnheiten brauche ich etwas Kontext.',
      goal_type: 'personal',
      questions: [
        {
          id: 'current_routine',
          question: 'Wie sieht dein typischer Tagesablauf aus?',
          placeholder: 'z.B. 7 Uhr aufstehen, 9-17 Uhr Arbeit, abends Netflix...',
          type: 'text'
        },
        {
          id: 'trigger',
          question: 'Was löst das Verhalten aus, das du ändern willst?',
          placeholder: 'z.B. Stress, Langeweile, nach dem Aufwachen, abends...',
          type: 'text'
        },
        {
          id: 'past_attempts',
          question: 'Was hast du schon probiert?',
          placeholder: 'z.B. Apps, Kalender, Accountability Partner...',
          type: 'text'
        },
        {
          id: 'ideal_outcome',
          question: 'Wie sieht dein idealer Tag aus?',
          placeholder: 'z.B. Früh aufstehen, Sport, fokussiert arbeiten, Freizeit...',
          type: 'text'
        }
      ]
    }
  }

  // Beziehungen/Soziales
  if (titleLower.includes('beziehung') || titleLower.includes('freund') || titleLower.includes('partner') ||
      titleLower.includes('netzwerk') || titleLower.includes('social') || titleLower.includes('kontakt')) {
    return {
      needs_clarification: true,
      reason: 'Für soziale Ziele brauche ich mehr Details.',
      goal_type: 'personal',
      questions: [
        {
          id: 'current_situation',
          question: 'Wie ist deine aktuelle Situation?',
          placeholder: 'z.B. Wenig Kontakte, schüchtern, keine Zeit für Treffen...',
          type: 'text'
        },
        {
          id: 'ideal_outcome',
          question: 'Was genau möchtest du erreichen?',
          placeholder: 'z.B. Mehr Freunde, Partner finden, berufliches Netzwerk...',
          type: 'text'
        },
        {
          id: 'challenges',
          question: 'Was macht es dir schwer?',
          placeholder: 'z.B. Schüchternheit, keine Gelegenheiten, Zeitmangel...',
          type: 'text'
        },
        {
          id: 'preferences',
          question: 'Welche Aktivitäten machst du gerne?',
          placeholder: 'z.B. Sport, Gaming, Lesen, Ausgehen, Kochen...',
          type: 'text'
        }
      ]
    }
  }

  // Allgemeiner Fallback für alle anderen Ziele - ZUERST Kontext klären
  return {
    needs_clarification: true,
    reason: 'Um dir den besten Plan zu erstellen, muss ich zuerst deine Situation verstehen.',
    goal_type: 'other',
    questions: [
      {
        id: 'context',
        question: 'In welchem Lebensbereich liegt dieses Ziel?',
        placeholder: 'z.B. Beruf, Privat, Gesundheit, Finanzen, Beziehungen...',
        type: 'text'
      },
      {
        id: 'current_situation',
        question: 'Wie sieht deine aktuelle Situation bei diesem Thema aus?',
        placeholder: 'z.B. Beschreibe wo du jetzt stehst...',
        type: 'text'
      },
      {
        id: 'success_definition',
        question: 'Woran erkennst du konkret, dass du das Ziel erreicht hast?',
        placeholder: 'z.B. Messbare Zahl, konkretes Ergebnis, Veränderung...',
        type: 'text'
      },
      {
        id: 'time_and_resources',
        question: 'Wie viel Zeit/Ressourcen kannst du investieren?',
        placeholder: 'z.B. 30 Min täglich, Budget 500€, nur Wochenende...',
        type: 'text'
      }
    ]
  }
}
