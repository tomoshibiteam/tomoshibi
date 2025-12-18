-- Add missing RLS policies for spot_story_messages table
-- This allows creators to insert and select spot story messages

-- Enable RLS if not already enabled
ALTER TABLE public.spot_story_messages ENABLE ROW LEVEL SECURITY;

-- Allow creators to INSERT spot_story_messages for spots they own
CREATE POLICY "Creators can insert spot_story_messages"
  ON public.spot_story_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.spots s
      JOIN public.quests q ON s.quest_id = q.id
      WHERE s.id = spot_id
        AND q.creator_id = auth.uid()
    )
  );

-- Allow creators to SELECT their own spot_story_messages
CREATE POLICY "Creators can select own spot_story_messages"
  ON public.spot_story_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.spots s
      JOIN public.quests q ON s.quest_id = q.id
      WHERE s.id = spot_story_messages.spot_id
        AND q.creator_id = auth.uid()
    )
  );

-- Allow creators to UPDATE their own spot_story_messages
CREATE POLICY "Creators can update own spot_story_messages"
  ON public.spot_story_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.spots s
      JOIN public.quests q ON s.quest_id = q.id
      WHERE s.id = spot_story_messages.spot_id
        AND q.creator_id = auth.uid()
    )
  );

-- Also allow players to read spot_story_messages (for gameplay)
CREATE POLICY "Players can read spot_story_messages"
  ON public.spot_story_messages FOR SELECT
  USING (true);
