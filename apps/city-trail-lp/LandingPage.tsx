import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MapPin,
  Smartphone,
  Clock,
  Users,
  ChevronDown,
  ChevronLeft,
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
  Pencil,
  Trash2,
  Info,
  GripVertical,
  Puzzle,
  Scroll,
  PlusCircle,
  Bell,
  LogOut,
  BarChart2,
  ArrowLeft,
  Search
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { LC, Language } from './LandingPageTranslations';
import PlayerGameView from './PlayerGameView';
import PlayerQuestList from './PlayerQuestList';
import PlayerQuestDetail from './PlayerQuestDetail';
import CreatorMultilingual from './CreatorMultilingual';
import QuestCreatorCanvas from './QuestCreatorCanvas';
import HeroGenerateSection from './HeroGenerateSection';
import { supabase } from './supabaseClient';
import AboutPage from './AboutPage';
import BusinessLandingPage from './BusinessLandingPage';
import QualityChecklistModal from './QualityChecklistModal';
import {
  QuestMode,
  QualityChecklist,
  QUEST_MODE_CONFIG,
} from './questCreatorTypes';
import { getModelEndpoint } from './lib/ai/model-config';

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
  gameplayEvents,
  feedbackStats,
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
  // Gameplay events analytics
  gameplayEvents?: {
    dropOffByMode: { mode: string; count: number }[];
    puzzleErrorRate: { spotName: string; totalSubmits: number; wrongSubmits: number; rate: number }[];
    arrivalFailRate: number;
    hintUsageRate: number;
  } | null;
  // Feedback statistics
  feedbackStats?: {
    total: number;
    byCategory: { category: string; count: number; label: string }[];
    recent: { category: string; message: string | null; created_at: string }[];
  } | null;
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
                className={`px-3 py-1 rounded-full border text-sm ${analyticsFilter === f
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-auto">
              <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-brand-dark to-brand-gold px-6 py-5 flex items-center justify-between">
                  <div className="text-white">
                    <p className="text-xs text-white/70 font-medium tracking-wider uppercase">クエスト分析</p>
                    <h3 className="text-xl font-bold mt-1">
                      {detailQuestAnalytics.title || 'クエスト詳細'}
                    </h3>
                  </div>
                  <button
                    onClick={() => onOpenDetail?.('', '')}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    aria-label="閉じる"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {detailLoading && (
                    <div className="text-center py-8 text-stone-500">
                      <div className="inline-block w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mb-2" />
                      <p>読み込み中...</p>
                    </div>
                  )}

                  {/* Summary Stats - Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 text-center shadow-sm">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-amber-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-brand-dark">{detailQuestAnalytics.summary.playCount}</p>
                      <p className="text-xs text-amber-700 font-medium mt-1">プレイ数</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 text-center shadow-sm">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-brand-dark">{detailQuestAnalytics.summary.clearRate}%</p>
                      <p className="text-xs text-emerald-700 font-medium mt-1">クリア率</p>
                    </div>

                    <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-4 text-center shadow-sm">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-sky-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-brand-dark">{formatMinutes(detailQuestAnalytics.summary.avgDurationMin)}</p>
                      <p className="text-xs text-sky-700 font-medium mt-1">平均時間</p>
                    </div>

                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-4 text-center shadow-sm">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-violet-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-brand-dark">
                        {(detailQuestAnalytics.summary.avgHints ?? '—')}<span className="text-sm text-stone-400">/</span>{detailQuestAnalytics.summary.avgWrongs ?? '—'}
                      </p>
                      <p className="text-xs text-violet-700 font-medium mt-1">ヒント / 誤答</p>
                    </div>

                    <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-4 text-center shadow-sm">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-rose-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-brand-dark">
                        {detailQuestAnalytics.reviews.avgRating != null ? `★${detailQuestAnalytics.reviews.avgRating}` : '—'}
                      </p>
                      <p className="text-xs text-rose-700 font-medium mt-1">評価 ({detailQuestAnalytics.reviews.count}件)</p>
                    </div>
                  </div>

                  {/* Step Funnel Analysis */}
                  <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200">
                    <h4 className="font-bold text-brand-dark mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      ステップ別ファネル分析
                    </h4>
                    <div className="space-y-3">
                      {detailQuestAnalytics.steps.map((s, idx) => {
                        const completionRate = Math.min(100, Math.max(0, s.completed / Math.max(1, s.reached) * 100));
                        const dropRatePercent = Math.round(s.dropRate * 100);
                        const isHighDrop = dropRatePercent > 30;

                        return (
                          <div key={s.step} className="relative">
                            {/* Connecting line */}
                            {idx < detailQuestAnalytics.steps.length - 1 && (
                              <div className="absolute left-5 top-[52px] w-0.5 h-4 bg-stone-200" />
                            )}
                            <div className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${isHighDrop ? 'bg-rose-50 border border-rose-200' : 'bg-white border border-stone-200'}`}>
                              {/* Step number */}
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isHighDrop ? 'bg-rose-100 text-rose-700' : 'bg-brand-gold/20 text-brand-gold'}`}>
                                {s.step}
                              </div>

                              {/* Step info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-brand-dark truncate">{s.name}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  {/* Progress bar */}
                                  <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${isHighDrop ? 'bg-rose-400' : 'bg-emerald-500'}`}
                                      style={{ width: `${completionRate}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-stone-500 whitespace-nowrap">
                                    {s.completed}/{s.reached}
                                  </span>
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-3 text-xs">
                                <div className={`px-2 py-1 rounded-lg ${isHighDrop ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-stone-100 text-stone-600'}`}>
                                  離脱 {dropRatePercent}%
                                </div>
                                <div className="text-stone-500">
                                  ヒント {s.avgHints ?? '—'}
                                </div>
                                <div className="text-stone-500">
                                  誤答 {s.avgWrongs ?? '—'}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Gameplay Events & Feedback Section */}
                  {(detailQuestAnalytics.gameplayEvents || detailQuestAnalytics.feedbackStats) && (
                    <div className="bg-rose-50/50 rounded-2xl p-5 border border-rose-200">
                      <h4 className="font-bold text-brand-dark mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        行動分析・フィードバック
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Drop-off by Mode */}
                        {detailQuestAnalytics.gameplayEvents?.dropOffByMode && detailQuestAnalytics.gameplayEvents.dropOffByMode.length > 0 && (
                          <div className="bg-white/80 rounded-xl p-3 border border-rose-100">
                            <p className="text-xs font-bold text-rose-700 mb-2">画面別離脱</p>
                            <div className="space-y-1.5">
                              {detailQuestAnalytics.gameplayEvents.dropOffByMode.map((item: any) => {
                                const modeLabels: Record<string, string> = { travel: '移動中', story: 'ストーリー', puzzle: '謎解き', epilogue: 'エピローグ' };
                                const label = modeLabels[item.mode] || item.mode;
                                const maxCount = Math.max(...detailQuestAnalytics.gameplayEvents!.dropOffByMode.map((d: any) => d.count));
                                const pct = maxCount > 0 ? (item.count / maxCount * 100) : 0;
                                return (
                                  <div key={item.mode} className="flex items-center gap-2">
                                    <div className="w-16 text-xs text-rose-600">{label}</div>
                                    <div className="flex-1 h-3 bg-rose-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-rose-400 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="text-xs font-bold text-rose-700 w-6 text-right">{item.count}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Puzzle Error Rates */}
                        {detailQuestAnalytics.gameplayEvents?.puzzleErrorRate && detailQuestAnalytics.gameplayEvents.puzzleErrorRate.length > 0 && (
                          <div className="bg-white/80 rounded-xl p-3 border border-orange-100">
                            <p className="text-xs font-bold text-orange-700 mb-2">誤答率が高いスポット</p>
                            <div className="space-y-1">
                              {detailQuestAnalytics.gameplayEvents.puzzleErrorRate.slice(0, 3).map((spot: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-stone-600 truncate max-w-[150px]">{spot.spotName}</span>
                                  <span className={`px-1.5 py-0.5 rounded-lg font-bold ${spot.rate > 0.5 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {Math.round(spot.rate * 100)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* User Feedback */}
                        {detailQuestAnalytics.feedbackStats && detailQuestAnalytics.feedbackStats.total > 0 && (
                          <div className="md:col-span-2 bg-white/80 rounded-xl p-3 border border-violet-100">
                            <p className="text-xs font-bold text-violet-700 mb-2">
                              ユーザー報告 ({detailQuestAnalytics.feedbackStats.total}件)
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {detailQuestAnalytics.feedbackStats.byCategory.map((cat: any) => (
                                <span key={cat.category} className="px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded-lg">
                                  {cat.label}: {cat.count}
                                </span>
                              ))}
                            </div>
                            {detailQuestAnalytics.feedbackStats.recent.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-violet-100 space-y-1">
                                {detailQuestAnalytics.feedbackStats.recent.slice(0, 2).map((fb: any, idx: number) => (
                                  <div key={idx} className="text-xs text-stone-600">
                                    <span className="text-violet-600 font-medium">{fb.category}</span>
                                    {fb.message && <span>: "{fb.message}"</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
  reviewList?: { id: string; rating: number; name: string; date: string; comment: string }[];
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

interface AiDraftInput {
  area: string;
  theme: string;
  difficulty: string;
  target: string;
  targetLanguages: string[];
  notes: string;
  // Advanced settings
  spotCount?: string;
  estimatedPlayTime?: string;
  artStyle?: string;
  storyTone?: string;
  characterCount?: string;
  specialRequirements?: string;
  includeSpots?: string; // 特定のスポットを含める
  challengeTypes?: string[]; // 謎、クイズ、ミッション
}

interface AiDialogueLine {
  speakerType: 'character' | 'narrator';
  speakerName: string;
  text: string;
}

interface AiDraftSpot {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  directions?: string;
  storyText?: string;
  challengeText?: string;
  hints?: string[];
  answer?: string;
  acceptableAnswers?: string[];
  successMessage?: string;
  preDialogue?: AiDialogueLine[];
  postDialogue?: AiDialogueLine[];
}

interface AiDraftStory {
  castName?: string;
  castTone?: string;
  prologueTitle?: string;
  prologueBody?: string;
  epilogueBody?: string;
  characters?: { id?: string; name?: string; role?: string; color?: string; tone?: string }[];
  scenario?: { id?: string; type?: string; content?: string; speaker?: string; name?: string }[];
}

interface AiDraftResult {
  title?: string;
  description?: string;
  area?: string;
  difficulty?: string;
  target?: string;
  tags?: string[];
  routeSpots?: AiDraftSpot[];
  story?: AiDraftStory;
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
  { label: 'TOMOSHIBIについて', href: '/about' },
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
    key: 'ai',
    title: 'AI自動生成',
    description: 'ストーリー・謎・ヒント・キャラクター会話をAIが自動生成。アイデアから完成まで最速で制作。',
    icon: Sparkles,
    accent: 'from-violet-500 to-purple-600',
    size: 'large',
    mockVisual: (
      <div className="w-full h-full p-6 flex flex-col justify-center gap-4">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-stone-200 flex-shrink-0" />
          <div className="bg-white border border-stone-100 rounded-2xl rounded-tl-none p-3 shadow-sm text-xs text-stone-600 max-w-[80%]">
            鎌倉を舞台にしたミステリーのプロットを作って
          </div>
        </div>
        <div className="flex gap-3 flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Sparkles size={14} className="text-white" />
          </div>
          <div className="bg-violet-50 border border-violet-100 rounded-2xl rounded-tr-none p-3 shadow-sm text-xs text-stone-700 max-w-[90%]">
            <p className="font-bold text-violet-700 mb-1">タイトル：古都の影と消えた時計</p>
            100年前の未解決事件が、現代の鎌倉で再び動き出す...
          </div>
        </div>
        <div className="flex gap-2 justify-center mt-2">
          <div className="w-20 h-2 bg-stone-100 rounded-full animate-pulse" />
          <div className="w-12 h-2 bg-stone-100 rounded-full animate-pulse delay-75" />
        </div>
      </div>
    )
  },
  {
    key: 'spots',
    title: 'スポット設計',
    description: '地図上で直感的にスポットを配置。道順・ヒント・正解条件を細かく設定。',
    icon: MapPin,
    accent: 'from-amber-500 to-orange-600',
    size: 'normal',
    mockVisual: (
      <div className="w-full h-full relative overflow-hidden bg-stone-100">
        {/* Mock Map */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#a8a29e 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

        {/* Route Line */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <path d="M 80 150 Q 150 80 220 120" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 4" />
        </svg>

        {/* Pins */}
        <div className="absolute top-[140px] left-[70px] flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-white border-4 border-amber-500 shadow-lg flex items-center justify-center text-xs font-bold text-stone-700">1</div>
          <div className="bg-white px-2 py-1 rounded shadow text-[10px] font-bold mt-1 text-stone-600">Start</div>
        </div>

        <div className="absolute top-[110px] left-[210px] flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-amber-500 shadow-lg flex items-center justify-center text-white">
            <MapPin size={16} />
          </div>
          <div className="bg-white px-2 py-1 rounded shadow text-[10px] font-bold mt-1 text-stone-600">Spot 2</div>
        </div>

        {/* Add Button */}
        <div className="absolute bottom-4 right-4 bg-white p-2 rounded-full shadow-lg border border-stone-100">
          <div className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-white text-lg leading-none pb-1">+</div>
        </div>
      </div>
    )
  },
  {
    key: 'multilingual',
    title: '多言語対応',
    description: '日本語・英語・韓国語に対応。AI翻訳でインバウンドにもリーチ。',
    icon: Globe2,
    accent: 'from-sky-500 to-blue-600',
    size: 'normal',
    mockVisual: (
      <div className="w-full h-full p-8 flex flex-col items-center justify-center gap-4">
        <div className="w-full bg-white border border-stone-200 rounded-xl p-4 shadow-sm relative">
          <div className="absolute -top-3 -right-2 bg-brand-dark text-white text-[10px] px-2 py-0.5 rounded-full">Source</div>
          <p className="text-sm font-bold text-stone-800">謎を解いてください</p>
        </div>

        <div className="flex gap-2">
          <div className="w-1 h-8 border-l-2 border-dashed border-sky-400"></div>
        </div>

        <div className="w-full grid grid-cols-2 gap-3">
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 relative">
            <div className="absolute -top-2 left-2 bg-sky-500 text-white text-[9px] px-1.5 rounded">EN</div>
            <p className="text-xs font-medium text-sky-900 mt-1">Solve the puzzle</p>
          </div>
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 relative">
            <div className="absolute -top-2 left-2 bg-sky-500 text-white text-[9px] px-1.5 rounded">KO</div>
            <p className="text-xs font-medium text-sky-900 mt-1">수수께끼를 풀어라</p>
          </div>
        </div>
      </div>
    )
  },
  {
    key: 'analytics',
    title: 'プレイ分析',
    description: '参加数・クリア率・離脱ポイントを可視化。データドリブンで収益最大化。',
    icon: BarChart2,
    accent: 'from-emerald-500 to-teal-600',
    size: 'normal',
    mockVisual: (
      <div className="w-full h-full p-6 flex flex-col justify-end">
        <div className="flex justify-between items-end gap-2 h-32">
          <div className="w-1/4 bg-emerald-100 rounded-t-lg relative group">
            <div className="absolute bottom-0 w-full bg-emerald-400 rounded-t-lg transition-all duration-1000" style={{ height: '60%' }}></div>
          </div>
          <div className="w-1/4 bg-emerald-100 rounded-t-lg relative group">
            <div className="absolute bottom-0 w-full bg-emerald-500 rounded-t-lg transition-all duration-1000 delay-100" style={{ height: '85%' }}></div>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              1,234 plays
            </div>
          </div>
          <div className="w-1/4 bg-emerald-100 rounded-t-lg relative">
            <div className="absolute bottom-0 w-full bg-emerald-400 rounded-t-lg transition-all duration-1000 delay-200" style={{ height: '45%' }}></div>
          </div>
          <div className="w-1/4 bg-emerald-100 rounded-t-lg relative">
            <div className="absolute bottom-0 w-full bg-emerald-300 rounded-t-lg transition-all duration-1000 delay-300" style={{ height: '70%' }}></div>
          </div>
        </div>
        <div className="h-px bg-emerald-200 mt-2 w-full"></div>
        <div className="flex justify-between text-[10px] text-stone-400 mt-1">
          <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span>
        </div>
      </div>
    )
  },
];

const CREATOR_STEPS = [
  { step: 1, title: 'Create', description: '世界観・謎・演出をワークシートで設計。AIがコンテンツ生成をサポート。' },
  { step: 2, title: 'Set Spot', description: 'マップにチェックイン地点を配置。写真やヒントをセットし導線を確認。' },
  { step: 3, title: 'Publish', description: 'テストプレイ後に公開。プレイ数に応じて収益が自動計算されます。' },
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
      <path d="M16 0C7.2 0 0 7.2 0 16C0 22.1 3.4 27.3 8.3 30V36H23.7V30C28.6 27.3 32 22.1 32 16C32 7.2 24.8 0 16 0Z" fill={color} />
      {/* Flame Shape */}
      <path d="M16 26C16 26 21 20 21 14C21 11 19 9 16 6C13 9 11 11 11 14C11 20 16 26 16 26Z" fill="#fbbf24" />
      {/* Rays/Sparks */}
      <path d="M16 3V5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 6L10.5 7.5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      <path d="M23 6L21.5 7.5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
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

const RevenueSimulator = ({ t }: { t: typeof LC.ja.creatorsPage.revenueSimulator }) => {
  const [data, setData] = useState({ plays: 100, price: 500 });
  const revenue = Math.floor(data.plays * data.price * 0.7);

  return (
    <div className="py-24 relative overflow-hidden bg-stone-900 text-white">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Controls */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/20 text-brand-gold text-xs font-bold mb-6 border border-brand-gold/30">
                <Coins size={14} />
                {t.badge}
              </div>
              <h3 className="text-3xl md:text-4xl font-serif font-bold mb-6">
                {t.title} <br />
                <span className="text-stone-400"> {t.subtitle}</span>
              </h3>
              <p className="text-stone-400 mb-10 leading-relaxed">
                {t.description}
              </p>

              <div className="space-y-8">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <div className="flex justify-between text-sm font-bold mb-4">
                    <span className="text-stone-300">{t.monthlyPlayers}</span>
                    <span className="text-brand-gold">{data.plays.toLocaleString()} {t.people}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="2000"
                    step="10"
                    value={data.plays}
                    onChange={(e) => setData({ ...data, plays: parseInt(e.target.value) })}
                    className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-brand-gold"
                  />
                </div>

                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <div className="flex justify-between text-sm font-bold mb-4">
                    <span className="text-stone-300">{t.questPrice}</span>
                    <span className="text-brand-gold">¥{data.price}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={data.price}
                    onChange={(e) => setData({ ...data, price: parseInt(e.target.value) })}
                    className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-brand-gold"
                  />
                </div>
              </div>
            </div>

            {/* Result Display */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/20 to-transparent blur-3xl rounded-full" />
              <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-8 md:p-12 text-center shadow-2xl">
                <p className="text-stone-400 text-sm font-bold uppercase tracking-wider mb-2">{t.estimatedIncome}</p>
                <div className="flex items-center justify-center gap-1 mb-2">
                  <span className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-400 font-serif tracking-tight">
                    ¥{revenue.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mb-8 border-b border-white/10 pb-8">
                  {t.disclaimer}
                </p>

                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <div className="text-xs text-stone-400 mb-1">{t.annualPotential}</div>
                    <div className="text-xl font-bold text-white">¥{(revenue * 12).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-400 mb-1">{t.creatorShare}</div>
                    <div className="text-xl font-bold text-emerald-400">70%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Premium Feature Spotlight with Interactive Tabs
const FeatureSpotlight = ({ t }: { t: typeof LC.ja.creatorsPage.features }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Generate features from translations
  const creatorFeatures = [
    {
      key: 'ai',
      title: t.tabs[0].title,
      description: t.tabs[0].description,
      icon: Sparkles,
      accent: 'from-violet-500 to-purple-600',
      size: 'large' as const,
      mockVisual: (
        <div className="w-full h-full p-6 flex flex-col justify-center gap-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-stone-200 flex-shrink-0" />
            <div className="bg-white border border-stone-100 rounded-2xl rounded-tl-none p-3 shadow-sm text-xs text-stone-600 max-w-[80%]">
              {t.tabs[0].promptExample}
            </div>
          </div>
          <div className="flex gap-3 flex-row-reverse">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-2xl rounded-tr-none p-3 shadow-sm text-xs text-stone-700 max-w-[90%]">
              <p className="font-bold text-violet-700 mb-1">{t.tabs[0].responseTitle}</p>
              {t.tabs[0].responseText}
            </div>
          </div>
          <div className="flex gap-2 justify-center mt-2">
            <div className="w-20 h-2 bg-stone-100 rounded-full animate-pulse" />
            <div className="w-12 h-2 bg-stone-100 rounded-full animate-pulse delay-75" />
          </div>
        </div>
      )
    },
    {
      key: 'spots',
      title: t.tabs[1].title,
      description: t.tabs[1].description,
      icon: MapPin,
      accent: 'from-amber-500 to-orange-600',
      size: 'normal' as const,
      mockVisual: (
        <div className="w-full h-full relative overflow-hidden bg-stone-100">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#a8a29e 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path d="M 80 150 Q 150 80 220 120" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 4" />
          </svg>
          <div className="absolute top-[140px] left-[70px] flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-white border-4 border-amber-500 shadow-lg flex items-center justify-center text-xs font-bold text-stone-700">1</div>
            <div className="bg-white px-2 py-1 rounded shadow text-[10px] font-bold mt-1 text-stone-600">Start</div>
          </div>
          <div className="absolute top-[110px] left-[210px] flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-amber-500 shadow-lg flex items-center justify-center text-white">
              <MapPin size={16} />
            </div>
            <div className="bg-white px-2 py-1 rounded shadow text-[10px] font-bold mt-1 text-stone-600">Spot 2</div>
          </div>
          <div className="absolute bottom-4 right-4 bg-white p-2 rounded-full shadow-lg border border-stone-100">
            <div className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-white text-lg leading-none pb-1">+</div>
          </div>
        </div>
      )
    },
    {
      key: 'multilingual',
      title: t.tabs[2].title,
      description: t.tabs[2].description,
      icon: Globe2,
      accent: 'from-sky-500 to-blue-600',
      size: 'normal' as const,
      mockVisual: (
        <div className="w-full h-full p-8 flex flex-col items-center justify-center gap-4">
          <div className="w-full bg-white border border-stone-200 rounded-xl p-4 shadow-sm relative">
            <div className="absolute -top-3 -right-2 bg-brand-dark text-white text-[10px] px-2 py-0.5 rounded-full">{t.tabs[2].sourceLabel}</div>
            <p className="text-sm font-bold text-stone-800">{t.tabs[2].sourceText}</p>
          </div>
          <div className="flex gap-2">
            <div className="w-1 h-8 border-l-2 border-dashed border-sky-400"></div>
          </div>
          <div className="w-full grid grid-cols-2 gap-3">
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 relative">
              <div className="absolute -top-2 left-2 bg-sky-500 text-white text-[9px] px-1.5 rounded">EN</div>
              <p className="text-xs font-medium text-sky-900 mt-1">{t.tabs[2].enText}</p>
            </div>
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 relative">
              <div className="absolute -top-2 left-2 bg-sky-500 text-white text-[9px] px-1.5 rounded">KO</div>
              <p className="text-xs font-medium text-sky-900 mt-1">{t.tabs[2].koText}</p>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'analytics',
      title: t.tabs[3].title,
      description: t.tabs[3].description,
      icon: BarChart2,
      accent: 'from-emerald-500 to-teal-600',
      size: 'normal' as const,
      mockVisual: (
        <div className="w-full h-full p-6 flex flex-col justify-end">
          <div className="flex justify-between items-end gap-2 h-32">
            <div className="w-1/4 bg-emerald-100 rounded-t-lg relative group">
              <div className="absolute bottom-0 w-full bg-emerald-400 rounded-t-lg transition-all duration-1000" style={{ height: '60%' }}></div>
            </div>
            <div className="w-1/4 bg-emerald-100 rounded-t-lg relative group">
              <div className="absolute bottom-0 w-full bg-emerald-500 rounded-t-lg transition-all duration-1000 delay-100" style={{ height: '85%' }}></div>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                1,234 {t.tabs[3].playsLabel}
              </div>
            </div>
            <div className="w-1/4 bg-emerald-100 rounded-t-lg relative">
              <div className="absolute bottom-0 w-full bg-emerald-400 rounded-t-lg transition-all duration-1000 delay-200" style={{ height: '45%' }}></div>
            </div>
            <div className="w-1/4 bg-emerald-100 rounded-t-lg relative">
              <div className="absolute bottom-0 w-full bg-emerald-300 rounded-t-lg transition-all duration-1000 delay-300" style={{ height: '70%' }}></div>
            </div>
          </div>
          <div className="h-px bg-emerald-200 mt-2 w-full"></div>
          <div className="flex justify-between text-[10px] text-stone-400 mt-1">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span>
          </div>
        </div>
      )
    },
  ];

  const activeFeature = creatorFeatures[activeIndex];

  return (
    <div className="mb-20">
      <SectionHeading subtitle={t.subtitle}>
        {t.title}
      </SectionHeading>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-5xl mx-auto"
      >
        {/* Main Container with glass effect */}
        <div className="relative rounded-3xl bg-gradient-to-br from-white/90 via-white/80 to-stone-50/90 backdrop-blur-xl border border-white/60 shadow-2xl overflow-hidden">
          {/* Decorative gradient orbs */}
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-violet-200/40 to-purple-300/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-br from-amber-200/40 to-orange-300/30 rounded-full blur-3xl" />

          <div className="relative grid grid-cols-1 md:grid-cols-[260px,1fr] min-h-[450px]">
            {/* Left: Tab Navigation */}
            <div className="relative border-b md:border-b-0 md:border-r border-stone-200/60 p-4 md:p-6 bg-white/40">
              <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 no-scrollbar">
                {creatorFeatures.map((feature, idx) => (
                  <button
                    key={feature.key}
                    onClick={() => setActiveIndex(idx)}
                    className={`group w-full text-left p-3 md:p-4 rounded-xl transition-all duration-300 relative flex-shrink-0 md:flex-shrink ${activeIndex === idx
                      ? 'bg-white shadow-md ring-1 ring-stone-900/5'
                      : 'hover:bg-white/50 text-stone-600'
                      }`}
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${activeIndex === idx
                        ? `bg-gradient-to-br ${feature.accent} text-white shadow-sm`
                        : 'bg-stone-100 text-stone-400 group-hover:bg-stone-200'
                        }`}>
                        <feature.icon size={18} />
                      </div>
                      <span className={`font-bold text-sm md:text-base whitespace-nowrap ${activeIndex === idx ? 'text-brand-dark' : 'text-stone-500'}`}>
                        {feature.title}
                      </span>
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Right: Content Display */}
            <div className="p-6 md:p-10 lg:p-12 relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature.key}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="h-full grid lg:grid-cols-2 gap-8 items-center"
                >
                  {/* Content Side */}
                  <div className="relative z-10">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${activeFeature.accent} flex items-center justify-center mb-6 shadow-lg rotate-3`}
                    >
                      <activeFeature.icon size={28} className="text-white" />
                    </motion.div>

                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-2xl md:text-3xl font-bold text-brand-dark mb-4 tracking-tight"
                    >
                      {activeFeature.title}
                    </motion.h3>

                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-stone-600 leading-relaxed font-medium mb-8"
                    >
                      {activeFeature.description}
                    </motion.p>

                    {/* Learn More Link (Mock) */}
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="inline-flex items-center gap-2 text-brand-dark font-bold text-sm group"
                    >
                      詳しく見る
                      <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-brand-gold group-hover:text-white transition-colors">
                        <ArrowRight size={14} />
                      </div>
                    </motion.button>
                  </div>

                  {/* Visual Side */}
                  <div className="relative h-[250px] lg:h-[350px] w-full">
                    <div className="absolute inset-0 bg-stone-50 rounded-2xl border border-stone-100 overflow-hidden shadow-inner translate-x-4 translate-y-4 lg:translate-x-0 lg:translate-y-0">
                      {/* Abstract Decoration */}
                      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${activeFeature.accent} opacity-10 blur-2xl rounded-full translate-x-10 -translate-y-10`}></div>

                      {/* Render Mock Visual */}
                      <div className="relative z-10 w-full h-full">
                        {activeFeature.mockVisual}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const AppCtaButtons = ({
  onPrimary,
  onSecondary,
  onScrollNotify,
  hasStoreLink,
  comingSoon,
  install,
}: {
  onPrimary: () => void;
  onSecondary: () => void;
  onScrollNotify: () => void;
  hasStoreLink: boolean;
  comingSoon: boolean;
  install: {
    downloadApp: string;
    startPuzzle: string;
    viewQuestsBrowser: string;
    storeAvailable: string;
  };
}) => (
  <div className="flex flex-col sm:flex-row gap-3">
    <button
      onClick={comingSoon ? onScrollNotify : onPrimary}
      className="flex-1 bg-brand-dark text-white px-6 py-3 rounded-full font-bold text-sm md:text-base hover:bg-brand-gold hover:text-white transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
    >
      {comingSoon ? install.downloadApp : install.startPuzzle}
      {comingSoon ? <Smartphone size={18} /> : <PlayCircle size={18} />}
    </button>
    <button
      onClick={onSecondary}
      className="flex-1 border border-stone-300 text-brand-dark px-6 py-3 rounded-full font-bold text-sm md:text-base hover:border-brand-gold hover:text-brand-gold transition-colors"
    >
      {install.viewQuestsBrowser}
    </button>
    {hasStoreLink && (
      <div className="flex items-center gap-2 justify-center text-[11px] text-stone-500">
        <span className="px-2 py-1 rounded-full bg-brand-base text-brand-dark border border-stone-200">{install.storeAvailable}</span>
      </div>
    )}
  </div>
);

const AppFeaturePills = ({ pills }: { pills: string[] }) => {
  const ICONS = [MapPin, Shield, Users, Star];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
      {pills.map((label, idx) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.05 }}
          className="flex items-center gap-3 bg-white/70 border border-stone-200 rounded-2xl px-4 py-3 shadow-sm"
        >
          <div className="p-2 rounded-xl bg-brand-base text-brand-gold">
            {React.createElement(ICONS[idx] || Star, { size: 18 })}
          </div>
          <span className="text-sm font-bold text-brand-dark">{label}</span>
        </motion.div>
      ))}
    </div>
  );
};

const QuestAppPromoBanner = ({
  onPrimary,
  comingSoon,
  onScrollNotify,
  install,
}: {
  onPrimary: () => void;
  comingSoon: boolean;
  onScrollNotify: () => void;
  install: {
    downloadApp: string;
    mobileAppBetter: string;
    mobileAppDesc: string;
    playWithApp: string;
  };
}) => (
  <div className="rounded-2xl border border-brand-dark/10 bg-white shadow-sm p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-xl bg-brand-base text-brand-gold shadow-inner">
        <Smartphone size={18} />
      </div>
      <div>
        <p className="text-sm font-bold text-brand-dark">{install.mobileAppBetter}</p>
        <p className="text-xs text-stone-600">
          {install.mobileAppDesc}
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
        {comingSoon ? install.downloadApp : install.playWithApp}
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
  onDeleteQuest,
  t,
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
  onDeleteQuest: (quest: any) => void;
  t: {
    home: string;
    myPage: string;
    exploreTomoshibi: string;
    createNewQuest: string;
    logout?: string;
    questsCreated: string;
    playHistory: string;
    statsDashboard: string;
    notificationSettings: string;
    receiveEmailNotifications: string;
    yourQuests: string;
    questsCount: (count: number) => string;
    noQuestsYet: string;
    emptyStateMessage: string;
    createFirstQuest: string;
    untitledQuest: string;
    noArea: string;
    edit: string;
    analytics: string;
    delete?: string;
  };
}) => {
  const initials = email.charAt(0).toUpperCase();
  const hasQuests = quests.length > 0;

  return (
    <section className="min-h-screen bg-gradient-to-br from-brand-base via-white to-brand-base/50 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-brand-gold/30 rounded-full"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.3}s`
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 md:px-8 pt-28 pb-16 relative z-10">

        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-stone-500 mb-8"
        >
          <button onClick={onBackHome} className="hover:text-brand-dark transition-colors flex items-center gap-1">
            <ChevronLeft size={16} />
            {t.home}
          </button>
          <span className="text-stone-300">/</span>
          <span className="text-brand-dark font-bold">{t.myPage}</span>
        </motion.div>

        {/* Hero Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-8 md:p-10 shadow-2xl shadow-stone-200/50 mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Avatar with animated ring */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-gold via-amber-400 to-orange-500 rounded-full blur-md opacity-50 animate-pulse" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-brand-dark to-stone-700 text-white flex items-center justify-center text-3xl md:text-4xl font-serif font-bold shadow-xl ring-4 ring-white">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-3 border-white flex items-center justify-center">
                <CheckCircle size={14} className="text-white" />
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-brand-gold/20 to-amber-100 text-brand-gold text-xs font-bold uppercase tracking-wider border border-brand-gold/20">
                  {hasQuests ? 'Creator' : 'Explorer'}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-brand-dark mb-1">{email}</h1>
              <p className="text-stone-500 text-sm">{t.exploreTomoshibi}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpenOnboarding}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-dark to-stone-700 text-white text-sm font-bold hover:shadow-xl hover:shadow-brand-dark/20 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                {t.createNewQuest}
              </motion.button>
              <button
                onClick={onLogout}
                className="px-4 py-2 rounded-xl text-sm text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center gap-1"
              >
                <LogOut size={14} />
                {t.logout || 'ログアウト'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats & Quests Grid */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Quick Stats Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1 space-y-4"
          >
            {/* Quests Count */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-gold/20 to-amber-100 flex items-center justify-center">
                  <Compass size={24} className="text-brand-gold" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-brand-dark">{quests.length}</p>
                  <p className="text-xs text-stone-500 font-medium">{t.questsCreated}</p>
                </div>
              </div>
            </div>

            {/* Coming Soon - Activity */}
            <div className="bg-white/50 backdrop-blur border border-stone-200/50 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-400 text-[10px] font-bold">Coming Soon</span>
              </div>
              <div className="flex items-center gap-4 opacity-60">
                <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center">
                  <BarChart2 size={24} className="text-stone-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-stone-400">{t.playHistory}</p>
                  <p className="text-xs text-stone-400">{t.statsDashboard}</p>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-2xl p-6 shadow-lg">
              <h3 className="text-sm font-bold text-brand-dark mb-3 flex items-center gap-2">
                <Bell size={16} className="text-brand-gold" />
                {t.notificationSettings}
              </h3>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded-md border-2 border-stone-300 text-brand-gold accent-brand-gold focus:ring-brand-gold/20 transition-all"
                />
                <span className="text-sm text-stone-600 group-hover:text-brand-dark transition-colors">{t.receiveEmailNotifications}</span>
              </label>
            </div>
          </motion.div>

          {/* Quests List Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-2xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                  <Map size={18} className="text-brand-gold" />
                  {t.yourQuests}
                </h3>
                {hasQuests && (
                  <span className="text-xs text-stone-400">{t.questsCount(quests.length)}</span>
                )}
              </div>

              <div className="p-4 space-y-3">
                {!hasQuests ? (
                  /* Empty State */
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-12 px-6 text-center"
                  >
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-brand-gold/20 to-amber-100 flex items-center justify-center">
                      <Sparkles size={32} className="text-brand-gold" />
                    </div>
                    <h4 className="text-lg font-bold text-brand-dark mb-2">{t.noQuestsYet}</h4>
                    <p className="text-sm text-stone-500 mb-6 max-w-sm mx-auto">
                      {t.emptyStateMessage}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onOpenOnboarding}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-brand-gold/30 transition-all"
                    >
                      {t.createFirstQuest}
                    </motion.button>
                  </motion.div>
                ) : (
                  /* Quest List */
                  quests.map((q, idx) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * idx }}
                      className="group bg-white border border-stone-100 rounded-xl p-4 hover:border-brand-gold/30 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4">
                        {/* Quest Number Badge */}
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-gold/20 to-amber-100 flex items-center justify-center text-brand-gold font-bold text-sm shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </div>

                        {/* Quest Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-brand-dark truncate group-hover:text-brand-gold transition-colors">
                            {q.title || t.untitledQuest}
                          </h4>
                          <p className="text-xs text-stone-500 truncate flex items-center gap-1">
                            <MapPin size={10} />
                            {q.area_name || t.noArea}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onOpenWorkspace(q)}
                            className="px-4 py-2 rounded-lg bg-brand-dark text-white text-xs font-bold hover:bg-brand-gold transition-colors flex items-center gap-1.5"
                          >
                            <Pencil size={12} />
                            {t.edit}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onOpenAnalytics(q)}
                            className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 text-xs font-bold hover:border-brand-gold hover:text-brand-gold transition-colors flex items-center gap-1.5"
                          >
                            <BarChart2 size={12} />
                            {t.analytics}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onDeleteQuest(q)}
                            className="p-2 rounded-lg border border-stone-200 text-stone-400 text-xs font-bold hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title={t.delete || '削除'}
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* CSS for floating animation */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) scale(1); opacity: 0.3; }
          100% { transform: translateY(-20px) scale(1.2); opacity: 0.6; }
        }
      `}</style>
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
  onAiGenerateDraft,
  aiDraftLoading,
  aiDraftError,
  onDeleteQuest,
  deleteLoading,
  questId,
  onGoMultilingual,
  questMode = 'PRIVATE',
  onPlayNow,
  onOpenShareModal,
  onOpenPublishModal,
  isPaidUser = false,
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
  onAiGenerateDraft: (input: AiDraftInput) => Promise<void>;
  aiDraftLoading: boolean;
  aiDraftError: string | null;
  onDeleteQuest: () => void;
  deleteLoading: boolean;
  questId: string | null;
  onGoMultilingual: () => void;
  questMode?: QuestMode;
  onPlayNow?: () => void;
  onOpenShareModal?: () => void;
  onOpenPublishModal?: () => void;
  isPaidUser?: boolean;
}) {
  const [showAiDraftModal, setShowAiDraftModal] = useState(false);
  const [aiDraftMessage, setAiDraftMessage] = useState<string | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [aiDraftInput, setAiDraftInput] = useState<AiDraftInput>({
    area: '',
    theme: '',
    difficulty: '中級',
    target: '',
    targetLanguages: ['日本語'],
    notes: '',
    // Advanced settings defaults
    spotCount: '7',
    estimatedPlayTime: '',
    artStyle: '',
    storyTone: '',
    characterCount: '',
    specialRequirements: '',
    includeSpots: '',
    challengeTypes: ['謎', 'クイズ', 'ミッション'],
  });

  const handleAiDraftSubmit = async () => {
    setAiDraftMessage(null);
    try {
      await onAiGenerateDraft(aiDraftInput);
      setAiDraftMessage('叩き台をワークスペースに反映しました。');
    } catch {
      // 親側でエラーをセットするのでここでは握りつぶす
    }
  };

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
      title: '基本情報',
      subtitle: 'Basic Info',
      description: 'タイトル、開催エリア、概要の設定が完了しました。',
      ribbon: '🎉 設定完了！いつでも編集できます (Completed!)',
      icon: CheckCircle,
      editable: true,
      emoji: '🎉',
    },
    {
      step: 2,
      key: 'spots' as const,
      title: 'スポット & 謎',
      subtitle: 'Spots & Puzzles',
      description: '地図上でチェックポイントを決め、それぞれの場所で出題する謎や手がかりを作成します。',
      icon: Map,
      todoLink: true,
      emoji: '🗺️',
    },
    {
      step: 3,
      key: 'story' as const,
      title: 'ストーリー',
      subtitle: 'Storytelling',
      description: 'スポット間を繋ぐストーリーの執筆や、クリア時の演出、登場人物のセリフなどを追加します。',
      icon: BookOpen,
      emoji: '📖',
    },
    {
      step: 4,
      key: 'multilingual' as const,
      title: '多言語対応',
      subtitle: 'Multilingual',
      description: 'AIで多言語版を自動生成。インバウンド観光客にクエストを届けましょう。',
      icon: Globe2,
      emoji: '🌐',
      isPanel: true,
    },
    {
      step: 5,
      key: 'test' as const,
      title: 'テストラン',
      subtitle: 'Test Run',
      description: '実際にプレイヤーとしてクエストを体験し、謎の難易度やストーリーの流れを最終確認します。',
      icon: Smartphone,
      emoji: '🎮',
    },
    {
      step: 6,
      key: 'publish' as const,
      title: '公開',
      subtitle: 'Publish',
      description: '最終確認を行い、TOMOSHIBIへ公開申請をします。審査を通過すれば、あなたのクエストが世界に公開されます！',
      icon: Rocket,
      // lockedUntil removed - allow publish at any state
      emoji: '🚀',
    },
  ];

  const getStatus = (card: (typeof cards)[number]): 'done' | 'active' | 'idle' => {
    if (!questId) return 'idle';
    const savedStatus = localStorage.getItem(`step-status:${questId}:${card.step}`);
    if (savedStatus === 'completed') return 'done';
    if (savedStatus === 'in_progress') return 'active';
    return 'idle';
  };

  const completedCount = cards.filter((card) => getStatus(card) === 'done').length;
  const inProgressCount = cards.filter((card) => getStatus(card) === 'active').length;
  // Calculate progress: completed = 100%, in_progress = 50% contribution
  const progressPercent = Math.round(((completedCount + inProgressCount * 0.5) / cards.length) * 100);
  const formatMinutes = (m: number | null) => (m != null ? `${m} 分` : '—');

  return (
    <section className="min-h-screen bg-stone-50/50 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-brand-base/20 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand-gold/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Navigation */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-100 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <button onClick={onLogoHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TomoshibiLogo className="h-7 w-auto" />
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={onPreview}
              className="hidden md:flex px-5 py-2 rounded-full border border-stone-200 bg-white text-sm font-bold text-stone-700 hover:border-brand-gold hover:text-brand-gold hover:shadow-md transition-all items-center gap-2"
            >
              <PlayCircle size={16} />
              Preview
            </button>
            <div className="h-6 w-px bg-stone-200 mx-1 hidden md:block" />
            <button
              onClick={onBack}
              className="text-sm font-bold text-stone-500 hover:text-brand-dark transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-10 max-w-6xl relative z-10">

        {/* Workspace Hero */}
        <div className="flex flex-col md:flex-row items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-brand-dark/5 text-brand-dark text-xs font-bold uppercase tracking-wider">Creator Studio</span>
              {activeStep === 5 && <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> 公開準備完了</span>}
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-brand-dark mb-4 tracking-tight">
              Project Workspace
            </h1>
            <p className="text-stone-500 max-w-xl text-lg leading-relaxed">
              クエスト制作の進捗管理画面です。ステップ順に進めて、あなたの物語を街に解き放ちましょう。
            </p>
          </div>

          <div className="flex flex-col items-end gap-3 w-full md:w-auto">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 w-full md:w-72">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">Total Progress</span>
                <span className="text-2xl font-bold text-brand-dark">{progressPercent}<span className="text-base text-stone-400 font-normal">%</span></span>
              </div>
              <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-gold to-orange-400 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onDeleteQuest}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? '削除中...' : 'クエストを削除する'}
              </button>
              <button
                onClick={() => setShowAiDraftModal(true)}
                className="px-4 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 hover:border-indigo-300 transition-colors flex items-center gap-1.5"
              >
                <Sparkles size={14} /> AIでたたき台を作成する
              </button>
            </div>

            {/* Quest Mode and Publishing Actions */}
            <div className="flex flex-col gap-3 w-full md:w-auto mt-2">
              {/* Mode Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">現在のモード:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${questMode === 'PRIVATE' ? 'bg-stone-100 text-stone-700 border-stone-200' :
                  questMode === 'SHARE' ? 'bg-sky-100 text-sky-700 border-sky-200' :
                    'bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}>
                  {questMode === 'PRIVATE' ? '🔒 自分用 (Private)' :
                    questMode === 'SHARE' ? '🔗 限定共有 (Share)' :
                      '🌐 公開 (Publish)'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {/* Play Now - Always available */}
                <button
                  onClick={onPlayNow}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-bold hover:from-violet-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <PlayCircle size={16} />
                  今すぐ遊ぶ
                </button>

                {/* Share Button */}
                <button
                  onClick={onOpenShareModal}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-sm font-bold hover:from-sky-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <Globe2 size={16} />
                  共有する
                </button>

                {/* Publish Button - Paid users only */}
                {isPaidUser ? (
                  <button
                    onClick={onOpenPublishModal}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    <Rocket size={16} />
                    公開する
                  </button>
                ) : (
                  <div className="relative group">
                    <button
                      disabled
                      className="px-4 py-2.5 rounded-xl bg-stone-200 text-stone-400 text-sm font-bold cursor-not-allowed flex items-center gap-2"
                    >
                      <Rocket size={16} />
                      公開する
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-stone-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      有料プランで公開機能が利用できます
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Section (Collapsible or always visible) */}
        {/* Analytics Summary */}
        {showAnalytics && analytics.length > 0 && (
          <div className="mb-12 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-brand-dark flex items-center gap-2">
                <div className="p-1.5 bg-brand-gold/10 rounded-lg text-brand-gold"><Target size={18} /></div>
                Quick Analytics
              </h3>
              <div className="flex bg-white rounded-lg p-1 border border-stone-200 shadow-sm">
                {(['all', '30d'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => onChangeAnalyticsFilter?.(f)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${analyticsFilter === f
                      ? 'bg-brand-dark text-white shadow-sm'
                      : 'text-stone-500 hover:bg-stone-50'
                      }`}
                  >
                    {f === 'all' ? 'All Time' : 'Last 30 Days'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {analytics.map(q => (
                <div key={q.questId} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => onOpenDetail?.(q.questId, q.title)}>
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs text-stone-400 font-bold uppercase truncate flex-1">{q.title}</p>
                    <ArrowRight size={14} className="text-stone-300 group-hover:text-brand-gold transition-colors" />
                  </div>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-3xl font-bold text-brand-dark">{q.playCount}</span>
                    <span className="text-xs text-stone-500 mb-1 font-bold">Plays</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">{Math.round(q.clearRate * 100)}% Clear</span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">★ {q.avgRating?.toFixed(1) || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const status = getStatus(card);
            // isLocked removed - all steps are accessible
            const isActive = status === 'active';
            const isDone = status === 'done';

            // Card Styles - fully unified design for all cards
            const baseCardClass = "relative rounded-3xl p-6 border transition-all duration-300 flex flex-col h-full";
            const statusClass = "bg-white border-stone-200 hover:border-brand-gold/30 hover:shadow-md shadow-sm";

            const handleStart = () => {
              // No locking - all steps accessible
              if (card.step === 1) { setActiveStep(1); onGoStep1(); return; }
              if (card.step === 2) { onGoStep2(); return; }
              if (card.step === 3) { setActiveStep(3); onGoStep3(); return; }
              if (card.step === 4) { onGoMultilingual(); return; } // Multilingual page
              if (card.step === 5) { setActiveStep(5); onGoStep4(); return; }
              if (card.step === 6) { setActiveStep(6); onPublish(); return; }
            };

            return (
              <div key={card.step} className={`${baseCardClass} ${statusClass} ${isDone ? 'ring-2 ring-emerald-200' : ''}`}>
                {/* Step Number Badge */}
                <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-brand-dark text-white text-sm font-bold flex items-center justify-center shadow-lg z-10">
                  {card.step}
                </div>

                {/* Completion Badge */}
                {isDone && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg z-10">
                    <CheckCircle size={18} />
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${isDone ? 'bg-emerald-100 text-emerald-600' : isActive ? 'bg-brand-gold/20 text-brand-gold' : 'bg-stone-100 text-stone-500'}`}>
                    <card.icon size={24} />
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${isDone ? 'bg-emerald-100 text-emerald-700' : isActive ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'}`}>
                    {isDone ? '完了' : isActive ? '進行中' : '未着手'}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className={`text-xl font-bold mb-1 ${isDone ? 'text-emerald-700' : isActive ? 'text-brand-dark' : 'text-stone-700'}`}>
                    {card.title}
                  </h3>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
                    {card.subtitle}
                  </p>
                  <p className="text-sm text-stone-500 leading-relaxed mb-6">
                    {card.description}
                  </p>
                </div>

                {/* Footer / Actions - unified for all cards */}
                <div className="pt-4 mt-auto border-t border-stone-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-400">STEP {card.step}</span>
                    <button
                      onClick={handleStart}
                      className={`px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${isDone ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-stone-100 text-stone-600 hover:bg-brand-dark hover:text-white'}`}
                    >
                      {isDone ? '編集する' : '開始する'}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {
        detailQuestAnalytics && (
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
                                  width: `${detailQuestAnalytics.reviews.count
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
        )
      }



      {
        showAiDraftModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs text-amber-700 font-bold uppercase">AI Assist</p>
                  <h3 className="text-xl font-bold text-brand-dark">AIで叩き台を作る</h3>
                  <p className="text-sm text-stone-600 mt-1">
                    エリアやテーマなどを入力すると、Geminiがクエストの初期案（タイトル・概要・スポット案・ストーリー案）を生成し、各ステップに反映します。
                  </p>
                </div>
                <button
                  onClick={() => setShowAiDraftModal(false)}
                  className="text-stone-500 hover:text-brand-dark transition-colors text-sm"
                >
                  閉じる
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">エリア・場所</label>
                  <input
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                    placeholder="例: 神田、京都祇園など"
                    value={aiDraftInput.area}
                    onChange={(e) => setAiDraftInput((prev) => ({ ...prev, area: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">テーマ・モチーフ</label>
                  <input
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                    placeholder="例: 文豪ミステリー、レトロ喫茶めぐり"
                    value={aiDraftInput.theme}
                    onChange={(e) => setAiDraftInput((prev) => ({ ...prev, theme: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">難易度</label>
                  <select
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                    value={aiDraftInput.difficulty}
                    onChange={(e) => setAiDraftInput((prev) => ({ ...prev, difficulty: e.target.value }))}
                  >
                    <option value="初級">初級</option>
                    <option value="中級">中級</option>
                    <option value="上級">上級</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">想定ターゲット</label>
                  <input
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                    placeholder="例: カップル、家族、インバウンド観光客など"
                    value={aiDraftInput.target}
                    onChange={(e) => setAiDraftInput((prev) => ({ ...prev, target: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-2">対応言語</label>
                  <div className="flex gap-3">
                    {/* Japanese - always selected, disabled */}
                    <label className="flex items-center gap-2 px-3 py-2 bg-stone-100 rounded-xl cursor-not-allowed opacity-75 shrink-0">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="w-4 h-4 rounded border-stone-300"
                      />
                      <span className="text-sm whitespace-nowrap">JA (日本語)</span>
                    </label>
                    {/* English */}
                    <label className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-xl cursor-pointer hover:border-brand-gold/50 transition-colors shrink-0">
                      <input
                        type="checkbox"
                        checked={aiDraftInput.targetLanguages.includes('英語')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAiDraftInput((prev) => ({ ...prev, targetLanguages: [...prev.targetLanguages, '英語'] }));
                          } else {
                            setAiDraftInput((prev) => ({ ...prev, targetLanguages: prev.targetLanguages.filter(l => l !== '英語') }));
                          }
                        }}
                        className="w-4 h-4 rounded border-stone-300 text-brand-gold focus:ring-brand-gold"
                      />
                      <span className="text-sm whitespace-nowrap">EN (英語)</span>
                    </label>
                    {/* Korean */}
                    <label className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-xl cursor-pointer hover:border-brand-gold/50 transition-colors shrink-0">
                      <input
                        type="checkbox"
                        checked={aiDraftInput.targetLanguages.includes('韓国語')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAiDraftInput((prev) => ({ ...prev, targetLanguages: [...prev.targetLanguages, '韓国語'] }));
                          } else {
                            setAiDraftInput((prev) => ({ ...prev, targetLanguages: prev.targetLanguages.filter(l => l !== '韓国語') }));
                          }
                        }}
                        className="w-4 h-4 rounded border-stone-300 text-brand-gold focus:ring-brand-gold"
                      />
                      <span className="text-sm whitespace-nowrap">KO (한국어)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 詳細設定の開閉ボタン */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${showAdvancedSettings ? 'rotate-180' : ''}`}
                  />
                  {showAdvancedSettings ? '詳細設定を閉じる' : '詳細設定を開く'}
                </button>

                {/* 詳細設定パネル */}
                {showAdvancedSettings && (
                  <div className="mt-4 p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-4">
                    <p className="text-xs text-stone-500 mb-3">
                      より詳細な情報を提供することで、AIがより精度の高いクエストを生成できます。
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-600 mb-1">スポット数</label>
                        <select
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/40 bg-white"
                          value={aiDraftInput.spotCount || '7'}
                          onChange={(e) => setAiDraftInput((prev) => ({ ...prev, spotCount: e.target.value }))}
                        >
                          <option value="5">5スポット（短め）</option>
                          <option value="6">6スポット</option>
                          <option value="7">7スポット（推奨）</option>
                          <option value="8">8スポット</option>
                          <option value="10">10スポット（長め）</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-600 mb-1">想定プレイ時間</label>
                        <select
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/40 bg-white"
                          value={aiDraftInput.estimatedPlayTime || ''}
                          onChange={(e) => setAiDraftInput((prev) => ({ ...prev, estimatedPlayTime: e.target.value }))}
                        >
                          <option value="">自動（AIにおまかせ）</option>
                          <option value="30分">30分程度</option>
                          <option value="1時間">1時間程度</option>
                          <option value="1.5時間">1.5時間程度</option>
                          <option value="2時間">2時間程度</option>
                          <option value="2時間以上">2時間以上</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-600 mb-1">アートスタイル・世界観</label>
                        <input
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                          placeholder="例: レトロ、ファンタジー、サイバーパンク、和風など"
                          value={aiDraftInput.artStyle || ''}
                          onChange={(e) => setAiDraftInput((prev) => ({ ...prev, artStyle: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-600 mb-1">物語のトーン</label>
                        <input
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                          placeholder="例: シリアス、コメディ、ほのぼの、ホラーなど"
                          value={aiDraftInput.storyTone || ''}
                          onChange={(e) => setAiDraftInput((prev) => ({ ...prev, storyTone: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-600 mb-1">登場人物の人数</label>
                        <select
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/40 bg-white"
                          value={aiDraftInput.characterCount || ''}
                          onChange={(e) => setAiDraftInput((prev) => ({ ...prev, characterCount: e.target.value }))}
                        >
                          <option value="">自動（AIにおまかせ）</option>
                          <option value="2">2人（最小）</option>
                          <option value="3">3人</option>
                          <option value="4">4人（標準）</option>
                          <option value="5">5人以上</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-stone-600 mb-1">特別な指定・要件</label>
                        <textarea
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                          rows={2}
                          placeholder="例: 特定の歴史人物を登場させたい、謎解きに暗号を使いたい、ラストは感動的に、など"
                          value={aiDraftInput.specialRequirements || ''}
                          onChange={(e) => setAiDraftInput((prev) => ({ ...prev, specialRequirements: e.target.value }))}
                        />
                      </div>

                      {/* 特定スポット */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-stone-600 mb-1">含めたいスポット（任意）</label>
                        <textarea
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                          rows={2}
                          placeholder="例: 東京タワー、増上寺、芝公園など（改行またはカンマで区切り）"
                          value={aiDraftInput.includeSpots || ''}
                          onChange={(e) => setAiDraftInput((prev) => ({ ...prev, includeSpots: e.target.value }))}
                        />
                        <p className="text-[10px] text-stone-400 mt-1">指定したスポットは必ずルートに含められます</p>
                      </div>

                      {/* チャレンジタイプ */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-stone-600 mb-2">スポットで出題するチャレンジタイプ</label>
                        <div className="flex flex-wrap gap-4">
                          {[
                            { value: '謎', label: '謎解き', desc: '論理パズルや暗号など' },
                            { value: 'クイズ', label: 'クイズ', desc: '知識を問う質問' },
                            { value: 'ミッション', label: 'ミッション', desc: '写真撮影や行動タスク' }
                          ].map((type) => (
                            <label
                              key={type.value}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${(aiDraftInput.challengeTypes || []).includes(type.value)
                                ? 'border-brand-gold bg-brand-gold/10'
                                : 'border-stone-200 bg-white hover:border-stone-300'
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={(aiDraftInput.challengeTypes || []).includes(type.value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setAiDraftInput((prev) => ({
                                      ...prev,
                                      challengeTypes: [...(prev.challengeTypes || []), type.value]
                                    }));
                                  } else {
                                    setAiDraftInput((prev) => ({
                                      ...prev,
                                      challengeTypes: (prev.challengeTypes || []).filter(t => t !== type.value)
                                    }));
                                  }
                                }}
                                className="w-4 h-4 rounded border-stone-300 text-brand-gold focus:ring-brand-gold"
                              />
                              <div>
                                <span className="text-sm font-bold text-stone-700">{type.label}</span>
                                <p className="text-[10px] text-stone-400">{type.desc}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                        <p className="text-[10px] text-stone-400 mt-2">選択したタイプからAIがバランス良くチャレンジを生成します</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>


              {aiDraftError && <p className="text-sm text-red-600 mb-2">エラー: {aiDraftError}</p>}
              {aiDraftMessage && <p className="text-sm text-emerald-700 mb-2">{aiDraftMessage}</p>}

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowAiDraftModal(false)}
                  className="px-4 py-2 rounded-full border border-stone-300 text-sm font-bold text-stone-700 hover:border-brand-gold transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAiDraftSubmit}
                  disabled={aiDraftLoading}
                  className="px-4 py-2 rounded-full bg-brand-dark text-white text-sm font-bold hover:bg-brand-gold transition-colors disabled:opacity-60"
                >
                  {aiDraftLoading ? '生成中...' : 'AIで生成する'}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </section >
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
      .catch(() => { });
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
              className={`px-6 py-3 rounded-full text-sm font-bold shadow-lg ${isValid ? 'bg-brand-dark text-white hover:bg-brand-gold' : 'bg-stone-200 text-stone-500 cursor-not-allowed'
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
      .catch(() => { });
  };

  const removeSpot = (id: string) => {
    setRouteSpots(routeSpots.filter((s) => s.id !== id));
    supabase.from('spots').delete().eq('id', id).then(() => loadSpots()).catch(() => { });
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
            .catch(() => { });
        });
      })
      .catch(() => { });
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
                  className={`px-5 py-3 rounded-full text-sm font-bold transition-colors shadow-lg ${isStepValid ? 'bg-white text-brand-dark hover:bg-brand-gold hover:text-white' : 'bg-stone-200 text-stone-500 cursor-not-allowed'
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
  install,
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
  install: {
    downloadApp: string;
    mobileAppBetter: string;
    mobileAppDesc: string;
    playWithApp: string;
  };
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
                Q
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
            install={install}
          />

          <div className="bg-white/80 backdrop-blur border border-stone-200/60 rounded-2xl p-4 md:p-6 shadow-lg">
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              {QUEST_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all duration-200 ${activeFilter === filter.key
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
  install,
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
  install: {
    downloadApp: string;
    mobileAppBetter: string;
    mobileAppDesc: string;
    playWithApp: string;
  };
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
              install={install}
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
                className={`w-full font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 ${purchased ? 'bg-emerald-500 text-white hover:bg-emerald-500' : 'bg-brand-gold text-brand-dark hover:bg-white'
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

const CreatorPage = ({ onBackHome, onGoAuth, onOpenOnboarding, t }: { onBackHome: () => void; onGoAuth: (mode: AuthMode) => void; onOpenOnboarding: () => void; t: typeof LC.ja.creatorsPage }) => (
  <section className="min-h-screen relative overflow-hidden font-sans text-brand-dark" style={{ backgroundColor: '#f7f0e5' }}>
    {/* Background Noise/Texture */}
    <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

    {/* Hero Section */}
    <div className="relative pt-48 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/20 text-xs font-bold tracking-widest uppercase mb-6">
              <Sparkles size={12} />
              {t.hero.badge}
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold font-serif leading-[1.1] mb-6 tracking-tight whitespace-pre-line">
              {t.hero.title.split('\n')[0]} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold to-amber-600">
                {t.hero.title.split('\n')[1]}
              </span>
            </h1>
            <p className="text-xl text-stone-500 leading-relaxed mb-8 max-w-lg">
              {t.hero.subtitle}
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={onOpenOnboarding}
                className="group relative px-8 py-4 rounded-full bg-brand-dark text-white font-bold text-lg overflow-hidden shadow-xl shadow-brand-dark/25 hover:shadow-2xl hover:shadow-brand-dark/30 transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t.hero.btnCreate}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-stone-800 to-stone-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 rounded-full border border-stone-200 bg-white text-stone-600 font-bold text-lg hover:bg-stone-50 transition-colors"
              >
                {t.hero.btnLearnMore}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative h-[500px] hidden lg:block"
          >
            {/* Abstract visual representation of the "Canvas" */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-stone-100 rounded-[2.5rem] overflow-hidden border border-white shadow-2xl">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-30 mix-blend-multiply grayscale" />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-50 via-transparent to-transparent" />

              {/* Floating Cards UI */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-12 right-12 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border border-white/50 w-64"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-brand-base flex items-center justify-center text-brand-gold">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <div className="h-2 w-24 bg-stone-200 rounded-full mb-1.5" />
                    <div className="h-1.5 w-16 bg-stone-100 rounded-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-12 w-full bg-stone-50 rounded-lg border border-stone-100" />
                  <div className="h-12 w-full bg-stone-50 rounded-lg border border-stone-100" />
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 15, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-16 left-12 bg-white/90 backdrop-blur p-5 rounded-xl shadow-lg border border-white/50 w-72"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Revenue Share</span>
                  <span className="text-emerald-500 text-xs font-bold">+12%</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-brand-dark">¥24,800</span>
                  <span className="text-sm text-stone-500">/ mo</span>
                </div>
                <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full w-[70%] bg-brand-gold rounded-full" />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>

    {/* Bento Grid Value Props */}
    <div id="features" className="py-24 px-4 bg-white relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4">{t.whyCreate.title}</h2>
          <p className="text-stone-500 text-lg max-w-2xl mx-auto">
            {t.whyCreate.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(280px,auto)]">
          {/* Large Card: Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-2 bg-stone-50 rounded-3xl p-8 md:p-10 border border-stone-100 relative overflow-hidden group"
          >
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 text-brand-gold border border-stone-100">
                  <Coins size={24} />
                </div>
                <h3 className="text-2xl font-bold mb-3">{t.whyCreate.revenueTitle}</h3>
                <p className="text-stone-500 leading-relaxed max-w-md">
                  {t.whyCreate.revenueDesc}
                </p>
              </div>
              <div className="mt-8">
                <button onClick={onOpenOnboarding} className="text-sm font-bold underline underline-offset-4 decoration-stone-300 hover:decoration-brand-gold transition-colors">
                  {t.whyCreate.revenueLink}
                </button>
              </div>
            </div>
            {/* Visual Decor */}
            <div className="absolute right-0 bottom-0 w-1/2 h-full bg-gradient-to-l from-white/50 to-transparent pointer-events-none md:block hidden">
              <div className="absolute bottom-8 right-8 bg-white p-4 rounded-xl shadow-lg border border-stone-100 rotate-[-6deg] group-hover:rotate-0 transition-transform duration-500">
                <div className="text-xs text-stone-400 uppercase tracking-wider mb-1">{t.whyCreate.revenueEarnings}</div>
                <div className="text-2xl font-bold text-brand-dark">¥50,000+</div>
              </div>
            </div>
          </motion.div>

          {/* Tall Card: AI Support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="md:row-span-2 bg-brand-dark text-white rounded-3xl p-8 md:p-10 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 text-brand-gold border border-white/10">
                <Sparkles size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-3">{t.whyCreate.aiTitle}</h3>
              <p className="text-white/60 leading-relaxed">
                {t.whyCreate.aiDesc}
              </p>
            </div>

            <div className="relative h-48 mt-8 rounded-xl bg-white/5 border border-white/10 p-4 font-mono text-xs text-brand-gold/80 overflow-hidden">
              <div className="opacity-50">
                &gt; Generating clue...<br />
                &gt; "Look for the stone lion..."<br />
                &gt; Analysis: 95% fun rating
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent" />
            </div>
          </motion.div>

          {/* Card: Global Reach */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm flex flex-col justify-between group hover:border-brand-gold/50 transition-colors"
          >
            <div>
              <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center mb-6 text-stone-400 group-hover:text-brand-gold transition-colors">
                <Globe2 size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">{t.whyCreate.globalTitle}</h3>
              <p className="text-stone-500 text-sm">
                {t.whyCreate.globalDesc}
              </p>
            </div>
          </motion.div>

          {/* Card: Portfolio */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-amber-50 to-white rounded-3xl p-8 border border-stone-200 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 text-amber-500 shadow-sm">
                <Target size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">{t.whyCreate.portfolioTitle}</h3>
              <p className="text-stone-500 text-sm">
                {t.whyCreate.portfolioDesc}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>

    {/* Section: Feature Spotlight */}
    <div className="py-24 px-4 bg-stone-50">
      <FeatureSpotlight t={t.features} />
    </div>

    {/* Section: Revenue Simulator */}
    <RevenueSimulator t={t.revenueSimulator} />

    {/* Section: Timeline (How it works) */}
    <div className="py-24 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <SectionHeading subtitle={t.howItWorks.subtitle}>{t.howItWorks.title}</SectionHeading>
        <div className="relative mt-16">
          <div className="absolute top-0 bottom-0 left-[27px] md:left-1/2 w-0.5 bg-stone-200 -z-10" />

          {t.howItWorks.steps.map((step, idx) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className={`flex flex-col md:flex-row gap-8 md:gap-0 items-start md:items-center mb-16 last:mb-0 ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
            >
              <div className="flex-1 md:w-1/2" />

              <div className="w-14 h-14 rounded-full bg-brand-dark text-white border-4 border-white shadow-xl flex items-center justify-center shrink-0 z-10 relative">
                <span className="font-bold font-serif text-lg">{idx + 1}</span>
              </div>

              <div className={`flex-1 md:w-1/2 ${idx % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-stone-500 leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>

    {/* Section: Final CTA */}
    <div className="py-32 px-4 text-center relative overflow-hidden">
      <div className="relative z-10 max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-6xl font-serif font-bold mb-6 text-brand-dark">{t.cta.title}</h2>
        <p className="text-xl text-stone-600 mb-10">
          {t.cta.subtitle}
        </p>
        <button
          onClick={onOpenOnboarding}
          className="group px-10 py-5 bg-brand-dark text-white rounded-full font-bold text-lg hover:bg-brand-gold hover:text-brand-dark transition-colors shadow-2xl hover:shadow-brand-gold/20"
        >
          {t.cta.button}
        </button>
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
      const message = `${questionText.trim()}\n\nfrom: ${userEmail || userId || '不明ユーザー'}\nquest: ${questTitle || '不明'
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
                                className={`text-[11px] px-2 py-1 rounded-full border ${isComplete
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
                      className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${active ? 'border-brand-dark bg-brand-dark text-white' : 'border-stone-200 bg-brand-base hover:border-brand-gold'
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
                  className={`px-4 py-2 rounded-full text-sm font-bold border shadow-sm flex items-center gap-2 ${questionText.trim() && sendStatus !== 'sending'
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
                  className={`px-5 py-3 rounded-full text-sm font-bold transition-colors shadow-lg ${allChecked
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
            <p className="text-lg font-serif font-bold text-brand-dark">公開 (Step 5)</p>
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

export default function LandingPage() {
  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  console.log('[DEBUG] LandingPage initialPath:', initialPath);
  const initialActivePage: 'home' | 'quests' | 'quest-detail' | 'creators' | 'auth' | 'profile' | 'creator-start' | 'creator-canvas' | 'creator-workspace' | 'creator-spot-detail' | 'creator-storytelling' | 'creator-test-run' | 'creator-submitted' | 'creator-analytics' | 'creator-mystery-setup' | 'creator-route-spots' | 'creator-workspace-languages' | 'admin-dashboard' | 'admin-review' | 'player' | 'about' | 'business' =
    initialPath === '/play'
      ? 'player'
      : initialPath === '/about'
        ? 'about'
        : initialPath === '/business'
          ? 'business'
          : initialPath === '/creator' || initialPath === '/creator/workspace'
            ? 'creator-workspace'
            : initialPath === '/creator/analytics' || initialPath.startsWith('/creator/analytics/')
              ? 'creator-analytics'
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

  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Language state
  const [currentLang, setCurrentLang] = useState<Language>('ja');
  const t = LC[currentLang];

  const [activePage, setActivePage] = useState<'home' | 'quests' | 'quest-detail' | 'creators' | 'auth' | 'profile' | 'creator-start' | 'creator-canvas' | 'creator-workspace' | 'creator-spot-detail' | 'creator-storytelling' | 'creator-test-run' | 'creator-submitted' | 'creator-analytics' | 'creator-mystery-setup' | 'creator-route-spots' | 'creator-workspace-languages' | 'admin-dashboard' | 'admin-review' | 'player' | 'about' | 'business'>(initialActivePage);

  // Sync activePage with URL path changes
  useEffect(() => {
    const path = location.pathname;
    let newActivePage: typeof activePage | null = null;

    if (path === '/about') {
      newActivePage = 'about';
    } else if (path === '/business') {
      newActivePage = 'business';
    } else if (path.startsWith('/quest/') && path !== '/quests') {
      newActivePage = 'quest-detail';
    } else if (path === '/quests' || path === '/quests/') {
      newActivePage = 'quests';
    } else if (path === '/creators' || path === '/creators/') {
      newActivePage = 'creators';
    } else if (path === '/auth/login' || path === '/auth/signup' || path === '/auth/forgot' || path === '/auth') {
      newActivePage = 'auth';
    } else if (path === '/profile') {
      newActivePage = 'profile';
    } else if (path === '/play' || path === '/player') {
      newActivePage = 'player';
    } else if (path === '/creator/start') {
      newActivePage = 'creator-start';
    } else if (path.startsWith('/creator/canvas')) {
      newActivePage = 'creator-canvas';
    } else if (path === '/creator/mystery-setup') {
      newActivePage = 'creator-mystery-setup';
    } else if (path.startsWith('/creator/route-spots/')) {
      newActivePage = 'creator-spot-detail';
    } else if (path === '/creator/route-spots') {
      newActivePage = 'creator-route-spots';
    } else if (path.startsWith('/creator/workspace/languages')) {
      newActivePage = 'creator-workspace-languages';
    } else if (path.startsWith('/creator/workspace')) {
      newActivePage = 'creator-workspace';
    } else if (path === '/creator/storytelling') {
      newActivePage = 'creator-storytelling';
    } else if (path === '/creator/test-run') {
      newActivePage = 'creator-test-run';
    } else if (path === '/creator/submitted') {
      newActivePage = 'creator-submitted';
    } else if (path.startsWith('/creator/analytics')) {
      newActivePage = 'creator-analytics';
    } else if (path === '/admin/dashboard') {
      newActivePage = 'admin-dashboard';
    } else if (path.startsWith('/admin/review/')) {
      newActivePage = 'admin-review';
    } else if (path === '/') {
      newActivePage = 'home';
    }

    // Only update if we recognized the path
    if (newActivePage !== null) {
      setActivePage(newActivePage);
    }
  }, [location.pathname]);

  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'popular' | 'short' | 'distance'>('popular');
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [questBrandFilter, setQuestBrandFilter] = useState<string | null>(null);
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
  const [selectedQuestType, setSelectedQuestType] = useState<'mystery' | 'scavenger'>('mystery');
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

  // Quest Publishing System state
  const [questMode, setQuestMode] = useState<QuestMode>('PRIVATE');
  const [qualityChecklist, setQualityChecklist] = useState<QualityChecklist>({});
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [qualityModalMode, setQualityModalMode] = useState<'SHARE' | 'PUBLISH'>('SHARE');

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

        // Fetch gameplay events for drop-off analysis
        let gameplayEventsData = null;
        let feedbackStatsData = null;
        try {
          // Drop-off by mode (session_abandon events)
          const { data: abandonEvents } = await supabase
            .from('gameplay_events')
            .select('event_data')
            .eq('quest_id', questId)
            .eq('event_type', 'session_abandon');

          const dropOffByMode: Record<string, number> = {};
          (abandonEvents || []).forEach((e: any) => {
            const mode = e.event_data?.last_mode || 'unknown';
            dropOffByMode[mode] = (dropOffByMode[mode] || 0) + 1;
          });

          // Puzzle error rates
          const { data: puzzleEvents } = await supabase
            .from('gameplay_events')
            .select('spot_id, event_data')
            .eq('quest_id', questId)
            .eq('event_type', 'puzzle_submit');

          const puzzleStats: Record<string, { total: number; wrong: number; name: string }> = {};
          (puzzleEvents || []).forEach((e: any) => {
            const spotId = e.spot_id || 'unknown';
            if (!puzzleStats[spotId]) {
              const spotInfo = spots?.find((s: any) => s.id === spotId);
              puzzleStats[spotId] = { total: 0, wrong: 0, name: spotInfo?.name || 'Unknown' };
            }
            puzzleStats[spotId].total++;
            if (e.event_data?.correct === false) {
              puzzleStats[spotId].wrong++;
            }
          });

          gameplayEventsData = {
            dropOffByMode: Object.entries(dropOffByMode).map(([mode, count]) => ({ mode, count })),
            puzzleErrorRate: Object.entries(puzzleStats).map(([_, stats]) => ({
              spotName: stats.name,
              totalSubmits: stats.total,
              wrongSubmits: stats.wrong,
              rate: stats.total > 0 ? stats.wrong / stats.total : 0,
            })).sort((a, b) => b.rate - a.rate),
            arrivalFailRate: 0, // TODO: if arrival_fail events are tracked
            hintUsageRate: hintsArr.length > 0 && playCount > 0 ? hintsArr.filter(h => h > 0).length / playCount : 0,
          };

          // User feedback
          const { data: feedbackData } = await supabase
            .from('user_feedback')
            .select('category, message, created_at')
            .eq('quest_id', questId)
            .order('created_at', { ascending: false });

          const feedbackByCategory: Record<string, number> = {};
          const categoryLabels: Record<string, string> = {
            lost: '迷子',
            gps_error: 'GPS問題',
            puzzle_hard: '謎が難しい',
            answer_rejected: '答えが通らない',
            ui_confusing: 'UI分からない',
            other: 'その他',
          };
          (feedbackData || []).forEach((f: any) => {
            feedbackByCategory[f.category] = (feedbackByCategory[f.category] || 0) + 1;
          });

          feedbackStatsData = {
            total: feedbackData?.length || 0,
            byCategory: Object.entries(feedbackByCategory).map(([category, count]) => ({
              category,
              count,
              label: categoryLabels[category] || category,
            })),
            recent: (feedbackData || []).slice(0, 5).map((f: any) => ({
              category: categoryLabels[f.category] || f.category,
              message: f.message,
              created_at: f.created_at,
            })),
          };
        } catch (e) {
          console.warn('gameplay/feedback fetch failed', e);
        }

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
          gameplayEvents: gameplayEventsData,
          feedbackStats: feedbackStatsData,
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
      .order('updated_at', { ascending: false });
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

  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraftError, setAiDraftError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const fetchRouteSpots = useCallback(
    async (id: string | null) => {
      if (!id) return;
      const { data, error } = await supabase
        .from('spots')
        .select('*, spot_details (*)')
        .eq('quest_id', id)
        .order('order_index', { ascending: true });
      if (!error && data) {
        const mapped: RouteSpot[] = data.map((s: any, idx: number) => {
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
                  ? hintsRaw.map((t: string, i: number) => ({ id: `hint-${i + 1}`, label: `ヒント${i + 1}`, text: t }))
                  : [],
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
            orderIndex: s.order_index || idx + 1,
            status: requiredFilled ? 'complete' : s.status || 'draft',
            details,
          };
        });
        setRouteSpots(mapped);
      }
    },
    [setRouteSpots]
  );





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
      case 'creator-canvas':
        return questId ? `/creator/canvas/${questId}` : '/creator/canvas';
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
      case 'creator-workspace-languages':
        return '/creator/workspace/languages';
      case 'about':
        return '/about';
      case 'business':
        return '/business';
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

    navigate(path, { replace: options?.replace });
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
    if (pathname === '/creator/canvas' || pathname.startsWith('/creator/canvas/')) {
      let qId = pathname.split('/')[3] || null;
      if (qId === 'new') qId = null;
      return { page: 'creator-canvas' as AppPage, questId: qId };
    }
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
    if (pathname === '/creator/workspace/languages') return { page: 'creator-workspace-languages' as AppPage };
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

  // URLからのクエストIDを優先するため、現在のquestIdがnullの場合のみlocalStorageから復元
  // 注: 7302-7307行のuseEffectが先にURLからクエストIDをセットするため、
  // ここではフォールバックとしてのみ機能する
  useEffect(() => {
    // URLからすでにクエストIDがセットされている場合はスキップ
    const route = parsePathToRoute(window.location.pathname);
    const urlQuestId = (route as any).questId;
    if (urlQuestId) {
      // URLにクエストIDがある場合は、それを使用（applyRouteで既に処理済み）
      return;
    }
    // URLにクエストIDがない場合のみ、localStorageからフォールバック
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
      .catch(() => { });
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
          .select('id, rating, comment, created_at, profiles!quest_reviews_user_id_fkey(username)')
          .eq('quest_id', selectedQuestId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('play_sessions')
          .select('ended_at,duration_sec')
          .eq('quest_id', selectedQuestId),
      ]);
      if (!error && data) {
        const mappedStops: QuestStop[] =
          spotsData?.map((s: any) => ({ name: s.name, clue: s.address || '', action: '' })) || [];
        const reviewRows = (reviewData || []).filter((r: any) => r.rating != null) as { rating: number; id: string; comment?: string; created_at?: string; profiles?: { username?: string } }[];
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
        // Map reviews with details for display
        const reviewList = reviewRows.map((r) => ({
          id: r.id,
          rating: r.rating,
          name: r.profiles?.username || 'ユーザー',
          date: r.created_at ? new Date(r.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' }) : '',
          comment: r.comment || '',
        }));
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
          reviewList,
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
    // questIdが変わったら即座にステートをクリア（DBからの取得を待たず）
    // これにより新規クエストで古いデータが表示されることを防ぐ
    setQuestTitle('');
    setQuestDescription('');
    setQuestLocation('');
    setQuestLatLng(null);
    setRouteSpots([]);
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
    setQuestCategoryTags([]);
    setQuestHashtags([]);
    // その後DBからデータを取得して設定
    supabase
      .from('quests')
      .select('*')
      .eq('id', questId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.warn('Quest fetch error:', error);
          return;
        }
        if (data) {
          setQuestTitle(data.title || '');
          setQuestDescription(data.description || '');
          setQuestLocation(data.area_name || '');
          if (data.location_lat && data.location_lng) {
            setQuestLatLng({ lat: data.location_lat, lng: data.location_lng });
          }
        }
      })
      .catch(() => { });
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
        .select('id, title, description, area_name, location_lat, location_lng, cover_image_url, status, created_at, updated_at')
        .eq('creator_id', user.id)
        .order('updated_at', { ascending: false });
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
    console.log('[DEBUG] goHome called, stack:', new Error().stack);
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

  const goToQuestList = (brandFilter?: string | null) => {
    applyRoute('quests');
    setIsMenuOpen(false);
    resetAuth();
    setShowCreatorOnboarding(false);
    setQuestBrandFilter(brandFilter || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToCreatorPage = () => {
    applyRoute('creators');
    setIsMenuOpen(false);
    resetAuth();
    setShowCreatorOnboarding(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      // ignore errors during logout
    } finally {
      setIsUserMenuOpen(false);
      setShowCreatorOnboarding(false);
      goHome();
    }
  };

  const openCreatorOnboarding = async () => {
    // Require login to create a quest
    if (!user) {
      goToAuth('login');
      return;
    }
    // Always create a new quest when clicking the create button - redirect to AI canvas
    navigate('/creator/canvas/new');
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
          mode: 'PRIVATE',
          quality_checklist: {},
        })
        .select('id, title, area_name, description, mode, quality_checklist, share_token')
        .maybeSingle();
      if (error) throw error;
      if (data?.id) {
        setQuestId(data.id);
        localStorage.setItem('quest-id', data.id);
        setQuestTitle(data.title || '');
        setQuestDescription(data.description || '');
        setQuestLocation(data.area_name || '');
        // Reset publishing system state for new quest
        setQuestMode((data.mode as QuestMode) || 'PRIVATE');
        setQualityChecklist(data.quality_checklist || {});
        setShareToken(data.share_token || null);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToRouteSpots = () => {
    setActiveWorkspaceStep(2);
    applyRoute('creator-route-spots');
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

  const goToWorkspace = (overrideQuestId?: string) => {
    const targetQuestId = overrideQuestId || questId;
    if (targetQuestId) {
      loadWorkspaceStep(targetQuestId);
    }
    applyRoute('creator-workspace', { questId: targetQuestId });
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

  // Quality Checklist Handlers
  const openQualityModal = (mode: 'SHARE' | 'PUBLISH') => {
    setQualityModalMode(mode);
    setShowQualityModal(true);
  };

  const handleQualityChecklistChange = async (newChecklist: QualityChecklist) => {
    setQualityChecklist(newChecklist);
    // Persist to database
    if (questId) {
      await supabase
        .from('quests')
        .update({ quality_checklist: newChecklist })
        .eq('id', questId);
    }
  };

  const generateShareToken = async () => {
    if (!questId) return;
    // Generate a random token
    const token = crypto.randomUUID();
    const { error } = await supabase
      .from('quests')
      .update({
        share_token: token,
        mode: 'SHARE',
        status: 'ready_for_share'
      })
      .eq('id', questId);

    if (!error) {
      setShareToken(token);
      setQuestMode('SHARE');
    }
  };

  const handleQualityConfirm = async () => {
    if (!questId) return;

    if (qualityModalMode === 'SHARE') {
      // Generate share token if not exists
      if (!shareToken) {
        await generateShareToken();
      }
      setShowQualityModal(false);
      alert('共有リンクが有効になりました！');
    } else {
      // PUBLISH - submit for review
      await handlePublish();
      setShowQualityModal(false);
    }
  };

  const applyAiDraftResult = (draft: AiDraftResult) => {
    let mappedSpots: RouteSpot[] | undefined;
    if (draft.title) setQuestTitle(draft.title);
    if (draft.description) setQuestDescription(draft.description);
    if (draft.area) setQuestLocation(draft.area);
    // 最初のスポットの座標をマップ中心に設定
    if (draft.routeSpots?.[0]?.lat && draft.routeSpots?.[0]?.lng) {
      setQuestLatLng({ lat: draft.routeSpots[0].lat, lng: draft.routeSpots[0].lng });
    }
    if (Array.isArray(draft.tags)) {
      const tagArray = draft.tags.filter(Boolean);
      setQuestCategoryTags(tagArray.filter((t) => CATEGORY_TAGS.includes(t)));
      setQuestHashtags(tagArray.filter((t) => !CATEGORY_TAGS.includes(t)));
    }

    const ensureSpots = () => {
      // Only use AI-generated spots - no empty placeholders
      if (draft.routeSpots?.length) return draft.routeSpots;
      return [];
    };

    const spotsInput = ensureSpots();

    if (spotsInput.length) {
      const genUuid = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          return crypto.randomUUID();
        }
        // Fallback: simple UUIDv4-ish generator（十分にユニークならOK）
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };

      mappedSpots = spotsInput.map((spot, idx) => {
        // サーバーにUUID以外を送らないため、入力の id は無視し必ず新規UUIDを採番
        const id = genUuid();
        const hints =
          Array.isArray(spot.hints) ? spot.hints.map((h, i) => ({
            id: `${id}-hint-${i + 1}`,
            label: `ヒント${i + 1}`,
            text: typeof h === 'string' ? h : h?.text || '',
          })) : [];
        return {
          id,
          name: spot.name || `スポット${idx + 1}`,
          address: spot.address || draft.area || questLocation || '',
          lat: typeof spot.lat === 'number' ? spot.lat : 0,
          lng: typeof spot.lng === 'number' ? spot.lng : 0,
          orderIndex: idx + 1,
          status: 'draft' as const,
          details: {
            directions: spot.directions || '',
            storyText: spot.storyText || '',
            challengeText: spot.challengeText || '',
            hints,
            answerText: spot.answer || '',
            answerType: 'text',
            acceptableAnswers: spot.acceptableAnswers || (spot.answer ? [spot.answer] : []),
            successMessage: spot.successMessage || 'ナイス！次のスポットへ進みましょう。',
          },
        };
      });
      // Only use AI-generated spots - no empty placeholders
      setRouteSpots(mappedSpots);
    }

    if (draft.story) {
      setStorySettings((prev) => ({
        castName: draft.story?.castName || prev.castName,
        castTone: draft.story?.castTone || prev.castTone,
        castIcon: prev.castIcon,
        prologueTitle: draft.story?.prologueTitle || prev.prologueTitle,
        prologueBody: draft.story?.prologueBody || prev.prologueBody,
        prologueImage: prev.prologueImage,
        epilogueBody: draft.story?.epilogueBody || prev.epilogueBody,
        socialMessage: prev.socialMessage,
        epilogueImage: prev.epilogueImage,
        characters: draft.story?.characters?.map((c: any, idx: number) => ({
          id: c.id || `c${idx + 1}`,
          name: c.name || '',
          role: c.role || '',
          color: c.color || 'bg-brand-gold',
          tone: c.tone || '',
        })) || prev.characters,
        scenario:
          draft.story?.scenario?.map((b, idx) => ({
            id: b.id || `scene-${idx + 1}`,
            type: (b.type as any) || 'scene',
            name: b.name || '',
            content: b.content || '',
            speaker: (b as any).speaker || '',
          })) || prev.scenario,
      }));
    }

    return { spots: mappedSpots };
  };

  const resetStorySettings = () => {
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
  };

  const handleAiGenerateDraft = async (input: AiDraftInput) => {
    setAiDraftError(null);
    setAiDraftLoading(true);
    try {
      const ensuredQuestId = questId || (await createDraftQuest());
      if (!ensuredQuestId) throw new Error('クエストの作成に失敗しました。ログイン状態を確認してください。');
      // upsert時に questId が null にならないよう、ここでセットを確定
      setQuestId(ensuredQuestId);
      setQuestId(ensuredQuestId);
      localStorage.setItem('quest-id', ensuredQuestId);

      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('VITE_GEMINI_API_KEY が設定されていません。');

      const prompt = `
あなたは位置連動ミステリークエストの設計者です。以下の入力をもとに、JSONだけを返してください。

【重要: スポット選定の処理手順】
1. まず指定エリアの中心座標を特定してください（エリア名から正確な緯度経度を割り出す）
2. その中心から半径2km以内で、テーマに関連する実在の観光地・ランドマークを10件選定してください
3. 選定した各スポット間の距離を計算し、隣接スポット間が500m以内になるようルートを最適化してください
4. 各スポットのlat/lngは具体的な数値（小数点以下5桁）で指定してください

- 出力フォーマット:
{
  "title": "短く魅力的なタイトル",
  "description": "100-200文字の概要。導入と体験価値を明確に",
  "area": "主なエリア名",
  "difficulty": "初級|中級|上級",
  "target": "想定ターゲットを短く",
  "tags": ["デートに最適", "歴史ロマン" など任意],
  "routeSpots": [
    {
      "name": "スポット名（実在する場所）",
      "address": "正確な住所やランドマーク",
      "lat": 35.XXXXX（実際の緯度）,
      "lng": 139.XXXXX（実際の経度）,
      "directions": "到達ヒント（現地への道案内や目印）",
      "storyText": "現地での物語/ナレーション（その場所の背景やストーリー）",
      "challengeText": "謎の本文（プレイヤーに解いてもらう問題）",
      "hints": ["ヒント1（段階的に難易度を下げる）","ヒント2（さらに具体的な手がかり）"],
      "answer": "正解例（正確な答え）",
      "acceptableAnswers": ["許容回答1（表記揺れ対応）","許容回答2（別名対応）"],
      "successMessage": "クリア時メッセージ（達成感を高める演出）",
      "preDialogue": [
        { "speakerType": "character", "speakerName": "登場人物名", "text": "到着時の会話（謎解き開始前）" },
        { "speakerType": "narrator", "speakerName": "ナレーション", "text": "場面説明" }
      ],
      "postDialogue": [
        { "speakerType": "character", "speakerName": "登場人物名", "text": "正解後の会話（次のスポットへの導入）" }
      ]
    }
  ],
  "story": {
    "castName": "案内役やナレーター名",
    "castTone": "口調の指示（例: 丁寧語、関西弁、ミステリアスなど）",
    "prologueTitle": "プロローグ見出し",
    "prologueBody": "導入文（200-400文字程度の物語の始まり）",
    "epilogueBody": "エンディング（200-400文字程度のクリア後メッセージ）",
    "characters": [
      { "id": "narrator", "name": "案内人名", "role": "ナレーター/案内人", "color": "bg-brand-gold", "tone": "丁寧でミステリアス" },
      { "id": "c1", "name": "登場人物1", "role": "役割（例: 謎の老人, 歴史研究家）", "color": "bg-indigo-500", "tone": "話し方の特徴" },
      { "id": "c2", "name": "登場人物2", "role": "役割", "color": "bg-emerald-500", "tone": "話し方の特徴" },
      { "id": "c3", "name": "登場人物3", "role": "役割", "color": "bg-rose-500", "tone": "話し方の特徴" }
    ],
    "scenario": [
      { "id": "scene-1", "type": "scene", "name": "場面名", "content": "セリフや描写", "speaker": "話し手" }
    ]
  }
}

【絶対必須条件】
1. スポット間距離の制約（最重要）:
   - 入力されたエリア名から実在する地域を特定し、その地域内でスポットを選定すること
   - 隣接するスポット間の直線距離は必ず500メートル以内にすること
   - これを守れない場合は、スポット数を減らしてでも制約を優先すること
   - 全スポットが徒歩で無理なく回れる範囲内であること
   - 各スポットには正確な緯度経度（lat, lng）を必ず設定すること

2. preDialogue と postDialogue の生成（必須）:
   - 各スポットには必ず preDialogue（謎解き前の会話、2-4行）と postDialogue（正解後の会話、1-2行）を含めること
   - speakerType は 'character' または 'narrator' を使用
   - 登場人物は story.characters で定義したキャラクターから選択すること

3. スポットとテーマの関連性:
   - 各スポットはクエストのテーマ・モチーフに密接に関連する場所であること
   - そのエリアに実在する場所・ランドマークを選ぶこと
   - 謎や物語がその場所の特徴を活かした内容であること

4. routeSpots は必ず10件を生成してください（全て詳細情報を含めること）

5. 登場人物（characters）の生成:
   - 案内人/ナレーター以外に、物語に登場するキャラクターを3〜5名生成すること
   - 各キャラクターには独自の役割、話し方、性格を設定すること
   - キャラクターはクエストの謎や物語に関わる人物であること

6. 各スポットの directions, storyText, challengeText, hints, answer, acceptableAnswers, successMessage は必ず記入してください

7. 謎は難易度に応じて適切な難しさにしてください（初級: 簡単な観察や計算、中級: 推理や知識、上級: 複合的な思考）

8. 対応言語に応じたコンテンツ生成:
   - 指定された各言語でコンテンツを生成すること
   - 日本語は必須、追加で選択された言語（英語、韓国語）も生成すること
   - 各言語版は全て同じJSON構造で、テキスト内容のみ言語に応じて変換すること

入力:
- エリア: ${input.area || '未指定'}
- テーマ: ${input.theme || '未指定'}
- 難易度: ${input.difficulty || '中級'}
- ターゲット: ${input.target || '未指定'}
- 対応言語: ${input.targetLanguages.join(', ')}
- 追加要望: ${input.notes || '特になし'}
${input.spotCount ? `- スポット数: ${input.spotCount}スポット` : '- スポット数: 7スポット（デフォルト）'}
${input.estimatedPlayTime ? `- 想定プレイ時間: ${input.estimatedPlayTime}` : ''}
${input.artStyle ? `- アートスタイル・世界観: ${input.artStyle}` : ''}
${input.storyTone ? `- 物語のトーン: ${input.storyTone}` : ''}
${input.characterCount ? `- 登場人物の人数: ${input.characterCount}人` : ''}
${input.specialRequirements ? `- 特別な指定・要件: ${input.specialRequirements}` : ''}
${input.includeSpots ? `- 必ず含めるスポット: ${input.includeSpots}` : ''}
${(input.challengeTypes || []).length > 0 ? `- チャレンジタイプ: ${(input.challengeTypes || []).join('、')}（これらのタイプからバランスよく出題）` : ''}
`.trim();

      const res = await fetch(
        getModelEndpoint('general', apiKey),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gemini API error: ${text}`);
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/```json([\s\S]*?)```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      const parsed = JSON.parse(jsonText.trim()) as AiDraftResult;
      const applied = applyAiDraftResult(parsed);
      const persistSuccess = await persistAiDraftResult(ensuredQuestId, parsed, applied.spots);
      setActiveWorkspaceStep(2);
      localStorage.setItem(`workspace-step:${ensuredQuestId}`, '2');
      // Save selected languages for multilingual page
      localStorage.setItem(`quest-languages:${ensuredQuestId}`, JSON.stringify(input.targetLanguages));
      // upsert が成功した場合、Supabase から再取得して Step2 に反映
      if (persistSuccess) {
        await fetchRouteSpots(ensuredQuestId);
      }
    } catch (err: any) {
      console.error(err);
      setAiDraftError(err?.message || 'AI生成に失敗しました。時間をおいて再試行してください。');
      throw err;
    } finally {
      setAiDraftLoading(false);
    }
  };

  const persistAiDraftResult = async (targetQuestId: string, draft: AiDraftResult, spots?: RouteSpot[]): Promise<boolean> => {
    try {
      // 最初のスポットの座標をクエストの中心座標として使用
      const firstSpot = spots?.[0];
      const locationLat = firstSpot?.lat || null;
      const locationLng = firstSpot?.lng || null;

      const { error: questErr } = await supabase.from('quests').upsert({
        id: targetQuestId,
        creator_id: user?.id || null,
        title: draft.title || questTitle || '',
        description: draft.description || questDescription || '',
        area_name: draft.area || questLocation || '',
        tags: draft.tags || [],
        location_lat: locationLat,
        location_lng: locationLng,
        updated_at: new Date().toISOString(),
        status: 'draft',
      });
      if (questErr) throw questErr;

      if (spots?.length) {
        // Delete existing spots and spot_details for this quest (replace with AI-generated ones)
        const { data: existingSpots } = await supabase
          .from('spots')
          .select('id')
          .eq('quest_id', targetQuestId);

        if (existingSpots && existingSpots.length > 0) {
          const existingSpotIds = existingSpots.map(s => s.id);
          // Delete spot_story_messages first
          await supabase
            .from('spot_story_messages')
            .delete()
            .in('spot_id', existingSpotIds);
          // Delete spot_details (foreign key constraint)
          await supabase
            .from('spot_details')
            .delete()
            .in('spot_id', existingSpotIds);
          // Delete spots
          await supabase
            .from('spots')
            .delete()
            .eq('quest_id', targetQuestId);
        }

        const spotRows = spots.map((s, idx) => ({
          id: s.id,
          quest_id: targetQuestId,
          name: s.name,
          address: s.address || '',
          lat: s.lat,
          lng: s.lng,
          order_index: s.orderIndex || idx + 1,
        }));
        const { error: spotErr } = await supabase.from('spots').insert(spotRows);
        if (spotErr) throw spotErr;

        const detailRows = spots
          .filter((s) => s.details) // details があるもののみ
          .map((s) => {
            const choiceOptions = s.details?.choiceOptions || [];
            const acceptable = s.details?.acceptableAnswers || [];
            return {
              id: s.id, // PK 用にセット（spot_id と同値）
              spot_id: s.id,
              nav_text: s.details?.directions || '',
              story_text: s.details?.storyText || '',
              question_text: s.details?.challengeText || '',
              answer_text: s.details?.answerText || '',
              hint_text: (s.details?.hints || []).map((h) => h.text).filter(Boolean).join('\n'),
              explanation_text: s.details?.successMessage || '',
              completion_message: s.details?.successMessage || '',
              answer_type: s.details?.answerType || 'text',
              // 型不一致を避けるため、空なら null。配列型ならそのまま、text型ならサーバー側でエラーになりますが、まずはnullで回避。
              choice_options: choiceOptions.length ? choiceOptions : null,
              acceptable_answers: acceptable.length ? acceptable : null,
            };
          });
        if (detailRows.length > 0) {
          const { error: detailErr } = await supabase.from('spot_details').upsert(detailRows, { onConflict: 'spot_id' });
          if (detailErr) {
            console.error('spot_details upsert failed:', detailErr);
            throw detailErr;
          }
        }

        // Save spot conversations from AI generation result (no separate API call)
        if (draft.routeSpots?.length) {
          const storyMessages: Array<{
            spot_id: string;
            message_type: 'pre_puzzle' | 'post_puzzle';
            sequence: number;
            speaker_type: 'character' | 'narrator';
            speaker_name: string;
            message_text: string;
          }> = [];

          for (let i = 0; i < spots.length; i++) {
            const spot = spots[i];
            const draftSpot = draft.routeSpots[i];
            if (!draftSpot) continue;

            // Add pre-puzzle dialogues
            (draftSpot.preDialogue || []).forEach((line, seq) => {
              storyMessages.push({
                spot_id: spot.id,
                message_type: 'pre_puzzle',
                sequence: seq + 1,
                speaker_type: line.speakerType || 'character',
                speaker_name: line.speakerName || '',
                message_text: line.text || '',
              });
            });

            // Add post-puzzle dialogues
            (draftSpot.postDialogue || []).forEach((line, seq) => {
              storyMessages.push({
                spot_id: spot.id,
                message_type: 'post_puzzle',
                sequence: seq + 1,
                speaker_type: line.speakerType || 'character',
                speaker_name: line.speakerName || '',
                message_text: line.text || '',
              });
            });
          }

          if (storyMessages.length > 0) {
            const { error: msgErr } = await supabase.from('spot_story_messages').insert(storyMessages);
            if (msgErr) {
              console.error('spot_story_messages insert failed:', msgErr);
            }
          }
        }
      }

      if (draft.story) {
        const scenarioBlocks =
          draft.story.scenario?.map((b, idx) => ({
            ...b,
            id: b.id || `scene-${idx + 1}`,
          })) || [];

        const { error: storyErr } = await supabase.from('story_timelines').upsert(
          {
            quest_id: targetQuestId,
            cast_name: draft.story.castName || storySettings.castName || '',
            cast_tone: draft.story.castTone || storySettings.castTone || '',
            cast_icon: storySettings.castIcon || '',
            prologue_title: draft.story.prologueTitle || storySettings.prologueTitle || '',
            prologue: draft.story.prologueBody || storySettings.prologueBody || '',
            epilogue: draft.story.epilogueBody || storySettings.epilogueBody || '',
            characters: draft.story.characters || storySettings.characters || [],
            timeline_data: scenarioBlocks,
            timeline_json: scenarioBlocks,
          },
          { onConflict: 'quest_id' }
        );
        if (storyErr) throw storyErr;
      }
      return true;
    } catch (err) {
      console.error('AI draft persist failed', err);
      // 失敗してもローカル反映は維持する
      return false;
    }
  };

  const handleDeleteQuest = async () => {
    if (!questId) {
      alert('削除対象のクエストがありません。');
      return;
    }
    const ok = window.confirm('このクエストを消去しますか？\n関連するスポットやストーリーも削除されます。');
    if (!ok) return;
    setDeleteLoading(true);
    try {
      console.log('[DELETE] Starting deletion for quest:', questId);

      // 1. Get spot IDs
      const { data: spotRows, error: spotQueryErr } = await supabase.from('spots').select('id').eq('quest_id', questId);
      if (spotQueryErr) console.error('[DELETE] Error fetching spots:', spotQueryErr);
      const spotIds = (spotRows || []).map((s: any) => s.id).filter(Boolean);
      console.log('[DELETE] Found spots:', spotIds);

      // 2. Delete spot_details
      if (spotIds.length) {
        const { error: detailsErr } = await supabase.from('spot_details').delete().in('spot_id', spotIds);
        if (detailsErr) console.error('[DELETE] Error deleting spot_details:', detailsErr);
        else console.log('[DELETE] Deleted spot_details');
      }

      // 3. Delete spot_story_messages
      if (spotIds.length) {
        const { error: msgErr } = await supabase.from('spot_story_messages').delete().in('spot_id', spotIds);
        if (msgErr) console.error('[DELETE] Error deleting spot_story_messages:', msgErr);
        else console.log('[DELETE] Deleted spot_story_messages');
      }

      // 4. Delete spots
      const { error: spotsErr } = await supabase.from('spots').delete().eq('quest_id', questId);
      if (spotsErr) console.error('[DELETE] Error deleting spots:', spotsErr);
      else console.log('[DELETE] Deleted spots');

      // 5. Delete story_timelines
      const { error: timelineErr } = await supabase.from('story_timelines').delete().eq('quest_id', questId);
      if (timelineErr) console.error('[DELETE] Error deleting story_timelines:', timelineErr);
      else console.log('[DELETE] Deleted story_timelines');

      // 6. Delete play_sessions (FK constraint on quest_id)
      const { error: sessionsErr } = await supabase.from('play_sessions').delete().eq('quest_id', questId);
      if (sessionsErr) console.error('[DELETE] Error deleting play_sessions:', sessionsErr);
      else console.log('[DELETE] Deleted play_sessions');

      // 7. Delete quest itself
      const { error: questErr } = await supabase.from('quests').delete().eq('id', questId);
      if (questErr) {
        console.error('[DELETE] Error deleting quest:', questErr);
        alert(`クエスト削除エラー: ${questErr.message}\nCode: ${questErr.code}\nDetails: ${questErr.details || 'N/A'}`);
        setDeleteLoading(false);
        return;
      }
      console.log('[DELETE] Deleted quest successfully');

      setProfileQuests((prev) => prev.filter((q) => q.id !== questId));
      localStorage.removeItem('quest-id');
      localStorage.removeItem(`workspace-step:${questId}`);
      setQuestId(null);
      setQuestTitle('');
      setQuestDescription('');
      setQuestLocation('');
      setRouteSpots([]);
      setActiveWorkspaceStep(1);
      resetStorySettings();
      goToProfile();
      alert('クエストを消去しました。');
    } catch (err: any) {
      console.error('delete quest failed', err);
      alert(`クエストの消去に失敗しました: ${err?.message || err}`);
    } finally {
      setDeleteLoading(false);
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
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${activePage === 'creator-canvas'
            ? 'bg-white py-4 shadow-sm border-b border-stone-200'
            : isScrolled
              ? 'bg-white/80 backdrop-blur-md py-4 shadow-lg border-b border-stone-200/50'
              : 'bg-transparent py-6'
            }`}
        >
          <div className="container mx-auto px-4 md:px-8 flex items-center justify-between">
            <button onClick={() => goHome()} className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
              <TomoshibiLogo className="h-8 md:h-10 w-auto" />
            </button>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-4 lg:gap-6">
              {/* Primary nav links - About link first */}
              <button
                onClick={() => navigate('/about')}
                className="text-xs lg:text-sm font-medium text-stone-600 hover:text-brand-gold transition-colors relative group whitespace-nowrap"
              >
                About
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-gold transition-all group-hover:w-full" />
              </button>
              <button
                onClick={() => handleNavClick('#features')}
                className="text-xs lg:text-sm font-medium text-stone-600 hover:text-brand-gold transition-colors relative group whitespace-nowrap"
              >
                {t.nav.features}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-gold transition-all group-hover:w-full" />
              </button>
              <button
                onClick={() => handleNavClick('#how-it-works')}
                className="text-xs lg:text-sm font-medium text-stone-600 hover:text-brand-gold transition-colors relative group whitespace-nowrap"
              >
                {t.nav.howItWorks}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-gold transition-all group-hover:w-full" />
              </button>
              <button
                onClick={() => handleNavClick('#creators')}
                className="text-xs lg:text-sm font-medium text-stone-600 hover:text-brand-gold transition-colors relative group whitespace-nowrap"
              >
                {t.nav.creators}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-gold transition-all group-hover:w-full" />
              </button>

              {/* Divider */}
              <div className="w-px h-5 bg-stone-300" />

              {/* B2B link - subtle text style */}
              <button
                onClick={() => navigate('/business')}
                className="text-xs lg:text-sm font-medium text-stone-500 hover:text-brand-gold transition-colors whitespace-nowrap"
              >
                {t.nav.business}
              </button>

              {/* Primary CTA */}
              <button
                onClick={goToQuestList}
                className="bg-brand-gold text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-amber-600 transition-all shadow-md hover:shadow-lg"
              >
                {t.nav.findQuest}
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
                      <div className="p-3 border-b border-stone-100 text-sm font-bold text-brand-dark">{t.common.notifications}</div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 && (
                          <div className="px-4 py-3 text-xs text-stone-500">{t.common.noNotifications}</div>
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
                  {/* Language Switcher (Logged In) - placed in flex flow */}
                  <div className="flex items-center gap-1 bg-white/50 backdrop-blur-sm rounded-full p-1 border border-stone-200">
                    <button
                      onClick={() => setCurrentLang('ja')}
                      className={`px-2 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all ${currentLang === 'ja' ? 'bg-brand-dark text-white shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                      title="日本語"
                    >
                      JA
                    </button>
                    <button
                      onClick={() => setCurrentLang('en')}
                      className={`px-2 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all ${currentLang === 'en' ? 'bg-brand-dark text-white shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                      title="English"
                    >
                      EN
                    </button>
                    <button
                      onClick={() => setCurrentLang('ko')}
                      className={`px-2 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all ${currentLang === 'ko' ? 'bg-brand-dark text-white shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                      title="한국어"
                    >
                      KO
                    </button>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center gap-3 pl-3 pr-4 py-2 rounded-full border border-stone-300 bg-white/90 backdrop-blur text-sm font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold transition-all shadow-sm"
                    >
                      <span className="w-8 h-8 rounded-full bg-brand-dark text-white flex items-center justify-center font-bold overflow-hidden">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          currentUserEmail.charAt(0).toUpperCase()
                        )}
                      </span>
                    </button>

                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
                        <button
                          onClick={goToProfile}
                          className="w-full text-left px-4 py-3 text-sm text-brand-dark hover:bg-brand-base"
                        >
                          {t.common.profile}
                        </button>
                        {profile?.role === 'admin' && (
                          <button
                            onClick={goToAdminDashboard}
                            className="w-full text-left px-4 py-3 text-sm text-brand-dark hover:bg-brand-base"
                          >
                            {t.common.adminDashboard}
                          </button>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-3 text-sm text-brand-dark hover:bg-brand-base"
                        >
                          {t.common.logout}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : loading ? (
                <div className="w-10 h-10 rounded-full bg-stone-200 animate-pulse" />
              ) : (
                <div className="flex items-center">
                  <button
                    onClick={() => goToAuth('login')}
                    className="ml-2 px-4 py-2 rounded-full border border-stone-300 bg-white/80 backdrop-blur text-sm font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold transition-all shadow-sm"
                  >
                    {t.common.login}
                  </button>
                  <div className="flex items-center gap-1 bg-white/50 backdrop-blur-sm rounded-full p-1 border border-stone-200 ml-2">
                    <button
                      onClick={() => setCurrentLang('ja')}
                      className={`px-2 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all ${currentLang === 'ja' ? 'bg-brand-dark text-white shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                      title="日本語"
                    >
                      JA
                    </button>
                    <button
                      onClick={() => setCurrentLang('en')}
                      className={`px-2 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all ${currentLang === 'en' ? 'bg-brand-dark text-white shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                      title="English"
                    >
                      EN
                    </button>
                    <button
                      onClick={() => setCurrentLang('ko')}
                      className={`px-2 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all ${currentLang === 'ko' ? 'bg-brand-dark text-white shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                      title="한국어"
                    >
                      KO
                    </button>
                  </div>
                </div>
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
                  {/* Language Switcher for Mobile */}
                  <div className="flex items-center justify-center gap-2 bg-stone-100 rounded-xl p-2">
                    <button
                      onClick={() => setCurrentLang('ja')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${currentLang === 'ja' ? 'bg-brand-dark text-white shadow-sm' : 'text-stone-500 hover:text-brand-dark'}`}
                    >
                      JA
                    </button>
                    <button
                      onClick={() => setCurrentLang('en')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${currentLang === 'en' ? 'bg-brand-dark text-white shadow-sm' : 'text-stone-500 hover:text-brand-dark'}`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => setCurrentLang('ko')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${currentLang === 'ko' ? 'bg-brand-dark text-white shadow-sm' : 'text-stone-500 hover:text-brand-dark'}`}
                    >
                      KO
                    </button>
                  </div>
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
                    onClick={() => { setIsMenuOpen(false); navigate('/business'); }}
                    className="w-full border-2 border-brand-gold text-brand-dark py-3 rounded-lg font-bold"
                  >
                    自治体・企業の方へ
                  </button>
                  <button
                    onClick={goToQuestList}
                    className="w-full bg-brand-gold text-white py-3 rounded-lg font-bold"
                  >
                    {t.nav.findQuest}
                  </button>
                  {!loading && currentUserEmail ? (
                    <div className="flex flex-col gap-2 border border-stone-200 rounded-lg p-3 bg-white">
                      <div className="flex items-center gap-2">
                        <span className="w-9 h-9 rounded-full bg-brand-dark text-white flex items-center justify-center font-bold overflow-hidden">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            currentUserEmail.charAt(0).toUpperCase()
                          )}
                        </span>
                      </div>
                      <button
                        onClick={goToProfile}
                        className="w-full bg-brand-dark text-white py-2 rounded-lg font-bold text-sm hover:bg-brand-gold transition-colors"
                      >
                        {t.common.profile}
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full border border-stone-300 text-brand-dark py-2 rounded-lg font-bold text-sm hover:border-brand-gold hover:text-brand-gold transition-colors"
                      >
                        {t.common.logout}
                      </button>
                    </div>
                  ) : loading ? (
                    <div className="flex items-center justify-center py-4 text-stone-400 text-sm">{t.common.loading}</div>
                  ) : (
                    <button
                      onClick={() => goToAuth('login')}
                      className="w-full border border-stone-300 text-brand-dark py-3 rounded-lg font-bold hover:border-brand-gold hover:text-brand-gold transition-colors"
                    >
                      {t.common.login}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      )}

      {activePage === 'quests' && (
        <PlayerQuestList
          onSelectQuest={openQuestDetail}
          onBackHome={() => goHome()}
          ownedQuestIds={ownedQuestIds}
          initialBrandFilter={questBrandFilter}
          t={t.questsPage}
        />
      )}

      {activePage === 'quest-detail' && selectedQuest && (
        <PlayerQuestDetail
          quest={selectedQuest}
          onBackToList={backToQuestList}
          onBackHome={() => goHome()}
          onOpenApp={openAppCTA}
          purchased={selectedQuest.owned || ownedQuestIds.includes(selectedQuest.id)}
          onPurchase={handlePurchaseQuest}
          purchasing={purchaseLoading}
          t={t.questDetailPage}
        />
      )}

      {activePage === 'quest-detail' && !selectedQuest && (
        <div className="py-32 text-center text-stone-500">{t.questsPage.loadingQuest}</div>
      )}

      {activePage === 'creators' && (
        <CreatorPage onBackHome={() => goHome()} onGoAuth={goToAuth} onOpenOnboarding={openCreatorOnboarding} t={t.creatorsPage} />
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
          onOpenWorkspace={async (quest) => {
            setQuestId(quest.id);
            localStorage.setItem('quest-id', quest.id);
            setQuestTitle(quest.title || '');
            setQuestDescription(quest.description || '');
            setQuestLocation(quest.area_name || '');
            const tagArray = Array.isArray(quest.tags) ? quest.tags : [];
            setQuestCategoryTags(tagArray.filter((tg: string) => CATEGORY_TAGS.includes(tg)));
            setQuestHashtags(tagArray.filter((tg: string) => !CATEGORY_TAGS.includes(tg)));
            if (quest.location_lat && quest.location_lng) setQuestLatLng({ lat: quest.location_lat, lng: quest.location_lng });

            // Load spots with details
            await fetchRouteSpots(quest.id);

            // Load story data
            const { data: storyData } = await supabase
              .from('story_timelines')
              .select('*')
              .eq('quest_id', quest.id)
              .maybeSingle();
            if (storyData) {
              setStorySettings((prev) => ({
                ...prev,
                castName: storyData.cast_name || '',
                castTone: storyData.cast_tone || '',
                prologueBody: storyData.prologue || '',
                epilogueBody: storyData.epilogue || '',
                characters: Array.isArray(storyData.characters) ? storyData.characters : [],
                scenario: Array.isArray(storyData.scenario) ? storyData.scenario : [],
              }));
            }

            loadWorkspaceStep(quest.id);
            goToWorkspace(quest.id);
          }}
          onOpenAnalytics={(quest) => {
            goToCreatorAnalytics(quest.id, quest.title);
          }}
          onDeleteQuest={async (quest) => {
            const confirmed = window.confirm(`「${quest.title || 'このクエスト'}」を削除しますか？\nこの操作は取り消せません。`);
            if (!confirmed) return;
            try {
              const { error } = await supabase
                .from('quests')
                .delete()
                .eq('id', quest.id);
              if (error) throw error;
              // Refresh the quest list
              setProfileQuests(prev => prev.filter(q => q.id !== quest.id));
            } catch (err) {
              console.error('Failed to delete quest:', err);
              alert('削除に失敗しました');
            }
          }}
          t={t.profilePage}
        />
      )}

      {activePage === 'creator-start' && (
        <CreatorStartPage
          selectedType={selectedQuestType}
          setSelectedType={setSelectedQuestType}
          onBack={() => goToProfile()}
          onStart={async () => {
            if (selectedQuestType === 'mystery') {
              // Navigate to AI Quest Creator Canvas directly
              navigate('/creator/canvas/new');
            } else {
              goToCreatorPage();
            }
          }}
          onOpenOnboarding={openCreatorOnboarding}
        />
      )}

      {activePage === 'creator-canvas' && (
        <QuestCreatorCanvas
          questId={questId}
          onBack={() => goToProfile()}
          onLogoHome={() => goHome()}
          onPublish={handlePublish}
          onTestRun={() => goToTestRun()}
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
          onSaveNext={() => {
            setActiveWorkspaceStep(2);
            markQuestProgress(1);
            goToWorkspace();
          }}
          onBack={() => goToWorkspace()}
          onLogoHome={() => goHome()}
          onGoWorkspace={() => goToWorkspace()}
          userId={user?.id || null}
          questId={questId}
          setQuestId={setQuestId}
          setQuestLatLng={setQuestLatLng}
          questLatLng={questLatLng}
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
          onOpenSpotDetail={(id) => {
            setActiveSpotId(id);
            applyRoute('creator-spot-detail', { spotId: id });
          }}
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
          isSocialQuest={selectedQuestType === 'scavenger'}
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
          onPreview={() => { }}
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
          onAiGenerateDraft={handleAiGenerateDraft}
          aiDraftLoading={aiDraftLoading}
          aiDraftError={aiDraftError}
          onDeleteQuest={handleDeleteQuest}
          deleteLoading={deleteLoading}
          questId={questId}
          onGoMultilingual={() => {
            setActiveWorkspaceStep(4);
            applyRoute('creator-workspace-languages', { questId });
            setShowCreatorOnboarding(false);
            setIsMenuOpen(false);
            setIsUserMenuOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          questMode={questMode}
          onPlayNow={() => goToTestRun()}
          onOpenShareModal={() => openQualityModal('SHARE')}
          onOpenPublishModal={() => openQualityModal('PUBLISH')}
          isPaidUser={profile?.role === 'creator' || profile?.role === 'admin'}
        />
      )}

      {/* Quality Checklist Modal for Share/Publish */}
      <QualityChecklistModal
        isOpen={showQualityModal}
        onClose={() => setShowQualityModal(false)}
        targetMode={qualityModalMode}
        currentChecklist={qualityChecklist}
        onChecklistChange={handleQualityChecklistChange}
        onConfirm={handleQualityConfirm}
        userId={user?.id}
        shareToken={shareToken}
        onGenerateShareToken={generateShareToken}
      />

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

      {activePage === 'player' && (
        <PlayerGameView onBackHome={() => goHome()} />
      )}

      {activePage === 'about' && (
        <AboutPage
          t={{
            nav: { about: 'TOMOSHIBIについて' },
            aboutPage: {
              title: 'TOMOSHIBIについて',
              subtitle: '街歩き×謎解きで、日常を冒険に変える',
              missionTitle: 'Mission',
              missionText: '私たちは、テクノロジーと物語の力で、人々が街を歩き、発見し、つながる新しい体験を創造します。日常の風景に隠された物語を解き明かすことで、街への愛着と人々の絆を深めます。',
              visionTitle: 'Vision',
              visionText: '世界中の街が、物語で彩られる未来。TOMOSHIBIは、ローカルの魅力を世界に届け、旅行者と地域をつなぐプラットフォームを目指します。',
              valuesTitle: '私たちの価値観',
              values: [
                { title: '冒険心', description: '未知への好奇心を大切にし、新しい発見を楽しむ心を育みます。' },
                { title: '地域愛', description: '街の歴史や文化を尊重し、地域の魅力を再発見する機会を提供します。' },
                { title: 'つながり', description: '人と人、人と街をつなぎ、共有体験を通じて絆を深めます。' },
                { title: '創造性', description: 'クリエイターの自由な発想を支援し、多様な物語を世界に届けます。' },
              ],
              teamTitle: '【作成中】運営チーム',
              teamSubtitle: 'TOMOSHIBIを運営するメンバーを紹介します',
              members: [
                { name: 'メンバー 1', role: 'Founder / CEO', bio: 'TOMOSHIBIの創業者。街歩きと謎解きを通じて、新しい体験を創造することに情熱を注いでいます。' },
                { name: 'メンバー 2', role: 'CTO', bio: '技術面でTOMOSHIBIを支える。ユーザー体験を最高にするための開発をリードしています。' },
                { name: 'メンバー 3', role: 'クリエイティブディレクター', bio: 'ストーリーテリングとデザインを担当。没入感のある体験を設計しています。' },
              ],
              backToHome: 'ホームに戻る',
            },
          }}
          onLogoHome={() => goHome()}
        />
      )}

      {activePage === 'business' && (
        <BusinessLandingPage />
      )}


      {isHome && (
        <>
          {/* --- Hero Section --- */}
          <HeroGenerateSection
            onNavigateToQuests={goToQuestList}
            translations={{
              title: t.hero.title,
              description: t.hero.description,
            }}
          />

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
                    <div className="text-sm text-stone-500 mb-2 font-medium">
                      {idx === 0 ? t.stats.area : idx === 1 ? t.stats.quests : t.stats.players}
                    </div>
                    <div className="text-3xl md:text-4xl font-serif font-bold text-brand-dark">
                      {idx === 0 ? t.stats.areaValue : stat.value}
                    </div>
                  </motion.div>
                ))}
              </div>
              <p className="text-center text-stone-500 mt-10 text-sm md:text-base font-light italic">
                {currentLang === 'ja'
                  ? '「観光、デート、家族のおでかけ、チームビルディングまで。街歩きが“物語体験”に変わる新しい余暇のかたちです。」'
                  : currentLang === 'en'
                    ? '"From sightseeing to dates, family outings, and team building. A new form of leisure turning city walks into story experiences."'
                    : '"관광, 데이트, 가족 나들이, 팀 빌딩까지. 거리 산책이 \'이야기 체험\'으로 바뀌는 새로운 여가 형태입니다."'}
              </p>
            </div>
          </section>

          {/* --- Features Section --- */}
          <section id="features" className="py-32 relative overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-stone-50 via-white to-amber-50/20" />
            {/* Subtle pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,165,116,0.03)_0%,transparent_50%)] pointer-events-none" />

            <div className="container mx-auto px-4 md:px-8 relative z-10">
              <SectionHeading subtitle={t.hero.description}>
                {t.nav.features}
              </SectionHeading>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
                {t.features.list.map((feature, idx) => {
                  const Icon = FEATURES[idx].icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.15, duration: 0.5 }}
                      whileHover={{ y: -8 }}
                      className="group relative"
                    >
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/20 to-amber-400/10 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      {/* Card */}
                      <div className="relative bg-white/80 backdrop-blur-sm rounded-[2rem] p-8 shadow-sm hover:shadow-2xl transition-all duration-500 border border-stone-100/80 overflow-hidden h-full">
                        {/* Glassmorphism shine */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent pointer-events-none" />

                        {/* Decorative corner */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-stone-100/50 to-transparent rounded-bl-[100px] -mr-8 -mt-8 transition-all duration-500 group-hover:from-brand-gold/10" />

                        <div className="relative z-10">
                          {/* Icon with animated background */}
                          <div className="relative w-14 h-14 mb-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 to-amber-100/50 rounded-2xl transition-all duration-500 group-hover:scale-125 group-hover:opacity-60" />
                            <div className="relative w-full h-full bg-white border border-stone-100 rounded-2xl flex items-center justify-center text-stone-400 group-hover:border-brand-gold/30 group-hover:text-brand-gold group-hover:shadow-lg transition-all duration-300">
                              <Icon size={26} strokeWidth={1.5} />
                            </div>
                          </div>

                          <h3 className="text-xl font-bold mb-4 text-brand-dark group-hover:text-brand-gold transition-colors duration-300">{feature.title}</h3>
                          <p className="text-stone-500 text-sm leading-relaxed group-hover:text-stone-600 transition-colors">
                            {feature.desc}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* --- SPR Detective Agency Section --- */}
          <section id="spr" className="py-24 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900" />
            {/* Decorative elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-1/4 left-1/4 w-64 h-64 border border-brand-gold rounded-full" />
              <div className="absolute bottom-1/3 right-1/3 w-48 h-48 border border-amber-500/50 rounded-full" />
              <div className="absolute top-1/2 right-1/4 w-32 h-32 border border-brand-gold/30 rounded-full" />
            </div>

            <div className="container mx-auto px-4 md:px-8 relative z-10">
              <motion.div
                className="max-w-4xl mx-auto text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-gold/10 backdrop-blur-md rounded-full text-brand-gold text-xs font-bold mb-8 border border-brand-gold/30 shadow-lg">
                  <span className="relative w-2 h-2 rounded-full bg-brand-gold">
                    <span className="absolute inset-0 rounded-full bg-brand-gold animate-ping opacity-75" />
                  </span>
                  {t.spr.badge}
                </div>

                {/* Title */}
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6 leading-tight">
                  <span className="text-brand-gold">{t.spr.title}</span>
                  <span className="text-white">{t.spr.subtitle}</span>
                </h2>

                {/* Full Name */}
                <p className="text-sm md:text-base text-stone-400 font-mono tracking-widest mb-8">
                  — {t.spr.fullName} —
                </p>

                {/* Description */}
                <p className="text-stone-300 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
                  {t.spr.description}
                </p>

                {/* Magnifying glass icon decoration */}
                <div className="flex justify-center mb-10">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-brand-gold/50 flex items-center justify-center bg-brand-gold/10 backdrop-blur-sm">
                      <Search size={40} className="text-brand-gold" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-16 border-4 border-brand-gold/50 rounded-full transform rotate-45 origin-top" />
                  </div>
                </div>

                {/* CTA Button */}
                <motion.button
                  onClick={() => goToQuestList('spr')}
                  className="group bg-brand-gold text-brand-dark px-8 py-4 rounded-full font-bold text-lg shadow-xl flex items-center gap-3 mx-auto hover:bg-amber-500 transition-colors"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Briefcase size={20} />
                  <span>{t.spr.cta}</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </motion.div>
            </div>
          </section>

          {/* --- How it Works --- */}
          <section id="how-it-works" className="py-32 relative overflow-hidden bg-gradient-to-b from-white via-stone-50/50 to-white">
            {/* Decorative Grid with brand color tint */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(212,165,116,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(212,165,116,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none" />

            {/* Ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-gold/5 rounded-full blur-[150px] pointer-events-none" />

            <div className="container mx-auto px-4 md:px-8 relative z-10">
              <SectionHeading subtitle={t.steps.title}>
                {t.nav.howItWorks}
              </SectionHeading>

              <div className="max-w-5xl mx-auto mt-20">
                <div className="relative">
                  {/* Animated Central Line with gradient */}
                  <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px md:-translate-x-1/2 overflow-hidden">
                    <motion.div
                      className="w-full h-full bg-gradient-to-b from-brand-gold via-amber-400 to-orange-300"
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      style={{ transformOrigin: "top" }}
                    />
                  </div>

                  {t.steps.list.map((step, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ delay: idx * 0.25, duration: 0.6 }}
                      className={`relative flex flex-col md:flex-row gap-8 items-start mb-24 last:mb-0 ${idx % 2 === 0 ? '' : 'md:flex-row-reverse'}`}
                    >
                      {/* Timeline Node with glow */}
                      <motion.div
                        className="absolute left-6 md:left-1/2 -translate-x-1/2 z-20 mt-6"
                        whileInView={{ scale: [0, 1.2, 1] }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.25 + 0.3, duration: 0.4 }}
                      >
                        <div className="relative">
                          <div className="absolute inset-0 w-5 h-5 bg-brand-gold rounded-full blur-md opacity-60" />
                          <div className="relative w-5 h-5 bg-gradient-to-br from-brand-gold to-amber-500 border-4 border-white rounded-full shadow-lg" />
                        </div>
                      </motion.div>

                      {/* Content Card */}
                      <div className={`pl-16 md:pl-0 md:w-1/2 ${idx % 2 === 0 ? 'md:pr-20 text-left' : 'md:pl-20 md:text-left'}`}>
                        <motion.div
                          className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-stone-100 shadow-sm hover:shadow-xl transition-all duration-500"
                          whileHover={{ y: -4 }}
                        >
                          {/* Glow effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                          {/* Step number with gradient */}
                          <div className={`absolute top-0 text-[7rem] font-serif font-bold leading-none select-none pointer-events-none ${idx % 2 === 0 ? '-left-4 md:-left-6' : '-left-4 md:-left-6'}`}>
                            <span className="text-transparent bg-clip-text bg-gradient-to-br from-stone-100 to-stone-200 group-hover:from-brand-gold/20 group-hover:to-amber-200/30 transition-all duration-500">
                              0{idx + 1}
                            </span>
                          </div>

                          <div className="relative">
                            <h3 className="text-2xl font-bold text-brand-dark mb-3 group-hover:text-brand-gold transition-colors duration-300">{step.title}</h3>
                            <p className="text-stone-600 leading-relaxed text-base">
                              {step.desc}
                            </p>
                          </div>
                        </motion.div>
                      </div>

                      {/* Empty space for the other side */}
                      <div className="hidden md:block md:w-1/2" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* --- Scenes / Use Cases --- */}
          <section id="scenes" className="py-32 relative overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-white via-amber-50/20 to-stone-50" />

            <div className="container mx-auto px-4 md:px-8 relative z-10">
              <SectionHeading subtitle={t.scenes.subtitle}>
                {t.scenes.title}
              </SectionHeading>

              <div className="grid md:grid-cols-3 gap-8">
                {t.scenes.list.map((scene, idx) => {
                  const Icon = SCENES[idx].icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ delay: idx * 0.15, duration: 0.6 }}
                      whileHover={{ y: -12 }}
                      className="group relative"
                    >
                      {/* Glow effect behind card */}
                      <div className="absolute -inset-1 bg-gradient-to-r from-brand-gold/30 via-amber-400/20 to-orange-400/30 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-700" />

                      <div className="relative h-[420px] rounded-3xl overflow-hidden shadow-xl group-hover:shadow-2xl transition-shadow duration-500">
                        {/* Background Image with enhanced zoom */}
                        <div className="absolute inset-0">
                          <img
                            src={SCENES[idx].image}
                            alt={scene.title}
                            className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.15]"
                          />
                          {/* Multi-layer gradient for depth */}
                          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-transparent opacity-90" />
                          <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>

                        {/* Content with glass effect */}
                        <div className="absolute inset-0 p-8 flex flex-col justify-end">
                          {/* Icon with glassmorphism */}
                          <motion.div
                            className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white mb-4 border border-white/20 shadow-lg"
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Icon size={26} />
                          </motion.div>

                          {/* Tag with animated underline */}
                          <div className="relative inline-block mb-2">
                            <span className="text-brand-gold text-xs font-bold tracking-widest uppercase">
                              {SCENES[idx].target}
                            </span>
                            <motion.div
                              className="absolute -bottom-1 left-0 h-px bg-gradient-to-r from-brand-gold to-transparent"
                              initial={{ width: 0 }}
                              whileInView={{ width: "100%" }}
                              viewport={{ once: true }}
                              transition={{ delay: idx * 0.15 + 0.5, duration: 0.5 }}
                            />
                          </div>

                          <h3 className="text-2xl font-serif font-bold mb-3 text-white group-hover:text-brand-gold/90 transition-colors duration-300">{scene.title}</h3>

                          <motion.p
                            className="text-stone-200/90 text-sm leading-relaxed"
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 0 }}
                            animate={{ opacity: 0 }}
                            whileHover={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            {scene.desc}
                          </motion.p>
                          {/* Description visible on hover */}
                          <p className="text-stone-200/90 text-sm leading-relaxed opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-400">
                            {scene.desc}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* --- Creator CTA --- */}
          <section id="creators" className="py-32 my-10 relative overflow-hidden">
            {/* Animated gradient background */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-brand-dark via-stone-900 to-brand-dark"
              animate={{
                background: [
                  "linear-gradient(to bottom right, #1c1917, #292524, #1c1917)",
                  "linear-gradient(to bottom right, #292524, #1c1917, #292524)",
                  "linear-gradient(to bottom right, #1c1917, #292524, #1c1917)"
                ]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />

            {/* Ambient glow orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-gold/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="container mx-auto px-4 md:px-8 relative z-10">
              {/* Header */}
              <motion.div
                className="text-center mb-16"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 backdrop-blur-md rounded-full text-brand-gold text-xs font-bold mb-6 border border-brand-gold/20 shadow-lg">
                  <span className="relative w-2 h-2 rounded-full bg-brand-gold">
                    <span className="absolute inset-0 rounded-full bg-brand-gold animate-ping opacity-75" />
                  </span>
                  FOR CREATORS
                </div>
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6 leading-tight">
                  {t.creators.title}
                </h2>
                <p className="text-stone-400 text-lg max-w-2xl mx-auto">
                  プログラミング不要。直感的なUIで誰でもクエストを作成・公開できます。
                </p>
              </motion.div>

              {/* Feature Cards */}
              <motion.div
                className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                }}
              >
                {/* AI Generation */}
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                  className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/15 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-gold to-amber-500 flex items-center justify-center mb-4">
                    <Sparkles size={24} className="text-brand-dark" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">AI自動生成</h3>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    ストーリー・謎・ヒント・キャラクター会話をAIが自動生成。アイデアから完成まで最速で。
                  </p>
                </motion.div>

                {/* Spot Management */}
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                  className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/15 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4">
                    <MapPin size={24} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">スポット設定</h3>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    地図上で直感的にスポットを配置。道順、ヒント、正解条件を細かく設定できます。
                  </p>
                </motion.div>

                {/* Multilingual */}
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                  className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/15 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mb-4">
                    <Globe2 size={24} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">多言語対応</h3>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    日本語・英語・韓国語に対応。AIが翻訳をサポートし、インバウンド対応も簡単。
                  </p>
                </motion.div>

                {/* Analytics */}
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                  className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/15 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center mb-4">
                    <BarChart2 size={24} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">プレイ分析</h3>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    参加数、クリア率、離脱ポイントを可視化。データを元に改善できます。
                  </p>
                </motion.div>
              </motion.div>

              {/* CTA Button */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <motion.button
                  onClick={goToCreatorPage}
                  className="relative group bg-white text-brand-dark px-10 py-5 rounded-full font-bold text-lg shadow-xl flex items-center gap-3 mx-auto overflow-hidden"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-gold/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                  />
                  <Sparkles size={20} className="relative z-10 group-hover:text-brand-gold transition-colors" />
                  <span className="relative z-10">{t.creators.cta}</span>
                  <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                </motion.button>
                <p className="text-stone-500 text-sm mt-4">無料で始められます</p>
              </motion.div>
            </div>
          </section>

          {/* --- FAQ --- */}
          <section id="faq" className="py-32 relative overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-stone-50 via-white to-amber-50/10" />

            <div className="container mx-auto px-4 md:px-8 max-w-3xl relative z-10">
              <SectionHeading subtitle={t.faq.title}>
                FAQ
              </SectionHeading>

              <div className="space-y-4">
                {t.faq.list.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="group"
                  >
                    <div className={`bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden border transition-all duration-300 ${openFaqIndex === idx
                      ? 'border-brand-gold/30 shadow-lg shadow-brand-gold/5'
                      : 'border-stone-200 shadow-sm hover:border-brand-gold/20 hover:shadow-md'
                      }`}>
                      <button
                        onClick={() => toggleFaq(idx)}
                        className="w-full px-6 py-5 text-left flex justify-between items-center gap-4 hover:bg-stone-50/50 transition-colors"
                      >
                        <span className={`font-bold transition-colors duration-300 ${openFaqIndex === idx ? 'text-brand-gold' : 'text-brand-dark'
                          }`}>{item.q}</span>
                        <motion.div
                          animate={{ rotate: openFaqIndex === idx ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${openFaqIndex === idx ? 'bg-brand-gold/10 text-brand-gold' : 'bg-stone-100 text-stone-400'
                            }`}
                        >
                          <ChevronDown size={18} />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {openFaqIndex === idx && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-5 text-stone-600 text-sm leading-relaxed border-t border-stone-100">
                              <div className="pt-4">
                                {item.a}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
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
                    {t.registration.title}
                  </h3>
                  <p className="text-stone-600 mb-8 max-w-xl mx-auto whitespace-pre-line">
                    {t.registration.description}
                  </p>

                  {regStatus === 'success' ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-xl inline-flex items-center gap-2"
                    >
                      <CheckCircle size={20} />
                      <span>{t.registration.successMessage}</span>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                      <input
                        type="email"
                        placeholder={t.registration.emailPlaceholder}
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
                            {t.registration.submitButton} <Send size={16} />
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  <p className="text-xs text-stone-400 mt-6">
                    {t.registration.privacyNote}
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
      {activePage !== 'creator-canvas' && activePage !== 'creator-mystery-setup' && activePage !== 'creator-workspace' && activePage !== 'creator-route-spots' && activePage !== 'creator-spot-detail' && activePage !== 'creator-storytelling' && (
        <footer id="contact" className="bg-brand-dark pt-20 pb-10 border-t border-brand-dark/50 mt-10">
          <div className="container mx-auto px-4 md:px-8">

            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-6 whitespace-pre-line">
                {t.footer.cta}
              </h2>
              <button
                onClick={goToQuestList}
                className="bg-brand-gold text-white px-10 py-4 rounded-full font-bold text-xl hover:bg-white hover:text-brand-dark transition-colors shadow-lg shadow-brand-gold/20"
              >
                {t.nav.findQuest}
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
                {hasStoreLink ? t.footer.appAvailable : t.footer.appComingSoon}
              </p>
            </div>

            <div className="border-t border-stone-700/50 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <TomoshibiLogo className="h-8 w-auto" color="#78716c" />
              </div>

              <div className="flex gap-6 text-sm text-stone-500 flex-wrap justify-center md:justify-start">
                <a href="/about" className="hover:text-white transition-colors">TOMOSHIBIについて</a>
                <a href="#" className="hover:text-white transition-colors">{t.footer.company}</a>
                <a href="#" className="hover:text-white transition-colors">{t.footer.privacyPolicy}</a>
                <a href="#" className="hover:text-white transition-colors">{t.footer.terms}</a>
                <a href="mailto:info@tomoshibi.app" className="hover:text-white transition-colors flex items-center gap-1">
                  <Mail size={14} /> {t.footer.contactFooter}
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
  selectedType: 'mystery' | 'scavenger';
  setSelectedType: (val: 'mystery' | 'scavenger') => void;
  onBack: () => void;
  onStart: () => void;
  onOpenOnboarding: () => void;
}) => {
  const questTypes = [
    {
      id: 'mystery' as const,
      icon: Compass,
      title: 'ウォーキングクエスト',
      subtitle: 'Walking Quest',
      description: 'ストーリーと謎解きに特化したスタンダードなフォーマット。街を歩きながら物語を体験し、各スポットで謎を解き明かしていきます。観光・地域活性化・エンターテイメントに最適。',
      features: [
        '没入感のあるストーリー展開',
        '各スポットでの謎解きチャレンジ',
        '街の魅力を再発見する体験設計',
      ],
      badge: 'スタンダード',
      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    {
      id: 'scavenger' as const,
      icon: Target,
      title: 'スカベンジャーハント',
      subtitle: 'Scavenger Hunt',
      description: '指定されたアイテムや場所を探索・収集するフォーマット。一般的な宝探しゲームとしてはもちろん、ゴミ拾いや施設点検など社会貢献活動のゲーム化にも活用できます。',
      features: [
        '宝探し・アイテム収集ゲーム',
        'ゴミ拾い・清掃活動のゲーム化',
        'インフラ点検・施設報告ミッション',
        '地域課題解決への参加促進',
      ],
      badge: '探索型',
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    },
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

          {/* Right: Quest type selection */}
          <div className="bg-white/95 backdrop-blur border border-white/70 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <p className="text-xs uppercase tracking-widest text-brand-gold font-bold">Quest Type</p>
              <div className="text-xs text-stone-500">クエストの種類を選択してください</div>
            </div>

            <div className="space-y-4">
              {questTypes.map((type) => {
                const isSelected = selectedType === type.id;
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`w-full text-left bg-white border-2 rounded-2xl p-5 transition-all ${isSelected
                      ? 'border-brand-gold shadow-lg shadow-brand-gold/10 ring-2 ring-brand-gold/20'
                      : 'border-stone-200 hover:border-stone-300 hover:shadow-md'
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-brand-gold text-white' : 'bg-stone-100 text-stone-600'
                        }`}>
                        <IconComponent size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-brand-dark">{type.title}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${type.badgeColor}`}>
                            {type.badge}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mb-2">{type.subtitle}</p>
                        <p className="text-sm text-stone-700 leading-relaxed mb-3">
                          {type.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {type.features.map((feature, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-1 rounded-full bg-stone-100 text-stone-600"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-brand-gold bg-brand-gold' : 'border-stone-300'
                        }`}>
                        {isSelected && <CheckCircle size={16} className="text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onStart}
                className="px-6 py-3 rounded-full bg-brand-dark text-white font-bold text-sm hover:bg-brand-gold transition-colors shadow-lg flex items-center gap-2"
              >
                <Rocket size={16} />
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
      .catch(() => { });
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
