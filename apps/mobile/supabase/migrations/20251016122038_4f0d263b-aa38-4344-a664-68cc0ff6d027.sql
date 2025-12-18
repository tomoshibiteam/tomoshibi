-- Add foreign key constraint from case_applications to profiles
ALTER TABLE public.case_applications
DROP CONSTRAINT IF EXISTS case_applications_user_id_fkey;

ALTER TABLE public.case_applications
ADD CONSTRAINT case_applications_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;