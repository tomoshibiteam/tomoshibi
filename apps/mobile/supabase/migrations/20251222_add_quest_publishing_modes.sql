-- =============================================================================
-- Quest Publishing System: Add mode, extended status, and quality checklist
-- =============================================================================

-- 1. Add mode column for quest visibility/sharing mode
-- PRIVATE: Personal use, instant play, no quality check required
-- SHARE: Limited sharing (invite-only), basic quality check required
-- PUBLISH: Public listing, full quality check + review required
ALTER TABLE public.quests
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'PRIVATE';

-- Add check constraint for mode
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quests_mode_check'
  ) THEN
    ALTER TABLE public.quests
    ADD CONSTRAINT quests_mode_check CHECK (mode IN ('PRIVATE', 'SHARE', 'PUBLISH'));
  END IF;
END $$;

-- 2. Update status constraint to include new statuses
-- Drop existing constraint if it exists
ALTER TABLE public.quests DROP CONSTRAINT IF EXISTS quests_status_check;

-- Add updated constraint with new status values
ALTER TABLE public.quests
ADD CONSTRAINT quests_status_check 
CHECK (status IN ('draft', 'ready_for_share', 'ready_for_publish', 'pending_review', 'published', 'rejected'));

-- 3. Add quality_checklist JSONB column
-- Structure: { "item_id": { "completed": boolean, "completedAt": timestamp, "completedBy": userId } }
ALTER TABLE public.quests
ADD COLUMN IF NOT EXISTS quality_checklist JSONB DEFAULT '{}'::jsonb;

-- 4. Add share_token for limited sharing URLs (SHARE mode)
ALTER TABLE public.quests
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Create index for share_token lookup
CREATE INDEX IF NOT EXISTS idx_quests_share_token ON public.quests(share_token) WHERE share_token IS NOT NULL;

-- 5. Add share settings JSONB for SHARE mode configuration
-- Structure: { "maxParticipants": number, "expiresAt": timestamp, "requiresApproval": boolean }
ALTER TABLE public.quests
ADD COLUMN IF NOT EXISTS share_settings JSONB DEFAULT '{}'::jsonb;

-- 6. Migrate existing data
-- All existing 'draft' quests become PRIVATE mode
UPDATE public.quests SET mode = 'PRIVATE' WHERE mode IS NULL AND status = 'draft';

-- All existing 'published' quests become PUBLISH mode
UPDATE public.quests SET mode = 'PUBLISH' WHERE mode IS NULL AND status = 'published';

-- All existing 'pending_review' quests become PUBLISH mode
UPDATE public.quests SET mode = 'PUBLISH' WHERE mode IS NULL AND status = 'pending_review';

-- Set default mode for any remaining NULL values
UPDATE public.quests SET mode = 'PRIVATE' WHERE mode IS NULL;

-- 7. Add RLS policy for shared quests (SHARE mode with valid token)
CREATE POLICY "Anyone can view shared quests with token"
  ON public.quests FOR SELECT
  USING (
    mode = 'SHARE' 
    AND share_token IS NOT NULL 
    AND status IN ('ready_for_share', 'published')
  );

-- 8. Add comment for documentation
COMMENT ON COLUMN public.quests.mode IS 'Quest visibility mode: PRIVATE (personal), SHARE (limited), PUBLISH (public)';
COMMENT ON COLUMN public.quests.quality_checklist IS 'JSONB storing quality check completion status for each checklist item';
COMMENT ON COLUMN public.quests.share_token IS 'Unique token for limited sharing URLs in SHARE mode';
COMMENT ON COLUMN public.quests.share_settings IS 'JSONB storing share configuration (max participants, expiry, approval required)';
