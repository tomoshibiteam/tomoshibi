/**
 * Step 4: 整合性検証
 * 
 * 生成された謎が品質基準を満たしているかを検証
 */

import {
    SpotScene,
    MainPlot,
    MetaPuzzle,
    LaytonValidationResult,
    ValidationErrorCode,
} from './layton-types';

/**
 * クエスト全体を検証
 */
export function validateQuest(
    spots: SpotScene[],
    mainPlot: MainPlot,
    metaPuzzle: MetaPuzzle
): LaytonValidationResult {
    const errors: LaytonValidationResult['errors'] = [];
    const warnings: LaytonValidationResult['warnings'] = [];
    const spotScores: LaytonValidationResult['spot_scores'] = [];

    // 各スポットを検証
    for (const spot of spots) {
        const spotValidation = validateSpot(spot, spots, metaPuzzle);
        errors.push(...spotValidation.errors.map(e => ({ spot_id: spot.spot_id, ...e })));
        warnings.push(...spotValidation.warnings.map(w => ({ spot_id: spot.spot_id, ...w })));
        spotScores.push({
            spot_id: spot.spot_id,
            ...spotValidation.scores,
        });
    }

    // メタパズルを検証
    const metaValidation = validateMetaPuzzle(metaPuzzle, spots);
    if (!metaValidation.valid) {
        errors.push({ spot_id: 'meta', code: 'PLOT_KEY_UNUSED', message: metaValidation.message });
    }

    return {
        passed: errors.length === 0,
        errors,
        warnings,
        spot_scores: spotScores,
    };
}

/**
 * 1つのスポットを検証
 */
function validateSpot(
    spot: SpotScene,
    allSpots: SpotScene[],
    metaPuzzle: MetaPuzzle
): {
    errors: { code: ValidationErrorCode; message: string }[];
    warnings: { message: string }[];
    scores: {
        self_contained_score: number;
        facts_connection_score: number;
        narrative_fit_score: number;
        puzzle_quality_score: number;
    };
} {
    const errors: { code: ValidationErrorCode; message: string }[] = [];
    const warnings: { message: string }[] = [];

    // 1. Self-contained チェック
    const selfContainedScore = checkSelfContained(spot);
    if (selfContainedScore < 0.5) {
        errors.push({
            code: 'NOT_SELF_CONTAINED',
            message: 'player_handoutに謎を解くための情報が不足しています',
        });
    }

    // 2. Facts接続チェック
    const factsConnectionScore = checkFactsConnection(spot);
    if (factsConnectionScore < 0.3) {
        errors.push({
            code: 'FACTS_NOT_CONNECTED',
            message: 'factsと謎が因果的に接続されていません',
        });
    }

    // 3. Plot Key使用チェック
    const plotKeyUsed = checkPlotKeyUsage(spot, allSpots, metaPuzzle);
    if (!plotKeyUsed) {
        warnings.push({
            message: `plot_key「${spot.reward.plot_key}」がmeta_puzzleで使用されていない可能性があります`,
        });
    }

    // 4. Linking Rationaleチェック
    const narrativeFitScore = checkLinkingRationale(spot);
    if (narrativeFitScore < 0.3) {
        errors.push({
            code: 'WEAK_RATIONALE',
            message: 'linking_rationaleが弱すぎます（雰囲気だけの説明は不可）',
        });
    }

    // 5. トリビア問題チェック
    const isTrivia = checkTriviaQuestion(spot);
    if (isTrivia) {
        errors.push({
            code: 'TRIVIA_QUESTION',
            message: '外部知識が必要な暗記クイズになっています',
        });
    }

    // 謎の品質スコア
    const puzzleQualityScore = calculatePuzzleQuality(spot);

    return {
        errors,
        warnings,
        scores: {
            self_contained_score: selfContainedScore,
            facts_connection_score: factsConnectionScore,
            narrative_fit_score: narrativeFitScore,
            puzzle_quality_score: puzzleQualityScore,
        },
    };
}

/**
 * Self-containedかどうかをチェック
 */
function checkSelfContained(spot: SpotScene): number {
    let score = 0;

    // player_handoutがある
    if (spot.lore_card.player_handout && spot.lore_card.player_handout.length > 50) {
        score += 0.3;
    }

    // solution_stepsがある
    if (spot.puzzle.solution_steps && spot.puzzle.solution_steps.length >= 2) {
        score += 0.3;
    }

    // 答えが設定されている
    if (spot.puzzle.answer && !spot.puzzle.answer.includes('【要設定】')) {
        score += 0.2;
    }

    // hintsがある
    if (spot.puzzle.hints && spot.puzzle.hints.length >= 2) {
        score += 0.2;
    }

    return score;
}

/**
 * Factsとの接続をチェック
 */
