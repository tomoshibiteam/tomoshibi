-- Fix #1: Add admin access policy to profiles table
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix #2: Configure storage bucket with file type and size restrictions
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  file_size_limit = 5242880  -- 5MB in bytes
WHERE id = 'investigation-photos';

-- Fix #5: Make storage bucket private for better security
UPDATE storage.buckets 
SET public = false 
WHERE id = 'investigation-photos';

-- Add missing RLS policies for storage access
CREATE POLICY "Users can view their own investigation photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'investigation-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all investigation photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'investigation-photos' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);