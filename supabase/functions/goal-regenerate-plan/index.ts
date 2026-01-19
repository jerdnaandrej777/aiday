// Edge Function: goal-regenerate-plan
// POST - Generiert einen neuen AI-Plan für ein bestehendes Ziel

import { handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { getOpenAIClient, GOALS_ANALYSIS_SYSTEM_PROMPT } from '../_shared/openai.ts'
import { z } from 'https://esm.sh/zod@3'

const RequestSchema = z.object({
  goal_id: z.string().uuid(),
})

interface Milestone {
  week: number
  target: string
  metric?: string
}

interface DailyTask {
  task: string
  duration_minutes: number
  frequency: string
  best_time: string
  steps: string[]
  why: string
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

    const validation = RequestSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse(`Validation error: ${validation.error.message}`, 400)
    }

    const { goal_id } = validation.data
    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id
    const today = new Date().toISOString().split('T')[0]

    // 1. Hole das Ziel
    const { data: goal, error: goalError } = await supabase
      .schema('core')
      .from('goals')
      .select('id, title, why_important, previous_efforts, believed_steps, created_at')
      .eq('id', goal_id)
      .eq('user_id', userId)
      .single()

    if (goalError || !goal) {
      return errorResponse('Ziel nicht gefunden', 404)
    }

    // 2. Hole Benutzerprofil
    const { data: userProfile } = await supabase
      .schema('core')
      .from('user_profile')
      .select('age, job, education, family_status, hobbies, strengths, challenges, motivation')
      .eq('user_id', userId)
      .maybeSingle()

    // 3. Generiere AI-Plan
    let aiPlan: any = null
    let tokensUsed = { input: 0, output: 0 }
    let modelUsed = 'fallback'

    try {
      const openai = getOpenAIClient()

      let profileContext = ''
      if (userProfile && (userProfile.age || userProfile.job)) {
        profileContext = `
=== PERSÖNLICHER KONTEXT ===
${userProfile.age ? `Alter: ${userProfile.age} Jahre` : ''}
${userProfile.job ? `Beruf: ${userProfile.job}` : ''}
${userProfile.education ? `Bildung: ${userProfile.education}` : ''}
${userProfile.family_status ? `Familienstand: ${userProfile.family_status}` : ''}
${userProfile.hobbies ? `Hobbys: ${userProfile.hobbies}` : ''}
${userProfile.strengths ? `Stärken: ${userProfile.strengths}` : ''}
${userProfile.challenges ? `Herausforderungen: ${userProfile.challenges}` : ''}
===========================
`
      }

      const userPrompt = `Erstelle einen DETAILLIERTEN Aktionsplan für dieses Ziel:
${profileContext}
=== ZIEL ===
Titel: ${goal.title}
Warum wichtig: ${goal.why_important || 'Nicht angegeben'}
Bisherige Versuche: ${goal.previous_efforts || 'Keine Angabe'}
Eigene Ideen: ${goal.believed_steps || 'Keine Angabe'}

Heutiges Datum: ${today}

WICHTIG - ERSTELLE SEHR DETAILLIERTE TÄGLICHE AUFGABEN:
- Berechne einen REALISTISCHEN Zeitrahmen
- Erstelle MESSBARE Meilensteine (alle 2-4 Wochen)
- Für JEDE tägliche Aufgabe:
  * KONKRETE Beschreibung
  * BESTE TAGESZEIT (morgens/mittags/abends)
  * SCHRITT-FÜR-SCHRITT Anleitung (3-5 Schritte)
  * WARUM diese Aufgabe wichtig ist

Antworte im JSON-Format:
{
  "analysis": "2-3 Sätze Analyse",
  "duration_weeks": 12,
  "success_metric": "Messbares Erfolgskriterium",
  "milestones": [
    {"week": 4, "target": "Erstes Zwischenziel", "metric": "Messbar"}
  ],
  "daily_tasks": [
    {
      "task": "Konkrete Aufgabe",
      "duration_minutes": 30,
      "frequency": "daily",
      "best_time": "morgens",
      "steps": ["Schritt 1", "Schritt 2", "Schritt 3"],
      "why": "Warum wichtig"
    }
  ],
  "weekly_tasks": ["Wöchentliche Aufgabe"],
  "motivation": "Motivierende Nachricht"
}`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: GOALS_ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000
      })

      const content = completion.choices[0]?.message?.content
      if (content) {
        const parsed = JSON.parse(content)
        const durationWeeks = parsed.duration_weeks || 12
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + (durationWeeks * 7))

        aiPlan = {
          duration_weeks: durationWeeks,
          target_date: targetDate.toISOString().split('T')[0],
          milestones: parsed.milestones || [],
          daily_tasks: parsed.daily_tasks || [],
          weekly_tasks: parsed.weekly_tasks || [],
          success_metric: parsed.success_metric || '',
          analysis: parsed.analysis || '',
          motivation: parsed.motivation || ''
        }

        tokensUsed = {
          input: completion.usage?.prompt_tokens || 0,
          output: completion.usage?.completion_tokens || 0
        }
        modelUsed = completion.model || 'gpt-4o-mini'
      }
    } catch (aiError) {
      console.error('AI generation failed:', aiError)
      // Fallback-Plan
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + 84)

      aiPlan = {
        duration_weeks: 12,
        target_date: targetDate.toISOString().split('T')[0],
        milestones: [
          { week: 4, target: 'Erste Fortschritte', metric: '25% geschafft' },
          { week: 8, target: 'Guter Fortschritt', metric: '60% geschafft' },
          { week: 12, target: 'Ziel erreicht', metric: '100%' }
        ],
        daily_tasks: [
          {
            task: `Arbeite 30 Minuten an: ${goal.title}`,
            duration_minutes: 30,
            frequency: 'daily',
            best_time: 'morgens',
            steps: [
              'Schalte alle Ablenkungen aus',
              'Definiere ein konkretes Mini-Ziel',
              'Arbeite 25 Minuten fokussiert',
              'Mache 5 Minuten Pause'
            ],
            why: 'Tägliche fokussierte Arbeit führt zu konstantem Fortschritt'
          }
        ],
        weekly_tasks: ['Reflektiere deinen Fortschritt', 'Plane die nächste Woche'],
        success_metric: goal.title,
        analysis: `"${goal.title}" ist ein gutes Ziel. Hier ist ein Rahmenplan.`,
        motivation: 'Du hast dich entschieden anzufangen - das ist der wichtigste Schritt!'
      }
    }

    // 4. Speichere Plan am Goal
    const { error: updateError } = await supabase
      .schema('core')
      .from('goals')
      .update({
        plan_json: aiPlan,
        target_date: aiPlan.target_date
      })
      .eq('id', goal_id)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error saving plan:', updateError)
      return errorResponse(`Fehler beim Speichern: ${updateError.message}`, 500)
    }

    // 5. Speichere in ai_suggestions für History
    await supabase
      .schema('coach')
      .from('ai_suggestions')
      .insert({
        user_id: userId,
        goal_id: goal_id,
        kind: 'plan_regenerated',
        payload_json: { goal, plan: aiPlan },
        model: modelUsed,
        tokens_in: tokensUsed.input,
        tokens_out: tokensUsed.output
      })

    return successResponse({
      success: true,
      goal_id: goal_id,
      plan: aiPlan
    })

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
