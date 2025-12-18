-- Create events table (ゲームの一覧管理)
CREATE TABLE public.events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  key_visual_url TEXT,
  synopsis TEXT NOT NULL,
  location TEXT NOT NULL,
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
  status TEXT NOT NULL DEFAULT '受付中' CHECK (status IN ('受付中', '近日公開', '終了')),
  start_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create story_blocks table (ゲームの台本)
CREATE TABLE public.story_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  character_name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  image_url TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('message', 'puzzle_input', 'gps_check', 'gimmick_check')),
  correct_answer TEXT,
  target_location POINT,
  success_step INTEGER,
  failure_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, step)
);

-- Create user_progress table (ユーザーのセーブデータ)
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events (誰でも閲覧可能)
CREATE POLICY "Anyone can view events"
  ON public.events
  FOR SELECT
  USING (true);

-- RLS Policies for story_blocks (誰でも閲覧可能)
CREATE POLICY "Anyone can view story blocks"
  ON public.story_blocks
  FOR SELECT
  USING (true);

-- RLS Policies for user_progress
CREATE POLICY "Users can view their own progress"
  ON public.user_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_story_blocks_event_step ON public.story_blocks(event_id, step);
CREATE INDEX idx_user_progress_user_event ON public.user_progress(user_id, event_id);

-- Add trigger for updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();