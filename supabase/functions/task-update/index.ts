// Edge Function: task-update
// POST - Aktualisiert oder löscht eine tägliche Aufgabe

import { handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { getUserToday, extractTimezoneOffset } from '../_shared/utils.ts'
import { z } from 'https://esm.sh/zod@3'

const RequestSchema = z.object({
  task_id: z.string().uuid(),
  action: z.enum(['complete', 'uncomplete', 'delete']),
  timezone_offset: z.number().optional(),
})

// XP-Werte
const XP_TASK_COMPLETE = 10
const XP_ALL_TASKS_BONUS = 50

// Gamification: XP vergeben und Achievements prüfen
async function awardXpForTaskCompletion(supabase: any, userId: string, today: string) {
  // 1. Zähle erledigte Tasks heute und total
  const { data: todayTasks } = await supabase
    .schema('core')
    .from('daily_tasks')
    .select('id, completed')
    .eq('user_id', userId)
    .eq('date', today)

  const { count: totalCompleted } = await supabase
    .schema('core')
    .from('daily_tasks')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('completed', true)

  const allTasksToday = todayTasks || []
  const completedToday = allTasksToday.filter((t: any) => t.completed).length
  const allTasksCompletedToday = allTasksToday.length > 0 && completedToday === allTasksToday.length

  // 2. Aktuelles Profil laden
  const { data: profile } = await supabase
    .schema('core')
    .from('user_profile')
    .select('total_xp, level')
    .eq('user_id', userId)
    .single()

  const previousXp = profile?.total_xp || 0
  const previousLevel = profile?.level || 1

  // 3. XP berechnen
  let xpEarned = XP_TASK_COMPLETE
  if (allTasksCompletedToday) {
    xpEarned += XP_ALL_TASKS_BONUS
  }

  // 4. Achievements prüfen
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

  const earnedIds = new Set((earnedAchievements || []).map((ea: any) => ea.achievement_id))

  for (const achievement of (allAchievements || [])) {
    if (earnedIds.has(achievement.id)) continue

    let shouldAward = false

    // Task-Achievements
    if (achievement.category === 'tasks' && totalCompleted) {
      shouldAward = totalCompleted >= (achievement.threshold || 0)
    }

    // Perfect Day Achievement
    if (achievement.code === 'perfect_day' && allTasksCompletedToday) {
      shouldAward = true
    }

    // First Task Achievement
    if (achievement.code === 'first_task' && totalCompleted === 1) {
      shouldAward = true
    }

    if (shouldAward) {
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

  // 5. XP aktualisieren
  const newTotalXp = previousXp + xpEarned
  await supabase
    .schema('core')
    .from('user_profile')
    .update({ total_xp: newTotalXp })
    .eq('user_id', userId)

  // 6. Level berechnen
  const newLevel = Math.floor(Math.sqrt(newTotalXp / 100)) + 1
  const levelUp = newLevel > previousLevel

  return {
    xp_earned: xpEarned,
    total_xp: newTotalXp,
    level: newLevel,
    previous_level: previousLevel,
    level_up: levelUp,
    new_achievements: newAchievements,
    all_tasks_completed: allTasksCompletedToday,
  }
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

    const { task_id, action } = validation.data
    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id

    // Timezone-Support
    const timezoneOffset = extractTimezoneOffset(req, validation.data)
    const today = getUserToday(timezoneOffset)

    // Verify task belongs to user and is from today
    const { data: task, error: fetchError } = await supabase
      .schema('core')
      .from('daily_tasks')
      .select('id, date, user_id')
      .eq('id', task_id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !task) {
      return errorResponse('Task not found', 404)
    }

    // Only allow editing today's tasks
    if (task.date !== today) {
      return errorResponse('Can only modify today\'s tasks', 400)
    }

    if (action === 'delete') {
      const { error: deleteError } = await supabase
        .schema('core')
        .from('daily_tasks')
        .delete()
        .eq('id', task_id)
        .eq('user_id', userId)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        return errorResponse(`Failed to delete task: ${deleteError.message}`, 500)
      }

      return successResponse({ success: true, action: 'deleted' })
    }

    if (action === 'complete' || action === 'uncomplete') {
      const completed = action === 'complete'

      const { error: updateError } = await supabase
        .schema('core')
        .from('daily_tasks')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null
        })
        .eq('id', task_id)
        .eq('user_id', userId)

      if (updateError) {
        console.error('Update error:', updateError)
        return errorResponse(`Failed to update task: ${updateError.message}`, 500)
      }

      // Gamification: XP vergeben bei Task-Completion
      let gamification = null
      if (completed) {
        try {
          gamification = await awardXpForTaskCompletion(supabase, userId, today)
        } catch (gamError) {
          console.error('Gamification error (non-critical):', gamError)
          // Gamification-Fehler sind nicht kritisch - Task wurde trotzdem erledigt
        }
      }

      return successResponse({
        success: true,
        action,
        completed,
        gamification // XP, Level, neue Achievements (falls vorhanden)
      })
    }

    return errorResponse('Invalid action', 400)

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
