-- Add streak tracking columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN current_streak integer DEFAULT 0,
ADD COLUMN last_log_date date DEFAULT NULL,
ADD COLUMN notification_enabled boolean DEFAULT true,
ADD COLUMN notification_time text DEFAULT '22:00';

-- Insert streak achievement templates
INSERT INTO public.achievement_templates (id, name, description, icon, ap_reward, category, requirement_type, requirement_value)
VALUES
  ('streak_3_days', '燃える冒険心', '3日間の連続アクションを達成', '🔥', 30, 'streak', 'consecutive_days', 3),
  ('streak_7_days', '週刊冒険者', '7日間の連続アクションを達成', '🔥🔥', 70, 'streak', 'consecutive_days', 7),
  ('streak_30_days', '月刊冒険者', '30日間の連続アクションを達成', '🔥🔥🔥', 300, 'streak', 'consecutive_days', 30);
