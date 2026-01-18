// Edge Function: goal-delete
// POST - Löscht ein Ziel und alle zugehörigen Tasks

import { handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { z } from 'https://esm.sh/zod@3'

const RequestSchema = z.object({
  goal_id: z.string().uuid(),
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

    const { goal_id } = validation.data
    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id

    // Verify goal belongs to user
    const { data: goal, error: fetchError } = await supabase
      .schema('core')
      .from('goals')
      .select('id, title, user_id')
      .eq('id', goal_id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !goal) {
      return errorResponse('Ziel nicht gefunden', 404)
    }

    // Delete associated tasks first
    const { error: tasksDeleteError } = await supabase
      .schema('core')
      .from('daily_tasks')
      .delete()
      .eq('goal_id', goal_id)
      .eq('user_id', userId)

    if (tasksDeleteError) {
      console.error('Tasks delete error:', tasksDeleteError)
      // Continue anyway, goal deletion might still work
    }

    // Delete associated AI suggestions
    const { error: suggestionsDeleteError } = await supabase
      .schema('coach')
      .from('ai_suggestions')
      .delete()
      .eq('goal_id', goal_id)
      .eq('user_id', userId)

    if (suggestionsDeleteError) {
      console.error('Suggestions delete error:', suggestionsDeleteError)
      // Continue anyway
    }

    // Delete the goal
    const { error: deleteError } = await supabase
      .schema('core')
      .from('goals')
      .delete()
      .eq('id', goal_id)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Goal delete error:', deleteError)
      return errorResponse(`Fehler beim Löschen: ${deleteError.message}`, 500)
    }

    return successResponse({
      success: true,
      message: 'Ziel erfolgreich gelöscht',
      deleted_goal: goal.title
    })

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
