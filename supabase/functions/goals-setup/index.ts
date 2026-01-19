// Edge Function: goals-setup
// POST - Erstellt/aktualisiert die 5 Hauptziele und generiert AI-Plan

import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { GoalsSetupRequestSchema } from '../_shared/validation.ts'
import { getOpenAIClient, GOALS_ANALYSIS_SYSTEM_PROMPT } from '../_shared/openai.ts'

interface Milestone {
  week: number
  target: string
  metric?: string
}

interface DailyTask {
  task: string
  duration_minutes: number
  frequency: string // "daily", "weekdays", "3x_week"
  best_time: string // "morgens", "mittags", "abends", "flexibel"
  steps: string[] // Schritt-für-Schritt Anleitung
  why: string // Warum diese Aufgabe wichtig ist
}

interface GoalPlan {
  goal_id: string
  analysis: string
  duration_weeks: number
  target_date: string
  milestones: Milestone[]
  daily_tasks: DailyTask[]
  weekly_tasks: string[]
  motivation: string
  success_metric: string
}

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

    const validation = GoalsSetupRequestSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse(`Validation error: ${validation.error.message}`, 400)
    }

    const { goals } = validation.data

    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id
    const today = new Date().toISOString().split('T')[0]

    // 1. Erstelle/Aktualisiere day_entry für heute
    const { data: dayEntry, error: dayError } = await supabase
      .schema('core')
      .from('day_entries')
      .upsert({
        user_id: userId,
        date: today
      }, { onConflict: 'user_id,date' })
      .select()
      .single()

    if (dayError) {
      console.error('Day entry error:', dayError)
      return errorResponse(`Database error: ${dayError.message}`, 500)
    }

    // 2. Erstelle neue Langzeit-Ziele (KEINE Löschung alter Ziele!)
    const goalsToInsert = goals.map((g, idx) => ({
      user_id: userId,
      day_entry_id: dayEntry.id,
      title: g.title,
      category: g.category || 'general',
      why_important: g.why_important,
      previous_efforts: g.previous_efforts,
      believed_steps: g.believed_steps,
      is_longterm: true,
      status: 'open'
    }))

    const { data: savedGoals, error: goalsError } = await supabase
      .schema('core')
      .from('goals')
      .insert(goalsToInsert)
      .select()

    if (goalsError) {
      console.error('Goals error:', goalsError)
      return errorResponse(`Database error: ${goalsError.message}`, 500)
    }

    // 4. Hole Benutzerprofil für personalisierte Planung
    const { data: userProfile } = await supabase
      .schema('core')
      .from('user_profile')
      .select('age, job, education, family_status, hobbies, strengths, challenges, motivation')
      .eq('user_id', userId)
      .maybeSingle()

    // 5. Generiere AI-Plan für jedes Ziel
    let aiPlans: GoalPlan[] = []
    let tokensUsed = { input: 0, output: 0 }
    let modelUsed = 'stub'

    try {
      const openai = getOpenAIClient()

      // Profilkontext erstellen, wenn vorhanden
      let profileContext = ''
      if (userProfile && (userProfile.age || userProfile.job || userProfile.education || userProfile.hobbies)) {
        profileContext = `
=== PERSÖNLICHER KONTEXT DES NUTZERS ===
${userProfile.age ? `Alter: ${userProfile.age} Jahre` : ''}
${userProfile.job ? `Beruf: ${userProfile.job}` : ''}
${userProfile.education ? `Bildung: ${userProfile.education}` : ''}
${userProfile.family_status ? `Familienstand: ${userProfile.family_status}` : ''}
${userProfile.hobbies ? `Hobbys & Interessen: ${userProfile.hobbies}` : ''}
${userProfile.strengths ? `Persönliche Stärken: ${userProfile.strengths}` : ''}
${userProfile.challenges ? `Herausforderungen: ${userProfile.challenges}` : ''}
${userProfile.motivation ? `Antrieb/Motivation: ${userProfile.motivation}` : ''}
===================================
`
      }

      const goalsContext = savedGoals.map((g, idx) => `
=== ZIEL ${idx + 1} ===
Titel: ${g.title}
Warum wichtig: ${g.why_important || 'Nicht angegeben'}
Bisherige Versuche: ${g.previous_efforts || 'Keine Angabe'}
Eigene Ideen des Nutzers: ${g.believed_steps || 'Keine Angabe'}
`).join('\n')

      const userPrompt = `Analysiere ${savedGoals.length === 1 ? 'dieses Ziel' : `diese ${savedGoals.length} Ziele`} und erstelle für jedes einen DETAILLIERTEN Aktionsplan mit ZEITRAHMEN:
${profileContext}
${goalsContext}

Heutiges Datum: ${today}

WICHTIG - ERSTELLE SEHR DETAILLIERTE TÄGLICHE AUFGABEN:
- Berechne einen REALISTISCHEN Zeitrahmen basierend auf den Details
- Erstelle MESSBARE Meilensteine (alle 2-4 Wochen)
- Für JEDE tägliche Aufgabe:
  * KONKRETE Beschreibung (keine vagen Phrasen wie "arbeite an X")
  * BESTE TAGESZEIT wann sie ausgeführt werden soll (morgens/mittags/abends)
  * SCHRITT-FÜR-SCHRITT Anleitung (3-5 konkrete Schritte)
  * WARUM diese Aufgabe wichtig für das Ziel ist
- Berücksichtige die Angaben des Nutzers für realistische Planung

Antworte im JSON-Format:
{
  "plans": [
    {
      "goal_index": 0,
      "analysis": "2-3 Sätze: Analyse der Situation und des Ziels",
      "duration_weeks": 12,
      "success_metric": "Messbare Erfolgskriterium (z.B. 'Gewicht: 95kg', 'Umsatz: 100.000€')",
      "milestones": [
        {"week": 4, "target": "Erstes Zwischenziel", "metric": "-3kg"},
        {"week": 8, "target": "Zweites Zwischenziel", "metric": "-6kg"},
        {"week": 12, "target": "Endziel erreicht", "metric": "-10kg"}
      ],
      "daily_tasks": [
        {
          "task": "Konkrete tägliche Aufgabe mit klarem Ergebnis",
          "duration_minutes": 15,
          "frequency": "daily",
          "best_time": "morgens",
          "steps": [
            "Schritt 1: Bereite X vor",
            "Schritt 2: Führe Y aus",
            "Schritt 3: Dokumentiere Z"
          ],
          "why": "Diese Aufgabe ist wichtig weil..."
        }
      ],
      "weekly_tasks": [
        "Wöchentliche Aufgabe 1 (z.B. 'Wiege dich jeden Sonntag')",
        "Wöchentliche Aufgabe 2 (z.B. 'Plane Mahlzeiten für nächste Woche')"
      ],
      "motivation": "Persönliche, motivierende Nachricht"
    }
  ]
}`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: GOALS_ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 3000
      })

      const content = completion.choices[0]?.message?.content
      if (content) {
        const parsed = JSON.parse(content)
        aiPlans = (parsed.plans || []).map((p: any, idx: number) => {
          const durationWeeks = p.duration_weeks || 12
          const targetDate = new Date()
          targetDate.setDate(targetDate.getDate() + (durationWeeks * 7))

          return {
            goal_id: savedGoals[p.goal_index ?? idx]?.id,
            analysis: p.analysis || '',
            duration_weeks: durationWeeks,
            target_date: targetDate.toISOString().split('T')[0],
            milestones: p.milestones || [],
            daily_tasks: p.daily_tasks || [],
            weekly_tasks: p.weekly_tasks || [],
            motivation: p.motivation || '',
            success_metric: p.success_metric || ''
          }
        })

        tokensUsed = {
          input: completion.usage?.prompt_tokens || 0,
          output: completion.usage?.completion_tokens || 0
        }
        modelUsed = completion.model || 'gpt-4o-mini'
      }
    } catch (aiError) {
      console.error('AI generation failed:', aiError)
      // Fallback mit neuem Format
      aiPlans = savedGoals.map(g => {
        const title = g.title?.toLowerCase() || ''
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + 84) // 12 Wochen default

        if (title.includes('umsatz') || title.includes('geld') || title.includes('€') || title.includes('euro') || title.includes('verdien')) {
          return {
            goal_id: g.id,
            analysis: 'Ein finanzielles Ziel erfordert klare Zahlen und konsequente Akquise-Arbeit.',
            duration_weeks: 24,
            target_date: new Date(Date.now() + 24*7*24*60*60*1000).toISOString().split('T')[0],
            milestones: [
              { week: 4, target: 'Erste Kunden gewonnen', metric: '20% des Ziels' },
              { week: 12, target: 'Halbzeit', metric: '50% des Ziels' },
              { week: 24, target: 'Ziel erreicht', metric: '100%' }
            ],
            daily_tasks: [
              {
                task: 'Kontaktiere 3 potenzielle Kunden',
                duration_minutes: 30,
                frequency: 'daily',
                best_time: 'morgens',
                steps: [
                  'Öffne deine Kundenliste oder LinkedIn',
                  'Wähle 3 Kontakte aus, die zu deinem Angebot passen',
                  'Schreibe eine persönliche Nachricht (nicht kopiert!)',
                  'Notiere dir die Reaktionen in deiner Liste'
                ],
                why: 'Regelmäßige Akquise ist der Schlüssel zu stetigem Umsatzwachstum'
              },
              {
                task: 'Arbeite 1 Stunde an deinem Angebot/Produkt',
                duration_minutes: 60,
                frequency: 'daily',
                best_time: 'mittags',
                steps: [
                  'Wähle einen Aspekt deines Angebots zur Verbesserung',
                  'Recherchiere Best Practices oder Konkurrenz',
                  'Implementiere eine konkrete Verbesserung',
                  'Teste oder dokumentiere die Änderung'
                ],
                why: 'Ein starkes Angebot verkauft sich leichter und rechtfertigt höhere Preise'
              }
            ],
            weekly_tasks: ['Analysiere deine Verkaufszahlen', 'Plane die nächste Woche'],
            motivation: 'Jeder erfolgreiche Verkauf beginnt mit einem Gespräch!',
            success_metric: g.title
          }
        } else if (title.includes('abnehm') || title.includes('gewicht') || title.includes('kg') || title.includes('gesund') || title.includes('fitness')) {
          const weeks = 12
          return {
            goal_id: g.id,
            analysis: 'Gesundheitsziele erreicht man durch kleine, tägliche Gewohnheiten. 0.5-1kg pro Woche ist realistisch.',
            duration_weeks: weeks,
            target_date: new Date(Date.now() + weeks*7*24*60*60*1000).toISOString().split('T')[0],
            milestones: [
              { week: 4, target: 'Erste Erfolge sichtbar', metric: '-3kg' },
              { week: 8, target: 'Halbzeit', metric: '-6kg' },
              { week: 12, target: 'Ziel erreicht', metric: '-10kg' }
            ],
            daily_tasks: [
              {
                task: 'Trinke 2 Liter Wasser',
                duration_minutes: 5,
                frequency: 'daily',
                best_time: 'morgens',
                steps: [
                  'Stelle dir abends eine Flasche Wasser bereit',
                  'Trinke direkt nach dem Aufstehen ein Glas',
                  'Fülle die Flasche immer wieder auf',
                  'Nutze eine App oder Markierungen als Erinnerung'
                ],
                why: 'Wasser kurbelt den Stoffwechsel an und reduziert Hungergefühl'
              },
              {
                task: 'Ersetze eine Mahlzeit durch Gemüse/Salat',
                duration_minutes: 15,
                frequency: 'daily',
                best_time: 'mittags',
                steps: [
                  'Bereite am Vorabend Gemüse vor (waschen, schneiden)',
                  'Wähle eine Proteinquelle (Ei, Hühnchen, Hülsenfrüchte)',
                  'Mische einen bunten Salat mit Dressing',
                  'Iss langsam und genieße jeden Bissen'
                ],
                why: 'Gemüse hat wenig Kalorien, viele Nährstoffe und macht satt'
              },
              {
                task: '15 Minuten Bewegung (Spaziergang)',
                duration_minutes: 15,
                frequency: 'daily',
                best_time: 'abends',
                steps: [
                  'Ziehe bequeme Schuhe an',
                  'Gehe nach draußen (auch bei schlechtem Wetter)',
                  'Wähle eine Route ohne Ablenkungen',
                  'Steigere das Tempo in der Mitte für 5 Minuten'
                ],
                why: 'Bewegung verbrennt Kalorien und verbessert die Stimmung'
              }
            ],
            weekly_tasks: ['Wiege dich am Sonntagmorgen', 'Plane Mahlzeiten für die Woche'],
            motivation: 'Dein Körper wird es dir danken - ein Tag nach dem anderen!',
            success_metric: 'Zielgewicht erreicht'
          }
        } else {
          return {
            goal_id: g.id,
            analysis: `"${g.title}" ist ein gutes Ziel. Hier ist ein Rahmenplan.`,
            duration_weeks: 12,
            target_date: targetDate.toISOString().split('T')[0],
            milestones: [
              { week: 4, target: 'Erste Fortschritte', metric: '25% geschafft' },
              { week: 8, target: 'Guter Fortschritt', metric: '60% geschafft' },
              { week: 12, target: 'Ziel erreicht', metric: '100%' }
            ],
            daily_tasks: [
              {
                task: 'Arbeite 30 Minuten fokussiert an deinem Ziel',
                duration_minutes: 30,
                frequency: 'daily',
                best_time: 'morgens',
                steps: [
                  'Schalte alle Ablenkungen aus (Handy auf stumm)',
                  'Definiere ein konkretes Mini-Ziel für diese Session',
                  'Arbeite 25 Minuten ohne Unterbrechung',
                  'Mache 5 Minuten Pause und reflektiere'
                ],
                why: 'Tägliche fokussierte Arbeit führt zu konstantem Fortschritt'
              }
            ],
            weekly_tasks: ['Reflektiere deinen Fortschritt', 'Plane die nächste Woche'],
            motivation: 'Du hast dich entschieden anzufangen - das ist der wichtigste Schritt!',
            success_metric: g.title
          }
        }
      })
    }

    // 5. Speichere Plan direkt am Goal (plan_json Spalte)
    for (const plan of aiPlans) {
      if (plan.goal_id) {
        const { error: updateError } = await supabase
          .schema('core')
          .from('goals')
          .update({
            plan_json: {
              duration_weeks: plan.duration_weeks,
              target_date: plan.target_date,
              milestones: plan.milestones,
              daily_tasks: plan.daily_tasks,
              weekly_tasks: plan.weekly_tasks,
              success_metric: plan.success_metric,
              analysis: plan.analysis,
              motivation: plan.motivation
            }
          })
          .eq('id', plan.goal_id)
          .eq('user_id', userId)

        if (updateError) {
          console.error('Error saving plan to goal:', updateError)
        }
      }
    }

    // 6. Speichere AI-Suggestion (für Audit/History)
    await supabase
      .schema('coach')
      .from('ai_suggestions')
      .insert({
        user_id: userId,
        kind: 'goals_setup',
        payload_json: { goals: savedGoals, plans: aiPlans },
        model: modelUsed,
        tokens_in: tokensUsed.input,
        tokens_out: tokensUsed.output
      })

    // Hinweis: Tasks werden NICHT automatisch erstellt
    // Der User muss den Plan erst akzeptieren (im Frontend)

    return successResponse({
      goals: savedGoals,
      ai_plan: {
        plans: aiPlans
      },
      requires_acceptance: true // Flag für Frontend
    })

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
