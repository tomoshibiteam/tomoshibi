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

