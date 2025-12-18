-- =============================================================================
-- Gameplay Analytics: Events and User Feedback tables
-- =============================================================================

-- 1. Create gameplay_events table for tracking user actions
CREATE TABLE IF NOT EXISTS public.gameplay_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  quest_id UUID REFERENCES public.quests(id) ON DELETE CASCADE,
  spot_id UUID REFERENCES public.spots(id) ON DELETE SET NULL,
  session_id TEXT,                    -- Browser session identifier
  event_type TEXT NOT NULL,           -- Event type (see below)
  event_data JSONB DEFAULT '{}',      -- Additional context
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Event types:
-- session_start, session_resume, session_complete, session_abandon
-- mode_travel, mode_story, mode_puzzle, mode_epilogue
-- arrival_attempt, arrival_success, arrival_fail
-- nav_open
-- puzzle_submit, puzzle_hint, puzzle_reveal
-- feedback_submit

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_gameplay_events_quest ON public.gameplay_events(quest_id);
CREATE INDEX IF NOT EXISTS idx_gameplay_events_user ON public.gameplay_events(user_id);
CREATE INDEX IF NOT EXISTS idx_gameplay_events_type ON public.gameplay_events(event_type);
CREATE INDEX IF NOT EXISTS idx_gameplay_events_created ON public.gameplay_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gameplay_events_session ON public.gameplay_events(session_id);

-- 2. Create user_feedback table for "I'm stuck" reports
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  quest_id UUID REFERENCES public.quests(id) ON DELETE CASCADE,
  spot_id UUID REFERENCES public.spots(id) ON DELETE SET NULL,
  category TEXT NOT NULL,             -- lost, gps_error, puzzle_hard, answer_rejected, ui_confusing, other
  message TEXT,                       -- Optional user message
  context JSONB DEFAULT '{}',         -- Current mode, spot index, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_quest ON public.user_feedback(quest_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_category ON public.user_feedback(category);

-- =============================================================================
-- RLS Policies
-- =============================================================================

-- Enable RLS
ALTER TABLE public.gameplay_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- gameplay_events: users can insert their own, creators can read for their quests
CREATE POLICY "Users can insert their own events"
  ON public.gameplay_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Creators can view events for their quests"
  ON public.gameplay_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = gameplay_events.quest_id
        AND q.creator_id = auth.uid()
    )
  );

-- user_feedback: users can insert, creators can read for their quests
CREATE POLICY "Users can submit feedback"
  ON public.user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Creators can view feedback for their quests"
  ON public.user_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = user_feedback.quest_id
        AND q.creator_id = auth.uid()
    )
  );
