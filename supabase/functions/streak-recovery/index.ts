// Edge Function: streak-recovery
// POST - Streak Rescue Feature: Wiederherstellung nach verpasstem Tag

import { handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { getUserToday, extractTimezoneOffset } from '../_shared/utils.ts'
import { getOpenAIClient } from '../_shared/openai.ts'
import { z } from 'https://esm.sh/zod@3'

const RequestSchema = z.object({
  action: z.enum(['check', 'start', 'update_progress']),
  recovery_id: z.string().uuid().optional(), // Für update_progress
  timezone_offset: z.number().optional(),
})

const RECOVERY_MOTIVATION_PROMPT = `Du bist ein motivierender Coach.
Der Nutzer hat seine Streak verloren und möchte sie wiederaufbauen.

Erstelle einen 3-Tage Comeback-Plan mit:
1. Tag 1: Sanfter Wiedereinstieg (50% der normalen Aufgaben)
2. Tag 2: Aufbau (75% der normalen Aufgaben)
3. Tag 3: Volle Kraft (100%)

Zusätzlich:
- Eine aufmunternde Nachricht
- 3 konkrete Mini-Aufgaben für den ersten Tag
- Ein Belohnungsversprechen für erfolgreiche Recovery

Antworte im JSON-Format:
{
  "motivation_message": "Aufmunternde Nachricht",
  "comeback_plan": {
    "day_1": { "intensity": 50, "focus": "Beschreibung", "tasks": ["Task 1", "Task 2"] },
    "day_2": { "intensity": 75, "focus": "Beschreibung", "tasks": ["Task 1", "Task 2", "Task 3"] },
    "day_3": { "intensity": 100, "focus": "Beschreibung", "tasks": ["Task 1", "Task 2", "Task 3"] }
  },
  "reward_promise": "Was der User bei Erfolg bekommt"
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

    const { action, recovery_id } = validation.data
    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id
    const timezoneOffset = extractTimezoneOffset(req, validation.data)
    const today = getUserToday(timezoneOffset)

    // === CHECK: Prüfe ob Recovery verfügbar ===
    if (action === 'check') {
      // Hole User-Profil mit Streak-Daten
      const { data: profile } = await supabase
        .schema('core')
        .from('user_profile')
        .select('current_streak, best_streak, last_active_date')
        .eq('user_id', userId)
        .single()

      // Prüfe letzte Recovery
      const oneMonthAgo = new Date()
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30)
      const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0]

      const { data: recentRecovery } = await supabase
        .schema('core')
        .from('streak_recoveries')
        .select('*')
        .eq('user_id', userId)
        .gte('recovery_date', oneMonthAgoStr)
        .order('recovery_date', { ascending: false })
        .limit(1)
        .single()

      // Prüfe ob Streak verloren wurde
      const lastActive = profile?.last_active_date
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      const streakLost = lastActive && lastActive < yesterdayStr && (profile?.current_streak || 0) > 0

      return successResponse({
        can_recover: !recentRecovery && streakLost,
        streak_lost: streakLost,
        previous_streak: profile?.current_streak || 0,
        best_streak: profile?.best_streak || 0,
        last_active: lastActive,
        recovery_available_in_days: recentRecovery
          ? Math.max(0, 30 - Math.floor((new Date().getTime() - new Date(recentRecovery.recovery_date).getTime()) / (1000 * 60 * 60 * 24)))
          : 0,
        active_recovery: recentRecovery?.recovery_challenge_completed === false ? recentRecovery : null,
      })
    }

    // === START: Recovery-Challenge starten ===
    if (action === 'start') {
      // Hole aktuelle Streak
      const { data: profile } = await supabase
        .schema('core')
        .from('user_profile')
        .select('current_streak, best_streak')
        .eq('user_id', userId)
        .single()

      const previousStreak = profile?.current_streak || 0

      if (previousStreak === 0) {
        return errorResponse('Keine Streak zum Wiederherstellen', 400)
      }

      // Prüfe ob Recovery erlaubt
      const oneMonthAgo = new Date()
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30)
      const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0]

      const { data: recentRecovery } = await supabase
        .schema('core')
        .from('streak_recoveries')
        .select('id')
        .eq('user_id', userId)
        .gte('recovery_date', oneMonthAgoStr)
        .limit(1)
        .single()

      if (recentRecovery) {
        return errorResponse('Recovery bereits in diesem Monat verwendet', 400)
      }

      // AI-Motivationsplan erstellen
      const openai = getOpenAIClient()
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: RECOVERY_MOTIVATION_PROMPT },
          { role: 'user', content: `Der Nutzer hatte eine Streak von ${previousStreak} Tagen und hat gestern einen Tag verpasst. Erstelle einen Comeback-Plan.` }
        ],
        temperature: 0.7,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      })

      const aiResponseText = completion.choices[0]?.message?.content || '{}'
      let comebackPlan
      try {
        comebackPlan = JSON.parse(aiResponseText)
      } catch {
        comebackPlan = {
          motivation_message: 'Du schaffst das! Jeder Tag ist ein neuer Anfang.',
          comeback_plan: {
            day_1: { intensity: 50, focus: 'Sanfter Start', tasks: ['Eine kleine Aufgabe erledigen'] },
            day_2: { intensity: 75, focus: 'Aufbau', tasks: ['Zwei Aufgaben schaffen'] },
            day_3: { intensity: 100, focus: 'Volle Kraft', tasks: ['Alle geplanten Aufgaben'] }
          },
          reward_promise: '+200 Bonus-XP bei erfolgreicher Recovery!'
        }
      }

      // Berechne Zieldatum (3 Tage ab heute)
      const challengeEnd = new Date()
      challengeEnd.setDate(challengeEnd.getDate() + 3)
      const challengeEndStr = challengeEnd.toISOString().split('T')[0]

      // Recovery-Eintrag erstellen
      const { data: recovery, error: recoveryError } = await supabase
        .schema('core')
        .from('streak_recoveries')
        .insert({
          user_id: userId,
          recovery_date: today,
          previous_streak: previousStreak,
          recovered_streak: Math.max(1, previousStreak - 1), // 1 Tag Abzug
          challenge_start_date: today,
          challenge_end_date: challengeEndStr,
          challenge_days_completed: 0,
        })
        .select()
        .single()

      if (recoveryError) {
        return errorResponse(`Failed to start recovery: ${recoveryError.message}`, 500)
      }

      return successResponse({
        success: true,
        recovery,
        comeback_plan: comebackPlan,
        message: comebackPlan.motivation_message,
      })
    }

    // === UPDATE_PROGRESS: Täglichen Fortschritt aktualisieren ===
    if (action === 'update_progress') {
      if (!recovery_id) {
        return errorResponse('recovery_id required', 400)
      }

      // Hole Recovery
      const { data: recovery, error: recoveryError } = await supabase
        .schema('core')
        .from('streak_recoveries')
        .select('*')
        .eq('id', recovery_id)
        .eq('user_id', userId)
        .single()

      if (recoveryError || !recovery) {
        return errorResponse('Recovery not found', 404)
      }

      if (recovery.recovery_challenge_completed) {
        return errorResponse('Recovery already completed', 400)
      }

      // Erhöhe Fortschritt
      const newDaysCompleted = (recovery.challenge_days_completed || 0) + 1
      const challengeCompleted = newDaysCompleted >= 3

      // Update Recovery
      const { error: updateError } = await supabase
        .schema('core')
        .from('streak_recoveries')
        .update({
          challenge_days_completed: newDaysCompleted,
          recovery_challenge_completed: challengeCompleted,
          bonus_xp_awarded: challengeCompleted ? 200 : 0,
        })
        .eq('id', recovery_id)

      if (updateError) {
        return errorResponse(`Failed to update progress: ${updateError.message}`, 500)
      }

      // Bei erfolgreicher Challenge: Streak wiederherstellen und XP vergeben
      if (challengeCompleted) {
        // Streak wiederherstellen
        await supabase
          .schema('core')
          .from('user_profile')
          .update({
            current_streak: recovery.recovered_streak + 3, // + die 3 Challenge-Tage
            last_active_date: today,
          })
          .eq('user_id', userId)

        // Bonus-XP vergeben
        const { data: profile } = await supabase
          .schema('core')
          .from('user_profile')
          .select('total_xp')
          .eq('user_id', userId)
          .single()

        await supabase
          .schema('core')
          .from('user_profile')
          .update({
            total_xp: (profile?.total_xp || 0) + 200,
          })
          .eq('user_id', userId)

        // Achievement vergeben
        const { data: achievement } = await supabase
          .schema('core')
          .from('achievements')
          .select('id')
          .eq('code', 'recovery_challenge')
          .single()

        if (achievement) {
          await supabase
            .schema('core')
            .from('user_achievements')
            .upsert({
              user_id: userId,
              achievement_id: achievement.id,
            }, { onConflict: 'user_id,achievement_id' })
        }
      }

      return successResponse({
        success: true,
        days_completed: newDaysCompleted,
        challenge_completed: challengeCompleted,
        bonus_xp: challengeCompleted ? 200 : 0,
        new_streak: challengeCompleted ? recovery.recovered_streak + 3 : null,
      })
    }

    return errorResponse('Invalid action', 400)

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
