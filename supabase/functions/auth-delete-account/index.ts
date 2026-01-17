// Edge Function: auth-delete-account
// POST deletes the user's account (GDPR-compliant)

import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse, successResponse } from '../_shared/response.ts'
import { getAuthUser, createServiceClient } from '../_shared/supabase.ts'
import { DeleteAccountSchema } from '../_shared/validation.ts'

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

    const validation = DeleteAccountSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse('Confirmation string "DELETE" required', 400)
    }

    const userId = authResult.user.id

    // Use service client for admin operations
    const serviceClient = createServiceClient()

    // Log deletion event before deleting
    await serviceClient
      .schema('audit')
      .from('event_log')
      .insert({
        user_id: userId,
        entity: 'user',
        entity_id: userId,
        action: 'account_deletion_initiated',
        meta_json: { email: authResult.user.email, timestamp: new Date().toISOString() },
      })

    // Delete user data in order (respecting foreign keys)
    // 1. Delete action_steps
    const { error: stepsError } = await serviceClient
      .schema('core')
      .from('action_steps')
      .delete()
      .eq('user_id', userId)

    if (stepsError) {
      console.error('Error deleting action_steps:', stepsError)
    }

    // 2. Delete goals
    const { error: goalsError } = await serviceClient
      .schema('core')
      .from('goals')
      .delete()
      .eq('user_id', userId)

    if (goalsError) {
      console.error('Error deleting goals:', goalsError)
    }

    // 3. Delete day_entries
    const { error: entriesError } = await serviceClient
      .schema('core')
      .from('day_entries')
      .delete()
      .eq('user_id', userId)

    if (entriesError) {
      console.error('Error deleting day_entries:', entriesError)
    }

    // 4. Delete ai_suggestions
    const { error: suggestionsError } = await serviceClient
      .schema('coach')
      .from('ai_suggestions')
      .delete()
      .eq('user_id', userId)

    if (suggestionsError) {
      console.error('Error deleting ai_suggestions:', suggestionsError)
    }

    // 5. Delete push_tokens
    const { error: tokensError } = await serviceClient
      .schema('notifications')
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)

    if (tokensError) {
      console.error('Error deleting push_tokens:', tokensError)
    }

    // 6. Delete user_profile
    const { error: profileError } = await serviceClient
      .schema('core')
      .from('user_profile')
      .delete()
      .eq('user_id', userId)

    if (profileError) {
      console.error('Error deleting user_profile:', profileError)
    }

    // 7. Delete auth user
    const { error: authError } = await serviceClient.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Error deleting auth user:', authError)
      return errorResponse(`Failed to delete auth user: ${authError.message}`, 500)
    }

    // Log successful deletion
    await serviceClient
      .schema('audit')
      .from('event_log')
      .insert({
        user_id: null, // User no longer exists
        entity: 'user',
        entity_id: userId,
        action: 'account_deletion_completed',
        meta_json: { timestamp: new Date().toISOString() },
      })

    return successResponse({ message: 'Account successfully deleted' })
  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
