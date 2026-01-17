// Edge Function: daily-start
// GET/POST - Gibt den aktuellen Status im täglichen Flow zurück

import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const authResult = await getAuthUser(req)
    if (authResult.error || !authResult.user) {
      return errorResponse(authResult.error || 'Unauthorized', 401)
    }

    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // 1. Prüfe ob Check-in für heute existiert
    const { data: todayCheckin } = await supabase
      .schema('core')
      .from('daily_checkins')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()

    const checkinDone = !!todayCheckin

    // 2. Prüfe ob Langzeit-Ziele existieren (mindestens 1)
    const { data: longtermGoals, count: goalsCount } = await supabase
      .schema('core')
      .from('goals')
      .select('id, title, target_date, status, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_longterm', true)

    // 2b. Hole akzeptierte Pläne mit Meilensteinen
    const { data: acceptedPlans } = await supabase
      .schema('coach')
      .from('ai_suggestions')
      .select('payload_json')
      .eq('user_id', userId)
      .eq('kind', 'plan_accepted')
      .order('created_at', { ascending: false })

    const hasGoals = (goalsCount || 0) >= 1

    // 3. Prüfe ob Tasks vom Vortag unbewertet sind (Review nötig)
    const { data: yesterdayTasks } = await supabase
      .schema('core')
      .from('daily_tasks')
      .select('id, task_text, completed, goal_id')
      .eq('user_id', userId)
      .eq('date', yesterday)
      .eq('completed', false)
      .eq('skipped', false)

    const pendingReview = yesterdayTasks || []

    // 4. Hole heutige Tasks
    const { data: todayTasks, error: tasksError } = await supabase
      .schema('core')
      .from('daily_tasks')
      .select('id, task_text, completed, goal_id, task_order')
      .eq('user_id', userId)
      .eq('date', today)
      .order('task_order', { ascending: true })

    // Debug logging
    console.log('daily-start debug:', {
      userId,
      today,
      todayTasksCount: todayTasks?.length || 0,
      todayTasks,
      tasksError
    })

    // 5. Berechne Streak (aufeinanderfolgende Tage mit Check-ins)
    let streak = 0
    const { data: recentCheckins } = await supabase
      .schema('core')
      .from('daily_checkins')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30)

    if (recentCheckins && recentCheckins.length > 0) {
      const checkDate = new Date(today)
      for (const checkin of recentCheckins) {
        const checkinDate = checkin.date
        const expectedDate = checkDate.toISOString().split('T')[0]
        if (checkinDate === expectedDate) {
          streak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }
    }

    // 6. Kombiniere Goals mit ihren Plänen
    const plansMap = new Map<string, any>()
    if (acceptedPlans) {
      for (const ap of acceptedPlans) {
        const payload = ap.payload_json as any
        if (payload?.goal_id && payload?.plan) {
          // Nur den neuesten Plan pro Goal speichern
          if (!plansMap.has(payload.goal_id)) {
            plansMap.set(payload.goal_id, payload.plan)
          }
        }
      }
    }

    const goalsWithProgress = (longtermGoals || []).map(goal => {
      const plan = plansMap.get(goal.id)
      const targetDate = goal.target_date ? new Date(goal.target_date) : null
      const createdDate = new Date(goal.created_at)
      const todayDate = new Date(today)

      let daysLeft = null
      let daysTotal = null
      let progressPercent = 0

      if (targetDate) {
        daysLeft = Math.max(0, Math.ceil((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)))
        daysTotal = Math.ceil((targetDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        progressPercent = daysTotal > 0 ? Math.min(100, Math.round(((daysTotal - daysLeft) / daysTotal) * 100)) : 0
      }

      return {
        ...goal,
        plan: plan || null,
        days_left: daysLeft,
        days_total: daysTotal,
        progress_percent: progressPercent
      }
    })

    // Bestimme den nächsten Schritt
    let step: 'review' | 'checkin' | 'goals' | 'dashboard'

    if (pendingReview.length > 0) {
      step = 'review'
    } else if (!checkinDone) {
      step = 'checkin'
    } else if (!hasGoals) {
      step = 'goals'
    } else {
      step = 'dashboard'
    }

    return successResponse({
      step,
      data: {
        checkin_done: checkinDone,
        goals_count: goalsCount || 0,
        has_goals: hasGoals,
        pending_review: pendingReview,
        today_tasks: todayTasks || [],
        longterm_goals: goalsWithProgress,
        streak
      }
    })

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
