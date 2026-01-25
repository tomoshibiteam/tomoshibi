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

  // Get display name and avatar
  const displayName = profile?.name || user?.email?.split("@")[0] || "冒険者";
  const avatarUrl = profile?.profile_picture_url;

  return (
    // Cinematic Background Wrapper
    <div className="min-h-screen bg-[#FEF9F3] pb-24 relative overflow-x-hidden">
      {/* Sepia Vignette for cinematic focus */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_transparent_10%,_#E8D5BE_120%)] z-0 pointer-events-none opacity-60" />

      {/* Login Prompt (Cinematic Style) */}
      {!user ? (
        <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center relative z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="w-24 h-24 rounded-full bg-white/80 border-2 border-[#E8D5BE] flex items-center justify-center mb-6 shadow-[0_4px_20px_rgba(61,46,31,0.1)]">
            <User className="w-10 h-10 text-[#D87A32]" />
          </div>
          <h2 className="text-2xl font-bold font-serif text-[#3D2E1F] mb-3 tracking-widest">
            冒険の記録
          </h2>
          <p className="text-sm text-[#7A6652] font-serif mb-8 leading-loose tracking-wide">
            ログインして、購入したクエストの続きや<br />
            今までの旅の軌跡を確認しましょう
          </p>
          <Button
            onClick={() => navigate("/auth")}
            className="bg-gradient-to-r from-[#D87A32] to-[#B85A1F] hover:from-[#E88B43] hover:to-[#C96B30] text-white font-serif font-bold rounded-full px-10 py-6 shadow-xl tracking-[0.2em] transition-all hover:scale-105 active:scale-95 border border-[#FEF9F3]/20"
          >
            ログイン / 新規登録
          </Button>
        </div>
      ) : (
        /* Authenticated View */
        <div className="relative z-10 px-4 py-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

          {/* Header Spacer */}
          <div className="h-8" />

          {/* Profile Card (Cinematic) */}
          <div className="relative bg-[#FEF9F3] rounded-3xl p-6 shadow-xl border border-[#7A6652]/10 overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[radial-gradient(circle,_#E8D5BE_0%,_transparent_70%)] -z-0 opacity-50" />

            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-[#FEF9F3] border-2 border-[#E8D5BE] shadow-md flex items-center justify-center overflow-hidden shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-[#E8D5BE]" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-serif text-[#3D2E1F] mb-1 tracking-wide">
                    {displayName}
                  </h1>
                  <p className="text-xs text-[#7A6652] font-serif tracking-widest uppercase opacity-80">
                    Adventurer
                  </p>
                  <div className="mt-2 inline-flex items-center">
                    <div className="px-3 py-1 rounded-full bg-[#D87A32]/10 border border-[#D87A32]/20 text-[#D87A32] text-[10px] font-bold tracking-wider">
                      RANK 1
                    </div>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-[#7A6652] hover:text-[#3D2E1F] hover:bg-[#E8D5BE]/30"
                onClick={() => navigate("/settings")}
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="bg-white/60 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-[#7A6652]/5">
                <div className="w-8 h-8 rounded-full bg-[#D87A32]/10 flex items-center justify-center mb-2">
                  <Flame className="w-4 h-4 text-[#D87A32]" />
                </div>
                <span className="text-2xl font-bold font-serif text-[#3D2E1F]">{stats.completedQuests}</span>
                <span className="text-[10px] text-[#7A6652] font-serif tracking-widest">COMPLETED</span>
              </div>
              <div className="bg-white/60 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-[#7A6652]/5">
                <div className="w-8 h-8 rounded-full bg-[#B85A1F]/10 flex items-center justify-center mb-2">
                  <Clock className="w-4 h-4 text-[#B85A1F]" />
                </div>
                <span className="text-2xl font-bold font-serif text-[#3D2E1F]">{formatDuration(stats.totalPlayTime)}</span>
                <span className="text-[10px] text-[#7A6652] font-serif tracking-widest">TOTAL TIME</span>
              </div>
            </div>
          </div>

          {/* Action Menu (Cards) */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto py-5 flex flex-col items-center justify-center gap-3 bg-white/40 border-[#E8D5BE] hover:bg-white/80 hover:border-[#D87A32]/30 transition-all shadow-sm rounded-2xl"
              onClick={() => navigate("/quests")}
            >
              <Compass className="w-6 h-6 text-[#D87A32]" />
              <span className="text-xs font-bold font-serif text-[#5C4532] tracking-widest">クエストを探す</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-5 flex flex-col items-center justify-center gap-3 bg-white/40 border-[#E8D5BE] hover:bg-white/80 hover:border-[#D87A32]/30 transition-all shadow-sm rounded-2xl"
              onClick={() => navigate("/settings")}
            >
              <User className="w-6 h-6 text-[#7A6652]" />
              <span className="text-xs font-bold font-serif text-[#5C4532] tracking-widest">ご登録情報</span>
            </Button>
          </div>

          {/* Playable Quests */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold font-serif text-[#3D2E1F] flex items-center gap-2 tracking-widest">
                <Target className="w-4 h-4 text-[#D87A32]" />
                現在のクエスト
              </h2>
              {loading && <Loader2 className="w-3 h-3 text-[#7A6652] animate-spin" />}
            </div>

            {!loading && playable.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white/40 border-2 border-dashed border-[#E8D5BE] text-center">
                <p className="text-sm text-[#7A6652] font-serif mb-4 tracking-wide">まだクエストを持っていません</p>
                <Button
                  size="sm"
                  className="rounded-full bg-[#D87A32] text-white hover:bg-[#B85A1F] font-serif font-bold tracking-wider px-6 shadow-md"
                  onClick={() => navigate("/quests")}
                >
                  物語を探しに行く
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {playable.map((q) => (
                  <div
                    key={q.purchaseId}
                    className="group relative bg-[#FEF9F3] rounded-2xl p-3 shadow-[0_2px_10px_rgba(61,46,31,0.05)] border border-[#7A6652]/10 hover:border-[#D87A32]/30 transition-all cursor-pointer flex gap-4 overflow-hidden"
                    onClick={() => handlePlay(q)}
                  >
                    {/* Card vignette overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_50%,_#E8D5BE_150%)] opacity-20 pointer-events-none" />

                    <div className="relative w-20 h-24 rounded-xl overflow-hidden bg-[#E8D5BE] shrink-0 border border-[#7A6652]/10 shadow-inner">
                      {q.cover ? (
                        <img src={q.cover} alt={q.title} className="w-full h-full object-cover sepia-[.2]" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Compass className="w-8 h-8 text-white/50" />
                        </div>
                      )}
                      {q.progressStatus === "completed" && (
                        <div className="absolute inset-0 bg-[#3D2E1F]/60 flex items-center justify-center backdrop-blur-[1px]">
                          <Trophy className="w-8 h-8 text-[#FFD700] drop-shadow-md" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1 relative z-10">
                      <div>
                        <h3 className="text-base font-bold font-serif text-[#3D2E1F] line-clamp-1 tracking-wide">{q.title}</h3>
                        <p className="text-xs text-[#7A6652] truncate flex items-center gap-1 mt-1 font-serif">
                          <MapPin className="w-3 h-3" />
                          {q.area || "Unknown Area"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold font-serif tracking-wider border",
                          q.progressStatus === "completed" ? "bg-[#E8D5BE]/30 text-[#7A6652] border-[#7A6652]/20" :
                            q.progressStatus === "in_progress" ? "bg-[#D87A32]/10 text-[#D87A32] border-[#D87A32]/20" :
                              "bg-[#2E5A5C]/10 text-[#2E5A5C] border-[#2E5A5C]/20"
                        )}>
                          {q.progressStatus === "completed" ? "COMPLETED" : q.progressStatus === "in_progress" ? "PLAYING" : "NEW"}
                        </span>

                        <div className="flex items-center gap-3">
                          <button
                            className="p-1.5 rounded-full text-[#E8D5BE] hover:text-[#D87A32] hover:bg-[#D87A32]/10 transition-colors"
                            onClick={(e) => handleDelete(q, e)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#D87A32] to-[#B85A1F] flex items-center justify-center shadow-md text-white group-hover:scale-110 transition-transform">
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
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
              <h2 className="text-sm font-bold font-serif text-[#3D2E1F] flex items-center gap-2 px-1 tracking-widest">
                <HistoryIcon className="w-4 h-4 text-[#7A6652]" />
                旅の履歴
              </h2>
              <div className="space-y-3">
                {recentSessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-white/60 rounded-xl border border-[#7A6652]/10">
                    <div className="min-w-0">
                      <p className="text-sm font-bold font-serif text-[#3D2E1F] truncate tracking-wide">{s.questTitle}</p>
                      <p className="text-[10px] text-[#7A6652] font-serif mt-0.5 tracking-wider">
                        {new Date(s.endedAt).toLocaleDateString()} • {formatDuration(s.durationSec || 0)}
                      </p>
                    </div>
                    {myReviews[s.questId] && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[#D87A32] bg-[#D87A32]/10 px-2 py-1 rounded-md border border-[#D87A32]/20">
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
              className="w-full text-[#7A6652]/60 hover:text-[#3D2E1F] hover:bg-[#E8D5BE]/20 font-serif tracking-widest"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              ログアウト
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper for conditional class names
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export default ProfileHome;
