/**
 * Layton-Style Quest Generation Types
 * 
 * 「解く = 学ぶ + 進む」を実現するクエスト生成のためのデータ構造
 */

// =============================================================================
// 入力データ構造
// =============================================================================

/**
 * スポット入力データ
 * システムに渡す最小限の情報
 */
export interface SpotInput {
    /** スポット名 */
    spot_name: string;
    /** 概要（2-4行） */
    spot_summary: string;
    /** 象徴的事実（3-7個） */
    spot_facts: string[];
    /** テーマタグ（例: ["交易", "蘭学", "水"]） */
    spot_theme_tags: string[];
    /** 座標 */
    lat: number;
    lng: number;
    /** 制約条件 */
    constraints?: {
        order?: number;
        travel_time_from_prev?: number;
    };
}

/**
 * クエスト生成リクエスト
 */
export interface QuestGenerationRequest {
    /** ユーザーのプロンプト（最優先） */
    prompt: string;
    /** 難易度 */
    difficulty: 'easy' | 'medium' | 'hard';
    /** スポット数 */
    spot_count: number;
    /** テーマタグ (legacy) */
    theme_tags?: string[];
    /** ジャンル補助（物語骨格） */
    genre_support?: string;
    /** トーン補助（雰囲気） */
    tone_support?: string;
    /** 補助質問による補足情報 */
    prompt_support?: {
        protagonist?: string;  // 主人公
        objective?: string;    // 目的
        ending?: string;       // 結末
    };
    /** 中心地点（現在地など） */
    center_location?: { lat: number; lng: number };
    /** スポット間の最大距離（km） */
    radius_km?: number;
}

// =============================================================================
// 中間データ構造（パイプライン内部用）
// =============================================================================

/**
 * Step 1 出力: モチーフ選定結果
 */
export interface SpotMotif {
    spot_id: string;
    spot_name: string;
    /** 選択されたfacts（1-2個） */
    selected_facts: string[];
    /** シーンの役割 */
    scene_role: SceneRole;
    /** plot_keyの性質 */
    plot_key_type: PlotKeyType;
    /** 謎のタイプ候補 */
    suggested_puzzle_type: PuzzleType;
}

/**
 * シーンの役割
 */
export type SceneRole =
    | '導入'         // 物語の始まり、世界観の提示
    | '展開'         // 情報収集、謎の深化
    | '転換'         // 状況が変わる、新事実
    | '真相接近'     // 核心に迫る
    | 'ミスリード解除' // 誤解が解ける
    | '結末';        // 物語の締め

/**
 * plot_keyの種類
 */
export type PlotKeyType =
    | 'keyword'      // キーワード
    | 'cipher_piece' // 暗号の一部
    | 'coordinate'   // 座標の一部
    | 'name'         // 人物名/地名
    | 'number'       // 数字/年号
    | 'symbol';      // 記号/紋章

/**
 * 謎のタイプ（ひらめき系）
 */
export type PuzzleType =
    | 'logic'        // 論理（証言から嘘つき特定など）
    | 'pattern'      // パターン（数列の法則など）
    | 'cipher'       // 暗号（テーマをモチーフにした暗号）
    | 'wordplay'     // 言葉遊び（漢字分解、アナグラム）
    | 'lateral'      // 水平思考（矛盾解釈）
    | 'math';        // 算数（条件から唯一解）

/**
 * Step 2 出力: 物語骨格
 */
export interface MainPlot {
    /** 物語の前提 */
    premise: string;
    /** 主人公の目的 */
    goal: string;
    /** 対立要素または中心の謎 */
    antagonist_or_mystery: string;
    /** 最終的な真相の概要 */
    final_reveal_outline: string;
}

// =============================================================================
// 出力データ構造
// =============================================================================

/**
 * ロアカード（スポットの背景情報）
 */
export interface LoreCard {
    /** 物語文（この地点の意味づけ） */
    short_story_text: string;
    /** 使用したfacts（インデックス参照） */
    facts_used: string[];
    /** プレイヤーへの資料（これだけで謎が解ける） */
    player_handout: string;
}

