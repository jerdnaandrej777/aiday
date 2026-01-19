// Shared Zod Schemas for Edge Functions

import { z } from 'https://esm.sh/zod@3'

// ============================================
// Input Sanitization Helpers
// ============================================

// Entfernt potentiell gefährliche Zeichen und HTML-Tags
export function sanitizeString(input: string): string {
  return input
    .trim()
    // Entferne HTML-Tags
    .replace(/<[^>]*>/g, '')
    // Entferne Script-Inhalte
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Normalisiere Whitespace
    .replace(/\s+/g, ' ')
}

// Prüft auf potentiell gefährliche Muster
const dangerousPatterns = [
  /<script/i,
  /javascript:/i,
  /on\w+=/i,  // onclick=, onerror=, etc.
  /data:/i,
  /vbscript:/i
]

export function containsDangerousContent(input: string): boolean {
  return dangerousPatterns.some(pattern => pattern.test(input))
}

// Zod Transform für automatische Sanitization
const sanitizedString = (maxLength: number) =>
  z.string()
    .max(maxLength, `Text darf maximal ${maxLength} Zeichen haben`)
    .transform(sanitizeString)
    .refine(val => !containsDangerousContent(val), 'Ungültige Zeichen im Text')

// ============================================
// Constants für Längen-Limits
// ============================================

export const INPUT_LIMITS = {
  // Kurze Texte
  TITLE: 200,
  CATEGORY: 50,
  NAME: 100,

  // Mittlere Texte
  NOTE: 500,
  DESCRIPTION: 1000,

  // Lange Texte
  LONG_TEXT: 2000,
  ESSAY: 5000,

  // Arrays
  MAX_GOALS: 10,
  MAX_BLOCKERS: 10,
  MAX_STEPS: 20
}

// ============================================
// Schemas
// ============================================

// Date format: YYYY-MM-DD
export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')

// Month format: YYYY-MM
export const MonthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format')

// Goal Schema
export const GoalSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string()
    .min(1, 'Titel ist erforderlich')
    .max(INPUT_LIMITS.TITLE, `Titel darf maximal ${INPUT_LIMITS.TITLE} Zeichen haben`)
    .transform(sanitizeString),
  category: z.string().max(INPUT_LIMITS.CATEGORY).transform(sanitizeString).optional(),
  status: z.enum(['open', 'achieved', 'not_achieved']).optional(),
  note: z.string().max(INPUT_LIMITS.NOTE).transform(sanitizeString).optional(),
})

// Coach Plan Request
export const CoachPlanRequestSchema = z.object({
  date: DateSchema,
  goals: z.array(GoalSchema).min(1, 'At least one goal is required'),
  profileSnapshot: z.record(z.unknown()).optional(),
})

// Coach Checkin Request
export const CoachCheckinRequestSchema = z.object({
  date: DateSchema,
  results: z.array(z.object({
    goalId: z.string().uuid(),
    status: z.enum(['achieved', 'not_achieved', 'open']),
    note: z.string().optional(),
    blockers: z.array(z.string()).optional(),
  })),
  profileSnapshot: z.record(z.unknown()).optional(),
})

// Onboarding Request
export const OnboardingRequestSchema = z.object({
  priority_areas: z.array(z.string()).min(1, 'At least one priority area is required'),
  motivations: z.string().optional(),
  time_budget_weekday: z.number().int().min(15).max(480).optional(),
  energy_peak: z.enum(['morning', 'afternoon', 'evening']).optional(),
  obstacles: z.array(z.string()).optional(),
  coaching_style: z.enum(['supportive', 'challenging', 'balanced']).optional(),
  checkin_schedule: z.record(z.unknown()).optional(),
  quiet_hours: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
})

// Delete Account Confirmation
export const DeleteAccountSchema = z.object({
  confirmation: z.literal('DELETE'),
})

// ========== Daily Coaching Flow Schemas ==========

// Daily Check-in Request
export const DailyCheckinRequestSchema = z.object({
  mood: z.enum(['great', 'good', 'neutral', 'bad', 'terrible']),
  mood_note: z.string().max(500).optional(),
  done_today: z.string().max(1000).optional(),
  planned_today: z.string().max(1000).optional(),
  energy_level: z.number().int().min(1).max(5).optional(),
})

// Goal with Details (for setup)
export const GoalWithDetailsSchema = z.object({
  title: z.string()
    .min(1, 'Titel ist erforderlich')
    .max(INPUT_LIMITS.TITLE, `Titel darf maximal ${INPUT_LIMITS.TITLE} Zeichen haben`)
    .transform(sanitizeString)
    .refine(val => !containsDangerousContent(val), 'Ungültige Zeichen im Titel'),
  category: z.string().max(INPUT_LIMITS.CATEGORY).transform(sanitizeString).optional(),
  why_important: z.string().max(INPUT_LIMITS.NOTE).transform(sanitizeString).optional(),
  previous_efforts: z.string().max(INPUT_LIMITS.NOTE).transform(sanitizeString).optional(),
  believed_steps: z.string().max(INPUT_LIMITS.LONG_TEXT).transform(sanitizeString).optional(),
  clarification_answers: z.record(
    z.string().max(INPUT_LIMITS.DESCRIPTION).transform(sanitizeString)
  ).optional(),
})

// Goals Setup Request
export const GoalsSetupRequestSchema = z.object({
  goals: z.array(GoalWithDetailsSchema).min(1).max(INPUT_LIMITS.MAX_GOALS),
})

// Task Review Item
export const TaskReviewSchema = z.object({
  task_id: z.string().uuid(),
  completed: z.boolean(),
  blockers: z.array(
    z.string().max(INPUT_LIMITS.NOTE).transform(sanitizeString)
  ).max(INPUT_LIMITS.MAX_BLOCKERS).optional(),
  note: z.string().max(INPUT_LIMITS.NOTE).transform(sanitizeString).optional(),
})

// Daily Review Request
export const DailyReviewRequestSchema = z.object({
  reviews: z.array(TaskReviewSchema).min(1).max(INPUT_LIMITS.MAX_STEPS),
})

// Type exports
export type CoachPlanRequest = z.infer<typeof CoachPlanRequestSchema>
export type CoachCheckinRequest = z.infer<typeof CoachCheckinRequestSchema>
export type OnboardingRequest = z.infer<typeof OnboardingRequestSchema>
export type DailyCheckinRequest = z.infer<typeof DailyCheckinRequestSchema>
export type GoalsSetupRequest = z.infer<typeof GoalsSetupRequestSchema>
export type DailyReviewRequest = z.infer<typeof DailyReviewRequestSchema>
