// Edge Function: task-adjust-ai
// POST - Smart Task Adjustment mit AI
// Wenn User einen Task nicht schafft, splittet AI den Task automatisch

import { handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { getUserToday, extractTimezoneOffset } from '../_shared/utils.ts'
import { getOpenAIClient } from '../_shared/openai.ts'
import { z } from 'https://esm.sh/zod@3'

const RequestSchema = z.object({
  task_id: z.string().uuid(),
  blocker: z.string().min(1).max(500), // Warum schafft der User den Task nicht?
  action: z.enum(['split', 'simplify', 'reschedule']).default('split'),
  timezone_offset: z.number().optional(),
})

const TASK_ADJUST_SYSTEM_PROMPT = `Du bist ein einfühlsamer Produktivitäts-Coach.
Der Nutzer hat eine Aufgabe nicht geschafft und braucht Hilfe.

Deine Aufgabe basierend auf dem Blocker:
1. SPLIT: Teile die Aufgabe in 2-3 kleinere, machbare Schritte
2. SIMPLIFY: Vereinfache die Aufgabe zu einer minimalen Version
3. RESCHEDULE: Schlage einen besseren Zeitpunkt vor

Regeln:
- Sei verständnisvoll, nicht kritisch
- Mache konkrete, umsetzbare Vorschläge
- Jeder neue Task sollte max 15 Minuten dauern
- Behalte das ursprüngliche Ziel im Blick

Antworte IMMER im JSON-Format:
{
  "empathy_message": "Kurze verständnisvolle Nachricht",
  "new_tasks": [
    {
      "task_text": "Konkreter Task-Text",
      "estimated_minutes": 10,
      "best_time": "morgens|mittags|abends",
      "tip": "Hilfreicher Tipp"
    }
  ],
  "original_task_action": "delete|keep|archive"
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

    const { task_id, blocker, action } = validation.data
    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id
    const timezoneOffset = extractTimezoneOffset(req, validation.data)
    const today = getUserToday(timezoneOffset)

    // Hole den Original-Task
    const { data: task, error: taskError } = await supabase
      .schema('core')
      .from('daily_tasks')
      .select('*, goals:goal_id(title)')
      .eq('id', task_id)
      .eq('user_id', userId)
      .single()

    if (taskError || !task) {
      return errorResponse('Task not found', 404)
    }

    // AI-Analyse
    const openai = getOpenAIClient()
    const userPrompt = `Aufgabe: "${task.task_text}"
Geschätzte Dauer: ${task.estimated_minutes || 15} Minuten
Zugehöriges Ziel: ${task.goals?.title || 'Kein Ziel'}
Blocker/Problem: "${blocker}"
Gewünschte Aktion: ${action}

Hilf dem Nutzer, diese Aufgabe trotzdem zu schaffen.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: TASK_ADJUST_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    })

    const aiResponseText = completion.choices[0]?.message?.content || '{}'
    let aiResponse
    try {
      aiResponse = JSON.parse(aiResponseText)
    } catch {
      return errorResponse('AI response parsing failed', 500)
    }

    // Neue Tasks erstellen
    const createdTasks = []
    if (aiResponse.new_tasks && Array.isArray(aiResponse.new_tasks)) {
      let taskOrder = (task.task_order || 0) + 1

      for (const newTask of aiResponse.new_tasks) {
        const { data: createdTask, error: createError } = await supabase
          .schema('core')
          .from('daily_tasks')
          .insert({
            user_id: userId,
            goal_id: task.goal_id,
            date: today,
            task_text: newTask.task_text,
            task_order: taskOrder++,
            estimated_minutes: newTask.estimated_minutes || 15,
            ai_generated: true,
          })
          .select()
          .single()

        if (!createError && createdTask) {
          createdTasks.push({
            ...createdTask,
            best_time: newTask.best_time,
            tip: newTask.tip,
          })
        }
      }
    }

    // Original-Task behandeln
    if (aiResponse.original_task_action === 'delete') {
      await supabase
        .schema('core')
        .from('daily_tasks')
        .delete()
        .eq('id', task_id)
        .eq('user_id', userId)
    } else if (aiResponse.original_task_action === 'archive') {
      await supabase
        .schema('core')
        .from('daily_tasks')
        .update({ skipped: true, skip_reason: blocker })
        .eq('id', task_id)
        .eq('user_id', userId)
    }

    return successResponse({
      success: true,
      empathy_message: aiResponse.empathy_message,
      new_tasks: createdTasks,
      original_task_action: aiResponse.original_task_action,
      tokens_used: completion.usage?.total_tokens || 0,
    })

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
