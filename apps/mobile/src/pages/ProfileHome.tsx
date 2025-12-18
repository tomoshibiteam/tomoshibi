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
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f7efe5] to-[#eadfd0] flex items-center justify-center mb-4">
          <User className="w-10 h-10 text-[#c27a34]" />
        </div>
        <h2 className="text-xl font-bold text-[#2f1d0f] mb-2">マイページ</h2>
        <p className="text-sm text-[#7c644c] mb-6">
          ログインして、購入したクエストや<br />プレイ履歴を確認しましょう
        </p>
        <Button
          onClick={() => navigate("/auth")}
          className="bg-gradient-to-r from-[#ffb566] to-[#e67a28] text-white font-bold rounded-full px-8"
        >
          ログイン / 新規登録
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Profile Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2f1d0f] via-[#4a2f1d] to-[#1a1008] p-5">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#e67a28]/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ffb566] to-[#e67a28] flex items-center justify-center shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">
              {user.email?.split("@")[0] || "探偵"}
            </h1>
            <p className="text-xs text-white/60">{user.email}</p>
            <Badge className="mt-1 bg-[#ffb566]/20 text-[#ffb566] border-[#ffb566]/30 text-[10px]">
              <Trophy className="w-3 h-3 mr-1" />
              見習い探偵
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => navigate("/settings")}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 border-[#eadfd0] bg-gradient-to-br from-white to-[#faf8f5]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xs text-[#7c644c]">クリア数</span>
          </div>
          <p className="text-2xl font-bold text-[#2f1d0f]">
            {stats.completedQuests}
            <span className="text-sm font-normal text-[#7c644c]"> / {stats.totalQuests}</span>
          </p>
        </Card>

        <Card className="p-4 border-[#eadfd0] bg-gradient-to-br from-white to-[#faf8f5]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs text-[#7c644c]">総プレイ時間</span>
          </div>
          <p className="text-2xl font-bold text-[#2f1d0f]">
            {formatDuration(stats.totalPlayTime)}
          </p>
        </Card>
      </div>

      {/* Playable Quests */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#e67a28]" />
            <h2 className="text-lg font-bold text-[#2f1d0f]">プレイ可能なクエスト</h2>
          </div>
          {loading && <Loader2 className="w-4 h-4 text-[#c35f1f] animate-spin" />}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-rose-600 py-4">{error}</p>
        ) : playable.length === 0 ? (
          <Card className="p-6 border-[#eadfd0] text-center">
            <Target className="w-10 h-10 text-[#eadfd0] mx-auto mb-3" />
            <p className="text-sm text-[#7c644c] mb-3">購入済みのクエストがありません</p>
            <Button
              variant="outline"
              className="border-[#e67a28] text-[#e67a28] hover:bg-[#fff8f0]"
              onClick={() => navigate("/quests")}
            >
              クエストを探す
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {playable.map((q) => (
              <Card
                key={q.purchaseId}
                className="overflow-hidden border-[#eadfd0] hover:border-[#e67a28]/30 hover:shadow-md transition-all cursor-pointer"
                onClick={() => handlePlay(q)}
              >
                <div className="flex">
                  {/* Cover Image */}
                  <div className="w-28 h-24 shrink-0 bg-gradient-to-br from-[#f7efe5] to-[#eadfd0]">
                    {q.cover ? (
                      <img src={q.cover} alt={q.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Target className="w-8 h-8 text-[#c27a34]/30" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold text-[#2f1d0f] line-clamp-1">{q.title}</h3>
                      <Badge className={
                        q.progressStatus === "completed"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0"
                          : q.progressStatus === "in_progress"
                            ? "bg-amber-100 text-amber-700 border-amber-200 shrink-0"
                            : "bg-gray-100 text-gray-600 border-gray-200 shrink-0"
                      }>
                        {q.progressStatus === "completed" ? "クリア" : q.progressStatus === "in_progress" ? "進行中" : "未開始"}
                      </Badge>
                    </div>

                    {q.area && (
                      <p className="text-[10px] text-[#7c644c] flex items-center gap-1 mb-2">
                        <MapPin className="w-3 h-3" />
                        {q.area}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-7 rounded-full bg-gradient-to-r from-[#ffb566] to-[#e67a28] text-white text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlay(q);
                        }}
                      >
                        <Play className="w-3 h-3 mr-1 fill-current" />
                        {q.progressStatus === "completed" ? "再プレイ" : q.progressStatus === "in_progress" ? "続きから" : "開始"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 rounded-full text-[#7c644c] hover:text-rose-600 hover:bg-rose-50"
                        onClick={(e) => handleDelete(q, e)}
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#e67a28]" />
            <h2 className="text-lg font-bold text-[#2f1d0f]">プレイ履歴</h2>
          </div>

          <div className="space-y-2">
            {recentSessions.map((s) => (
              <Card key={s.id} className="p-3 border-[#eadfd0]">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-[#2f1d0f] line-clamp-1">{s.questTitle}</h3>
                  <span className="text-[10px] text-[#7c644c]">
                    {s.endedAt ? new Date(s.endedAt).toLocaleDateString("ja-JP") : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#7c644c]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {s.durationSec != null ? formatDuration(s.durationSec) : "—"}
                  </span>
                  {s.wrongAnswers != null && (
                    <span>誤答: {s.wrongAnswers}回</span>
                  )}
                  {myReviews[s.questId] && (
                    <span className="flex items-center gap-0.5 text-[#e67a28]">
                      <Star className="w-3 h-3 fill-current" />
                      {myReviews[s.questId]}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-4">
        <Button
          variant="outline"
          className="w-full justify-start border-[#eadfd0] text-[#7c644c] hover:bg-[#f7efe5]"
          onClick={() => navigate("/settings")}
        >
          <Settings className="w-4 h-4 mr-3" />
          設定
          <ChevronRight className="w-4 h-4 ml-auto" />
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start text-rose-600 hover:bg-rose-50"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          ログアウト
        </Button>
      </div>
    </div>
  );
};

export default ProfileHome;
