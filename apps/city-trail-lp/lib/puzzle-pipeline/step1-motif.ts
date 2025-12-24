/**
 * Step 1: モチーフ選定
 * 
 * 各スポットからfactsを選択し、scene_roleとplot_key性質を決定
 */

import {
    SpotInput,
    SpotMotif,
    SceneRole,
    PlotKeyType,
    PuzzleType,
} from './layton-types';

/**
 * モチーフ選定用プロンプト
 */
const MOTIF_SELECTION_PROMPT = `あなたは物語構成の専門家です。
以下のスポット情報を分析し、各スポットの物語上の役割を決定してください。

【重要な原則】
1. 全体で一貫した物語の流れを作る
2. 各スポットには明確な役割（scene_role）を割り当てる
3. factsから1-2個を選び、謎のモチーフにする
4. plot_keyは最後のmeta_puzzleで使われることを意識する

【scene_roleの種類】
- 導入: 物語の始まり、世界観を提示
- 展開: 情報収集、謎が深まる
- 転換: 状況が変わる、新事実が判明
- 真相接近: 核心に迫る
- ミスリード解除: 誤解が解ける
- 結末: 物語の締めくくり

【plot_key_typeの種類】
- keyword: キーワード
- cipher_piece: 暗号の一部
- coordinate: 座標の一部
- name: 人物名/地名
- number: 数字/年号
- symbol: 記号/紋章

【puzzle_typeの種類】
- logic: 論理パズル（証言整理など）
- pattern: パターン認識（数列など）
- cipher: 暗号解読
- wordplay: 言葉遊び（漢字分解など）
- lateral: 水平思考（矛盾解釈）
- math: 算数パズル`;

/**
 * モチーフ選定を実行
 */
export async function selectMotifs(
    spots: SpotInput[],
    questTheme: string,
    apiKey: string
): Promise<SpotMotif[]> {
    const spotsJson = spots.map((spot, idx) => ({
        spot_id: `S${idx + 1}`,
        spot_name: spot.spot_name,
        spot_summary: spot.spot_summary,
        spot_facts: spot.spot_facts.map((f, i) => `fact_${i + 1}: ${f}`),
        spot_theme_tags: spot.spot_theme_tags,
    }));

    const prompt = `
${MOTIF_SELECTION_PROMPT}

【クエストテーマ】
${questTheme}

【スポット一覧】
${JSON.stringify(spotsJson, null, 2)}

【出力形式】
以下のJSON配列を出力してください：
[
  {
    "spot_id": "S1",
    "spot_name": "スポット名",
    "selected_facts": ["fact_1", "fact_3"],
    "scene_role": "導入|展開|転換|真相接近|ミスリード解除|結末",
    "plot_key_type": "keyword|cipher_piece|coordinate|name|number|symbol",
    "suggested_puzzle_type": "logic|pattern|cipher|wordplay|lateral|math",
    "rationale": "選定理由"
  },
  ...
]

重要:
- 最初のスポットは必ず「導入」
- 最後のスポットは必ず「結末」
- 「転換」は中盤に1-2個配置
- 各factsは異なるスポットで使い分ける（重複最小限）
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

        // JSONを抽出
        const jsonMatch = responseText.match(/```json([\s\S]*?)```/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        const parsed = JSON.parse(jsonText.trim());

        // 結果を整形
        return parsed.map((item: any): SpotMotif => ({
            spot_id: item.spot_id,
            spot_name: item.spot_name,
            selected_facts: item.selected_facts || [],
            scene_role: validateSceneRole(item.scene_role),
            plot_key_type: validatePlotKeyType(item.plot_key_type),
            suggested_puzzle_type: validatePuzzleType(item.suggested_puzzle_type),
        }));
    } catch (error: any) {
        console.error('Motif selection error:', error);
        // フォールバック: デフォルトの役割割り当て
        return spots.map((spot, idx): SpotMotif => ({
            spot_id: `S${idx + 1}`,
            spot_name: spot.spot_name,
            selected_facts: spot.spot_facts.slice(0, 2).map((_, i) => `fact_${i + 1}`),
            scene_role: getDefaultSceneRole(idx, spots.length),
            plot_key_type: 'keyword',
            suggested_puzzle_type: getDefaultPuzzleType(idx),
        }));
    }
}

/**
 * scene_roleを検証
 */
function validateSceneRole(role: string): SceneRole {
    const valid: SceneRole[] = ['導入', '展開', '転換', '真相接近', 'ミスリード解除', '結末'];
    return valid.includes(role as SceneRole) ? (role as SceneRole) : '展開';
}

/**
 * plot_key_typeを検証
 */
function validatePlotKeyType(type: string): PlotKeyType {
    const valid: PlotKeyType[] = ['keyword', 'cipher_piece', 'coordinate', 'name', 'number', 'symbol'];
    return valid.includes(type as PlotKeyType) ? (type as PlotKeyType) : 'keyword';
}

/**
 * puzzle_typeを検証
 */
function validatePuzzleType(type: string): PuzzleType {
    const valid: PuzzleType[] = ['logic', 'pattern', 'cipher', 'wordplay', 'lateral', 'math'];
    return valid.includes(type as PuzzleType) ? (type as PuzzleType) : 'logic';
}

/**
 * デフォルトのscene_roleを取得
 */
function getDefaultSceneRole(index: number, total: number): SceneRole {
    if (index === 0) return '導入';
    if (index === total - 1) return '結末';
    if (index === Math.floor(total / 2)) return '転換';
    if (index > total * 0.7) return '真相接近';
    return '展開';
}

/**
 * デフォルトのpuzzle_typeを取得（バリエーションを持たせる）
 */
function getDefaultPuzzleType(index: number): PuzzleType {
    const types: PuzzleType[] = ['logic', 'pattern', 'cipher', 'wordplay', 'lateral', 'math'];
    return types[index % types.length];
}
