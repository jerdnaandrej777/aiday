// Shared Supabase Client Factory for Edge Functions

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface AuthResult {
  user: { id: string; email?: string } | null
  error: string | null
}

export function createSupabaseClient(accessToken?: string): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const options: Record<string, unknown> = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }

  if (accessToken) {
    options.global = {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  }

  return createClient(supabaseUrl, supabaseKey, options)
}

export function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export function extractToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return null
  }
  return authHeader.split(' ')[1]
}

export async function getAuthUser(req: Request): Promise<AuthResult> {
  const token = extractToken(req)
  if (!token) {
    console.error('Auth: No bearer token found')
    return { user: null, error: 'missing_bearer_token' }
  }

  console.log('Auth: Token received, length:', token.length)

  const supabase = createSupabaseClient(token)
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    console.error('Auth error:', error.message, error.status)
    return { user: null, error: error.message || 'invalid_token' }
  }

  if (!data.user) {
    console.error('Auth: No user data')
    return { user: null, error: 'no_user_data' }
  }

  console.log('Auth: User authenticated:', data.user.id)
  return { user: { id: data.user.id, email: data.user.email }, error: null }
}
