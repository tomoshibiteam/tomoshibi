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
    PlayerPreviewOutput,
    QuestDualOutput,
} from './layton-types';
import { selectMotifs } from './step1-motif';
import { createMainPlot } from './step2-plot';
import { generateSpotPuzzle, generateMetaPuzzle } from './step3-puzzle';
import { validateQuest, getRegenerationTargets } from './step4-validate';
import { retrieveEvidence, geocodeSpotName } from './retriever';
import { getModelEndpoint } from '../ai/model-config';
import { safeParseJson } from './json-utils';

/**
 * 完全なクエスト生成パイプライン
 * 戻り値は二層構造: player_preview (ネタバレなし) + creator_payload (フルデータ)
 */
export async function generateLaytonQuest(
    request: QuestGenerationRequest,
    apiKey: string,
    callbacks?: Partial<PipelineCallbacks>
): Promise<QuestDualOutput> {
    const onProgress = callbacks?.onProgress || (() => { });
    const onSpotComplete = callbacks?.onSpotComplete || (() => { });
    const onPlotComplete = callbacks?.onPlotComplete || (() => { });
    const onError = callbacks?.onError || (() => { });

    try {
        const questContext = buildQuestContext(request);
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

        const motifs = await selectMotifs(spotsInput, request.prompt, apiKey, questContext);

        // ==========================================================================
        // Step 2: 物語骨格生成
        // ==========================================================================
        onProgress({
            current_step: 2,
            step_name: 'plot_creation',
            progress: 35,
        });

        const mainPlot = await createMainPlot(spotsInput, motifs, request.prompt, apiKey, questContext);
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
            quest_title: await generateQuestTitle(mainPlot, request.prompt, apiKey, questContext),
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

        // プレイヤープレビュー生成（ネタバレなし）
        onProgress({
            current_step: 4,
            step_name: 'validation',
            progress: 95,
        });

        const playerPreview = await generatePlayerPreview(
            questOutput,
            request,
            apiKey
        );

        return {
            player_preview: playerPreview,
            creator_payload: questOutput,
        };
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
    const desiredSpotCount = Math.min(12, Math.max(5, request.spot_count));
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
    if (request.prompt_support?.when) {
        supportInfo.push(`- いつ: ${request.prompt_support.when}`);
    }
    if (request.prompt_support?.where) {
        supportInfo.push(`- どこで: ${request.prompt_support.where}`);
    }
    if (request.prompt_support?.purpose) {
        supportInfo.push(`- 目的: ${request.prompt_support.purpose}`);
    }
    if (request.prompt_support?.withWhom) {
        supportInfo.push(`- 誰と: ${request.prompt_support.withWhom}`);
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
- スポット数: ${desiredSpotCount}件
- 難易度: ${request.difficulty}

${supportInfo.length > 0 ? `【補助条件】
${supportInfo.join('\n')}

※補助条件はメインリクエストを上書きしません。
メインリクエストと矛盾する場合はメインを優先してください。
補助条件がある場合は、スポットの選び方・雰囲気に必ず反映してください。
` : ''}
【差別化の指示】
- 旅の条件（いつ/目的/誰と）がある場合、スポットの性質や雰囲気を明確に変える
- 例: 夜=夜景/ネオン/ライトアップ、朝=市場/公園/静かな寺、カップル=ロマンチック、家族=安全で広い、ひとり=静けさと内省
【🚨🚨🚨 絶対厳守：ウォーキングクエストのルール 🚨🚨🚨】
これは「徒歩で巡るウォーキングクエスト」です。

■ 距離の絶対ルール（破ったら無効）
- スポット1→2、2→3...全ての隣接スポット間は「350m以上、500m以内」を厳守すること
- 近すぎる（350m未満）と散歩にならない。遠すぎる（500m超）と疲れる。この範囲に収めること
- 「浅草」と「上野」のように異なるエリアを混ぜるのは禁止

■ 具体的な選び方
- まず中心となるエリア（例：浅草寺前）を決める
- その半径500m以内にある実在スポットだけを選ぶ
- 徒歩5〜8分で次のスポットに着ける配置にする
- Google Mapsで検索した際に、ピンポイントでその場所が表示される正式名称を使うこと
- ユーザーが地図を開いたときに確実にその場所にたどり着ける有名・確実なスポットを選ぶこと

■ 禁止事項
- 電車・バス・車での移動が必要になる配置
- 「〜区」「〜市」全体から広くスポットを選ぶこと
- 1km以上離れたスポットを入れること
- 350m未満の近すぎるスポット移動
- 前半で通った道を戻るようなルートや、行ったり来たりする効率の悪いルート
- 後半のスポットに行くために、前半のエリアを再び通過すること（一筆書きのようにスムーズに巡れるルートにする）
- 曖昧な地名やエリア名だけでスポット名を作ること（例: 「渋谷周辺」「駅前一帯」）

【文章の読みやすさ（重要）】
- spot_summaryは中学生でも読めるやさしい言葉で書く
- 専門用語・難しい漢字・意味不明なカタカナ語は使わない
- 歴史の話も「へぇ、面白い！」と思える身近な言葉で

【出力形式】
各スポットについて以下を含むJSON配列を出力：
[
  {
    "spot_name": "スポット名（Google Mapsで単独のスポットとして表示される正式名称）",
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
            getModelEndpoint('general', apiKey),
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
        const parsed = safeParseJson(jsonText);
        const parsedSpots = Array.isArray(parsed) ? parsed.slice(0, desiredSpotCount) : [];

        const radiusKm = request.radius_km || 1;
        const centerLat = request.center_location?.lat;
        const centerLng = request.center_location?.lng;

        // 追加の根拠収集 + Geocodingで正確な座標を取得（並行実行）
        const spotsWithEvidencePromise = Promise.all(
            parsedSpots.map(async (spot: any, idx: number) => {
                try {
                    // スポット名から正確な座標を取得（Google Geocoding API）
                    // 中心座標と半径を渡して、範囲外の同名スポット（例：金沢文庫と金沢）を排除
                    const geocoded = await geocodeSpotName(spot.spot_name, centerLat, centerLng, radiusKm);

                    // Geocoding失敗、または範囲外の場合はnullを返す（後でフィルタリング）
                    if (!geocoded) {
                        console.warn(`[Spot Skipped] Invalid location for: ${spot.spot_name}`);
                        return null;
                    }

                    const accurateLat = geocoded.lat;
                    const accurateLng = geocoded.lng;
                    const placeId = geocoded.place_id;
                    const formattedAddress = geocoded.formatted_address;

                    // 証拠取集（Wiki, Places API）
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
                        place_id: placeId,
                        address: formattedAddress || '',
                    } as SpotInput;
                } catch (e) {
                    console.error(`Error processing spot ${spot.spot_name}:`, e);
                    return null;
                }
            })
        );

        const processedSpots = await spotsWithEvidencePromise;
        const spotsWithEvidence = processedSpots.filter((s): s is SpotInput => s !== null);

        console.log(`[ウォーキングクエスト] 有効なスポット数: ${spotsWithEvidence.length}/${parsedSpots.length}`);

        // 距離フィルタリング
        // 1. 現在地からの距離で絞り込み（設定されている場合）
        // 2. スポット間の距離で並べ替え（徒歩で回れる順序に）
        const searchRadiusMeters = (request.radius_km || 1) * 1000;
        const spotDistanceMeters = 800; // スポット間は800m以内
        let filteredSpots = filterSpotsWithinWalkingDistance(
            spotsWithEvidence,
            spotDistanceMeters,
            request.center_location,
            searchRadiusMeters
        );

        if (filteredSpots.length < desiredSpotCount) {
            console.warn(`[ウォーキングクエスト] スポット数が不足: ${filteredSpots.length}件 → ${desiredSpotCount}件に補完`);
            const usedKeys = new Set(filteredSpots.map((spot) => `${spot.spot_name}-${spot.lat}-${spot.lng}`));
            const fallback = spotsWithEvidence.filter((spot) => !usedKeys.has(`${spot.spot_name}-${spot.lat}-${spot.lng}`));
            filteredSpots = [...filteredSpots, ...fallback].slice(0, desiredSpotCount);
        }

        return filteredSpots.slice(0, desiredSpotCount);
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

    // 2. AIの提案順序を維持する
    // 近傍探索（Greedy）を行うと、AIが設計した「一筆書きルート」や「ストーリー順序」が破壊されるため、
    // 並べ替えを行わずにAIの出力順を信頼して返却する。
    // プロンプト側で「隣接スポット間の距離」や「バックトラック禁止」を強く指示していることを前提とする。

    console.log(`[ウォーキングクエスト] AI提案の順序を維持して${candidateSpots.length}件のスポットを採用`);

    return candidateSpots;
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
 * 旅の条件・世界観をまとめた文脈を作成
 */
function buildQuestContext(request: QuestGenerationRequest): string {
    const lines: string[] = [];
    if (request.genre_support) {
        lines.push(`ジャンル: ${request.genre_support}`);
    }
    if (request.tone_support) {
        lines.push(`トーン: ${request.tone_support}`);
    }
    if (request.theme_tags?.length) {
        lines.push(`テーマタグ: ${request.theme_tags.join(', ')}`);
    }
    if (request.prompt_support?.protagonist) {
        lines.push(`主人公: ${request.prompt_support.protagonist}`);
    }
    if (request.prompt_support?.objective) {
        lines.push(`目的: ${request.prompt_support.objective}`);
    }
    if (request.prompt_support?.ending) {
        lines.push(`結末: ${request.prompt_support.ending}`);
    }
    if (request.prompt_support?.when) {
        lines.push(`いつ: ${request.prompt_support.when}`);
    }
    if (request.prompt_support?.where) {
        lines.push(`どこで: ${request.prompt_support.where}`);
    }
    if (request.prompt_support?.purpose) {
        lines.push(`旅の目的: ${request.prompt_support.purpose}`);
    }
    if (request.prompt_support?.withWhom) {
        lines.push(`誰と: ${request.prompt_support.withWhom}`);
    }
    return lines.join('\n');
}

/**
 * クエストタイトルを生成
 */
async function generateQuestTitle(
    mainPlot: MainPlot,
    originalPrompt: string,
    apiKey: string,
    questContext?: string
): Promise<string> {
    const prompt = `
以下の物語に相応しい、魅力的なクエストタイトルを1つだけ生成してください。

【タイトルルール】
- 日本語。映画予告編のように一瞬で引き込む
- 舞台や異変の気配が伝わる言葉を入れる
- 説明文やサブタイトルは不要
- 固有IPは入力に明示された場合のみ使用
- 記号や装飾語は使いすぎない
- 1行で出力する

【物語の概要】
${mainPlot.premise}
${mainPlot.goal}
${mainPlot.antagonist_or_mystery}

【元のリクエスト】
${originalPrompt}

${questContext ? `【旅の条件・世界観】
${questContext}
` : ''}
タイトルだけを出力してください（JSON不要）。
`.trim();

    try {
        const res = await fetch(
            getModelEndpoint('story', apiKey),
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
        const normalizedTitle = title.replace(/\s+/g, ' ').replace(/^["「『]|["」』]$/g, '').trim();
        const fallbackBase = originalPrompt.trim();
        return normalizedTitle || (fallbackBase ? `${fallbackBase}の謎` : '未設定の謎');
    } catch {
        const fallbackBase = originalPrompt.trim();
        return fallbackBase ? `${fallbackBase}の謎` : '未設定の謎';
    }
}

/**
 * プレイヤープレビュー生成（ネタバレなし）
 * クリエイターが"プレイヤーとして"楽しめる情報だけを生成
 */
async function generatePlayerPreview(
    quest: QuestOutput,
    request: QuestGenerationRequest,
    apiKey: string
): Promise<PlayerPreviewOutput> {
    // ルート距離の概算（スポット間平均300m × スポット数）
    const estimatedDistanceKm = (quest.spots.length * 0.3).toFixed(1);

    // 所要時間（リクエストから or スポット数×15分）
    const estimatedTimeMin = String(quest.spots.length * 15);

    // 難易度ラベル
    const difficultyLabel = request.difficulty === 'easy' ? '初級' : request.difficulty === 'hard' ? '上級' : '中級';

    const questContext = buildQuestContext(request);
    const prompt = `
あなたは「プレイヤーが"やってみたい！"と思える」クエスト紹介文を作る専門家です。

【重要ルール：ネタバレ禁止】
- 謎の問題文・答え・ヒントの具体は絶対に書かない
- 「どう解くか」ではなく「何が起きるか」だけを書く
- 抽象語（ワクワク、ドキドキ、謎が待っている）は禁止
- 「固有名詞＋動詞＋現象」で具体的に書く
 - trailerは世界観の空気→あなたの立場/関与→体験の形式→呼びかけの順で書く

【クエスト情報（制作用データ：プレビューには直接出さない）】
タイトル：${quest.quest_title}
物語：${quest.main_plot.premise}
目的：${quest.main_plot.goal}
スポット数：${quest.spots.length}箇所
スポット名：${quest.spots.map(s => s.spot_name).join('、')}
難易度：${difficultyLabel}

${questContext ? `【旅の条件・世界観】
${questContext}

※旅の条件がある場合は、one_linerやtrailerに必ず反映し、他と違う雰囲気が伝わるようにする。
` : ''}
【出力するJSON（日本語）】
{
  "one_liner": "30〜45文字のキャッチコピー",
  "trailer": "250〜380文字の導入文（3〜5文、世界観→あなたの役割→体験形式→呼びかけの順）",
  "mission": "あなたは◯◯して最後に◯◯を突き止める（1行）",
  "teasers": [
    "スポット名で◯◯すると、△△が見えてくる（25〜40文字）",
    "別のスポットで◯◯すると、△△が起きる",
    "最後に◯◯すると、△△が現れる"
  ],
  "summary_actions": ["歩く", "集める", "照合する"],
  "difficulty_reason": "ひらめき型：考える時間が必要な謎が◯回ある（1〜2行）",
  "weather_note": "雨天OK/雨天注意/屋外多め など",
  "highlight_spots": [
    { "name": "${quest.spots[0]?.spot_name || 'スポット1'}", "teaser_experience": "ここで◯◯すると△△が見える（答えは出さない）" },
    { "name": "${quest.spots[1]?.spot_name || 'スポット2'}", "teaser_experience": "ここで◯◯すると△△が起きる" },
    { "name": "${quest.spots[Math.min(2, quest.spots.length - 1)]?.spot_name || 'スポット3'}", "teaser_experience": "ここで◯◯すると△△が現れる" }
  ],
  "tags": ["ミステリー好き", "デート向け", "初心者OK", "歩き多め", "雨でもOK"]
}

【重要】
- teasersは3つとも別の種類の仕掛け感を出す（反射/音/置換/並べ替え/看板/模様/視点など）
- highlight_spotsは同じ言い回しにしない
- tagsは5〜7個（旅の条件に沿った具体タグを必ず含める）

JSONのみ出力してください。
`.trim();

    try {
        const res = await fetch(
            getModelEndpoint('story', apiKey),
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
        const parsed = safeParseJson(jsonText);

        return {
            title: quest.quest_title,
            one_liner: parsed.one_liner || '街を歩いて謎を解き明かす',
            trailer: parsed.trailer || quest.main_plot.premise.slice(0, 140),
            mission: parsed.mission || quest.main_plot.goal,
            teasers: parsed.teasers || [],
            summary_actions: parsed.summary_actions || ['歩く', '探す', '解く'],
            route_meta: {
                area_start: quest.spots[0]?.spot_name || '',
                area_end: quest.spots[quest.spots.length - 1]?.spot_name || '',
                distance_km: estimatedDistanceKm,
                estimated_time_min: estimatedTimeMin,
                spots_count: quest.spots.length,
                outdoor_ratio_percent: '70',
                recommended_people: '1〜4人',
                difficulty_label: difficultyLabel,
                difficulty_reason: parsed.difficulty_reason || 'ひらめき型：考える時間が必要な謎があります',
                weather_note: parsed.weather_note || '雨天注意',
            },
            highlight_spots: parsed.highlight_spots || quest.spots.slice(0, 3).map(s => ({
                name: s.spot_name,
                teaser_experience: 'この場所で特別な体験が待っています',
            })),
            tags: parsed.tags || ['ミステリー好き', '友達と一緒に', '週末散歩'],
            prep_and_safety: [
                'スマートフォン（充電済み）',
                '歩きやすい靴',
                '飲み物（推奨）',
            ],
            cta_copy: {
                primary: 'プレイヤーとして挑戦する',
                secondary: 'クリエイターとして編集する（ネタバレ）',
                note: 'まずは非公開のままテストプレイできます。編集すると謎と答えが表示されます（ネタバレ注意）。',
            },
        };
    } catch (error) {
        console.error('Player preview generation error:', error);

        // フォールバック：最低限のプレビューを生成
        return {
            title: quest.quest_title,
            one_liner: '街を歩いて謎を解き明かす冒険',
            trailer: quest.main_plot.premise.slice(0, 140),
            mission: quest.main_plot.goal,
            teasers: [
                `${quest.spots[0]?.spot_name || '最初のスポット'}で手がかりを見つける`,
                '隠されたメッセージを読み解く',
                '最後に全ての謎がつながる',
            ],
            summary_actions: ['歩く', '探す', '解く'],
            route_meta: {
                area_start: quest.spots[0]?.spot_name || '',
                area_end: quest.spots[quest.spots.length - 1]?.spot_name || '',
                distance_km: estimatedDistanceKm,
                estimated_time_min: estimatedTimeMin,
                spots_count: quest.spots.length,
                outdoor_ratio_percent: '70',
                recommended_people: '1〜4人',
                difficulty_label: difficultyLabel,
                difficulty_reason: 'ほど良い難易度で楽しめます',
                weather_note: '雨天注意',
            },
            highlight_spots: quest.spots.slice(0, 3).map(s => ({
                name: s.spot_name,
                teaser_experience: 'この場所で特別な発見が待っています',
            })),
            tags: ['ミステリー好き', '友達と一緒に', '週末散歩', '初心者OK', 'デート向け'],
            prep_and_safety: [
                'スマートフォン（充電済み）',
                '歩きやすい靴',
                '飲み物（推奨）',
            ],
            cta_copy: {
                primary: 'プレイヤーとして挑戦する',
                secondary: 'クリエイターとして編集する（ネタバレ）',
                note: 'まずは非公開のままテストプレイできます。編集すると謎と答えが表示されます（ネタバレ注意）。',
            },
        };
    }
}
