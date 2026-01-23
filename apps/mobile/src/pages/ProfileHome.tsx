import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  MapPin,
  Play,
  Trophy,
  Clock,
  Target,
  Star,
  ChevronRight,
  Settings,
  LogOut,
  User,
  Flame,
  Award,
  History,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type PlayableQuest = {
  purchaseId: string;
  questId: string;
  title: string;
  area?: string | null;
  cover?: string | null;
  purchasedAt?: string | null;
  progressStatus: "not_started" | "in_progress" | "completed";
};

type PlaySessionSummary = {
  id: string;
  questId: string;
  questTitle: string;
  endedAt: string;
  durationSec?: number | null;
  wrongAnswers?: number | null;
  hintsUsed?: number | null;
};

type Stats = {
  totalQuests: number;
  completedQuests: number;
  totalPlayTime: number;
  averageRating: number;
};

const ProfileHome = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [playable, setPlayable] = useState<PlayableQuest[]>([]);
  const [recentSessions, setRecentSessions] = useState<PlaySessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myReviews, setMyReviews] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<Stats>({ totalQuests: 0, completedQuests: 0, totalPlayTime: 0, averageRating: 0 });

  useEffect(() => {
    const fetchPlayable = async () => {
      if (!user || !supabase) return;
      setLoading(true);
      setError(null);

      // Get progress data
      const { data: progressData } = await supabase
        .from("user_progress")
        .select("quest_id,status,current_step")
        .eq("user_id", user.id);
      const progressMap: Record<string, { status: "not_started" | "in_progress" | "completed"; step?: number }> = {};
      progressData?.forEach((p: any) => {
        if (p.quest_id) {
          progressMap[p.quest_id] = { status: (p.status as any) ?? "in_progress", step: p.current_step ?? undefined };
        }
      });

      const { data, error } = await supabase
        .from("purchases")
        .select(`id, quest_id, purchased_at, quests (id, title, area_name, cover_image_url)`)
        .eq("user_id", user.id)
        .order("purchased_at", { ascending: false });

      if (error) {
        setError("クエストの取得に失敗しました");
        setPlayable([]);
      } else {
        const mapped = data?.map((p: any) => ({
          purchaseId: p.id,
          questId: p.quest_id,
          title: p.quests?.title ?? "タイトル未設定",
          area: p.quests?.area_name,
          cover: p.quests?.cover_image_url,
          purchasedAt: p.purchased_at,
          progressStatus: progressMap[p.quest_id]?.status ?? "not_started",
        })) || [];
        setPlayable(mapped);

        // Calculate stats
        const completed = mapped.filter(m => m.progressStatus === "completed").length;
        setStats(prev => ({ ...prev, totalQuests: mapped.length, completedQuests: completed }));
      }
      setLoading(false);
    };
    fetchPlayable();
  }, [user]);

  useEffect(() => {
    const fetchRecent = async () => {
      if (!user || !supabase) return;
      try {
        const { data } = await supabase
          .from("play_sessions")
          .select(`id, quest_id, ended_at, duration_sec, wrong_answers, hints_used, quests ( title )`)
          .eq("user_id", user.id)
          .order("ended_at", { ascending: false })
          .limit(5);

        const mapped = data?.map((s: any) => ({
          id: s.id,
          questId: s.quest_id,
          questTitle: s.quests?.title || "クエスト",
          endedAt: s.ended_at,
          durationSec: s.duration_sec,
          wrongAnswers: s.wrong_answers,
          hintsUsed: s.hints_used,
        })) || [];
        setRecentSessions(mapped);

        // Calculate total play time
        const totalTime = mapped.reduce((acc, s) => acc + (s.durationSec || 0), 0);
        setStats(prev => ({ ...prev, totalPlayTime: totalTime }));
      } catch (e) {
        console.warn("fetch recent sessions failed", e);
      }
    };
    fetchRecent();
  }, [user]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user || !supabase) return;
      try {
        const { data } = await supabase
          .from("quest_reviews")
          .select("quest_id,rating")
          .eq("user_id", user.id);
        const map: Record<string, number> = {};
        let totalRating = 0;
        (data || []).forEach((r: any) => {
          if (r.quest_id) {
            map[r.quest_id] = r.rating;
            totalRating += r.rating;
          }
        });
        setMyReviews(map);
        if (data && data.length > 0) {
          setStats(prev => ({ ...prev, averageRating: totalRating / data.length }));
        }
      } catch (e) {
        console.warn("fetch reviews failed", e);
      }
    };
    fetchReviews();
  }, [user]);

  const handlePlay = async (q: PlayableQuest) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (q.progressStatus === "completed") {
      await supabase
        .from("user_progress")
        .upsert({
          user_id: user.id,
          quest_id: q.questId,
          current_step: 1,
          status: "not_started",
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,quest_id" });
    }
    navigate(`/gameplay/${q.questId}`);
  };

  const handleDelete = async (q: PlayableQuest, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const confirmed = window.confirm(`「${q.title}」を削除しますか？\nこのクエストの進行状況も削除されます。`);
    if (!confirmed) return;

    try {
      // Delete user_progress first
      await supabase
        .from("user_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("quest_id", q.questId);

      // Delete purchase
      await supabase
        .from("purchases")
        .delete()
        .eq("id", q.purchaseId);

      // Update local state
      setPlayable(prev => prev.filter(p => p.purchaseId !== q.purchaseId));
      setStats(prev => ({
        ...prev,
        totalQuests: prev.totalQuests - 1,
        completedQuests: q.progressStatus === "completed" ? prev.completedQuests - 1 : prev.completedQuests
      }));
    } catch (err) {
      console.error("Failed to delete quest:", err);
      alert("削除に失敗しました");
    }
  };

  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (hrs > 0) return `${hrs}時間${mins}分`;
    return `${mins}分`;
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Not logged in state
  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center bg-background">
        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-6 shadow-soft animate-float">
          <User className="w-10 h-10 text-[#F2994A]" />
        </div>
        <h2 className="text-xl font-bold text-[#333333] mb-2">マイページにログイン</h2>
        <p className="text-sm text-[#999999] mb-8 leading-relaxed">
          ログインして、購入したクエストの続きや<br />
          今までの冒険の記録を確認しましょう
        </p>
        <Button
          onClick={() => navigate("/auth")}
          className="bg-gradient-to-r from-[#FFB566] to-[#F2994A] text-white font-bold rounded-full px-8 py-6 shadow-lg shadow-[#F2994A]/20 hover:shadow-[#F2994A]/30 transition-all hover:-translate-y-0.5"
        >
          ログイン / 新規登録
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 bg-background">
      {/* Profile Header - Edgeless Hero */}
      <div className="relative h-[240px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2f1d0f] via-[#4a2f1d] to-[#1a1008]" />
        {/* Animated Background Elements */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#F2994A]/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute -left-20 bottom-0 w-60 h-60 bg-[#FFB566]/10 rounded-full blur-[80px]" />

        <div className="absolute inset-0 flex flex-col justify-end p-6 pb-8">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-[#F2994A] rounded-full blur opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#FFB566] to-[#F2994A] p-0.5">
                  <div className="w-full h-full rounded-full bg-[#1a1008] flex items-center justify-center overflow-hidden border-2 border-white/10">
                    <User className="w-10 h-10 text-white/90" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Star className="w-3.5 h-3.5 text-[#F2994A] fill-current" />
                </div>
              </div>

              <div className="mb-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs text-white/90 font-bold">
                    見習い探偵
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
                  {user.email?.split("@")[0] || "探偵"}
                </h1>
                <p className="text-sm text-white/60 font-medium">{user.email}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:text-white transition-all"
              onClick={() => navigate("/settings")}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-8 -mt-4 relative z-10">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-5 rounded-3xl bg-white shadow-soft hover:shadow-soft-lg transition-all duration-300 group">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Trophy className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-[#999999]">クリア数</span>
            </div>
            <p className="text-3xl font-bold text-[#333333]">
              {stats.completedQuests}
              <span className="text-sm font-medium text-[#CCCCCC] ml-1">/ {stats.totalQuests}</span>
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white shadow-soft hover:shadow-soft-lg transition-all duration-300 group">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-[#999999]">総プレイ時間</span>
            </div>
            <p className="text-3xl font-bold text-[#333333]">
              {formatDuration(stats.totalPlayTime)}
            </p>
          </div>
        </div>

        {/* Playable Quests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-[#333333]">プレイ可能なクエスト</h2>
            {loading && <Loader2 className="w-4 h-4 text-[#F2994A] animate-spin" />}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="rounded-3xl bg-white p-3 shadow-soft flex gap-4">
                  <Skeleton className="w-24 h-24 rounded-2xl" />
                  <div className="flex-1 space-y-2 py-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-rose-600 py-4 text-center">{error}</p>
          ) : playable.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white border border-dashed border-[#EEEEEE] text-center">
              <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-[#CCCCCC]" />
              </div>
              <p className="text-sm text-[#999999] mb-6">購入済みのクエストがありません</p>
              <Button
                variant="outline"
                className="rounded-full border-[#F2994A] text-[#F2994A] hover:bg-[#FFF5EB] hover:text-[#F2994A] px-6"
                onClick={() => navigate("/quests")}
              >
                クエストを探す
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {playable.map((q) => (
                <div
                  key={q.purchaseId}
                  className="group flex gap-3.5 rounded-3xl bg-white p-3 shadow-soft hover:shadow-soft-lg transition-all duration-300 cursor-pointer min-h-[104px]"
                  onClick={() => handlePlay(q)}
                >
                  {/* Cover Image */}
                  <div className="relative w-24 h-20 rounded-2xl overflow-hidden bg-[#F5F5F5] shrink-0 self-center">
                    {q.cover ? (
                      <img src={q.cover} alt={q.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Target className="w-8 h-8 text-[#CCCCCC]" />
                      </div>
                    )}
                    {/* Status Badge Overlay */}
                    <div className={`absolute inset-0 opacity-20 ${q.progressStatus === "completed" ? "bg-emerald-500" :
                      q.progressStatus === "in_progress" ? "bg-[#F2994A]" : ""
                      }`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center py-1 gap-2.5">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="text-base font-bold text-[#333333] line-clamp-1">{q.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${q.progressStatus === "completed"
                          ? "bg-emerald-50 text-emerald-600"
                          : q.progressStatus === "in_progress"
                            ? "bg-orange-50 text-orange-600"
                            : "bg-gray-50 text-gray-500"
                          }`}>
                          {q.progressStatus === "completed" ? "クリア済" : q.progressStatus === "in_progress" ? "進行中" : "未開始"}
                        </span>
                        {q.area && (
                          <span className="text-xs text-[#999999] flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {q.area}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      <Button
                        size="sm"
                        className={`h-9 rounded-full text-xs px-4 font-bold shadow-sm transition-all ${q.progressStatus === "completed"
                          ? "bg-[#F5F5F5] text-[#999999] hover:bg-[#EEEEEE]"
                          : "bg-[#333333] text-white hover:bg-[#000000]"
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlay(q);
                        }}
                      >
                        <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                        {q.progressStatus === "completed" ? "再プレイ" : "プレイ開始"}
                      </Button>

                      <button
                        className="p-2.5 rounded-full text-[#CCCCCC] hover:bg-rose-50 hover:text-rose-500 transition-colors ml-auto"
                        onClick={(e) => handleDelete(q, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#333333] px-1">プレイ履歴</h2>

            <div className="space-y-2">
              {recentSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-[#F5F5F5]">
                  <div className="min-w-0 flex-1 mr-4">
                    <h3 className="text-base font-bold text-[#333333] line-clamp-1 mb-1.5">{s.questTitle}</h3>
                    <div className="flex items-center gap-3 text-xs text-[#999999]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {s.durationSec != null ? formatDuration(s.durationSec) : "—"}
                      </span>
                      <span>{s.endedAt ? new Date(s.endedAt).toLocaleDateString("ja-JP") : ""}</span>
                    </div>
                  </div>
                  {myReviews[s.questId] && (
                    <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-[#FFF5EB] text-[#F2994A] text-xs font-bold">
                      <Star className="w-3 h-3 fill-current" />
                      {myReviews[s.questId]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <button
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-[#F5F5F5] text-[#333333] font-medium hover:bg-[#FAFAFA] transition-all"
            onClick={() => navigate("/settings")}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center">
                <Settings className="w-4 h-4 text-[#666666]" />
              </div>
              設定
            </div>
            <ChevronRight className="w-4 h-4 text-[#CCCCCC]" />
          </button>

          <button
            className="w-full flex items-center justify-center p-4 rounded-2xl text-rose-500 font-medium hover:bg-rose-50 transition-all"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileHome;
