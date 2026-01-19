-- Add plan_json column to goals table for direct plan storage
-- Migration: 20260118235500_add_plan_json_to_goals

ALTER TABLE core.goals
ADD COLUMN IF NOT EXISTS plan_json JSONB;

COMMENT ON COLUMN core.goals.plan_json IS 'Stores the AI-generated plan with milestones, daily_tasks, weekly_tasks, etc.';
