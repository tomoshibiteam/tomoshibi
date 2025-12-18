-- Update storage policies for profile pictures
-- Allow authenticated users to upload their own profile pictures
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'investigation-photos' 
  AND (storage.foldername(name))[1] = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow public read access to profile pictures
CREATE POLICY "Profile pictures are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'investigation-photos' 
  AND (storage.foldername(name))[1] = 'profile-pictures'
);

-- Allow users to update their own profile pictures
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'investigation-photos' 
  AND (storage.foldername(name))[1] = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to delete their own profile pictures
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'investigation-photos' 
  AND (storage.foldername(name))[1] = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[2]
);