// Shared Response Helpers for Edge Functions

import { corsHeaders } from './cors.ts'

export function jsonResponse<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
    },
  })
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status)
}

export function successResponse<T>(data: T): Response {
  return jsonResponse({ success: true, ...data })
}
