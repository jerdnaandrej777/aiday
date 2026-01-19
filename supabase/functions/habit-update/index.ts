// Edge Function: habit-update
// POST - CRUD für Habits und Habit-Completions

import { handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { getUserToday, extractTimezoneOffset } from '../_shared/utils.ts'
import { z } from 'https://esm.sh/zod@3'

// Schemas für verschiedene Actions
const CreateHabitSchema = z.object({
  action: z.literal('create'),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional().default('✨'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#6366f1'),
  frequency: z.enum(['daily', 'weekdays', '3x_week', 'weekly']).optional().default('daily'),
  target_days: z.array(z.number().min(0).max(6)).optional(),
  reminder_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone_offset: z.number().optional(),
})

const UpdateHabitSchema = z.object({
  action: z.literal('update'),
  habit_id: z.string().uuid(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  frequency: z.enum(['daily', 'weekdays', '3x_week', 'weekly']).optional(),
  target_days: z.array(z.number().min(0).max(6)).optional(),
  reminder_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  is_active: z.boolean().optional(),
  timezone_offset: z.number().optional(),
})

const DeleteHabitSchema = z.object({
  action: z.literal('delete'),
  habit_id: z.string().uuid(),
  timezone_offset: z.number().optional(),
})

const CompleteHabitSchema = z.object({
  action: z.literal('complete'),
  habit_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // Optional: defaults to today
  note: z.string().max(500).optional(),
  timezone_offset: z.number().optional(),
})

const UncompleteHabitSchema = z.object({
  action: z.literal('uncomplete'),
  habit_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timezone_offset: z.number().optional(),
})

const GetHabitsSchema = z.object({
  action: z.literal('get'),
  include_logs: z.boolean().optional().default(false),
  days_back: z.number().min(1).max(90).optional().default(30),
  timezone_offset: z.number().optional(),
})

const RequestSchema = z.union([
  CreateHabitSchema,
  UpdateHabitSchema,
  DeleteHabitSchema,
  CompleteHabitSchema,
  UncompleteHabitSchema,
  GetHabitsSchema,
])

// XP für Habit-Completion
const XP_HABIT_COMPLETE = 5

// Gamification: XP vergeben und Achievements prüfen
async function awardXpForHabitCompletion(supabase: any, userId: string, habitId: string) {
  // Hole Habit-Details
  const { data: habit } = await supabase
    .schema('core')
    .from('habits')
    .select('current_streak, best_streak, xp_reward')
    .eq('id', habitId)
    .single()

  const xpReward = habit?.xp_reward || XP_HABIT_COMPLETE

  // Aktuelles Profil laden
  const { data: profile } = await supabase
    .schema('core')
    .from('user_profile')
    .select('total_xp, level')
    .eq('user_id', userId)
    .single()

  const previousXp = profile?.total_xp || 0
  const previousLevel = profile?.level || 1

  // XP aktualisieren
  let totalXpEarned = xpReward

  // Achievements prüfen
  const newAchievements: Array<{code: string; name: string; icon: string; xp_reward: number}> = []

  // Alle Achievements laden
  const { data: allAchievements } = await supabase
    .schema('core')
    .from('achievements')
    .select('*')
    .eq('category', 'habits')

  // Bereits verdiente Achievements laden
  const { data: earnedAchievements } = await supabase
    .schema('core')
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)

  const earnedIds = new Set((earnedAchievements || []).map((ea: any) => ea.achievement_id))

  // Zähle aktive Habits
  const { count: activeHabitsCount } = await supabase
    .schema('core')
    .from('habits')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('is_active', true)

  for (const achievement of (allAchievements || [])) {
    if (earnedIds.has(achievement.id)) continue

    let shouldAward = false

    // Habit-spezifische Achievements
    if (achievement.code === 'habit_created' && activeHabitsCount >= 1) {
      shouldAward = true
    }
    if (achievement.code === 'habits_5' && activeHabitsCount >= 5) {
      shouldAward = true
    }
    if (achievement.code === 'habit_streak_7' && habit?.current_streak >= 7) {
      shouldAward = true
    }
    if (achievement.code === 'habit_streak_30' && habit?.current_streak >= 30) {
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
        totalXpEarned += achievement.xp_reward || 0
      }
    }
  }

  // XP aktualisieren
  const newTotalXp = previousXp + totalXpEarned
  await supabase
    .schema('core')
    .from('user_profile')
    .update({ total_xp: newTotalXp })
    .eq('user_id', userId)

  // Level berechnen
  const newLevel = Math.floor(Math.sqrt(newTotalXp / 100)) + 1
  const levelUp = newLevel > previousLevel

  return {
    xp_earned: totalXpEarned,
    total_xp: newTotalXp,
    level: newLevel,
    previous_level: previousLevel,
    level_up: levelUp,
    new_achievements: newAchievements,
    current_streak: habit?.current_streak || 0,
    best_streak: habit?.best_streak || 0,
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

    const data = validation.data
    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id
    const timezoneOffset = extractTimezoneOffset(req, data)
    const today = getUserToday(timezoneOffset)

    // === GET: Liste alle Habits ===
    if (data.action === 'get') {
      const { include_logs, days_back } = data

      // Hole Habits
      const { data: habits, error: habitsError } = await supabase
        .schema('core')
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (habitsError) {
        return errorResponse(`Failed to fetch habits: ${habitsError.message}`, 500)
      }

      // Optional: Hole Logs der letzten X Tage
      let logs: any[] = []
      if (include_logs && habits && habits.length > 0) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days_back)
        const startDateStr = startDate.toISOString().split('T')[0]

        const { data: logsData } = await supabase
          .schema('core')
          .from('habit_logs')
          .select('*')
          .eq('user_id', userId)
          .gte('date', startDateStr)
          .order('date', { ascending: false })

        logs = logsData || []
      }

      return successResponse({
        habits: habits || [],
        logs,
        today,
      })
    }

    // === CREATE: Neuen Habit erstellen ===
    if (data.action === 'create') {
      const { title, description, icon, color, frequency, target_days, reminder_time } = data

      // Target Days basierend auf Frequenz
      let finalTargetDays = target_days
      if (!finalTargetDays) {
        switch (frequency) {
          case 'daily':
            finalTargetDays = [0, 1, 2, 3, 4, 5, 6]
            break
          case 'weekdays':
            finalTargetDays = [1, 2, 3, 4, 5]
            break
          case '3x_week':
            finalTargetDays = [1, 3, 5] // Mo, Mi, Fr
            break
          case 'weekly':
            finalTargetDays = [1] // Montag
            break
        }
      }

      const { data: newHabit, error: createError } = await supabase
        .schema('core')
        .from('habits')
        .insert({
          user_id: userId,
          title,
          description,
          icon,
          color,
          frequency,
          target_days: finalTargetDays,
          reminder_time,
        })
        .select()
        .single()

      if (createError) {
        if (createError.message.includes('Maximum of 20 habits')) {
          return errorResponse('Maximum von 20 Habits erreicht', 400)
        }
        return errorResponse(`Failed to create habit: ${createError.message}`, 500)
      }

      // Achievement prüfen (habit_created)
      let gamification = null
      try {
        gamification = await awardXpForHabitCompletion(supabase, userId, newHabit.id)
      } catch (e) {
        console.error('Gamification error (non-critical):', e)
      }

      return successResponse({
        success: true,
        action: 'created',
        habit: newHabit,
        gamification,
      })
    }

    // === UPDATE: Habit aktualisieren ===
    if (data.action === 'update') {
      const { habit_id, ...updates } = data
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { action, timezone_offset, ...updateData } = updates

      const { data: updatedHabit, error: updateError } = await supabase
        .schema('core')
        .from('habits')
        .update(updateData)
        .eq('id', habit_id)
        .eq('user_id', userId)
        .select()
        .single()

      if (updateError) {
        return errorResponse(`Failed to update habit: ${updateError.message}`, 500)
      }

      return successResponse({
        success: true,
        action: 'updated',
        habit: updatedHabit,
      })
    }

    // === DELETE: Habit löschen ===
    if (data.action === 'delete') {
      const { habit_id } = data

      const { error: deleteError } = await supabase
        .schema('core')
        .from('habits')
        .delete()
        .eq('id', habit_id)
        .eq('user_id', userId)

      if (deleteError) {
        return errorResponse(`Failed to delete habit: ${deleteError.message}`, 500)
      }

      return successResponse({
        success: true,
        action: 'deleted',
      })
    }

    // === COMPLETE: Habit für Tag abhaken ===
    if (data.action === 'complete') {
      const { habit_id, note } = data
      const targetDate = data.date || today

      // Prüfe ob Habit existiert und dem User gehört
      const { data: habit, error: habitError } = await supabase
        .schema('core')
        .from('habits')
        .select('id')
        .eq('id', habit_id)
        .eq('user_id', userId)
        .single()

      if (habitError || !habit) {
        return errorResponse('Habit not found', 404)
      }

      // Erstelle oder aktualisiere Log
      const { data: log, error: logError } = await supabase
        .schema('core')
        .from('habit_logs')
        .upsert({
          habit_id,
          user_id: userId,
          date: targetDate,
          completed: true,
          completed_at: new Date().toISOString(),
          note,
        }, {
          onConflict: 'habit_id,date',
        })
        .select()
        .single()

      if (logError) {
        return errorResponse(`Failed to complete habit: ${logError.message}`, 500)
      }

      // Gamification
      let gamification = null
      try {
        gamification = await awardXpForHabitCompletion(supabase, userId, habit_id)
      } catch (e) {
        console.error('Gamification error (non-critical):', e)
      }

      return successResponse({
        success: true,
        action: 'completed',
        log,
        gamification,
      })
    }

    // === UNCOMPLETE: Habit-Completion rückgängig machen ===
    if (data.action === 'uncomplete') {
      const { habit_id } = data
      const targetDate = data.date || today

      const { error: updateError } = await supabase
        .schema('core')
        .from('habit_logs')
        .update({
          completed: false,
          completed_at: null,
        })
        .eq('habit_id', habit_id)
        .eq('user_id', userId)
        .eq('date', targetDate)

      if (updateError) {
        return errorResponse(`Failed to uncomplete habit: ${updateError.message}`, 500)
      }

      return successResponse({
        success: true,
        action: 'uncompleted',
      })
    }

    return errorResponse('Invalid action', 400)

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
