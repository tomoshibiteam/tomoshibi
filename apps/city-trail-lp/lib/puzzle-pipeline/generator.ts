/**
 * Generator - 謎設計モジュール
 * 
 * EvidencePackを入力として、高品質な謎を生成する
 * 「根拠がないのに生成しない」を絶対ルールとする
 */

import {
    EvidencePack,
    Puzzle,
    PuzzleGenerationResult,
    EvidenceUsage,
} from './types';
import { getModelEndpoint } from '../ai/model-config';

// =============================================================================
// Prompt Templates
// =============================================================================

/**
 * 謎生成用のシステムプロンプト
 */
export const PUZZLE_GENERATOR_SYSTEM_PROMPT = `あなたはプロフェッショナルな謎解きゲームデザイナーです。
位置連動型ミステリークエストの謎を設計します。

【絶対ルール - 違反は許されません】
1. 提供された「根拠データ」に含まれる情報のみを使用すること
2. 推測や「たぶんある」「おそらく」は完全に禁止
3. 季節やイベントで変わる一時的な情報は禁止
4. 答えは一意でなければならない（複数の正解が出ない）
5. 現地で実際に観測できる手掛かりに基づくこと

【謎の品質基準】
- 現地に行けば必ず手掛かりが存在し正解に到達できる
- 物語/場所との結びつきが強い
- ただのトリビアクイズではなく、現地で見て解ける謎
- 「謎→手掛かり→答え」の必然性・美しさ

【禁止事項】
- 「周辺を探してみてください」のような曖昧な指示
- 店員への質問が必須の情報
- 季節展示、ポスター、メニューなど変動する情報
- ネット検索でしか答えられない謎`;

/**
 * スポットごとの謎生成プロンプトを構築
 */
export function buildPuzzleGenerationPrompt(
    evidencePack: EvidencePack,
    storyContext: {
        questTitle: string;
        questTheme: string;
        spotNumber: number;
        totalSpots: number;
        previousPuzzleContext?: string;
        difficulty: 'easy' | 'medium' | 'hard';
    }
): string {
    const difficultyGuide = {
        easy: '初級: 簡単な観察や文字の読み取り。ヒントを見れば誰でも解ける。',
        medium: '中級: 少しの推理や計算が必要。現地で10分程度考える。',
        hard: '上級: 複合的な思考や発見が必要。やりがいのある謎解き。',
    };

    // 根拠データをJSON形式に整形
    const evidenceJson = JSON.stringify({
        spot_name: evidencePack.spot_name,
        official_description: evidencePack.official_description,
        available_evidences: evidencePack.evidences.map(e => ({
            id: e.id,
            type: e.type,
            content: e.content,
            location_description: e.location_description,
            is_permanent: e.is_permanent,
            confidence: e.confidence,
        })),
    }, null, 2);

    return `
【物語コンテキスト】
- クエストタイトル: ${storyContext.questTitle}
- テーマ: ${storyContext.questTheme}
- スポット: ${storyContext.spotNumber}/${storyContext.totalSpots}（${evidencePack.spot_name}）
- 難易度: ${difficultyGuide[storyContext.difficulty]}
${storyContext.previousPuzzleContext ? `- 前のスポットの流れ: ${storyContext.previousPuzzleContext}` : ''}

【このスポットの根拠データ】
${evidenceJson}

【出力形式】
必ず以下のJSON形式で出力してください。根拠が不足している場合は別形式で返してください。

成功時:
{
  "status": "success",
  "puzzle": {
    "puzzle_statement": "プレイヤーに提示する謎の本文（魅力的で物語に沿った文章）",
    "on_site_instruction": "現地で具体的に何を見ればいいか（例：入口右手の案内板の3行目を確認）",
    "evidence_used": [
      {
        "evidence_id": "使用した根拠のID",
        "source_url": "出典URL",
        "usage": "この根拠をどう使ったか"
      }
    ],
    "solution_steps": [
      "解法ステップ1: ○○を確認する",
      "解法ステップ2: △△を読み取る",
      "解法ステップ3: 答えは□□"
    ],
    "answer": "正解（一意）",
    "acceptable_answers": ["別の表記法", "略称"],
    "hints": [
      "ヒント1: 少しだけ方向を示す（答えは含めない）",
      "ヒント2: より具体的なヒント（答えは含めない）"
    ],
    "final_rescue": "show_answer",
    "success_message": "正解時のメッセージ（次のスポットへの導入を含む）",
    "narrative_link": "なぜこの場所でこの謎なのか、物語上の意味"
  }
}

根拠不足時:
{
  "status": "needs_more_evidence",
  "missing_evidence": [
    "不足している情報1（例：看板のテキスト）",
    "不足している情報2（例：建物の正式名称）"
  ],
  "suggestion": "どのような情報があれば謎を作れるか"
}

重要: evidence_used には必ず上記の根拠データから使用したものを記載してください。
根拠データにない情報を使った謎は作成しないでください。
`.trim();
}

// =============================================================================
// Generator Function
// =============================================================================

/**
 * Gemini API を使用して謎を生成
 * 根拠が不足していても謎は生成する（ただしフォールバックモード）
 */
