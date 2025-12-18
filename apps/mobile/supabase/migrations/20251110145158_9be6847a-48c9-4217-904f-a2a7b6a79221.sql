-- Add profile_picture_url and bio columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN profile_picture_url TEXT,
ADD COLUMN bio TEXT;

-- Add constraint to limit bio length to 150 characters
ALTER TABLE public.profiles
ADD CONSTRAINT bio_length_check CHECK (char_length(bio) <= 150);