// Edge Function: coach-checkin
// POST processes daily check-in results and provides AI feedback

import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { CoachCheckinRequestSchema, type CoachCheckinRequest } from '../_shared/validation.ts'
import { getOpenAIClient, COACH_CHECKIN_SYSTEM_PROMPT, type CoachCheckinOutput } from '../_shared/openai.ts'

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

    const validation = CoachCheckinRequestSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse(`Validation error: ${validation.error.message}`, 400)
    }

    const { date, results, profileSnapshot } = validation.data

    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)

    // Fetch goals for context
    const goalIds = results.map((r) => r.goalId)
    const { data: goalsData } = await supabase
      .schema('core')
      .from('goals')
      .select('id, title, category')
      .in('id', goalIds)

    const goalsMap = new Map(goalsData?.map((g) => [g.id, g]) || [])

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

    // Generate AI feedback
    let adjustments: CoachCheckinOutput[]
    let tokensUsed = { input: 0, output: 0 }
    let modelUsed = 'stub'

    try {
      const openai = getOpenAIClient()

      const userPrompt = buildCheckinPrompt(date, results, goalsMap, profile)

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: COACH_CHECKIN_SYSTEM_PROMPT },
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
      adjustments = parsed.adjustments || parsed.feedback || []

      tokensUsed = {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
      }
      modelUsed = completion.model || 'gpt-4o-mini'

    } catch (aiError) {
      console.error('AI generation failed, using fallback:', aiError)
      // Fallback to stub response
      adjustments = generateStubFeedback(results)
    }

    // Store AI suggestion in database
    try {
      await supabase
        .schema('coach')
        .from('ai_suggestions')
        .insert({
          user_id: authResult.user.id,
          kind: 'checkin',
          payload_json: { date, adjustments },
          model: modelUsed,
          tokens_in: tokensUsed.input,
          tokens_out: tokensUsed.output,
        })
    } catch (dbError) {
      console.error('Failed to store AI suggestion:', dbError)
    }

    // Update goal statuses in database
    for (const result of results) {
      if (result.status !== 'open') {
        await supabase
          .schema('core')
          .from('goals')
          .update({ status: result.status, note: result.note || null })
          .eq('id', result.goalId)
          .eq('user_id', authResult.user.id)
      }
    }

    return jsonResponse({ date, adjustments })
  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})

function buildCheckinPrompt(
  date: string,
  results: CoachCheckinRequest['results'],
  goalsMap: Map<string, { id: string; title: string; category?: string }>,
  profile: Record<string, unknown>
): string {
  const resultsText = results.map((r) => {
    const goal = goalsMap.get(r.goalId)
    const title = goal?.title || 'Unbekanntes Ziel'
    const category = goal?.category ? ` (${goal.category})` : ''
    const blockers = r.blockers?.length ? `\n   Blocker: ${r.blockers.join(', ')}` : ''
    const note = r.note ? `\n   Notiz: ${r.note}` : ''
    return `- ${title}${category}: ${r.status}${blockers}${note}`
  }).join('\n')

  const achieved = results.filter((r) => r.status === 'achieved').length
  const notAchieved = results.filter((r) => r.status === 'not_achieved').length

  const profileContext = []
  if (profile.coaching_style) profileContext.push(`Coaching-Stil: ${profile.coaching_style}`)

  return `Datum: ${date}

Tagesergebnis: ${achieved} erreicht, ${notAchieved} nicht erreicht

Ergebnisse:
${resultsText}

${profileContext.length > 0 ? `Nutzer-Kontext:\n${profileContext.join('\n')}\n` : ''}
Analysiere die Ergebnisse und gib konstruktives Feedback. Antworte mit einem JSON-Objekt in folgendem Format:
{
  "adjustments": [
    {
      "goalId": "<goal-id oder null>",
      "new_next_step": "<angepasster nächster Schritt für nicht erreichte Ziele>",
      "countermeasure": "<konkrete Gegenmaßnahme für Blocker>",
      "encouragement": "<motivierende Nachricht>"
    }
  ]
}`
}

function generateStubFeedback(results: CoachCheckinRequest['results']): CoachCheckinOutput[] {
  return results
    .filter((r) => r.status === 'not_achieved')
    .map((r) => ({
      goalId: r.goalId,
      new_next_step: 'Passe auf einen 5-Minuten-Schritt an',
      countermeasure: r.blockers?.length
        ? 'Identifiziere einen kleineren ersten Schritt'
        : 'Blocke dir feste Zeit im Kalender',
      encouragement: 'Jeder Tag ist eine neue Chance. Kleine Schritte führen zum Ziel!',
    }))
}