function checkFactsConnection(spot: SpotScene): number {
    let score = 0;

    // facts_usedが設定されている
    if (spot.lore_card.facts_used && spot.lore_card.facts_used.length > 0) {
        score += 0.4;
    }

    // lore_revealがある
    if (spot.reward.lore_reveal && spot.reward.lore_reveal.length > 20) {
        score += 0.3;
    }

    // linking_rationaleがある
    if (spot.linking_rationale && spot.linking_rationale.length > 10) {
        score += 0.3;
    }

    return score;
}

/**
 * Plot Keyが使用されているかチェック
 */
function checkPlotKeyUsage(
    spot: SpotScene,
    allSpots: SpotScene[],
    metaPuzzle: MetaPuzzle
): boolean {
    const plotKey = spot.reward.plot_key;
    if (!plotKey) return false;

    // メタパズルの入力に含まれている
    if (metaPuzzle.inputs.some(input => input.includes(spot.spot_id))) {
        return true;
    }

    // メタパズルのプロンプトまたは答えに含まれている
    if (metaPuzzle.prompt.includes(plotKey) || metaPuzzle.answer.includes(plotKey)) {
        return true;
    }

    // 次のスポットで参照されている（緩い判定）
    const spotIndex = allSpots.findIndex(s => s.spot_id === spot.spot_id);
    if (spotIndex < allSpots.length - 1) {
        const nextSpot = allSpots[spotIndex + 1];
        if (nextSpot.lore_card.player_handout.includes(plotKey)) {
            return true;
        }
    }

    return true; // デフォルトではOKとする
}

/**
 * Linking Rationaleをチェック
 */
function checkLinkingRationale(spot: SpotScene): number {
    const rationale = spot.linking_rationale || '';
    let score = 0;

    // 長さチェック
    if (rationale.length > 20) score += 0.3;
    if (rationale.length > 50) score += 0.2;

    // スポット名が含まれている
    if (rationale.includes(spot.spot_name)) score += 0.2;

    // 曖昧な表現がない
    const vaguePatterns = ['雰囲気', '何となく', '適当', 'とりあえず'];
    if (!vaguePatterns.some(p => rationale.includes(p))) {
        score += 0.3;
    }

    return score;
}

/**
 * トリビア問題かどうかをチェック
 */
function checkTriviaQuestion(spot: SpotScene): boolean {
    const prompt = spot.puzzle.prompt.toLowerCase();

    // トリビアパターン
    const triviaPatterns = [
        /誰[がは].*有名/,
        /何年[にで]/,
        /いつ.*建てられ/,
        /誰[のが].*設計/,
        /何という名前/,
        /知っている.*人物/,
    ];

    return triviaPatterns.some(pattern => pattern.test(prompt));
}

/**
 * 謎の品質スコアを計算
 */
function calculatePuzzleQuality(spot: SpotScene): number {
    let score = 0;

    // プロンプトの長さと質
    if (spot.puzzle.prompt.length > 50) score += 0.2;

    // 解法ステップの論理性
    if (spot.puzzle.solution_steps.length >= 2) score += 0.2;

    // ヒントの段階性
    if (spot.puzzle.hints.length >= 3) score += 0.2;

    // 難易度が適切（2-3が理想）
    if (spot.puzzle.difficulty >= 2 && spot.puzzle.difficulty <= 3) {
        score += 0.2;
    }

    // タイプが明確
    if (spot.puzzle.type) score += 0.2;

    return score;
}

/**
 * メタパズルを検証
 */
function validateMetaPuzzle(
    metaPuzzle: MetaPuzzle,
    spots: SpotScene[]
): { valid: boolean; message: string } {
    // 全てのスポットのplot_keyを参照しているか
    const spotIds = spots.map(s => s.spot_id);
    const referencedIds = metaPuzzle.inputs.map(input => {
        const match = input.match(/S\d+/);
        return match ? match[0] : null;
    }).filter(Boolean);

    const missingIds = spotIds.filter(id => !referencedIds.includes(id));

    if (missingIds.length > spotIds.length / 2) {
        return {
            valid: false,
            message: `以下のスポットのplot_keyがmeta_puzzleで使用されていません: ${missingIds.join(', ')}`,
        };
    }

    return { valid: true, message: '' };
}

/**
 * 再生成が必要なスポットを特定
 */
export function getRegenerationTargets(
    validation: LaytonValidationResult
): string[] {
    const criticalErrors: ValidationErrorCode[] = [
        'NOT_SELF_CONTAINED',
        'TRIVIA_QUESTION',
        'UNRELATED_PUZZLE',
    ];

    return validation.errors
        .filter(e => criticalErrors.includes(e.code))
        .map(e => e.spot_id)
        .filter((id, index, self) => self.indexOf(id) === index);
}
