-- Add streak tracking columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN current_streak integer DEFAULT 0,
ADD COLUMN last_log_date date DEFAULT NULL,
ADD COLUMN notification_enabled boolean DEFAULT true,
ADD COLUMN notification_time text DEFAULT '22:00';

-- Insert streak achievement templates
INSERT INTO public.achievement_templates (id, name, description, icon, ap_reward, category, requirement_type, requirement_value)
VALUES
  ('streak_3_days', '燃える捜査魂', '3日間の連続捜査を達成', '🔥', 30, 'streak', 'consecutive_days', 3),
  ('streak_7_days', '週刊探偵', '7日間の連続捜査を達成', '🔥🔥', 70, 'streak', 'consecutive_days', 7),
  ('streak_30_days', '月刊探偵', '30日間の連続捜査を達成', '🔥🔥🔥', 300, 'streak', 'consecutive_days', 30);