-- Generate referral codes for existing users who don't have one
UPDATE public.profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;