-- Add character_image_url column to story_blocks table
ALTER TABLE public.story_blocks 
ADD COLUMN character_image_url text;