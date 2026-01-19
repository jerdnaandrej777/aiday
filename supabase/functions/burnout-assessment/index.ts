// Edge Function: burnout-assessment
// POST - Burnout Detection und Recovery-Vorschläge

import { handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { getUserToday, extractTimezoneOffset } from '../_shared/utils.ts'
import { getOpenAIClient } from '../_shared/openai.ts'
import { z } from 'https://esm.sh/zod@3'

const RequestSchema = z.object({
  action: z.enum(['check', 'activate_recovery', 'deactivate_recovery']),
  timezone_offset: z.number().optional(),
})

// Burnout-Indikatoren
const BURNOUT_THRESHOLDS = {
  completion_rate: 30,        // Unter 30% = Warnung
  bad_mood_streak: 3,         // 3 Tage schlechte Stimmung
  energy_average: 2,          // Durchschnitt unter 2 = Warnung
  days_to_analyze: 7,         // Letzte 7 Tage analysieren
}

const BURNOUT_RECOVERY_PROMPT = `Du bist ein einfühlsamer Wellness-Coach.
Der Nutzer zeigt Anzeichen von Überlastung. Erstelle einen sanften Recovery-Plan.

Wichtig:
- Sei verständnisvoll, nicht kritisch
- Schlage WENIGER Aufgaben vor, nicht mehr
- Fokus auf Selbstfürsorge
- Realistische, kleine Schritte

Antworte im JSON-Format:
{
  "warning_message": "Einfühlsame Nachricht über die Überlastung",
  "recommendations": [
    { "type": "reduce", "suggestion": "Was reduzieren", "why": "Begründung" },
    { "type": "selfcare", "suggestion": "Selbstfürsorge-Tipp", "why": "Begründung" },
    { "type": "mindset", "suggestion": "Mentaler Tipp", "why": "Begründung" }
  ],
  "recovery_mode_suggestion": {
    "duration_days": 7,
    "task_reduction_percent": 50,
    "daily_selfcare_reminder": "Tägliche Erinnerung"
  },
  "affirmation": "Positive Bestärkung"
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

    const { action } = validation.data
    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id
    const timezoneOffset = extractTimezoneOffset(req, validation.data)
    const today = getUserToday(timezoneOffset)

    // Berechne Analysezeitraum
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - BURNOUT_THRESHOLDS.days_to_analyze)
    const startDateStr = startDate.toISOString().split('T')[0]

    // === CHECK: Prüfe auf Burnout-Indikatoren ===
    if (action === 'check') {
      // Hole Tasks
      const { data: tasks } = await supabase
        .schema('core')
        .from('daily_tasks')
        .select('completed, date')
        .eq('user_id', userId)
        .gte('date', startDateStr)
        .lte('date', today)

      // Hole Check-ins
      const { data: checkins } = await supabase
        .schema('core')
        .from('daily_checkins')
        .select('mood, energy_level, date')
        .eq('user_id', userId)
        .gte('date', startDateStr)
        .lte('date', today)
        .order('date', { ascending: false })

      // Hole aktuellen Recovery-Status
      const { data: profile } = await supabase
        .schema('core')
        .from('user_profile')
        .select('notification_preferences')
        .eq('user_id', userId)
        .single()

      const isInRecoveryMode = profile?.notification_preferences?.recovery_mode_active === true

      // Berechne Indikatoren
      const totalTasks = tasks?.length || 0
      const completedTasks = tasks?.filter((t: any) => t.completed).length || 0
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100

      // Mood-Analyse
      const moodValues: Record<string, number> = {
        'great': 5,
        'good': 4,
        'neutral': 3,
        'bad': 2,
        'terrible': 1
      }

      const moodScores = checkins
        ?.map((c: any) => moodValues[c.mood] || 3)
        .filter(Boolean) || []

      const avgMood = moodScores.length > 0
        ? moodScores.reduce((a: number, b: number) => a + b, 0) / moodScores.length
        : 3

      // Zähle konsekutive schlechte Tage
      let badMoodStreak = 0
      for (const checkin of (checkins || [])) {
        if (checkin.mood === 'bad' || checkin.mood === 'terrible') {
          badMoodStreak++
        } else {
          break
        }
      }

      // Energie-Durchschnitt
      const energyLevels = checkins
        ?.map((c: any) => c.energy_level)
        .filter(Boolean) || []

      const avgEnergy = energyLevels.length > 0
        ? energyLevels.reduce((a: number, b: number) => a + b, 0) / energyLevels.length
        : 3

      // Burnout-Score berechnen (0-100, höher = mehr Burnout-Risiko)
      let burnoutScore = 0
      const indicators: string[] = []

      if (completionRate < BURNOUT_THRESHOLDS.completion_rate) {
        burnoutScore += 30
        indicators.push(`Niedrige Completion Rate (${completionRate}%)`)
      }

      if (badMoodStreak >= BURNOUT_THRESHOLDS.bad_mood_streak) {
        burnoutScore += 35
        indicators.push(`${badMoodStreak} Tage schlechte Stimmung in Folge`)
      }

      if (avgEnergy < BURNOUT_THRESHOLDS.energy_average) {
        burnoutScore += 25
        indicators.push(`Niedriges Energielevel (Ø ${avgEnergy.toFixed(1)})`)
      }

      if (avgMood < 2.5) {
        burnoutScore += 10
        indicators.push(`Niedrige Durchschnittsstimmung`)
      }

      // Warnung generieren wenn Score hoch
      let warning = null
      let recommendations = null

      if (burnoutScore >= 50 && !isInRecoveryMode) {
        // AI-Empfehlungen holen
        const openai = getOpenAIClient()
        const userPrompt = `Nutzer-Daten der letzten 7 Tage:
- Completion Rate: ${completionRate}%
- Durchschnittliche Stimmung: ${avgMood.toFixed(1)}/5
- Durchschnittliche Energie: ${avgEnergy.toFixed(1)}/5
- Schlechte Stimmung in Folge: ${badMoodStreak} Tage

Indikatoren: ${indicators.join(', ')}

Erstelle einen einfühlsamen Recovery-Plan.`

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: BURNOUT_RECOVERY_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 600,
          response_format: { type: 'json_object' }
        })

        const aiResponseText = completion.choices[0]?.message?.content || '{}'
        try {
          const aiResponse = JSON.parse(aiResponseText)
          warning = aiResponse.warning_message
          recommendations = aiResponse
        } catch {
          warning = 'Es sieht so aus, als hättest du gerade viel um die Ohren. Denk daran, auch auf dich selbst zu achten.'
          recommendations = {
            recommendations: [
              { type: 'reduce', suggestion: 'Reduziere deine Aufgaben um 30%', why: 'Weniger ist manchmal mehr' }
            ]
          }
        }
      }

      return successResponse({
        burnout_score: burnoutScore,
        risk_level: burnoutScore >= 70 ? 'high' : burnoutScore >= 50 ? 'medium' : 'low',
        indicators,
        stats: {
          completion_rate: completionRate,
          avg_mood: Math.round(avgMood * 10) / 10,
          avg_energy: Math.round(avgEnergy * 10) / 10,
          bad_mood_streak: badMoodStreak,
          days_analyzed: BURNOUT_THRESHOLDS.days_to_analyze,
        },
        warning,
        recommendations,
        is_in_recovery_mode: isInRecoveryMode,
      })
    }

    // === ACTIVATE_RECOVERY: Recovery Mode aktivieren ===
    if (action === 'activate_recovery') {
      const { data: profile } = await supabase
        .schema('core')
        .from('user_profile')
        .select('notification_preferences')
        .eq('user_id', userId)
        .single()

      const currentPrefs = profile?.notification_preferences || {}

      const recoveryEndDate = new Date()
      recoveryEndDate.setDate(recoveryEndDate.getDate() + 7)

      const { error: updateError } = await supabase
        .schema('core')
        .from('user_profile')
        .update({
          notification_preferences: {
            ...currentPrefs,
            recovery_mode_active: true,
            recovery_mode_start: today,
            recovery_mode_end: recoveryEndDate.toISOString().split('T')[0],
            task_reduction_percent: 50,
          }
        })
        .eq('user_id', userId)

      if (updateError) {
        return errorResponse(`Failed to activate recovery: ${updateError.message}`, 500)
      }

      return successResponse({
        success: true,
        message: 'Recovery Mode aktiviert für 7 Tage',
        recovery_end: recoveryEndDate.toISOString().split('T')[0],
        task_reduction: 50,
      })
    }

    // === DEACTIVATE_RECOVERY: Recovery Mode deaktivieren ===
    if (action === 'deactivate_recovery') {
      const { data: profile } = await supabase
        .schema('core')
        .from('user_profile')
        .select('notification_preferences')
        .eq('user_id', userId)
        .single()

      const currentPrefs = profile?.notification_preferences || {}

      const { error: updateError } = await supabase
        .schema('core')
        .from('user_profile')
        .update({
          notification_preferences: {
            ...currentPrefs,
            recovery_mode_active: false,
            recovery_mode_start: null,
            recovery_mode_end: null,
            task_reduction_percent: null,
          }
        })
        .eq('user_id', userId)

      if (updateError) {
        return errorResponse(`Failed to deactivate recovery: ${updateError.message}`, 500)
      }

      return successResponse({
        success: true,
        message: 'Recovery Mode deaktiviert',
      })
    }

    return errorResponse('Invalid action', 400)

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
