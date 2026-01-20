// Edge Function: ai-chat
// POST - AI-Coaching Chat mit Kontext-Awareness

import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseClient, getAuthUser, extractToken } from '../_shared/supabase.ts'
import { getOpenAIClient, createPersonalizedPrompt } from '../_shared/openai.ts'

// Chat-spezifischer System Prompt
const AI_CHAT_SYSTEM_PROMPT = `Du bist ein erfahrener und einfühlsamer AI-Life-Coach in der AImDo App.

DEINE ROLLE:
- Du hilfst Nutzern, ihre Ziele zu erreichen und produktiver zu werden
- Du gibst personalisierte Tipps basierend auf dem Nutzerkontext
- Du motivierst und unterstützt bei Herausforderungen
- Du analysierst Muster und gibst Insights

WICHTIGE REGELN:
1. Antworte IMMER auf Deutsch
2. Sei warmherzig, aber direkt
3. Gib konkrete, umsetzbare Tipps
4. Beziehe dich auf den Nutzerkontext (Ziele, Habits, Stimmung)
5. Halte Antworten prägnant (max 3-4 Absätze)
6. Verwende gelegentlich Emojis für Wärme
7. Ermutige den Nutzer bei Rückschlägen

VERBOTEN:
- Medizinische oder psychologische Diagnosen
- Finanzberatung ohne Kontext
- Unrealistische Versprechungen
- Negative oder demotivierende Aussagen`

interface ChatMessage {
  role: 'user' | 'ai' | 'system'
  content: string
  timestamp?: string
}

interface ChatRequest {
  message: string
  history?: ChatMessage[]
}

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

    let body: ChatRequest
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 400)
    }

    if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
      return errorResponse('Message is required', 400)
    }

    const token = extractToken(req)!
    const supabase = createSupabaseClient(token)
    const userId = authResult.user.id
    const today = new Date().toISOString().split('T')[0]

    // 1. Lade User-Kontext (Profil, Goals, Habits, Check-in)
    const [profileResult, goalsResult, habitsResult, checkinResult, tasksResult] = await Promise.all([
      supabase.schema('core').from('user_profile').select('*').eq('user_id', userId).single(),
      supabase.schema('core').from('goals').select('title, status, progress_percent').eq('user_id', userId).in('status', ['open', 'in_progress']).limit(5),
      supabase.schema('core').from('habits').select('title, current_streak, frequency').eq('user_id', userId).eq('is_active', true).limit(5),
      supabase.schema('core').from('daily_checkins').select('mood, energy_level, mood_note').eq('user_id', userId).eq('date', today).single(),
      supabase.schema('core').from('daily_tasks').select('task_text, completed').eq('user_id', userId).eq('date', today).limit(10)
    ])

    // 2. Baue Kontext-String
    let contextInfo = ''

    // Profil-Infos
    const profile = profileResult.data
    if (profile) {
      const profileParts: string[] = []
      if (profile.age) profileParts.push(`Alter: ${profile.age}`)
      if (profile.job) profileParts.push(`Beruf: ${profile.job}`)
      if (profileParts.length > 0) {
        contextInfo += `\n\nNUTZER-PROFIL:\n${profileParts.join(', ')}`
      }
    }

    // Aktuelle Ziele
    if (goalsResult.data && goalsResult.data.length > 0) {
      const goalsInfo = goalsResult.data.map(g =>
        `- ${g.title} (${g.status}, ${g.progress_percent || 0}% erreicht)`
      ).join('\n')
      contextInfo += `\n\nAKTUELLE ZIELE:\n${goalsInfo}`
    }

    // Aktive Habits
    if (habitsResult.data && habitsResult.data.length > 0) {
      const habitsInfo = habitsResult.data.map(h =>
        `- ${h.title} (Streak: ${h.current_streak} Tage, ${h.frequency})`
      ).join('\n')
      contextInfo += `\n\nAKTIVE HABITS:\n${habitsInfo}`
    }

    // Heutiger Check-in
    if (checkinResult.data) {
      const c = checkinResult.data
      const moodMap: Record<string, string> = {
        'great': 'super',
        'good': 'gut',
        'neutral': 'neutral',
        'bad': 'nicht so gut',
        'terrible': 'schlecht'
      }
      contextInfo += `\n\nHEUTIGE STIMMUNG: ${moodMap[c.mood] || c.mood}, Energie: ${c.energy_level}/5`
      if (c.mood_note) {
        contextInfo += `\nNotiz: "${c.mood_note}"`
      }
    }

    // Heutige Tasks
    if (tasksResult.data && tasksResult.data.length > 0) {
      const completedTasks = tasksResult.data.filter(t => t.completed).length
      const totalTasks = tasksResult.data.length
      contextInfo += `\n\nHEUTIGE AUFGABEN: ${completedTasks}/${totalTasks} erledigt`
    }

    // 3. Erstelle personalisierten Prompt
    const systemPrompt = createPersonalizedPrompt(
      AI_CHAT_SYSTEM_PROMPT + contextInfo,
      profile
    )

    // 4. Baue Messages-Array für OpenAI
    const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
      { role: 'system', content: systemPrompt }
    ]

    // Chat-History hinzufügen (falls vorhanden)
    if (body.history && Array.isArray(body.history)) {
      for (const msg of body.history.slice(-8)) { // Letzte 8 Nachrichten
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content })
        } else if (msg.role === 'ai') {
          messages.push({ role: 'assistant', content: msg.content })
        }
      }
    }

    // Aktuelle Nachricht
    messages.push({ role: 'user', content: body.message })

    // 5. OpenAI API Call
    const openai = getOpenAIClient()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.8,
      max_tokens: 800,
      presence_penalty: 0.3,
      frequency_penalty: 0.3
    })

    const aiResponse = completion.choices[0]?.message?.content || 'Entschuldige, ich konnte keine Antwort generieren.'

    // 6. Speichere in ai_suggestions für Analytics
    await supabase
      .schema('coach')
      .from('ai_suggestions')
      .insert({
        user_id: userId,
        kind: 'chat',
        payload_json: {
          user_message: body.message,
          ai_response: aiResponse,
          context_included: contextInfo.length > 0
        },
        model: completion.model || 'gpt-4o-mini',
        tokens_in: completion.usage?.prompt_tokens || 0,
        tokens_out: completion.usage?.completion_tokens || 0
      })

    return successResponse({
      response: aiResponse
    })

  } catch (e) {
    console.error('AI Chat error:', e)
    return errorResponse(String(e), 500)
  }
})
