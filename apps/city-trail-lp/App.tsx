import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MapPin, 
  Smartphone, 
  Clock, 
  Users, 
  ChevronDown, 
  Menu, 
  X, 
  Compass, 
  Star, 
  Heart, 
  Briefcase, 
  ArrowRight,
  Mail,
  Lightbulb,
  Send,
  CheckCircle,
  Coins,
  Sparkles,
  Target,
  Globe2,
  CheckSquare,
  Rocket,
  Shield,
  PlayCircle,
  BookOpen,
  Map,
  Bold,
  Tag,
  List,
  Quote,
  User,
  Edit,
  Trash2,
  Info,
  GripVertical,
  Puzzle,
  Scroll,
  PlusCircle,
  Bell
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { supabase } from './supabaseClient';

declare global {
  // MapLibre is loaded from CDN
}

function CreatorAnalyticsPage({
  onBack,
  onLogoHome,
  analytics = [],
  analyticsFilter = 'all',
  onChangeAnalyticsFilter,
  onOpenDetail,
  detailQuestAnalytics,
  detailLoading,
}: {
  onBack: () => void;
  onLogoHome: () => void;
  analytics?: {
    questId: string;
    title: string;
    playCount: number;
    uniquePlayers: number;
    clearCount: number;
    clearRate: number;
    avgDurationMin: number | null;
    avgHints: number | null;
    avgWrongs: number | null;
    avgRating: number | null;
    reviewCount: number;
  }[];
  analyticsFilter?: 'all' | '30d' | '7d';
  onChangeAnalyticsFilter?: (v: 'all' | '30d' | '7d') => void;
  onOpenDetail?: (questId: string, title?: string) => void;
  detailQuestAnalytics?: {
    questId: string;
    title: string;
    summary: {
      playCount: number;
      clearRate: number;
      avgDurationMin: number | null;
      avgHints: number | null;
      avgWrongs: number | null;
    };
    steps: {
      step: number;
      name: string;
      reached: number;
      completed: number;
      dropRate: number;
      avgHints: number | null;
      avgWrongs: number | null;
    }[];
    reviews: {
      avgRating: number | null;
      count: number;
      distribution: { score: number; count: number }[];
      latest: { rating: number; comment: string | null; created_at: string }[];
    };
  } | null;
  detailLoading?: boolean;
}) {
  const formatMinutes = (m: number | null) => (m != null ? `${m} 分` : '—');

  return (
    <section className="min-h-screen bg-white">
      <div className="container mx-auto px-4 md:px-10 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-sm text-brand-dark font-bold hover:underline flex items-center gap-1">
            &lt; プロフィールへ戻る
          </button>
          <div className="flex items-center gap-2 text-xs">
            {(['all', '30d', '7d'] as const).map((f) => (
              <button
                key={f}
                onClick={() => onChangeAnalyticsFilter?.(f)}
                className={`px-3 py-1 rounded-full border text-sm ${
                  analyticsFilter === f
                    ? 'bg-brand-gold text-white border-brand-gold'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-brand-gold hover:text-brand-dark'
                }`}
              >
                {f === 'all' ? '全期間' : f === '30d' ? '直近30日' : '直近7日'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/90 border border-stone-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-brand-dark">プレイ状況（ベータ）</h2>
              <span className="text-xs text-stone-500">自分のクエストのセッション集計</span>
            </div>
          </div>

          {analytics && analytics.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-stone-500">
                      <th className="py-2 pr-3">クエスト</th>
                      <th className="py-2 pr-3 text-right">プレイ数</th>
                      <th className="py-2 pr-3 text-right">ユニーク</th>
                      <th className="py-2 pr-3 text-right">クリア率</th>
                      <th className="py-2 pr-3 text-right">平均時間</th>
                      <th className="py-2 pr-3 text-right">平均ヒント</th>
                      <th className="py-2 pr-3 text-right">平均誤答</th>
                      <th className="py-2 pr-3 text-right">平均評価</th>
                      <th className="py-2 pr-3 text-right">レビュー</th>
                      <th className="py-2 pr-3 text-right">詳細</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.map((a) => (
                      <tr key={a.questId} className="border-t border-stone-100 hover:bg-amber-50/40">
                        <td className="py-2 pr-3 font-semibold text-brand-dark">{a.title}</td>
                        <td className="py-2 pr-3 text-right">{a.playCount}</td>
                        <td className="py-2 pr-3 text-right">{a.uniquePlayers}</td>
                        <td className="py-2 pr-3 text-right">{a.clearRate}%</td>
                        <td className="py-2 pr-3 text-right">{formatMinutes(a.avgDurationMin)}</td>
                        <td className="py-2 pr-3 text-right">{a.avgHints != null ? a.avgHints : '—'}</td>
                        <td className="py-2 pr-3 text-right">{a.avgWrongs != null ? a.avgWrongs : '—'}</td>
                        <td className="py-2 pr-3 text-right">{a.avgRating != null ? `★${a.avgRating}` : '—'}</td>
                        <td className="py-2 pr-3 text-right">{a.reviewCount || '—'}</td>
                        <td className="py-2 pr-3 text-right">
                          <button
                            onClick={() => {
                              if (detailQuestAnalytics && detailQuestAnalytics.questId === a.questId) {
                                onOpenDetail?.('', '');
                              } else {
                                onOpenDetail?.(a.questId, a.title);
                              }
                            }}
                            className="text-amber-700 hover:underline text-sm"
                          >
                            {detailQuestAnalytics && detailQuestAnalytics.questId === a.questId ? '閉じる' : '開く'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-stone-500 mt-2">
                プレイ数=セッション数、クリア率=クリア済みセッション/プレイ数。ステップ別の離脱や誤答は下部の詳細で確認できます。
              </p>
            </>
          ) : (
            <div className="text-sm text-stone-500 bg-stone-50 border border-dashed border-stone-200 rounded-2xl px-4 py-6 text-center">
              まだプレイログがありません。モバイルでプレイするとここに反映されます。
            </div>
          )}

          {detailQuestAnalytics && (
            <div className="mt-6 border-t border-stone-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-stone-500">詳細分析</p>
                  <h3 className="text-lg font-bold text-brand-dark">
                    {detailQuestAnalytics.title || 'クエスト詳細'}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {detailLoading && <span className="text-xs text-stone-500">読み込み中...</span>}
                  <button
                    onClick={() => {
                      onOpenDetail?.('', '');
                    }}
                    className="text-xs text-stone-600 hover:underline"
                  >
                    閉じる
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
                    <p className="text-xs text-amber-700">プレイ数</p>
                    <p className="text-lg font-bold text-brand-dark">{detailQuestAnalytics.summary.playCount}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <p className="text-xs text-emerald-700">クリア率</p>
                    <p className="text-lg font-bold text-brand-dark">
                      {detailQuestAnalytics.summary.clearRate}%
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100">
                    <p className="text-xs text-sky-700">平均時間</p>
                    <p className="text-lg font-bold text-brand-dark">
                      {formatMinutes(detailQuestAnalytics.summary.avgDurationMin)}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200">
                    <p className="text-xs text-stone-600">平均ヒント / 誤答</p>
                    <p className="text-lg font-bold text-brand-dark">
                      {(detailQuestAnalytics.summary.avgHints ?? '—')}/{detailQuestAnalytics.summary.avgWrongs ?? '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100">
                    <p className="text-xs text-rose-700">平均評価</p>
                    <p className="text-lg font-bold text-brand-dark">
                      {detailQuestAnalytics.reviews.avgRating != null
                        ? `★${detailQuestAnalytics.reviews.avgRating} (${detailQuestAnalytics.reviews.count}件)`
                        : '—'}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-stone-100">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-stone-600">
                      <tr>
                        <th className="py-2 px-3 text-left">ステップ</th>
                        <th className="py-2 px-3 text-right">到達</th>
                        <th className="py-2 px-3 text-right">完了</th>
                        <th className="py-2 px-3 text-right">離脱率</th>
                        <th className="py-2 px-3 text-right">平均ヒント</th>
                        <th className="py-2 px-3 text-right">平均誤答</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailQuestAnalytics.steps.map((s) => (
                        <tr key={s.step} className="border-t border-stone-100">
                          <td className="py-2 px-3">
                            <div className="font-semibold text-brand-dark">
                              {s.step}. {s.name}
                            </div>
                            <div className="mt-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, s.completed / Math.max(1, s.reached) * 100))}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">{s.reached}</td>
                          <td className="py-2 px-3 text-right">{s.completed}</td>
                          <td className="py-2 px-3 text-right">{Math.round(s.dropRate * 100)}%</td>
                          <td className="py-2 px-3 text-right">{s.avgHints ?? '—'}</td>
                          <td className="py-2 px-3 text-right">{s.avgWrongs ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || 'Get_Your_Own_OpIi9ZULNHzrESv6T2vK';
const MAPTILER_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

// TODO: ストア公開後に URL を設定する
const APP_STORE_URL = '';
const GOOGLE_PLAY_URL = '';
const PWA_PLAY_PATH = '/play';
const PWA_APP_URL = 'http://localhost:4176/';

let maplibrePromise: Promise<any> | null = null;

const loadMaplibre = () => {
  if ((window as any).maplibregl) return Promise.resolve((window as any).maplibregl);
  if (maplibrePromise) return maplibrePromise;
  maplibrePromise = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.css';
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.js';
    script.async = true;
    script.onload = () => resolve((window as any).maplibregl);
    script.onerror = () => reject(new Error('MapLibre failed to load'));
    document.head.appendChild(script);
  });
  return maplibrePromise;
};
import { motion, AnimatePresence } from 'framer-motion';

// --- Types & Interfaces ---
interface NavItem {
  label: string;
  href: string;
}

interface StatItem {
  label: string;
  value: string;
}

interface FeatureItem {
  title: string;
  description: string;
  icon: React.ElementType;
}

interface StepItem {
  step: number;
  title: string;
  description: string;
}

interface SceneItem {
  title: string;
  description: string;
  target: string;
  icon: React.ElementType;
  image: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface QuestStop {
  name: string;
  clue: string;
  action: string;
}

interface Quest {
  id: string;
  title: string;
  area: string;
  distanceKm: number;
  durationMin: number;
  difficulty: '初級' | '中級' | '上級';
  tags: string[];
  rating: number;
  reviews: number;
  cover: string;
  description: string;
  teaser: string;
  startingPoint: string;
  reward: string;
  timeWindow: string;
  mood: string;
  stops: QuestStop[];
  creatorName?: string;
  creatorId?: string;
  storyPrologue?: string;
  storyEpilogue?: string;
  owned?: boolean;
  playCount?: number;
  clearRate?: number | null;
  avgDurationMin?: number | null;
}

interface RouteSpot {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  orderIndex?: number;
  status?: 'draft' | 'complete';
  details?: SpotDetails;
}

interface SpotDetails {
  directions: string;
  directionsImage?: string;
  storyImage?: string;
  storyText: string;
  challengeText: string;
  challengeImage?: string;
  hints: HintItem[];
  answerText: string;
  answerType: string; // "text" | "choice" | "number" など
  choiceOptions?: string[];
  acceptableAnswers?: string[];
  successMessage: string;
}

interface HintItem {
  id: string;
  label: string;
  text: string;
}

interface CastCharacter {
  id: string;
  name: string;
  role: string;
  tone: string;
  icon?: string;
}

type ScenarioBlock =
  | { type: 'prologue'; id: string; content: string }
  | { type: 'dialogue'; id: string; characterId: string; text: string; position: 'left' | 'right' }
  | { type: 'spot'; id: string; spotId: string; name: string }
  | { type: 'epilogue'; id: string; content: string; social?: string };

type AuthMode = 'login' | 'signup' | 'forgot';

// --- Constants & Data ---

const NAV_ITEMS: NavItem[] = [
  { label: '特徴', href: '#features' },
  { label: '遊び方', href: '#how-it-works' },
  { label: 'シーン', href: '#scenes' },
  { label: 'クリエイターの方へ', href: '#creators' },
  { label: 'FAQ', href: '#faq' },
  { label: 'お問い合わせ', href: '#contact' },
];

const STATS: StatItem[] = [
  { label: '対応エリア', value: 'Coming Soon' },
  { label: 'クエスト数', value: '50+' },
  { label: 'プレイヤー数', value: '10,000+' },
];

const APP_FEATURE_PILLS = [
  { label: '現在地からスタート地点までナビ', icon: MapPin },
  { label: 'オフラインでも謎解き続行', icon: Shield },
  { label: 'マルチプレイで進行を同期', icon: Users },
  { label: 'クリア実績とバッジコレクション', icon: Star },
];

const FEATURES: FeatureItem[] = [
  {
    title: 'スマホひとつで完結',
    description: '専用キットは不要。アプリ上の物語と地図、そして目の前の風景だけが手がかりです。',
    icon: Smartphone,
  },
  {
    title: '好きなタイミングで',
    description: '予約もガイドも必要ありません。思い立ったその瞬間が、冒険の始まりです。',
    icon: Clock,
  },
  {
    title: '街の物語を体験',
    description: '歴史的事実や都市伝説に基づいたオリジナルストーリーで、見慣れた街が違って見えます。',
    icon: Compass,
  },
  {
    title: '絆を深める体験',
    description: '協力して謎を解くことで、友人やパートナー、家族との会話が自然と弾みます。',
    icon: Users,
  },
];

const STEPS: StepItem[] = [
  {
    step: 1,
    title: 'クエストを選ぶ',
    description: '行きたいエリアやジャンル（歴史、ミステリー、グルメなど）から、心惹かれるクエストを選びましょう。',
  },
  {
    step: 2,
    title: '現地へ向かう',
    description: 'スタート地点に到着したらアプリを起動。物語のプロローグが始まります。',
  },
  {
    step: 3,
    title: '歩いて、探して、解く',
    description: '出題される謎の手がかりは、街の中に隠されています。看板、石碑、建物の装飾をよく観察しましょう。',
  },
  {
    step: 4,
    title: 'エンディング',
    description: '最後の謎を解き明かした時、あなたはこの街の新たな一面を知ることになります。',
  },
];

const SCENES: SceneItem[] = [
  {
    title: 'デートを冒険に',
    target: 'Couples',
    description: 'ただの散歩が、二人だけの秘密の探検に。協力して謎を解く過程で、相手の意外な一面が見えるかも。',
    icon: Heart,
    image: 'https://picsum.photos/600/400?random=1',
  },
  {
    title: '家族で街育',
    target: 'Family',
    description: 'お子様と一緒に街の歴史や文化を楽しく学べます。宝探し感覚で、好奇心を刺激する休日を。',
    icon: Star,
    image: 'https://picsum.photos/600/400?random=2',
  },
  {
    title: '仲間とチームビルディング',
    target: 'Group',
    description: '会社の研修やサークルのイベントに。役割分担とコミュニケーションが攻略の鍵となります。',
    icon: Briefcase,
    image: 'https://picsum.photos/600/400?random=3',
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    question: '1人でも遊べますか？',
    answer: 'はい、お一人でも十分にお楽しみいただけます。没入感のある物語体験として、ソロプレイを好まれる方も多くいらっしゃいます。',
  },
  {
    question: '所要時間はどれくらいですか？',
    answer: 'クエストによりますが、平均して1.5時間〜2.5時間程度です。制限時間はないため、途中でカフェ休憩を挟むなど自由にペース配分できます。',
  },
  {
    question: '料金体系はどうなっていますか？',
    answer: 'アプリのダウンロードは無料です。クエストごとに購入いただく形式で、1クエストあたり800円〜1,500円程度を予定しています。',
  },
  {
    question: '雨の日でも遊べますか？',
    answer: '屋外を歩くため、天候の良い日をおすすめしています。ただし、一部のクエストは屋根のあるアーケード街や地下街を中心に構成されているものもあります。',
  },
  {
    question: '謎解き初心者でもクリアできますか？',
    answer: 'はい、初心者の方でも楽しめるよう設計されています。行き詰まった場合は、段階的なヒント機能をご利用いただけます。',
  },
];

const QUEST_FILTERS = [
  { key: 'all', label: 'すべて', desc: '人気・新着をまとめて' },
  { key: 'date', label: 'デートに最適', desc: '2人でわいわい' },
  { key: 'family', label: '家族で', desc: 'お子様もOK' },
  { key: 'night', label: 'ナイトクエスト', desc: '夜景と謎解き' },
  { key: 'history', label: '歴史ロマン', desc: '街の物語' },
  { key: 'beginner', label: 'はじめて', desc: '難易度ひかえめ' },
];

const QUESTS: Quest[] = [
  {
    id: 'nakanoshima-retro',
    title: '中之島レトロ建築ミステリー',
    area: '大阪・中之島',
    distanceKm: 2.4,
    durationMin: 95,
    difficulty: '中級',
    tags: ['history', 'date', 'beginner'],
    rating: 4.8,
    reviews: 248,
    cover: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80',
    description: '大正ロマン漂う川沿いのレトロ建築を巡り、封鎖されたアーカイブの鍵を集める。最後に待つのは川面に映る秘密の扉。',
    teaser: '石造りの街並みに隠された「灯」を集めて、街の記憶を呼び覚ます。',
    startingPoint: '大阪市中央公会堂 正面階段前',
    reward: '限定モノグラムのデジタルカード',
    timeWindow: '9:00 - 19:00（夕方の光がおすすめ）',
    mood: 'Daytime / Retro',
    stops: [
      { name: '大阪市中央公会堂', clue: '天井画に隠れた数字の連なり', action: 'スキャンし、数字を並び替える' },
      { name: '中之島バラ園', clue: '石碑に刻まれた旧地名', action: '音の並びを紐解く' },
      { name: '難波橋「ライオン橋」', clue: 'ライオンの向きが示す方角', action: '方角の矢印を地図に描き込む' },
    ],
  },
  {
    id: 'shibuya-night-phantom',
    title: '渋谷・深夜の幻影',
    area: '東京・渋谷',
    distanceKm: 2.1,
    durationMin: 80,
    difficulty: '上級',
    tags: ['night', 'group', 'mystery'],
    rating: 4.7,
    reviews: 192,
    cover: 'https://images.unsplash.com/photo-1521170665346-3f21e2291d8b?auto=format&fit=crop&w=1400&q=80',
    description: 'ネオンに浮かぶ路地で、ビートメーカーが残した不可解なメモを解読するナイトクエスト。イヤフォン推奨。',
    teaser: '街の灯りが一瞬消える瞬間、幻影が現れて次の手がかりを示す。',
    startingPoint: 'ハチ公前広場 時計台付近',
    reward: 'ミッドナイトmixの限定音源コード',
    timeWindow: '18:00 - 23:30（雨天可）',
    mood: 'Night / Cyber',
    stops: [
      { name: '渋谷スクランブル交差点', clue: '巨大ビジョンに出る断片的な単語', action: '音声メモに組み込む' },
      { name: '百軒店の小路', clue: '赤い提灯の並び順', action: '順番をコードに変換する' },
      { name: '渋谷ストリーム', clue: '水音に紛れるモールス信号', action: 'スマホで音声を可視化する' },
    ],
  },
  {
    id: 'asakusa-river-lights',
    title: '浅草・隅田川の灯',
    area: '東京・浅草',
    distanceKm: 2.9,
    durationMin: 110,
    difficulty: '初級',
    tags: ['family', 'history', 'beginner'],
    rating: 4.6,
    reviews: 165,
    cover: 'https://images.unsplash.com/photo-1494587351196-bbf5f29aad10?auto=format&fit=crop&w=1400&q=80',
    description: '浅草寺から隅田川テラスまで、親子で楽しめる光と音のトレイル。遊びながら浅草の昔話を学べます。',
    teaser: '灯籠の模様が示す「おとぎ話」の順番を解くと、隅田川に光る印が現れる。',
    startingPoint: '浅草寺 雷門前',
    reward: 'こども向け「灯の守り人」ステッカー',
    timeWindow: '10:00 - 18:00（週末開催）',
    mood: 'Daytime / Family',
    stops: [
      { name: '仲見世通り', clue: 'お店の暖簾に隠れた文字', action: 'ひらがなを並べ替える' },
      { name: '吾妻橋', clue: '欄干の模様の数', action: '数字を合図に変換する' },
      { name: '隅田公園', clue: '灯籠の影が作る形', action: '影をなぞってキーワードを完成させる' },
    ],
  },
  {
    id: 'gion-silent-court',
    title: '祇園・余白の庭にて',
    area: '京都・祇園',
    distanceKm: 3.2,
    durationMin: 120,
    difficulty: '中級',
    tags: ['date', 'history', 'scenic'],
    rating: 4.9,
    reviews: 278,
    cover: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80',
    description: '石畳と路地裏の茶屋を巡り、「余白」をテーマにした静かなクエスト。耳を澄ませば、庭の向こうに隠された句が聞こえる。',
    teaser: '茶屋の看板に刻まれた句が、街灯の影で別の言葉に変わる。',
    startingPoint: '八坂神社 西楼門',
    reward: '限定御朱印風カード & 句のデジタル保存',
    timeWindow: '14:00 - 20:00（静かな時間帯推奨）',
    mood: 'Twilight / Slow',
    stops: [
      { name: '花見小路', clue: '格子戸の数と間隔', action: 'リズムを五七五に当てはめる' },
      { name: '白川南通', clue: '水面に映る提灯の揺れ', action: '揺れの順番を音階に置き換える' },
      { name: '巽橋', clue: '橋の影が示す方角', action: '方角を歩数に変えて進む' },
    ],
  },
];

const CREATOR_MERITS = [
  {
    title: 'Earn Money',
    description: 'クエスト参加ユーザー収益のうち、最大70%を分配する公正なレベニューシェア。最低限の固定コストで、成果に応じて伸びていきます。',
    icon: Coins,
    badge: 'Revenue Share',
  },
  {
    title: 'Build Your Portfolio',
    description: 'あなたの仕掛けや物語が現実世界でどう響くかを検証。作家・ゲーム制作者としての腕試しと実績作りに最適です。',
    icon: Target,
    badge: '腕試しの場',
  },
  {
    title: 'Create Impact',
    description: '意図せずとも、人が動き、街が少し賑やかになる。あなたの物語が地域の灯りになる体験を提供します。',
    icon: Globe2,
    badge: '地域貢献',
  },
];

const CREATOR_FEATURES = [
  {
    title: '直感的な制作ツール',
    description: 'マップにピンを落とし、謎とヒントを登録するだけ。プログラミング不要で、Questoのようにテンポよく組み立てられます。',
    icon: Smartphone,
  },
  {
    title: 'Social Action Integration（任意）',
    description: 'チェックボックス一つで「ゴミ拾い」「募金」「学び」などのソーシャルアクションをクリア条件に設定可能。物語のリアリティを強化するオプション機能です。',
    icon: CheckSquare,
    highlight: 'オプション',
  },
  {
    title: '配信とアップデート',
    description: '公開後はダッシュボードでプレイ数や解答率をトラッキング。ヒント強度やルートの微調整もリアルタイムで反映できます。',
    icon: Rocket,
  },
];

const CREATOR_STEPS = [
  { step: 1, title: 'Create', description: '世界観・謎・演出をワークシートで設計。サンプルテンプレートも利用可能。' },
  { step: 2, title: 'Set Spot', description: 'マップにチェックイン地点を配置。写真やヒントをセットし、徒歩導線を確認。' },
  { step: 3, title: 'Add Action (Option)', description: 'ソーシャルアクションを足したい場合はチェックを入れるだけ。無理に入れる必要はありません。' },
  { step: 4, title: 'Publish', description: 'テストプレイ後に公開。プレイ数に応じて収益が自動計算されます。' },
];

const CREATOR_ONBOARDING_STEPS = [
  { key: 'welcome', title: 'Welcome', caption: 'イントロダクション', icon: Sparkles, description: 'TOMOSHIBIへようこそ。街歩き謎解きの制作フローを3分でご案内します。' },
  { key: 'concept', title: 'Concept', caption: '物語×社会貢献', icon: Heart, description: '物語と街のリアリティを高めるために、ソーシャルアクションを任意で組み込めます。' },
  { key: 'how', title: 'How to Build', caption: '謎とスポットの基本', icon: Map, description: 'チェックイン地点を配置し、謎・ヒント・導線を設定。Questoのようにテンポよく進められます。' },
  { key: 'start', title: "Let's Start", caption: '制作開始', icon: Rocket, description: '準備完了。下書きから始めてテストプレイで磨きましょう。' },
];

const CREATOR_QUEST_TYPES = [
  {
    key: 'mystery',
    label: 'ミステリークエスト',
    eng: 'Mystery Quest',
    description: '物語と謎解きに集中するスタンダードな街歩きクエスト。スポットとギミックを緻密に設計します。',
    icon: Compass,
  },
  {
    key: 'social',
    label: 'ソーシャルクエスト',
    eng: 'Social Quest',
    description: '謎解きの中に現実のソーシャルアクション（ゴミ拾い、エシカル消費、歴史学習など）をミッションとして組み込みます。',
    icon: Heart,
    highlight: true,
  },
];


// --- Sub-Components ---

const TomoshibiLogo = ({ className = "h-8", color = "#484132" }: { className?: string, color?: string }) => (
  <svg viewBox="0 0 220 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="TOMOSHIBI Logo">
    <text x="0" y="30" fontSize="28" fontWeight="bold" fontFamily="'Noto Sans JP', sans-serif" fill={color} letterSpacing="0.05em">TOMOSHIBI</text>
    <g transform="translate(175, 4)">
        {/* Keyhole Shape */}
        <path d="M16 0C7.2 0 0 7.2 0 16C0 22.1 3.4 27.3 8.3 30V36H23.7V30C28.6 27.3 32 22.1 32 16C32 7.2 24.8 0 16 0Z" fill={color}/>
        {/* Flame Shape */}
        <path d="M16 26C16 26 21 20 21 14C21 11 19 9 16 6C13 9 11 11 11 14C11 20 16 26 16 26Z" fill="#fbbf24"/>
        {/* Rays/Sparks */}
        <path d="M16 3V5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
        <path d="M9 6L10.5 7.5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
        <path d="M23 6L21.5 7.5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
    </g>
  </svg>
);

const SectionHeading = ({ children, subtitle }: { children?: React.ReactNode; subtitle?: string }) => (
  <div className="text-center mb-16 px-4">
    <motion.h2 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-3xl md:text-4xl font-serif font-bold text-brand-dark mb-4"
    >
      {children}
    </motion.h2>
    {subtitle && (
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="text-stone-500 max-w-2xl mx-auto text-sm md:text-base leading-relaxed"
      >
        {subtitle}
      </motion.p>
    )}
    <div className="w-16 h-1 bg-brand-gold mx-auto mt-6 rounded-full" />
  </div>
);

const AppDownloadButtons = ({
  onPrimary,
  onSecondary,
  onScrollNotify,
  hasStoreLink,
  comingSoon,
}: {
  onPrimary: () => void;
  onSecondary: () => void;
  onScrollNotify: () => void;
  hasStoreLink: boolean;
  comingSoon: boolean;
}) => (
  <div className="flex flex-col sm:flex-row gap-3">
    <button
      onClick={comingSoon ? onScrollNotify : onPrimary}
      className="flex-1 bg-brand-dark text-white px-6 py-3 rounded-full font-bold text-sm md:text-base hover:bg-brand-gold hover:text-white transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
    >
      {comingSoon ? 'モバイルアプリをダウンロード' : 'アプリで謎解きを始める'}
      {comingSoon ? <Smartphone size={18} /> : <PlayCircle size={18} />}
    </button>
    <button
      onClick={onSecondary}
      className="flex-1 border border-stone-300 text-brand-dark px-6 py-3 rounded-full font-bold text-sm md:text-base hover:border-brand-gold hover:text-brand-gold transition-colors"
    >
      まずはブラウザでクエストを見る
    </button>
    {hasStoreLink && (
      <div className="flex items-center gap-2 justify-center text-[11px] text-stone-500">
        <span className="px-2 py-1 rounded-full bg-brand-base text-brand-dark border border-stone-200">App Store / Google Play 対応</span>
      </div>
    )}
  </div>
);

const AppFeaturePills = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
    {APP_FEATURE_PILLS.map((item, idx) => (
      <motion.div
        key={item.label}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: idx * 0.05 }}
        className="flex items-center gap-3 bg-white/70 border border-stone-200 rounded-2xl px-4 py-3 shadow-sm"
      >
        <div className="p-2 rounded-xl bg-brand-base text-brand-gold">
          <item.icon size={18} />
        </div>
        <span className="text-sm font-bold text-brand-dark">{item.label}</span>
      </motion.div>
    ))}
  </div>
);

const QuestAppPromoBanner = ({
  onPrimary,
  comingSoon,
  onScrollNotify,
}: {
  onPrimary: () => void;
  comingSoon: boolean;
  onScrollNotify: () => void;
}) => (
  <div className="rounded-2xl border border-brand-dark/10 bg-white shadow-sm p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-xl bg-brand-base text-brand-gold shadow-inner">
        <Smartphone size={18} />
      </div>
      <div>
        <p className="text-sm font-bold text-brand-dark">スマホアプリで遊ぶともっと快適</p>
        <p className="text-xs text-stone-600">
          現在地からスタート地点までナビし、オフラインでも謎解きが続けられます。
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {comingSoon && (
        <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-bold border border-stone-200">PWA</span>
      )}
      <button
        onClick={comingSoon ? onScrollNotify : onPrimary}
        className="px-4 py-2 rounded-full bg-brand-dark text-white text-xs md:text-sm font-bold hover:bg-brand-gold transition-colors shadow-sm"
      >
        {comingSoon ? 'モバイルアプリをダウンロード' : 'アプリで遊ぶ'}
      </button>
    </div>
  </div>
);

const InstallBar = ({
  visible,
  onPrimary,
  onDismiss,
  comingSoon,
  onScrollNotify,
}: {
  visible: boolean;
  onPrimary: () => void;
  onDismiss: () => void;
  comingSoon: boolean;
  onScrollNotify: () => void;
}) => {
  if (!visible) return null;
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4"
    >
      <div className="bg-white/95 backdrop-blur border border-stone-200 shadow-xl rounded-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-base border border-stone-200 flex items-center justify-center text-brand-gold font-bold">T</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-brand-dark">TOMOSHIBI アプリ</p>
          <p className="text-xs text-stone-500 truncate">街を歩いて謎を解く “ご近所シティクエスト”</p>
        </div>
        <button
          onClick={comingSoon ? onScrollNotify : onPrimary}
          className="px-4 py-2 rounded-full bg-brand-dark text-white text-xs font-bold hover:bg-brand-gold transition-colors"
        >
          {comingSoon ? 'アプリをダウンロード' : 'アプリで始める'}
        </button>
        <button onClick={onDismiss} className="text-stone-400 hover:text-brand-dark">
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
};

const PhoneMockup = () => (
  <div className="relative mx-auto w-[280px] h-[580px] bg-brand-dark rounded-[3rem] border-4 border-brand-dark shadow-2xl overflow-hidden flex flex-col z-10">
    {/* Status Bar */}
    <div className="h-6 bg-brand-dark w-full absolute top-0 z-20 flex justify-center items-center">
      <div className="w-24 h-4 bg-black/30 rounded-b-xl" />
    </div>

    {/* App Header (Keep dark UI for the app screen itself, but using slate for contrast against the brown frame) */}
    <div className="pt-10 pb-4 px-4 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="flex justify-between items-center text-white mb-4">
        <Menu size={20} className="text-slate-400" />
        <span className="font-serif font-bold text-amber-400 tracking-widest">TOMOSHIBI</span>
        <div className="w-5" />
      </div>
      <div className="relative">
        <input disabled type="text" placeholder="エリアを検索..." className="w-full bg-slate-700/50 text-sm rounded-full py-2 px-4 text-slate-300 border border-slate-600" />
        <MapPin size={14} className="absolute right-3 top-2.5 text-slate-400" />
      </div>
    </div>

    {/* App Content (Scrollable) */}
    <div className="flex-1 overflow-hidden bg-slate-900 relative">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#4b5563_1px,transparent_1px)] [background-size:16px_16px]"></div>
      
      <div className="p-4 space-y-4 relative z-10">
        <div className="text-xs text-slate-400 font-bold uppercase tracking-wide">Featured Quests</div>
        
        {/* Quest Card 1 */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl overflow-hidden shadow-lg transform hover:scale-[1.02] transition-transform duration-300">
          <div className="h-24 bg-indigo-900/50 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
            <img src="https://picsum.photos/300/150?random=10" alt="Quest" className="w-full h-full object-cover opacity-60" />
            <div className="absolute bottom-2 left-3 text-white">
              <div className="text-xs text-amber-400 mb-0.5 flex items-center gap-1"><Star size={10} fill="currentColor" /> Popular</div>
              <div className="font-bold text-sm">中之島レトロ建築ミステリー</div>
            </div>
          </div>
          <div className="p-3">
            <div className="flex justify-between text-[10px] text-slate-400 mb-2">
              <span className="flex items-center gap-1"><Clock size={10} /> 90 min</span>
              <span className="flex items-center gap-1"><MapPin size={10} /> 2.5 km</span>
            </div>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
               <div className="w-2/3 h-full bg-amber-500 rounded-full" />
            </div>
            <div className="flex justify-between text-[8px] text-slate-500 mt-1">
              <span>Difficulty</span>
              <span className="text-amber-400">Normal</span>
            </div>
          </div>
        </div>

        {/* Quest Card 2 */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl overflow-hidden shadow-lg opacity-80 scale-95 translate-y-[-10px]">
           <div className="h-20 bg-purple-900/50 relative overflow-hidden">
            <img src="https://picsum.photos/300/150?random=11" alt="Quest" className="w-full h-full object-cover opacity-50" />
             <div className="absolute bottom-2 left-3 text-white font-bold text-sm">渋谷・深夜の幻影</div>
           </div>
        </div>
      </div>
    </div>
    
    {/* Bottom Nav - using app frame color */}
    <div className="h-16 bg-slate-800 border-t border-slate-700 flex justify-around items-center px-2 z-20">
      <div className="flex flex-col items-center gap-1 text-amber-400">
        <Compass size={20} />
      </div>
      <div className="flex flex-col items-center gap-1 text-slate-500">
        <MapPin size={20} />
      </div>
      <div className="flex flex-col items-center gap-1 text-slate-500">
        <Users size={20} />
      </div>
    </div>
    
    {/* Home Indicator */}
    <div className="h-1 bg-white/20 w-1/3 mx-auto absolute bottom-2 left-1/3 rounded-full z-30" />
  </div>
);

const DifficultyBadge = ({ level }: { level: Quest['difficulty'] }) => {
  const styleMap = {
    初級: 'bg-green-100 text-green-700 border-green-200',
    中級: 'bg-amber-100 text-amber-700 border-amber-200',
    上級: 'bg-red-100 text-red-700 border-red-200',
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${styleMap[level]}`}>
      <Compass size={12} />
      {level}
    </span>
  );
};

const OnboardingModal = ({
  steps,
  activeIndex,
  onClose,
  onNext,
}: {
  steps: typeof CREATOR_ONBOARDING_STEPS;
  activeIndex: number;
  onClose: () => void;
  onNext: () => void;
}) => {
  const step = steps[activeIndex];
  const isLast = activeIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        className="relative w-[88%] max-w-5xl max-h-[82vh] bg-white rounded-3xl shadow-2xl overflow-y-auto md:overflow-hidden grid md:grid-cols-[320px,1fr] border border-white/70"
      >
        {/* Sidebar */}
        <div className="bg-brand-base/80 border-r border-stone-200/70 p-6 md:p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-brand-gold font-bold">Tutorial</p>
              <p className="text-brand-dark font-serif text-xl">新規クエストオンボーディング</p>
            </div>
            <button onClick={onClose} className="text-stone-500 hover:text-brand-dark">
              <X size={20} />
            </button>
          </div>
          <div className="relative mt-4">
            <div className="absolute left-5 top-3 bottom-3 w-[2px] bg-gradient-to-b from-brand-gold/60 via-brand-dark/30 to-transparent" />
            <div className="space-y-6 relative">
              {steps.map((item, idx) => {
                const active = idx === activeIndex;
                const done = idx < activeIndex;
                return (
                  <div key={item.key} className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${active ? 'border-brand-gold bg-white text-brand-gold shadow' : 'border-stone-300 bg-white text-stone-400'}`}>
                      {done ? <CheckCircle size={18} /> : <item.icon size={18} />}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-stone-500">{item.title}</p>
                      <p className={`font-bold ${active ? 'text-brand-dark' : 'text-stone-500'}`}>{item.caption}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="p-6 md:p-8 relative overflow-y-auto flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-2">{step.title}</p>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-brand-dark leading-tight">
                Let's light up the town with your story
              </h2>
              <p className="text-stone-600 mt-3">{step.description}</p>
            </div>
            <button onClick={onClose} className="text-stone-400 hover:text-brand-dark md:hidden">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 min-h-0 space-y-3">
            <div className="rounded-2xl border border-stone-200 bg-brand-base/80 p-5 shadow-inner">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-brand-gold font-bold">Quick Guide</p>
                  <p className="text-brand-dark font-bold">3分で流れを確認</p>
                </div>
              </div>
              <ul className="text-sm text-stone-700 space-y-2 list-disc list-inside">
                <li>物語の骨子と街のテーマを決める</li>
                <li>マップにスポットを配置し、謎とヒントを登録</li>
                <li>任意でソーシャルアクションを追加して深みを出す</li>
                <li>テストプレイで導線をチェックして公開</li>
              </ul>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              下の「Next」でステップを進めてください。制作画面に入る前に全体像を掴めます。
            </p>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="text-xs text-stone-500">
              {activeIndex + 1} / {steps.length}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="text-sm font-bold text-stone-500 hover:text-brand-dark">
                スキップ
              </button>
              <button
                onClick={onNext}
                className="px-5 py-3 rounded-full bg-brand-dark text-white text-sm font-bold hover:bg-brand-gold transition-colors"
              >
                {isLast ? '制作をはじめる' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ProfilePage = ({
  email,
  onLogout,
  onBackHome,
  onGoCreators,
  onGoQuests,
  onOpenOnboarding,
  onGoCreatorStart,
  quests,
  onOpenWorkspace,
  onOpenAnalytics,
}: {
  email: string;
  onLogout: () => void;
  onBackHome: () => void;
  onGoCreators: () => void;
  onGoQuests: () => void;
  onOpenOnboarding: () => void;
  onGoCreatorStart: () => void;
  quests: any[];
  onOpenWorkspace: (quest: any) => void;
  onOpenAnalytics: (quest: any) => void;
}) => {
  const initials = email.charAt(0).toUpperCase();
  return (
    <section className="pt-28 pb-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-glow opacity-80 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-brand-base/80" />
      <div className="container mx-auto px-4 md:px-8 relative">
        <div className="flex items-center gap-3 text-sm text-stone-600 mb-6">
          <button onClick={onBackHome} className="hover:text-brand-dark underline underline-offset-4">
            LPに戻る
          </button>
          <span className="text-stone-400">/</span>
          <span className="text-brand-dark font-bold">プロフィール</span>
        </div>

        <div className="bg-white/90 backdrop-blur border border-white/80 rounded-3xl p-8 md:p-10 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-dark text-white flex items-center justify-center text-xl font-bold">
                {initials}
              </div>
              <div>
                <p className="text-sm text-stone-500">ようこそ</p>
                <h1 className="text-2xl font-serif font-bold text-brand-dark">{email}</h1>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onGoQuests} className="px-4 py-2 rounded-full border border-stone-300 text-sm font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold transition-colors">
                クエスト一覧へ
              </button>
              <button onClick={onGoCreators} className="px-4 py-2 rounded-full bg-brand-dark text-white text-sm font-bold hover:bg-brand-gold transition-colors">
                クリエイターになる
              </button>
              <button onClick={onOpenOnboarding} className="px-4 py-2 rounded-full bg-brand-gold text-brand-dark text-sm font-bold hover:bg-white transition-colors">
                新規クエストを作成
              </button>
              <button onClick={onGoCreatorStart} className="px-4 py-2 rounded-full border border-stone-300 text-sm font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold transition-colors">
                制作開始ページへ
              </button>
              <button onClick={onLogout} className="px-4 py-2 rounded-full border border-stone-300 text-sm font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold transition-colors">
                ログアウト
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="bg-brand-base border border-stone-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-2">Status</p>
              <p className="text-brand-dark font-serif text-xl mb-1">Explorer</p>
              <p className="text-stone-600 text-sm">街歩きと謎解きを楽しむプレイヤーアカウント。クリエイター登録で公開もできます。</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-2">Activity</p>
              <p className="text-brand-dark font-bold text-lg">プレイ履歴 / クリア率 / お気に入り</p>
              <p className="text-stone-600 text-sm">次回アップデートでダッシュボードに表示されます。</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-2">Security</p>
              <p className="text-brand-dark font-bold text-lg">メールで認証済み</p>
              <p className="text-stone-600 text-sm">パスワード変更や2FAは近日追加予定です。</p>
            </div>
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-brand-dark font-bold text-lg mb-2">通知設定</h3>
              <p className="text-sm text-stone-600 mb-3">クエストの進行やクリエイター収益レポートをメールで受け取ります。</p>
              <div className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-brand-gold accent-brand-gold" />
                <span className="text-brand-dark font-bold">メール通知を受け取る</span>
              </div>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-brand-dark font-bold text-lg mb-2">クリエイターへの一歩</h3>
              <p className="text-sm text-stone-600 mb-3">街の物語を作る準備ができたら、制作ガイドとテンプレートを受け取れます。</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={onGoCreators} className="flex-1 px-4 py-3 rounded-full bg-brand-dark text-white text-sm font-bold hover:bg-brand-gold transition-colors">
                  制作ガイドを受け取る
                </button>
                <button onClick={onOpenOnboarding} className="flex-1 px-4 py-3 rounded-full border border-brand-gold text-brand-dark text-sm font-bold hover:bg-brand-gold hover:text-white transition-colors">
                  チュートリアルを見る
                </button>
                <button onClick={onGoCreatorStart} className="flex-1 px-4 py-3 rounded-full border border-stone-300 text-brand-dark text-sm font-bold hover:border-brand-gold hover:text-brand-gold transition-colors">
                  制作開始ページへ
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-brand-dark font-bold text-lg mb-3">あなたのクエスト</h3>
            <div className="space-y-3">
              {quests.length === 0 && (
                <div className="text-sm text-stone-500 bg-brand-base border border-dashed border-stone-300 rounded-2xl px-4 py-6 text-center">
                  まだクエストがありません。「制作開始ページへ」から新規作成してください。
                </div>
              )}
              {quests.map((q) => (
                <div key={q.id} className="border border-stone-200 rounded-2xl p-4 bg-white shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-brand-dark">{q.title || 'タイトル未設定'}</p>
                    <p className="text-xs text-stone-500">{q.area_name || 'エリア未設定'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenWorkspace(q)}
                      className="px-4 py-2 rounded-full bg-brand-dark text-white text-sm font-bold hover:bg-brand-gold transition-colors"
                    >
                      ワークスペースへ
                    </button>
                    <button
                      onClick={() => onOpenAnalytics(q)}
                      className="px-4 py-2 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-sm font-bold hover:border-amber-300 hover:text-amber-800 transition-colors"
                    >
                      分析を見る
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

function CreatorWorkspacePage({
  onBack,
  onPreview,
  activeStep,
  setActiveStep,
  onGoStep2,
  onGoStep3,
  onGoStep4,
  onPublish,
  onLogoHome,
  onGoStep1,
  showAnalytics = true,
  analytics = [],
  analyticsFilter = 'all',
  onChangeAnalyticsFilter,
  onOpenDetail,
  detailQuestAnalytics,
  detailLoading,
}: {
  onBack: () => void;
  onPreview: () => void;
  activeStep: number;
  setActiveStep: (step: number) => void;
  onGoStep2: () => void;
  onGoStep3: () => void;
  onGoStep4: () => void;
  onPublish: () => void;
  onLogoHome: () => void;
  onGoStep1: () => void;
  showAnalytics?: boolean;
  analytics?: {
    questId: string;
    title: string;
    playCount: number;
    uniquePlayers: number;
    clearCount: number;
    clearRate: number;
    avgDurationMin: number | null;
    avgHints: number | null;
    avgWrongs: number | null;
  }[];
  analyticsFilter?: 'all' | '30d' | '7d';
  onChangeAnalyticsFilter?: (v: 'all' | '30d' | '7d') => void;
  onOpenDetail?: (questId: string, title?: string) => void;
  detailQuestAnalytics?: {
    questId: string;
    title: string;
    summary: {
      playCount: number;
      clearRate: number;
      avgDurationMin: number | null;
      avgHints: number | null;
      avgWrongs: number | null;
    };
    steps: {
      step: number;
      name: string;
      reached: number;
      completed: number;
      dropRate: number;
      avgHints: number | null;
      avgWrongs: number | null;
    }[];
  } | null;
  detailLoading?: boolean;
}) {
  const accentMap = {
    basic: {
      activeBar: 'bg-emerald-600 text-white',
      idleBar: 'bg-emerald-50 text-emerald-800',
      pill: 'bg-emerald-100 text-emerald-800',
      iconBg: 'from-emerald-50 via-white to-emerald-100',
    },
    spots: {
      activeBar: 'bg-amber-500 text-white',
      idleBar: 'bg-amber-50 text-amber-800',
      pill: 'bg-amber-100 text-amber-800',
      iconBg: 'from-amber-50 via-white to-amber-100',
    },
    story: {
      activeBar: 'bg-sky-500 text-white',
      idleBar: 'bg-sky-50 text-sky-800',
      pill: 'bg-sky-100 text-sky-800',
      iconBg: 'from-sky-50 via-white to-sky-100',
    },
    test: {
      activeBar: 'bg-indigo-500 text-white',
      idleBar: 'bg-indigo-50 text-indigo-800',
      pill: 'bg-indigo-100 text-indigo-800',
      iconBg: 'from-indigo-50 via-white to-indigo-100',
    },
    publish: {
      activeBar: 'bg-brand-dark text-white',
      idleBar: 'bg-stone-100 text-brand-dark',
      pill: 'bg-stone-200 text-brand-dark',
      iconBg: 'from-stone-50 via-white to-stone-100',
    },
  };

  const cards = [
    {
      step: 1,
      key: 'basic' as const,
      title: 'Basic Info',
      subtitle: '基本情報',
      description: 'タイトル、開催エリア、概要の設定が完了しました。',
      ribbon: '🎉 設定完了！いつでも編集できます (Completed!)',
      icon: CheckCircle,
      editable: true,
      emoji: '🎉',
    },
    {
      step: 2,
      key: 'spots' as const,
      title: 'Spots & Puzzles',
      subtitle: 'スポットと謎の配置',
      description: '地図上でチェックポイントを決め、それぞれの場所で出題する謎や手がかりを作成します。',
      icon: Map,
      todoLink: true,
      emoji: '🗺️',
    },
    {
      step: 3,
      key: 'story' as const,
      title: 'Storytelling',
      subtitle: '物語と演出',
      description: 'スポット間を繋ぐストーリーの執筆や、クリア時の演出、登場人物のセリフなどを追加します。',
      icon: BookOpen,
      emoji: '📖',
    },
    {
      step: 4,
      key: 'test' as const,
      title: '最終確認',
      subtitle: '公開前の仕上げ',
      description: '制作内容・タグ・問い合わせをまとめて確認し、公開申請前に最終チェックを行います。',
      icon: Smartphone,
      emoji: '🧭',
    },
    {
      step: 5,
      key: 'publish' as const,
      title: 'Publish',
      subtitle: '公開申請',
      description: '最終確認を行い、TOMOSHIBIへ公開申請をします。審査を通過すれば、あなたのクエストが世界に公開されます！',
      icon: Rocket,
      lockedUntil: 4,
      emoji: '🚀',
    },
  ];

  const getStatus = (card: (typeof cards)[number]) => {
    if (card.step === 1) return 'done';
    if (card.lockedUntil && activeStep < card.lockedUntil) return 'locked';
    if (card.step < activeStep) return 'done';
    if (card.step === activeStep) return 'active';
    return 'idle';
  };

  const completedCount = cards.filter((card) => getStatus(card) === 'done').length;
  const progressPercent = Math.round((completedCount / cards.length) * 100);
  const formatMinutes = (m: number | null) => (m != null ? `${m} 分` : '—');

  return (
    <section className="min-h-screen bg-white">
      <div className="border-b border-stone-200 bg-white">
        <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-6">
          <button onClick={onLogoHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TomoshibiLogo className="h-8 w-auto" />
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-10 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-sm text-brand-dark font-bold hover:underline flex items-center gap-1">
            &lt; プロフィールへ
          </button>
            <div className="flex items-center gap-3">
              <button
                onClick={onPreview}
                className="px-4 py-2 rounded-full border border-stone-300 bg-white text-sm font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold transition-colors shadow-sm"
              >
                Preview Game
            </button>
          </div>
        </div>

        {/* Subheader */}
        <div className="bg-white/80 backdrop-blur border border-stone-200 rounded-3xl p-6 md:p-8 shadow-md mb-8">
          <h1 className="text-3xl font-serif font-bold text-brand-dark mb-2">Workspace: あなたの制作スタジオ</h1>
          <p className="text-sm text-stone-600 leading-relaxed">
            クエスト完成までのロードマップです。ステップ順に進めて、あなたの物語を街に解き放ちましょう。
          </p>
          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 text-xs text-stone-600">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-stone-200 shadow-sm">
                <CheckCircle size={14} className="text-emerald-600" />
                <span className="font-bold text-brand-dark">{completedCount} / {cards.length} 完了</span>
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-stone-200 shadow-sm">
                <Sparkles size={14} className="text-brand-gold" />
                <span className="text-brand-dark">次の作業: Step {activeStep}</span>
              </span>
            </div>
            <div className="bg-white/90 border border-stone-200 rounded-2xl px-4 py-3 shadow-inner w-full md:w-72">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>Progress</span>
                <span className="font-bold text-brand-dark">{progressPercent}%</span>
              </div>
              <div className="mt-2 h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-brand-gold rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] text-stone-500">
                Step {activeStep} / {cards.length}: {cards.find((c) => c.step === activeStep)?.title || 'Next up'}
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Summary (optional) */}
        {showAnalytics && (
        <div id="creator-analytics" className="bg-white/90 border border-stone-200 rounded-3xl p-6 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-brand-dark">プレイ状況（ベータ）</h2>
                <span className="text-xs text-stone-500">自分のクエストのセッション集計</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {(['all', '30d', '7d'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => onChangeAnalyticsFilter?.(f)}
                    className={`px-3 py-1 rounded-full border text-sm ${
                      analyticsFilter === f
                        ? 'bg-brand-gold text-white border-brand-gold'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-brand-gold hover:text-brand-dark'
                    }`}
                  >
                    {f === 'all' ? '全期間' : f === '30d' ? '直近30日' : '直近7日'}
                  </button>
                ))}
              </div>
            </div>
          {analytics.length === 0 ? (
            <div className="text-sm text-stone-500 bg-stone-50 border border-dashed border-stone-200 rounded-2xl px-4 py-6 text-center">
              まだプレイログがありません。モバイルでプレイするとここに反映されます。
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-stone-500">
                      <th className="py-2 pr-3">クエスト</th>
                      <th className="py-2 pr-3 text-right">プレイ数</th>
                      <th className="py-2 pr-3 text-right">ユニーク</th>
                      <th className="py-2 pr-3 text-right">クリア率</th>
                      <th className="py-2 pr-3 text-right">平均時間</th>
                      <th className="py-2 pr-3 text-right">平均ヒント</th>
                      <th className="py-2 pr-3 text-right">平均誤答</th>
                      <th className="py-2 pr-3 text-right">平均評価</th>
                      <th className="py-2 pr-3 text-right">レビュー</th>
                      <th className="py-2 pr-3 text-right">詳細</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.map((a) => (
                      <tr key={a.questId} className="border-t border-stone-100 hover:bg-amber-50/40">
                        <td className="py-2 pr-3 font-semibold text-brand-dark">{a.title}</td>
                        <td className="py-2 pr-3 text-right">{a.playCount}</td>
                        <td className="py-2 pr-3 text-right">{a.uniquePlayers}</td>
                        <td className="py-2 pr-3 text-right">{a.clearRate}%</td>
                        <td className="py-2 pr-3 text-right">{formatMinutes(a.avgDurationMin)}</td>
                        <td className="py-2 pr-3 text-right">{a.avgHints != null ? a.avgHints : '—'}</td>
                        <td className="py-2 pr-3 text-right">{a.avgWrongs != null ? a.avgWrongs : '—'}</td>
                        <td className="py-2 pr-3 text-right">{a.avgRating != null ? `★${a.avgRating}` : '—'}</td>
                        <td className="py-2 pr-3 text-right">{a.reviewCount || '—'}</td>
                        <td className="py-2 pr-3 text-right">
                          <button
                            onClick={() => {
                              if (detailQuestAnalytics && detailQuestAnalytics.questId === a.questId) {
                                onOpenDetail?.('', ''); // clear
                              } else {
                                onOpenDetail?.(a.questId, a.title);
                              }
                            }}
                            className="text-amber-700 hover:underline text-sm"
                          >
                            {detailQuestAnalytics && detailQuestAnalytics.questId === a.questId ? '閉じる' : '開く'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-stone-500 mt-2">
                プレイ数=セッション数、クリア率=クリア済みセッション/プレイ数。ステップ別の離脱や誤答は下部の詳細で確認できます。
              </p>
            </>
          )}

          {/* Detail analytics */}
          {detailQuestAnalytics && (
            <div className="mt-6 border-t border-stone-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-stone-500">詳細分析</p>
                  <h3 className="text-lg font-bold text-brand-dark">
                    {detailQuestAnalytics.title || 'クエスト詳細'}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {detailLoading && <span className="text-xs text-stone-500">読み込み中...</span>}
                  <button
                    onClick={() => {
                      onOpenDetail?.('', '');
                    }}
                    className="text-xs text-stone-600 hover:underline"
                  >
                    閉じる
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
                    <p className="text-xs text-amber-700">プレイ数</p>
                    <p className="text-lg font-bold text-brand-dark">{detailQuestAnalytics.summary.playCount}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <p className="text-xs text-emerald-700">クリア率</p>
                    <p className="text-lg font-bold text-brand-dark">
                      {detailQuestAnalytics.summary.clearRate}%
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100">
                    <p className="text-xs text-sky-700">平均時間</p>
                    <p className="text-lg font-bold text-brand-dark">
                      {formatMinutes(detailQuestAnalytics.summary.avgDurationMin)}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200">
                    <p className="text-xs text-stone-600">平均ヒント / 誤答</p>
                    <p className="text-lg font-bold text-brand-dark">
                      {(detailQuestAnalytics.summary.avgHints ?? '—')}/{detailQuestAnalytics.summary.avgWrongs ?? '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100">
                    <p className="text-xs text-rose-700">平均評価</p>
                    <p className="text-lg font-bold text-brand-dark">
                      {detailQuestAnalytics.reviews.avgRating != null
                        ? `★${detailQuestAnalytics.reviews.avgRating} (${detailQuestAnalytics.reviews.count}件)`
                        : '—'}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-stone-100">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-stone-600">
                      <tr>
                        <th className="py-2 px-3 text-left">ステップ</th>
                        <th className="py-2 px-3 text-right">到達</th>
                        <th className="py-2 px-3 text-right">完了</th>
                        <th className="py-2 px-3 text-right">離脱率</th>
                        <th className="py-2 px-3 text-right">平均ヒント</th>
                        <th className="py-2 px-3 text-right">平均誤答</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailQuestAnalytics.steps.map((s) => (
                        <tr key={s.step} className="border-t border-stone-100">
                          <td className="py-2 px-3">
                            <div className="font-semibold text-brand-dark">
                              {s.step}. {s.name}
                            </div>
                            <div className="mt-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, s.completed / Math.max(1, s.reached) * 100))}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">{s.reached}</td>
                          <td className="py-2 px-3 text-right">{s.completed}</td>
                          <td className="py-2 px-3 text-right">{Math.round(s.dropRate * 100)}%</td>
                          <td className="py-2 px-3 text-right">{s.avgHints ?? '—'}</td>
                          <td className="py-2 px-3 text-right">{s.avgWrongs ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-stone-500">
                  離脱率は「そのステップに到達したセッションのうち完了しなかった割合」の簡易計算です。ヒント/誤答がステップ単位で無い場合は平均値を分配して表示しています。
                </p>

                {/* Reviews section */}
                <div className="mt-4 rounded-2xl border border-stone-100 bg-stone-50/60 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-brand-dark">レビュー</h4>
                    <span className="text-xs text-stone-500">
                      {detailQuestAnalytics.reviews.avgRating != null
                        ? `平均 ★${detailQuestAnalytics.reviews.avgRating} / ${detailQuestAnalytics.reviews.count} 件`
                        : 'まだレビューがありません'}
                    </span>
                  </div>
                  {detailQuestAnalytics.reviews.count > 0 && (
                    <>
                      <div className="grid grid-cols-5 gap-2 text-xs">
                        {detailQuestAnalytics.reviews.distribution
                          .slice()
                          .sort((a, b) => b.score - a.score)
                          .map((d) => (
                            <div key={d.score} className="space-y-1">
                              <div className="flex items-center justify-between text-stone-600">
                                <span>★{d.score}</span>
                                <span>{d.count}</span>
                              </div>
                              <div className="h-2 bg-white border border-stone-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 rounded-full"
                                  style={{
                                    width: `${
                                      detailQuestAnalytics.reviews.count
                                        ? Math.min(
                                            100,
                                            (d.count / detailQuestAnalytics.reviews.count) * 100
                                          )
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                      <div className="space-y-2 text-sm">
                        {detailQuestAnalytics.reviews.latest.map((r, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl bg-white border border-stone-200 px-3 py-2"
                          >
                            <div className="flex items-center justify-between text-xs text-stone-600">
                              <span className="font-semibold text-amber-700">{"★".repeat(r.rating)}</span>
                              <span>{r.created_at ? new Date(r.created_at).toLocaleDateString('ja-JP') : ''}</span>
                            </div>
                            {r.comment && (
                              <p className="text-sm text-stone-700 mt-1 whitespace-pre-wrap">{r.comment}</p>
                            )}
                          </div>
                        ))}
                        {detailQuestAnalytics.reviews.latest.length === 0 && (
                          <p className="text-xs text-stone-500">レビューはまだありません。</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const status = getStatus(card);
            const accent = accentMap[card.key];
            const barClass =
              status === 'done'
                ? 'bg-emerald-600 text-white'
                : status === 'locked'
                ? 'bg-stone-200 text-stone-500'
                : status === 'active'
                ? accent.activeBar
                : accent.idleBar;
            const startButtonBase =
              status === 'active'
                ? 'bg-brand-dark text-white hover:bg-brand-gold'
                : 'border border-stone-300 text-brand-dark hover:border-brand-gold hover:text-brand-gold';
            const isLocked = status === 'locked';
            const handleStart = () => {
              if (isLocked) return;
              if (card.step === 2) {
                onGoStep2();
                return;
              }
              if (card.step === 3) {
                setActiveStep(3);
                onGoStep3();
                return;
              }
              if (card.step === 4) {
                setActiveStep(4);
                onGoStep4();
                return;
              }
              if (card.step === 5) {
                setActiveStep(5);
                onPublish();
                return;
              }
              if (card.step === 1) {
                setActiveStep(1);
                onGoStep1();
                return;
              }
              setActiveStep(card.step);
            };
            return (
              <div key={card.step} className="rounded-3xl overflow-hidden border border-stone-200 bg-white shadow-md flex flex-col">
                <div className={`px-4 py-3 flex items-center justify-between ${barClass}`}>
                  <div className="flex items-center gap-3 font-bold">
                    <span className="text-[11px] bg-white/20 px-2 py-1 rounded-full uppercase tracking-wide">Step {card.step}</span>
                    <div className="flex items-center gap-2">
                      {card.sparkle && <Sparkles size={16} className="text-white drop-shadow-sm" />}
                      <span>{card.title}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {card.optional && status !== 'done' && (
                      <span className={`text-[11px] px-2 py-1 rounded-full border ${accent.pill}`}>任意</span>
                    )}
                    {status === 'active' && <span className="text-xs uppercase tracking-widest">Next</span>}
                    {status === 'done' && (
                      <>
                        <CheckCircle size={18} className="text-white" />
                        {card.editable && (
                          <button
                            onClick={() => {
                              setActiveStep(card.step);
                              if (card.step === 1) onGoStep1();
                            }}
                            className="text-[11px] underline underline-offset-2 text-white/90 hover:text-white"
                          >
                            編集
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex-1 p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <p className="text-xs uppercase tracking-widest text-stone-500 font-bold">{card.subtitle}</p>
                      <p className="text-sm text-brand-dark font-bold">{card.description}</p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br shadow-inner flex items-center justify-center text-2xl">
                      <div className={`w-full h-full rounded-2xl bg-gradient-to-br ${accent.iconBg} flex items-center justify-center relative overflow-hidden`}>
                        <span className={`${status === 'locked' ? 'text-stone-400' : 'text-brand-dark'} text-2xl`}>
                          {card.emoji}
                        </span>
                        <card.icon className="absolute bottom-2 right-2 w-4 h-4 text-brand-dark/40" />
                      </div>
                    </div>
                  </div>
                  {card.optional && (
                    <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                      ✨ TOMOSHIBI 独自のソーシャルアクション
                    </div>
                  )}
                </div>
                <div className="px-5 pb-5 flex items-center justify-between">
                  {status === 'done' && card.ribbon ? (
                    <div className="w-full text-center text-sm font-bold text-green-700 bg-green-100 px-3 py-2 rounded-full flex items-center justify-center gap-3">
                      <span>{card.ribbon}</span>
                      {card.step === 1 && (
                        <button
                          onClick={() => {
                            setActiveStep(1);
                            onGoStep1();
                          }}
                          className="text-xs underline text-emerald-800 hover:text-emerald-900"
                        >
                          編集
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleStart}
                        disabled={isLocked}
                        className={`${startButtonBase} px-4 py-2 rounded-full text-sm font-bold transition-colors shadow-sm ${isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md'}`}
                      >
                        Start
                      </button>
                      {card.todoLink && status === 'active' && (
                        <button className="text-xs text-stone-500 hover:text-brand-dark underline">To-do list</button>
                      )}
                      {isLocked && (
                        <span className="text-[11px] text-stone-500">全ステップ完了後に有効</span>
                      )}
                      {card.optional && status !== 'active' && !isLocked && (
                        <span className="text-[11px] text-emerald-700 font-bold">任意で追加できます</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CreatorSpotDetailPage({
  spot,
  onLogoHome,
  onBackList,
  onSaveBack,
  onSaveNext,
  nextSpot,
  questId,
  setRouteSpots,
}: {
  spot: RouteSpot;
  onLogoHome: () => void;
  onBackList: () => void;
  onSaveBack: (payload: RouteSpot, markComplete: boolean) => void;
  onSaveNext: (payload: RouteSpot, markComplete: boolean) => void;
  nextSpot: RouteSpot | null;
  questId: string | null;
  setRouteSpots: React.Dispatch<React.SetStateAction<RouteSpot[]>>;
}) {
  const defaultDetails: SpotDetails = {
    directions: '',
    directionsImage: '',
    storyImage: '',
    storyText: '',
    challengeText: '',
    challengeImage: '',
    hints: [
      { id: 'hint-1', label: 'ヒント1', text: '' },
      { id: 'hint-2', label: 'ヒント2', text: '' },
      { id: 'answer', label: '答え', text: '' },
    ],
    answerText: '',
    answerType: 'text',
    choiceOptions: [],
    acceptableAnswers: [],
    successMessage: '',
    ...(spot.details || {}),
  };
  const [directions, setDirections] = useState(defaultDetails.directions);
  const [directionsImage, setDirectionsImage] = useState(defaultDetails.directionsImage || '');
  const [storyImage, setStoryImage] = useState(defaultDetails.storyImage || '');
  const [storyText, setStoryText] = useState(defaultDetails.storyText);
  const [challengeText, setChallengeText] = useState(defaultDetails.challengeText);
  const [challengeImage, setChallengeImage] = useState(defaultDetails.challengeImage || '');
  const [hints, setHints] = useState<HintItem[]>(defaultDetails.hints);
  const [answerText, setAnswerText] = useState(defaultDetails.answerText);
  const [answerType, setAnswerType] = useState<string>(defaultDetails.answerType || 'text');
  const [choiceOptions, setChoiceOptions] = useState<string[]>(defaultDetails.choiceOptions || []);
  const [acceptableAnswers, setAcceptableAnswers] = useState<string[]>(defaultDetails.acceptableAnswers || []);
  const [successMessage, setSuccessMessage] = useState(defaultDetails.successMessage);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const requiredFilled =
    directions.trim().length > 0 &&
    storyText.trim().length > 0 &&
    challengeText.trim().length > 0 &&
    (answerType === 'choice' ? choiceOptions.length > 0 : answerText.trim().length > 0) &&
    successMessage.trim().length > 0 &&
    hints.every((h) => h.text.trim().length > 0);

  const updateHint = (id: string, text: string) => {
    setHints((prev) => prev.map((h) => (h.id === id ? { ...h, text } : h)));
  };

  const addHint = () => {
    const nextIndex = hints.length + 1;
    setHints([...hints, { id: `hint-${nextIndex}`, label: `ヒント${nextIndex}`, text: '' }]);
  };

  useEffect(() => {
    if (!spot.id) return;
    supabase
      .from('spot_details')
      .select('nav_text, story_text, question_text, answer_text, hint_text, explanation_text, answer_type, choice_options, acceptable_answers, completion_message')
      .eq('spot_id', spot.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDirections(data.nav_text || '');
          setStoryText(data.story_text || '');
          setChallengeText(data.question_text || '');
          setAnswerText(data.answer_text || '');
          setAnswerType(data.answer_type || 'text');
          setChoiceOptions(Array.isArray(data.choice_options) ? data.choice_options : []);
          setAcceptableAnswers(Array.isArray(data.acceptable_answers) ? data.acceptable_answers : []);
          if (data.hint_text) {
            const lines = (data.hint_text as string)
              .split(/\n+/)
              .map((t) => t.trim())
              .filter((t) => t.length > 0);
            setHints(
              lines.length
                ? lines.map((t, idx) => ({ id: `hint-${idx + 1}`, label: `ヒント${idx + 1}`, text: t }))
                : defaultDetails.hints
            );
          } else {
            setHints(defaultDetails.hints);
          }
          setSuccessMessage(data.explanation_text || data.completion_message || '');
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot.id]);

  const buildPayload = () => {
    const details: SpotDetails = {
      directions,
      directionsImage,
      storyImage,
      storyText,
      challengeText,
      challengeImage,
      hints,
      answerText,
      answerType,
      choiceOptions,
      acceptableAnswers,
      successMessage,
    };
    return {
      ...spot,
      details,
      status: requiredFilled ? 'complete' : 'draft',
    };
  };

  const handleSaveBack = () => {
    const payload = buildPayload();
    onSave(payload, () => onSaveBack(payload, requiredFilled));
  };

  const handleSaveNext = () => {
    const payload = buildPayload();
    onSave(payload, () => onSaveNext(payload, requiredFilled));
  };

  const onSave = async (payload: RouteSpot, onDone: () => void) => {
    if (!spot.id) return;
    setLoading(true);
    setSaveError(null);
    try {
      await supabase.from('spot_details').upsert({
        spot_id: spot.id,
        nav_text: directions,
        story_text: storyText,
        question_text: challengeText,
        answer_text: answerText,
        hint_text: hints.map((h) => h.text?.trim?.() || '').filter((t) => t.length > 0).join('\n'),
        explanation_text: successMessage,
        completion_message: successMessage,
        answer_type: answerType,
        choice_options: choiceOptions,
        acceptable_answers: acceptableAnswers,
      });
      setRouteSpots((prev) => prev.map((s) => (s.id === spot.id ? { ...s, status: requiredFilled ? 'complete' : s.status } : s)));
      onDone();
    } catch (err: any) {
      setSaveError(err?.message || '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-white">
      <div className="border-b border-stone-200 bg-white">
        <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-6">
          <button onClick={onLogoHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TomoshibiLogo className="h-8 w-auto" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 min-h-[calc(100vh-64px)]">
        {/* Left: Form */}
        <div className="px-4 md:px-12 py-12 space-y-8 overflow-y-auto h-[calc(100vh-96px)] bg-brand-base/60">
          <div className="flex items-center justify-between">
            <button onClick={onBackList} className="text-sm text-brand-dark font-bold hover:underline flex items-center gap-2">
              &lt; スポット一覧に戻る
            </button>
            <div className="text-xs text-stone-500 font-bold">Step 2 / Spot Detail</div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-brand-gold font-bold">Spot Detail</p>
            <h1 className="text-3xl font-serif font-bold text-brand-dark">{spot.name || 'スポット名未設定'}</h1>
            <p className="text-sm text-stone-700">チェックポイントの物語と謎を作り込みましょう。右側のプレビューに即時反映されます。</p>
          </div>

          {/* Directions */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-brand-gold" />
              <h3 className="text-lg font-bold text-brand-dark">ナビゲーション指示 (Directions)</h3>
            </div>
            <textarea
              value={directions}
              onChange={(e) => setDirections(e.target.value)}
              rows={3}
              placeholder="駅の北口を出て、赤いポストの方へ進んでください..."
              className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
            <div className="flex items-center justify-between">
              <div className="text-xs text-stone-500">補足の写真を追加</div>
              <button className="px-4 py-2 rounded-full border border-stone-300 bg-white text-sm font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold">
                画像をアップロード
              </button>
            </div>
          </div>

          {/* Story */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-brand-gold" />
              <h3 className="text-lg font-bold text-brand-dark">ストーリー・描写 (Story & Narrative)</h3>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-stone-500">到着時に表示する画像</div>
              <button className="px-4 py-2 rounded-full border border-stone-300 bg-white text-sm font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold">
                画像をアップロード
              </button>
            </div>
            <textarea
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              rows={6}
              placeholder="あなたはついに〇〇に到着した。そこで古びた看板を目にする…"
              className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>

          {/* Challenge */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Puzzle size={18} className="text-brand-gold" />
              <h3 className="text-lg font-bold text-brand-dark">謎・チャレンジ (Challenge & Clues)</h3>
            </div>
            <textarea
              value={challengeText}
              onChange={(e) => setChallengeText(e.target.value)}
              rows={5}
              placeholder="看板に並ぶ文字を並び替えると、次のキーワードが現れる…"
              className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
            <div className="flex items-center justify-between">
              <div className="text-xs text-stone-500">暗号や写真などを追加</div>
              <button className="px-4 py-2 rounded-full border border-stone-300 bg-white text-sm font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold">
                画像をアップロード
              </button>
            </div>

            <div className="space-y-2 border-t border-stone-200 pt-4">
              <label className="text-sm font-bold text-brand-dark">回答形式</label>
              <select
                value={answerType}
                onChange={(e) => setAnswerType(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50 text-sm"
              >
                <option value="text">テキスト入力</option>
                <option value="choice">単一選択</option>
                <option value="number">数字入力</option>
              </select>
              {answerType === 'choice' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-500">選択肢を追加</span>
                    <button
                      className="text-xs font-bold text-brand-dark border border-dashed border-stone-300 px-3 py-1 rounded-full hover:border-brand-gold hover:text-brand-gold"
                      onClick={() => setChoiceOptions([...choiceOptions, ''])}
                    >
                      + 追加
                    </button>
                  </div>
                  {choiceOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        value={opt}
                        onChange={(e) => {
                          const next = [...choiceOptions];
                          next[idx] = e.target.value;
                          setChoiceOptions(next);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl border border-stone-300 text-sm"
                        placeholder={`選択肢 ${idx + 1}`}
                      />
                      <label className="text-xs flex items-center gap-1 text-brand-dark">
                        <input
                          type="radio"
                          name="choice-answer"
                          checked={answerText === opt}
                          onChange={() => setAnswerText(opt)}
                        />
                        正解
                      </label>
                      <button
                        className="text-xs text-stone-500 hover:text-red-500"
                        onClick={() => {
                          const next = choiceOptions.filter((_, i) => i !== idx);
                          setChoiceOptions(next);
                          if (answerText === opt) setAnswerText('');
                        }}
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  {choiceOptions.length === 0 && (
                    <p className="text-[11px] text-amber-600">選択肢が未設定です。最低1件追加してください。</p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-stone-200 pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb size={16} className="text-brand-gold" />
                <p className="text-sm font-bold text-brand-dark">ヒント設定 (Hints)</p>
              </div>
              <div className="space-y-3">
                {hints.map((hint) => (
                  <div key={hint.id} className="space-y-1">
                    <label className="text-xs font-bold text-stone-600">{hint.label}</label>
                    <textarea
                      value={hint.text}
                      onChange={(e) => updateHint(hint.id, e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/40 text-sm"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={addHint}
                className="text-sm font-bold text-brand-dark border border-dashed border-stone-300 px-4 py-2 rounded-full hover:border-brand-gold hover:text-brand-gold"
              >
                ヒントを追加
              </button>
            </div>
          </div>

          {/* Answer */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-brand-gold" />
              <h3 className="text-lg font-bold text-brand-dark">正解とクリア条件 (Answer & Completion)</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-dark">正解キーワード / 正解の選択肢</label>
              <input
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder={answerType === 'choice' ? '正解の選択肢テキストを指定' : '例：タヌキ / 1985'}
                className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
            </div>
            {answerType !== 'choice' && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-brand-dark">別解・表記揺れ（カンマ区切り）</label>
                <input
                  value={acceptableAnswers.join(', ')}
                  onChange={(e) =>
                    setAcceptableAnswers(
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0)
                    )
                  }
                  placeholder="例：狸, たぬき, tanuki"
                  className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-dark">正解時のメッセージ</label>
              <textarea
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                rows={3}
                placeholder="やったね！この鍵で次の扉を開けよう。"
                className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={handleSaveBack}
              disabled={loading}
              className="px-5 py-3 rounded-full bg-brand-dark text-white text-sm font-bold hover:bg-brand-gold transition-colors shadow-lg disabled:opacity-60"
            >
              {loading ? '保存中...' : '保存して戻る'}
            </button>
            <button
              onClick={handleSaveNext}
              className="px-5 py-3 rounded-full border border-brand-dark text-brand-dark text-sm font-bold hover:bg-brand-gold hover:text-white transition-colors shadow-lg disabled:opacity-60"
              disabled={!nextSpot || loading}
            >
              {loading ? '保存中...' : '保存して次のスポットへ'}
            </button>
          </div>
          {saveError && <div className="text-sm text-red-600">{saveError}</div>}
        </div>

        {/* Right: Preview */}
        <div className="relative bg-white border-l border-stone-200 h-[calc(100vh-64px)] lg:sticky lg:top-0 px-4 md:px-8 py-12">
          <div className="mx-auto max-w-xs bg-stone-900 rounded-[2.5rem] shadow-2xl overflow-hidden border-8 border-stone-900 h-full flex flex-col">
            <div className="bg-white text-brand-dark text-sm font-bold text-center py-3 border-b border-stone-200">
              {spot.name || 'スポット名'}
            </div>
            <div className="flex-1 overflow-y-auto bg-white p-4 space-y-4">
              <div className="text-xs text-brand-gold font-bold uppercase tracking-widest">Directions</div>
              <p className="text-sm text-stone-700">{directions || 'ここにナビゲーションが表示されます'}</p>
              <div className="w-full h-36 bg-brand-base border border-stone-200 rounded-xl flex items-center justify-center text-xs text-stone-500">
                {storyImage ? '画像プレビュー' : '画像プレースホルダー'}
              </div>
              <div className="text-xs text-brand-gold font-bold uppercase tracking-widest">Story</div>
              <p className="text-sm text-stone-800 whitespace-pre-line">{storyText || 'ストーリー本文がここに表示されます。'}</p>
              <div className="text-xs text-brand-gold font-bold uppercase tracking-widest">Challenge</div>
              <p className="text-sm text-stone-800 whitespace-pre-line">{challengeText || '謎解き問題文がここに表示されます。'}</p>
              <div className="bg-brand-base rounded-2xl p-3 border border-stone-200 space-y-2">
                {hints.map((hint) => (
                  <div key={hint.id} className="text-sm">
                    <span className="font-bold text-brand-dark">{hint.label}:</span>{' '}
                    <span className="text-stone-700">{hint.text || '（未入力）'}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-brand-gold font-bold uppercase tracking-widest">Answer</div>
              <div className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm text-stone-700 space-y-1">
                <div className="text-xs text-stone-500">形式: {answerType === 'choice' ? '選択肢' : answerType}</div>
                {answerType === 'choice' ? (
                  <div className="space-y-1">
                    {(choiceOptions || []).map((opt, idx) => (
                      <div key={idx} className="text-sm">
                        ・{opt || '---'} {answerText === opt ? '(正解)' : ''}
                      </div>
                    ))}
                    {choiceOptions.length === 0 && <div className="text-sm text-stone-500">選択肢が未設定です</div>}
                  </div>
                ) : (
                  <div>
                    正解: {answerText || '---'}
                    {acceptableAnswers.length > 0 && (
                      <div className="text-xs text-stone-500">別解: {acceptableAnswers.join(', ')}</div>
                    )}
                  </div>
                )}
              </div>
              <div className="bg-brand-gold/10 border border-brand-gold/30 text-brand-dark rounded-xl px-3 py-2 text-sm">
                {successMessage || '正解時のメッセージがここに表示されます'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CreatorStorytellingPage({
  onLogoHome,
  onBack,
  onSaveComplete,
  storySettings,
  spots,
  isSocialQuest,
  questId,
}: {
  onLogoHome: () => void;
  onBack: () => void;
  onSaveComplete: (settings: typeof storySettings) => void;
  storySettings: {
    castName: string;
    castTone: string;
    castIcon: string;
    prologueTitle: string;
    prologueBody: string;
    prologueImage: string;
    epilogueBody: string;
    socialMessage: string;
    epilogueImage: string;
    characters: CastCharacter[];
    scenario: ScenarioBlock[];
  };
  spots: RouteSpot[];
  isSocialQuest: boolean;
  questId: string | null;
}) {
  const [castName, setCastName] = useState(storySettings.castName || '');
  const [castTone, setCastTone] = useState(storySettings.castTone || '');
  const [castIcon, setCastIcon] = useState(storySettings.castIcon || '');
  const [prologueTitle, setPrologueTitle] = useState(storySettings.prologueTitle || '');
  const [prologueBody, setPrologueBody] = useState(storySettings.prologueBody || '');
  const [prologueImage, setPrologueImage] = useState(storySettings.prologueImage || '');
  const [epilogueBody, setEpilogueBody] = useState(storySettings.epilogueBody || '');
  const [socialMessage, setSocialMessage] = useState(storySettings.socialMessage || '');
  const [epilogueImage, setEpilogueImage] = useState(storySettings.epilogueImage || '');
  const [previewMode, setPreviewMode] = useState<'chat' | 'novel'>('chat');
  const [characters, setCharacters] = useState<CastCharacter[]>(storySettings.characters || []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  type StoryBlock = {
    id: string;
    stage: 'prologue' | 'epilogue';
    orderIndex: number;
    speakerType: 'narrator' | 'character' | 'system';
    speakerName?: string;
    avatarUrl?: string;
    text: string;
  };
  const [prologueBlocks, setPrologueBlocks] = useState<StoryBlock[]>([]);
  const [epilogueBlocks, setEpilogueBlocks] = useState<StoryBlock[]>([]);
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [scenario, setScenario] = useState<ScenarioBlock[]>(
    storySettings.scenario.length
      ? storySettings.scenario
      : [
          { type: 'prologue', id: 'prologue', content: storySettings.prologueBody || '' },
          ...spots.map((s) => ({ type: 'spot', id: `spot-${s.id}`, spotId: s.id, name: s.name })),
          { type: 'epilogue', id: 'epilogue', content: storySettings.epilogueBody || '', social: storySettings.socialMessage || '' },
        ]
  );

  useEffect(() => {
    setScenario((prev) =>
      prev.map((b) => {
        if (b.type === 'prologue') return { ...b, content: prologueBody };
        if (b.type === 'epilogue') return { ...b, content: epilogueBody, social: socialMessage };
        if (b.type === 'spot') {
          const matched = spots.find((s) => s.id === b.spotId);
          return matched ? { ...b, name: matched.name } : b;
        }
        return b;
      })
    );
  }, [prologueBody, epilogueBody, socialMessage, spots]);

  const addBlock = (stage: 'prologue' | 'epilogue') => {
    const setter = stage === 'prologue' ? setPrologueBlocks : setEpilogueBlocks;
    const list = stage === 'prologue' ? prologueBlocks : epilogueBlocks;
    setter([
      ...list,
      {
        id: `${stage}-${Date.now()}`,
        stage,
        orderIndex: list.length + 1,
        speakerType: 'narrator',
        speakerName: 'Narrator',
        text: '',
      },
    ]);
  };

  const updateBlock = (stage: 'prologue' | 'epilogue', id: string, partial: Partial<StoryBlock>) => {
    const setter = stage === 'prologue' ? setPrologueBlocks : setEpilogueBlocks;
    setter((prev) =>
      prev
        .map((b) => (b.id === id ? { ...b, ...partial, orderIndex: partial.orderIndex ?? b.orderIndex } : b))
        .sort((a, b) => a.orderIndex - b.orderIndex)
    );
  };

  const removeBlock = (stage: 'prologue' | 'epilogue', id: string) => {
    const setter = stage === 'prologue' ? setPrologueBlocks : setEpilogueBlocks;
    setter((prev) =>
      prev
        .filter((b) => b.id !== id)
        .map((b, idx) => ({ ...b, orderIndex: idx + 1 }))
    );
  };

  const moveBlock = (stage: 'prologue' | 'epilogue', id: string, delta: number) => {
    const list = stage === 'prologue' ? prologueBlocks : epilogueBlocks;
    const idx = list.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const target = idx + delta;
    if (target < 0 || target >= list.length) return;
    const reordered = [...list];
    const [item] = reordered.splice(idx, 1);
    reordered.splice(target, 0, item);
    const setter = stage === 'prologue' ? setPrologueBlocks : setEpilogueBlocks;
    setter(reordered.map((b, i) => ({ ...b, orderIndex: i + 1 })));
  };

  const isValid = true;
  useEffect(() => {
    if (!questId) return;
    supabase
      .from('story_timelines')
      .select(
        'prologue, epilogue, characters, timeline_data, timeline_json, cast_name, cast_tone, cast_icon, prologue_title, prologue_image, epilogue_image, social_message'
      )
      .eq('quest_id', questId)
      .single()
      .then(({ data }) => {
        if (data) {
          setCastName((data.cast_name as string) || storySettings.castName || '');
          setCastTone((data.cast_tone as string) || storySettings.castTone || '');
          setCastIcon((data.cast_icon as string) || storySettings.castIcon || '');
          setPrologueTitle((data.prologue_title as string) || storySettings.prologueTitle || '');
          setPrologueBody((data.prologue as string) || storySettings.prologueBody || '');
          setPrologueImage((data.prologue_image as string) || storySettings.prologueImage || '');
          setEpilogueImage((data.epilogue_image as string) || storySettings.epilogueImage || '');
          setEpilogueBody((data.epilogue as string) || storySettings.epilogueBody || '');
          setSocialMessage((data.social_message as string) || storySettings.socialMessage || '');
          setCharacters((data.characters as CastCharacter[]) || storySettings.characters || []);
          setScenario((data.timeline_data as ScenarioBlock[]) || storySettings.scenario || []);
          if (data.timeline_json) {
            const list = data.timeline_json as StoryBlock[];
            setPrologueBlocks(
              list.filter((b) => b.stage === 'prologue').sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
            );
            setEpilogueBlocks(
              list.filter((b) => b.stage === 'epilogue').sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
            );
          } else {
            if (data.prologue) {
              setPrologueBlocks([
                { id: 'prologue-1', stage: 'prologue', orderIndex: 1, speakerType: 'narrator', speakerName: 'Narrator', text: data.prologue },
              ]);
            }
            if (data.epilogue) {
              setEpilogueBlocks([
                { id: 'epilogue-1', stage: 'epilogue', orderIndex: 1, speakerType: 'narrator', speakerName: 'Narrator', text: data.epilogue },
              ]);
            }
          }
        }
        setTimelineLoaded(true);
      })
      .catch(() => setTimelineLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questId]);

  const handleSave = async () => {
    if (!questId) {
      setSaveError('クエストIDがありません。Step1を保存してください。');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      // timeline_json を組み立て
      const sortedPro = [...prologueBlocks].sort((a, b) => a.orderIndex - b.orderIndex).map((b, idx) => ({
        ...b,
        orderIndex: idx + 1,
      }));
      const sortedEpi = [...epilogueBlocks].sort((a, b) => a.orderIndex - b.orderIndex).map((b, idx) => ({
        ...b,
        orderIndex: idx + 1,
      }));
      const timelineJson = [...sortedPro, ...sortedEpi];
      const prologueTextFromBlocks = sortedPro.map((b) => b.text).filter((t) => t && t.length).join('\n');
      const epilogueTextFromBlocks = sortedEpi.map((b) => b.text).filter((t) => t && t.length).join('\n');
      await supabase.from('story_timelines').upsert({
        quest_id: questId,
        cast_name: castName,
        cast_tone: castTone,
        cast_icon: castIcon,
        prologue_title: prologueTitle,
        characters,
        prologue_image: prologueImage,
        prologue: prologueTextFromBlocks || prologueBody,
        epilogue_image: epilogueImage,
        social_message: socialMessage,
        epilogue: epilogueTextFromBlocks || epilogueBody,
        timeline_data: scenario,
        timeline_json: timelineJson,
      });
      const payload = {
        castName,
        castTone,
        castIcon,
        prologueTitle,
        prologueBody,
        prologueImage,
        epilogueBody,
        socialMessage,
        epilogueImage,
        characters,
        scenario,
      };
      onSaveComplete(payload);
    } catch (err: any) {
      setSaveError(err?.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const availableSpeakers = [
    { id: 'cast-main', name: castName || '案内人', tone: castTone },
    ...characters.map((c) => ({ id: c.id, name: c.name || 'キャラクター', tone: c.tone })),
  ];

  const insertDialogue = (afterId: string) => {
    const idx = scenario.findIndex((b) => b.id === afterId);
    if (idx === -1) return;
    const newBlock: ScenarioBlock = {
      type: 'dialogue',
      id: `dialogue-${Date.now()}`,
      characterId: availableSpeakers[0]?.id || 'cast-main',
      text: '',
      position: 'left',
    };
    const updated = [...scenario];
    updated.splice(idx + 1, 0, newBlock);
    setScenario(updated);
  };

  const updateDialogue = (id: string, payload: Partial<Extract<ScenarioBlock, { type: 'dialogue' }>>) => {
    setScenario((prev) =>
      prev.map((b) => (b.id === id && b.type === 'dialogue' ? { ...b, ...payload } : b))
    );
  };

  return (
    <section className="min-h-screen bg-white">
      <div className="border-b border-stone-200 bg-white">
        <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-6">
          <button onClick={onLogoHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TomoshibiLogo className="h-8 w-auto" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 min-h-[calc(100vh-64px)]">
        {/* Left: Editor */}
        <div className="px-4 md:px-12 py-12 space-y-8 overflow-y-auto h-[calc(100vh-96px)] bg-brand-base/60">
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="text-sm text-brand-dark font-bold hover:underline flex items-center gap-2">
              &lt; Workspace
            </button>
            <div className="text-xs text-stone-500 font-bold">Step 3 / 5</div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-brand-gold font-bold">Storytelling</p>
            <h1 className="text-3xl font-serif font-bold text-brand-dark">物語と演出を作り込む</h1>
            <p className="text-sm text-stone-700">
              物語の始まりと終わりを整え、案内人の声と演出で世界観を仕上げましょう。右のプレビューに即時反映されます。
            </p>
          </div>

          {/* Cast */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <User size={18} className="text-brand-gold" />
              <h3 className="text-lg font-bold text-brand-dark">キャスト設定 (Cast & Narrator)</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-brand-dark">キャラクター名</label>
                <input
                  value={castName}
                  onChange={(e) => setCastName(e.target.value)}
                  placeholder="例：古文書の精霊"
                  className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-brand-dark">口調・トーンメモ</label>
                <input
                  value={castTone}
                  onChange={(e) => setCastTone(e.target.value)}
                  placeholder="例：丁寧語・ミステリアス"
                  className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-stone-500">アイコン画像を設定</div>
              <button className="px-4 py-2 rounded-full border border-stone-300 bg-white text-sm font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold">
                アイコンをアップロード
              </button>
            </div>
          </div>

          {/* Characters */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-brand-gold" />
                <h3 className="text-lg font-bold text-brand-dark">登場人物設定</h3>
              </div>
              <button
                onClick={() =>
                  setCharacters([
                    ...characters,
                    {
                      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
                      name: '',
                      role: '',
                      tone: '',
                      icon: '',
                    },
                  ])
                }
                className="flex items-center gap-1 text-sm font-bold text-brand-dark border border-stone-300 px-3 py-1.5 rounded-full hover:border-brand-gold hover:text-brand-gold"
              >
                <PlusCircle size={16} /> 追加
              </button>
            </div>
            <div className="space-y-3">
              {characters.length === 0 && (
                <div className="text-sm text-stone-500 bg-brand-base border border-dashed border-stone-300 rounded-2xl px-4 py-4 text-center">
                  まだ登場人物がありません。追加ボタンでキャラクターを増やせます。
                </div>
              )}
              {characters.map((c, idx) => (
                <div key={c.id} className="rounded-2xl border border-stone-200 p-4 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-brand-dark">キャラクター {idx + 1}</p>
                    <div className="flex items-center gap-2 text-stone-400">
                      <button
                        onClick={() => setCharacters(characters.filter((x) => x.id !== c.id))}
                        className="hover:text-rose-500 text-xs font-bold"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <input
                      value={c.name}
                      onChange={(e) =>
                        setCharacters(characters.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))
                      }
                      placeholder="名前"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                    />
                    <input
                      value={c.role}
                      onChange={(e) =>
                        setCharacters(characters.map((x) => (x.id === c.id ? { ...x, role: e.target.value } : x)))
                      }
                      placeholder="役割・肩書き"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                    />
                    <input
                      value={c.tone}
                      onChange={(e) =>
                        setCharacters(characters.map((x) => (x.id === c.id ? { ...x, tone: e.target.value } : x)))
                      }
                      placeholder="口調メモ"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-xs text-stone-500">アイコン画像（任意）</div>
                    <button className="px-3 py-2 rounded-full border border-stone-300 bg-white text-xs font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold">
                      アップロード
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prologue / Epilogue Chat Blocks */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Scroll size={18} className="text-brand-gold" />
              <h3 className="text-lg font-bold text-brand-dark">プロローグ / エピローグ（チャット）</h3>
            </div>
            {!timelineLoaded && <p className="text-sm text-stone-500">読み込み中...</p>}
            {timelineLoaded && (
              <div className="grid md:grid-cols-2 gap-4">
                {(['prologue', 'epilogue'] as const).map((stage) => {
                  const list = stage === 'prologue' ? prologueBlocks : epilogueBlocks;
                  const setterLabel = stage === 'prologue' ? 'プロローグ' : 'エピローグ';
                  return (
                    <div key={stage} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-brand-dark">{setterLabel}</p>
                        <button
                          className="text-xs font-bold text-brand-dark border border-dashed border-stone-300 px-3 py-1 rounded-full hover:border-brand-gold hover:text-brand-gold"
                          onClick={() => addBlock(stage)}
                        >
                          + 追加
                        </button>
                      </div>
                      <div className="space-y-3">
                        {list.length === 0 && (
                          <div className="text-xs text-stone-500 bg-brand-base border border-stone-200 rounded-xl px-3 py-2">
                            メッセージがありません。追加してください。
                          </div>
                        )}
                        {list.map((b, idx) => (
                          <div key={b.id} className="rounded-2xl border border-stone-200 bg-white shadow-sm p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs text-stone-500">
                              <span>#{idx + 1}</span>
                              <div className="flex items-center gap-2">
                                <button onClick={() => moveBlock(stage, b.id, -1)} className="hover:text-brand-gold">↑</button>
                                <button onClick={() => moveBlock(stage, b.id, 1)} className="hover:text-brand-gold">↓</button>
                                <button onClick={() => removeBlock(stage, b.id)} className="hover:text-rose-500">削除</button>
                              </div>
                            </div>
                            <select
                              value={b.speakerType}
                              onChange={(e) => updateBlock(stage, b.id, { speakerType: e.target.value as StoryBlock['speakerType'] })}
                              className="w-full text-sm border border-stone-300 rounded-xl px-3 py-2"
                            >
                              <option value="narrator">ナレーション</option>
                              <option value="character">キャラクター</option>
                              <option value="system">システム</option>
                            </select>
                            <input
                              value={b.speakerName || ''}
                              onChange={(e) => updateBlock(stage, b.id, { speakerName: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                              placeholder="話者名（任意）"
                            />
                            <textarea
                              value={b.text}
                              onChange={(e) => updateBlock(stage, b.id, { text: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                              placeholder="セリフやナレーションを入力"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Scenario Timeline */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Scroll size={18} className="text-brand-gold" />
              <h3 className="text-lg font-bold text-brand-dark">シナリオフロー (Timeline)</h3>
            </div>
            <p className="text-xs text-stone-600">プロローグとスポットの間に会話を挿入して、物語のテンポを整えましょう。</p>
            <div className="space-y-3">
              {scenario.map((block, idx) => (
                <div key={block.id} className="relative">
                  {/* block */}
                  {block.type === 'prologue' && (
                    <div className="rounded-2xl border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm text-brand-dark">
                      🎬 プロローグ：{prologueTitle || 'タイトル未設定'}
                    </div>
                  )}
                  {block.type === 'spot' && (
                    <div className="rounded-2xl border border-stone-300 bg-stone-100 px-4 py-3 flex items-center gap-3 text-sm text-brand-dark">
                      <MapPin size={16} className="text-brand-dark" />
                      <div>
                        <p className="font-bold">スポット: {block.name}</p>
                        <p className="text-xs text-stone-500">Step2で設定（編集不可）</p>
                      </div>
                    </div>
                  )}
                  {block.type === 'dialogue' && (
                    <div className="rounded-2xl border border-brand-gold/30 bg-white px-4 py-3 space-y-2 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-stone-500">会話</span>
                        <select
                          value={block.characterId}
                          onChange={(e) => updateDialogue(block.id, { characterId: e.target.value })}
                          className="text-sm border border-stone-300 rounded-full px-3 py-1"
                        >
                          {availableSpeakers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name || 'キャラクター'}
                            </option>
                          ))}
                        </select>
                        <select
                          value={block.position}
                          onChange={(e) => updateDialogue(block.id, { position: e.target.value as 'left' | 'right' })}
                          className="text-xs border border-stone-300 rounded-full px-2 py-1 text-stone-600"
                        >
                          <option value="left">左に表示</option>
                          <option value="right">右に表示</option>
                        </select>
                      </div>
                      <textarea
                        value={block.text}
                        onChange={(e) => updateDialogue(block.id, { text: e.target.value })}
                        rows={2}
                        placeholder="セリフを入力"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                      />
                    </div>
                  )}
                  {block.type === 'epilogue' && (
                    <div className="rounded-2xl border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm text-brand-dark">
                      🏁 エピローグ（プレビュー反映）
                    </div>
                  )}

                  {/* add dialogue button */}
                  {idx < scenario.length - 1 && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => insertDialogue(block.id)}
                        className="mt-2 mb-2 inline-flex items-center gap-2 text-xs font-bold text-brand-dark border border-dashed border-brand-gold px-3 py-1.5 rounded-full hover:border-brand-dark"
                      >
                        <PlusCircle size={14} /> 会話・イベントを追加
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Prologue */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-brand-gold" />
              <h3 className="text-lg font-bold text-brand-dark">プロローグ設定 (Prologue)</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-dark">タイトル</label>
              <input
                value={prologueTitle}
                onChange={(e) => setPrologueTitle(e.target.value)}
                placeholder="例：依頼人からの手紙"
                className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-brand-dark">本文</p>
                <span className="text-xs text-stone-500">プレイヤーを世界観に引き込む導入を書きましょう</span>
              </div>
              <textarea
                value={prologueBody}
                onChange={(e) => setPrologueBody(e.target.value)}
                rows={6}
                placeholder="なぜ今、この謎を解かなければならないのか？動機付けを描きましょう。"
                className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-stone-500">オープニング演出画像</div>
              <button className="px-4 py-2 rounded-full border border-stone-300 bg-white text-sm font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold">
                画像をアップロード
              </button>
            </div>
          </div>

          {/* Epilogue */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-brand-gold" />
              <h3 className="text-lg font-bold text-brand-dark">エピローグ設定 (Epilogue)</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-dark">本文</label>
              <textarea
                value={epilogueBody}
                onChange={(e) => setEpilogueBody(e.target.value)}
                rows={6}
                placeholder="物語のクライマックスを書きましょう。真相とプレイヤーへの称賛を。"
                className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
            </div>
            {isSocialQuest && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-brand-dark">ソーシャルインパクト・メッセージ</label>
                <textarea
                  value={socialMessage}
                  onChange={(e) => setSocialMessage(e.target.value)}
                  rows={3}
                  placeholder="このクエストを通じて、あなたは地域にこんな貢献をしました..."
                  className="w-full px-4 py-3 rounded-2xl border border-emerald-200 bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 text-sm text-emerald-800"
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-xs text-stone-500">エンディング演出画像</div>
              <button className="px-4 py-2 rounded-full border border-stone-300 bg-white text-sm font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold">
                画像をアップロード
              </button>
            </div>
          </div>

          {/* Script flow review */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Scroll size={18} className="text-brand-gold" />
              <h3 className="text-lg font-bold text-brand-dark">スクリプト全体確認 (Script Flow Review)</h3>
            </div>
            <p className="text-xs text-stone-600">プロローグから各スポットのストーリー、エピローグまでを縦読みして整合性を確認します。</p>
            <div className="space-y-3">
              {spots.length === 0 && (
                <div className="text-sm text-stone-500 bg-brand-base border border-dashed border-stone-300 rounded-2xl px-4 py-6 text-center">
                  スポットがまだありません。Step2で追加してください。
                </div>
              )}
              {spots.map((spot, idx) => (
                <div key={spot.id} className="p-4 rounded-2xl border border-stone-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-dark text-white flex items-center justify-center text-sm font-bold">{idx + 1}</div>
                      <div>
                        <p className="text-sm font-bold text-brand-dark">{spot.name || `Spot ${idx + 1}`}</p>
                        <p className="text-xs text-stone-500">口調や設定が一貫しているか確認</p>
                      </div>
                    </div>
                    <button
                      onClick={() => (window.location.href = '/creator/route-spots')}
                      className="text-xs text-brand-gold font-bold hover:underline"
                    >
                      Step2で編集する
                    </button>
                  </div>
                  <p className="text-sm text-stone-700 mt-3 line-clamp-3">
                    {spot.details?.storyText || '（このスポットのストーリーは未入力です）'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleSave}
              disabled={!isValid || saving}
              className={`px-6 py-3 rounded-full text-sm font-bold shadow-lg ${
                isValid ? 'bg-brand-dark text-white hover:bg-brand-gold' : 'bg-stone-200 text-stone-500 cursor-not-allowed'
              }`}
            >
              {saving ? '保存中...' : '保存して完了'}
            </button>
          </div>
          {saveError && <div className="text-sm text-red-600">{saveError}</div>}
        </div>

        {/* Right: Preview */}
        <div className="relative bg-white border-l border-stone-200 h-[calc(100vh-64px)] lg:sticky lg:top-0 px-4 md:px-8 py-12">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setPreviewMode('chat')}
              className={`px-3 py-1 rounded-full text-xs font-bold border ${previewMode === 'chat' ? 'bg-brand-dark text-white border-brand-dark' : 'border-stone-300 text-stone-600'}`}
            >
              チャットモード
            </button>
            <button
              onClick={() => setPreviewMode('novel')}
              className={`px-3 py-1 rounded-full text-xs font-bold border ${previewMode === 'novel' ? 'bg-brand-dark text-white border-brand-dark' : 'border-stone-300 text-stone-600'}`}
            >
              ノベルモード
            </button>
          </div>
          <div className="mx-auto max-w-xs bg-stone-900 rounded-[2.5rem] shadow-2xl overflow-hidden border-8 border-stone-900 h-full flex flex-col">
            <div className="bg-white text-brand-dark text-sm font-bold text-center py-3 border-b border-stone-200">
              {castName || '案内人'}
            </div>
            <div className="flex-1 overflow-y-auto bg-white relative">
              {previewMode === 'chat' && (
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-dark text-white flex items-center justify-center text-xs font-bold">
                      {castName ? castName[0] : 'A'}
                    </div>
                    <div className="bg-brand-base rounded-2xl px-3 py-2 border border-stone-200 text-sm text-stone-800 max-w-[80%]">
                      <p className="text-xs text-brand-gold mb-1">{prologueTitle || 'プロローグ'}</p>
                      <p className="whitespace-pre-line">{prologueBody || 'プロローグ本文がここに表示されます。'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 justify-end">
                    <div className="bg-brand-gold text-white rounded-2xl px-3 py-2 text-sm max-w-[80%] shadow">
                      了解！準備はできているよ。
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-dark text-white flex items-center justify-center text-xs font-bold">
                      {castName ? castName[0] : 'A'}
                    </div>
                    <div className="bg-brand-base rounded-2xl px-3 py-2 border border-stone-200 text-sm text-stone-800 max-w-[80%]">
                      <p className="text-xs text-brand-gold mb-1">エピローグ</p>
                      <p className="whitespace-pre-line">{epilogueBody || 'エピローグ本文がここに表示されます。'}</p>
                      {isSocialQuest && (
                        <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-2 py-1">
                          {socialMessage || 'ソーシャルインパクトメッセージがここに表示されます。'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {previewMode === 'novel' && (
                <div className="relative h-full">
                  <div className="absolute inset-0">
                    <div className="w-full h-full bg-gradient-to-b from-brand-base via-white to-brand-base" />
                  </div>
                  <div className="relative p-4 space-y-3">
                    <div className="w-full h-36 rounded-2xl bg-stone-200 flex items-center justify-center text-xs text-stone-500">
                      {prologueImage ? '画像プレビュー' : '背景イメージ'}
                    </div>
                    <div className="bg-white/90 rounded-2xl border border-stone-200 p-3 shadow-sm text-sm text-stone-800">
                      <p className="text-xs text-brand-gold mb-1">{prologueTitle || 'プロローグ'}</p>
                      <p className="whitespace-pre-line leading-relaxed">
                        {prologueBody || 'プロローグ本文がここに表示されます。'}
                      </p>
                    </div>
                    <div className="bg-white/90 rounded-2xl border border-stone-200 p-3 shadow-sm text-sm text-stone-800">
                      <p className="text-xs text-brand-gold mb-1">エピローグ</p>
                      <p className="whitespace-pre-line leading-relaxed">
                        {epilogueBody || 'エピローグ本文がここに表示されます。'}
                      </p>
                      {isSocialQuest && (
                        <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-2 py-1">
                          {socialMessage || 'ソーシャルインパクトメッセージがここに表示されます。'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
function CreatorRouteSpotsPage({
  onBack,
  onComplete,
  onLogoHome,
  routeSpots,
  setRouteSpots,
  onOpenSpotDetail,
  questId,
}: {
  onBack: () => void;
  onComplete: () => void;
  onLogoHome: () => void;
  routeSpots: RouteSpot[];
  setRouteSpots: (spots: RouteSpot[]) => void;
  onOpenSpotDetail: (id: string) => void;
  questId: string | null;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ id: string; marker: any; el: HTMLDivElement }[]>([]);
  const selectedMarkerRef = useRef<any | null>(null);
  const lineSourceId = 'route-line';
  const lineLayerId = 'route-line-layer';

  const [spotName, setSpotName] = useState('');
  const [spotAddress, setSpotAddress] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingSuggest, setIsLoadingSuggest] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [loadingSpots, setLoadingSpots] = useState(false);
  const SEGMENT_LIMIT_KM = 0.5;

  const calcDistanceKm = (a: RouteSpot, b: RouteSpot) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
  };

  const handleDragStart = (id: string, e: React.DragEvent<HTMLDivElement>) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (id: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (id: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggingId && draggingId !== id) {
      reorderSpots(draggingId, id);
    }
    setDraggingId(null);
  };

  const totalDistanceKm = routeSpots.reduce((sum, spot, idx) => {
    if (idx === 0) return 0;
    return sum + calcDistanceKm(routeSpots[idx - 1], spot);
  }, 0);

  const maxSegmentKm = routeSpots.reduce((max, spot, idx) => {
    if (idx === 0) return 0;
    return Math.max(max, calcDistanceKm(routeSpots[idx - 1], spot));
  }, 0);

  const validations = {
    minSpots: true,
    maxSpots: true,
    notTooFar: true,
    withinRange: true,
  };
  const isStepValid = true;

  const getZoomFromFeature = (feature: any) => {
    const types: string[] = feature?.place_type || [];
    if (feature?.bbox) return null;
    if (types.includes('country')) return 6;
    if (types.includes('region')) return 9;
    if (types.includes('place')) return 12;
    if (types.includes('locality')) return 13;
    if (types.includes('neighborhood')) return 14;
    return 15;
  };

  const loadSpots = async () => {
    if (!questId) return;
    setLoadingSpots(true);
    const { data, error } = await supabase
      .from('spots')
      .select('*, spot_details (*)')
      .eq('quest_id', questId)
      .order('order_index', { ascending: true });
    if (!error && data) {
      setRouteSpots(
        data.map((s) => {
          const detail = (s as any).spot_details?.[0] || (s as any).spot_details || null;
          const hintsRaw = detail?.hint_text
            ? String(detail.hint_text)
                .split(/\n+/)
                .map((t: string) => t.trim())
                .filter((t: string) => t.length > 0)
            : [];
          const details: SpotDetails | undefined = detail
            ? {
                directions: detail.nav_text || '',
                directionsImage: '',
                storyImage: '',
                storyText: detail.story_text || '',
                challengeText: detail.question_text || '',
                challengeImage: '',
                hints:
                  hintsRaw.length > 0
                    ? hintsRaw.map((t: string, idx: number) => ({ id: `hint-${idx + 1}`, label: `ヒント${idx + 1}`, text: t }))
                    : [
                        { id: 'hint-1', label: 'ヒント1', text: '' },
                        { id: 'hint-2', label: 'ヒント2', text: '' },
                        { id: 'answer', label: '答え', text: '' },
                      ],
                answerText: detail.answer_text || '',
                answerType: detail.answer_type || 'text',
                choiceOptions: Array.isArray(detail.choice_options) ? detail.choice_options : [],
                acceptableAnswers: Array.isArray(detail.acceptable_answers) ? detail.acceptable_answers : [],
                successMessage: detail.explanation_text || detail.completion_message || '',
              }
            : undefined;
          const requiredFilled =
            (details?.challengeText || '').trim().length > 0 &&
            ((details?.answerType === 'choice' ? (details.choiceOptions || []).length > 0 : (details?.answerText || '').trim().length > 0) ||
              false);
          return {
            id: s.id,
            name: s.name,
            address: s.address || '',
            lat: s.lat,
            lng: s.lng,
            orderIndex: s.order_index,
            status: requiredFilled ? 'complete' : s.status,
            details,
          };
        })
      );
    }
    setLoadingSpots(false);
  };

  useEffect(() => {
    loadSpots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questId]);

  const addSpot = () => {
    if (!spotName.trim() || !spotAddress.trim() || !selectedCoords || !questId) return;
    const orderIndex = routeSpots.length + 1;
    supabase
      .from('spots')
      .insert({
        quest_id: questId,
        name: spotName.trim(),
        address: spotAddress.trim(),
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
        order_index: orderIndex,
      })
      .select()
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setSpotName('');
          setSpotAddress('');
          setSelectedCoords(null);
          setSuggestions([]);
          // 追加したスポットをローカルにも即時反映し、DB順序を保つ
          setRouteSpots((prev) => [
            ...prev,
            {
              id: data.id,
              name: data.name,
              address: data.address || '',
              lat: data.lat,
              lng: data.lng,
              orderIndex: data.order_index,
            },
          ]);
        }
      })
      .catch(() => {});
  };

  const removeSpot = (id: string) => {
    setRouteSpots(routeSpots.filter((s) => s.id !== id));
    supabase.from('spots').delete().eq('id', id).then(() => loadSpots()).catch(() => {});
  };

  const reorderSpots = async (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const updated = [...routeSpots];
    const fromIndex = updated.findIndex((s) => s.id === fromId);
    const toIndex = updated.findIndex((s) => s.id === toId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    const withOrder = updated.map((s, idx) => ({ ...s, orderIndex: idx + 1 }));
    setRouteSpots(withOrder);
    if (questId) {
      const payload = withOrder.map((s) => ({
        id: s.id,
        quest_id: questId,
        name: s.name,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        order_index: s.orderIndex || 0,
      }));
      await supabase.from('spots').upsert(payload, { onConflict: 'id' });
    }
  };

  const renderMap = (maplibregl: any) => {
    if (!mapRef.current) return;
    mapInstanceRef.current = new maplibregl.Map({
      container: mapRef.current,
      style: MAPTILER_STYLE,
      center: routeSpots[0] ? [routeSpots[0].lng, routeSpots[0].lat] : [139.769, 35.6804],
      zoom: routeSpots.length ? 12 : 10,
    });
  };

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.marker.remove());
    markersRef.current = [];
  };

  const placeSelectedMarker = (lng: number, lat: number) => {
    if (!mapInstanceRef.current) return;
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
    }
    const el = document.createElement('div');
    el.className =
      'w-8 h-8 rounded-full bg-white text-brand-dark text-sm font-bold flex items-center justify-center shadow-lg border-2 border-brand-dark';
    el.textContent = '+';
    selectedMarkerRef.current = new (window as any).maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(mapInstanceRef.current);
  };

  const drawMarkersAndLine = () => {
    if (!mapInstanceRef.current) return;
    clearMarkers();
    routeSpots.forEach((spot, idx) => {
      const el = document.createElement('div');
      el.className =
        'w-8 h-8 rounded-full bg-brand-dark text-white text-sm font-bold flex items-center justify-center shadow-lg border-2 border-white';
      el.textContent = `${idx + 1}`;
      const marker = new (window as any).maplibregl.Marker({ element: el })
        .setLngLat([spot.lng, spot.lat])
        .addTo(mapInstanceRef.current);
      markersRef.current.push({ id: spot.id, marker, el });
    });

    if (mapInstanceRef.current.getSource(lineSourceId)) {
      mapInstanceRef.current.removeLayer(lineLayerId);
      mapInstanceRef.current.removeSource(lineSourceId);
    }

    if (routeSpots.length > 1) {
      mapInstanceRef.current.addSource(lineSourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeSpots.map((s) => [s.lng, s.lat]),
          },
        },
      });
      mapInstanceRef.current.addLayer({
        id: lineLayerId,
        type: 'line',
        source: lineSourceId,
        paint: {
          'line-color': '#2563eb',
          'line-width': 4,
          'line-opacity': 0.75,
        },
      });
    }

    if (routeSpots.length) {
      const bounds = new (window as any).maplibregl.LngLatBounds();
      routeSpots.forEach((s) => bounds.extend([s.lng, s.lat]));
      mapInstanceRef.current.fitBounds(bounds, { padding: 80, maxZoom: 16 });
    }
  };

  useEffect(() => {
    loadMaplibre()
      .then((maplibregl) => {
        if (!mapRef.current) return;
        renderMap(maplibregl);
        mapInstanceRef.current?.on('click', (e: any) => {
          const { lng, lat } = e.lngLat || {};
          if (lng == null || lat == null) return;
          setSelectedCoords({ lat, lng });
          placeSelectedMarker(lng, lat);
          fetch(`https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_KEY}&language=ja&limit=1`)
            .then((res) => res.json())
            .then((data) => {
              const feature = data?.features?.[0];
              const label = feature?.place_name;
              const text = feature?.text;
              if (label) setSpotAddress(label);
              if (text) setSpotName(text);
            })
            .catch(() => {});
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    drawMarkersAndLine();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSpots]);

  const highlightMarker = (id: string | null) => {
    markersRef.current.forEach((m) => {
      if (m.id === id) {
        m.el.classList.add('bg-brand-gold', 'scale-105');
        m.el.classList.remove('bg-brand-dark');
      } else {
        m.el.classList.remove('bg-brand-gold', 'scale-105');
        m.el.classList.add('bg-brand-dark');
      }
    });
  };

  useEffect(() => {
    const controller = new AbortController();
    const q = spotAddress.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    setIsLoadingSuggest(true);
    fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${MAPTILER_KEY}&language=ja&limit=5`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setSuggestions(data?.features || []))
      .catch(() => setSuggestions([]))
      .finally(() => setIsLoadingSuggest(false));
    return () => controller.abort();
  }, [spotAddress]);

  return (
    <section className="min-h-screen bg-white">
      <div className="border-b border-stone-200 bg-white">
        <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-6">
          <button onClick={onLogoHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TomoshibiLogo className="h-8 w-auto" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 min-h-[calc(100vh-64px)]">
        {/* Left column */}
        <div className="px-4 md:px-12 py-12 space-y-8 overflow-y-auto h-[calc(100vh-96px)] bg-brand-base/60">
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="text-sm text-brand-dark font-bold hover:underline flex items-center gap-2">
              &lt; Workspace
            </button>
            <div className="text-xs text-stone-500 font-bold">Step 2 / 5</div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-serif font-bold text-brand-dark">ゲームルート情報 (Route Info)</h1>
            <p className="text-sm text-stone-700 leading-relaxed">
              プレイヤーが巡るチェックポイントを追加してください。魅力的なスポットをつなぎ合わせ、一本の線を描きましょう。
            </p>
          </div>

          <div className="space-y-6 max-w-2xl">
            <div className="rounded-3xl bg-white border border-stone-200 p-5 shadow-sm space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-1">Add New Spot</p>
                <h3 className="text-lg font-bold text-brand-dark">スポットの追加</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-extrabold text-brand-dark block mb-1">場所名 (Place Name)</label>
                  <input
                    value={spotName}
                    onChange={(e) => setSpotName(e.target.value)}
                    placeholder="例：中之島図書館 正面階段"
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                  />
                </div>
                <div className="relative">
                  <label className="text-sm font-extrabold text-brand-dark block mb-1">所在地 (Address)</label>
                  <input
                    value={spotAddress}
                    onChange={(e) => setSpotAddress(e.target.value)}
                    placeholder="住所やランドマークで検索"
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                  />
                  {suggestions.length > 0 && (
                    <div className="mt-2 rounded-2xl border border-stone-200 bg-white shadow-lg max-h-56 overflow-auto z-10">
                      {suggestions.map((feature) => (
                        <button
                          key={feature.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const [lng, lat] = feature?.center || [];
                            const label = feature?.place_name || '';
                            if (label) setSpotAddress(label);
                            if (lat && lng) {
                              setSelectedCoords({ lat, lng });
                              placeSelectedMarker(lng, lat);
                            }
                            if (feature?.text) {
                              setSpotName(feature.text);
                            }
                            const zoom = getZoomFromFeature(feature);
                            mapInstanceRef.current?.jumpTo({ center: [lng, lat], zoom: zoom ?? mapInstanceRef.current?.getZoom?.() ?? 12 });
                            setSuggestions([]);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-brand-dark hover:bg-brand-base"
                        >
                          {feature?.place_name}
                        </button>
                      ))}
                      {isLoadingSuggest && <div className="px-4 py-2 text-xs text-stone-500">検索中...</div>}
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={addSpot}
                    className="px-5 py-3 rounded-full bg-brand-dark text-white text-sm font-bold hover:bg-brand-gold transition-colors shadow-lg disabled:opacity-60"
                    disabled={!spotName.trim() || !spotAddress.trim() || !selectedCoords}
                  >
                    スポットを追加 (Add Spot)
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-stone-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-brand-gold font-bold">Saved Spots</p>
                  <h3 className="text-lg font-bold text-brand-dark">保存されたスポット一覧</h3>
                </div>
                <p className="text-xs text-stone-500">ドラッグで順番を変更できます</p>
              </div>
              <div className="space-y-3 relative">
                {routeSpots.length === 0 && (
                  <div className="text-sm text-stone-500 bg-brand-base border border-dashed border-stone-300 rounded-2xl px-4 py-6 text-center">
                    まだスポットがありません。上のフォームから追加してください。
                  </div>
                )}
                {routeSpots.map((spot, idx) => {
                  const prev = idx > 0 ? routeSpots[idx - 1] : null;
                  const segmentKm = prev ? calcDistanceKm(prev, spot) : 0;
                  const tooFar = prev ? segmentKm > SEGMENT_LIMIT_KM : false;
                  return (
                  <div
                    key={spot.id}
                    draggable
                    onDragStart={(e) => handleDragStart(spot.id, e)}
                    onDragOver={(e) => handleDragOver(spot.id, e)}
                    onDrop={(e) => handleDrop(spot.id, e)}
                    onDragEnd={() => setDraggingId(null)}
                    onMouseEnter={() => highlightMarker(spot.id)}
                    onMouseLeave={() => highlightMarker(null)}
                    className="relative pl-6 cursor-move"
                  >
                      {idx < routeSpots.length - 1 && (
                        <div className="absolute left-4 top-12 bottom-0 flex flex-col items-center pointer-events-none">
                          <div className="flex-1 border-l border-dashed border-stone-300 w-px" />
                        </div>
                      )}
                      {prev && (
                        <div className="absolute left-8 -top-3 text-[11px] text-stone-500">
                          区間距離: {segmentKm.toFixed(2)} km
                          {tooFar && (
                            <span className="ml-2 text-rose-600 font-bold">500m以内に調整してください</span>
                          )}
                        </div>
                      )}
                      <div className={`flex items-start gap-3 bg-white rounded-2xl border ${tooFar ? 'border-rose-300' : 'border-stone-200'} px-4 py-3 shadow-sm`}>
                        <button className="mt-2 text-stone-400 hover:text-brand-gold transition-colors" title="順番を入れ替える">
                          <GripVertical size={18} />
                        </button>
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center font-bold text-lg">
                            {idx + 1}
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-brand-dark flex items-center gap-2">
                              {spot.name}
                              {spot.status === 'complete' && (
                                <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">✅ 完成</span>
                              )}
                            </p>
                            <div className="flex items-center gap-2 text-stone-400">
                              <button className="hover:text-brand-gold" title="編集" onClick={() => onOpenSpotDetail(spot.id)}>
                                <Edit size={16} />
                              </button>
                              <button onClick={() => removeSpot(spot.id)} className="hover:text-rose-500" title="削除">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-xl bg-brand-base border border-stone-200 overflow-hidden flex items-center justify-center text-[10px] text-stone-500">
                              サムネ
                            </div>
                            <p className="text-xs text-stone-500 leading-relaxed">{spot.address}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-dashed border-stone-300 p-6 text-center shadow-inner">
              <p className="text-sm font-bold text-brand-dark mb-2">カバー写真の設定 (Cover Photo)</p>
              <p className="text-xs text-stone-500 mb-4">この画像はクエストの表紙としてアプリ内に表示されます。</p>
              <div className="flex items-center justify-center gap-3">
                <div className="px-5 py-3 rounded-full border border-stone-300 bg-white text-sm font-bold text-brand-dark shadow-sm cursor-pointer">
                  ファイルをアップロード
                </div>
                <div className="text-xs text-stone-400">またはドラッグ＆ドロップ</div>
              </div>
            </div>

            <div className={`${isStepValid ? 'bg-brand-dark text-white border-brand-dark' : 'bg-stone-100 text-stone-700 border-stone-200'} rounded-3xl border p-5 shadow-inner space-y-2`}>
              <div className="flex items-center gap-2">
                <Info size={18} className={isStepValid ? 'text-white' : 'text-stone-500'} />
                <p className="text-sm font-bold">{isStepValid ? 'すべての条件をクリアしました' : 'バリデーションチェック'}</p>
              </div>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" readOnly checked={validations.minSpots} className="accent-brand-gold" />
                  10箇所以上のスポットを追加（最大15）
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" readOnly checked={validations.notTooFar} className="accent-brand-gold" />
                  スポット間の距離が適切です
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" readOnly checked={validations.withinRange} className="accent-brand-gold" />
                  総距離が1km〜5kmの範囲内です
                </label>
                <div className="text-xs">
                  現在: 総距離 {totalDistanceKm.toFixed(2)}km / 最大セグメント {maxSegmentKm.toFixed(2)}km
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={onComplete}
                  disabled={!isStepValid}
                  className={`px-5 py-3 rounded-full text-sm font-bold transition-colors shadow-lg ${
                    isStepValid ? 'bg-white text-brand-dark hover:bg-brand-gold hover:text-white' : 'bg-stone-200 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  このステップを完了する
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Map side */}
        <div className="relative bg-white border-l border-stone-200 h-[calc(100vh-64px)] lg:sticky lg:top-0">
          <div ref={mapRef} className="absolute inset-0 w-full h-full" />
          {!MAPTILER_KEY && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <p className="text-sm text-stone-600">MapTiler APIキーを設定してください (VITE_MAPTILER_KEY)</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const QuestCard = ({ quest, onSelect }: { quest: Quest; onSelect: (quest: Quest) => void }) => {
  const hasRating = quest.rating && quest.rating > 0;
  const popularityScore = quest.reviews ? Math.min(999, quest.reviews * 5) : null;
  const recommendation =
    quest.rating >= 4.5 && (quest.reviews || 0) >= 10 ? '高評価' : popularityScore ? '注目' : '新着';
  const handleSelect = () => onSelect(quest);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect();
    }
  };

  return (
    <motion.div
      whileHover={{ y: -6 }}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl overflow-hidden shadow-xl flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
    >
      <div className="relative h-48 overflow-hidden">
        <img src={quest.cover} alt={quest.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/85 via-brand-dark/20 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          <span className="bg-white/80 text-brand-dark text-xs font-bold px-3 py-1 rounded-full shadow">{quest.area}</span>
          <DifficultyBadge level={quest.difficulty} />
          <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-amber-200 shadow">
            {recommendation}
          </span>
          {quest.owned && (
            <span className="bg-emerald-500/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/40 shadow">
              OWNED
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2 text-sm">
            <Star size={16} fill="currentColor" className="text-amber-400" />
            <span className="font-bold">{hasRating ? quest.rating.toFixed(1) : '—'}</span>
            <span className="text-white/70 text-xs">({quest.reviews || 0})</span>
          </div>
          <div className="text-xs bg-white/20 px-3 py-1 rounded-full border border-white/20">
            {quest.timeWindow}
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <MapPin size={14} className="text-brand-gold" />
          <span>{quest.teaser}</span>
        </div>
        <h3 className="text-xl font-serif font-bold text-brand-dark">{quest.title}</h3>
        <p className="text-sm text-stone-600 leading-relaxed flex-1 line-clamp-3">{quest.description}</p>
        <div className="flex flex-wrap gap-2 text-xs text-stone-500">
          <span className="bg-brand-base text-brand-dark px-2.5 py-1 rounded-full border border-stone-200">距離 {quest.distanceKm.toFixed(1)} km</span>
          <span className="bg-brand-base text-brand-dark px-2.5 py-1 rounded-full border border-stone-200">所要 {Math.round(quest.durationMin / 5) * 5} 分</span>
          <span className="bg-brand-base text-brand-dark px-2.5 py-1 rounded-full border border-stone-200">推奨 {quest.mood}</span>
          {quest.owned && (
            <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full font-bold">
              購入済み
            </span>
          )}
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            {quest.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs text-brand-gold bg-brand-gold/10 border border-brand-gold/30 px-2 py-1 rounded-full">
                #{tag}
              </span>
            ))}
            <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full font-bold">
              {popularityScore ? `人気指数 ${popularityScore}` : '新着'}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(quest);
            }}
            className="flex items-center gap-2 text-sm font-bold text-brand-dark hover:text-brand-gold transition-colors"
          >
            詳細を見る <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const QuestListPage = ({
  onSelectQuest,
  onBackHome,
  activeFilter,
  setActiveFilter,
  sortKey,
  setSortKey,
  onOpenApp,
  comingSoon,
  onScrollNotify,
  ownedQuestIds,
}: {
  onSelectQuest: (quest: Quest) => void;
  onBackHome: () => void;
  activeFilter: string;
  setActiveFilter: (key: string) => void;
  sortKey: 'popular' | 'short' | 'distance';
  setSortKey: (key: 'popular' | 'short' | 'distance') => void;
  onOpenApp: () => void;
  comingSoon: boolean;
  onScrollNotify: () => void;
  ownedQuestIds?: string[];
}) => {
  const [publishedQuests, setPublishedQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPublished = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('quests')
        .select('*, profiles!quests_creator_id_fkey(username)')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const questIds = data.map((q: any) => q.id);
        let reviewRows: { quest_id: string; rating: number | null }[] = [];
        if (questIds.length) {
          const { data: reviews, error: reviewErr } = await supabase
            .from('quest_reviews')
            .select('quest_id,rating')
            .in('quest_id', questIds);
          if (!reviewErr && reviews) reviewRows = reviews as any;
        }
        const mapped = data.map((q: any) => {
          const relReviews = reviewRows.filter((r) => r.quest_id === q.id && r.rating != null) as { rating: number }[];
          const avgRating =
            relReviews.length > 0
              ? parseFloat((relReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / relReviews.length).toFixed(1))
              : 0;
          const reviewCount = relReviews.length;
          return {
            id: q.id,
            title: q.title || 'タイトル未設定',
            area: q.area_name || 'エリア未設定',
            distanceKm: q.distance_km || 2,
            durationMin: q.duration_min || 60,
            difficulty: '初級' as const,
            tags: (q.tags as string[]) || ['街歩き'],
            rating: avgRating,
            reviews: reviewCount,
            cover: q.cover_image_url || 'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80',
            description: q.description || '',
            teaser: q.area_name || '',
            startingPoint: '',
            reward: '',
            timeWindow: 'いつでも',
            mood: '街を探検',
            stops: [],
            creatorName: q.profiles?.username || 'TOMOSHIBI Creator',
            creatorId: q.creator_id,
            owned: ownedQuestIds?.includes(q.id) || false,
          };
        });
        setPublishedQuests(mapped);
      } else {
        setPublishedQuests([]);
      }
      setLoading(false);
    };
    fetchPublished();
  }, [ownedQuestIds]);

  useEffect(() => {
    if (!ownedQuestIds) return;
    setPublishedQuests((prev) =>
      prev.map((q) => ({ ...q, owned: ownedQuestIds.includes(q.id) })),
    );
  }, [ownedQuestIds]);

  const CATEGORY_FILTER_MAP: Record<string, string[]> = {
    date: ['date', 'デートに最適'],
    family: ['family', '家族で'],
    night: ['night', 'ナイトクエスト'],
    history: ['history', '歴史ロマン'],
    beginner: ['beginner', 'はじめて'],
  };

  const filtered = publishedQuests.filter((quest) => {
    if (activeFilter === 'all') return true;
    const tags = Array.isArray(quest.tags) ? quest.tags : [];
    const normalized = tags.map((t) => (typeof t === 'string' ? t.replace(/^#/, '') : '')).filter(Boolean);
    const targets = CATEGORY_FILTER_MAP[activeFilter] || [activeFilter];
    return normalized.some((t) => targets.includes(t));
  });
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'short') return a.durationMin - b.durationMin;
    if (sortKey === 'distance') return a.distanceKm - b.distanceKm;
    return b.rating - a.rating;
  });

  return (
    <section className="pt-28 pb-16 relative">
      <div className="absolute inset-0 bg-hero-glow opacity-80 pointer-events-none" />
      <div className="container mx-auto px-4 md:px-8 relative">
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-block px-3 py-1 bg-brand-gold/10 border border-brand-gold/30 rounded-full text-brand-gold text-xs font-bold tracking-widest mb-3">
                QUESTS CURATED LIKE QUESTO
              </div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-brand-dark">クエスト一覧</h1>
              <p className="text-stone-600 text-sm md:text-base">
                街歩きの世界観はそのままに、Questoのように「場所」「物語」「所要時間」で探しやすくまとめました。
              </p>
            </div>
            <div className="flex items-center gap-2 self-start">
              <button
                onClick={onBackHome}
                className="text-sm text-stone-600 hover:text-brand-dark underline underline-offset-4"
              >
                LPに戻る
              </button>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="bg-brand-dark text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-brand-gold transition-colors"
              >
                最上部へ
              </button>
            </div>
          </div>

          <QuestAppPromoBanner
            onPrimary={onOpenApp}
            comingSoon={comingSoon}
            onScrollNotify={onScrollNotify}
          />

          <div className="bg-white/80 backdrop-blur border border-stone-200/60 rounded-2xl p-4 md:p-6 shadow-lg">
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              {QUEST_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all duration-200 ${
                    activeFilter === filter.key
                      ? 'bg-brand-dark text-white border-brand-dark shadow-md'
                      : 'bg-brand-base text-brand-dark border-stone-200 hover:border-brand-gold/60'
                  }`}
                >
                  <div>{filter.label}</div>
                  <div className={`text-[11px] font-medium ${activeFilter === filter.key ? 'text-white/80' : 'text-stone-500'}`}>
                    {filter.desc}
                  </div>
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2 text-sm text-stone-600">
                <span className="text-xs uppercase tracking-widest text-stone-400">Sort</span>
                <button
                  onClick={() => setSortKey('popular')}
                  className={`px-3 py-2 rounded-full border ${sortKey === 'popular' ? 'border-brand-gold text-brand-dark' : 'border-stone-200 text-stone-500'}`}
                >
                  人気順
                </button>
                <button
                  onClick={() => setSortKey('short')}
                  className={`px-3 py-2 rounded-full border ${sortKey === 'short' ? 'border-brand-gold text-brand-dark' : 'border-stone-200 text-stone-500'}`}
                >
                  所要時間が短い
                </button>
                <button
                  onClick={() => setSortKey('distance')}
                  className={`px-3 py-2 rounded-full border ${sortKey === 'distance' ? 'border-brand-gold text-brand-dark' : 'border-stone-200 text-stone-500'}`}
                >
                  距離が短い
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sorted.map((quest) => (
            <QuestCard key={quest.id} quest={quest} onSelect={onSelectQuest} />
          ))}
        </div>
      </div>
    </section>
  );
};

const QuestDetailPage = ({
  quest,
  onBackToList,
  onBackHome,
  onOpenApp,
  comingSoon,
  onScrollNotify,
  purchased,
  onPurchase,
  purchasing,
}: {
  quest: Quest;
  onBackToList: () => void;
  onBackHome: () => void;
  onOpenApp: () => void;
  comingSoon: boolean;
  onScrollNotify: () => void;
  purchased: boolean;
  onPurchase: (questId: string) => void;
  purchasing: boolean;
}) => (
  <section className="pt-28 pb-16 relative">
    <div className="absolute inset-0 bg-hero-glow opacity-80 pointer-events-none" />
    <div className="container mx-auto px-4 md:px-8 relative">
      <div className="flex items-center gap-3 text-sm text-stone-600 mb-4">
        <button onClick={onBackHome} className="hover:text-brand-dark underline underline-offset-4">
          LPに戻る
        </button>
        <span className="text-stone-400">/</span>
        <button onClick={onBackToList} className="hover:text-brand-dark underline underline-offset-4">
          クエスト一覧
        </button>
        <span className="text-stone-400">/</span>
        <span className="text-brand-dark font-bold">{quest.title}</span>
      </div>

      <div className="bg-white/80 backdrop-blur border border-stone-200/60 rounded-3xl overflow-hidden shadow-2xl">
        <div className="relative h-[340px]">
          <img src={quest.cover} alt={quest.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/40 to-transparent" />
          <div className="absolute top-6 left-6 flex items-center gap-3 flex-wrap">
            <span className="bg-white/80 px-4 py-2 rounded-full text-sm font-bold text-brand-dark shadow">{quest.area}</span>
            <DifficultyBadge level={quest.difficulty} />
            <span className="bg-white/60 px-3 py-1 rounded-full text-xs text-brand-dark border border-white/70">
              {quest.mood}
            </span>
          </div>
          <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="text-white">
              <p className="text-sm text-white/80 mb-1">Quest File</p>
              <h1 className="text-3xl md:text-4xl font-serif font-bold">{quest.title}</h1>
              <p className="text-sm text-white/80 max-w-2xl">{quest.teaser}</p>
              {quest.creatorName && (
                <p className="text-xs text-white/70 mt-1">制作: {quest.creatorName}</p>
              )}
              {purchased && (
                <p className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-emerald-500/80 text-white text-xs font-bold border border-white/30">
                  購入済み /mobile でプレイ可能
                </p>
              )}
            </div>
            <div className="flex items-center gap-4 bg-white/10 border border-white/20 px-4 py-3 rounded-2xl backdrop-blur">
              <div className="flex items-center gap-2 text-white">
                <Star size={18} fill="currentColor" className="text-amber-400" />
                <span className="font-bold text-lg">{quest.rating.toFixed(1)}</span>
                <span className="text-white/70 text-sm">({quest.reviews} reviews)</span>
              </div>
              <div className="text-xs text-white/70">
                {quest.clearRate != null ? `解決率 ${quest.clearRate}%` : '解決率データなし'} / プレイ {quest.playCount ?? 0} 件
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-10 p-6 md:p-10">
          <div className="lg:col-span-3 grid md:grid-cols-3 gap-3 mb-2">
            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-stone-500">プレイ数</p>
              <p className="text-2xl font-serif font-bold text-brand-dark">
                {quest.playCount ?? 0}
                <span className="text-sm text-stone-500 ml-1">回</span>
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-stone-500">解決率</p>
              <p className="text-2xl font-serif font-bold text-brand-dark">
                {quest.clearRate != null ? `${quest.clearRate}%` : '—'}
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-stone-500">平均所要</p>
              <p className="text-2xl font-serif font-bold text-brand-dark">
                {quest.avgDurationMin != null ? `${quest.avgDurationMin}分` : `${Math.round(quest.durationMin / 5) * 5}分`}
              </p>
            </div>
          </div>

          <div className="lg:col-span-3">
            <QuestAppPromoBanner
              onPrimary={onOpenApp}
              comingSoon={comingSoon}
              onScrollNotify={onScrollNotify}
            />
            <p className="text-xs text-stone-500 mt-2">※ プレイ中のナビや謎解き進行はスマホアプリ版がより快適です。</p>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-brand-dark mb-2">ストーリー</h3>
              <p className="text-stone-600 leading-relaxed whitespace-pre-line">
                {quest.storyPrologue || quest.description || 'あらすじは準備中です。'}
              </p>
            </div>

            <div className="bg-brand-base/70 border border-stone-200 rounded-2xl p-6 shadow-inner">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb size={18} className="text-brand-gold" />
                <h4 className="text-brand-dark font-bold">立ち寄りポイント</h4>
              </div>
              <div className="space-y-4">
                {quest.stops && quest.stops.length > 0 ? (
                  quest.stops.map((stop, idx) => (
                    <div key={`${stop.name}-${idx}`} className="bg-white/80 border border-white/60 rounded-xl p-4 flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-brand-gold" />
                          <p className="font-bold text-brand-dark">{stop.name || `スポット ${idx + 1}`}</p>
                        </div>
                        <p className="text-stone-600 text-sm mt-1">{stop.clue || '所在地/ヒントは非公開'}</p>
                        {stop.action && (
                          <p className="text-xs text-brand-dark mt-1 font-semibold uppercase tracking-wide">
                            Action: {stop.action}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-stone-600">スポット情報は非公開です。</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-brand-dark text-white rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-amber-300 text-sm">
                <MapPin size={16} />
                <span>スタート地点</span>
              </div>
              <p className="font-serif text-xl">{quest.startingPoint}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                  <p className="text-white/60 text-xs">距離</p>
                  <p className="text-lg font-bold">{quest.distanceKm.toFixed(1)} km</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                  <p className="text-white/60 text-xs">所要時間</p>
              <p className="text-lg font-bold">{Math.round(quest.durationMin / 5) * 5} 分</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 border border-white/10">
              <p className="text-white/60 text-xs">推奨時間帯</p>
              <p className="text-sm font-bold leading-tight">{quest.timeWindow}</p>
            </div>
                <div className="bg-white/10 rounded-xl p-3 border border-white/10">
              <p className="text-white/60 text-xs">クリア報酬</p>
              <p className="text-sm font-bold leading-tight">{quest.reward}</p>
            </div>
          </div>
          <button
            className={`w-full font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 ${
              purchased ? 'bg-emerald-500 text-white hover:bg-emerald-500' : 'bg-brand-gold text-brand-dark hover:bg-white'
            }`}
            onClick={() => (purchased ? onOpenApp() : onPurchase(quest.id))}
            disabled={purchasing}
          >
            {purchasing
              ? '購入処理中...'
              : purchased
              ? '購入済み – /mobile からプレイ可能'
              : 'このクエストをテスト購入して /mobile で遊ぶ'}
            {!purchased && !purchasing && <ArrowRight size={16} />}
          </button>
          <p className="text-xs text-white/70 leading-relaxed">
            {purchased
              ? '/mobile の Cases で「購入済み」と表示され、GamePlay へ遷移できます。'
              : 'チームプレイ推奨 / ソロも可。謎解きに詰まったら段階的なヒントが使えます。'}
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-brand-dark font-bold">
            <Smartphone size={16} />
                モバイルで完結
              </div>
              <p className="text-sm text-stone-600">
                Questoのように、現地で音声・AR・文章ヒントが重なる体験を再現。チェックインすると次の謎がアンロックされます。
              </p>
              <ul className="text-sm text-stone-600 space-y-1 list-disc list-inside">
                <li>オフラインでも動作する簡易マップ</li>
                <li>タイムライン形式のステップ表示</li>
                <li>写真アップロードで解答を送信</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const AuthPage = ({
  mode,
  setMode,
  status,
  onSubmit,
  onBackHome,
  error,
}: {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  status: 'idle' | 'submitting' | 'success';
  onSubmit: (data: { email: string; password?: string; confirmPassword?: string }) => void;
  onBackHome: () => void;
  error?: string | null;
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const titleMap = {
    login: 'ログイン',
    signup: '新規登録',
    forgot: 'パスワード再設定',
  } as const;

  const descMap = {
    login: 'アカウントにアクセスして、作成したクエストやプレイ履歴を管理します。',
    signup: 'TOMOSHIBIクリエイター/プレイヤーとしての新しい旅を始めましょう。',
    forgot: '登録メールアドレス宛に再設定リンクを送信します。',
  } as const;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, password, confirmPassword });
  };

  return (
    <section className="pt-28 pb-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-glow opacity-80 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-brand-base/80" />
      <div className="container mx-auto px-4 md:px-8 relative">
        <div className="flex items-center gap-3 text-sm text-stone-600 mb-6">
          <button onClick={onBackHome} className="hover:text-brand-dark underline underline-offset-4">
            LPに戻る
          </button>
          <span className="text-stone-400">/</span>
          <span className="text-brand-dark font-bold">{titleMap[mode]}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold/10 text-brand-gold border border-brand-gold/30 rounded-full text-xs font-bold tracking-widest">
              ACCOUNT
              <Sparkles size={14} />
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-brand-dark leading-tight">
              {titleMap[mode]}
            </h1>
            <p className="text-stone-600 text-base leading-relaxed max-w-xl">{descMap[mode]}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-stone-600">
              <div className="flex items-center gap-2 bg-white/80 border border-stone-200 rounded-xl px-3 py-2 shadow-sm">
                <Shield size={16} className="text-brand-gold" />
                <span>認証は安全に暗号化</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 border border-stone-200 rounded-xl px-3 py-2 shadow-sm">
                <Mail size={16} className="text-brand-gold" />
                <span>通知・リマインドを受け取る</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 border border-stone-200 rounded-xl px-3 py-2 shadow-sm">
                <Target size={16} className="text-brand-gold" />
                <span>クエスト進行と実績を保存</span>
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur border border-white/80 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="flex gap-2 text-sm">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 rounded-full border font-bold ${mode === 'login' ? 'bg-brand-dark text-white border-brand-dark' : 'bg-brand-base text-brand-dark border-stone-200'}`}
              >
                ログイン
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 rounded-full border font-bold ${mode === 'signup' ? 'bg-brand-dark text-white border-brand-dark' : 'bg-brand-base text-brand-dark border-stone-200'}`}
              >
                新規登録
              </button>
              <button
                onClick={() => setMode('forgot')}
                className={`flex-1 py-2 rounded-full border font-bold ${mode === 'forgot' ? 'bg-brand-dark text-white border-brand-dark' : 'bg-brand-base text-brand-dark border-stone-200'}`}
              >
                パスワード再設定
              </button>
            </div>

            {status === 'success' ? (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <CheckCircle size={18} />
                <span>
                  {mode === 'forgot'
                    ? '再設定リンクをメールで送信しました。ご確認ください。'
                    : '認証が成功しました。ダッシュボードへリダイレクトします。'}
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-brand-dark">メールアドレス</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                  />
                </div>
                {mode !== 'forgot' && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-brand-dark">パスワード</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                    />
                  </div>
                )}
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-brand-dark">パスワード確認</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full bg-brand-dark text-white py-3 rounded-full font-bold hover:bg-brand-gold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {status === 'submitting' ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : titleMap[mode]}
                </button>
              </form>
            )}

            {mode !== 'login' && (
              <button onClick={() => setMode('login')} className="text-sm text-brand-gold font-bold underline">
                ログインに戻る
              </button>
            )}
            {mode === 'login' && (
              <div className="flex items-center justify-between text-sm text-stone-600">
                <button onClick={() => setMode('forgot')} className="underline hover:text-brand-dark">
                  パスワードをお忘れですか？
                </button>
                <button onClick={() => setMode('signup')} className="underline hover:text-brand-dark">
                  新規登録する
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const CreatorPage = ({ onBackHome, onGoAuth, onOpenOnboarding }: { onBackHome: () => void; onGoAuth: (mode: AuthMode) => void; onOpenOnboarding: () => void }) => (
  <section className="pt-28 pb-16 relative overflow-hidden">
    <div className="absolute inset-0 bg-hero-glow opacity-80 pointer-events-none" />
    <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-brand-base/80" />
    <div className="container mx-auto px-4 md:px-8 relative">
      <div className="flex items-center gap-3 text-sm text-stone-600 mb-6">
        <button onClick={onBackHome} className="hover:text-brand-dark underline underline-offset-4">
          LPに戻る
        </button>
        <span className="text-stone-400">/</span>
        <span className="text-brand-dark font-bold">クリエイター募集</span>
      </div>

      {/* Hero */}
      <div className="grid lg:grid-cols-2 gap-10 items-center mb-16">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold/10 text-brand-gold border border-brand-gold/30 rounded-full text-xs font-bold tracking-widest">
            FOR CREATORS
            <Sparkles size={14} />
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-brand-dark leading-tight">
            街全体を、<br />
            あなたの物語のキャンバスに。
          </h1>
          <p className="text-stone-600 text-base md:text-lg leading-relaxed max-w-xl">
            プログラミング不要。あなたのアイデアが、現実世界のゲームになります。<br />
            Questoのようなスムーズな制作体験で、街歩きと物語を組み合わせたクエストを公開しましょう。
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onOpenOnboarding}
              className="border border-stone-300 text-brand-dark px-6 py-3 rounded-full font-bold text-sm hover:border-brand-gold hover:text-brand-gold transition-colors"
            >
              新規クエストを作成
            </button>
            <button
              onClick={onBackHome}
              className="border border-stone-300 text-brand-dark px-6 py-3 rounded-full font-bold text-sm hover:border-brand-gold hover:text-brand-gold transition-colors"
            >
              LPをもう一度見る
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-stone-600">
            <div className="flex items-center gap-2 bg-white/80 border border-stone-200 rounded-xl px-3 py-2 shadow-sm">
              <Coins size={16} className="text-brand-gold" />
              <span>最大70%レベニューシェア</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 border border-stone-200 rounded-xl px-3 py-2 shadow-sm">
              <Target size={16} className="text-brand-gold" />
              <span>腕試しの場</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 border border-stone-200 rounded-xl px-3 py-2 shadow-sm">
              <Globe2 size={16} className="text-brand-gold" />
              <span>地域貢献の喜び</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-brand-gold/20 rounded-full blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-brand-dark/10 rounded-full blur-3xl" />
          <div className="relative overflow-hidden rounded-[2.5rem] border-4 border-white shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1522199755839-a2bacb67c546?auto=format&fit=crop&w=1400&q=80" 
              alt="クリエイターがクエストを設計している様子" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-dark/50 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 bg-white/85 backdrop-blur rounded-2xl border border-white/70 p-4 shadow-lg max-w-[240px]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-brand-gold" />
                <span className="text-xs font-bold text-brand-dark">Quest Draft</span>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">
                マップにピンを置き、手がかりを追加。ソーシャルアクションも任意でチェックするだけ。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Merits */}
      <div className="mb-14">
        <SectionHeading subtitle="TOMOSHIBIで創作する、3つの理由。">
          Why Create with TOMOSHIBI?
        </SectionHeading>
        <div className="grid md:grid-cols-3 gap-6">
          {CREATOR_MERITS.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white/80 backdrop-blur border border-white/70 rounded-2xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-brand-base flex items-center justify-center border border-stone-200">
                  <item.icon className="text-brand-gold" size={24} />
                </div>
                <span className="text-xs uppercase tracking-widest text-brand-gold font-bold">{item.badge}</span>
              </div>
              <h3 className="text-xl font-serif font-bold text-brand-dark mb-2">{item.title}</h3>
              <p className="text-stone-600 text-sm leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="mb-14">
        <SectionHeading subtitle="機能美にこだわった制作体験。エンタメが主役で、社会課題要素はあくまで“足すだけ”のオプションです。">
          制作を支えるツール
        </SectionHeading>
        <div className="grid md:grid-cols-3 gap-6">
          {CREATOR_FEATURES.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`rounded-2xl p-6 shadow-lg border ${feature.highlight ? 'bg-brand-gold/10 border-brand-gold/30' : 'bg-white/80 backdrop-blur border-white/70'}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-brand-base flex items-center justify-center border border-stone-200">
                  <feature.icon className="text-brand-gold" size={24} />
                </div>
                {feature.highlight && (
                  <span className="text-[11px] font-bold text-brand-dark bg-white/80 border border-brand-gold/40 rounded-full px-3 py-1">
                    {feature.highlight}
                  </span>
                )}
              </div>
              <h4 className="text-lg font-bold text-brand-dark mb-2">{feature.title}</h4>
              <p className="text-stone-600 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mb-16">
        <SectionHeading subtitle="4ステップで公開まで。途中でテストプレイも可能です。">
          How it Works
        </SectionHeading>
        <div className="max-w-4xl mx-auto space-y-6">
          {CREATOR_STEPS.map((step, idx) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white/80 border border-white/70 rounded-2xl p-6 shadow-md flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center font-bold">{step.step}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="text-lg font-bold text-brand-dark">{step.title}</h5>
                  {step.title.includes('Option') && (
                    <span className="text-[11px] bg-brand-gold/20 text-brand-dark font-bold px-2 py-1 rounded-full border border-brand-gold/40">
                      任意
                    </span>
                  )}
                </div>
                <p className="text-stone-600 text-sm leading-relaxed mt-1">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Revenue Share */}
      <div className="mb-16">
        <SectionHeading subtitle="クエスト参加ユーザー収益のうち最大70%をクリエイターへ分配。遊ばれた分だけリターンが増えるシンプルなモデルです。">
          Revenue Share
        </SectionHeading>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-brand-gold/15 border border-brand-gold/30 rounded-2xl p-6 shadow-lg">
            <p className="text-sm text-brand-dark/80 font-bold uppercase tracking-widest mb-2">Up to</p>
            <p className="text-4xl md:text-5xl font-serif font-bold text-brand-dark mb-3">70%</p>
            <p className="text-sm text-brand-dark leading-relaxed">
              参加ユーザー収益の最大70%を分配。ボリュームが増えるほど報酬が伸びる仕組みです。
            </p>
          </div>
          <div className="bg-white/85 backdrop-blur border border-white/70 rounded-2xl p-6 shadow-lg">
            <h4 className="text-lg font-bold text-brand-dark mb-2">成果連動で公正</h4>
            <p className="text-sm text-stone-600 leading-relaxed">
              固定費を最小化し、プレイ数・解答率などのファクトに基づいて収益が決まる透明なモデル。プログラミング不要で制作に集中できます。
            </p>
          </div>
          <div className="bg-white/85 backdrop-blur border border-white/70 rounded-2xl p-6 shadow-lg">
            <h4 className="text-lg font-bold text-brand-dark mb-2">ダッシュボードで可視化</h4>
            <p className="text-sm text-stone-600 leading-relaxed">
              プレイ数、解答率、ルート離脱ポイントを可視化。改善すると、次月以降の分配にそのまま跳ね返ります。
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
        <div className="bg-brand-dark text-white rounded-3xl p-10 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl border border-brand-dark/60">
          <div>
            <p className="text-sm uppercase tracking-widest text-white/70 mb-2">Join as Creator</p>
            <h3 className="text-2xl md:text-3xl font-serif font-bold mb-2">
              街に灯をともす制作を始めましょう。
            </h3>
            <p className="text-white/80 text-sm md:text-base leading-relaxed">
              作品の公開、収益管理（参加ユーザー収益の最大70%を分配）、ソーシャルアクションの設定までワンストップ。あなたの世界観を、街で動くコンテンツにしましょう。
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={onBackHome}
            className="border border-white/40 text-white px-6 py-3 rounded-full font-bold hover:bg-white/10 transition-colors"
          >
            LPに戻る
          </button>
        </div>
      </div>
    </div>
  </section>
);

function CreatorTestRunPage({
  onLogoHome,
  onBack,
  onComplete,
  questTitle,
  questDescription,
  questLocation,
  questLatLng,
  routeSpots,
  storySettings,
  questId,
  userId,
  userEmail,
  questCategoryTags,
  setQuestCategoryTags,
  questHashtags,
  setQuestHashtags,
}: {
  onLogoHome: () => void;
  onBack: () => void;
  onComplete: () => void;
  questTitle: string;
  questDescription: string;
  questLocation: string;
  questLatLng: { lat: number; lng: number } | null;
  routeSpots: RouteSpot[];
  storySettings: {
    castName: string;
    castTone: string;
    castIcon: string;
    prologueTitle: string;
    prologueBody: string;
    prologueImage: string;
    epilogueBody: string;
    socialMessage: string;
    epilogueImage: string;
    characters: CastCharacter[];
    scenario: ScenarioBlock[];
  };
  questId: string | null;
  userId: string | null;
  userEmail: string | null;
  questCategoryTags: string[];
  setQuestCategoryTags: (tags: string[]) => void;
  questHashtags: string[];
  setQuestHashtags: (tags: string[]) => void;
}) {
  const [reviewChecks, setReviewChecks] = useState({
    core: false,
    route: false,
    story: false,
  });
  const [questionText, setQuestionText] = useState('');
  const [contactChecked, setContactChecked] = useState(false);
  const allChecked = Object.values(reviewChecks).every(Boolean) && contactChecked;
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const categoryOptions = [
    { value: 'デートに最適', desc: '2人でわいわい' },
    { value: '家族で', desc: 'お子様もOK' },
    { value: 'ナイトクエスト', desc: '夜景と謎解き' },
    { value: '歴史ロマン', desc: '街の物語' },
    { value: 'はじめて', desc: '難易度ひかえめ' },
  ];
  const [tagInput, setTagInput] = useState('');
  const [tagSaveStatus, setTagSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [tagError, setTagError] = useState<string | null>(null);

  const handleSendInquiry = async () => {
    if (!questionText.trim() || sendStatus === 'sending') return;
    setSendStatus('sending');
    try {
      const { data: admins, error } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (error) throw error;
      const adminIds = (admins || []).map((a: any) => a.id).filter(Boolean);
      if (adminIds.length === 0) throw new Error('管理者が見つかりませんでした');
      const title = `クリエイター問い合わせ: ${questTitle || '無題クエスト'}`;
      const message = `${questionText.trim()}\n\nfrom: ${userEmail || userId || '不明ユーザー'}\nquest: ${
        questTitle || '不明'
      }${questId ? ` (${questId})` : ''}`;
      const payload = adminIds.map((id: string) => ({ user_id: id, title, message, type: 'creator_question' }));
      await supabase.from('notifications').insert(payload);
      setSendStatus('success');
      setContactChecked(true);
    } catch (e) {
      setSendStatus('error');
    }
  };

  const toggleCategory = (value: string) => {
    setQuestCategoryTags((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const addHashtag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    const normalized = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (questHashtags.includes(normalized)) {
      setTagInput('');
      return;
    }
    setQuestHashtags([...questHashtags, normalized]);
    setTagInput('');
  };

  const removeHashtag = (tag: string) => {
    setQuestHashtags(questHashtags.filter((t) => t !== tag));
  };

  const handleSaveTags = async () => {
    if (!questId) {
      setTagError('クエストIDがありません。Step1を保存してください。');
      return false;
    }
    setTagSaveStatus('saving');
    setTagError(null);
    const tags = [...questCategoryTags, ...questHashtags];
    try {
      await supabase
        .from('quests')
        .update({
          tags,
          category_tags: questCategoryTags,
          hashtag_tags: questHashtags,
        })
        .eq('id', questId);
      setTagSaveStatus('idle');
      return true;
    } catch (e: any) {
      setTagSaveStatus('error');
      setTagError(e?.message || 'タグの保存に失敗しました');
      return false;
    }
  };

  const handleFinishStep = async () => {
    const ok = await handleSaveTags();
    if (!ok) return;
    onComplete();
  };

  const spotCompletion = routeSpots.map((spot, idx) => {
    const hasStory = (spot.details?.storyText || '').trim().length > 0;
    const hasChallenge = (spot.details?.challengeText || '').trim().length > 0;
    const hasAnswer =
      spot.details?.answerType === 'choice'
        ? (spot.details?.choiceOptions || []).length > 0
        : (spot.details?.answerText || '').trim().length > 0;
    const isComplete = hasStory && hasChallenge && hasAnswer;
    return {
      idx,
      spot,
      isComplete,
      missing: [
        !hasStory ? 'ストーリー' : null,
        !hasChallenge ? '問題文' : null,
        !hasAnswer ? '回答設定' : null,
      ].filter(Boolean),
    };
  });

  const scenarioCount = storySettings.scenario.length;

  return (
    <section className="min-h-screen bg-white">
      <div className="border-b border-stone-200 bg-white">
        <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-6">
          <button onClick={onLogoHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TomoshibiLogo className="h-8 w-auto" />
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-10 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-sm text-brand-dark font-bold hover:underline flex items-center gap-2">
            &lt; Workspace
          </button>
          <div className="text-xs text-stone-500 font-bold">Step 4 / 5</div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-brand-gold font-bold">Final Review</p>
              <h1 className="text-3xl font-serif font-bold text-brand-dark mt-2">最終確認</h1>
              <p className="text-sm text-stone-700 mt-3 leading-relaxed">
                ここでは現地に行かずに、Step1〜3で作成した内容をまとめて確認できます。公開カード用のカテゴリ/ハッシュタグ設定と、運営への問い合わせを済ませた上で「確認済み」にチェックし、ステップを完了してください。
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                <Info size={18} className="text-brand-gold" />
                制作内容サマリー
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-stone-200 p-4 bg-brand-base/60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-stone-500 font-bold">Step1</div>
                    <label className="flex items-center gap-2 text-xs text-stone-600">
                      <input
                        type="checkbox"
                        checked={reviewChecks.core}
                        onChange={() => setReviewChecks((p) => ({ ...p, core: !p.core }))}
                        className="rounded border-stone-300 text-brand-dark"
                      />
                      確認済み
                    </label>
                  </div>
                  <p className="text-sm font-bold text-brand-dark">{questTitle || 'タイトル未設定'}</p>
                  <p className="text-xs text-stone-600 line-clamp-2 mt-1">{questDescription || '説明未入力'}</p>
                  <div className="text-xs text-stone-600 mt-2">
                    <div>エリア: {questLocation || '未設定'}</div>
                    {questLatLng && (
                      <div>
                        座標: {questLatLng.lat.toFixed(4)}, {questLatLng.lng.toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 p-4 bg-brand-base/60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-stone-500 font-bold">Step2</div>
                    <label className="flex items-center gap-2 text-xs text-stone-600">
                      <input
                        type="checkbox"
                        checked={reviewChecks.route}
                        onChange={() => setReviewChecks((p) => ({ ...p, route: !p.route }))}
                        className="rounded border-stone-300 text-brand-dark"
                      />
                      確認済み
                    </label>
                  </div>
                  {routeSpots.length === 0 ? (
                    <p className="text-sm text-stone-500">スポット未登録（Step2で追加してください）</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {spotCompletion.map(({ spot, idx, isComplete, missing }) => (
                        <div key={spot.id} className="flex items-start gap-2 text-sm">
                          <div className="w-6 h-6 rounded-full bg-brand-dark text-white flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-brand-dark">{spot.name || `Spot ${idx + 1}`}</p>
                              <span
                                className={`text-[11px] px-2 py-1 rounded-full border ${
                                  isComplete
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {isComplete ? 'OK' : `未完: ${missing.join('・')}`}
                              </span>
                            </div>
                            <p className="text-xs text-stone-500">{spot.address || '住所未設定'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-stone-200 p-4 bg-brand-base/60 md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-stone-500 font-bold">Step3</div>
                    <label className="flex items-center gap-2 text-xs text-stone-600">
                      <input
                        type="checkbox"
                        checked={reviewChecks.story}
                        onChange={() => setReviewChecks((p) => ({ ...p, story: !p.story }))}
                        className="rounded border-stone-300 text-brand-dark"
                      />
                      確認済み
                    </label>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3 text-sm text-stone-700">
                    <div>
                      <p className="text-xs text-stone-500">案内人</p>
                      <p className="font-bold text-brand-dark">{storySettings.castName || '未設定'}</p>
                      <p className="text-xs text-stone-500">{storySettings.castTone || 'トーン未設定'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">登場人物</p>
                      <p className="font-bold text-brand-dark">{storySettings.characters.length} 名</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">シナリオフロー</p>
                      <p className="font-bold text-brand-dark">{scenarioCount} ブロック</p>
                    </div>
                  </div>
                  <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm text-stone-700">
                    <div className="rounded-xl border border-stone-200 bg-white p-3">
                      <p className="text-xs text-stone-500 mb-1">プロローグ</p>
                      <p className="font-bold text-brand-dark">{storySettings.prologueTitle || 'タイトル未設定'}</p>
                      <p className="text-xs text-stone-600 line-clamp-2">
                        {(storySettings.prologueBody || '本文未入力').replace(/\s+/g, ' ').trim()}
                      </p>
                    </div>
                    <div className="rounded-xl border border-stone-200 bg-white p-3">
                      <p className="text-xs text-stone-500 mb-1">エピローグ</p>
                      <p className="text-xs text-stone-600 line-clamp-3">
                        {(storySettings.epilogueBody || '未入力').replace(/\s+/g, ' ').trim()}
                      </p>
                      {storySettings.socialMessage && (
                        <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 mt-2">
                          ソーシャル: {storySettings.socialMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                <Tag size={18} className="text-brand-gold" />
                カード用カテゴリ & ハッシュタグ
              </h3>
              <p className="text-sm text-stone-600">公開カードに表示するカテゴリをクリックで選択し、自由入力の #タグ も追加できます。</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryOptions.map((c) => {
                  const active = questCategoryTags.includes(c.value);
                  return (
                    <button
                      key={c.value}
                      onClick={() => toggleCategory(c.value)}
                      className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${
                        active ? 'border-brand-dark bg-brand-dark text-white' : 'border-stone-200 bg-brand-base hover:border-brand-gold'
                      }`}
                    >
                      <p className="text-sm font-bold">{c.value}</p>
                      <p className={`text-xs ${active ? 'text-white/80' : 'text-stone-500'}`}>{c.desc}</p>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="#デートプラン など"
                    className="flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                  />
                  <button
                    onClick={addHashtag}
                    className="px-4 py-3 rounded-full bg-brand-dark text-white text-sm font-bold hover:bg-brand-gold transition-colors shadow"
                  >
                    #を追加
                  </button>
                  <button
                    onClick={handleSaveTags}
                    disabled={tagSaveStatus === 'saving'}
                    className="px-4 py-3 rounded-full border border-stone-300 text-sm font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold transition-colors shadow-sm"
                  >
                    {tagSaveStatus === 'saving' ? '保存中...' : 'タグを保存'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[...questCategoryTags, ...questHashtags].length === 0 && (
                    <span className="text-xs text-stone-500">まだタグがありません</span>
                  )}
                  {questCategoryTags.map((t) => (
                    <span key={t} className="text-xs bg-brand-dark text-white px-3 py-1 rounded-full border border-brand-dark">
                      #{t}
                    </span>
                  ))}
                  {questHashtags.map((t) => (
                    <button
                      key={t}
                      onClick={() => removeHashtag(t)}
                      className="text-xs bg-amber-50 text-amber-800 px-3 py-1 rounded-full border border-amber-200 hover:border-amber-400 transition-colors"
                    >
                      {t} ×
                    </button>
                  ))}
                </div>
                {tagError && <p className="text-xs text-rose-600">{tagError}</p>}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                <Smartphone size={18} className="text-brand-gold" />
                チェックリスト
              </h3>
              <ul className="space-y-3 text-sm text-stone-700">
                <li className="flex items-start gap-2"><CheckSquare size={16} className="text-emerald-600 mt-0.5" /> 移動ルートに迷わないか？</li>
                <li className="flex items-start gap-2"><CheckSquare size={16} className="text-emerald-600 mt-0.5" /> 各スポット間は500m以内か？</li>
                <li className="flex items-start gap-2"><CheckSquare size={16} className="text-emerald-600 mt-0.5" /> 物語のトーンが一貫しているか？</li>
                <li className="flex items-start gap-2"><CheckSquare size={16} className="text-emerald-600 mt-0.5" /> 正解入力やヒントの導線は分かりやすいか？</li>
              </ul>
            </div>

            <div className="bg-brand-base rounded-3xl border border-dashed border-stone-300 p-6 shadow-inner">
              <p className="text-sm text-stone-700 mb-3">運営への確認・質問（任意）</p>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="気づいたことや質問をメモしてください。送信すると管理者に通知されます。"
                className="w-full h-28 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
              />
              <div className="mt-3 flex flex-wrap gap-3 items-center">
                <button
                  onClick={handleSendInquiry}
                  disabled={!questionText.trim() || sendStatus === 'sending'}
                  className={`px-4 py-2 rounded-full text-sm font-bold border shadow-sm flex items-center gap-2 ${
                    questionText.trim() && sendStatus !== 'sending'
                      ? 'bg-brand-dark text-white border-brand-dark hover:bg-brand-gold'
                      : 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                  }`}
                >
                  <Send size={16} />
                  {sendStatus === 'sending' ? '送信中...' : '問い合わせを送信'}
                </button>
                {sendStatus === 'success' && <span className="text-xs text-emerald-700">管理者へ送信しました</span>}
                {sendStatus === 'error' && <span className="text-xs text-rose-600">送信に失敗しました。時間を置いて再試行してください。</span>}
              </div>
              <label className="mt-3 inline-flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={contactChecked}
                  onChange={() => setContactChecked((v) => !v)}
                  className="rounded border-stone-300 text-brand-dark"
                />
                質問はありません／問い合わせ済みです（チェック必須）
              </label>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleFinishStep}
                  disabled={!allChecked}
                  className={`px-5 py-3 rounded-full text-sm font-bold transition-colors shadow-lg ${
                    allChecked
                      ? 'bg-brand-dark text-white hover:bg-brand-gold'
                      : 'bg-stone-200 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  確認済みとしてステップを完了する
                </button>
                <button
                  onClick={onBack}
                  className="px-5 py-3 rounded-full border border-stone-300 text-brand-dark text-sm font-bold hover:border-brand-gold hover:text-brand-gold transition-colors shadow-sm"
                >
                  ワークスペースへ戻る
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4 h-fit">
            <h4 className="text-sm font-bold text-brand-dark uppercase tracking-widest">Next</h4>
            <p className="text-lg font-serif font-bold text-brand-dark">Publish (Step 5)</p>
            <p className="text-sm text-stone-700">
              テストが完了したら、公開申請へ進めます。提出前に気になる箇所があれば、Step 1〜3に戻って微調整してください。確認チェックがすべて完了すると「ステップを完了」が有効になります。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CreatorSubmittedPage({
  onLogoHome,
  onBackHome,
}: {
  onLogoHome: () => void;
  onBackHome: () => void;
}) {
  return (
    <section className="min-h-screen bg-white flex flex-col">
      <div className="border-b border-stone-200 bg-white">
        <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-6">
          <button onClick={onLogoHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TomoshibiLogo className="h-8 w-auto" />
          </button>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 md:px-10 py-12 max-w-3xl">
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 space-y-4 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center">
            <Send className="text-brand-gold" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-brand-dark">申請を受け付けました</h1>
          <p className="text-sm text-stone-700 leading-relaxed">
            運営チームが審査を行い、承認され次第「公開」されます。結果はダッシュボードに反映されますので、しばらくお待ちください。
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={onBackHome}
              className="px-5 py-3 rounded-full bg-brand-dark text-white text-sm font-bold hover:bg-brand-gold transition-colors shadow-lg"
            >
              ワークスペースへ戻る
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminDashboardPage({
  pending,
  onReview,
}: {
  pending: any[];
  onReview: (id: string) => void;
}) {
  return (
    <section className="min-h-screen bg-white pt-28 pb-12">
      <div className="container mx-auto px-4 md:px-10">
        <h1 className="text-3xl font-serif font-bold text-brand-dark mb-2">審査ダッシュボード</h1>
        <p className="text-sm text-stone-600 mb-6">pending_review のクエストを一覧表示します。</p>
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-4 text-xs font-bold text-stone-500 px-4 py-3 bg-brand-base">
            <div>申請日</div>
            <div>クエスト名</div>
            <div>クリエイター</div>
            <div className="text-right">アクション</div>
          </div>
          {pending.length === 0 && (
            <div className="px-4 py-6 text-sm text-stone-500">申請中のクエストはありません。</div>
          )}
          {pending.map((q) => (
            <div key={q.id} className="grid grid-cols-4 items-center px-4 py-3 border-t border-stone-100 text-sm">
              <div className="text-stone-600">{new Date(q.created_at).toLocaleString()}</div>
              <div className="font-bold text-brand-dark">{q.title || 'タイトル未設定'}</div>
              <div className="text-stone-700">{q.profiles?.username || 'クリエイター'}</div>
              <div className="text-right">
                <button
                  onClick={() => onReview(q.id)}
                  className="px-3 py-2 rounded-full bg-brand-dark text-white text-xs font-bold hover:bg-brand-gold"
                >
                  審査する
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdminReviewPage({
  questBundle,
  onBack,
  onApprove,
  onReject,
  loading,
}: {
  questBundle: { quest: any; spots: any[]; story: any } | null;
  onBack: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  if (!questBundle) {
    return (
      <section className="min-h-screen bg-white flex items-center justify-center text-stone-500">読み込み中...</section>
    );
  }
  const { quest, spots, story } = questBundle;
  return (
    <section className="min-h-screen bg-white pt-28 pb-12">
      <div className="container mx-auto px-4 md:px-10 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-brand-gold font-bold">Review</p>
              <h1 className="text-3xl font-serif font-bold text-brand-dark">{quest.title || 'タイトル未設定'}</h1>
              <p className="text-sm text-stone-600">申請者: {quest.profiles?.username || 'クリエイター'}</p>
            </div>
            <div className="flex gap-3">
              <button
              onClick={onApprove}
              disabled={loading}
              className="px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60"
            >
              承認する
            </button>
            <button
              onClick={() => onReject(reason)}
              disabled={loading}
              className="px-4 py-2 rounded-full bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 disabled:opacity-60"
            >
              差し戻し
            </button>
            </div>
          </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-lg font-bold text-brand-dark mb-2">基本情報</h3>
              <p className="text-sm text-stone-700">エリア: {quest.area_name || '未設定'}</p>
              <p className="text-sm text-stone-700 whitespace-pre-line mt-2">{quest.description || '---'}</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-lg font-bold text-brand-dark mb-2">ルート/スポット</h3>
              <div className="space-y-3">
                {spots && spots.length > 0 ? (
                  spots.map((s, idx) => (
                    <div key={s.id} className="flex items-start gap-3 border border-stone-200 rounded-xl p-3">
                      <div className="w-8 h-8 rounded-full bg-brand-dark text-white flex items-center justify-center text-sm font-bold">{idx + 1}</div>
                      <div>
                        <p className="font-bold text-brand-dark">{s.name}</p>
                        <p className="text-xs text-stone-600">{s.address}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-stone-600">スポットなし</p>
                )}
              </div>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-lg font-bold text-brand-dark mb-2">ストーリー</h3>
              <p className="text-sm text-stone-700 whitespace-pre-line">{story?.prologue || 'プロローグ未設定'}</p>
              <div className="mt-3 space-y-2 text-sm text-stone-700">
                {(story?.timeline_data as any[] | undefined)?.map((b, idx) => (
                  <div key={idx} className="border border-stone-200 rounded-lg px-3 py-2">
                    <span className="text-xs text-stone-500">{b.type}</span>
                    <div className="text-brand-dark">{b.content || b.text || b.name || ''}</div>
                  </div>
                )) || null}
              </div>
              <p className="text-sm text-stone-700 mt-3 whitespace-pre-line">{story?.epilogue || ''}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-brand-dark mb-2">差し戻し理由（任意）</h4>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                placeholder="修正依頼があれば記載してください"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Main App Component ---

export default function App() {
  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const initialActivePage: 'home' | 'quests' | 'quest-detail' | 'creators' | 'auth' | 'profile' | 'creator-start' | 'creator-mystery-setup' | 'creator-workspace' | 'creator-route-spots' | 'creator-spot-detail' | 'creator-storytelling' | 'creator-test-run' | 'creator-submitted' | 'creator-analytics' | 'admin-dashboard' | 'admin-review' | 'player' =
    initialPath === '/play'
      ? 'player'
      : initialPath === '/creator' || initialPath === '/creator/workspace'
      ? 'creator-workspace'
      : initialPath === '/creator/analytics' || initialPath.startsWith('/creator/analytics/')
      ? 'creator-analytics'
      : initialPath === '/creator/route-spots'
      ? 'creator-route-spots'
      : initialPath.startsWith('/creator/route-spots/')
      ? 'creator-spot-detail'
      : initialPath === '/creator/storytelling'
      ? 'creator-storytelling'
      : initialPath === '/creator/test-run'
      ? 'creator-test-run'
      : initialPath === '/creator/submitted'
      ? 'creator-submitted'
      : initialPath === '/admin' || initialPath === '/admin/dashboard'
      ? 'admin-dashboard'
      : initialPath.startsWith('/admin/review/')
      ? 'admin-review'
      : 'home';

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [activePage, setActivePage] = useState<'home' | 'quests' | 'quest-detail' | 'creators' | 'auth' | 'profile' | 'creator-start' | 'creator-mystery-setup' | 'creator-workspace' | 'creator-route-spots' | 'creator-spot-detail' | 'creator-storytelling' | 'creator-test-run' | 'creator-submitted' | 'creator-analytics' | 'admin-dashboard' | 'admin-review' | 'player'>(initialActivePage);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'popular' | 'short' | 'distance'>('popular');
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [pendingQuests, setPendingQuests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [reviewQuest, setReviewQuest] = useState<any | null>(null);
  const [reviewQuestId, setReviewQuestId] = useState<string | null>(null);
  const [reviewActionLoading, setReviewActionLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authStatus, setAuthStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [authError, setAuthError] = useState<string | null>(null);
  const { user, profile, loading, signIn, signUp, resetPassword, signOut } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showCreatorOnboarding, setShowCreatorOnboarding] = useState(false);
  const [creatorOnboardingStep, setCreatorOnboardingStep] = useState(0);
  const [selectedQuestType, setSelectedQuestType] = useState<'mystery' | 'social'>('mystery');
  const [questLocation, setQuestLocation] = useState('');
  const [questTitle, setQuestTitle] = useState('');
  const [questDescription, setQuestDescription] = useState('');
  const CATEGORY_TAGS = ['デートに最適', '家族で', 'ナイトクエスト', '歴史ロマン', 'はじめて'];
  const [questCategoryTags, setQuestCategoryTags] = useState<string[]>([]);
  const [questHashtags, setQuestHashtags] = useState<string[]>([]);
  const [activeWorkspaceStep, setActiveWorkspaceStep] = useState(1);
  const [routeSpots, setRouteSpots] = useState<RouteSpot[]>([]);
  const [activeSpotId, setActiveSpotId] = useState<string | null>(null);
  const [questLatLng, setQuestLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [questId, setQuestId] = useState<string | null>(null);

  const [profileQuests, setProfileQuests] = useState<any[]>([]);
  const [ownedQuestIds, setOwnedQuestIds] = useState<string[]>([]);
  const [creatorAnalytics, setCreatorAnalytics] = useState<
    {
      questId: string;
      title: string;
      playCount: number;
      uniquePlayers: number;
      clearCount: number;
      clearRate: number;
      avgDurationMin: number | null;
      avgHints: number | null;
      avgWrongs: number | null;
      avgRating: number | null;
      reviewCount: number;
    }[]
  >([]);
  const [creatorSessions, setCreatorSessions] = useState<any[]>([]);
  const [creatorAnalyticsFilter, setCreatorAnalyticsFilter] = useState<'all' | '30d' | '7d'>('all');
  const [detailQuestId, setDetailQuestId] = useState<string | null>(null);
  const [detailQuestAnalytics, setDetailQuestAnalytics] = useState<{
    questId: string;
    title: string;
    summary: {
      playCount: number;
      clearRate: number;
      avgDurationMin: number | null;
      avgHints: number | null;
      avgWrongs: number | null;
    };
    steps: {
      step: number;
      name: string;
      reached: number;
      completed: number;
      dropRate: number;
      avgHints: number | null;
      avgWrongs: number | null;
    }[];
    reviews: {
      avgRating: number | null;
      count: number;
      distribution: { score: number; count: number }[];
      latest: { rating: number; comment: string | null; created_at: string }[];
    };
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // クリエイター向け簡易分析を取得
  const fetchCreatorAnalytics = useCallback(
    async (creatorId?: string) => {
      const targetId = creatorId || user?.id;
      if (!targetId) {
        setCreatorAnalytics([]);
        return;
      }
      try {
        const { data: quests, error: qErr } = await supabase
          .from('quests')
          .select('id,title')
          .eq('creator_id', targetId);
        if (qErr || !quests?.length) {
          setCreatorAnalytics([]);
          setCreatorSessions([]);
          return;
        }
        const questIds = quests.map((q) => q.id);
        const { data: sessions, error: sErr } = await supabase
          .from('play_sessions')
          .select('quest_id,user_id,ended_at,started_at,duration_sec,hints_used,wrong_answers,solved_spots')
          .in('quest_id', questIds);
        const { data: reviews, error: rErr } = await supabase
          .from('quest_reviews')
          .select('quest_id,rating,created_at');
        if (sErr) {
          setCreatorAnalytics([]);
          setCreatorSessions([]);
          return;
        }
        if (rErr) {
          // reviews がなくても致命的ではない
          console.warn('reviews fetch failed (quest_reviews 無い可能性)', rErr);
        }
        setCreatorSessions(sessions || []);
        const filterThreshold = (days: number) => {
          const now = Date.now();
          const diffMs = days * 24 * 60 * 60 * 1000;
          return (sessions || []).filter((s: any) => {
            const ts = s.ended_at ? Date.parse(s.ended_at as string) : s.started_at ? Date.parse(s.started_at as string) : null;
            return ts ? now - ts <= diffMs : true;
          });
        };
        const pickSessions =
          creatorAnalyticsFilter === 'all'
            ? sessions || []
            : creatorAnalyticsFilter === '30d'
            ? filterThreshold(30)
            : filterThreshold(7);
        const reviewFilter = (reviews || []).filter((r: any) => questIds.includes(r.quest_id));
        const pickReviews =
          creatorAnalyticsFilter === 'all'
            ? reviewFilter
            : reviewFilter.filter((r: any) => {
                const ts = r.created_at ? Date.parse(r.created_at as string) : null;
                if (!ts) return false;
                const now = Date.now();
                const diffMs =
                  creatorAnalyticsFilter === '30d'
                    ? 30 * 24 * 60 * 60 * 1000
                    : 7 * 24 * 60 * 60 * 1000;
                return now - ts <= diffMs;
              });

        const analytics = questIds.map((id) => {
          const title = quests.find((q) => q.id === id)?.title || 'タイトル未設定';
          const rel = (pickSessions || []).filter((s: any) => s.quest_id === id);
          const relReviews = pickReviews.filter((r: any) => r.quest_id === id && r.rating != null);
          const playCount = rel.length;
          const uniquePlayers = new Set(rel.map((r: any) => r.user_id)).size;
          const clears = rel.filter((r: any) => r.ended_at != null).length;
          const durations = rel
            .filter((r: any) => r.duration_sec != null && r.ended_at != null)
            .map((r: any) => r.duration_sec as number);
          const hintsArr = rel.filter((r: any) => r.hints_used != null).map((r: any) => r.hints_used as number);
          const wrongArr = rel.filter((r: any) => r.wrong_answers != null).map((r: any) => r.wrong_answers as number);
          const avgDurationMin =
            durations.length > 0
              ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) / 60)
              : null;
          const avgHints =
            hintsArr.length > 0 ? parseFloat((hintsArr.reduce((a, b) => a + b, 0) / hintsArr.length).toFixed(1)) : null;
          const avgWrongs =
            wrongArr.length > 0 ? parseFloat((wrongArr.reduce((a, b) => a + b, 0) / wrongArr.length).toFixed(1)) : null;
          const avgRating =
            relReviews.length > 0
              ? parseFloat((relReviews.reduce((a: number, b: any) => a + (b.rating || 0), 0) / relReviews.length).toFixed(2))
              : null;
          return {
            questId: id,
            title,
            playCount,
            uniquePlayers,
            clearCount: clears,
            clearRate: playCount > 0 ? Math.round((clears / playCount) * 100) : 0,
            avgDurationMin,
            avgHints,
            avgWrongs,
            avgRating,
            reviewCount: relReviews.length,
          };
        });
        setCreatorAnalytics(analytics);
      } catch (e) {
      console.warn('creator analytics fetch failed', e);
      setCreatorAnalytics([]);
      setCreatorSessions([]);
    }
  },
    [user?.id, creatorAnalyticsFilter]
  );

  const loadQuestDetailAnalytics = useCallback(
    async (questId: string | null, title?: string) => {
      if (detailLoading) return;
      if (!questId) {
        setDetailQuestId(null);
        setDetailQuestAnalytics(null);
        return;
      }
      setDetailQuestId(questId);
      setDetailLoading(true);
      setDetailQuestAnalytics(null);
      try {
        const { data: spots, error } = await supabase
          .from('spots')
          .select('id,name,order_index')
          .eq('quest_id', questId)
          .order('order_index', { ascending: true });
        if (error) {
          setDetailQuestAnalytics(null);
          return;
        }
        const { data: reviewData, error: reviewErr } = await supabase
          .from('quest_reviews')
          .select('rating,comment,created_at')
          .eq('quest_id', questId)
          .order('created_at', { ascending: false });
        if (reviewErr) {
          console.warn('detail reviews fetch failed', reviewErr);
        }
        const sessionsBase = creatorSessions.filter((s: any) => s.quest_id === questId);
        const filterThreshold = (days: number) => {
          const now = Date.now();
          const diff = days * 24 * 60 * 60 * 1000;
          return sessionsBase.filter((s: any) => {
            const ts = s.ended_at ? Date.parse(s.ended_at as string) : s.started_at ? Date.parse(s.started_at as string) : null;
            return ts ? now - ts <= diff : true;
          });
        };
        const sessions =
          creatorAnalyticsFilter === 'all'
            ? sessionsBase
            : creatorAnalyticsFilter === '30d'
            ? filterThreshold(30)
            : filterThreshold(7);
        const playCount = sessions.length;
        const clearCount = sessions.filter((s: any) => s.ended_at != null).length;
        const durations = sessions
          .filter((s: any) => s.duration_sec != null && s.ended_at != null)
          .map((s: any) => s.duration_sec as number);
        const hintsArr = sessions.filter((s: any) => s.hints_used != null).map((s: any) => s.hints_used as number);
        const wrongArr = sessions.filter((s: any) => s.wrong_answers != null).map((s: any) => s.wrong_answers as number);
        const avgDurationMin =
          durations.length > 0
            ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) / 60)
            : null;
        const avgHints =
          hintsArr.length > 0 ? parseFloat((hintsArr.reduce((a, b) => a + b, 0) / hintsArr.length).toFixed(1)) : null;
        const avgWrongs =
          wrongArr.length > 0 ? parseFloat((wrongArr.reduce((a, b) => a + b, 0) / wrongArr.length).toFixed(1)) : null;

        const stepCount = spots?.length || 0;
        const steps = (spots || []).map((sp: any, idx: number) => {
          const stepNumber = idx + 1;
          const reached = sessions.filter((s: any) => (s.solved_spots ?? 0) >= stepNumber - 1).length;
          const completed = sessions.filter((s: any) => (s.solved_spots ?? 0) >= stepNumber).length;
          const dropRate = reached > 0 ? Math.max(0, Math.min(1, (reached - completed) / reached)) : 0;
          const stepAvgHints =
            reached > 0 && stepCount > 0 && hintsArr.length > 0
              ? parseFloat(
                  (
                    sessions
                      .filter((s: any) => (s.solved_spots ?? 0) >= stepNumber - 1)
                      .reduce((sum: number, s: any) => sum + (s.hints_used || 0) / stepCount, 0) / reached
                  ).toFixed(2)
                )
              : null;
          const stepAvgWrongs =
            reached > 0 && stepCount > 0 && wrongArr.length > 0
              ? parseFloat(
                  (
                    sessions
                      .filter((s: any) => (s.solved_spots ?? 0) >= stepNumber - 1)
                      .reduce((sum: number, s: any) => sum + (s.wrong_answers || 0) / stepCount, 0) / reached
                  ).toFixed(2)
                )
              : null;
          return {
            step: stepNumber,
            name: sp.name || `スポット ${stepNumber}`,
            reached,
            completed,
            dropRate,
            avgHints: stepAvgHints,
            avgWrongs: stepAvgWrongs,
          };
        });

        const filteredReviews =
          creatorAnalyticsFilter === 'all'
            ? reviewData || []
            : (reviewData || []).filter((r: any) => {
                const ts = r.created_at ? Date.parse(r.created_at as string) : null;
                if (!ts) return false;
                const now = Date.now();
                const diffMs =
                  creatorAnalyticsFilter === '30d'
                    ? 30 * 24 * 60 * 60 * 1000
                    : 7 * 24 * 60 * 60 * 1000;
                return now - ts <= diffMs;
              });

        setDetailQuestAnalytics({
          questId,
          title: title || 'クエスト詳細',
          summary: {
            playCount,
            clearRate: playCount > 0 ? Math.round((clearCount / playCount) * 100) : 0,
            avgDurationMin,
            avgHints,
            avgWrongs,
          },
          steps,
          reviews: {
            avgRating:
              filteredReviews && filteredReviews.length > 0
                ? parseFloat(
                    (
                      filteredReviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) /
                      filteredReviews.length
                    ).toFixed(2)
                  )
                : null,
            count: filteredReviews?.length || 0,
            distribution: [1, 2, 3, 4, 5].map((score) => ({
              score,
              count: filteredReviews?.filter((r: any) => r.rating === score).length || 0,
            })),
            latest:
              filteredReviews?.slice(0, 10).map((r: any) => ({
                rating: r.rating,
                comment: r.comment,
                created_at: r.created_at,
              })) || [],
          },
        });
      } catch (e) {
        console.warn('detail analytics fetch failed', e);
        setDetailQuestAnalytics(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [creatorAnalyticsFilter, creatorSessions]
  );
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [showInstallBar, setShowInstallBar] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const loadProfileQuests = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('quests')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setProfileQuests(data);
  };
  const loadPurchases = useCallback(async () => {
    if (!user?.id) {
      setOwnedQuestIds([]);
      return;
    }
    const { data, error } = await supabase
      .from('purchases')
      .select('quest_id')
      .eq('user_id', user.id);
    if (!error && data) {
      const ids = Array.from(new Set((data || []).map((p: any) => p.quest_id).filter(Boolean)));
      setOwnedQuestIds(ids as string[]);
    } else {
      setOwnedQuestIds([]);
    }
  }, [user?.id]);
  const [storySettings, setStorySettings] = useState<{
    castName: string;
    castTone: string;
    castIcon: string;
    prologueTitle: string;
    prologueBody: string;
    prologueImage: string;
    epilogueBody: string;
    socialMessage: string;
    epilogueImage: string;
    characters: CastCharacter[];
    scenario: ScenarioBlock[];
  }>({
    castName: '',
    castTone: '',
    castIcon: '',
    prologueTitle: '',
    prologueBody: '',
    prologueImage: '',
    epilogueBody: '',
    socialMessage: '',
    epilogueImage: '',
    characters: [],
    scenario: [],
  });





  const currentUserEmail = user?.email || null;

  // Pre-registration State
  const [email, setEmail] = useState('');
  const [regStatus, setRegStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  type AppPage = typeof activePage;

  const buildPath = (page: AppPage, questId?: string, mode?: AuthMode) => {
    switch (page) {
      case 'home':
        return '/';
      case 'player':
        return '/play';
      case 'quests':
        return '/quests';
      case 'quest-detail':
        return questId ? `/quest/${questId}` : '/quests';
      case 'creators':
        return '/creators';
      case 'auth':
        if (mode === 'signup') return '/auth/signup';
        if (mode === 'forgot') return '/auth/forgot';
        return '/auth/login';
      case 'profile':
        return '/profile';
      case 'creator-start':
        return '/creator/start';
      case 'creator-mystery-setup':
        return '/creator/mystery-setup';
      case 'creator-route-spots':
        return '/creator/route-spots';
      case 'creator-workspace':
        return questId ? `/creator/workspace/${questId}` : '/creator/workspace';
      case 'creator-storytelling':
        return '/creator/storytelling';
      case 'creator-test-run':
        return '/creator/test-run';
      case 'creator-submitted':
        return '/creator/submitted';
      case 'creator-analytics':
        return questId ? `/creator/analytics/${questId}` : '/creator/analytics';
      case 'admin-dashboard':
        return '/admin/dashboard';
      case 'admin-review':
        return questId ? `/admin/review/${questId}` : '/admin/dashboard';
      case 'creator-spot-detail':
        return activeSpotId ? `/creator/route-spots/${activeSpotId}` : '/creator/route-spots';
      default:
        return '/';
    }
  };

  const applyRoute = (page: AppPage, options?: { quest?: Quest | null; questId?: string | null; authModeOverride?: AuthMode; replace?: boolean; spotId?: string | null }) => {
    const quest = options?.quest ?? null;
    const nextAuthMode = options?.authModeOverride ?? authMode;
    if (options?.questId) {
      setQuestId(options.questId);
      localStorage.setItem('quest-id', options.questId);
      loadWorkspaceStep(options.questId);
    }
    if (page === 'quest-detail') {
      setSelectedQuest(quest);
      setSelectedQuestId(options?.questId || quest?.id || null);
    } else if (page !== 'quest-detail') {
      setSelectedQuest(null);
      setSelectedQuestId(null);
    }
    if (page === 'admin-review') {
      setReviewQuestId(options?.questId || null);
    } else if (page !== 'admin-review') {
      setReviewQuestId(null);
      setReviewQuest(null);
    }
    if (page === 'auth' && options?.authModeOverride) {
      setAuthMode(options.authModeOverride);
    }
    if (page === 'creator-spot-detail') {
      setActiveSpotId(options?.spotId ?? null);
    } else if (page !== 'creator-spot-detail') {
      setActiveSpotId(null);
    }
    if (page !== 'creator-analytics') {
      setDetailQuestId(null);
      setDetailQuestAnalytics(null);
    }
    setActivePage(page);
    const path = page === 'creator-spot-detail' && options?.spotId
      ? `/creator/route-spots/${options.spotId}`
      : buildPath(page, options?.questId || quest?.id, page === 'auth' ? nextAuthMode : undefined);
    if (typeof window !== 'undefined') {
      const fn = options?.replace ? 'replaceState' : 'pushState';
      window.history[fn]({}, '', path);
    }
  };

  const parsePathToRoute = (pathname: string) => {
    if (pathname === '/quests') return { page: 'quests' as AppPage };
    if (pathname.startsWith('/quest/')) {
      const questId = pathname.split('/')[2];
      return { page: 'quest-detail' as AppPage, questId };
    }
    if (pathname === '/creators') return { page: 'creators' as AppPage };
    if (pathname === '/auth/login') return { page: 'auth' as AppPage, authMode: 'login' as AuthMode };
    if (pathname === '/auth/signup') return { page: 'auth' as AppPage, authMode: 'signup' as AuthMode };
    if (pathname === '/auth/forgot') return { page: 'auth' as AppPage, authMode: 'forgot' as AuthMode };
    if (pathname === '/profile') return { page: 'profile' as AppPage };
    if (pathname === '/creator/start') return { page: 'creator-start' as AppPage };
    if (pathname === '/creator/mystery-setup') return { page: 'creator-mystery-setup' as AppPage };
    if (pathname === '/creator/route-spots') return { page: 'creator-route-spots' as AppPage };
    if (pathname.startsWith('/creator/route-spots/')) {
      const spotId = pathname.split('/')[3];
      return { page: 'creator-spot-detail' as AppPage, spotId };
    }
    if (pathname === '/creator/storytelling') return { page: 'creator-storytelling' as AppPage };
    if (pathname === '/creator/test-run') return { page: 'creator-test-run' as AppPage };
    if (pathname === '/creator/submitted') return { page: 'creator-submitted' as AppPage };
    if (pathname === '/creator/analytics') return { page: 'creator-analytics' as AppPage };
    if (pathname.startsWith('/creator/analytics/')) {
      const questId = pathname.split('/')[3];
      return { page: 'creator-analytics' as AppPage, questId };
    }
    if (pathname === '/admin' || pathname === '/admin/dashboard') return { page: 'admin-dashboard' as AppPage };
    if (pathname.startsWith('/admin/review/')) {
      const questId = pathname.split('/')[3];
      return { page: 'admin-review' as AppPage, questId };
    }
    if (pathname === '/play') return { page: 'player' as AppPage };
    if (pathname === '/creator') return { page: 'creator-workspace' as AppPage };
    if (pathname.startsWith('/creator/workspace/')) {
      const questId = pathname.split('/')[3];
      return { page: 'creator-workspace' as AppPage, questId };
    }
    if (pathname === '/creator/workspace' || pathname === '/workspace') return { page: 'creator-workspace' as AppPage };
    if (pathname.startsWith('/creator/analytics/')) {
      const questId = pathname.split('/')[3];
      return { page: 'creator-analytics' as AppPage, questId };
    }
    if (pathname === '/creator/analytics') return { page: 'creator-analytics' as AppPage };
    return { page: 'home' as AppPage };
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const route = parsePathToRoute(window.location.pathname);
    applyRoute(route.page, { quest: route.quest || null, questId: (route as any).questId || null, authModeOverride: route.authMode, replace: true, spotId: (route as any).spotId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => {
      const route = parsePathToRoute(window.location.pathname);
      applyRoute(route.page, { quest: route.quest || null, questId: (route as any).questId || null, authModeOverride: route.authMode, replace: true, spotId: (route as any).spotId });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const storedQuestId = localStorage.getItem('quest-id');
    if (storedQuestId) setQuestId(storedQuestId);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setNotifications(data);
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  useEffect(() => {
    if (activePage.startsWith('creator')) {
      fetchCreatorAnalytics();
    }
  }, [activePage, fetchCreatorAnalytics]);

  useEffect(() => {
    if (detailQuestId) {
      loadQuestDetailAnalytics(detailQuestId, detailQuestAnalytics?.title);
    }
  }, [creatorAnalyticsFilter, creatorSessions, detailQuestId, loadQuestDetailAnalytics]);

  useEffect(() => {
    if (!selectedQuest) return;
    const owned = ownedQuestIds.includes(selectedQuest.id);
    if (selectedQuest.owned !== owned) {
      setSelectedQuest({ ...selectedQuest, owned });
    }
  }, [ownedQuestIds, selectedQuest]);

  useEffect(() => {
    const fetchDetailQuest = async () => {
      if (activePage !== 'quest-detail') return;
      if (!selectedQuestId) return;
      if (selectedQuest?.id === selectedQuestId) return;
      const [{ data, error }, { data: spotsData }, { data: storyData }, { data: reviewData }, { data: sessionData }] = await Promise.all([
        supabase
          .from('quests')
          .select('*, profiles!quests_creator_id_fkey(username)')
          .eq('id', selectedQuestId)
          .limit(1)
          .single(),
        supabase
          .from('spots')
          .select('*')
          .eq('quest_id', selectedQuestId)
          .order('order_index', { ascending: true }),
        supabase
          .from('story_timelines')
          .select('*')
          .eq('quest_id', selectedQuestId)
          .single(),
        supabase
          .from('quest_reviews')
          .select('rating')
          .eq('quest_id', selectedQuestId),
        supabase
          .from('play_sessions')
          .select('ended_at,duration_sec')
          .eq('quest_id', selectedQuestId),
      ]);
      if (!error && data) {
        const mappedStops: QuestStop[] =
          spotsData?.map((s: any) => ({ name: s.name, clue: s.address || '', action: '' })) || [];
        const reviewRows = (reviewData || []).filter((r: any) => r.rating != null) as { rating: number }[];
        const avgRating =
          reviewRows.length > 0
            ? parseFloat((reviewRows.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewRows.length).toFixed(1))
            : 0;
        const playCount = sessionData?.length || 0;
        const clearCount = (sessionData || []).filter((s: any) => s.ended_at != null).length;
        const clearRate = playCount > 0 ? Math.round((clearCount / playCount) * 100) : null;
        const durations = (sessionData || []).filter((s: any) => s.duration_sec != null).map((s: any) => s.duration_sec as number);
        const avgDurationMin =
          durations.length > 0 ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) / 60) : null;
        const mapped: Quest = {
          id: data.id,
          title: data.title || 'タイトル未設定',
          area: data.area_name || 'エリア未設定',
          distanceKm: data.distance_km || 2,
          durationMin: data.duration_min || 60,
          difficulty: '初級',
          tags: (data.tags as string[]) || ['街歩き'],
          rating: avgRating,
          reviews: reviewRows.length,
          cover: data.cover_image_url || 'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80',
          description: data.description || '',
          teaser: data.area_name || '',
          startingPoint: '',
          reward: '',
          timeWindow: 'いつでも',
          mood: '街を探検',
          stops: mappedStops,
          creatorName: data.profiles?.username || 'TOMOSHIBI Creator',
          creatorId: data.creator_id,
          storyPrologue: storyData?.prologue || '',
          storyEpilogue: storyData?.epilogue || '',
          owned: ownedQuestIds.includes(data.id),
          playCount,
          clearRate,
          avgDurationMin,
        };
        setSelectedQuest(mapped);
      }
    };
    fetchDetailQuest();
  }, [activePage, selectedQuestId, selectedQuest, ownedQuestIds]);

  useEffect(() => {
    const fetchReview = async () => {
      if (activePage !== 'admin-review' || !reviewQuestId) return;
      const { data: questData } = await supabase
        .from('quests')
        .select('*, profiles!quests_creator_id_fkey(username)')
        .eq('id', reviewQuestId)
        .single();
      const { data: spotsData } = await supabase
        .from('spots')
        .select('*')
        .eq('quest_id', reviewQuestId)
        .order('order_index', { ascending: true });
      const { data: storyData } = await supabase
        .from('story_timelines')
        .select('*')
        .eq('quest_id', reviewQuestId)
        .single();
      if (questData) {
        setReviewQuest({
          quest: questData,
          spots: spotsData || [],
          story: storyData || null,
        });
      }
    };
    fetchReview();
  }, [activePage, reviewQuestId]);

  useEffect(() => {
    if (activePage === 'profile' && user?.id) {
      loadProfileQuests();
    }
  }, [activePage, user?.id]);

  useEffect(() => {
    if (activePage === 'admin-dashboard') {
      fetchPendingQuests();
    }
  }, [activePage]);

  useEffect(() => {
    if (activePage === 'creator-test-run') {
      setActiveWorkspaceStep(4);
    }
  }, [activePage]);

  const fetchPendingQuests = async () => {
    const { data, error } = await supabase
      .from('quests')
      .select('id, title, area_name, created_at, creator_id, profiles!quests_creator_id_fkey(username)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false });
    if (!error && data) setPendingQuests(data);
  };

  useEffect(() => {
    if (activePage === 'admin-dashboard') {
      fetchPendingQuests();
    }
  }, [activePage]);

  useEffect(() => {
    if (!questId) return;
    loadWorkspaceStep(questId);
    supabase
      .from('quests')
      .select('*')
      .eq('id', questId)
      .single()
      .then(({ data }) => {
        if (data) {
          setQuestTitle(data.title || '');
          setQuestDescription(data.description || '');
          setQuestLocation(data.area_name || '');
          if (data.location_lat && data.location_lng) {
            setQuestLatLng({ lat: data.location_lat, lng: data.location_lng });
          }
        }
      })
      .catch(() => {});
  }, [questId]);

  // プロフィール用: 自分のクエスト一覧を取得
  useEffect(() => {
    const fetchProfileQuests = async () => {
      if (!user?.id || activePage !== 'profile') {
        setProfileQuests([]);
        return;
      }
      const { data, error } = await supabase
        .from('quests')
        .select('id, title, description, area_name, location_lat, location_lng, created_at')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setProfileQuests(data);
      } else {
        setProfileQuests([]);
      }
    };
    fetchProfileQuests();
  }, [user?.id, activePage]);

  const resetAuth = () => {
    setAuthStatus('idle');
    setAuthError(null);
  };

  const changeAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthStatus('idle');
    setAuthError(null);
  };

  const scrollToAnchor = (href: string) => {
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const goHome = (href?: string) => {
    applyRoute('home');
    setIsMenuOpen(false);
    resetAuth();
    setShowCreatorOnboarding(false);
    if (href) {
      requestAnimationFrame(() => scrollToAnchor(href));
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToQuestList = () => {
    applyRoute('quests');
    setIsMenuOpen(false);
    resetAuth();
    setShowCreatorOnboarding(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToCreatorPage = () => {
    applyRoute('creators');
    setIsMenuOpen(false);
    resetAuth();
    setShowCreatorOnboarding(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    signOut()
      .catch(() => {})
      .finally(() => {
        setIsUserMenuOpen(false);
        setShowCreatorOnboarding(false);
        goHome();
      });
  };

  const openCreatorOnboarding = () => {
    setShowCreatorOnboarding(true);
    setCreatorOnboardingStep(0);
    setIsUserMenuOpen(false);
  };

  const closeCreatorOnboarding = () => {
    setShowCreatorOnboarding(false);
    setCreatorOnboardingStep(0);
  };

  const handleOnboardingNext = () => {
    if (creatorOnboardingStep >= CREATOR_ONBOARDING_STEPS.length - 1) {
      closeCreatorOnboarding();
      goToCreatorStart();
      return;
    }
    setCreatorOnboardingStep((prev) => Math.min(prev + 1, CREATOR_ONBOARDING_STEPS.length - 1));
  };

  const backToQuestList = () => {
    applyRoute('quests');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openQuestDetail = (quest: Quest) => {
    setSelectedQuest(quest);
    setSelectedQuestId(quest.id);
    applyRoute('quest-detail', { quest });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePurchaseQuest = async (questId: string) => {
    if (!user?.id) {
      goToAuth('login');
      return;
    }
    if (ownedQuestIds.includes(questId)) {
      alert('すでに購入済みです。/mobile からプレイできます。');
      return;
    }
    setPurchaseLoading(true);
    try {
      const { data: eventRow } = await supabase
        .from('events')
        .select('id')
        .eq('quest_id', questId)
        .maybeSingle();

      const payload: Record<string, any> = {
        user_id: user.id,
        quest_id: questId,
        status: 'test',
        price: 0,
        currency: 'JPY',
      };
      if (eventRow?.id) payload.event_id = eventRow.id;

      await supabase.from('purchases').insert(payload);
      await loadPurchases();
      setSelectedQuest((prev) => (prev && prev.id === questId ? { ...prev, owned: true } : prev));
      alert('購入完了。このアカウントで /mobile からプレイできます。');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      alert('購入に失敗しました。時間をおいて再試行してください。');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const goToAuth = (mode: AuthMode = 'login') => {
    changeAuthMode(mode);
    applyRoute('auth', { authModeOverride: mode });
    setIsMenuOpen(false);
    setSelectedQuest(null);
    setShowCreatorOnboarding(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToProfile = () => {
    applyRoute('profile');
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    setShowCreatorOnboarding(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (user?.id) {
      supabase
        .from('quests')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setProfileQuests(data);
        });
    }
  };

  const goToCreatorStart = () => {
    applyRoute('creator-start');
    setShowCreatorOnboarding(false);
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createDraftQuest = async () => {
    if (!user?.id) {
      applyRoute('auth', { authModeOverride: 'login' });
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('quests')
        .insert({
          creator_id: user.id,
          // 新規作成時は空のフィールドで開始
          title: '',
          area_name: '',
          description: '',
          tags: [],
          category_tags: [],
          hashtag_tags: [],
          status: 'draft',
        })
        .select('id, title, area_name, description')
        .maybeSingle();
      if (error) throw error;
      if (data?.id) {
        setQuestId(data.id);
        localStorage.setItem('quest-id', data.id);
        setQuestTitle(data.title || '');
        setQuestDescription(data.description || '');
        setQuestLocation(data.area_name || '');
        return data.id as string;
      }
    } catch (e: any) {
      console.warn('draft quest create failed', e);
      alert('クエストの作成に失敗しました。通信状況をご確認ください。');
    }
    return null;
  };

  const goToMysterySetup = () => {
    applyRoute('creator-mystery-setup');
    setShowCreatorOnboarding(false);
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToRouteSpots = () => {
    setActiveWorkspaceStep(2);
    applyRoute('creator-route-spots', { questId });
    setShowCreatorOnboarding(false);
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToCreatorAnalytics = (questId?: string, title?: string) => {
    applyRoute('creator-analytics', { questId });
    setShowCreatorOnboarding(false);
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    if (questId) {
      loadQuestDetailAnalytics(questId, title);
    } else {
      setDetailQuestAnalytics(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStorytelling = () => {
    setActiveWorkspaceStep(3);
    applyRoute('creator-storytelling', { questId });
    setShowCreatorOnboarding(false);
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToTestRun = () => {
    setActiveWorkspaceStep(4);
    applyRoute('creator-test-run', { questId });
    setShowCreatorOnboarding(false);
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToSubmitted = () => {
    applyRoute('creator-submitted');
    setShowCreatorOnboarding(false);
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToSpotDetail = (spotId: string) => {
    setActiveWorkspaceStep(2);
    applyRoute('creator-spot-detail', { spotId });
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToWorkspace = () => {
    if (questId) {
      loadWorkspaceStep(questId);
    }
    applyRoute('creator-workspace', { questId });
    setShowCreatorOnboarding(false);
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadWorkspaceStep = (id: string | null) => {
    if (!id) {
      setActiveWorkspaceStep(1);
      return;
    }
    const stored = localStorage.getItem(`workspace-step:${id}`);
    const stepNum = stored ? parseInt(stored, 10) : 1;
    setActiveWorkspaceStep(Number.isFinite(stepNum) && stepNum > 0 ? stepNum : 1);
  };

  const markQuestProgress = async (step: number) => {
    if (!questId) return;
    const nextStep = Math.max(step, activeWorkspaceStep || 1);
    setActiveWorkspaceStep(nextStep);
    localStorage.setItem(`workspace-step:${questId}`, String(nextStep));
    await supabase
      .from('quests')
      .update({ updated_at: new Date().toISOString(), status: 'draft' })
      .eq('id', questId);
  };

  const handlePublish = async () => {
    if (!questId) {
      alert('クエストが見つかりません。Step1を保存してください。');
      return;
    }
    if (!user?.id) {
      alert('ログインしてください。');
      goToAuth('login');
      return;
    }
    const { data: profileRow } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const role = profileRow?.role || (profile as any)?.role || 'player';
    const nextStatus = role === 'admin' ? 'published' : 'pending_review';
    const { error } = await supabase.from('quests').update({ status: nextStatus }).eq('id', questId);
    if (error) {
      alert('公開処理に失敗しました。時間をおいて再試行してください。');
      return;
    }
    setActiveWorkspaceStep(5);
    if (nextStatus === 'published') {
      alert('公開しました');
      goToQuestList();
    } else {
      alert('申請を受け付けました。審査完了をお待ちください。');
      goToSubmitted();
    }
  };

  const sendNotification = async ({ userId, title, message }: { userId: string; title: string; message: string }) => {
    if (!userId) return;
    await supabase.from('notifications').insert({ user_id: userId, title, message, type: 'review_result' });
  };

  const approveQuest = async () => {
    if (!reviewQuestId) return;
    setReviewActionLoading(true);
    const { data, error } = await supabase
      .from('quests')
      .update({ status: 'published' })
      .eq('id', reviewQuestId)
      .select('creator_id, title')
      .single();
    if (error) {
      alert('承認に失敗しました。権限/RLS設定を確認してください。');
      setReviewActionLoading(false);
      return;
    }
    if (data) {
      await sendNotification({
        userId: data.creator_id,
        title: 'クエストが公開されました！',
        message: `おめでとうございます。あなたのクエスト「${data.title}」が審査を通過し、公開されました。`,
      });
      alert('承認しました');
      fetchPendingQuests();
      goToAdminDashboard();
    }
    setReviewActionLoading(false);
  };

  const rejectQuest = async (reason: string) => {
    if (!reviewQuestId || !reviewQuest?.quest) return;
    setReviewActionLoading(true);
    const { error } = await supabase
      .from('quests')
      .update({ status: 'draft' })
      .eq('id', reviewQuestId);
    if (error) {
      alert('差し戻しに失敗しました。権限/RLS設定を確認してください。');
      setReviewActionLoading(false);
      return;
    }
    await sendNotification({
      userId: reviewQuest.quest.creator_id,
      title: 'クエストの審査結果について',
      message: `申請いただいたクエストは差し戻されました。内容を修正して再度申請してください。\n理由: ${reason || '記載なし'}`,
    });
    alert('差し戻しました');
    fetchPendingQuests();
    goToAdminDashboard();
    setReviewActionLoading(false);
  };

  const updateSpotData = (updated: RouteSpot) => {
    setRouteSpots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleAuthSubmit = async ({ email, password, confirmPassword }: { email: string; password?: string; confirmPassword?: string }) => {
    setAuthError(null);
    setAuthStatus('submitting');
    try {
      if (authMode === 'signup' && password !== confirmPassword) {
        throw new Error('パスワードが一致しません。');
      }
      if (authMode !== 'forgot' && (!password || password.length < 6)) {
        throw new Error('パスワードは6文字以上で入力してください。');
      }

      if (authMode === 'forgot') {
        await resetPassword(email);
        setAuthStatus('success');
        return;
      }

      if (authMode === 'login') {
        await signIn(email, password || '');
        setAuthStatus('success');
        setTimeout(() => goToProfile(), 200);
      } else {
        const result = await signUp(email, password || '');
        if (!result?.session) {
          setAuthStatus('idle');
          setAuthError('確認メールを送信しました。メール確認後にログインしてください。');
          setAuthMode('login');
          return;
        }
        setAuthStatus('success');
        setTimeout(() => goToProfile(), 200);
      }
    } catch (err: any) {
      setAuthStatus('idle');
      setAuthError(err?.message || '認証に失敗しました。再度お試しください。');
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  const handleNavClick = (href: string) => {
    if (href === '#creators') {
      goToCreatorPage();
      return;
    }
    if (activePage !== 'home') {
      goHome(href);
    } else {
      scrollToAnchor(href);
      setIsMenuOpen(false);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setRegStatus('submitting');
    // Simulate API call
    setTimeout(() => {
      setRegStatus('success');
      setEmail('');
    }, 1200);
  };

  const isHome = activePage === 'home';
  const hasStoreLink = Boolean(APP_STORE_URL || GOOGLE_PLAY_URL);
  const handleScrollNotify = () => {
    if (typeof window === 'undefined') return;
    window.location.assign(PWA_APP_URL);
  };
  const shouldShowInstallBar =
    isMobileView &&
    showInstallBar &&
    ['home', 'quests', 'quest-detail', 'creators', 'auth', 'profile'].includes(activePage);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateMobile = () => {
      const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') || window.matchMedia('(max-width: 640px)').matches;
      setIsMobileView(mobile);
      const dismissed = sessionStorage.getItem('tmoshibi_install_bar_dismissed') === '1';
      if (mobile && !dismissed) setShowInstallBar(true);
      if (!mobile) setShowInstallBar(false);
    };
    updateMobile();
    window.addEventListener('resize', updateMobile);
    return () => window.removeEventListener('resize', updateMobile);
  }, []);

  const dismissInstallBar = () => {
    setShowInstallBar(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('tmoshibi_install_bar_dismissed', '1');
    }
  };

  const openStoreLink = () => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    if (isIOS && APP_STORE_URL) {
      window.open(APP_STORE_URL, '_blank', 'noopener');
      return;
    }
    if (!isIOS && GOOGLE_PLAY_URL) {
      window.open(GOOGLE_PLAY_URL, '_blank', 'noopener');
      return;
    }
    if (APP_STORE_URL) {
      window.open(APP_STORE_URL, '_blank', 'noopener');
      return;
    }
    if (GOOGLE_PLAY_URL) {
      window.open(GOOGLE_PLAY_URL, '_blank', 'noopener');
    }
  };

  const openAppCTA = () => {
    if (typeof window !== 'undefined') {
      // LPの「ダウンロード」系CTAはモバイルアプリ配信パスにリダイレクト
      window.location.href = '/mobile';
      return;
    }
    if (hasStoreLink && isMobileView) {
      openStoreLink();
      return;
    }
    applyRoute('player');
  };

  const handleStartGame = () => {
    openAppCTA();
  };

  const goToAdminDashboard = () => {
    if (profile?.role === 'admin') {
      applyRoute('admin-dashboard');
      setIsMenuOpen(false);
      setIsUserMenuOpen(false);
    } else {
      alert('管理者のみアクセスできます');
      goHome();
    }
  };

  return (
    <div className="min-h-screen bg-brand-base font-sans text-brand-dark selection:bg-brand-gold/30 selection:text-brand-dark">
      
      {/* --- Navigation (LP/other pages only) --- */}
      {activePage !== 'creator-mystery-setup' && activePage !== 'creator-workspace' && activePage !== 'creator-route-spots' && activePage !== 'creator-spot-detail' && activePage !== 'creator-storytelling' && activePage !== 'creator-test-run' && activePage !== 'creator-submitted' && activePage !== 'creator-analytics' && activePage !== 'player' && (
        <nav 
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            isScrolled ? 'bg-white/80 backdrop-blur-md py-4 shadow-lg border-b border-stone-200/50' : 'bg-transparent py-6'
          }`}
        >
          <div className="container mx-auto px-4 md:px-8 flex items-center justify-between">
            <button onClick={() => goHome()} className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
              <TomoshibiLogo className="h-8 md:h-10 w-auto" />
            </button>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              {NAV_ITEMS.map((item) => (
                <button 
                  key={item.label} 
                  onClick={() => handleNavClick(item.href)} 
                  className="text-sm font-medium text-stone-600 hover:text-brand-gold transition-colors relative group"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-gold transition-all group-hover:w-full" />
                </button>
              ))}
              <button 
                onClick={goToQuestList}
                className="bg-brand-dark text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-brand-gold hover:text-white transition-all shadow-md hover:shadow-lg"
              >
                クエストを探す
              </button>
              {!loading && currentUserEmail ? (
                <div className="relative flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowNotifications((prev) => !prev);
                      if (notifications.some((n) => !n.is_read)) {
                        supabase.from('notifications').update({ is_read: true }).eq('user_id', user?.id || '');
                        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                      }
                    }}
                    className="relative p-2 rounded-full border border-stone-200 bg-white/90 hover:border-brand-gold"
                  >
                    <Bell size={18} className="text-brand-dark" />
                    {notifications.some((n) => !n.is_read) && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500" />
                    )}
                  </button>
                  {showNotifications && (
                    <div className="absolute right-14 top-12 w-72 bg-white border border-stone-200 rounded-xl shadow-lg z-50">
                      <div className="p-3 border-b border-stone-100 text-sm font-bold text-brand-dark">通知</div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 && (
                          <div className="px-4 py-3 text-xs text-stone-500">通知はありません。</div>
                        )}
                        {notifications.map((n) => (
                          <div key={n.id} className={`px-4 py-3 border-b border-stone-100 ${n.is_read ? 'bg-white' : 'bg-brand-base'}`}>
                            <p className="text-xs text-stone-500">{new Date(n.created_at).toLocaleString()}</p>
                            <p className="text-sm font-bold text-brand-dark">{n.title}</p>
                            <p className="text-xs text-stone-600 whitespace-pre-line">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center gap-3 pl-3 pr-4 py-2 rounded-full border border-stone-300 bg-white/90 backdrop-blur text-sm font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold transition-all shadow-sm"
                    >
                      <span className="w-8 h-8 rounded-full bg-brand-dark text-white flex items-center justify-center font-bold">
                        {currentUserEmail.charAt(0).toUpperCase()}
                      </span>
                    </button>
                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
                        <button
                          onClick={goToProfile}
                          className="w-full text-left px-4 py-3 text-sm text-brand-dark hover:bg-brand-base"
                        >
                          プロフィール
                        </button>
                        {profile?.role === 'admin' && (
                          <button
                            onClick={goToAdminDashboard}
                            className="w-full text-left px-4 py-3 text-sm text-brand-dark hover:bg-brand-base"
                          >
                            管理者ダッシュボード
                          </button>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-3 text-sm text-brand-dark hover:bg-brand-base"
                        >
                          ログアウト
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : loading ? (
                <div className="w-10 h-10 rounded-full bg-stone-200 animate-pulse" />
              ) : (
                <button 
                  onClick={() => goToAuth('login')}
                  className="ml-2 px-4 py-2 rounded-full border border-stone-300 bg-white/80 backdrop-blur text-sm font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold transition-all shadow-sm"
                >
                  ログイン
                </button>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden text-brand-dark"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>

          {/* Mobile Nav Overlay */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden bg-white border-t border-stone-200 overflow-hidden shadow-xl"
              >
                <div className="flex flex-col p-6 gap-6">
                  {NAV_ITEMS.map((item) => (
                    <button 
                      key={item.label} 
                      onClick={() => handleNavClick(item.href)} 
                      className="text-lg text-brand-dark font-serif text-left"
                    >
                      {item.label}
                    </button>
                  ))}
                  <button 
                    onClick={goToQuestList}
                    className="w-full bg-brand-gold text-white py-3 rounded-lg font-bold"
                  >
                    クエストを探す
                  </button>
                  {!loading && currentUserEmail ? (
                    <div className="flex flex-col gap-2 border border-stone-200 rounded-lg p-3 bg-white">
                      <div className="flex items-center gap-2">
                        <span className="w-9 h-9 rounded-full bg-brand-dark text-white flex items-center justify-center font-bold">
                          {currentUserEmail.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <button 
                        onClick={goToProfile}
                        className="w-full bg-brand-dark text-white py-2 rounded-lg font-bold text-sm hover:bg-brand-gold transition-colors"
                      >
                        プロフィール
                      </button>
                      <button 
                        onClick={handleLogout}
                        className="w-full border border-stone-300 text-brand-dark py-2 rounded-lg font-bold text-sm hover:border-brand-gold hover:text-brand-gold transition-colors"
                      >
                        ログアウト
                      </button>
                    </div>
                  ) : loading ? (
                    <div className="flex items-center justify-center py-4 text-stone-400 text-sm">読み込み中...</div>
                  ) : (
                    <button 
                      onClick={() => goToAuth('login')}
                      className="w-full border border-stone-300 text-brand-dark py-3 rounded-lg font-bold hover:border-brand-gold hover:text-brand-gold transition-colors"
                    >
                      ログイン
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      )}

      {activePage === 'quests' && (
        <QuestListPage 
          onSelectQuest={openQuestDetail} 
          onBackHome={() => goHome()} 
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          sortKey={sortKey}
          setSortKey={setSortKey}
          onOpenApp={openAppCTA}
          comingSoon={!hasStoreLink}
          onScrollNotify={handleScrollNotify}
          ownedQuestIds={ownedQuestIds}
        />
      )}

      {activePage === 'quest-detail' && selectedQuest && (
        <QuestDetailPage 
          quest={selectedQuest} 
          onBackToList={backToQuestList} 
          onBackHome={() => goHome()} 
          onOpenApp={openAppCTA}
          comingSoon={!hasStoreLink}
          onScrollNotify={handleScrollNotify}
          purchased={selectedQuest.owned || ownedQuestIds.includes(selectedQuest.id)}
          onPurchase={handlePurchaseQuest}
          purchasing={purchaseLoading}
        />
      )}

      {activePage === 'quest-detail' && !selectedQuest && (
        <div className="py-32 text-center text-stone-500">クエストを読み込み中...</div>
      )}

      {activePage === 'creators' && (
        <CreatorPage onBackHome={() => goHome()} onGoAuth={goToAuth} onOpenOnboarding={openCreatorOnboarding} />
      )}

      {activePage === 'auth' && (
        <AuthPage 
          mode={authMode} 
          setMode={changeAuthMode} 
          status={authStatus} 
          onSubmit={handleAuthSubmit}
          error={authError}
          onBackHome={() => goHome()} 
        />
      )}

      {activePage === 'profile' && currentUserEmail && (
        <ProfilePage 
          email={currentUserEmail}
          onLogout={handleLogout}
          onBackHome={() => goHome()}
          onGoCreators={goToCreatorPage}
          onGoQuests={goToQuestList}
          onOpenOnboarding={openCreatorOnboarding}
          onGoCreatorStart={goToCreatorStart}
          quests={profileQuests}
          onOpenWorkspace={(quest) => {
            setQuestId(quest.id);
            localStorage.setItem('quest-id', quest.id);
            setQuestTitle(quest.title || '');
            setQuestDescription(quest.description || '');
            setQuestLocation(quest.area_name || '');
            const tagArray = Array.isArray(quest.tags) ? quest.tags : [];
            setQuestCategoryTags(tagArray.filter((t: string) => CATEGORY_TAGS.includes(t)));
            setQuestHashtags(tagArray.filter((t: string) => !CATEGORY_TAGS.includes(t)));
            if (quest.location_lat && quest.location_lng) setQuestLatLng({ lat: quest.location_lat, lng: quest.location_lng });
            loadWorkspaceStep(quest.id);
            goToWorkspace();
          }}
          onOpenAnalytics={(quest) => {
            goToCreatorAnalytics(quest.id, quest.title);
          }}
        />
      )}

      {activePage === 'creator-start' && (
        <CreatorStartPage
          selectedType={selectedQuestType}
          setSelectedType={setSelectedQuestType}
          onBack={() => goToProfile()}
          onStart={async () => {
            if (selectedQuestType === 'mystery') {
              const newId = await createDraftQuest();
              // 新規作成時は関連ステートをリセットして空の入力欄に
              setQuestTitle('');
              setQuestDescription('');
              setQuestLocation('');
          setQuestLatLng(null);
          setRouteSpots([]);
          setActiveWorkspaceStep(1);
          if (newId) localStorage.setItem(`workspace-step:${newId}`, '1');
          setActiveSpotId(null);
          setQuestCategoryTags([]);
          setQuestHashtags([]);
          setStorySettings({
            castName: '',
            castTone: '',
            castIcon: '',
            prologueTitle: '',
                prologueBody: '',
                prologueImage: '',
                epilogueBody: '',
                socialMessage: '',
                epilogueImage: '',
                characters: [],
                scenario: [],
              });
              if (newId) {
                setQuestId(newId);
                localStorage.setItem('quest-id', newId);
              }
              goToWorkspace();
            } else {
              goToCreatorPage();
            }
          }}
          onOpenOnboarding={openCreatorOnboarding}
        />
      )}

      {activePage === 'creator-mystery-setup' && (
        <CreatorMysterySetupPage
          location={questLocation}
          setLocation={setQuestLocation}
          title={questTitle}
          setTitle={setQuestTitle}
          description={questDescription}
          setDescription={setQuestDescription}
          onSaveNext={() => goToWorkspace()}
          onBack={() => goToCreatorStart()}
          onLogoHome={() => goHome()}
          onGoWorkspace={goToWorkspace}
          userId={user?.id || null}
          questId={questId}
          setQuestId={(id) => {
            setQuestId(id);
            localStorage.setItem('quest-id', id);
          }}
          setQuestLatLng={setQuestLatLng}
          questLatLng={questLatLng}
        />
      )}

      {activePage === 'player' && (
        <PlayerAppPage
          onBackHome={() => goHome()}
          onGoCreators={() => goToCreatorPage()}
        />
      )}

      {activePage === 'creator-route-spots' && (
        <CreatorRouteSpotsPage
          onBack={() => goToWorkspace()}
          onComplete={() => {
            setActiveWorkspaceStep(3);
            markQuestProgress(2);
            goToWorkspace();
          }}
          onLogoHome={() => goHome()}
          routeSpots={routeSpots}
          setRouteSpots={setRouteSpots}
          onOpenSpotDetail={(id) => goToSpotDetail(id)}
          questId={questId}
        />
      )}

      {activePage === 'creator-storytelling' && (
        <CreatorStorytellingPage
          onLogoHome={() => goHome()}
          onBack={() => goToWorkspace()}
          onSaveComplete={(settings) => {
            setStorySettings(settings);
            setActiveWorkspaceStep(4);
            markQuestProgress(3);
            goToWorkspace();
          }}
          storySettings={storySettings}
          spots={routeSpots}
          isSocialQuest={selectedQuestType === 'social'}
          questId={questId}
        />
      )}

      {activePage === 'creator-test-run' && (
        <CreatorTestRunPage
          onLogoHome={() => goHome()}
          onBack={() => goToWorkspace()}
          onComplete={() => {
            setActiveWorkspaceStep(5);
            markQuestProgress(4);
            goToWorkspace();
          }}
          questTitle={questTitle}
          questDescription={questDescription}
          questLocation={questLocation}
          questLatLng={questLatLng}
          routeSpots={routeSpots}
          storySettings={storySettings}
          questId={questId}
          userId={user?.id || null}
          userEmail={user?.email || null}
          questCategoryTags={questCategoryTags}
          setQuestCategoryTags={setQuestCategoryTags}
          questHashtags={questHashtags}
          setQuestHashtags={setQuestHashtags}
        />
      )}

      {activePage === 'creator-submitted' && (
        <CreatorSubmittedPage
          onLogoHome={() => goHome()}
          onBackHome={() => goToWorkspace()}
        />
      )}

      {activePage === 'admin-dashboard' && (
        profile?.role === 'admin' ? (
          <AdminDashboardPage
            pending={pendingQuests}
            onReview={(id) => applyRoute('admin-review', { questId: id })}
            onBackHome={() => goHome()}
          />
        ) : (
          <div className="py-32 text-center text-stone-500">管理者のみアクセス可能です。</div>
        )
      )}

      {activePage === 'admin-review' && (
        profile?.role === 'admin' ? (
          <AdminReviewPage
            questBundle={reviewQuest}
            onBack={() => applyRoute('admin-dashboard')}
            onApprove={approveQuest}
            onReject={rejectQuest}
            loading={reviewActionLoading}
          />
        ) : (
          <div className="py-32 text-center text-stone-500">管理者のみアクセス可能です。</div>
        )
      )}

      {activePage === 'creator-spot-detail' && (() => {
        const currentSpot = routeSpots.find((s) => s.id === activeSpotId) || routeSpots[0] || null;
        const idx = currentSpot ? routeSpots.findIndex((s) => s.id === currentSpot.id) : -1;
        const nextSpot = idx >= 0 && idx < routeSpots.length - 1 ? routeSpots[idx + 1] : null;
        if (!currentSpot) {
          goToRouteSpots();
          return null;
        }
        const handleBack = (payload: RouteSpot) => {
          updateSpotData(payload);
          goToRouteSpots();
        };
        const handleNext = (payload: RouteSpot) => {
          updateSpotData(payload);
          if (nextSpot) {
            setActiveSpotId(nextSpot.id);
            applyRoute('creator-spot-detail', { spotId: nextSpot.id });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            goToRouteSpots();
          }
        };
        return (
          <CreatorSpotDetailPage
            spot={currentSpot}
            onLogoHome={() => goHome()}
            onBackList={() => goToRouteSpots()}
            onSaveBack={(payload) => handleBack(payload)}
            onSaveNext={(payload) => handleNext(payload)}
            nextSpot={nextSpot}
            questId={questId}
            setRouteSpots={setRouteSpots}
          />
        );
      })()}

      {activePage === 'creator-workspace' && (
        <CreatorWorkspacePage
          onBack={() => goToProfile()}
          onPreview={() => {}}
          activeStep={activeWorkspaceStep}
          setActiveStep={setActiveWorkspaceStep}
          onGoStep2={goToRouteSpots}
          onGoStep3={goToStorytelling}
          onGoStep4={goToTestRun}
          onPublish={handlePublish}
          onLogoHome={() => goHome()}
          onGoStep1={() => goToMysterySetup()}
          showAnalytics={false}
          analytics={creatorAnalytics}
          analyticsFilter={creatorAnalyticsFilter}
          onChangeAnalyticsFilter={(f) => setCreatorAnalyticsFilter(f)}
          onOpenDetail={(id, title) => loadQuestDetailAnalytics(id, title)}
          detailQuestAnalytics={detailQuestAnalytics}
          detailLoading={detailLoading}

        />
      )}

      {activePage === 'creator-analytics' && (
        <CreatorAnalyticsPage
          onBack={() => goToProfile()}
          onLogoHome={() => goHome()}
          analytics={creatorAnalytics}
          analyticsFilter={creatorAnalyticsFilter}
          onChangeAnalyticsFilter={(v) => setCreatorAnalyticsFilter(v)}
          onOpenDetail={(questId, title) => loadQuestDetailAnalytics(questId, title)}
          detailQuestAnalytics={detailQuestAnalytics}
          detailLoading={detailLoading}
        />
      )}



      {isHome && (
        <>
      {/* --- Hero Section --- */}
      <section className="relative min-h-screen pt-32 pb-20 flex items-center overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-hero-glow opacity-80 pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/30 via-transparent to-transparent pointer-events-none" />
        
        <div className="container mx-auto px-4 md:px-8 grid md:grid-cols-2 gap-12 items-center relative z-10">
          
          {/* Hero Content */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center md:text-left"
          >
            <div className="inline-block px-3 py-1 bg-brand-gold/10 border border-brand-gold/30 rounded-full text-brand-gold text-xs font-bold tracking-wider mb-6">
              NEW WAY TO EXPLORE
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold leading-tight mb-6 text-brand-dark">
              いつもの街が、<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold to-orange-400 filter drop-shadow-sm">
                謎解きフィールド
              </span>
              <br />になる。
            </h1>
            <p className="text-stone-600 text-base md:text-lg leading-relaxed mb-8 max-w-lg mx-auto md:mx-0">
              TOMOSHIBIは、スマホひとつで遊べるシティ・パズルトレイル。<br />
              物語に沿って街を歩き、手がかりを見つけ、<br />
              新しい街の表情に出会える体験型エンターテインメントです。
            </p>
            
            <div className="space-y-3">
              <AppDownloadButtons
                onPrimary={openAppCTA}
                onSecondary={goToQuestList}
                onScrollNotify={handleScrollNotify}
                hasStoreLink={hasStoreLink}
                comingSoon={!hasStoreLink}
              />
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <button 
                  onClick={() => handleNavClick('#how-it-works')}
                  className="border border-stone-400 text-stone-600 px-6 py-3 rounded-full font-bold text-sm md:text-base hover:bg-white hover:border-transparent hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  遊び方をみる
                </button>
              </div>
              <AppFeaturePills />
            </div>
          </motion.div>

          {/* Hero Visual (Mockup) */}
          <motion.div 
            initial={{ opacity: 0, y: 50, rotate: 5 }}
            animate={{ opacity: 1, y: 0, rotate: -6 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative hidden md:flex justify-center"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-gold/10 rounded-full blur-[80px] pointer-events-none" />
            <PhoneMockup />
            
            {/* Floating Elements */}
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -right-8 top-20 bg-white/90 backdrop-blur border border-white p-4 rounded-2xl shadow-xl max-w-[180px]"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-green-100 rounded-full text-green-600"><MapPin size={16} /></div>
                <span className="text-xs font-bold text-brand-dark">手がかり発見！</span>
              </div>
              <p className="text-[10px] text-stone-500">古い郵便ポストの裏側にある刻印を確認せよ。</p>
            </motion.div>

             <motion.div 
              animate={{ y: [0, 15, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
              className="absolute -left-12 bottom-40 bg-white/90 backdrop-blur border border-white p-4 rounded-2xl shadow-xl max-w-[200px]"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-amber-100 rounded-full text-amber-600"><Lightbulb size={16} /></div>
                <span className="text-xs font-bold text-brand-dark">謎解き成功</span>
              </div>
              <p className="text-[10px] text-stone-500">「1923年の記憶」のロックが解除されました。</p>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-stone-400 flex flex-col items-center gap-2"
        >
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <ChevronDown size={20} />
        </motion.div>
      </section>


      {/* --- Key Metrics --- */}
      <section className="py-10 border-y border-stone-200/50 bg-white/40 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-stone-200">
            {STATS.map((stat, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="py-4 md:py-0"
              >
                <div className="text-sm text-stone-500 mb-2 font-medium">{stat.label}</div>
                <div className="text-3xl md:text-4xl font-serif font-bold text-brand-dark">{stat.value}</div>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-stone-500 mt-10 text-sm md:text-base font-light italic">
            「観光、デート、家族のおでかけ、チームビルディングまで。街歩きが“物語体験”に変わる新しい余暇のかたちです。」
          </p>
        </div>
      </section>

      {/* --- Features Section --- */}
      <section id="features" className="py-24 relative">
        <div className="container mx-auto px-4 md:px-8">
          <SectionHeading subtitle="TOMOSHIBIは、ただの観光ガイドアプリではありません。あなたの足を動かし、街の隠された魅力を照らすツールです。">
            TOMOSHIBIの特徴
          </SectionHeading>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white border border-white/50 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-brand-base rounded-xl flex items-center justify-center text-brand-gold mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-brand-dark">{feature.title}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- How it Works --- */}
      <section id="how-it-works" className="py-24 relative overflow-hidden bg-white/50">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e7e5e4_1px,transparent_1px),linear-gradient(to_bottom,#e7e5e4_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <SectionHeading subtitle="準備はスマホだけ。複雑なルールはありません。">
            遊び方はとてもシンプル
          </SectionHeading>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-12 relative">
              {/* Connecting Line */}
              <div className="absolute left-6 md:left-1/2 top-4 bottom-4 w-0.5 bg-gradient-to-b from-stone-200 via-brand-gold/50 to-stone-200 md:-translate-x-1/2" />

              {STEPS.map((step, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.2 }}
                  className={`flex flex-col md:flex-row gap-8 items-start md:items-center ${idx % 2 === 0 ? '' : 'md:flex-row-reverse'}`}
                >
                  {/* Step Number Bubble */}
                  <div className="md:w-1/2 flex justify-start md:justify-end md:px-8">
                     <div className={`
                       w-12 h-12 rounded-full border-4 border-brand-base bg-brand-dark text-brand-gold font-bold flex items-center justify-center text-xl z-10 shadow-lg
                       ${idx % 2 !== 0 ? 'md:order-last' : ''}
                     `}>
                       {step.step}
                     </div>
                  </div>

                  {/* Content */}
                  <div className="md:w-1/2 pl-14 md:pl-0 md:px-8 -mt-16 md:mt-0">
                    <div className="bg-white border border-stone-200 p-6 rounded-2xl relative shadow-md">
                      <div className={`absolute top-6 w-3 h-3 bg-white border-l border-t border-stone-200 rotate-45 ${idx % 2 === 0 ? 'left-[-7px] md:right-auto md:left-[-7px]' : 'left-[-7px] md:left-auto md:right-[-7px]'}`} />
                      <h3 className="text-xl font-bold text-brand-dark mb-2">{step.title}</h3>
                      <p className="text-stone-600 text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- Scenes / Use Cases --- */}
      <section id="scenes" className="py-24">
        <div className="container mx-auto px-4 md:px-8">
          <SectionHeading subtitle="TOMOSHIBIは、様々なシチュエーションで日常を特別にします。">
            シーン別の楽しみ方
          </SectionHeading>

          <div className="grid md:grid-cols-3 gap-8">
            {SCENES.map((scene, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                whileHover={{ y: -10 }}
                transition={{ duration: 0.3 }}
                className="group relative h-[400px] rounded-3xl overflow-hidden shadow-2xl"
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <img src={scene.image} alt={scene.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/40 to-transparent opacity-80" />
                </div>

                {/* Content */}
                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white mb-4 border border-white/30">
                    <scene.icon size={24} />
                  </div>
                  <div className="text-brand-gold text-xs font-bold tracking-widest uppercase mb-2">{scene.target}</div>
                  <h3 className="text-2xl font-serif font-bold mb-3 text-white">{scene.title}</h3>
                  <p className="text-stone-200 text-sm leading-relaxed opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    {scene.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Creator CTA --- */}
      <section id="creators" className="py-20 my-10">
        <div className="container mx-auto px-4 md:px-8">
          <div className="bg-brand-dark rounded-[3rem] p-8 md:p-16 relative overflow-hidden shadow-2xl">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/20 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6 text-white">
                  あなたの街の物語を、<br />
                  クエストにしませんか？
                </h2>
                <p className="text-stone-300 mb-8 leading-relaxed">
                  TOMOSHIBIでは、地域の魅力を知り尽くしたクリエイターや自治体、観光協会の方々とのパートナーシップを募集しています。<br />
                  眠っている歴史、知られざる名店、美しい風景を「謎解き」というエンターテインメントに乗せて、より多くの人に届けましょう。
                </p>
                <button 
                  onClick={goToCreatorPage}
                  className="bg-white text-brand-dark px-8 py-3 rounded-full hover:bg-brand-gold hover:text-white transition-all flex items-center gap-2 font-bold shadow-lg"
                >
                  <Sparkles size={18} />
                  ゲームを作る
                </button>
              </div>
              <div className="flex justify-center md:justify-end">
                <div className="relative w-64 h-64">
                   <div className="absolute inset-0 border-2 border-dashed border-stone-600 rounded-full animate-[spin_10s_linear_infinite]" />
                   <div className="absolute inset-4 border border-stone-700 rounded-full flex items-center justify-center bg-stone-700/50">
                      <div className="text-center p-4">
                        <MapPin className="mx-auto text-brand-gold mb-2" size={32} />
                        <span className="text-xs text-stone-400 block">Create Your<br/>Local Story</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section id="faq" className="py-24 bg-white/50">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl">
          <SectionHeading subtitle="TOMOSHIBIを始めるにあたって、よくいただく質問をまとめました。">
            FAQ
          </SectionHeading>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-xl overflow-hidden border border-stone-200 shadow-sm"
              >
                <button 
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-stone-50 transition-colors"
                >
                  <span className="font-bold text-brand-dark">{item.question}</span>
                  <ChevronDown 
                    size={20} 
                    className={`text-stone-400 transition-transform duration-300 ${openFaqIndex === idx ? 'rotate-180' : ''}`}
                  />
                </button>
                <div 
                  className={`px-6 text-stone-600 text-sm leading-relaxed bg-brand-base/30 transition-all duration-300 overflow-hidden ${
                    openFaqIndex === idx ? 'max-h-40 py-5 opacity-100' : 'max-h-0 py-0 opacity-0'
                  }`}
                >
                  {item.answer}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Pre-Registration Section (New) --- */}
      <section className="py-20 relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white border border-stone-200 rounded-3xl p-8 md:p-12 shadow-xl text-center relative overflow-hidden"
          >
             {/* Decorative Elements */}
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-dark via-brand-gold to-brand-dark" />
             <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-brand-gold/10 rounded-full blur-3xl" />
             <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-dark/5 rounded-full blur-3xl" />

             <div className="relative z-10">
                <div className="inline-flex items-center justify-center p-3 bg-brand-base rounded-full text-brand-gold mb-6">
                  <Mail size={24} />
                </div>
                <h3 className="text-2xl md:text-3xl font-serif font-bold text-brand-dark mb-4">
                  先行登録で、冒険の準備を。
                </h3>
                <p className="text-stone-600 mb-8 max-w-xl mx-auto">
                  アプリのリリース通知や、限定クエストの先行案内をお届けします。<br className="hidden md:block" />
                  メールアドレスだけで簡単にご登録いただけます。
                </p>

                {regStatus === 'success' ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-xl inline-flex items-center gap-2"
                  >
                    <CheckCircle size={20} />
                    <span>ご登録ありがとうございます！冒険の始まりをお待ちください。</span>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                    <input 
                      type="email" 
                      placeholder="メールアドレスを入力" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={regStatus === 'submitting'}
                      className="flex-1 px-5 py-3 rounded-full border border-stone-300 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition-all disabled:opacity-50"
                    />
                    <button 
                      type="submit" 
                      disabled={regStatus === 'submitting'}
                      className="bg-brand-dark text-white px-8 py-3 rounded-full font-bold hover:bg-brand-gold transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {regStatus === 'submitting' ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          登録する <Send size={16} />
                        </>
                      )}
                    </button>
                  </form>
                )}
                
                <p className="text-xs text-stone-400 mt-6">
                  ※ご登録いただいたメールアドレスは、本サービスのお知らせ以外には使用しません。
                </p>
             </div>
          </motion.div>
        </div>
      </section>
        </>
      )}

      <AnimatePresence>
        {showCreatorOnboarding && (
          <OnboardingModal 
            steps={CREATOR_ONBOARDING_STEPS}
            activeIndex={creatorOnboardingStep}
            onClose={closeCreatorOnboarding}
            onNext={handleOnboardingNext}
          />
        )}
      </AnimatePresence>


      <AnimatePresence>
        <InstallBar
          visible={shouldShowInstallBar}
          onPrimary={openAppCTA}
          onDismiss={dismissInstallBar}
          comingSoon={!hasStoreLink}
          onScrollNotify={handleScrollNotify}
        />
      </AnimatePresence>

      {/* --- Footer & Final CTA (shared, hide on creator pages) --- */}
      {activePage !== 'creator-mystery-setup' && activePage !== 'creator-workspace' && activePage !== 'creator-route-spots' && activePage !== 'creator-spot-detail' && activePage !== 'creator-storytelling' && (
        <footer id="contact" className="bg-brand-dark pt-20 pb-10 border-t border-brand-dark/50 mt-10">
          <div className="container mx-auto px-4 md:px-8">
            
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-6">
                TOMOSHIBIで、<br />
                いつもの街に灯をともそう。
              </h2>
              <button 
                onClick={goToQuestList}
                className="bg-brand-gold text-white px-10 py-4 rounded-full font-bold text-xl hover:bg-white hover:text-brand-dark transition-colors shadow-lg shadow-brand-gold/20"
              >
                クエストを探す
              </button>
              <div className="mt-8 flex justify-center gap-4 opacity-90 hover:opacity-100 transition-all duration-500 flex-wrap">
                {hasStoreLink ? (
                  <>
                    {APP_STORE_URL && (
                      <a
                        href={APP_STORE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="h-12 w-36 bg-white text-brand-dark rounded-lg flex items-center justify-center border border-stone-200 shadow-sm text-xs font-bold hover:shadow-md"
                      >
                        App Store
                      </a>
                    )}
                    {GOOGLE_PLAY_URL && (
                      <a
                        href={GOOGLE_PLAY_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="h-12 w-36 bg-white text-brand-dark rounded-lg flex items-center justify-center border border-stone-200 shadow-sm text-xs font-bold hover:shadow-md"
                      >
                        Google Play
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <div className="h-12 w-36 bg-stone-800/50 rounded-lg flex items-center justify-center border border-stone-600/50 cursor-not-allowed">
                      <span className="text-xs text-stone-400">App Store</span>
                    </div>
                    <div className="h-12 w-36 bg-stone-800/50 rounded-lg flex items-center justify-center border border-stone-600/50 cursor-not-allowed">
                      <span className="text-xs text-stone-400">Google Play</span>
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-2">
                {hasStoreLink ? 'App Store / Google Play からインストールできます' : '※アプリ版は近日公開予定。リリース通知はフォームから登録してください。'}
              </p>
            </div>

            <div className="border-t border-stone-700/50 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <TomoshibiLogo className="h-8 w-auto" color="#78716c" />
              </div>
              
              <div className="flex gap-6 text-sm text-stone-500">
                <a href="#" className="hover:text-white transition-colors">運営会社</a>
                <a href="#" className="hover:text-white transition-colors">プライバシーポリシー</a>
                <a href="#" className="hover:text-white transition-colors">利用規約</a>
                <a href="mailto:info@tomoshibi.app" className="hover:text-white transition-colors flex items-center gap-1">
                  <Mail size={14} /> お問い合わせ
                </a>
              </div>

              <div className="text-xs text-stone-600">
                &copy; {new Date().getFullYear()} TOMOSHIBI. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
const CreatorStartPage = ({
  selectedType,
  setSelectedType,
  onBack,
  onStart,
  onOpenOnboarding,
}: {
  selectedType: 'mystery' | 'social';
  setSelectedType: (val: 'mystery' | 'social') => void;
  onBack: () => void;
  onStart: () => void;
  onOpenOnboarding: () => void;
}) => {
  const socialIncludes = [
    { label: '没入感のあるストーリー', bold: false },
    { label: '街の謎とギミック', bold: false },
    { label: 'ソーシャルアクション', bold: true },
    { label: '地域への貢献', bold: true },
  ];

  return (
    <section className="pt-24 pb-14 bg-brand-base min-h-screen">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <button onClick={onBack} className="underline hover:text-brand-dark">戻る</button>
            <span className="text-stone-400">/</span>
            <span className="font-bold text-brand-dark">新規クエスト制作</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button onClick={onOpenOnboarding} className="text-brand-gold font-bold hover:underline">チュートリアルを見る</button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Guidelines */}
          <div className="bg-white/90 backdrop-blur border border-white/70 rounded-3xl p-6 md:p-8 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-brand-gold" />
              <p className="text-xs uppercase tracking-widest text-brand-gold font-bold">Before You Start</p>
            </div>
            <h2 className="text-2xl font-serif font-bold text-brand-dark mb-6">制作を始める前に</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-brand-dark mb-2">必要な視点 (Mindset)</h3>
                <ul className="space-y-2 text-sm text-stone-700 list-disc list-inside">
                  <li>街への好奇心を持つ：普段は見過ごしてしまう路地裏や、隠れた歴史に目を向けてみましょう。</li>
                  <li>課題をエンタメに変える発想：地域の困りごとを、プレイヤーが解決したくなる「ミッション」に変換できないか考えてみましょう。</li>
                </ul>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />

              <div>
                <h3 className="text-lg font-bold text-brand-dark mb-2">準備するもの (Preparation)</h3>
                <ul className="space-y-2 text-sm text-stone-700 list-disc list-inside">
                  <li>現地のロケハン：実際に歩いて、安全なルートや魅力的なスポットを確認してください。</li>
                  <li>ストーリーの種：街の雰囲気からインスピレーションを得た、オリジナルの物語の構想。</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right: Quest type (Mystery only) */}
          <div className="bg-white/95 backdrop-blur border border-white/70 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <p className="text-xs uppercase tracking-widest text-brand-gold font-bold">Quest Type</p>
              <div className="text-xs text-stone-500">本リリースでは「ミステリークエスト」のみ提供</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-inner space-y-2">
              <div className="flex items-center gap-2">
                <Compass className="text-brand-dark" size={18} />
                <h3 className="text-lg font-bold text-brand-dark">Mystery Quest</h3>
              </div>
              <p className="text-sm text-stone-700 leading-relaxed">
                ストーリーと謎解きに特化したスタンダードなフォーマットです。スポット設計とギミックの緩急で没入感を高めましょう。
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onStart}
                className="px-6 py-3 rounded-full bg-brand-dark text-white font-bold text-sm hover:bg-brand-gold transition-colors shadow-lg"
              >
                制作を開始する
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const CreatorMysterySetupPage = ({
  location,
  setLocation,
  title,
  setTitle,
  description,
  setDescription,
  onSaveNext,
  onBack,
  onLogoHome,
  onGoWorkspace,
  userId,
  questId,
  setQuestId,
  setQuestLatLng,
  questLatLng,
}: {
  location: string;
  setLocation: (val: string) => void;
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  onSaveNext: () => void;
  onBack: () => void;
  onLogoHome: () => void;
  onGoWorkspace: () => void;
  userId: string | null;
  questId: string | null;
  setQuestId: (id: string) => void;
  setQuestLatLng: (coords: { lat: number; lng: number }) => void;
  questLatLng: { lat: number; lng: number } | null;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 35.6804, lng: 139.769 });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingSuggest, setIsLoadingSuggest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const getZoomFromFeature = (feature: any) => {
    const types: string[] = feature?.place_type || [];
    if (feature?.bbox) return null; // bbox優先でfitBounds
    if (types.includes('country')) return 6;
    if (types.includes('region')) return 9;
    if (types.includes('place')) return 12;
    if (types.includes('locality')) return 13;
    if (types.includes('neighborhood')) return 14;
    return 15;
};

function PlayerAppPage({
  onBackHome,
  onGoCreators,
}: {
  onBackHome: () => void;
  onGoCreators: () => void;
}) {
  const [showInstallHint, setShowInstallHint] = useState(true);
  const playUrl = typeof window !== 'undefined' ? `${window.location.origin}${PWA_PLAY_PATH}` : PWA_PLAY_PATH;

  return (
    <section className="min-h-screen bg-white">
      <div className="border-b border-stone-200 bg-white sticky top-0 z-30">
        <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-6">
          <button onClick={onBackHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TomoshibiLogo className="h-8 w-auto" />
          </button>
          <div className="text-xs text-stone-500 font-bold">PWA Game Client</div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl border border-stone-200 bg-white shadow-sm p-4">
            <div className="aspect-[9/16] bg-stone-100 rounded-2xl flex items-center justify-center text-stone-400 text-sm">
              ゲームUI（マップ・謎・ストーリー）がここに表示されます
            </div>
          </div>
          <div className="rounded-3xl border border-stone-200 bg-white shadow-sm p-4 space-y-2">
            <p className="text-sm font-bold text-brand-dark">プレイ中のメモ</p>
            <p className="text-xs text-stone-600">PWAでホーム画面に追加するとフルスクリーンで遊べます。</p>
            <div className="text-xs text-stone-500 break-words">URL: {playUrl}</div>
          </div>
        </div>

        <div className="space-y-4">
          {showInstallHint && (
            <div className="rounded-2xl border border-brand-gold bg-brand-gold/10 text-sm text-brand-dark p-4 shadow">
              <div className="font-bold mb-1">ホーム画面に追加して遊ぶ</div>
              <p className="text-xs text-stone-700">
                ブラウザの共有メニューから「ホーム画面に追加」を選ぶと、次回からアプリのように /play から起動します。
              </p>
              <button
                onClick={() => setShowInstallHint(false)}
                className="mt-2 text-xs underline text-brand-gold"
              >
                閉じる
              </button>
            </div>
          )}
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-2">
            <p className="text-sm font-bold text-brand-dark">制作にも興味がありますか？</p>
            <button
              onClick={onGoCreators}
              className="px-4 py-2 rounded-full bg-brand-dark text-white text-sm font-bold hover:bg-brand-gold transition-colors"
            >
              クリエイター管理画面へ
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

  useEffect(() => {
    loadMaplibre()
      .then((maplibregl) => {
        if (!mapRef.current) return;
        mapInstanceRef.current = new maplibregl.Map({
          container: mapRef.current,
          style: MAPTILER_STYLE,
          center: [mapCenter.lng, mapCenter.lat],
          zoom: 11,
        });
        markerRef.current = new maplibregl.Marker({ color: '#d97706' })
          .setLngLat([mapCenter.lng, mapCenter.lat])
          .addTo(mapInstanceRef.current);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    mapInstanceRef.current.setCenter([mapCenter.lng, mapCenter.lat]);
    markerRef.current.setLngLat([mapCenter.lng, mapCenter.lat]);
  }, [mapCenter]);

  useEffect(() => {
    const controller = new AbortController();
    const q = location.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    setIsLoadingSuggest(true);
    fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${MAPTILER_KEY}&language=ja&limit=5`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setSuggestions(data?.features || []))
      .catch(() => setSuggestions([]))
      .finally(() => setIsLoadingSuggest(false));
    return () => controller.abort();
  }, [location]);

  useEffect(() => {
    if (questLatLng) {
      setMapCenter(questLatLng);
    }
  }, [questLatLng]);

  const handleSave = async () => {
    if (!userId) {
      setSaveError('ログインしてください');
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('quests')
        .upsert({
          id: questId || undefined,
          creator_id: userId,
          title,
          description,
          area_name: location,
          location_lat: mapCenter.lat,
          location_lng: mapCenter.lng,
          cover_image_url: '',
        })
        .select()
        .single();
      if (error) throw error;
      if (data?.id) {
        setQuestId(data.id);
        setQuestLatLng({ lat: mapCenter.lat, lng: mapCenter.lng });
        onSaveNext();
      }
    } catch (err: any) {
      setSaveError(err?.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="min-h-screen bg-white">
      <div className="border-b border-stone-200 bg-white">
        <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-6">
          <button onClick={onLogoHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TomoshibiLogo className="h-8 w-auto" />
          </button>
        </div>
        </div>

        <div className="grid lg:grid-cols-2 min-h-[calc(100vh-64px)]">
          {/* Form side */}
          <div className="px-4 md:px-12 py-12 space-y-8 overflow-y-auto h-[calc(100vh-96px)]">
            <div className="space-y-3">
              <h1 className="text-4xl font-serif font-bold text-brand-dark mb-1">基本情報を入力しよう</h1>
              <p className="text-base font-bold text-stone-700">🎉 クエスト制作を始めましょう！</p>
              <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
                あなたの物語の舞台となる場所を決めましょう。実際に現地調査に行ける、あなたにとって馴染み深いエリアを選ぶのが成功の秘訣です。
            </p>
          </div>

            <div className="space-y-6 max-w-2xl">
              {/* Location */}
            <div className="space-y-2 relative">
              <label className="text-sm font-extrabold text-brand-dark flex items-center gap-2">
                開催エリア (Location) <span>📍</span>
              </label>
              <p className="text-xs text-stone-500 mb-1">あなたが実際に歩いて調査できる場所を選んでください。</p>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="都市名や郵便番号で検索（例：大阪府貝塚市）"
                ref={inputRef}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
              {suggestions.length > 0 && (
                <div className="mt-2 rounded-2xl border border-stone-200 bg-white shadow-lg max-h-56 overflow-auto z-10">
                  {suggestions.map((feature) => (
                    <button
                      key={feature.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const [lng, lat] = feature?.center || [];
                        const label = feature?.place_name || '';
                        if (label) setLocation(label);
                        if (mapInstanceRef.current && feature?.bbox) {
                          const [minLng, minLat, maxLng, maxLat] = feature.bbox;
                          mapInstanceRef.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 80 });
                          setMapCenter({ lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 });
                        } else if (lat && lng) {
                          const zoom = getZoomFromFeature(feature);
                          mapInstanceRef.current?.jumpTo({ center: [lng, lat], zoom: zoom ?? mapInstanceRef.current.getZoom() });
                          setMapCenter({ lat, lng });
                        }
                        setSuggestions([]);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-brand-dark hover:bg-brand-base"
                    >
                      {feature?.place_name}
                    </button>
                  ))}
                  {isLoadingSuggest && (
                    <div className="px-4 py-2 text-xs text-stone-500">検索中...</div>
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-extrabold text-brand-dark flex items-center gap-2">
                クエストタイトル (Quest Title) <span>✏️</span>
              </label>
              <p className="text-xs text-stone-500 mb-1">プレイヤーが思わず参加したくなるような、謎めいたタイトルをつけましょう。</p>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="魅力的なタイトルを入力（例：二色浜と消えた記憶の灯火）"
                className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-extrabold text-brand-dark flex items-center gap-2">
                概要・ストーリー (Description) <span>📝</span>
              </label>
              <p className="text-xs text-stone-500">
                物語のプロローグ（導入）となる文章です。プレイヤーを世界観に引き込む「依頼文」や「挑戦状」のような書き出しがおすすめです。
              </p>
              <div className="rounded-2xl border border-stone-300 bg-white shadow-sm">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-stone-200 text-xs text-stone-500">
                  <button className="px-2.5 py-1.5 rounded-lg border border-stone-200 hover:border-brand-gold hover:text-brand-dark flex items-center gap-1">
                    <Bold size={14} />
                  </button>
                  <button className="px-2.5 py-1.5 rounded-lg border border-stone-200 hover:border-brand-gold hover:text-brand-dark flex items-center gap-1">
                    <List size={14} />
                  </button>
                  <button className="px-2.5 py-1.5 rounded-lg border border-stone-200 hover:border-brand-gold hover:text-brand-dark flex items-center gap-1">
                    <Quote size={14} />
                  </button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  placeholder="100年前からこの街に伝わる奇妙な噂…。あなたは探偵として、この街に隠された『失われた色』を取り戻す依頼を受けました。"
                  className="w-full px-4 py-3 rounded-b-2xl bg-white focus:outline-none text-sm text-brand-dark"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between max-w-2xl pt-2">
            <div className="text-xs text-stone-500">Step 1 of 4</div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-3 rounded-full bg-brand-dark text-white text-sm font-bold hover:bg-brand-gold transition-colors shadow-lg disabled:opacity-60"
            >
              {saving ? '保存中...' : '保存して次へ'}
            </button>
          </div>
          {saveError && <div className="text-sm text-red-600">{saveError}</div>}
        </div>

        {/* Map side */}
        <div className="relative bg-white border-l border-stone-200 h-[calc(100vh-64px)]">
          <div ref={mapRef} className="absolute inset-0 w-full h-full" />
          {!MAPTILER_KEY && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <p className="text-sm text-stone-600">MapTiler APIキーを設定してください (VITE_MAPTILER_KEY)</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
