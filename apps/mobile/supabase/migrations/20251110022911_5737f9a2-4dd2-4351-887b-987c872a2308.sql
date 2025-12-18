-- Add policy to allow authenticated users to view other users' basic profile information
-- This enables the friend search functionality
CREATE POLICY "Authenticated users can view basic profile info of other users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);