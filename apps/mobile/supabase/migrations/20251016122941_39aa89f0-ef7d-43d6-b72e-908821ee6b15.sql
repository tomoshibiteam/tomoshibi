-- Add tool levels and Investigation Points to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ip integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS magnifying_glass_level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS lantern_level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS compass_level integer DEFAULT 1;