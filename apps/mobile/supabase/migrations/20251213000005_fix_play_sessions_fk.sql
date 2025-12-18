-- =============================================================================
-- Fix play_sessions FK constraint to allow quest deletion
-- =============================================================================

-- Drop old constraint and add with CASCADE
ALTER TABLE public.play_sessions
  DROP CONSTRAINT IF EXISTS play_sessions_quest_id_fkey;

ALTER TABLE public.play_sessions
  ADD CONSTRAINT play_sessions_quest_id_fkey
  FOREIGN KEY (quest_id) REFERENCES public.quests(id) ON DELETE CASCADE;

-- Add DELETE policy for creators to delete play_sessions for their quests
CREATE POLICY "Creators can delete play_sessions for their quests"
  ON public.play_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = play_sessions.quest_id
        AND q.creator_id = auth.uid()
    )
  );
