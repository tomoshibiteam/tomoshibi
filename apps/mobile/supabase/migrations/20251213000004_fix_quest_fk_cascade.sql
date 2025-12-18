-- =============================================================================
-- Fix FK constraints to allow quest deletion
-- =============================================================================

-- Drop and recreate purchases.quest_id FK with CASCADE
ALTER TABLE public.purchases
  DROP CONSTRAINT IF EXISTS purchases_quest_id_fkey;

ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_quest_id_fkey
  FOREIGN KEY (quest_id) REFERENCES public.quests(id) ON DELETE CASCADE;

-- Also fix user_progress if it references quests without CASCADE
ALTER TABLE public.user_progress
  DROP CONSTRAINT IF EXISTS user_progress_quest_id_fkey;

ALTER TABLE public.user_progress
  ADD CONSTRAINT user_progress_quest_id_fkey
  FOREIGN KEY (quest_id) REFERENCES public.quests(id) ON DELETE CASCADE;

-- Fix quest_reviews if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quest_reviews') THEN
    ALTER TABLE public.quest_reviews
      DROP CONSTRAINT IF EXISTS quest_reviews_quest_id_fkey;
    
    ALTER TABLE public.quest_reviews
      ADD CONSTRAINT quest_reviews_quest_id_fkey
      FOREIGN KEY (quest_id) REFERENCES public.quests(id) ON DELETE CASCADE;
  END IF;
END$$;
