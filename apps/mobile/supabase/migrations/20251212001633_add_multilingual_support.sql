-- =============================================================================
-- AI Multilingual Authoring: Add translation tables and columns
-- =============================================================================

-- Create handle_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. Extend quests table with language support columns
ALTER TABLE public.quests
ADD COLUMN IF NOT EXISTS base_language TEXT DEFAULT 'ja',
ADD COLUMN IF NOT EXISTS supported_languages TEXT[] DEFAULT ARRAY['ja'];

-- 2. Create quest_translations table
CREATE TABLE IF NOT EXISTS public.quest_translations (
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  title TEXT,
  description TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (quest_id, lang)
);

-- 3. Create spot_translations table
CREATE TABLE IF NOT EXISTS public.spot_translations (
  spot_id UUID NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  name TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (spot_id, lang)
);

-- 4. Add language_dependency_level to spot_details
ALTER TABLE public.spot_details
ADD COLUMN IF NOT EXISTS language_dependency_level TEXT DEFAULT 'low'
CHECK (language_dependency_level IN ('low', 'medium', 'high'));

-- 5. Create puzzle_translations table (for spot_details)
CREATE TABLE IF NOT EXISTS public.puzzle_translations (
  spot_detail_id UUID NOT NULL REFERENCES public.spot_details(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  question_text TEXT,
  hint_text TEXT,
  success_message TEXT,
  translation_status TEXT DEFAULT 'draft' CHECK (translation_status IN ('draft', 'reviewed', 'untranslatable')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (spot_detail_id, lang)
);

-- 6. Create story_translations table
CREATE TABLE IF NOT EXISTS public.story_translations (
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  prologue TEXT,
  epilogue TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (quest_id, lang)
);

-- =============================================================================
-- RLS Policies
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE public.quest_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puzzle_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_translations ENABLE ROW LEVEL SECURITY;

-- quest_translations: anyone can read published, creators can manage their own
CREATE POLICY "Anyone can view published quest translations"
  ON public.quest_translations FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "Creators can manage their quest translations"
  ON public.quest_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = quest_translations.quest_id
        AND q.creator_id = auth.uid()
    )
  );

-- spot_translations: anyone can read, creators can manage
CREATE POLICY "Anyone can view spot translations"
  ON public.spot_translations FOR SELECT
  USING (TRUE);

CREATE POLICY "Creators can manage their spot translations"
  ON public.spot_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.spots s
      JOIN public.quests q ON q.id = s.quest_id
      WHERE s.id = spot_translations.spot_id
        AND q.creator_id = auth.uid()
    )
  );

-- puzzle_translations: anyone can read, creators can manage
CREATE POLICY "Anyone can view puzzle translations"
  ON public.puzzle_translations FOR SELECT
  USING (TRUE);

CREATE POLICY "Creators can manage their puzzle translations"
  ON public.puzzle_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.spot_details sd
      JOIN public.spots s ON s.id = sd.spot_id
      JOIN public.quests q ON q.id = s.quest_id
      WHERE sd.id = puzzle_translations.spot_detail_id
        AND q.creator_id = auth.uid()
    )
  );

-- story_translations: anyone can read, creators can manage
CREATE POLICY "Anyone can view story translations"
  ON public.story_translations FOR SELECT
  USING (TRUE);

CREATE POLICY "Creators can manage their story translations"
  ON public.story_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = story_translations.quest_id
        AND q.creator_id = auth.uid()
    )
  );

-- =============================================================================
-- Indexes for performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_quest_translations_lang ON public.quest_translations(lang);
CREATE INDEX IF NOT EXISTS idx_spot_translations_lang ON public.spot_translations(lang);
CREATE INDEX IF NOT EXISTS idx_puzzle_translations_lang ON public.puzzle_translations(lang);
CREATE INDEX IF NOT EXISTS idx_story_translations_lang ON public.story_translations(lang);

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================
CREATE TRIGGER update_quest_translations_updated_at
  BEFORE UPDATE ON public.quest_translations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_spot_translations_updated_at
  BEFORE UPDATE ON public.spot_translations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_puzzle_translations_updated_at
  BEFORE UPDATE ON public.puzzle_translations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_story_translations_updated_at
  BEFORE UPDATE ON public.story_translations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
