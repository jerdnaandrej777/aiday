// Edge Function: task-update
// POST - Aktualisiert oder löscht eine tägliche Aufgabe

import { handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { z } from 'https://esm.sh/zod@3'

const RequestSchema = z.object({
  task_id: z.string().uuid(),
  action: z.enum(['complete', 'uncomplete', 'delete']),
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

    const { task_id, action } = validation.data
    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id
    const today = new Date().toISOString().split('T')[0]

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

      return successResponse({ success: true, action, completed })
    }

    return errorResponse('Invalid action', 400)

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
