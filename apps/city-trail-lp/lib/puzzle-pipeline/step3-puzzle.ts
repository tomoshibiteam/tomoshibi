/**
 * Step 3: ひらめき系謎生成
 * 
 * player_handoutだけで解ける、ひらめき型の謎を設計
 * 「解く = 学ぶ + 進む」をワンセットで実現
 */

import {
    SpotInput,
    SpotMotif,
    MainPlot,
    SpotScene,
    LoreCard,
    LaytonPuzzle,
    Reward,
    PuzzleType,
} from './layton-types';
import { buildStoryContext } from './step2-plot';
import { getModelEndpoint } from '../ai/model-config';

/**
 * 謎生成用システムプロンプト
 */
const PUZZLE_SYSTEM_PROMPT = `あなたはひらめき型パズルの謎作家です。
「ひらめき」と「論理」で解ける、美しい謎を設計してください。

【絶対ルール】
1. 外部知識（ネット検索、暗記）が必要な問題は禁止
2. player_handout（資料）の情報だけで解けること
3. 謎を解くと「背景理解」と「物語の鍵」が同時に得られること
4. スポットのモチーフと謎が因果的に結びつくこと

【文章の読みやすさ（最重要）】
- 中学生が読んでスラスラ理解できる言葉を使う
- 専門用語・難しい漢字・意味不明なカタカナ語は絶対禁止
- 一文は短く、リズムよく読めるように
- 難しい歴史や文化の話は「へぇ、面白い！」と思える身近な言葉で
- 読んでいて「しんどい」と感じさせない、軽やかで楽しい文体
- 物語文（short_story_text）は特に読みやすく、ワクワクする書き方で

【ひらめき系謎のタイプ】
- logic: 証言から嘘つき特定、条件整理
- pattern: 数列の法則、図形の規則性
- cipher: スポットテーマをモチーフにした暗号解読
- wordplay: 漢字分解、アナグラム、しりとり系
- lateral: 矛盾する状況の解釈、視点の転換
- math: 条件から唯一解を導く算数パズル

【禁止事項】
- 「○○で有名な人物は誰？」系の暗記クイズ
- スポットと関係ない一般パズルを置いて解説で無理やり結びつける
- 答えが複数通りあり得る曖昧な問題
- 難解な専門用語や説明的すぎる文章

【品質基準】
- 出題文の美しさ（物語に溶け込む、謎めいた語り口）
- 解けた時の納得感（「なるほど！」という感覚）
- 難易度は「難しい」ではなく「気持ちよくひらめく」（2-3が基本）`;

/**
 * 各タイプ別のプロンプト補足
 */
const PUZZLE_TYPE_GUIDES: Record<PuzzleType, string> = {
    logic: `
【論理パズルの設計ガイド】
- 3人以上の証言から真実を見つける
- 条件を整理すると答えが一意に決まる
- 表や図を使って考えると解きやすい

例: 「3人の商人がそれぞれ異なることを言っている。正直者は1人だけ。誰が正直者か？」`,

    pattern: `
【パターンパズルの設計ガイド】
- 数列や図形の規則性を見つける
- 法則が分かれば次の要素が予測できる
- スポットの特徴（年号、人数など）を数列に組み込む

例: 「○→△→□→？ この並びの法則は？」`,

    cipher: `
【暗号パズルの設計ガイド】
- スポットのテーマ（交易、蘭学など）をモチーフにした暗号
- 解読のヒントはplayer_handoutに含まれている
- 換字式、位置暗号、キーワード暗号など

例: 「この碑文に刻まれた記号は、実は○○を表している...」`,

    wordplay: `
【言葉遊びパズルの設計ガイド】
- 漢字の分解・合成
- アナグラム（文字の並べ替え）
- 頭文字・末文字を集める
- スポット名や地名の特徴を活用

例: 「この5つの言葉の頭文字を並べると...？」`,

    lateral: `
【水平思考パズルの設計ガイド】
- 一見矛盾する状況を解釈する
- 視点を変えると答えが見える
- 常識の裏をかく発想

例: 「なぜ彼は雨の日にしか現れないのか？」`,

    math: `
【算数パズルの設計ガイド】
- 条件を組み合わせて唯一の答えを導く
- 連立方程式的な思考
- スポットに関連する数字（年号、距離など）を使用

例: 「この3つの条件を全て満たす数は？」`,
};

