/**
 * Evidence-Based Puzzle Generation Pipeline
 * 
 * 高品質なAI謎生成のための統合モジュール
 * 「根拠がないのに生成しない」を絶対ルールとする
 * 
 * Usage:
 * ```typescript
 * import { 
 *   retrieveEvidence, 
 *   generatePuzzle, 
 *   validatePuzzle,
 *   checkQualityGate 
 * } from './lib/puzzle-pipeline';
 * 
 * // Step 1: 根拠収集
 * const evidencePack = await retrieveEvidence(spotId, spotName, lat, lng);
 * 
 * // Step 2: 謎生成
 * const result = await generatePuzzle(evidencePack, storyContext, apiKey);
 * 
 * // Step 3: 検証
 * const validation = validatePuzzle(puzzle, evidencePack);
 * 
 * // 品質ゲートチェック
 * const gate = checkQualityGate(puzzle, 'share', evidencePack);
 * ```
 */

// Types
export * from './types';

// Retriever - 根拠収集
export {
    retrieveEvidence,
    retrieveEvidencesForSpots
} from './retriever';

// Generator - 謎設計
export {
    generatePuzzle,
    buildPuzzleFromResult,
    buildPuzzleGenerationPrompt,
    PUZZLE_GENERATOR_SYSTEM_PROMPT
} from './generator';

// Validator - 自動検証
export {
    validatePuzzle,
    checkQualityGate,
    updatePuzzleStatus
} from './validator';

// Layton Types (new)
export * from './layton-types';

// Layton Pipeline (new)
export { generateLaytonQuest } from './layton-pipeline';
export { selectMotifs } from './step1-motif';
export { createMainPlot, buildStoryContext } from './step2-plot';
export { generateSpotPuzzle, generateMetaPuzzle } from './step3-puzzle';
export { validateQuest, getRegenerationTargets } from './step4-validate';

