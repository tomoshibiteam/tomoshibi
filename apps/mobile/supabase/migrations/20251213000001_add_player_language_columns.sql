-- =============================================================================
-- Player Language UX: Add language preference columns
-- =============================================================================

-- 1. Add preferred_language to profiles table (user's default language)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'ja';

-- 2. Add quest_language to user_progress table (per-quest language selection)
ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS quest_language TEXT DEFAULT NULL;

-- Comment: quest_language is NULL by default, meaning "use preferred_language or fallback"
-- When user explicitly selects a language for a quest, it will be stored here.
