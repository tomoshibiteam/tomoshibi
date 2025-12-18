-- 新規ユーザー作成時に正しい初期称号を設定する関数を修正
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  initial_title_id text;
  initial_title_name text;
BEGIN
  -- Get the first title from title_templates (ap_required = 0)
  SELECT id, name INTO initial_title_id, initial_title_name
  FROM public.title_templates
  WHERE ap_required = 0
  ORDER BY rank_order ASC
  LIMIT 1;
  
  -- Insert new profile with correct initial title
  INSERT INTO public.profiles (
    id, 
    name, 
    email, 
    title, 
    rank, 
    current_title_id, 
    level, 
    achievement_count,
    total_ap,
    ap
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'ゲスト'),
    NEW.email,
    COALESCE(initial_title_name, '見習い探偵'),
    COALESCE(initial_title_name, '見習い探偵'),
    initial_title_id,
    1,
    0,
    0,
    0
  );
  RETURN NEW;
END;
$function$;