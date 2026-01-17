// Edge Function: analytics-monthly
// GET returns monthly statistics for the authenticated user

import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { MonthSchema } from '../_shared/validation.ts'

interface MonthlyStats {
  month: string
  total_goals: number
  achieved: number
  not_achieved: number
  success_rate: number
  streak_days: number
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

    // Get month parameter
    const url = new URL(req.url)
    const month = url.searchParams.get('month')

    // Validate month format
    const monthValidation = MonthSchema.safeParse(month)
    if (!monthValidation.success) {
      return errorResponse('month parameter required in YYYY-MM format', 400)
    }

    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)

    // Query month_rollup materialized view from analytics schema
    const { data: statsData, error: statsError } = await supabase
      .schema('analytics')
      .from('month_rollup')
      .select('*')
      .eq('user_id', authResult.user.id)
      .eq('month', month)
      .maybeSingle()

    if (statsError) {
      console.error('Stats query error:', statsError)
      return errorResponse(`Database error: ${statsError.message}`, 500)
    }

    // Calculate streak (consecutive days with at least one achieved goal)
    const streakDays = await calculateStreak(supabase, authResult.user.id)

    // Build response
    const stats: MonthlyStats = {
      month: month!,
      total_goals: statsData?.total_goals ?? 0,
      achieved: statsData?.achieved ?? 0,
      not_achieved: statsData?.not_achieved ?? 0,
      success_rate: statsData?.success_rate ?? 0,
      streak_days: streakDays,
    }

    return jsonResponse(stats)
  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})

async function calculateStreak(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string
): Promise<number> {
  // Get recent day entries with at least one achieved goal from core schema
  const { data, error } = await supabase
    .schema('core')
    .from('day_entries')
    .select(`
      date,
      goals!inner(status)
    `)
    .eq('user_id', userId)
    .eq('goals.status', 'achieved')
    .order('date', { ascending: false })
    .limit(90) // Check last 90 days

  if (error || !data) {
    return 0
  }

  // Get unique dates with achieved goals
  const datesWithAchieved = [...new Set(data.map((d) => d.date))].sort().reverse()

  if (datesWithAchieved.length === 0) {
    return 0
  }

  // Calculate streak from today backwards
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < datesWithAchieved.length; i++) {
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() - i)
    const targetDateStr = targetDate.toISOString().split('T')[0]

    if (datesWithAchieved.includes(targetDateStr)) {
      streak++
    } else {
      break
    }
  }

  return streak
}
