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
import { safeParseJson } from './json-utils';

/**
 * 物語骨格生成用プロンプト
 */
const PLOT_CREATION_PROMPT = `あなたは「映画予告編のように没入感を作る」トップコピーライター兼ストーリー設計者です。
以下のスポットモチーフを使って、一貫した謎解き物語を構築してください。

【重要な原則】
1. premise（長文説明）→ goal（目的）→ antagonist_or_mystery（対立/謎）→ final_reveal（真相） の4点を明確に
2. 各スポットが物語の一部として必ず機能すること
3. 最後のmeta_puzzleで全てが繋がる構造にすること
4. 「解く = 学ぶ + 進む」を意識した物語設計

【premise（長文説明）の必須ルール】
- 日本語。二人称（あなた）中心。現在形。テンポ良い短文多め
- 誇張はOK。ただし体験として成立しない嘘はNG（事実不明は断定しない）
- ネタバレ禁止：解法、答え、犯人、最終地点、どんでん返し、エンディングの核心は書かない
- “導入〜期待”だけで引っ張る。謎の種類や雰囲気は言語化してよいが、具体の答えは出さない
- 固有IPは入力に明示された場合のみ使用。それ以外は連想表現に留める
- 説明は500〜800字。段落は3〜5つ。最後の1文は問いかけで締める
- 改行は \\n\\n で段落を分ける

【premiseに必ず含める8要素（抜けたら失格）】
1) 雰囲気の一撃目（映画のオープニング感）
2) プレイヤーの役割（なりきり）
3) 舞台の“絵”になる描写（路地/広場/寺院/市場/港/橋などの具体名詞）
4) 事件・異変（導入フック）
5) 痕跡（シンボル/暗号/伝承/手がかり）
6) 賭け金（タイムリミット/危機/失敗示唆：ただし曖昧に）
7) 体験の約束（ただの散歩ではない：パズル/緊張/発見/学び）
8) CTA（友達/家族でOK等＋最後に問いかけで締め）
`;

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
  "premise": "タイトル直下に置く長文説明（500〜800字、3〜5段落、最後は問いかけで締める。段落は\\n\\nで分ける）",
  "goal": "主人公の目的（1〜2文で簡潔に）",
  "antagonist_or_mystery": "対立要素または中心の謎（1〜2文で簡潔に）",
  "final_reveal_outline": "最終的な真相の概要（meta_puzzleで明かされる結論、ネタバレ表現は避ける）",
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
        const parsed = safeParseJson(jsonText);

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
    const premise = [
        `霧の残る街に、静かなざわめきが走る。あなたは${questTheme}の調査役だ。路地、広場、橋、そして人の視線が交差する通り。足元の石畳に、見逃せない痕が刻まれている。`,
        `街に起きた小さな異変は、やがて大きな謎へ変わる。古い伝承、繰り返されるシンボル、意味深な暗号。${spotNames}を巡るたび、手がかりは増える。だが答えはまだ遠い。`,
        `タイムリミットの気配が背中を押す。失敗の影ははっきりとは見えない。けれど、あなたは知っている。これはただの散歩ではない。パズルと緊張、発見と学びが連なる道だ。友達でも、家族でもいい。あなたは、この街の真相に踏み込む覚悟があるか？`,
    ].join('\n\n');

    return {
        premise,
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
