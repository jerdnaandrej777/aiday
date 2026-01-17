// Edge Function: daily-checkin
// POST - Speichert den täglichen Check-in

import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { DailyCheckinRequestSchema } from '../_shared/validation.ts'

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

    const validation = DailyCheckinRequestSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse(`Validation error: ${validation.error.message}`, 400)
    }

    const { mood, mood_note, done_today, planned_today, energy_level } = validation.data

    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id
    const today = new Date().toISOString().split('T')[0]

    // Upsert Check-in (ein Eintrag pro Tag)
    const { data: checkin, error: checkinError } = await supabase
      .schema('core')
      .from('daily_checkins')
      .upsert({
        user_id: userId,
        date: today,
        mood,
        mood_note,
        done_today,
        planned_today,
        energy_level
      }, { onConflict: 'user_id,date' })
      .select()
      .single()

    if (checkinError) {
      console.error('Checkin error:', checkinError)
      return errorResponse(`Database error: ${checkinError.message}`, 500)
    }

    return successResponse({
      success: true,
      checkin
    })

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
