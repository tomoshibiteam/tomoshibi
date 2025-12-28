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
import { retrieveEvidence, geocodeSpotName } from './retriever';

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
    // Build support info section
    const supportInfo: string[] = [];
    if (request.genre_support) {
        supportInfo.push(`- ジャンル補助: ${request.genre_support}`);
    }
    if (request.tone_support) {
        supportInfo.push(`- トーン補助: ${request.tone_support}`);
    }
    if (request.prompt_support?.protagonist) {
        supportInfo.push(`- 主人公: ${request.prompt_support.protagonist}`);
    }
    if (request.prompt_support?.objective) {
        supportInfo.push(`- 目的: ${request.prompt_support.objective}`);
    }
    if (request.prompt_support?.ending) {
        supportInfo.push(`- 結末: ${request.prompt_support.ending}`);
    }
    if (request.theme_tags?.length) {
        supportInfo.push(`- テーマタグ: ${request.theme_tags.join(', ')}`);
    }

    const prompt = `
あなたは位置連動ミステリークエストの設計者です。
以下のリクエストに基づいて、スポット情報を生成してください。

【メインリクエスト（最優先）】
${request.prompt}

${request.center_location ? `【📍 エリア指定（必須）】
ユーザーの現在地：緯度${request.center_location.lat.toFixed(4)} / 経度${request.center_location.lng.toFixed(4)}
この地点から半径${request.radius_km || 1}km以内にある実在のスポットだけを選んでください。
この範囲外のスポットは絶対に含めないでください。
` : ''}
【基本設定】
- スポット数: ${request.spot_count}件
- 難易度: ${request.difficulty}

${supportInfo.length > 0 ? `【補助条件】
${supportInfo.join('\n')}

※補助条件はメインリクエストを上書きしません。
メインリクエストと矛盾する場合はメインを優先してください。
` : ''}
【🚨🚨🚨 絶対厳守：ウォーキングクエストのルール 🚨🚨🚨】
これは「徒歩で巡るウォーキングクエスト」です。

■ 距離の絶対ルール（破ったら無効）
- スポット1→2、2→3...全ての隣接スポット間が500m以内であること
- 例：浅草なら浅草寺周辺500m圏内、渋谷なら渋谷駅周辺500m圏内
- 「浅草」と「上野」のように異なるエリアを混ぜるのは禁止

■ 具体的な選び方
- まず中心となるエリア（例：浅草寺前）を決める
- その半径500m以内にある実在スポットだけを選ぶ
- 徒歩5分で次のスポットに着ける配置にする

■ 禁止事項
- 電車・バス・車での移動が必要になる配置
- 「〜区」「〜市」全体から広くスポットを選ぶこと
- 1km以上離れたスポットを入れること

【文章の読みやすさ（重要）】
- spot_summaryは中学生でも読めるやさしい言葉で書く
- 専門用語・難しい漢字・意味不明なカタカナ語は使わない
- 歴史の話も「へぇ、面白い！」と思える身近な言葉で

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
- 緯度経度は可能な範囲で正確に（後でGeocoding APIで補正されます）
- 全スポットが徒歩圏内に収まることを最優先で
`.trim();

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
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

        // 追加の根拠収集 + Geocodingで正確な座標を取得（並行実行）
        const spotsWithEvidence = await Promise.all(
            parsed.map(async (spot: any, idx: number) => {
                try {
                    // スポット名から正確な座標を取得（Google Geocoding API）
                    const geocoded = await geocodeSpotName(spot.spot_name);
                    const accurateLat = geocoded?.lat || spot.lat || 35.6804;
                    const accurateLng = geocoded?.lng || spot.lng || 139.769;

                    const evidence = await retrieveEvidence(
                        `spot-${idx}`,
                        spot.spot_name,
                        accurateLat,
                        accurateLng
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
                        lat: accurateLat,
                        lng: accurateLng,
                    } as SpotInput;
                } catch {
                    // フォールバック：Geocodingも失敗した場合
                    const geocoded = await geocodeSpotName(spot.spot_name).catch(() => null);
                    return {
                        spot_name: spot.spot_name,
                        spot_summary: spot.spot_summary || '',
                        spot_facts: spot.spot_facts || [],
                        spot_theme_tags: spot.spot_theme_tags || [],
                        lat: geocoded?.lat || spot.lat || 35.6804,
                        lng: geocoded?.lng || spot.lng || 139.769,
                    } as SpotInput;
                }
            })
        );

        // 距離フィルタリング
        // 1. 現在地からの距離で絞り込み（設定されている場合）
        // 2. スポット間の距離で並べ替え（徒歩で回れる順序に）
        const searchRadiusMeters = (request.radius_km || 1) * 1000;
        const spotDistanceMeters = 800; // スポット間は800m以内
        const filteredSpots = filterSpotsWithinWalkingDistance(
            spotsWithEvidence,
            spotDistanceMeters,
            request.center_location,
            searchRadiusMeters
        );

        return filteredSpots;
    } catch (error: any) {
        console.error('Initial spots generation error:', error);
        throw error;
    }
}

/**
 * 徒歩圏内のスポットだけをフィルタリング
 * 1. 現在地からの距離でフィルタ（設定されている場合）
 * 2. スポット間の距離で並べ替え
 */
function filterSpotsWithinWalkingDistance(
    spots: SpotInput[],
    spotMaxDistanceMeters: number,
    centerLocation?: { lat: number; lng: number },
    searchRadiusMeters?: number
): SpotInput[] {
    if (spots.length <= 1) return spots;

    // 1. 現在地からの距離でフィルタ（設定されている場合）
    let candidateSpots = spots;
    if (centerLocation && searchRadiusMeters) {
        candidateSpots = spots.filter(spot => {
            const dist = calculateDistance(centerLocation.lat, centerLocation.lng, spot.lat, spot.lng);
            return dist <= searchRadiusMeters;
        });
        console.log(`[エリアフィルタ] 現在地から${searchRadiusMeters}m以内: ${spots.length}件 → ${candidateSpots.length}件`);

        if (candidateSpots.length === 0) {
            console.warn('[警告] 現在地付近にスポットがありません。元のスポットを使用します。');
            candidateSpots = spots;
        }
    }

    // 2. スポット間の距離で並べ替え（近い順にチェーン）
    const result: SpotInput[] = [candidateSpots[0]];
    const remaining = [...candidateSpots.slice(1)];

    while (remaining.length > 0 && result.length < candidateSpots.length) {
        const lastSpot = result[result.length - 1];

        // 前のスポットから最も近いスポットを探す
        let nearestIdx = -1;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const dist = calculateDistance(lastSpot.lat, lastSpot.lng, remaining[i].lat, remaining[i].lng);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
            }
        }

        // スポット間距離以内であれば追加
        if (nearestIdx >= 0 && nearestDist <= spotMaxDistanceMeters) {
            result.push(remaining[nearestIdx]);
            remaining.splice(nearestIdx, 1);
        } else {
            break;
        }
    }

    console.log(`[ウォーキングクエスト] ${candidateSpots.length}件中${result.length}件のスポットを選択（スポット間${spotMaxDistanceMeters}m以内）`);

    return result;
}

/**
 * スポット間の距離を計算（将来的なルート最適化用）
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // 地球の半径（メートル）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
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
