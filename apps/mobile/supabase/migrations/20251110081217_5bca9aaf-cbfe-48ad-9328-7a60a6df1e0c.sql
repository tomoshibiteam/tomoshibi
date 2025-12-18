-- Add referral columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN referral_code text UNIQUE,
ADD COLUMN referred_by_id uuid REFERENCES public.profiles(id);

-- Create index for referral code lookup
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate code: SPR- + 6 random alphanumeric characters
    code := 'SPR-' || upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Trigger to auto-generate referral code for new users
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_user_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION set_referral_code();

-- Add referral achievement templates
INSERT INTO public.achievement_templates (id, name, description, icon, category, requirement_type, requirement_value, ap_reward)
VALUES 
  ('ACH_RECRUITER', '新米リクルーター', '初めて仲間を1人招待する', '👥', 'social', 'referral_count', 1, 100),
  ('ACH_SCOUT', '敏腕スカウト', '仲間を5人招待する', '🎯', 'social', 'referral_count', 5, 500)
ON CONFLICT (id) DO NOTHING;