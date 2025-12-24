/**
 * Layton-Style Quest Generation Pipeline
 * 
 * 4段階パイプラインを統合した生成フロー
 * Step 1: モチーフ選定 → Step 2: 物語骨格 → Step 3: 謎設計 → Step 4: 検証
 */

import {
    SpotInput,
    QuestGenerationRequest,
    QuestOutput,
    SpotScene,
    MainPlot,
    MetaPuzzle,
    PipelineState,
    PipelineCallbacks,
} from './layton-types';
import { selectMotifs } from './step1-motif';
import { createMainPlot } from './step2-plot';
import { generateSpotPuzzle, generateMetaPuzzle } from './step3-puzzle';
import { validateQuest, getRegenerationTargets } from './step4-validate';
import { retrieveEvidence } from './retriever';

/**
 * 完全なクエスト生成パイプライン
 */
export async function generateLaytonQuest(
    request: QuestGenerationRequest,
    apiKey: string,
    callbacks?: Partial<PipelineCallbacks>
): Promise<QuestOutput> {
    const onProgress = callbacks?.onProgress || (() => { });
    const onSpotComplete = callbacks?.onSpotComplete || (() => { });
    const onPlotComplete = callbacks?.onPlotComplete || (() => { });
    const onError = callbacks?.onError || (() => { });

    try {
        // ==========================================================================
        // Phase 0: スポット情報の取得（初期生成）
        // ==========================================================================
        onProgress({
            current_step: 1,
            step_name: 'motif_selection',
            progress: 5,
        });

        const spotsInput = await generateInitialSpots(request, apiKey);

        // ==========================================================================
        // Step 1: モチーフ選定
        // ==========================================================================
        onProgress({
            current_step: 1,
            step_name: 'motif_selection',
            progress: 20,
            total_spots: spotsInput.length,
        });

        const motifs = await selectMotifs(spotsInput, request.prompt, apiKey);

        // ==========================================================================
        // Step 2: 物語骨格生成
        // ==========================================================================
        onProgress({
            current_step: 2,
            step_name: 'plot_creation',
            progress: 35,
        });

        const mainPlot = await createMainPlot(spotsInput, motifs, request.prompt, apiKey);
        onPlotComplete(mainPlot);

        // ==========================================================================
        // Step 3: 各スポットの謎生成
        // ==========================================================================
        const spots: SpotScene[] = [];

        for (let i = 0; i < spotsInput.length; i++) {
            onProgress({
                current_step: 3,
                step_name: 'puzzle_design',
                progress: 40 + Math.floor((i / spotsInput.length) * 40),
                current_spot_index: i,
                total_spots: spotsInput.length,
            });

            const spot = await generateSpotPuzzle(
                spotsInput[i],
                motifs[i],
                mainPlot,
                motifs,
                i,
                apiKey
            );

            spots.push(spot);
            onSpotComplete(spot, i);
        }

        // メタパズル生成
        onProgress({
            current_step: 3,
            step_name: 'puzzle_design',
            progress: 85,
        });

        const metaPuzzleResult = await generateMetaPuzzle(spots, mainPlot, apiKey);
        const metaPuzzle: MetaPuzzle = {
            inputs: spots.map(s => `${s.spot_id}.plot_key`),
            ...metaPuzzleResult,
        };

        // ==========================================================================
        // Step 4: 整合性検証
        // ==========================================================================
        onProgress({
            current_step: 4,
            step_name: 'validation',
            progress: 90,
        });

        const validation = validateQuest(spots, mainPlot, metaPuzzle);
        const regenerationTargets = getRegenerationTargets(validation);

        // 再生成が必要な場合（最大1回）
        if (regenerationTargets.length > 0 && regenerationTargets.length <= 3) {
            for (const spotId of regenerationTargets) {
                const index = spots.findIndex(s => s.spot_id === spotId);
                if (index >= 0) {
                    const regenerated = await generateSpotPuzzle(
                        spotsInput[index],
                        motifs[index],
                        mainPlot,
                        motifs,
                        index,
                        apiKey
                    );
                    spots[index] = regenerated;
                }
            }
        }

        // 最終検証
        const finalValidation = validateQuest(spots, mainPlot, metaPuzzle);

        // ==========================================================================
        // 完成
        // ==========================================================================
        onProgress({
            current_step: 4,
            step_name: 'validation',
            progress: 100,
        });

        const questOutput: QuestOutput = {
            quest_id: `quest-${Date.now()}`,
            quest_title: await generateQuestTitle(mainPlot, request.prompt, apiKey),
            main_plot: mainPlot,
            spots,
            meta_puzzle: metaPuzzle,
            generation_metadata: {
                generated_at: new Date().toISOString(),
                pipeline_version: '2.0.0-layton',
                validation_passed: finalValidation.passed,
                validation_warnings: finalValidation.warnings.map(w => w.message),
            },
        };

        return questOutput;
    } catch (error: any) {
        onError(error, {
            current_step: 1,
            step_name: 'motif_selection',
            progress: 0,
            error: error.message,
        });
        throw error;
    }
}

