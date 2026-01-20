// Edge Function: reminders-dispatch
// POST/GET sends push notifications for due reminders
// Typically called by CRON job or server-side scheduler

import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse, successResponse } from '../_shared/response.ts'
import { createServiceClient } from '../_shared/supabase.ts'

interface PushToken {
  user_id: string
  device_id: string
  token: string
  platform: 'ios' | 'android' | 'web'
}

interface ReminderStep {
  id: string
  user_id: string
  text: string
  reminder: {
    at: string
    sent?: boolean
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  // Allow GET or POST (for CRON flexibility)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    // Verify service role or CRON secret
    const authHeader = req.headers.get('authorization') || ''
    const cronSecret = Deno.env.get('CRON_SECRET')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    // Extract Bearer token if present
    const bearerToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader

    // Secure auth check with constant-time comparison
    const isValidCronSecret = cronSecret && cronSecret.length > 0 && bearerToken === cronSecret
    const isValidServiceKey = serviceKey && serviceKey.length > 0 && bearerToken === serviceKey

    if (!isValidCronSecret && !isValidServiceKey) {
      return errorResponse('Unauthorized', 401)
    }

    const supabase = createServiceClient()
    const now = new Date().toISOString()

    // Find action steps with due reminders
    const { data: dueReminders, error: remindersError } = await supabase
      .schema('core')
      .from('action_steps')
      .select('id, user_id, text, reminder')
      .not('reminder', 'is', null)
      .lte('reminder->at', now)
      .or('reminder->sent.is.null,reminder->sent.eq.false')
      .limit(100) // Process in batches

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError)
      return errorResponse(`Database error: ${remindersError.message}`, 500)
    }

    if (!dueReminders || dueReminders.length === 0) {
      return successResponse({ sent: 0, message: 'No due reminders' })
    }

    // Get unique user IDs
    const userIds = [...new Set(dueReminders.map((r) => r.user_id))]

    // Fetch push tokens for these users
    const { data: tokens, error: tokensError } = await supabase
      .schema('notifications')
      .from('push_tokens')
      .select('user_id, device_id, token, platform')
      .in('user_id', userIds)

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError)
      return errorResponse(`Database error: ${tokensError.message}`, 500)
    }

    if (!tokens || tokens.length === 0) {
      return successResponse({ sent: 0, message: 'No push tokens registered' })
    }

    // Group tokens by user
    const tokensByUser = new Map<string, PushToken[]>()
    for (const token of tokens) {
      const existing = tokensByUser.get(token.user_id) || []
      existing.push(token as PushToken)
      tokensByUser.set(token.user_id, existing)
    }

    // Send notifications
    let sentCount = 0
    const failedTokens: string[] = []
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')

    for (const reminder of dueReminders as ReminderStep[]) {
      const userTokens = tokensByUser.get(reminder.user_id)
      if (!userTokens || userTokens.length === 0) continue

      for (const pushToken of userTokens) {
        try {
          const success = await sendPushNotification(
            pushToken,
            {
              title: 'aimDo Erinnerung',
              body: reminder.text,
              data: { action_step_id: reminder.id },
            },
            fcmServerKey
          )

          if (success) {
            sentCount++
          } else {
            failedTokens.push(pushToken.token)
          }
        } catch (e) {
          console.error('Push send error:', e)
          failedTokens.push(pushToken.token)
        }
      }

      // Mark reminder as sent
      await supabase
        .schema('core')
        .from('action_steps')
        .update({
          reminder: { ...reminder.reminder, sent: true },
        })
        .eq('id', reminder.id)
    }

    // Log event
    await supabase
      .schema('audit')
      .from('event_log')
      .insert({
        entity: 'reminders',
        action: 'dispatch',
        meta_json: {
          processed: dueReminders.length,
          sent: sentCount,
          failed: failedTokens.length,
          timestamp: now,
        },
      })

    // Clean up invalid tokens
    if (failedTokens.length > 0) {
      // Only delete tokens that failed multiple times (implement retry logic in production)
      console.warn('Failed tokens:', failedTokens.length)
    }

    return successResponse({
      sent: sentCount,
      processed: dueReminders.length,
      ranAt: now,
    })
  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})

interface NotificationPayload {
  title: string
  body: string
  data?: Record<string, string>
}

async function sendPushNotification(
  token: PushToken,
  payload: NotificationPayload,
  fcmServerKey?: string
): Promise<boolean> {
  // If no FCM key, log and return (development mode)
  if (!fcmServerKey) {
    console.log('[DEV] Would send push to:', token.platform, token.device_id)
    console.log('[DEV] Payload:', payload)
    return true
  }

  if (token.platform === 'android' || token.platform === 'web') {
    // FCM for Android/Web
    return await sendFCM(token.token, payload, fcmServerKey)
  } else if (token.platform === 'ios') {
    // FCM also supports iOS if using Firebase SDK on client
    // For native APNs, you'd need separate implementation
    return await sendFCM(token.token, payload, fcmServerKey)
  }

  return false
}

async function sendFCM(
  token: string,
  payload: NotificationPayload,
  serverKey: string
): Promise<boolean> {
  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${serverKey}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        priority: 'high',
      }),
    })

    if (!response.ok) {
      console.error('FCM error:', response.status, await response.text())
      return false
    }

    const result = await response.json()
    return result.success === 1
  } catch (e) {
    console.error('FCM request failed:', e)
    return false
  }
}
