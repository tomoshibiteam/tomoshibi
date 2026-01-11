// Type definitions for Suno-style Quest Creator Canvas

// ========== Enhanced Quest Data Editor Types ==========

/**
 * 物語骨格（Main Plot）- Step 1 で編集
 */
export interface MainPlot {
  premise: string;           // 前提（物語の設定）
  goal: string;              // 目的（プレイヤーのゴール）
  antagonist: string;        // 対立/謎（障害や中心的な謎）
  finalReveal: string;       // 真相（最終的に明かされる真実）
}

/**
 * 謎設定（Puzzle Configuration）- Step 2 で編集
 */
export type PuzzleType = 'logic' | 'pattern' | 'cipher' | 'wordplay' | 'lateral' | 'arithmetic';

export interface PuzzleConfig {
  puzzleType: PuzzleType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  solutionSteps: string[];    // 解法ステップ
  hints: {
    hint1: string;            // 抽象的ヒント
    hint2: string;            // 具体的ヒント
    hint3: string;            // 救済ヒント（ほぼ答え）
  };
}

/**
 * ロアカード（Lore Card）- Step 2 で編集
 */
export interface LoreCard {
  narrativeText: string;      // 物語文（この地点の意味づけ）
  usedFacts: string[];        // 使用する事実（spot_facts の ID リスト）
  playerMaterial: string;     // プレイヤー資料（謎を解くのに必要な情報）
}

/**
 * 報酬設定（Spot Reward）- Step 2 で編集
 */
export interface SpotReward {
  loreReveal: string;         // 背景理解（正解後に明かされる情報）
  plotKey: string;            // 物語の鍵（最終謎で使用されるキーワード）
  nextHook: string;           // 次への誘導
}

/**
 * シーン設定（Scene Settings）- Step 2 で編集
 */
export type SceneRole =
  | 'introduction'     // 導入
  | 'development'      // 展開
  | 'turning_point'    // 転換
  | 'truth_approach'   // 真相接近
  | 'misdirect_clear'  // ミスリード解除
  | 'conclusion';      // 結末

export interface SceneSettings {
  sceneRole: SceneRole;
  linkingRationale: string;   // なぜこの謎がこのスポットか
}

/**
 * メタパズル（Meta Puzzle）- Step 3 で編集
 */
export interface MetaPuzzleKeyEntry {
  spotId: string;
  plotKey: string;
  isUsed: boolean;
}

export interface MetaPuzzle {
  keys: MetaPuzzleKeyEntry[];        // 各スポットのplot_keyと使用フラグ
  questionText: string;              // 最終謎の出題文
  finalAnswer: string;               // 最終答え
  truthConnection: string;           // 真相との接続説明
}

/**
 * 謎タイプの日本語ラベル
 */
export const PUZZLE_TYPE_LABELS: Record<PuzzleType, { label: string; icon: string }> = {
  logic: { label: '論理', icon: '🧠' },
  pattern: { label: 'パターン', icon: '🔢' },
  cipher: { label: '暗号', icon: '🔐' },
  wordplay: { label: '言葉遊び', icon: '📝' },
  lateral: { label: '水平思考', icon: '💡' },
  arithmetic: { label: '算数', icon: '🔢' },
};

/**
 * シーンロールの日本語ラベル
 */
export const SCENE_ROLE_LABELS: Record<SceneRole, { label: string; description: string }> = {
  introduction: { label: '導入', description: '物語の始まり、世界観の説明' },
  development: { label: '展開', description: '謎解きを進める過程' },
  turning_point: { label: '転換', description: '物語の転機、新事実の発覚' },
  truth_approach: { label: '真相接近', description: '真実に近づく瞬間' },
  misdirect_clear: { label: 'ミスリード解除', description: '誤った思い込みの訂正' },
  conclusion: { label: '結末', description: '物語の締めくくり' },
};

// ========== End of Enhanced Quest Data Editor Types ==========

export type SectionStatus = 'idle' | 'generating' | 'ready' | 'editing' | 'error' | 'locked' | 'needs-review';

