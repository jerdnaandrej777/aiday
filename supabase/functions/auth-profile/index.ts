// Edge Function: auth-profile
// GET returns the current user's profile (requires JWT)
// POST updates the user's profile

import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'

interface UserProfile {
  user_id: string
  priority_areas: string[]
  motivations: string | null
  time_budget_weekday: number | null
  energy_peak: string | null
  obstacles: string[]
  coaching_style: string | null
  checkin_schedule: Record<string, unknown> | null
  constraints_json: Record<string, unknown> | null
  quiet_hours: Record<string, unknown> | null
  // Neue persönliche Felder
  age: number | null
  job: string | null
  education: string | null
  family_status: string | null
  hobbies: string | null
  strengths: string | null
  challenges: string | null
  motivation: string | null
  created_at: string
  updated_at: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  // Only allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    // Authenticate user
    const authResult = await getAuthUser(req)
    if (authResult.error || !authResult.user) {
      return errorResponse(authResult.error || 'Unauthorized', 401)
    }

    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id

    if (req.method === 'GET') {
      // Fetch user profile from core schema
      const { data: profile, error: profileError } = await supabase
        .schema('core')
        .from('user_profile')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (profileError) {
        console.error('Profile query error:', profileError)
        return errorResponse(`Database error: ${profileError.message}`, 500)
      }

      return jsonResponse({
        user: authResult.user,
        profile: profile as UserProfile | null,
      })
    }

    // POST - Update profile
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 400)
    }

    // Erlaubte Felder für Update
    const allowedFields = [
      'age', 'job', 'education', 'family_status',
      'hobbies', 'strengths', 'challenges', 'motivation',
      'priority_areas', 'motivations', 'time_budget_weekday',
      'energy_peak', 'obstacles', 'coaching_style'
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    // Upsert profile
    const { data: updatedProfile, error: updateError } = await supabase
      .schema('core')
      .from('user_profile')
      .upsert({
        user_id: userId,
        ...updateData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      return errorResponse(`Database error: ${updateError.message}`, 500)
    }

    return successResponse({
      profile: updatedProfile
    })

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
