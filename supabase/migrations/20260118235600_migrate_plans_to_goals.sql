-- Migrate existing plan data from ai_suggestions to goals.plan_json

-- Migrate from goals_setup suggestions
DO $$
DECLARE
  suggestion_record RECORD;
  plan_data JSONB;
  goal_id_val UUID;
BEGIN
  FOR suggestion_record IN
    SELECT user_id, payload_json
    FROM coach.ai_suggestions
    WHERE kind = 'goals_setup'
    ORDER BY created_at DESC
  LOOP
    IF suggestion_record.payload_json ? 'plans' AND
       jsonb_typeof(suggestion_record.payload_json->'plans') = 'array' THEN
      FOR plan_data IN SELECT * FROM jsonb_array_elements(suggestion_record.payload_json->'plans')
      LOOP
        goal_id_val := (plan_data->>'goal_id')::UUID;
        IF goal_id_val IS NOT NULL THEN
          UPDATE core.goals
          SET plan_json = jsonb_build_object(
            'duration_weeks', plan_data->'duration_weeks',
            'target_date', plan_data->>'target_date',
            'milestones', COALESCE(plan_data->'milestones', '[]'::jsonb),
            'daily_tasks', COALESCE(plan_data->'daily_tasks', '[]'::jsonb),
            'weekly_tasks', COALESCE(plan_data->'weekly_tasks', '[]'::jsonb),
            'success_metric', COALESCE(plan_data->>'success_metric', ''),
            'analysis', COALESCE(plan_data->>'analysis', ''),
            'motivation', COALESCE(plan_data->>'motivation', '')
          )
          WHERE id = goal_id_val AND plan_json IS NULL;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Migrate from plan_accepted suggestions (these take priority)
DO $$
DECLARE
  suggestion_record RECORD;
  plan_data JSONB;
  goal_id_val UUID;
BEGIN
  FOR suggestion_record IN
    SELECT user_id, payload_json
    FROM coach.ai_suggestions
    WHERE kind = 'plan_accepted'
    ORDER BY created_at DESC
  LOOP
    goal_id_val := (suggestion_record.payload_json->>'goal_id')::UUID;
    plan_data := suggestion_record.payload_json->'plan';
    IF goal_id_val IS NOT NULL AND plan_data IS NOT NULL THEN
      UPDATE core.goals
      SET plan_json = jsonb_build_object(
        'duration_weeks', plan_data->'duration_weeks',
        'target_date', plan_data->>'target_date',
        'milestones', COALESCE(plan_data->'milestones', '[]'::jsonb),
        'daily_tasks', COALESCE(plan_data->'daily_tasks', '[]'::jsonb),
        'weekly_tasks', COALESCE(plan_data->'weekly_tasks', '[]'::jsonb),
        'success_metric', COALESCE(plan_data->>'success_metric', ''),
        'analysis', COALESCE(plan_data->>'analysis', ''),
        'motivation', COALESCE(plan_data->>'motivation', '')
      )
      WHERE id = goal_id_val;
    END IF;
  END LOOP;
END $$;
