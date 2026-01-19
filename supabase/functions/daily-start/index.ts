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

    // 1. Prüfe ob Check-in für heute existiert und hole Daten
    const { data: todayCheckin } = await supabase
      .schema('core')
      .from('daily_checkins')
      .select('id, mood, mood_note, energy_level, planned_today')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()

    const checkinDone = !!todayCheckin

    // 2. Prüfe ob Langzeit-Ziele existieren (mit plan_json)
    const { data: longtermGoals, count: goalsCount } = await supabase
      .schema('core')
      .from('goals')
      .select('id, title, target_date, status, created_at, plan_json', { count: 'exact' })
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

    // 2c. Hole auch ursprüngliche AI-Pläne (für nicht-akzeptierte Ziele)
    const { data: setupPlans, error: setupError } = await supabase
      .schema('coach')
      .from('ai_suggestions')
      .select('payload_json, created_at')
      .eq('user_id', userId)
      .eq('kind', 'goals_setup')
      .order('created_at', { ascending: false })

    console.log('Setup plans loaded:', {
      count: setupPlans?.length || 0,
      error: setupError,
      firstPlan: setupPlans?.[0]?.payload_json
    })

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

    // Zuerst: Akzeptierte Pläne (haben Priorität)
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

    // Dann: Ursprüngliche Setup-Pläne (Fallback für nicht-akzeptierte Ziele)
    if (setupPlans) {
      for (const sp of setupPlans) {
        const payload = sp.payload_json as any
        if (payload?.plans && Array.isArray(payload.plans)) {
          // goals_setup speichert mehrere Pläne in einem Array
          for (const plan of payload.plans) {
            if (plan?.goal_id && !plansMap.has(plan.goal_id)) {
              // Struktur: { goal_id, analysis, duration_weeks, milestones, daily_tasks, ... }
              plansMap.set(plan.goal_id, {
                duration_weeks: plan.duration_weeks,
                target_date: plan.target_date,
                milestones: plan.milestones || [],
                daily_tasks: plan.daily_tasks || [],
                weekly_tasks: plan.weekly_tasks || [],
                success_metric: plan.success_metric || '',
                analysis: plan.analysis || '',
                motivation: plan.motivation || ''
              })
            }
          }
        }
      }
    }

    const goalsWithProgress = (longtermGoals || []).map(goal => {
      // Priorität: 1. plan_json am Goal, 2. akzeptierter Plan, 3. setup Plan
      const plan = goal.plan_json || plansMap.get(goal.id) || null
      console.log(`Goal ${goal.id} (${goal.title}): plan source = ${goal.plan_json ? 'plan_json' : plansMap.has(goal.id) ? 'plansMap' : 'none'}`)
      const targetDate = goal.target_date ? new Date(goal.target_date) : (plan?.target_date ? new Date(plan.target_date) : null)
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
        today_checkin: todayCheckin || null,
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
