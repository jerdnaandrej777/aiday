// Edge Function: gamification-award
// POST - Vergibt XP und prüft/vergibt Achievements

import { handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { z } from 'https://esm.sh/zod@3'

// XP-Werte für verschiedene Aktionen
const XP_VALUES = {
  task_complete: 10,
  all_tasks_complete: 50,  // Bonus für alle Tagesaufgaben
  goal_achieved: 100,
  streak_continued: 20,
  checkin_done: 5,
} as const

const RequestSchema = z.object({
  action: z.enum(['task_complete', 'all_tasks_complete', 'goal_achieved', 'streak_continued', 'checkin_done']),
  metadata: z.object({
    streak_days: z.number().optional(),
    tasks_completed_today: z.number().optional(),
    total_tasks_completed: z.number().optional(),
    goals_count: z.number().optional(),
  }).optional(),
})

interface Achievement {
  id: string
  code: string
  name: string
  description: string
  icon: string
  xp_reward: number
  category: string
  threshold: number
}

interface AwardResult {
  xp_earned: number
  total_xp: number
  level: number
  previous_level: number
  level_up: boolean
  new_achievements: Array<{
    code: string
    name: string
    icon: string
    xp_reward: number
  }>
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

    const { action, metadata } = validation.data
    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id

    // 1. Aktuelles User-Profil laden
    const { data: profile, error: profileError } = await supabase
      .schema('core')
      .from('user_profile')
      .select('total_xp, level')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return errorResponse('Profil nicht gefunden', 404)
    }

    const previousXp = profile.total_xp || 0
    const previousLevel = profile.level || 1

    // 2. XP für Aktion berechnen
    let xpEarned = XP_VALUES[action] || 0

    // Bonus XP für Streaks
    if (action === 'streak_continued' && metadata?.streak_days) {
      // Extra XP für längere Streaks: +5 XP pro zusätzlichem Tag
      const bonusXp = Math.min(metadata.streak_days - 1, 29) * 5
      xpEarned += bonusXp
    }

    // 3. Achievements prüfen
    const newAchievements: Array<{code: string; name: string; icon: string; xp_reward: number}> = []

    // Alle Achievements laden
    const { data: allAchievements } = await supabase
      .schema('core')
      .from('achievements')
      .select('*')

    // Bereits verdiente Achievements laden
    const { data: earnedAchievements } = await supabase
      .schema('core')
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId)

    const earnedIds = new Set((earnedAchievements || []).map(ea => ea.achievement_id))

    // Achievement-Prüfung basierend auf Aktion und Metadata
    for (const achievement of (allAchievements || []) as Achievement[]) {
      // Bereits verdient? Überspringen
      if (earnedIds.has(achievement.id)) continue

      let shouldAward = false

      switch (achievement.category) {
        case 'tasks':
          if (action === 'task_complete' && metadata?.total_tasks_completed) {
            shouldAward = metadata.total_tasks_completed >= (achievement.threshold || 0)
          }
          break

        case 'goals':
          if (action === 'goal_achieved' && metadata?.goals_count) {
            shouldAward = metadata.goals_count >= (achievement.threshold || 0)
          }
          // first_goal Achievement bei erstem Ziel
          if (achievement.code === 'first_goal' && action === 'task_complete' && metadata?.goals_count === 1) {
            shouldAward = true
          }
          break

        case 'streak':
          if (action === 'streak_continued' && metadata?.streak_days) {
            shouldAward = metadata.streak_days >= (achievement.threshold || 0)
          }
          break

        case 'daily':
          if (achievement.code === 'perfect_day' && action === 'all_tasks_complete') {
            shouldAward = true
          }
          break
      }

      if (shouldAward) {
        // Achievement vergeben
        const { error: insertError } = await supabase
          .schema('core')
          .from('user_achievements')
          .insert({
            user_id: userId,
            achievement_id: achievement.id,
          })

        if (!insertError) {
          newAchievements.push({
            code: achievement.code,
            name: achievement.name,
            icon: achievement.icon || '🏆',
            xp_reward: achievement.xp_reward || 0,
          })
          xpEarned += achievement.xp_reward || 0
        }
      }
    }

    // 4. XP aktualisieren
    const newTotalXp = previousXp + xpEarned

    const { error: updateError } = await supabase
      .schema('core')
      .from('user_profile')
      .update({ total_xp: newTotalXp })
      .eq('user_id', userId)

    if (updateError) {
      console.error('XP update error:', updateError)
      return errorResponse('Fehler beim XP-Update', 500)
    }

    // 5. Neues Level berechnen (Trigger sollte das machen, aber zur Sicherheit)
    const newLevel = Math.floor(Math.sqrt(newTotalXp / 100)) + 1
    const levelUp = newLevel > previousLevel

    // 6. Response zusammenstellen
    const result: AwardResult = {
      xp_earned: xpEarned,
      total_xp: newTotalXp,
      level: newLevel,
      previous_level: previousLevel,
      level_up: levelUp,
      new_achievements: newAchievements,
    }

    return successResponse(result)

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
