/**
 * Validator - 自動検証モジュール
 * 
 * 生成された謎が品質基準を満たしているかを検証
 */

import {
    Puzzle,
    PuzzleStatus,
    EvidencePack,
    ValidationResult,
    ValidationError,
    PublishMode,
    QUALITY_REQUIREMENTS,
} from './types';

// =============================================================================
// Validation Checks
// =============================================================================

/**
 * Evidence参照があるかチェック
 */
function checkEvidenceReference(puzzle: Puzzle): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!puzzle.evidence_used || puzzle.evidence_used.length === 0) {
        errors.push({
            code: 'NO_EVIDENCE',
            message: '謎に根拠データへの参照がありません。現地で確認できる手掛かりを使用してください。',
            severity: 'error',
        });
    }

    // 各根拠にsource_urlがあるか
    for (const evidence of puzzle.evidence_used) {
        if (!evidence.source_url) {
            errors.push({
                code: 'MISSING_SOURCE_URL',
                message: `根拠「${evidence.evidence_id}」に出典URLがありません。`,
                severity: 'warning',
            });
        }
    }

    return errors;
}

/**
 * 答えの一意性チェック
 */
function checkAnswerUniqueness(puzzle: Puzzle): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!puzzle.answer || puzzle.answer.trim() === '') {
        errors.push({
            code: 'EMPTY_ANSWER',
            message: '答えが設定されていません。',
            severity: 'error',
        });
        return errors;
    }

    // 答えが曖昧すぎないか（1文字だけ、数字だけの単純な答えは警告）
    if (puzzle.answer.length === 1 && /\d/.test(puzzle.answer)) {
        errors.push({
            code: 'AMBIGUOUS_ANSWER',
            message: '答えが単一の数字だけでは偶然の正解が起きやすいです。',
            severity: 'warning',
        });
    }

    return errors;
}

/**
 * 現地指示の明確性チェック
 */
function checkOnSiteInstruction(puzzle: Puzzle): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!puzzle.on_site_instruction || puzzle.on_site_instruction.trim() === '') {
        errors.push({
            code: 'MISSING_INSTRUCTION',
            message: '現地での指示が設定されていません。プレイヤーが何を見ればいいか明記してください。',
            severity: 'error',
        });
        return errors;
    }

    // 曖昧な表現のチェック
    const vaguePatterns = [
        /周辺を?探して/,
        /どこかに/,
        /たぶん/,
        /かもしれません/,
        /おそらく/,
        /見つけて/,
    ];

    for (const pattern of vaguePatterns) {
        if (pattern.test(puzzle.on_site_instruction)) {
            errors.push({
                code: 'VAGUE_INSTRUCTION',
                message: `現地指示が曖昧です: 「${puzzle.on_site_instruction.substring(0, 50)}...」具体的な位置や対象物を指定してください。`,
                severity: 'warning',
            });
            break;
        }
    }

    return errors;
}

/**
 * ヒントの有効性チェック
 */
function checkHints(puzzle: Puzzle): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!puzzle.hints || puzzle.hints.length < 2) {
        errors.push({
            code: 'INSUFFICIENT_HINTS',
            message: '段階ヒントが不足しています（2つ必要）。',
            severity: 'error',
        });
        return errors;
    }

    // ヒントが答えをそのまま含んでいないか
    for (let i = 0; i < puzzle.hints.length; i++) {
        if (puzzle.hints[i].includes(puzzle.answer)) {
            errors.push({
                code: 'HINT_REVEALS_ANSWER',
                message: `ヒント${i + 1}が答えをそのまま含んでいます。`,
                severity: 'error',
            });
        }
    }

    // 最終救済の設定確認
    if (!puzzle.final_rescue) {
        errors.push({
            code: 'NO_FINAL_RESCUE',
            message: '最終救済（答え表示またはスキップ）が設定されていません。',
            severity: 'warning',
        });
    }

    return errors;
}

/**
 * 物語との接続チェック
 */
function checkNarrativeLink(puzzle: Puzzle): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!puzzle.narrative_link || puzzle.narrative_link.trim() === '') {
        errors.push({
            code: 'MISSING_NARRATIVE',
            message: '物語との接続が設定されていません。なぜこの場所でこの謎なのか説明してください。',
            severity: 'warning',
        });
    } else if (puzzle.narrative_link.length < 20) {
        errors.push({
            code: 'WEAK_NARRATIVE',
            message: '物語との接続が短すぎます。もう少し詳しく説明してください。',
            severity: 'warning',
        });
    }

    return errors;
}

// =============================================================================
// Score Calculation
// =============================================================================

/**
 * Grounding Confidence スコアを計算
 * Evidence の信頼度平均
 */
function calculateGroundingConfidence(
    puzzle: Puzzle,
    evidencePack?: EvidencePack
): number {
    if (!puzzle.evidence_used || puzzle.evidence_used.length === 0) {
        return 0;
    }

    if (!evidencePack) {
        // EvidencePackがない場合は、参照数に基づく簡易計算
        return Math.min(puzzle.evidence_used.length / 3, 1) * 0.7;
    }

    // 使用した根拠の信頼度を取得
    let totalConfidence = 0;
    let count = 0;

    for (const usage of puzzle.evidence_used) {
        const evidence = evidencePack.evidences.find(e => e.id === usage.evidence_id);
        if (evidence) {
            totalConfidence += evidence.confidence;
            count++;
        }
    }

    return count > 0 ? totalConfidence / count : 0;
}

/**
 * Narrative Fit スコアを計算
 */
