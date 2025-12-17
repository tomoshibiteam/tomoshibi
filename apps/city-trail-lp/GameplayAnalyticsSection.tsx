/**
 * GameplayAnalyticsSection - Drop-off analysis and feedback stats display
 * 
 * Used in CreatorAnalyticsPage to show gameplay events analytics.
 */

import React from 'react';

interface GameplayEventsData {
    dropOffByMode: { mode: string; count: number }[];
    puzzleErrorRate: { spotName: string; totalSubmits: number; wrongSubmits: number; rate: number }[];
    arrivalFailRate: number;
    hintUsageRate: number;
}

interface FeedbackStatsData {
    total: number;
    byCategory: { category: string; count: number; label: string }[];
    recent: { category: string; message: string | null; created_at: string }[];
}

interface GameplayAnalyticsSectionProps {
    gameplayEvents?: GameplayEventsData | null;
    feedbackStats?: FeedbackStatsData | null;
}

const MODE_LABELS: Record<string, string> = {
    travel: '移動中',
    story: 'ストーリー',
    puzzle: '謎解き',
    epilogue: 'エピローグ',
};

export default function GameplayAnalyticsSection({
    gameplayEvents,
    feedbackStats,
}: GameplayAnalyticsSectionProps) {
    if (!gameplayEvents && !feedbackStats) return null;

    return (
        <div className="bg-white/90 border border-stone-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-bold text-brand-dark">プレイヤー行動分析</h2>
                    <span className="text-xs text-stone-500">離脱ポイント・困りごと分析</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Drop-off by Mode */}
                {gameplayEvents?.dropOffByMode && gameplayEvents.dropOffByMode.length > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                        <h3 className="text-sm font-bold text-rose-700 mb-3">画面別離脱</h3>
                        <div className="space-y-2">
                            {gameplayEvents.dropOffByMode.map((item) => {
                                const label = MODE_LABELS[item.mode] || item.mode;
                                const maxCount = Math.max(...gameplayEvents.dropOffByMode.map(d => d.count));
                                const percentage = maxCount > 0 ? (item.count / maxCount * 100) : 0;
                                return (
                                    <div key={item.mode} className="flex items-center gap-3">
                                        <div className="w-20 text-xs text-rose-600 font-medium">{label}</div>
                                        <div className="flex-1 h-4 bg-rose-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-rose-400 rounded-full"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="text-sm font-bold text-rose-700 w-8 text-right">{item.count}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Rate Cards */}
                <div className="grid grid-cols-2 gap-3">
                    {gameplayEvents && (
                        <>
                            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
                                <p className="text-xs text-amber-700">到着失敗率</p>
                                <p className="text-2xl font-bold text-brand-dark">
                                    {gameplayEvents.arrivalFailRate != null ? `${Math.round(gameplayEvents.arrivalFailRate * 100)}%` : '—'}
                                </p>
                                <p className="text-[10px] text-stone-500 mt-1">遠距離での到着ボタン押下</p>
                            </div>
                            <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100">
                                <p className="text-xs text-sky-700">ヒント使用率</p>
                                <p className="text-2xl font-bold text-brand-dark">
                                    {gameplayEvents.hintUsageRate != null ? `${Math.round(gameplayEvents.hintUsageRate * 100)}%` : '—'}
                                </p>
                                <p className="text-[10px] text-stone-500 mt-1">ヒントを使用したセッション</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Puzzle Error Rates */}
                {gameplayEvents?.puzzleErrorRate && gameplayEvents.puzzleErrorRate.length > 0 && (
                    <div className="md:col-span-2 p-4 rounded-2xl bg-orange-50 border border-orange-100">
                        <h3 className="text-sm font-bold text-orange-700 mb-3">スポット別誤答率</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-orange-600">
                                    <tr>
                                        <th className="py-1 pr-3 text-left">スポット</th>
                                        <th className="py-1 pr-3 text-right">送信数</th>
                                        <th className="py-1 pr-3 text-right">誤答</th>
                                        <th className="py-1 pr-3 text-right">誤答率</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gameplayEvents.puzzleErrorRate.slice(0, 5).map((spot, idx) => (
                                        <tr key={idx} className="border-t border-orange-100">
                                            <td className="py-1.5 pr-3 text-brand-dark font-medium">{spot.spotName}</td>
                                            <td className="py-1.5 pr-3 text-right">{spot.totalSubmits}</td>
                                            <td className="py-1.5 pr-3 text-right text-rose-600">{spot.wrongSubmits}</td>
                                            <td className="py-1.5 pr-3 text-right">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${spot.rate > 0.5 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                    {Math.round(spot.rate * 100)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* User Feedback */}
                {feedbackStats && feedbackStats.total > 0 && (
                    <div className="md:col-span-2 p-4 rounded-2xl bg-violet-50 border border-violet-100">
                        <h3 className="text-sm font-bold text-violet-700 mb-3">
                            ユーザーからの報告 <span className="font-normal">({feedbackStats.total}件)</span>
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                            {feedbackStats.byCategory.map((cat) => (
                                <div key={cat.category} className="flex items-center justify-between bg-white/80 rounded-xl px-3 py-2 border border-violet-100">
                                    <span className="text-xs text-violet-600">{cat.label}</span>
                                    <span className="text-sm font-bold text-brand-dark">{cat.count}</span>
                                </div>
                            ))}
                        </div>
                        {feedbackStats.recent.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs text-violet-500 font-medium">最新の報告</p>
                                {feedbackStats.recent.slice(0, 3).map((fb, idx) => (
                                    <div key={idx} className="bg-white/80 rounded-xl px-3 py-2 border border-violet-100 text-sm">
                                        <span className="text-violet-600 font-medium">{fb.category}</span>
                                        {fb.message && (
                                            <span className="text-stone-600 ml-2">"{fb.message}"</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <p className="text-[11px] text-stone-500 mt-3">
                「画面別離脱」はセッション終了時の画面を集計。「困っている」は プレイ中のメニュー→報告 から送信されたもの。
            </p>
        </div>
    );
}

export type { GameplayEventsData, FeedbackStatsData };
