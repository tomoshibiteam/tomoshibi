-- =============================================================================
-- Add DELETE policies for creators to manage their content
-- =============================================================================

-- Quests: creators can delete their own quests
CREATE POLICY "Creators can delete own quests"
  ON public.quests FOR DELETE
  USING (auth.uid() = creator_id);

-- Spots: creators can delete spots on their quests
CREATE POLICY "Creators can delete own spots"
  ON public.spots FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = spots.quest_id
        AND q.creator_id = auth.uid()
    )
  );

-- Spot details: creators can delete spot_details for their spots
CREATE POLICY "Creators can delete own spot_details"
  ON public.spot_details FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.spots s
      JOIN public.quests q ON q.id = s.quest_id
      WHERE s.id = spot_details.spot_id
        AND q.creator_id = auth.uid()
    )
  );

-- Story timelines: creators can delete story_timelines for their quests
CREATE POLICY "Creators can delete own story_timelines"
  ON public.story_timelines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = story_timelines.quest_id
        AND q.creator_id = auth.uid()
    )
  );

-- Spot story messages: creators can delete messages for their spots
CREATE POLICY "Creators can delete own spot_story_messages"
  ON public.spot_story_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.spots s
      JOIN public.quests q ON q.id = s.quest_id
      WHERE s.id = spot_story_messages.spot_id
        AND q.creator_id = auth.uid()
    )
  );