export type SectionType =
  | 'basic-info'
  | 'spot'
  | 'story-prologue'
  | 'story-characters'
  | 'story-epilogue';

export type ContentTabType = 'route' | 'story' | 'mystery';

export interface Section {
  id: string;
  type: SectionType;
  status: SectionStatus;
  data: any;
  lockedAt?: Date;
  error?: string;
  spotIndex?: number; // For spot sections
}

export interface GenerationConstraints {
  duration?: number; // minutes
  difficulty?: 'easy' | 'medium' | 'hard';
  spotCount?: number;
  indoor?: boolean;
  language?: string;
  distance?: number; // km
  target?: string; // e.g., "families", "couples"
}

export interface MaterialItem {
  id: string;
  type: 'url' | 'memo' | 'image';
  value: string;
}

export interface GenerationInput {
  mode: 'simple' | 'custom';
  prompt: string;
  constraints?: GenerationConstraints;
  materials?: MaterialItem[];
  inspirationTags?: string[];
}

// Completion checklist items
export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  isCompleted: boolean;
  linkedSection?: string; // Section to scroll to when clicked
}

export const COMPLETION_CHECKLIST: Omit<ChecklistItem, 'isCompleted'>[] = [
  { id: 'title', label: 'タイトル確定', description: 'クエストのタイトルを確認', linkedSection: 'basic-info' },
  { id: 'spots', label: 'スポット確認', description: '各スポットの住所と順序を確認', linkedSection: 'spots' },
  { id: 'mystery', label: '謎テスト', description: '謎の難易度と正解を確認', linkedSection: 'mystery' },
  { id: 'story', label: 'ストーリー校正', description: 'プロローグ・エピローグを確認', linkedSection: 'story' },
  { id: 'preview', label: 'プレビュー確認', description: 'プレイヤー視点で試走', linkedSection: 'preview' },
];

// Inspiration tags for quick selection (legacy - for backward compatibility)
export const INSPIRATION_TAGS = [
  '歴史ロマン',
  'ミステリー',
  'グルメ探訪',
  '夜景',
  'デートに最適',
  'ファミリー向け',
  'フォトジェニック',
  'アート巡り',
  '地元の隠れ家',
  '季節限定',
];

// ========== New Prompt-First Design ==========

/**
 * ジャンル補助タグ（物語骨格系）
 * プロンプトの不足を埋め、生成の骨格を固定する
 */
export const GENRE_SUPPORT_TAGS = [
  { id: 'detective', label: '探偵・推理', description: '事件を調査し、真相を解き明かす' },
  { id: 'treasure', label: '宝探し', description: '隠された宝や秘密を発見する' },
  { id: 'history', label: '歴史解明', description: '過去の謎や伝説を解き明かす' },
  { id: 'horror', label: 'ホラー・怪談', description: '背筋が凍るような恐怖体験' },
] as const;

/**
 * トーン補助タグ（雰囲気系）
 * 生成のトーン・雰囲気を固定する
 */
export const TONE_SUPPORT_TAGS = [
  { id: 'mysterious', label: 'ミステリアス', description: '謎めいた雰囲気' },
  { id: 'thrilling', label: 'スリリング', description: '緊張感のある展開' },
  { id: 'heartwarming', label: 'ほのぼの', description: '温かみのある物語' },
  { id: 'romantic', label: 'ロマンチック', description: '恋愛要素のある雰囲気' },
  { id: 'educational', label: '学び・教養', description: '知的好奇心を刺激' },
] as const;

export type GenreSupportId = typeof GENRE_SUPPORT_TAGS[number]['id'];
export type ToneSupportId = typeof TONE_SUPPORT_TAGS[number]['id'];

/**
 * 補助質問（プロンプトの解像度を上げるための任意入力）
 */
export interface PromptSupport {
  protagonist?: string;  // 主人公は？（例：探偵、旅人、学生）
  objective?: string;    // 目的は？（例：宝探し、真実解明）
  ending?: string;       // どんな結末？（例：ハッピーエンド、どんでん返し）
}

