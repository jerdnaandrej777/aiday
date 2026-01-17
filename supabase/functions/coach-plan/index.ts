// Edge Function: coach-plan
// POST generates AI-powered daily plan suggestions

import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { CoachPlanRequestSchema, type CoachPlanRequest } from '../_shared/validation.ts'
import { getOpenAIClient, COACH_PLAN_SYSTEM_PROMPT, type CoachPlanOutput } from '../_shared/openai.ts'

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

    const validation = CoachPlanRequestSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse(`Validation error: ${validation.error.message}`, 400)
    }

    const { date, goals, profileSnapshot } = validation.data

    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)

    // Fetch user profile if not provided
    let profile = profileSnapshot
    if (!profile) {
      const { data: profileData } = await supabase
        .schema('core')
        .from('user_profile')
        .select('*')
        .eq('user_id', authResult.user.id)
        .maybeSingle()
      profile = profileData || {}
    }

    // Generate AI plan
    let plan: CoachPlanOutput[]
    let tokensUsed = { input: 0, output: 0 }
    let modelUsed = 'stub'

    try {
      const openai = getOpenAIClient()

      const userPrompt = buildUserPrompt(date, goals, profile)

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: COACH_PLAN_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000,
      })

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error('Empty AI response')
      }

      const parsed = JSON.parse(content)
      plan = parsed.plans || parsed.plan || []

      tokensUsed = {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
      }
      modelUsed = completion.model || 'gpt-4o-mini'

    } catch (aiError) {
      console.error('AI generation failed, using fallback:', aiError)
      // Fallback to stub response
      plan = generateStubPlan(goals)
    }

    // Store AI suggestion in database
    try {
      await supabase
        .schema('coach')
        .from('ai_suggestions')
        .insert({
          user_id: authResult.user.id,
          kind: 'plan',
          payload_json: { date, plan },
          model: modelUsed,
          tokens_in: tokensUsed.input,
          tokens_out: tokensUsed.output,
        })
    } catch (dbError) {
      console.error('Failed to store AI suggestion:', dbError)
      // Continue even if storage fails
    }

    return jsonResponse({ date, plan })
  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})

function buildUserPrompt(
  date: string,
  goals: CoachPlanRequest['goals'],
  profile: Record<string, unknown>
): string {
  const goalsText = goals.map((g, i) => `${i + 1}. ${g.title}${g.category ? ` (${g.category})` : ''}`).join('\n')

  const profileContext = []
  if (profile.coaching_style) profileContext.push(`Coaching-Stil: ${profile.coaching_style}`)
  if (profile.time_budget_weekday) profileContext.push(`Zeitbudget: ${profile.time_budget_weekday} Minuten`)
  if (profile.energy_peak) profileContext.push(`Energiehoch: ${profile.energy_peak}`)
  if (Array.isArray(profile.obstacles) && profile.obstacles.length > 0) {
    profileContext.push(`Typische Hindernisse: ${profile.obstacles.join(', ')}`)
  }

  return `Datum: ${date}

Ziele für heute:
${goalsText}

${profileContext.length > 0 ? `Nutzer-Kontext:\n${profileContext.join('\n')}\n` : ''}
Erstelle für jedes Ziel einen strukturierten Plan. Antworte mit einem JSON-Objekt in folgendem Format:
{
  "plans": [
    {
      "goalId": "<goal-id oder null>",
      "next_step": "<erster konkreter Mikroschritt, max. 10 Minuten>",
      "steps": ["<Schritt 1>", "<Schritt 2>", "<Schritt 3>"],
      "if_then": "<Wenn X passiert, dann tue Y>",
      "timebox": "<HH:MM Format, empfohlene Dauer>",
      "plan_b": "<Backup-Plan bei Zeitmangel>",
      "rationale": "<kurze Begründung>"
    }
  ]
}`
}

function generateStubPlan(goals: CoachPlanRequest['goals']): CoachPlanOutput[] {
  return goals.map((g) => ({
    goalId: g.id ?? null,
    next_step: 'Starte mit einem 10-Minuten-Mikroschritt',
    steps: ['Vorbereitung', 'Hauptaufgabe beginnen', 'Abschluss und Review'],
    if_then: 'Wenn du blockiert bist, mache eine 2-Minuten-Version',
    timebox: '00:30',
    plan_b: 'Mindestens 5 Minuten an der Aufgabe arbeiten',
    rationale: 'Fallback-Plan (AI nicht verfügbar)',
  }))
}
