-- Create achievements table to track user achievements
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Users can view their own achievements
CREATE POLICY "Users can view their own achievements"
ON public.achievements
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own achievements
CREATE POLICY "Users can insert their own achievements"
ON public.achievements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_achievements_user_id ON public.achievements(user_id);

-- Create case_applications table to track applications to cases
CREATE TABLE public.case_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS for case_applications
ALTER TABLE public.case_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view their own applications"
ON public.case_applications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own applications
CREATE POLICY "Users can insert their own applications"
ON public.case_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins/operators can view all applications (for now, we'll add this capability later)
CREATE POLICY "Anyone can view all applications for admin dashboard"
ON public.case_applications
FOR SELECT
USING (true);

-- Create index for better performance
CREATE INDEX idx_case_applications_user_id ON public.case_applications(user_id);
CREATE INDEX idx_case_applications_case_id ON public.case_applications(case_id);

-- Enable realtime for case_applications so admin can see new applications
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_applications;