/**
 * プロンプト主役の入力状態
 */
export interface PromptFirstInput {
  mainPrompt: string;
  promptSupport: PromptSupport;
  genreSupport?: GenreSupportId;
  toneSupport?: ToneSupportId;
  constraints: {
    duration?: number;      // 所要時間（分）
    spotCount?: number;     // スポット数
    difficulty?: 'easy' | 'medium' | 'hard';
    radiusKm?: number;      // 半径（km）
    prefecture?: string;    // 都道府県
  };
}

/**
 * AIに渡す要約プレビュー用の構造化データ
 */
export interface AISummaryPreview {
  main: string;
  genre?: string;
  tone?: string;
  protagonist?: string;
  objective?: string;
  ending?: string;
  difficulty: string;
  spotCount: number;
}

/**
 * 補助質問のプレースホルダー
 */
export const PROMPT_SUPPORT_PLACEHOLDERS = {
  protagonist: '例：探偵、旅人、学生',
  objective: '例：宝探し、真実解明',
  ending: '例：どんでん返し、ハッピーエンド',
};


// Status badge configurations
export const STATUS_CONFIG: Record<SectionStatus, { label: string; className: string }> = {
  idle: { label: '待機中', className: 'bg-stone-100 text-stone-600' },
  generating: { label: '生成中...', className: 'bg-amber-100 text-amber-700' },
  ready: { label: '完了', className: 'bg-emerald-100 text-emerald-700' },
  editing: { label: '編集中', className: 'bg-sky-100 text-sky-700' },
  error: { label: 'エラー', className: 'bg-rose-100 text-rose-700' },
  locked: { label: 'ロック済', className: 'bg-violet-100 text-violet-700' },
  'needs-review': { label: '要確認', className: 'bg-orange-100 text-orange-700' },
};

// Section type labels
export const SECTION_LABELS: Record<SectionType, string> = {
  'basic-info': '基本情報',
  'spot': 'スポット',
  'story-prologue': 'プロローグ',
  'story-characters': 'キャラクター',
  'story-epilogue': 'エピローグ',
};

// =============================================================================
// Quest Publishing System Types
// =============================================================================

/**
 * Quest visibility/sharing mode
 * - PRIVATE: Personal use, instant play, no quality check required (試作品)
 * - SHARE: Limited sharing (invite-only), basic quality check required (限定共有)
 * - PUBLISH: Public listing, full quality check + review required (公開)
 */
export type QuestMode = 'PRIVATE' | 'SHARE' | 'PUBLISH';

/**
 * Quest publishing status
 */
export type QuestPublishStatus =
  | 'draft'              // Initial state after AI generation
  | 'ready_for_share'    // Quality check passed for SHARE mode
  | 'ready_for_publish'  // Quality check passed for PUBLISH mode
  | 'pending_review'     // Submitted for admin review
  | 'published'          // Approved and publicly visible
  | 'rejected';          // Rejected by admin review

/**
 * Quality check category for grouping checklist items
 */
export type QualityCheckCategory = 'route' | 'info' | 'mystery' | 'rescue';

/**
 * Quality checklist item definition
 */
export interface QualityCheckItem {
  id: string;
  label: string;
  description: string;
  category: QualityCheckCategory;
  requiredFor: QuestMode[];  // Which modes require this check
  linkedSection?: string;    // Section to scroll to when clicked
}

/**
 * Individual quality check completion record
 */
export interface QualityCheckRecord {
  completed: boolean;
  completedAt?: string;  // ISO timestamp
  completedBy?: string;  // userId
}

/**
 * Quality checklist state (stored in DB as JSONB)
 */
export type QualityChecklist = Record<string, QualityCheckRecord>;

/**
 * Quality checklist items for Share/Publish gates
 * Organized by category: route, info, mystery, rescue
 */
