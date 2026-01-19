-- Fix: Erweitere CHECK constraint für ai_suggestions.kind
-- Migration: 20260119001000_fix_ai_suggestions_kind

-- Entferne alten Constraint
ALTER TABLE coach.ai_suggestions DROP CONSTRAINT IF EXISTS ai_suggestions_kind_check;

-- Füge neuen erweiterten Constraint hinzu
ALTER TABLE coach.ai_suggestions
ADD CONSTRAINT ai_suggestions_kind_check
CHECK (kind IN ('plan', 'checkin', 'nudge', 'goals_setup', 'plan_accepted', 'plan_regenerated'));
