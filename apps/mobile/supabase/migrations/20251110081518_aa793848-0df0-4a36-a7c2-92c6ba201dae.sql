-- Create function to award referral bonus AP
CREATE OR REPLACE FUNCTION public.award_referral_bonus(
  referrer_user_id uuid,
  bonus_ap integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add AP to the referrer's profile
  UPDATE public.profiles
  SET ap = ap + bonus_ap
  WHERE id = referrer_user_id;
END;
$$;