/**
 * 1つのスポットの謎を生成
 */
export async function generateSpotPuzzle(
    spotInput: SpotInput,
    motif: SpotMotif,
    mainPlot: MainPlot,
    allMotifs: SpotMotif[],
    spotIndex: number,
    apiKey: string
): Promise<SpotScene> {
    const storyContext = buildStoryContext(mainPlot, allMotifs, spotIndex);
    const puzzleTypeGuide = PUZZLE_TYPE_GUIDES[motif.suggested_puzzle_type];

    const prompt = `
${PUZZLE_SYSTEM_PROMPT}

${puzzleTypeGuide}

【物語コンテキスト】
${storyContext}

【スポット情報】
- 名前: ${spotInput.spot_name}
- 概要: ${spotInput.spot_summary}
- 選択されたfacts:
${motif.selected_facts.map(f => {
        const factIndex = parseInt(f.replace('fact_', '')) - 1;
        return `  - ${spotInput.spot_facts[factIndex] || f}`;
    }).join('\n')}
- テーマタグ: ${spotInput.spot_theme_tags.join(', ')}

【出力形式】
以下のJSONを出力してください：
{
  "lore_card": {
    "short_story_text": "物語文（この地点の意味づけ、2-4文）",
    "facts_used": ["fact_1", "fact_2"],
    "player_handout": "プレイヤーに提示する資料（これだけで謎が解ける情報を含む）"
  },
  "puzzle": {
    "type": "${motif.suggested_puzzle_type}",
    "prompt": "出題文（物語に溶け込む、美しく謎めいた語り口で）",
    "rules": "ルール説明（必要な場合のみ）",
    "answer": "答え",
    "solution_steps": ["ステップ1", "ステップ2", "ステップ3"],
    "hints": ["抽象的なヒント", "具体的なヒント", "ほぼ答えのヒント（救済）"],
    "difficulty": 2
  },
  "reward": {
    "lore_reveal": "謎を解くと分かる背景理解（factsと接続した解説）",
    "plot_key": "物語の鍵（キーワード/暗号片/数字など）",
    "next_hook": "次のスポットへ行きたくなる一文"
  },
  "linking_rationale": "なぜこの謎がこのスポットである必然性があるか（1-2文）"
}

【重要】
- player_handoutには謎を解くための全ての情報を含めること
- 答えは資料の情報から論理的に導き出せること
- plot_keyは最終的なmeta_puzzleで使われることを意識すること
`.trim();

    try {
        const res = await fetch(
            getModelEndpoint('puzzle', apiKey),
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

        return buildSpotScene(spotInput, motif, parsed);
    } catch (error: any) {
        console.error('Puzzle generation error:', error);
        return buildFallbackSpotScene(spotInput, motif);
    }
}

/**
 * SpotSceneオブジェクトを構築
 */
function buildSpotScene(
    spotInput: SpotInput,
    motif: SpotMotif,
    parsed: any
): SpotScene {
    return {
        spot_id: motif.spot_id,
        spot_name: motif.spot_name,
        lat: spotInput.lat,
        lng: spotInput.lng,
        scene_role: motif.scene_role,
        lore_card: {
            short_story_text: parsed.lore_card?.short_story_text || '',
            facts_used: parsed.lore_card?.facts_used || motif.selected_facts,
            player_handout: parsed.lore_card?.player_handout || '',
        },
        puzzle: {
            type: motif.suggested_puzzle_type,
            prompt: parsed.puzzle?.prompt || '',
            rules: parsed.puzzle?.rules,
            answer: parsed.puzzle?.answer || '',
            solution_steps: parsed.puzzle?.solution_steps || [],
            hints: parsed.puzzle?.hints || ['ヒント1', 'ヒント2', '答えに近いヒント'],
            difficulty: parsed.puzzle?.difficulty || 2,
        },
        reward: {
            lore_reveal: parsed.reward?.lore_reveal || '',
            plot_key: parsed.reward?.plot_key || '',
            next_hook: parsed.reward?.next_hook || '次の地点へ進みましょう。',
        },
        linking_rationale: parsed.linking_rationale || '',
    };
}

/**
 * フォールバック用のSpotSceneを構築
 */
function buildFallbackSpotScene(
    spotInput: SpotInput,
    motif: SpotMotif
): SpotScene {
    return {
        spot_id: motif.spot_id,
        spot_name: motif.spot_name,
        lat: spotInput.lat,
        lng: spotInput.lng,
        scene_role: motif.scene_role,
        lore_card: {
            short_story_text: `${spotInput.spot_name}には、まだ解き明かされていない謎がある。`,
            facts_used: motif.selected_facts,
            player_handout: spotInput.spot_summary + '\n\n' + spotInput.spot_facts.join('\n'),
        },
        puzzle: {
            type: motif.suggested_puzzle_type,
            prompt: `この場所に隠された謎を解き明かしてください。`,
            answer: '【要設定】',
            solution_steps: ['手がかりを探す', '情報を整理する', '答えを導き出す'],
            hints: ['周囲をよく観察してください', '資料を読み返してみましょう', 'ヒントはすでに目の前にあります'],
            difficulty: 2,
        },
        reward: {
            lore_reveal: `${spotInput.spot_name}の秘密が明らかになった。`,
            plot_key: spotInput.spot_name.slice(0, 2),
            next_hook: '次の地点へ進みましょう。',
        },
        linking_rationale: `${spotInput.spot_name}の特徴を活かした謎。`,
    };
}

/**
 * メタパズルを生成
 */
export async function generateMetaPuzzle(
    spots: SpotScene[],
    mainPlot: MainPlot,
    apiKey: string
): Promise<{ prompt: string; answer: string; explanation: string }> {
    const plotKeys = spots.map(s => ({
        spot_id: s.spot_id,
        spot_name: s.spot_name,
        plot_key: s.reward.plot_key,
    }));

    const prompt = `
あなたはひらめき型パズルの謎作家です。
これまでのスポットで集めた「鍵」を全て使って解く、最終謎を作成してください。

【物語の真相】
${mainPlot.final_reveal_outline}

【集めた鍵】
${JSON.stringify(plotKeys, null, 2)}

【出力形式】
{
  "prompt": "最終謎の出題文（全ての鍵を使う）",
  "answer": "答え",
  "explanation": "真相との接続（なぜこの答えが物語の結末に繋がるか）"
}

【重要】
- 全てのplot_keyを使うこと
- 答えは物語の真相と一致すること
- 解けた時に達成感があること
`.trim();

    try {
        const res = await fetch(
            getModelEndpoint('puzzle', apiKey),
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

        return {
            prompt: parsed.prompt || '全ての鍵を組み合わせて、最後の謎を解け。',
            answer: parsed.answer || '【要設定】',
            explanation: parsed.explanation || '物語の真相がここに。',
        };
    } catch (error: any) {
        console.error('Meta puzzle generation error:', error);
        const combinedKeys = spots.map(s => s.reward.plot_key).join('');
        return {
            prompt: `これまで集めた鍵を全て並べてみよう。そこに隠されたメッセージは？`,
            answer: combinedKeys,
            explanation: '全ての鍵が一つの答えを指し示していた。',
        };
    }
}
