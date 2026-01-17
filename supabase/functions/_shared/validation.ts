// Shared Zod Schemas for Edge Functions

import { z } from 'https://esm.sh/zod@3'

// Date format: YYYY-MM-DD
export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')

// Month format: YYYY-MM
export const MonthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format')

// Goal Schema
export const GoalSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required'),
  category: z.string().optional(),
  status: z.enum(['open', 'achieved', 'not_achieved']).optional(),
  note: z.string().optional(),
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
  title: z.string().min(1, 'Title is required').max(200),
  category: z.string().max(50).optional(),
  why_important: z.string().max(500).optional(),
  previous_efforts: z.string().max(500).optional(),
  believed_steps: z.string().max(2000).optional(), // Extended for clarification answers
  clarification_answers: z.record(z.string()).optional(), // Key-value pairs from clarification
})

// Goals Setup Request (5 main goals)
export const GoalsSetupRequestSchema = z.object({
  goals: z.array(GoalWithDetailsSchema).min(1).max(5),
})

// Task Review Item
export const TaskReviewSchema = z.object({
  task_id: z.string().uuid(),
  completed: z.boolean(),
  blockers: z.array(z.string()).optional(),
  note: z.string().max(500).optional(),
})

// Daily Review Request
export const DailyReviewRequestSchema = z.object({
  reviews: z.array(TaskReviewSchema).min(1),
})

// Type exports
export type CoachPlanRequest = z.infer<typeof CoachPlanRequestSchema>
export type CoachCheckinRequest = z.infer<typeof CoachCheckinRequestSchema>
export type OnboardingRequest = z.infer<typeof OnboardingRequestSchema>
export type DailyCheckinRequest = z.infer<typeof DailyCheckinRequestSchema>
export type GoalsSetupRequest = z.infer<typeof GoalsSetupRequestSchema>
export type DailyReviewRequest = z.infer<typeof DailyReviewRequestSchema>
