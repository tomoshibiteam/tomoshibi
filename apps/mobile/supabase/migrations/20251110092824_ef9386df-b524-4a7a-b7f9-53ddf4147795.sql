-- Drop the trigger first
DROP TRIGGER IF EXISTS set_user_referral_code ON public.profiles;

-- Drop the functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.set_referral_code() CASCADE;
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;
DROP FUNCTION IF EXISTS public.award_referral_bonus(uuid, integer) CASCADE;