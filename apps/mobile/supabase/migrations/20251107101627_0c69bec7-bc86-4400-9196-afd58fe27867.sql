-- Fix the update_user_title trigger function to properly sync all title fields
CREATE OR REPLACE FUNCTION public.update_user_title()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_title_id text;
  new_title_name text;
BEGIN
  -- Find the appropriate title based on total_ap
  SELECT id, name INTO new_title_id, new_title_name
  FROM public.title_templates
  WHERE ap_required <= NEW.total_ap
  ORDER BY ap_required DESC
  LIMIT 1;
  
  -- Update all title-related fields if the title has changed
  IF new_title_id IS NOT NULL AND new_title_id != OLD.current_title_id THEN
    NEW.current_title_id := new_title_id;
    NEW.title := new_title_name;
    NEW.rank := new_title_name;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Sync existing profiles to match current_title_id with title and rank
UPDATE public.profiles p
SET 
  title = t.name,
  rank = t.name
FROM public.title_templates t
WHERE p.current_title_id = t.id
  AND (p.title != t.name OR p.rank != t.name);

-- Also fix any profiles where current_title_id doesn't match their total_ap
UPDATE public.profiles p
SET 
  current_title_id = t.id,
  title = t.name,
  rank = t.name
FROM (
  SELECT DISTINCT ON (p2.id) 
    p2.id as profile_id, 
    t2.id, 
    t2.name
  FROM public.profiles p2
  CROSS JOIN public.title_templates t2
  WHERE t2.ap_required <= p2.total_ap
  ORDER BY p2.id, t2.ap_required DESC
) t
WHERE p.id = t.profile_id
  AND (p.current_title_id != t.id OR p.title != t.name OR p.rank != t.name);