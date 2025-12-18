-- Change step column type from integer to numeric to support decimal step numbers like 4.1, 13.1, etc.
ALTER TABLE public.story_blocks 
ALTER COLUMN step TYPE numeric USING step::numeric;

-- Also update success_step column to numeric for consistency
ALTER TABLE public.story_blocks 
ALTER COLUMN success_step TYPE numeric USING success_step::numeric;