// Edge Function: auth-onboarding
// POST updates the user's profile after registration (onboarding flow)

import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { OnboardingRequestSchema } from '../_shared/validation.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  // Only allow POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    // Authenticate user
    const authResult = await getAuthUser(req)
    if (authResult.error || !authResult.user) {
      return errorResponse(authResult.error || 'Unauthorized', 401)
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 400)
    }

    const validation = OnboardingRequestSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse(`Validation error: ${validation.error.message}`, 400)
    }

    const {
      priority_areas,
      motivations,
      time_budget_weekday,
      energy_peak,
      obstacles,
      coaching_style,
      checkin_schedule,
      quiet_hours,
    } = validation.data

    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)

    // Upsert user profile in core schema (insert if not exists, update if exists)
    const { data: profile, error: updateError } = await supabase
      .schema('core')
      .from('user_profile')
      .upsert({
        user_id: authResult.user.id,
        priority_areas: priority_areas || [],
        motivations: motivations || null,
        time_budget_weekday: time_budget_weekday || null,
        energy_peak: energy_peak || null,
        obstacles: obstacles || [],
        coaching_style: coaching_style || null,
        checkin_schedule: checkin_schedule || null,
        quiet_hours: quiet_hours || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      return errorResponse(`Database error: ${updateError.message}`, 500)
    }

    return successResponse({ profile })
  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
