-- Create storage bucket for investigation photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('investigation-photos', 'investigation-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Add image_url column to daily_reports table
ALTER TABLE public.daily_reports
ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage policies for investigation photos
CREATE POLICY "Investigation photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'investigation-photos');

CREATE POLICY "Users can upload their own investigation photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'investigation-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own investigation photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'investigation-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own investigation photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'investigation-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);