/**
 * Step 2: 物語骨格生成
 * 
 * Main Plotを先に固定し、各スポットへの役割割り当てを確定
 */

import {
    SpotInput,
    SpotMotif,
    MainPlot,
} from './layton-types';
import { getModelEndpoint } from '../ai/model-config';

/**
 * 物語骨格生成用プロンプト
 */
const PLOT_CREATION_PROMPT = `あなたは物語作家です。
以下のスポットモチーフを使って、一貫した謎解き物語を構築してください。

【重要な原則】
1. premise（発端）→ goal（目的）→ antagonist_or_mystery（対立/謎）→ final_reveal（真相） の4点を明確に
2. 各スポットが物語の一部として必ず機能すること
3. 最後のmeta_puzzleで全てが繋がる構造にすること
4. 「解く = 学ぶ + 進む」を意識した物語設計

【文章の読みやすさ（最重要）】
- 中学生が読んでスラスラ理解できる言葉を使う
- 専門用語・難しい漢字・意味不明なカタカナ語は絶対禁止
- 一文は短く、リズムよく読めるように
- 難しい概念は「たとえ話」や「身近な例」で説明
- 読んでいて「しんどい」と感じさせない、軽やかな文体

【物語のジャンル例】
- 失われた宝を探す冒険
- 過去の事件の真相解明
- 伝説の謎を解き明かす調査
- 時を超えたメッセージの解読
- 古の知恵を継承する試練`;

/**
 * Main Plotを生成
 */
export async function createMainPlot(
    spotsInput: SpotInput[],
    motifs: SpotMotif[],
    questTheme: string,
    apiKey: string,
    questContext?: string
): Promise<MainPlot> {
    const motifsJson = motifs.map((m, idx) => ({
        spot_id: m.spot_id,
        spot_name: m.spot_name,
        scene_role: m.scene_role,
        selected_facts: m.selected_facts,
        plot_key_type: m.plot_key_type,
        theme_tags: spotsInput[idx]?.spot_theme_tags || [],
    }));

    const prompt = `
${PLOT_CREATION_PROMPT}

【クエストテーマ】
${questTheme}

${questContext ? `【旅の条件・世界観】
${questContext}

※旅の条件がある場合は、物語の発端や目的に必ず反映してください。
` : ''}
【スポットモチーフ】
${JSON.stringify(motifsJson, null, 2)}

【出力形式】
以下のJSONを出力してください：
{
  "premise": "物語の発端（なぜ主人公がこの冒険を始めるのか）",
  "goal": "主人公の目的（何を達成しようとしているのか）",
  "antagonist_or_mystery": "対立要素または中心の謎（何が障害なのか、何が明かされるべきなのか）",
  "final_reveal_outline": "最終的な真相の概要（meta_puzzleで明かされる結論）",
  "spot_story_hooks": [
    {
      "spot_id": "S1",
      "story_beat": "この地点で起こる物語上の出来事（1文）",
      "plot_key_preview": "この地点で得られる鍵の性質（例：古い年号、暗号の一部）"
    },
    ...
  ]
}

【品質基準】
- 導入（S1）で謎が提示される
- 中盤で転換点がある
- 結末で全てが繋がる達成感がある
- 各スポットの地域性や歴史性を活かした物語
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

        // JSONを抽出
        const jsonMatch = responseText.match(/```json([\s\S]*?)```/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        const parsed = JSON.parse(jsonText.trim());

        return {
            premise: parsed.premise || '古くから伝わる謎を解き明かす冒険が始まる。',
            goal: parsed.goal || '隠された真実を見つけ出すこと。',
            antagonist_or_mystery: parsed.antagonist_or_mystery || '時の流れに埋もれた秘密。',
            final_reveal_outline: parsed.final_reveal_outline || '全ての鍵が揃った時、真相が明らかになる。',
        };
    } catch (error: any) {
        console.error('Plot creation error:', error);
        // フォールバック: デフォルトのプロット
        return createDefaultPlot(questTheme, motifs);
    }
}

/**
 * デフォルトのMain Plotを作成
 */
function createDefaultPlot(questTheme: string, motifs: SpotMotif[]): MainPlot {
    const spotNames = motifs.map(m => m.spot_name).join('、');

    return {
        premise: `${questTheme}にまつわる古い謎が、あなたを待っている。`,
        goal: `${spotNames}を巡り、隠された真実を解き明かすこと。`,
        antagonist_or_mystery: '時の流れに埋もれた秘密と、それを守る謎の数々。',
        final_reveal_outline: '全てのスポットで集めた鍵を組み合わせることで、最終的な真相が明らかになる。',
    };
}

/**
 * 物語のコンテキストを構築（謎生成時に使用）
 */
export function buildStoryContext(
    mainPlot: MainPlot,
    motifs: SpotMotif[],
    currentSpotIndex: number
): string {
    const currentMotif = motifs[currentSpotIndex];
    const prevMotifs = motifs.slice(0, currentSpotIndex);
    const nextMotifs = motifs.slice(currentSpotIndex + 1);

    return `
【物語の全体像】
- 発端: ${mainPlot.premise}
- 目的: ${mainPlot.goal}
- 核心の謎: ${mainPlot.antagonist_or_mystery}

【現在地】
- スポット: ${currentMotif.spot_name}
- 役割: ${currentMotif.scene_role}
- 物語上の位置: ${currentSpotIndex + 1}/${motifs.length}

${prevMotifs.length > 0 ? `【これまでの流れ】
${prevMotifs.map(m => `- ${m.spot_name}（${m.scene_role}）`).join('\n')}` : ''}

${nextMotifs.length > 0 ? `【この後の展開】
${nextMotifs.map(m => `- ${m.spot_name}（${m.scene_role}）`).join('\n')}` : ''}

【この地点での役割】
${currentMotif.scene_role === '導入' ? '物語の始まり。世界観を提示し、冒険への誘いを行う。' :
            currentMotif.scene_role === '展開' ? '情報を収集し、謎を深める。新しい手がかりを得る。' :
                currentMotif.scene_role === '転換' ? '状況が変わる重要な地点。新事実が判明する。' :
                    currentMotif.scene_role === '真相接近' ? '核心に迫る。答えに近づいている感覚を与える。' :
                        currentMotif.scene_role === 'ミスリード解除' ? '誤解が解ける。真実への道が開ける。' :
                            '物語の締めくくり。達成感と余韻を与える。'}
`.trim();
}