/**
 * 謎データ
 */
export interface LaytonPuzzle {
    /** 謎のタイプ */
    type: PuzzleType;
    /** 出題文（ひらめき型） */
    prompt: string;
    /** ルール説明（必要な場合） */
    rules?: string;
    /** 答え */
    answer: string;
    /** 解法ステップ */
    solution_steps: string[];
    /** ヒント（抽象→具体→救済） */
    hints: [string, string, string];
    /** 難易度（1-5、2-3が基本） */
    difficulty: 1 | 2 | 3 | 4 | 5;
}

/**
 * 報酬（謎を解いた結果）
 */
export interface Reward {
    /** 背景理解（factsと接続） */
    lore_reveal: string;
    /** 物語の鍵 */
    plot_key: string;
    /** 次への誘導 */
    next_hook: string;
}

/**
 * スポットシーン（1スポット分の完全データ）
 */
export interface SpotScene {
    spot_id: string;
    spot_name: string;
    lat: number;
    lng: number;
    /** シーンの役割 */
    scene_role: SceneRole;
    /** ロアカード */
    lore_card: LoreCard;
    /** 謎 */
    puzzle: LaytonPuzzle;
    /** 報酬 */
    reward: Reward;
    /** なぜこの謎がこのスポットか（1-2文） */
    linking_rationale: string;
}

/**
 * メタパズル（最終謎）
 */
export interface MetaPuzzle {
    /** 使用するplot_key（["S1.plot_key", "S2.plot_key", ...]） */
    inputs: string[];
    /** 最終謎の出題文 */
    prompt: string;
    /** 答え */
    answer: string;
    /** 真相との接続説明 */
    explanation: string;
}

/**
 * クエスト出力（完全データ）
 */
export interface QuestOutput {
    quest_id: string;
    quest_title: string;
    main_plot: MainPlot;
    spots: SpotScene[];
    meta_puzzle: MetaPuzzle;
    /** 生成メタデータ */
    generation_metadata: {
        generated_at: string;
        pipeline_version: string;
        validation_passed: boolean;
        validation_warnings?: string[];
    };
}

// =============================================================================
// 検証結果
// =============================================================================

/**
 * 検証エラーコード
 */
export type ValidationErrorCode =
    | 'NOT_SELF_CONTAINED'     // 外部知識が必要
    | 'FACTS_NOT_CONNECTED'    // factsとpuzzleが未接続
    | 'PLOT_KEY_UNUSED'        // plot_keyが使われていない
    | 'WEAK_RATIONALE'         // linking_rationaleが弱い
    | 'TRIVIA_QUESTION'        // 暗記クイズになっている
    | 'UNRELATED_PUZZLE';      // スポットと無関係な謎

/**
 * 検証結果
 */
export interface LaytonValidationResult {
    passed: boolean;
    errors: {
        spot_id: string;
        code: ValidationErrorCode;
        message: string;
    }[];
    warnings: {
        spot_id: string;
        message: string;
    }[];
    /** 各スポットのスコア */
    spot_scores: {
        spot_id: string;
        self_contained_score: number;
        facts_connection_score: number;
        narrative_fit_score: number;
        puzzle_quality_score: number;
    }[];
}

// =============================================================================
// パイプラインステート
// =============================================================================

/**
 * パイプラインの進行状態
 */
export interface PipelineState {
    current_step: 1 | 2 | 3 | 4;
    step_name: 'motif_selection' | 'plot_creation' | 'puzzle_design' | 'validation';
    progress: number; // 0-100
    current_spot_index?: number;
    total_spots?: number;
    error?: string;
}

/**
 * パイプラインコールバック
 */
export interface PipelineCallbacks {
    onProgress: (state: PipelineState) => void;
    onSpotComplete: (spot: SpotScene, index: number) => void;
    onPlotComplete: (plot: MainPlot) => void;
    onComplete: (quest: QuestOutput) => void;
    onError: (error: Error, state: PipelineState) => void;
}
