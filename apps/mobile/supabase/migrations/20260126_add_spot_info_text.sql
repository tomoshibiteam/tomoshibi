/* 
  Migration to add spot_info_text column to spot_details table.
  This allows storing non-story, factual information about the spot itself.
*/

ALTER TABLE public.spot_details
ADD COLUMN IF NOT EXISTS spot_info_text TEXT;

COMMENT ON COLUMN public.spot_details.spot_info_text IS 'Factual information about the spot, separate from story narrative.';
