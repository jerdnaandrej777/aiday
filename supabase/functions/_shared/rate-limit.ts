// Rate Limiting Helper für Supabase Edge Functions
// Max 10 AI-Calls pro Stunde pro User (konfigurierbar)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RateLimitConfig {
  maxRequests: number;      // Max Anfragen im Zeitraum
  windowSeconds: number;    // Zeitfenster in Sekunden
  identifier: string;       // z.B. user_id oder IP
  endpoint: string;         // z.B. 'goals-setup', 'goal-clarify'
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  error?: string;
}

// Rate Limit Check - verwendet In-Memory Tracking mit Supabase als Fallback
export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { maxRequests, windowSeconds, identifier, endpoint } = config;

  const windowStart = new Date(Date.now() - windowSeconds * 1000);
  const now = new Date();
  const resetAt = new Date(Date.now() + windowSeconds * 1000);

  try {
    // Zähle Anfragen im Zeitfenster aus audit.event_log
    const { count, error: countError } = await supabase
      .schema('audit')
      .from('event_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', identifier)
      .eq('endpoint', endpoint)
      .gte('created_at', windowStart.toISOString());

    if (countError) {
      console.error('Rate limit count error:', countError);
      // Bei Datenbankfehler: Erlauben, aber loggen
      return { allowed: true, remaining: maxRequests, resetAt };
    }

    const requestCount = count || 0;
    const remaining = Math.max(0, maxRequests - requestCount - 1);
    const allowed = requestCount < maxRequests;

    return {
      allowed,
      remaining,
      resetAt,
      error: allowed ? undefined : `Rate Limit erreicht. Bitte warte ${Math.ceil(windowSeconds / 60)} Minuten.`
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Bei Fehler: Erlauben
    return { allowed: true, remaining: maxRequests, resetAt };
  }
}

// Logge API-Aufruf für Rate-Limit-Tracking
export async function logApiCall(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  endpoint: string,
  success: boolean = true,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabase
      .schema('audit')
      .from('event_log')
      .insert({
        user_id: userId,
        endpoint: endpoint,
        kind: success ? 'api_call' : 'api_error',
        payload_json: metadata
      });
  } catch (error) {
    console.error('Failed to log API call:', error);
  }
}

// Standard-Konfiguration für AI-Calls
export const AI_RATE_LIMITS = {
  // Strikt: AI-Plan-Generierung
  'goals-setup': { maxRequests: 10, windowSeconds: 3600 },  // 10 pro Stunde
  'goal-clarify': { maxRequests: 20, windowSeconds: 3600 }, // 20 pro Stunde
  'goal-regenerate-plan': { maxRequests: 10, windowSeconds: 3600 },
  'daily-review': { maxRequests: 20, windowSeconds: 3600 },

  // Großzügiger: Standard-API-Calls
  'task-update': { maxRequests: 200, windowSeconds: 3600 },
  'daily-checkin': { maxRequests: 50, windowSeconds: 3600 },
  'daily-start': { maxRequests: 100, windowSeconds: 3600 }
};

// Helper: Erstelle Rate-Limit-Config für Endpoint
export function getRateLimitConfig(endpoint: string, userId: string): RateLimitConfig {
  const limits = AI_RATE_LIMITS[endpoint as keyof typeof AI_RATE_LIMITS] ||
    { maxRequests: 100, windowSeconds: 3600 };

  return {
    ...limits,
    identifier: userId,
    endpoint
  };
}

// Helper: Formatierte Fehlermeldung
export function rateLimitErrorResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: result.error || 'Zu viele Anfragen. Bitte versuche es später erneut.',
      retryAfter,
      remaining: result.remaining
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetAt.toISOString()
      }
    }
  );
}
