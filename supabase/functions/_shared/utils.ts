// Shared Utility Functions for Edge Functions

/**
 * Gibt das heutige Datum in der User-Timezone zurück
 * @param timezoneOffset - Offset in Minuten (wie von JavaScript's Date.getTimezoneOffset())
 *                         Positiv = hinter UTC, Negativ = vor UTC
 *                         z.B. Berlin (UTC+1) = -60, New York (UTC-5) = +300
 * @returns Datum im Format 'YYYY-MM-DD'
 */
export function getUserToday(timezoneOffset?: number): string {
  const now = new Date()

  if (timezoneOffset !== undefined && timezoneOffset !== null) {
    // getTimezoneOffset() gibt die Differenz in Minuten von lokaler Zeit zu UTC zurück
    // Wir müssen das Offset subtrahieren (nicht addieren), da es invertiert ist
    // z.B. UTC+1 hat getTimezoneOffset() = -60
    // Um die lokale Zeit des Users zu bekommen: UTC - offset
    const userTime = new Date(now.getTime() - (timezoneOffset * 60 * 1000))
    return userTime.toISOString().split('T')[0]
  }

  // Fallback: UTC verwenden
  return now.toISOString().split('T')[0]
}

/**
 * Gibt das gestrige Datum in der User-Timezone zurück
 * @param timezoneOffset - Offset in Minuten
 * @returns Datum im Format 'YYYY-MM-DD'
 */
export function getUserYesterday(timezoneOffset?: number): string {
  const now = new Date()

  if (timezoneOffset !== undefined && timezoneOffset !== null) {
    const userTime = new Date(now.getTime() - (timezoneOffset * 60 * 1000))
    userTime.setDate(userTime.getDate() - 1)
    return userTime.toISOString().split('T')[0]
  }

  // Fallback: UTC verwenden
  const yesterday = new Date(now.getTime() - 86400000)
  return yesterday.toISOString().split('T')[0]
}

/**
 * Extrahiert den Timezone-Offset aus dem Request Body oder Query Parameters
 * @param req - Deno Request Objekt
 * @param body - Bereits geparstes Request Body (optional)
 * @returns Timezone Offset in Minuten oder undefined
 */
export function extractTimezoneOffset(req: Request, body?: any): number | undefined {
  // 1. Aus Body extrahieren (höchste Priorität)
  if (body && typeof body === 'object') {
    if (typeof body.timezone_offset === 'number') {
      return body.timezone_offset
    }
    if (typeof body.timezoneOffset === 'number') {
      return body.timezoneOffset
    }
  }

  // 2. Aus Query Parameters
  const url = new URL(req.url)
  const tzParam = url.searchParams.get('timezone_offset') || url.searchParams.get('tz')
  if (tzParam) {
    const parsed = parseInt(tzParam, 10)
    if (!isNaN(parsed)) {
      return parsed
    }
  }

  // 3. Aus Header (alternative Methode)
  const tzHeader = req.headers.get('X-Timezone-Offset')
  if (tzHeader) {
    const parsed = parseInt(tzHeader, 10)
    if (!isNaN(parsed)) {
      return parsed
    }
  }

  return undefined
}

/**
 * Generiert einen Idempotency-Key für eine Operation
 * @param userId - User ID
 * @param operation - Name der Operation (z.B. 'goals-setup')
 * @returns Idempotency-Key String
 */
export function generateIdempotencyKey(userId: string, operation: string): string {
  const timestamp = Date.now()
  return `${userId}-${operation}-${timestamp}`
}

/**
 * Extrahiert den Idempotency-Key aus dem Request
 * @param req - Deno Request Objekt
 * @returns Idempotency-Key oder undefined
 */
export function extractIdempotencyKey(req: Request): string | undefined {
  return req.headers.get('X-Idempotency-Key') ||
         req.headers.get('x-idempotency-key') ||
         undefined
}
