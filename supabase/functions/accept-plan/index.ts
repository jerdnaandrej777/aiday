// Edge Function: accept-plan
// POST - Akzeptiert einen AI-Plan und erstellt die täglichen Tasks

import { handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { z } from 'https://esm.sh/zod@3'

const RequestSchema = z.object({
  goal_id: z.string().uuid(),
  plan: z.object({
    duration_weeks: z.number(),
    target_date: z.string(),
    milestones: z.array(z.object({
      week: z.number(),
      target: z.string(),
      metric: z.string().optional()
    })),
    daily_tasks: z.array(z.object({
      task: z.string(),
      duration_minutes: z.number(),
      frequency: z.string(),
      best_time: z.string().optional(), // morgens, mittags, abends, flexibel
      steps: z.array(z.string()).optional(), // Schritt-für-Schritt Anleitung
      why: z.string().optional() // Warum diese Aufgabe wichtig ist
    })),
    weekly_tasks: z.array(z.string()).optional(),
    success_metric: z.string().optional(),
    analysis: z.string().optional(),
    motivation: z.string().optional()
  })
})

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

    const { goal_id, plan } = validation.data
    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id
    const today = new Date().toISOString().split('T')[0]

    // Debug logging
    console.log('accept-plan called:', {
      goal_id,
      today,
      daily_tasks_count: plan.daily_tasks?.length || 0,
      daily_tasks: plan.daily_tasks
    })

    // 1. Aktualisiere das Goal mit Zieldatum und Meilensteinen
    const { error: goalError } = await supabase
      .schema('core')
      .from('goals')
      .update({
        target_date: plan.target_date,
        status: 'in_progress'
      })
      .eq('id', goal_id)
      .eq('user_id', userId)

    if (goalError) {
      console.error('Goal update error:', goalError)
    }

    // 2. Lösche alte Tasks für dieses Ziel (falls vorhanden)
    await supabase
      .schema('core')
      .from('daily_tasks')
      .delete()
      .eq('goal_id', goal_id)
      .eq('user_id', userId)
      .eq('date', today)

    // 3. Hole Goal-Titel für Fallback-Task
    const { data: goalData } = await supabase
      .schema('core')
      .from('goals')
      .select('title')
      .eq('id', goal_id)
      .single()

    const goalTitle = goalData?.title || 'Dein Ziel'

    // 4. Erstelle neue Daily Tasks für heute
    // Akzeptiere alle Frequenzen
    let dailyTasksToInsert = (plan.daily_tasks || [])
      .filter(t => t && t.task) // Nur gültige Tasks
      .map((t, idx) => ({
        user_id: userId,
        goal_id: goal_id,
        date: today,
        task_text: t.task,
        task_order: idx,
        ai_generated: true,
        estimated_minutes: t.duration_minutes || 15,
        task_details: {
          steps: t.steps || [],
          why: t.why || '',
          best_time: t.best_time || 'flexibel',
          frequency: t.frequency || 'daily'
        }
      }))

    // Fallback: Wenn keine Tasks im Plan, erstelle eine Standard-Task
    if (dailyTasksToInsert.length === 0) {
      console.log('No tasks in plan, creating fallback task for goal:', goalTitle)
      dailyTasksToInsert = [{
        user_id: userId,
        goal_id: goal_id,
        date: today,
        task_text: `Arbeite 30 Minuten an: ${goalTitle}`,
        task_order: 0,
        ai_generated: true,
        estimated_minutes: 30,
        task_details: {
          steps: [],
          why: '',
          best_time: 'flexibel',
          frequency: 'daily'
        }
      }]
    }

    console.log('Tasks to insert:', dailyTasksToInsert.length, dailyTasksToInsert)

    const { data: insertedTasks, error: tasksError } = await supabase
      .schema('core')
      .from('daily_tasks')
      .insert(dailyTasksToInsert)
      .select()

    if (tasksError) {
      console.error('Tasks insert error:', tasksError)
      return errorResponse(`Failed to create tasks: ${tasksError.message}`, 500)
    }
    console.log('Tasks inserted successfully:', insertedTasks?.length || 0, insertedTasks)

    // 4. Speichere die Meilensteine (als JSON im Goal oder in separater Tabelle)
    // Für jetzt speichern wir es in ai_suggestions
    await supabase
      .schema('coach')
      .from('ai_suggestions')
      .insert({
        user_id: userId,
        kind: 'plan_accepted',
        payload_json: {
          goal_id,
          plan,
          accepted_at: new Date().toISOString()
        },
        model: 'user_action',
        tokens_in: 0,
        tokens_out: 0
      })

    return successResponse({
      success: true,
      tasks_created: dailyTasksToInsert.length,
      target_date: plan.target_date,
      milestones: plan.milestones
    })

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
