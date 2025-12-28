/**
 * Evidence-Based Puzzle Generation Pipeline
 * 
 * 高品質なAI謎生成のためのデータ構造と型定義
 * 「根拠がないのに生成しない」を絶対ルールとする
 */

// =============================================================================
// Evidence（根拠データ）
// =============================================================================

/** 根拠の種類 */
export type EvidenceType =
    | 'signboard'      // 看板/案内板
    | 'monument'       // モニュメント/像
    | 'inscription'    // 碑文/刻印
    | 'exhibit'        // 常設展示物
    | 'architecture'   // 建築意匠/紋章
    | 'official_name'  // 施設の正式名称
    | 'plaque'         // 説明プレート
    | 'statue'         // 彫像/銅像
    | 'gate'           // 門/鳥居
    | 'other';         // その他

/** データソースの種類 */
export type SourceType =
    | 'survey'         // 運営サーベイ（写真/テキスト採取）- 最高信頼度
    | 'partner'        // 提携先提供データ
    | 'official'       // 公式サイト（常設情報のみ）
    | 'wikipedia'      // Wikipedia（出典付き部分）
    | 'openstreetmap'  // OpenStreetMap tags
    | 'google_places'; // Google Places API

/** 個別の根拠データ */
export interface Evidence {
    /** 一意ID */
    id: string;
    /** 根拠の種類 */
    type: EvidenceType;
    /** 観測できるテキスト/形状の記述 */
    content: string;
    /** 出典URL */
    source_url: string;
    /** データソースの種類 */
    source_type: SourceType;
    /** 常設かどうか（季節/イベント依存はfalse） */
    is_permanent: boolean;
    /** 信頼度 0-1 */
    confidence: number;
    /** 現地での位置説明（例：「入口右手の案内板」） */
    location_description: string;
    /** 取得日時 */
    retrieved_at: string;
}

/** スポットごとの根拠パック */
export interface EvidencePack {
    /** スポットID */
    spot_id: string;
    /** スポット名 */
    spot_name: string;
    /** 緯度 */
    lat: number;
    /** 経度 */
    lng: number;
    /** 公式/百科の説明テキスト */
    official_description: string;
    /** 現地観測可能な手掛かり候補リスト */
    evidences: Evidence[];
    /** 根拠パック生成日時 */
    retrieved_at: string;
    /** 根拠の充足度（0-1、低いと謎生成が困難） */
    sufficiency_score: number;
}

// =============================================================================
// Puzzle（謎データ）
// =============================================================================

/** 謎のステータス */
export type PuzzleStatus =
    | 'draft'                 // 下書き（検証未実施）
    | 'validated'             // 検証済み（品質ゲート通過）
    | 'needs_more_evidence'   // 根拠不足
    | 'needs_regeneration';   // 再生成が必要

/** 使用した根拠の参照 */
export interface EvidenceUsage {
    /** 根拠ID */
    evidence_id: string;
    /** 出典URL */
    source_url: string;
    /** どのように使用したか */
    usage: string;
}

/** 検証エラー */
export interface ValidationError {
    code: string;
    message: string;
    severity: 'error' | 'warning';
}

/** 謎データ（プレイヤー向け + 検証用） */
export interface Puzzle {
    /** 謎ID */
    id: string;
    /** 対応するスポットID */
    spot_id: string;

    // ---------------------------------------------------------------------------
    // プレイヤー向けフィールド
    // ---------------------------------------------------------------------------

    /** 謎の本文（プレイヤーに提示するテキスト） */
    puzzle_statement: string;
    /** 現地で何を見ればいいか（具体的な指示） */
    on_site_instruction: string;
    /** 段階ヒント（2つ） */
    hints: [string, string];
    /** 最終救済（答え表示 or スキップ） */
    final_rescue: 'show_answer' | 'skip';
    /** 正解（一意） */
    answer: string;
    /** 許容される別解（表記揺れ対応） */
    acceptable_answers?: string[];
    /** 正解時メッセージ */
    success_message: string;