export const QUALITY_CHECKLIST_ITEMS: QualityCheckItem[] = [
  // ルート成立 (Route Validity)
  {
    id: 'route_distance',
    label: '距離/所要時間の確認',
    description: '全体の距離と所要時間が妥当か確認',
    category: 'route',
    requiredFor: ['SHARE', 'PUBLISH'],
    linkedSection: 'spots',
  },
  {
    id: 'route_hours',
    label: '営業時間の確認',
    description: '各スポットの営業時間を確認',
    category: 'route',
    requiredFor: ['SHARE', 'PUBLISH'],
    linkedSection: 'spots',
  },
  {
    id: 'route_access',
    label: '入場条件の確認',
    description: '入場料・予約の必要性を確認',
    category: 'route',
    requiredFor: ['SHARE', 'PUBLISH'],
    linkedSection: 'spots',
  },

  // 情報成立 (Information Validity)
  {
    id: 'info_clues',
    label: '手がかりの確認',
    description: '現地で手がかりが取得可能か確認（看板・展示・碑文など）',
    category: 'info',
    requiredFor: ['SHARE', 'PUBLISH'],
    linkedSection: 'mystery',
  },

  // 謎成立 (Mystery Validity)
  {
    id: 'mystery_unique',
    label: '答えの一意性',
    description: '答えが一意に決まるか確認',
    category: 'mystery',
    requiredFor: ['SHARE', 'PUBLISH'],
    linkedSection: 'mystery',
  },
  {
    id: 'mystery_hints',
    label: 'ヒント段階の確認',
    description: 'ヒントが破綻していないか確認',
    category: 'mystery',
    requiredFor: ['SHARE', 'PUBLISH'],
    linkedSection: 'mystery',
  },

  // 救済 (Rescue/Recovery)
  {
    id: 'rescue_hints',
    label: '詰まり時のヒント',
    description: 'ヒント導線が用意されているか確認',
    category: 'rescue',
    requiredFor: ['SHARE', 'PUBLISH'],
    linkedSection: 'preview',
  },
  {
    id: 'rescue_skip',
    label: 'スキップ/リトライ導線',
    description: 'スキップ・リトライ導線が用意されているか確認',
    category: 'rescue',
    requiredFor: ['PUBLISH'],
    linkedSection: 'preview',
  },
];

/**
 * Category labels for quality checklist grouping
 */
export const QUALITY_CHECK_CATEGORY_LABELS: Record<QualityCheckCategory, { label: string; icon: string }> = {
  route: { label: 'ルート成立', icon: '🗺️' },
  info: { label: '情報成立', icon: '📍' },
  mystery: { label: '謎成立', icon: '🔍' },
  rescue: { label: '救済', icon: '🆘' },
};

/**
 * Mode configuration for UI display
 */
export const QUEST_MODE_CONFIG: Record<QuestMode, { label: string; labelJa: string; description: string; color: string }> = {
  PRIVATE: {
    label: 'Private',
    labelJa: '自分用',
    description: '試作品として自由にプレイ。品質チェック不要。',
    color: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  SHARE: {
    label: 'Share',
    labelJa: '限定共有',
    description: '友人や仲間に共有。最低限の品質チェックが必要。',
    color: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  PUBLISH: {
    label: 'Publish',
    labelJa: '公開',
    description: '誰でもプレイ可能。厳格な品質チェック＋審査が必要。',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
};

/**
 * Helper function to get required checklist items for a given mode
 */
export function getRequiredChecklistItems(mode: QuestMode): QualityCheckItem[] {
  return QUALITY_CHECKLIST_ITEMS.filter(item => item.requiredFor.includes(mode));
}

/**
 * Helper function to check if all required items are completed
 */
export function isQualityCheckComplete(mode: QuestMode, checklist: QualityChecklist): boolean {
  const requiredItems = getRequiredChecklistItems(mode);
  return requiredItems.every(item => checklist[item.id]?.completed === true);
}

/**
 * Helper function to get incomplete items for a given mode
 */
export function getIncompleteItems(mode: QuestMode, checklist: QualityChecklist): QualityCheckItem[] {
  const requiredItems = getRequiredChecklistItems(mode);
  return requiredItems.filter(item => checklist[item.id]?.completed !== true);
}
