-- Add tutorial completion flag to profiles table
ALTER TABLE public.profiles
ADD COLUMN has_completed_tutorial boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.has_completed_tutorial IS 'Indicates whether the user has completed the initial tutorial';