    // ---------------------------------------------------------------------------
    // 検証・内部用フィールド
    // ---------------------------------------------------------------------------

    /** 使用した根拠のリスト */
    evidence_used: EvidenceUsage[];
    /** 解法手順（内部検証用） */
    solution_steps: string[];
    /** 物語上の意味（なぜこの場所でこの謎なのか） */
    narrative_link: string;

    // ---------------------------------------------------------------------------
    // 品質スコア（Validatorが設定）
    // ---------------------------------------------------------------------------

    /** 現地裏付けの信頼度（0-1） */
    grounding_confidence: number;
    /** 物語との結びつきスコア（0-1） */
    narrative_fit_score: number;
    /** 解ける保証スコア（0-1） */
    solvability_score: number;

    // ---------------------------------------------------------------------------
    // ステータス
    // ---------------------------------------------------------------------------

    /** 現在のステータス */
    status: PuzzleStatus;
    /** 検証エラー/警告 */
    validation_errors?: ValidationError[];
    /** 生成日時 */
    generated_at: string;
    /** 最終検証日時 */
    validated_at?: string;
}

// =============================================================================
// Generator 出力形式
// =============================================================================

/** 謎生成の成功レスポンス */
export interface PuzzleGenerationSuccess {
    status: 'success';
    puzzle: Omit<Puzzle, 'id' | 'grounding_confidence' | 'narrative_fit_score' | 'solvability_score' | 'status' | 'validation_errors' | 'generated_at' | 'validated_at'>;
}

/** 根拠不足のレスポンス */
export interface PuzzleGenerationNeedsEvidence {
    status: 'needs_more_evidence';
    missing_evidence: string[];
    suggestion: string;
}

/** 謎生成のレスポンス */
export type PuzzleGenerationResult = PuzzleGenerationSuccess | PuzzleGenerationNeedsEvidence;

// =============================================================================
// Validator 出力形式
// =============================================================================

/** 検証結果 */
export interface ValidationResult {
    /** 検証通過したかどうか */
    passed: boolean;
    /** 現地裏付けの信頼度（Evidence の信頼度平均） */
    grounding_confidence: number;
    /** 物語との結びつきスコア */
    narrative_fit_score: number;
    /** 解ける保証スコア */
    solvability_score: number;
    /** エラーリスト */
    errors: ValidationError[];
    /** 警告リスト */
    warnings: ValidationError[];
    /** 推奨アクション */
    recommended_action?: 'regenerate' | 'add_evidence' | 'manual_review';
}

// =============================================================================
// Quality Gate（品質ゲート）
// =============================================================================

/** 公開モード */
export type PublishMode = 'private' | 'share' | 'publish';

/** モードごとの品質要件 */
export const QUALITY_REQUIREMENTS: Record<PublishMode, {
    min_grounding_confidence: number;
    min_narrative_fit_score: number;
    min_solvability_score: number;
    requires_validation: boolean;
    requires_manual_review: boolean;
}> = {
    private: {
        min_grounding_confidence: 0,      // 警告のみ
        min_narrative_fit_score: 0,
        min_solvability_score: 0,
        requires_validation: false,       // Draft扱いで遊べる
        requires_manual_review: false,
    },
    share: {
        min_grounding_confidence: 0.6,    // 最低ライン
        min_narrative_fit_score: 0.5,
        min_solvability_score: 0.7,
        requires_validation: true,        // Validator必須
        requires_manual_review: false,
    },
    publish: {
        min_grounding_confidence: 0.8,    // 高品質必須
        min_narrative_fit_score: 0.7,
        min_solvability_score: 0.9,
        requires_validation: true,
        requires_manual_review: true,     // クリエイター編集完了チェック
    },
};

// =============================================================================
// Confidence 計算用ヘルパー
// =============================================================================

/** ソースタイプごとのベース信頼度 */
export const SOURCE_CONFIDENCE: Record<SourceType, number> = {
    survey: 1.0,
    partner: 0.95,
    official: 0.9,
    wikipedia: 0.8,
    openstreetmap: 0.7,
    google_places: 0.75,
};
