// Edge Function: daily-start
// GET/POST - Gibt den aktuellen Status im täglichen Flow zurück

import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { getUserToday, getUserYesterday, extractTimezoneOffset } from '../_shared/utils.ts'

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

    // Parse body for timezone_offset (POST) or use query params (GET)
    let body: any = null
    if (req.method === 'POST') {
      try {
        body = await req.json()
      } catch {
        // Body ist optional für daily-start
      }
    }

    const timezoneOffset = extractTimezoneOffset(req, body)
    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id
    const today = getUserToday(timezoneOffset)
    const yesterday = getUserYesterday(timezoneOffset)

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

    // 4. Hole heutige Tasks (inkl. task_details für Detail-Ansicht)
    let { data: todayTasks, error: tasksError } = await supabase
      .schema('core')
      .from('daily_tasks')
      .select('id, task_text, completed, goal_id, task_order, estimated_minutes, task_details')
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

    // 4b. AUTO-GENERATE: Erstelle automatisch Tasks für aktive Ziele, falls noch keine für heute existieren
    const activeGoals = (longtermGoals || []).filter(g => g.status === 'in_progress' && g.plan_json)
    const goalsWithTasksToday = new Set((todayTasks || []).map(t => t.goal_id))

    for (const goal of activeGoals) {
      // Überspringe, wenn dieses Ziel bereits Tasks für heute hat
      if (goalsWithTasksToday.has(goal.id)) {
        console.log(`Goal ${goal.id} already has tasks for today, skipping auto-generation`)
        continue
      }

      const plan = goal.plan_json as any
      const dailyTasks = plan?.daily_tasks || []

      if (dailyTasks.length === 0) {
        console.log(`Goal ${goal.id} has no daily_tasks in plan, skipping`)
        continue
      }

      console.log(`Auto-generating ${dailyTasks.length} tasks for goal ${goal.id} (${goal.title})`)

      // Erstelle Tasks aus dem Plan (inkl. task_details für Detail-Ansicht)
      const tasksToInsert = dailyTasks.map((t: any, idx: number) => ({
        user_id: userId,
        goal_id: goal.id,
        date: today,
        task_text: t.task || t.task_text || `Aufgabe ${idx + 1}`,
        task_order: idx,
        ai_generated: true,
        estimated_minutes: t.duration_minutes || t.estimated_minutes || 15,
        task_details: {
          steps: t.steps || [],
          why: t.why || '',
          best_time: t.best_time || 'flexibel',
          frequency: t.frequency || 'daily'
        }
      }))

      const { data: newTasks, error: insertError } = await supabase
        .schema('core')
        .from('daily_tasks')
        .insert(tasksToInsert)
        .select()

      if (insertError) {
        console.error(`Failed to auto-generate tasks for goal ${goal.id}:`, insertError)
      } else {
        console.log(`Successfully auto-generated ${newTasks?.length || 0} tasks for goal ${goal.id}`)
        // Füge die neuen Tasks zur Liste hinzu
        if (newTasks) {
          todayTasks = [...(todayTasks || []), ...newTasks]
        }
      }
    }

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
