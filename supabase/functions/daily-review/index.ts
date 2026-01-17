// Edge Function: daily-review
// POST - Verarbeitet das Review der Aufgaben vom Vortag

import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, createServiceClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { DailyReviewRequestSchema } from '../_shared/validation.ts'
import { getOpenAIClient, COACH_CHECKIN_SYSTEM_PROMPT } from '../_shared/openai.ts'

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const authResult = await getAuthUser(req)
    if (authResult.error || !authResult.user) {
      return errorResponse(authResult.error || 'Unauthorized', 401)
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 400)
    }

    const validation = DailyReviewRequestSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse(`Validation error: ${validation.error.message}`, 400)
    }

    const { reviews } = validation.data

    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const serviceSupabase = createServiceClient()
    const userId = authResult.user.id
    const today = new Date().toISOString().split('T')[0]

    // 1. Aktualisiere Tasks basierend auf Review
    for (const review of reviews) {
      await supabase
        .schema('core')
        .from('daily_tasks')
        .update({
          completed: review.completed,
          completed_at: review.completed ? new Date().toISOString() : null,
          skipped: !review.completed && review.blockers && review.blockers.length > 0,
          skip_reason: review.blockers?.join(', ') || null
        })
        .eq('id', review.task_id)
        .eq('user_id', userId)
    }

    // 2. Berechne Streak
    const { data: recentCheckins } = await supabase
      .schema('core')
      .from('daily_checkins')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30)

    let streak = 0
    if (recentCheckins && recentCheckins.length > 0) {
      const dates = recentCheckins.map(c => c.date)
      let currentDate = new Date()

      for (let i = 0; i < 30; i++) {
        const dateStr = currentDate.toISOString().split('T')[0]
        if (dates.includes(dateStr)) {
          streak++
          currentDate.setDate(currentDate.getDate() - 1)
        } else if (i === 0) {
          // Heute noch kein Check-in, prüfe ob gestern
          currentDate.setDate(currentDate.getDate() - 1)
          i-- // Wiederhole für gestern
        } else {
          break
        }
      }
    }

    // 3. Generiere AI-Feedback
    let feedback: string[] = []
    let insights = ''

    const completedCount = reviews.filter(r => r.completed).length
    const totalCount = reviews.length
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    try {
      const openai = getOpenAIClient()

      const reviewSummary = reviews.map(r =>
        `- ${r.task_id}: ${r.completed ? 'Geschafft' : 'Nicht geschafft'}${r.blockers?.length ? ` (Hindernisse: ${r.blockers.join(', ')})` : ''}${r.note ? ` - ${r.note}` : ''}`
      ).join('\n')

      const userPrompt = `Tagesreview:
Abschlussrate: ${completionRate}% (${completedCount}/${totalCount})
Streak: ${streak} Tage

Details:
${reviewSummary}

Gib konstruktives, ermutigendes Feedback. Antworte im JSON-Format:
{
  "feedback": ["Feedback-Punkt 1", "Feedback-Punkt 2"],
  "insight": "Eine persönliche Erkenntnis über das Produktivitätsmuster"
}`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: COACH_CHECKIN_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 500
      })

      const content = completion.choices[0]?.message?.content
      if (content) {
        const parsed = JSON.parse(content)
        feedback = parsed.feedback || []
        insights = parsed.insight || ''
      }

      // Speichere AI-Suggestion
      await supabase
        .schema('coach')
        .from('ai_suggestions')
        .insert({
          user_id: userId,
          kind: 'daily_review',
          payload_json: { reviews, feedback, insights, streak, completionRate },
          model: completion.model || 'gpt-4o-mini',
          tokens_in: completion.usage?.prompt_tokens || 0,
          tokens_out: completion.usage?.completion_tokens || 0
        })

    } catch (aiError) {
      console.error('AI feedback failed:', aiError)
      // Fallback
      if (completionRate >= 80) {
        feedback = ['Hervorragend! Du hast fast alle Aufgaben geschafft.', 'Weiter so!']
      } else if (completionRate >= 50) {
        feedback = ['Gut gemacht! Mehr als die Hälfte geschafft.', 'Morgen packst du noch mehr!']
      } else {
        feedback = ['Jeder Tag ist ein neuer Anfang.', 'Kleine Schritte führen zum Ziel.']
      }
      insights = 'Analysiere deine Hindernisse, um besser zu planen.'
    }

    // 4. Optional: Speichere Personality Insight (nur via Service Role)
    if (completionRate < 50 && reviews.some(r => r.blockers && r.blockers.length > 0)) {
      const blockers = reviews.flatMap(r => r.blockers || [])
      await serviceSupabase
        .schema('core')
        .from('personality_insights')
        .upsert({
          user_id: userId,
          insight_type: 'blocker_tendency',
          insight_data: {
            common_blockers: blockers,
            low_completion_date: today
          },
          confidence: 0.3,
          source_data: { reviews }
        }, { onConflict: 'user_id,insight_type' })
    }

    return successResponse({
      feedback,
      streak,
      insights,
      completion_rate: completionRate
    })

  } catch (e) {
    console.error('Unexpected error:', e)
    return errorResponse(String(e), 500)
  }
})
