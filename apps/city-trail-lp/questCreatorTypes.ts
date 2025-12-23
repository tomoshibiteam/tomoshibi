// Type definitions for Suno-style Quest Creator Canvas

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

// Inspiration tags for quick selection
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
