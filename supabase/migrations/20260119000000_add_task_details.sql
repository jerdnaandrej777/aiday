-- Migration: Add task_details JSONB column to daily_tasks
-- Date: 2026-01-19
-- Purpose: Store detailed task information (steps, why, best_time, frequency) from AI-generated plans

-- Add new JSONB column for task details
ALTER TABLE core.daily_tasks
ADD COLUMN IF NOT EXISTS task_details JSONB;

-- Add comment for documentation
COMMENT ON COLUMN core.daily_tasks.task_details IS
'JSON with steps[], why, best_time, frequency from AI-generated plan. Structure:
{
  "steps": ["Step 1", "Step 2", "Step 3"],
  "why": "Why this task is important...",
  "best_time": "morgens|mittags|abends|flexibel",
  "frequency": "daily|weekdays|3x_week"
}';

-- Create index for potential future queries on task_details
CREATE INDEX IF NOT EXISTS idx_daily_tasks_details ON core.daily_tasks USING gin (task_details);
