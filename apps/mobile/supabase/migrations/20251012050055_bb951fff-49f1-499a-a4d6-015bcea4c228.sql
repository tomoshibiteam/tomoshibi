-- Create achievement templates table (功績マスターデータ)
CREATE TABLE public.achievement_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  ap_reward integer NOT NULL,
  category text NOT NULL,
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL
);

-- Create title templates table (称号マスターデータ)
CREATE TABLE public.title_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  ap_required integer NOT NULL,
  rank_order integer NOT NULL
);

-- Add AP and current_title_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN ap integer DEFAULT 0,
ADD COLUMN current_title_id text;

-- Enable RLS on new tables
ALTER TABLE public.achievement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_templates ENABLE ROW LEVEL SECURITY;

-- Public read policies for master data
CREATE POLICY "Anyone can view achievement templates"
ON public.achievement_templates
FOR SELECT
USING (true);

CREATE POLICY "Anyone can view title templates"
ON public.title_templates
FOR SELECT
USING (true);

-- Insert title templates
INSERT INTO public.title_templates (id, name, ap_required, rank_order) VALUES
('apprentice', '見習い冒険者', 0, 1),
('rookie', '駆け出しの冒険者', 50, 2),
('investigator', '一人前の調査員', 200, 3),
('trusted_agent', '信頼できるエージェント', 500, 4),
('master', 'マスターディテクティブ', 1000, 5);

-- Insert achievement templates
INSERT INTO public.achievement_templates (id, name, description, icon, ap_reward, category, requirement_type, requirement_value) VALUES
-- Core Missions
('first_case', '初めての事件解決', 'イベントを1つクリアする', '🏆', 100, 'core_mission', 'event_clear', 1),
('skilled_investigator', '敏腕調査員', '異なるイベントを3つクリアする', '⭐', 250, 'core_mission', 'event_clear', 3),
('guardian_sea', '海の守護者', '海をテーマにしたイベントをクリアする', '🌊', 150, 'core_mission', 'event_clear_ocean', 1),
('culture_successor', '文化の継承者', '文化をテーマにしたイベントをクリアする', '🎭', 150, 'core_mission', 'event_clear_culture', 1),
-- Daily Investigations
('first_discovery', '最初の発見', '初めての日々の捜査報告を提出する', '🔍', 10, 'daily_investigation', 'daily_report', 1),
('diligent_reporter', '熱心な報告者', '日々の捜査報告を10件提出する', '📝', 50, 'daily_investigation', 'daily_report', 10),
('community_eyes', '地域の目', '日々の捜査報告を50件提出する', '👁️', 200, 'daily_investigation', 'daily_report', 50),
('clean_walker', 'クリーンウォーカー', 'ゴミ拾いカテゴリーで5件の報告を提出する', '🧹', 30, 'daily_investigation', 'daily_report_trash', 5),
-- Special Commendations
('first_step', '冒険の第一歩', 'アプリの登録を完了する', '👣', 5, 'special', 'registration', 1),
('mark_trust', '信頼の証', '7日連続でログインする', '✨', 25, 'special', 'login_streak', 7),
('with_comrades', '仲間と共に', '2人以上のチームでイベントに参加する', '🤝', 50, 'special', 'team_event', 1);

-- Update existing profiles to have default title
UPDATE public.profiles 
SET current_title_id = 'apprentice' 
WHERE current_title_id IS NULL;

-- Add foreign key constraint
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_current_title_id_fkey 
FOREIGN KEY (current_title_id) 
REFERENCES public.title_templates(id);

-- Update achievements table structure
ALTER TABLE public.achievements
ADD COLUMN template_id text REFERENCES public.achievement_templates(id);

-- Create function to update user title based on AP
CREATE OR REPLACE FUNCTION public.update_user_title()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_title_id text;
BEGIN
  SELECT id INTO new_title_id
  FROM public.title_templates
  WHERE ap_required <= NEW.ap
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
$$;

-- Create trigger for automatic title updates
CREATE TRIGGER update_title_on_ap_change
BEFORE UPDATE OF ap ON public.profiles
FOR EACH ROW
WHEN (NEW.ap IS DISTINCT FROM OLD.ap)
EXECUTE FUNCTION public.update_user_title();
