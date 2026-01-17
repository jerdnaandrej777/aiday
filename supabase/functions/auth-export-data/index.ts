// Edge Function: auth-export-data
// GET exports all user data (GDPR-compliant data portability)

import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'

interface DataExport {
  profile: Record<string, unknown> | null
  day_entries: Record<string, unknown>[]
  goals: Record<string, unknown>[]
  action_steps: Record<string, unknown>[]
  ai_suggestions: Record<string, unknown>[]
  push_tokens: Record<string, unknown>[]
  exported_at: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  // Only allow GET
  if (req.method !== 'GET') {
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

    // Fetch all user data in parallel (with correct schemas)
    const [
      profileResult,
      entriesResult,
      goalsResult,
      stepsResult,
      suggestionsResult,
      tokensResult,
    ] = await Promise.all([
      supabase.schema('core').from('user_profile').select('*').eq('user_id', userId).maybeSingle(),
      supabase.schema('core').from('day_entries').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.schema('core').from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.schema('core').from('action_steps').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.schema('coach').from('ai_suggestions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.schema('notifications').from('push_tokens').select('user_id, device_id, platform, created_at, last_seen_at').eq('user_id', userId),
    ])

    // Check for errors
    const errors: string[] = []
    if (profileResult.error) errors.push(`profile: ${profileResult.error.message}`)
    if (entriesResult.error) errors.push(`day_entries: ${entriesResult.error.message}`)
    if (goalsResult.error) errors.push(`goals: ${goalsResult.error.message}`)
    if (stepsResult.error) errors.push(`action_steps: ${stepsResult.error.message}`)
    if (suggestionsResult.error) errors.push(`ai_suggestions: ${suggestionsResult.error.message}`)
    if (tokensResult.error) errors.push(`push_tokens: ${tokensResult.error.message}`)

    if (errors.length > 0) {
      console.error('Export errors:', errors)
      return errorResponse(`Data export errors: ${errors.join(', ')}`, 500)
    }

    // Build export response
    const exportData: DataExport = {
      profile: profileResult.data,
      day_entries: entriesResult.data || [],
      goals: goalsResult.data || [],
      action_steps: stepsResult.data || [],
      ai_suggestions: suggestionsResult.data || [],
      push_tokens: tokensResult.data || [],
      exported_at: new Date().toISOString(),
    }

    // Add metadata
    const response = {
      user: {
        id: authResult.user.id,
        email: authResult.user.email,
      },
      data: exportData,
      statistics: {
        total_day_entries: exportData.day_entries.length,
        total_goals: exportData.goals.length,
        total_action_steps: exportData.action_steps.length,
        total_ai_suggestions: exportData.ai_suggestions.length,
        total_devices: exportData.push_tokens.length,
      },
    }

    return jsonResponse(response)
  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
