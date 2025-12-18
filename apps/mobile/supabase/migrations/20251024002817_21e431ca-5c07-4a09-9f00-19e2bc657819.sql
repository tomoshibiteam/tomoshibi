-- Add total_ap column to profiles table to track cumulative AP
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_ap integer DEFAULT 0;

-- Update existing profiles to set total_ap equal to current ap
UPDATE public.profiles
SET total_ap = ap
WHERE total_ap = 0;

-- First, set all current_title_id to NULL temporarily
UPDATE public.profiles
SET current_title_id = NULL;

-- Update title templates with new thresholds and names
DELETE FROM public.title_templates;

INSERT INTO public.title_templates (id, name, ap_required, rank_order) VALUES
  ('apprentice', '見習い探偵', 0, 1),
  ('rookie', '駆け出しの探偵', 50, 2),
  ('investigator', '一人前の調査員', 200, 3),
  ('trusted_agent', '信頼できるエージェント', 500, 4),
  ('ace_detective', 'エース探偵', 1000, 5),
  ('master_detective', 'マスターディテクティブ', 2000, 6),
  ('legendary_detective', '伝説の探偵', 5000, 7);

-- Update profiles to set correct title based on total_ap
UPDATE public.profiles
SET current_title_id = (
  SELECT id FROM public.title_templates
  WHERE ap_required <= profiles.total_ap
  ORDER BY ap_required DESC
  LIMIT 1
),
title = (
  SELECT name FROM public.title_templates
  WHERE ap_required <= profiles.total_ap
  ORDER BY ap_required DESC
  LIMIT 1
),
rank = (
  SELECT name FROM public.title_templates
  WHERE ap_required <= profiles.total_ap
  ORDER BY ap_required DESC
  LIMIT 1
);

-- Update achievement templates with new AP rewards and achievements
DELETE FROM public.achievement_templates;

INSERT INTO public.achievement_templates (id, name, description, icon, category, requirement_type, requirement_value, ap_reward) VALUES
  -- 始まりの功績
  ('first_report', '探偵の第一歩', '初めて「捜査報告」を行う', '🎯', '始まりの功績', 'daily_reports', 1, 20),
  ('first_event', '初めての任務', '初めて「特別調査任務」に参加する', '🗺️', '始まりの功績', 'event_participation', 1, 50),
  ('first_clear', '初めての事件解決', '初めて「特別調査任務」をクリアする', '🏆', '始まりの功績', 'event_clear', 1, 100),
  
  -- 捜査活動の功績
  ('reporter_10', '駆け出しの報告者', '捜査報告を累計10回行う', '📝', '捜査活動の功績', 'daily_reports', 10, 50),
  ('reporter_50', '街の目撃者', '捜査報告を累計50回行う', '👁️', '捜査活動の功績', 'daily_reports', 50, 200),
  ('cleanup_10', 'クリーン・ウォーカー', '「ごみ拾い」報告を累計10回行う', '♻️', '捜査活動の功績', 'cleanup_reports', 10, 80),
  ('community_10', '地域の情報通', '「地域イベント」報告を累計10回行う', '🏘️', '捜査活動の功績', 'community_reports', 10, 80),
  
  -- 任務達成の功績
  ('missions_3', '敏腕調査員', '「特別調査任務」を累計3回クリアする', '⭐', '任務達成の功績', 'event_clear', 3, 300),
  ('ocean_theme', '海の守護者', '海がテーマの任務をクリアする', '🌊', '任務達成の功績', 'theme_ocean', 1, 100),
  ('culture_theme', '文化の継承者', '文化がテーマの任務をクリアする', '🎭', '任務達成の功績', 'theme_culture', 1, 100),
  
  -- 道具開発の功績
  ('first_upgrade', '見習い職人', '初めて「調査道具」を強化する', '🔧', '道具開発の功績', 'tool_upgrade', 1, 30),
  ('tool_lv3', '一流の道具使い', 'いずれかの「調査道具」をLv.3にする', '✨', '道具開発の功績', 'tool_max_level', 1, 150),
  ('all_tools_lv3', '道具の匠', '全ての「調査道具」をLv.3にする', '👑', '道具開発の功績', 'all_tools_max', 1, 500);

-- Update the trigger function to use total_ap for title calculation
CREATE OR REPLACE FUNCTION public.update_user_title()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_title_id text;
BEGIN
  SELECT id INTO new_title_id
  FROM public.title_templates
  WHERE ap_required <= NEW.total_ap
  ORDER BY ap_required DESC
  LIMIT 1;
  
  IF new_title_id IS NOT NULL AND new_title_id != OLD.current_title_id THEN
    NEW.current_title_id := new_title_id;
    
    UPDATE public.profiles
    SET title = (SELECT name FROM public.title_templates WHERE id = new_title_id),
        rank = (SELECT name FROM public.title_templates WHERE id = new_title_id)
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create a trigger to update total_ap when ap increases
CREATE OR REPLACE FUNCTION public.update_total_ap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only update total_ap when AP increases
  IF NEW.ap > OLD.ap THEN
    NEW.total_ap := OLD.total_ap + (NEW.ap - OLD.ap);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS update_total_ap_trigger ON public.profiles;

CREATE TRIGGER update_total_ap_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_total_ap();