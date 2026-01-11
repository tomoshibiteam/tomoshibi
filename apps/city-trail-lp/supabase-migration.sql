-- Add new JSONB columns for enhanced quest data editor
-- Run this migration in Supabase SQL Editor

-- 1. Add main_plot to quests table
ALTER TABLE quests 
ADD COLUMN IF NOT EXISTS main_plot JSONB;

COMMENT ON COLUMN quests.main_plot IS 'Main plot structure: {premise, goal, antagonist, finalReveal}';

-- 2. Add enhanced fields to spot_details table
ALTER TABLE spot_details 
ADD COLUMN IF NOT EXISTS puzzle_config JSONB,
ADD COLUMN IF NOT EXISTS lore_card JSONB,
ADD COLUMN IF NOT EXISTS reward JSONB,
ADD COLUMN IF NOT EXISTS scene_settings JSONB;

COMMENT ON COLUMN spot_details.puzzle_config IS 'Puzzle configuration: {puzzleType, difficulty, solutionSteps, hints}';
COMMENT ON COLUMN spot_details.lore_card IS 'Lore card: {narrativeText, usedFacts, playerMaterial}';
COMMENT ON COLUMN spot_details.reward IS 'Spot reward: {loreReveal, plotKey, nextHook}';
COMMENT ON COLUMN spot_details.scene_settings IS 'Scene settings: {sceneRole, linkingRationale}';

-- 3. Add meta_puzzle to story_timelines table
ALTER TABLE story_timelines 
ADD COLUMN IF NOT EXISTS meta_puzzle JSONB;

COMMENT ON COLUMN story_timelines.meta_puzzle IS 'Meta puzzle (final puzzle): {keys, questionText, finalAnswer, truthConnection}';

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name IN ('quests', 'spot_details', 'story_timelines')
  AND column_name IN ('main_plot', 'puzzle_config', 'lore_card', 'reward', 'scene_settings', 'meta_puzzle')
ORDER BY table_name, column_name;
