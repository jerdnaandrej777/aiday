// Edge Function: weekly-reflection
// POST - Weekly Deep Review mit AI-Analyse

import { handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { getUserToday, extractTimezoneOffset } from '../_shared/utils.ts'
import { getOpenAIClient } from '../_shared/openai.ts'
import { z } from 'https://esm.sh/zod@3'

const RequestSchema = z.object({
  action: z.enum(['get_data', 'submit_reflection', 'get_analysis']),
  what_went_well: z.string().max(1000).optional(),
  what_didnt_work: z.string().max(1000).optional(),
  mood_notes: z.string().max(500).optional(),
  timezone_offset: z.number().optional(),
})

const WEEKLY_ANALYSIS_PROMPT = `Du bist ein einfühlsamer Produktivitäts-Coach.
Analysiere die Wochendaten und Reflexion des Nutzers.

Deine Analyse sollte enthalten:
1. Positive Erkenntnisse (was gut lief und warum)
2. Herausforderungen (was nicht klappte und mögliche Ursachen)
3. Muster erkennen (wiederkehrende Themen)
4. 3 konkrete Vorschläge für die nächste Woche
5. Eine motivierende Abschlussbotschaft

Sei konstruktiv, nicht kritisch. Feiere Erfolge, auch kleine.

Antworte im JSON-Format:
{
  "positive_insights": ["Insight 1", "Insight 2"],
  "challenges_analysis": ["Challenge 1 Analyse", "Challenge 2 Analyse"],
  "patterns_detected": ["Muster 1", "Muster 2"],
  "next_week_suggestions": [
    { "suggestion": "Vorschlag", "why": "Begründung" },
    { "suggestion": "Vorschlag", "why": "Begründung" },
    { "suggestion": "Vorschlag", "why": "Begründung" }
  ],
  "motivation_message": "Abschlussbotschaft",
  "focus_area": "Ein Hauptfokus für nächste Woche"
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

    const { action, what_went_well, what_didnt_work, mood_notes } = validation.data
    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id
    const timezoneOffset = extractTimezoneOffset(req, validation.data)
    const today = getUserToday(timezoneOffset)

    // Berechne Wochendaten (letzte 7 Tage)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    // === GET_DATA: Hole Wochendaten für Review ===
    if (action === 'get_data') {
      // Hole Tasks der Woche
      const { data: tasks } = await supabase
        .schema('core')
        .from('daily_tasks')
        .select('*')
        .eq('user_id', userId)
        .gte('date', weekStartStr)
        .lte('date', today)
        .order('date', { ascending: true })

      // Hole Check-ins der Woche
      const { data: checkins } = await supabase
        .schema('core')
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .gte('date', weekStartStr)
        .lte('date', today)
        .order('date', { ascending: true })

      // Hole Ziele
      const { data: goals } = await supabase
        .schema('core')
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['in_progress', 'achieved'])

      // Berechne Statistiken
      const totalTasks = tasks?.length || 0
      const completedTasks = tasks?.filter((t: any) => t.completed).length || 0
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      // Mood-Tracking
      const moodCounts: Record<string, number> = {}
      const energyLevels: number[] = []
      checkins?.forEach((c: any) => {
        if (c.mood) {
          moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1
        }
        if (c.energy_level) {
          energyLevels.push(c.energy_level)
        }
      })

      const avgEnergy = energyLevels.length > 0
        ? Math.round(energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length * 10) / 10
        : null

      // Bestimme dominante Stimmung
      let dominantMood = null
      let maxCount = 0
      for (const [mood, count] of Object.entries(moodCounts)) {
        if (count > maxCount) {
          maxCount = count
          dominantMood = mood
        }
      }

      return successResponse({
        week_start: weekStartStr,
        week_end: today,
        stats: {
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          completion_rate: completionRate,
          active_goals: goals?.filter((g: any) => g.status === 'in_progress').length || 0,
          achieved_goals: goals?.filter((g: any) => g.status === 'achieved').length || 0,
          checkin_days: checkins?.length || 0,
          avg_energy: avgEnergy,
          dominant_mood: dominantMood,
          mood_distribution: moodCounts,
        },
        tasks: tasks || [],
        checkins: checkins || [],
      })
    }

    // === SUBMIT_REFLECTION: User-Reflexion speichern und AI-Analyse anfordern ===
    if (action === 'submit_reflection') {
      if (!what_went_well && !what_didnt_work) {
        return errorResponse('At least one reflection field required', 400)
      }

      // Hole Wochendaten für AI-Analyse
      const { data: tasks } = await supabase
        .schema('core')
        .from('daily_tasks')
        .select('task_text, completed, date')
        .eq('user_id', userId)
        .gte('date', weekStartStr)
        .lte('date', today)

      const { data: checkins } = await supabase
        .schema('core')
        .from('daily_checkins')
        .select('mood, energy_level, mood_note, date')
        .eq('user_id', userId)
        .gte('date', weekStartStr)
        .lte('date', today)

      // Statistiken berechnen
      const totalTasks = tasks?.length || 0
      const completedTasks = tasks?.filter((t: any) => t.completed).length || 0
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      // AI-Analyse
      const openai = getOpenAIClient()
      const userPrompt = `Wochendaten:
- Aufgaben: ${completedTasks}/${totalTasks} erledigt (${completionRate}%)
- Check-ins: ${checkins?.length || 0} Tage
- Stimmungen: ${checkins?.map((c: any) => c.mood).filter(Boolean).join(', ') || 'keine Daten'}
- Energie-Level: ${checkins?.map((c: any) => c.energy_level).filter(Boolean).join(', ') || 'keine Daten'}

Nutzer-Reflexion:
Was gut lief: "${what_went_well || 'Nicht angegeben'}"
Was nicht klappte: "${what_didnt_work || 'Nicht angegeben'}"
${mood_notes ? `Zusätzliche Notizen: "${mood_notes}"` : ''}

Analysiere diese Woche und gib hilfreiche Vorschläge.`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: WEEKLY_ANALYSIS_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      })

      const aiResponseText = completion.choices[0]?.message?.content || '{}'
      let analysis
      try {
        analysis = JSON.parse(aiResponseText)
      } catch {
        analysis = {
          positive_insights: ['Du hast diese Woche reflektiert - das ist bereits ein Erfolg!'],
          challenges_analysis: ['Weiter so mit der Selbstreflexion.'],
          patterns_detected: [],
          next_week_suggestions: [
            { suggestion: 'Setze dir ein kleines, erreichbares Ziel', why: 'Kleine Erfolge motivieren' }
          ],
          motivation_message: 'Jede Woche ist eine neue Chance. Du schaffst das!',
          focus_area: 'Konsistenz'
        }
      }

      // Speichere Reflexion in AI-Suggestions (für Historie)
      await supabase
        .schema('coach')
        .from('ai_suggestions')
        .insert({
          user_id: userId,
          kind: 'weekly_reflection',
          payload_json: {
            week_start: weekStartStr,
            week_end: today,
            user_reflection: {
              what_went_well,
              what_didnt_work,
              mood_notes,
            },
            ai_analysis: analysis,
            stats: {
              total_tasks: totalTasks,
              completed_tasks: completedTasks,
              completion_rate: completionRate,
            }
          },
          model: 'gpt-4o-mini',
          tokens_in: completion.usage?.prompt_tokens || 0,
          tokens_out: completion.usage?.completion_tokens || 0,
        })

      return successResponse({
        success: true,
        analysis,
        stats: {
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          completion_rate: completionRate,
        },
        tokens_used: completion.usage?.total_tokens || 0,
      })
    }

    // === GET_ANALYSIS: Hole letzte Analyse ===
    if (action === 'get_analysis') {
      const { data: lastReflection } = await supabase
        .schema('coach')
        .from('ai_suggestions')
        .select('*')
        .eq('user_id', userId)
        .eq('kind', 'weekly_reflection')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return successResponse({
        has_reflection: !!lastReflection,
        reflection: lastReflection?.payload_json || null,
        created_at: lastReflection?.created_at || null,
      })
    }

    return errorResponse('Invalid action', 400)

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
