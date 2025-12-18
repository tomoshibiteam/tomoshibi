-- Drop the existing policy that only allows users to view their own reports
DROP POLICY IF EXISTS "Users can view their own reports" ON public.daily_reports;

-- Create a new policy that allows users to view their own reports AND their friends' reports
CREATE POLICY "Users can view their own and friends' reports"
ON public.daily_reports
FOR SELECT
USING (
  -- User can see their own reports
  auth.uid() = user_id 
  OR
  -- User can see reports from accepted friends
  EXISTS (
    SELECT 1 
    FROM public.friendships
    WHERE status = 'accepted' 
    AND (
      (requester_id = auth.uid() AND receiver_id = daily_reports.user_id) 
      OR 
      (receiver_id = auth.uid() AND requester_id = daily_reports.user_id)
    )
  )
);