/**
 * 初期スポット情報を生成
 */
async function generateInitialSpots(
    request: QuestGenerationRequest,
    apiKey: string
): Promise<SpotInput[]> {
    const prompt = `
あなたは位置連動ミステリークエストの設計者です。
以下のリクエストに基づいて、スポット情報を生成してください。

【リクエスト】
${request.prompt}

【条件】
- スポット数: ${request.spot_count}件
- 難易度: ${request.difficulty}
${request.theme_tags?.length ? `- テーマタグ: ${request.theme_tags.join(', ')}` : ''}

【出力形式】
各スポットについて以下を含むJSON配列を出力：
[
  {
    "spot_name": "スポット名（実在する場所）",
    "spot_summary": "2-4行の概要（歴史的背景、特徴）",
    "spot_facts": [
      "事実1: この場所を象徴する具体的な事実",
      "事実2: 別の側面からの事実",
      "事実3: 謎のモチーフになりそうな事実"
    ],
    "spot_theme_tags": ["タグ1", "タグ2"],
    "lat": 35.XXXXX,
    "lng": 139.XXXXX
  }
]

【重要】
- spot_factsは3-7個、具体的で謎のモチーフになれる事実を
- 隣接スポット間は徒歩移動可能な距離（500m以内）
- 正確な緯度経度を設定
`.trim();

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-09-2025:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            }
        );

        if (!res.ok) {
            throw new Error(`Gemini API error: ${res.status}`);
        }

        const data = await res.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        const jsonMatch = responseText.match(/```json([\s\S]*?)```/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        const parsed = JSON.parse(jsonText.trim());

        // 追加の根拠収集（並行実行）
        const spotsWithEvidence = await Promise.all(
            parsed.map(async (spot: any, idx: number) => {
                try {
                    const evidence = await retrieveEvidence(
                        `spot-${idx}`,
                        spot.spot_name,
                        spot.lat || 35.6804,
                        spot.lng || 139.769
                    );

                    // evidenceからfactsを補強
                    const additionalFacts = evidence.evidences
                        .slice(0, 3)
                        .map(e => e.content);

                    return {
                        spot_name: spot.spot_name,
                        spot_summary: spot.spot_summary || evidence.official_description || '',
                        spot_facts: [...(spot.spot_facts || []), ...additionalFacts].slice(0, 7),
                        spot_theme_tags: spot.spot_theme_tags || [],
                        lat: spot.lat || evidence.lat,
                        lng: spot.lng || evidence.lng,
                    } as SpotInput;
                } catch {
                    return {
                        spot_name: spot.spot_name,
                        spot_summary: spot.spot_summary || '',
                        spot_facts: spot.spot_facts || [],
                        spot_theme_tags: spot.spot_theme_tags || [],
                        lat: spot.lat || 35.6804,
                        lng: spot.lng || 139.769,
                    } as SpotInput;
                }
            })
        );

        return spotsWithEvidence;
    } catch (error: any) {
        console.error('Initial spots generation error:', error);
        throw error;
    }
}

/**
 * クエストタイトルを生成
 */
async function generateQuestTitle(
    mainPlot: MainPlot,
    originalPrompt: string,
    apiKey: string
): Promise<string> {
    const prompt = `
以下の物語に相応しい、魅力的なクエストタイトルを1つだけ生成してください。

【物語の概要】
${mainPlot.premise}
${mainPlot.goal}
${mainPlot.antagonist_or_mystery}

【元のリクエスト】
${originalPrompt}

タイトルだけを出力してください（JSON不要）。
`.trim();

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-09-2025:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            }
        );

        if (!res.ok) {
            throw new Error(`Gemini API error: ${res.status}`);
        }

        const data = await res.json();
        const title = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        // タイトルのクリーンアップ
        return title.replace(/^["「『]|["」』]$/g, '').trim() || `${originalPrompt.slice(0, 20)}の謎`;
    } catch {
        return `${originalPrompt.slice(0, 20)}の謎`;
    }
}