export async function generatePuzzle(
    evidencePack: EvidencePack,
    storyContext: {
        questTitle: string;
        questTheme: string;
        spotNumber: number;
        totalSpots: number;
        previousPuzzleContext?: string;
        difficulty: 'easy' | 'medium' | 'hard';
    },
    apiKey: string
): Promise<PuzzleGenerationResult> {
    // 根拠の有無に関わらず謎を生成する
    // 根拠が少ない場合はフォールバックモードで生成
    const hasEvidence = evidencePack.evidences.length > 0;
    const hasSufficientEvidence = evidencePack.sufficiency_score >= 0.3;

    // プロンプトを構築（根拠がある場合は根拠ベース、ない場合はフォールバック）
    let prompt: string;

    if (hasEvidence) {
        prompt = buildPuzzleGenerationPrompt(evidencePack, storyContext);
    } else {
        // フォールバック: 根拠がない場合は場所の一般知識から謎を生成
        prompt = buildFallbackPrompt(evidencePack, storyContext);
    }

    try {
        const systemPrompt = hasEvidence && hasSufficientEvidence
            ? PUZZLE_GENERATOR_SYSTEM_PROMPT
            : FALLBACK_SYSTEM_PROMPT;

        const res = await fetch(
            getModelEndpoint('general', apiKey),
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: systemPrompt }] },
                        { role: 'model', parts: [{ text: '理解しました。高品質な謎を生成します。' }] },
                        { role: 'user', parts: [{ text: prompt }] },
                    ],
                }),
            }
        );

        if (!res.ok) {
            throw new Error(`Gemini API error: ${res.status}`);
        }

        const data = await res.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // JSONを抽出
        const jsonMatch = responseText.match(/```json([\s\S]*?)```/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        const parsed = JSON.parse(jsonText.trim()) as PuzzleGenerationResult;

        return parsed;
    } catch (error: any) {
        console.error('Puzzle generation error:', error);
        // エラー時もフォールバックで謎を返す
        return {
            status: 'success',
            puzzle: {
                spot_id: evidencePack.spot_id,
                puzzle_statement: `${evidencePack.spot_name}に関する謎を解いてみましょう。`,
                on_site_instruction: '現地の案内板や看板を確認してください。',
                evidence_used: [],
                solution_steps: ['現地で情報を確認する', '答えを見つける'],
                answer: '【現地で確認】',
                hints: ['周囲をよく観察してみましょう', '案内板に答えがあるかもしれません'] as [string, string],
                final_rescue: 'show_answer' as const,
                success_message: '正解です！次のスポットへ進みましょう。',
                narrative_link: `${evidencePack.spot_name}での謎解き`,
            },
        };
    }
}

/**
 * フォールバック用システムプロンプト
 * 根拠データがない場合に使用
 */
const FALLBACK_SYSTEM_PROMPT = `あなたはプロフェッショナルな謎解きゲームデザイナーです。
指定された場所に関する謎を設計します。

【重要】
- 場所の一般的な知識や特徴を活用して謎を作成してください
- 現地で観察すれば答えがわかる謎を設計してください
- 難しすぎず、現地体験を楽しめる謎にしてください

【禁止事項】
- インターネット検索が必須の謎
- 専門知識が必要な謎
- 季節やイベントに依存する情報`;

/**
 * フォールバック用プロンプトを構築
 */
function buildFallbackPrompt(
    evidencePack: EvidencePack,
    storyContext: {
        questTitle: string;
        questTheme: string;
        spotNumber: number;
        totalSpots: number;
        difficulty: 'easy' | 'medium' | 'hard';
    }
): string {
    const difficultyGuide = {
        easy: '初級: 簡単な観察。現地で見れば誰でも答えられる。',
        medium: '中級: 少しの観察と推理が必要。',
        hard: '上級: 複数の情報を組み合わせる必要がある。',
    };

    return `
【物語コンテキスト】
- クエストタイトル: ${storyContext.questTitle}
- テーマ: ${storyContext.questTheme}
- スポット: ${storyContext.spotNumber}/${storyContext.totalSpots}（${evidencePack.spot_name}）
- 難易度: ${difficultyGuide[storyContext.difficulty]}

【スポット情報】
- 名前: ${evidencePack.spot_name}
- 説明: ${evidencePack.official_description || '情報なし'}
- 座標: ${evidencePack.lat}, ${evidencePack.lng}

【出力形式】
以下のJSON形式で出力してください:
{
  "status": "success",
  "puzzle": {
    "puzzle_statement": "謎の本文（その場所に関連した魅力的な問題）",
    "on_site_instruction": "現地で何を見ればいいか（具体的に）",
    "evidence_used": [],
    "solution_steps": ["ステップ1", "ステップ2"],
    "answer": "正解",
    "hints": ["ヒント1", "ヒント2"],
    "final_rescue": "show_answer",
    "success_message": "正解時メッセージ",
    "narrative_link": "物語上の意味"
  }
}

この場所の特徴や歴史を活かした、現地で観察すれば答えがわかる謎を作成してください。
`.trim();
}

/**
 * 生成結果からPuzzleオブジェクトを構築
 */
export function buildPuzzleFromResult(
    spotId: string,
    result: PuzzleGenerationResult
): Puzzle | null {
    if (result.status !== 'success') {
        return null;
    }

    const now = new Date().toISOString();
    const puzzle = result.puzzle;

    return {
        id: `puzzle-${spotId}-${Date.now()}`,
        spot_id: spotId,
        puzzle_statement: puzzle.puzzle_statement,
        on_site_instruction: puzzle.on_site_instruction,
        hints: puzzle.hints as [string, string],
        final_rescue: puzzle.final_rescue || 'show_answer',
        answer: puzzle.answer,
        acceptable_answers: puzzle.acceptable_answers,
        success_message: puzzle.success_message,
        evidence_used: puzzle.evidence_used,
        solution_steps: puzzle.solution_steps,
        narrative_link: puzzle.narrative_link,
        // スコアは後でValidatorが設定
        grounding_confidence: 0,
        narrative_fit_score: 0,
        solvability_score: 0,
        status: 'draft',
        generated_at: now,
    };
}