function calculateNarrativeFitScore(puzzle: Puzzle): number {
    if (!puzzle.narrative_link) return 0;

    // 長さに基づく基本スコア
    const lengthScore = Math.min(puzzle.narrative_link.length / 100, 1);

    // キーワードに基づくボーナス
    const narrativeKeywords = [
        '物語', 'ストーリー', '伏線', '謎', '秘密', '歴史', '伝説',
        '人物', 'キャラクター', '目的', '理由', 'なぜ', 'ここで',
    ];

    const keywordCount = narrativeKeywords.filter(
        kw => puzzle.narrative_link.includes(kw)
    ).length;
    const keywordBonus = Math.min(keywordCount / 3, 0.3);

    return Math.min(lengthScore * 0.7 + keywordBonus, 1);
}

/**
 * Solvability スコアを計算
 */
function calculateSolvabilityScore(puzzle: Puzzle): number {
    let score = 1.0;

    // 答えがない場合
    if (!puzzle.answer) return 0;

    // 解法手順がない場合
    if (!puzzle.solution_steps || puzzle.solution_steps.length === 0) {
        score -= 0.3;
    }

    // ヒントが不足
    if (!puzzle.hints || puzzle.hints.length < 2) {
        score -= 0.2;
    }

    // 現地指示がない
    if (!puzzle.on_site_instruction) {
        score -= 0.3;
    }

    // 最終救済がない
    if (!puzzle.final_rescue) {
        score -= 0.1;
    }

    return Math.max(score, 0);
}

// =============================================================================
// Main Validator Function
// =============================================================================

/**
 * 謎を検証してスコアとエラーを返す
 */
export function validatePuzzle(
    puzzle: Puzzle,
    evidencePack?: EvidencePack
): ValidationResult {
    // 全チェックを実行
    const allErrors: ValidationError[] = [
        ...checkEvidenceReference(puzzle),
        ...checkAnswerUniqueness(puzzle),
        ...checkOnSiteInstruction(puzzle),
        ...checkHints(puzzle),
        ...checkNarrativeLink(puzzle),
    ];

    // エラーと警告を分離
    const errors = allErrors.filter(e => e.severity === 'error');
    const warnings = allErrors.filter(e => e.severity === 'warning');

    // スコア計算
    const groundingConfidence = calculateGroundingConfidence(puzzle, evidencePack);
    const narrativeFitScore = calculateNarrativeFitScore(puzzle);
    const solvabilityScore = calculateSolvabilityScore(puzzle);

    // 検証通過判定
    const passed = errors.length === 0;

    // 推奨アクション
    let recommendedAction: 'regenerate' | 'add_evidence' | 'manual_review' | undefined;

    if (errors.some(e => e.code === 'NO_EVIDENCE')) {
        recommendedAction = 'add_evidence';
    } else if (errors.length > 0) {
        recommendedAction = 'regenerate';
    } else if (warnings.length > 2) {
        recommendedAction = 'manual_review';
    }

    return {
        passed,
        grounding_confidence: groundingConfidence,
        narrative_fit_score: narrativeFitScore,
        solvability_score: solvabilityScore,
        errors,
        warnings,
        recommended_action: recommendedAction,
    };
}

/**
 * 公開モードに対する品質ゲートチェック
 */
export function checkQualityGate(
    puzzle: Puzzle,
    mode: PublishMode,
    evidencePack?: EvidencePack
): {
    canPublish: boolean;
    validationResult: ValidationResult;
    failureReasons: string[];
} {
    const requirements = QUALITY_REQUIREMENTS[mode];
    const validationResult = validatePuzzle(puzzle, evidencePack);
    const failureReasons: string[] = [];

    // 検証必須の場合
    if (requirements.requires_validation && !validationResult.passed) {
        failureReasons.push('検証に失敗しました');
    }

    // スコア要件チェック
    if (validationResult.grounding_confidence < requirements.min_grounding_confidence) {
        failureReasons.push(
            `現地裏付けスコアが不足: ${(validationResult.grounding_confidence * 100).toFixed(0)}% / 必要: ${requirements.min_grounding_confidence * 100}%`
        );
    }

    if (validationResult.narrative_fit_score < requirements.min_narrative_fit_score) {
        failureReasons.push(
            `物語結びつきスコアが不足: ${(validationResult.narrative_fit_score * 100).toFixed(0)}% / 必要: ${requirements.min_narrative_fit_score * 100}%`
        );
    }

    if (validationResult.solvability_score < requirements.min_solvability_score) {
        failureReasons.push(
            `解決可能性スコアが不足: ${(validationResult.solvability_score * 100).toFixed(0)}% / 必要: ${requirements.min_solvability_score * 100}%`
        );
    }

    return {
        canPublish: failureReasons.length === 0,
        validationResult,
        failureReasons,
    };
}

/**
 * 謎のステータスを更新
 */
export function updatePuzzleStatus(
    puzzle: Puzzle,
    validationResult: ValidationResult
): Puzzle {
    let status: PuzzleStatus;

    if (validationResult.errors.some(e => e.code === 'NO_EVIDENCE')) {
        status = 'needs_more_evidence';
    } else if (!validationResult.passed) {
        status = 'needs_regeneration';
    } else {
        status = 'validated';
    }

    return {
        ...puzzle,
        status,
        grounding_confidence: validationResult.grounding_confidence,
        narrative_fit_score: validationResult.narrative_fit_score,
        solvability_score: validationResult.solvability_score,
        validation_errors: [...validationResult.errors, ...validationResult.warnings],
        validated_at: new Date().toISOString(),
    };
}
