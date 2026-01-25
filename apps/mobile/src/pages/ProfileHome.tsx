import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  MapPin,
  Play,
  Trophy,
  Clock,
  Target,
  ChevronRight,
  Settings,
  LogOut,
  User,
  Flame,
  Star,
  Trash2,
  Calendar,
  Compass,
  History as HistoryIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

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

type Profile = {
  name: string | null;
  profile_picture_url: string | null;
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
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, profile_picture_url')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.warn("ProfileHome: Error fetching profile", error);
        } else if (data) {
          setProfile(data);
        }
      } catch (e) {
        console.warn("ProfileHome: Unexpected error", e);
      }
    };
    fetchProfile();
  }, [user]);

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
      await supabase.from("user_progress").delete().eq("user_id", user.id).eq("quest_id", q.questId);
      await supabase.from("purchases").delete().eq("id", q.purchaseId);

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

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center bg-stone-50">
        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm border border-stone-100">
          <User className="w-10 h-10 text-stone-300" />
        </div>
        <h2 className="text-xl font-bold text-stone-800 mb-2">マイページにログイン</h2>
        <p className="text-sm text-stone-500 mb-8 leading-relaxed">
          ログインして、購入したクエストの続きや<br />
          今までの冒険の記録を確認しましょう
        </p>
        <Button
          onClick={() => navigate("/auth")}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-full px-8 py-6 shadow-md transition-all"
        >
          ログイン / 新規登録
        </Button>
      </div>
    );
  }

  // Get display name and avatar
  const displayName = profile?.name || user.email?.split("@")[0] || "冒険者";
  const avatarUrl = profile?.profile_picture_url;

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Space for fixed header */}
      <div className="h-14" />

      <div className="px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-[100px] -z-0" />

          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-stone-100 border-4 border-white shadow-sm flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-stone-300" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-stone-800 mb-1">{displayName}</h1>
                <p className="text-xs text-stone-500 font-medium">{user.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                    冒険者ランク 1
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-50"
              onClick={() => navigate("/settings")}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-stone-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center mb-2">
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <span className="text-2xl font-bold text-stone-800">{stats.completedQuests}</span>
              <span className="text-[10px] text-stone-500 font-medium">クリアしたクエスト</span>
            </div>
            <div className="bg-stone-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-2xl font-bold text-stone-800">{formatDuration(stats.totalPlayTime)}</span>
              <span className="text-[10px] text-stone-500 font-medium">総プレイ時間</span>
            </div>
          </div>
        </div>

        {/* Action Menu */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-white border-stone-100 shadow-sm hover:bg-stone-50 hover:border-stone-200"
            onClick={() => navigate("/quests")}
          >
            <Compass className="w-6 h-6 text-amber-600" />
            <span className="text-xs font-bold text-stone-600">クエストを探す</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-white border-stone-100 shadow-sm hover:bg-stone-50 hover:border-stone-200"
            onClick={() => navigate("/settings")}
          >
            <User className="w-6 h-6 text-stone-400" />
            <span className="text-xs font-bold text-stone-600">プロフィール編集</span>
          </Button>
        </div>

        {/* Playable Quests */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-stone-800 flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-600" />
              プレイ可能なクエスト
            </h2>
            {loading && <Loader2 className="w-3 h-3 text-stone-400 animate-spin" />}
          </div>

          {!loading && playable.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white border border-dashed border-stone-200 text-center">
              <p className="text-sm text-stone-400 mb-4">まだクエストを持っていません</p>
              <Button
                size="sm"
                className="rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 border-none font-bold"
                onClick={() => navigate("/quests")}
              >
                クエストを探しに行く
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {playable.map((q) => (
                <div
                  key={q.purchaseId}
                  className="group bg-white rounded-2xl p-3 shadow-sm border border-stone-100 hover:border-amber-200 transition-all cursor-pointer flex gap-3"
                  onClick={() => handlePlay(q)}
                >
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                    {q.cover ? (
                      <img src={q.cover} alt={q.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Compass className="w-8 h-8 text-stone-300" />
                      </div>
                    )}
                    {q.progressStatus === "completed" && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Trophy className="w-8 h-8 text-yellow-400 drop-shadow-md" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <h3 className="text-sm font-bold text-stone-800 line-clamp-1">{q.title}</h3>
                      <p className="text-xs text-stone-500 truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {q.area || "エリア未設定"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold",
                        q.progressStatus === "completed" ? "bg-stone-100 text-stone-500" :
                          q.progressStatus === "in_progress" ? "bg-amber-100 text-amber-700" :
                            "bg-blue-50 text-blue-600"
                      )}>
                        {q.progressStatus === "completed" ? "クリア済み" : q.progressStatus === "in_progress" ? "進行中" : "未プレイ"}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          className="p-1.5 rounded-full text-stone-300 hover:text-rose-400 hover:bg-rose-50 transition-colors"
                          onClick={(e) => handleDelete(q, e)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center shadow-sm text-white">
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        {recentSessions.length > 0 && (
          <div className="space-y-4 pt-4">
            <h2 className="text-sm font-bold text-stone-800 flex items-center gap-2 px-1">
              <HistoryIcon className="w-4 h-4 text-stone-400" />
              最近の活動
            </h2>
            <div className="space-y-2">
              {recentSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-stone-100">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-700 truncate">{s.questTitle}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      {new Date(s.endedAt).toLocaleDateString()} • {formatDuration(s.durationSec || 0)}
                    </p>
                  </div>
                  {myReviews[s.questId] && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-md">
                      <Star className="w-3 h-3 fill-current" />
                      {myReviews[s.questId]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-8 pb-4">
          <Button
            variant="ghost"
            className="w-full text-stone-400 hover:text-stone-600 hover:bg-stone-100"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            ログアウト
          </Button>
        </div>
      </div>
    </div>
  );
};

// Helper for conditional class names
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export default ProfileHome;
