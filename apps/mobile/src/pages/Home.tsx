import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Clock,
  Star,
  Sparkles,
  Flame,
  Crown,
  ChevronRight,
  Play,
  Compass,
  Target,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

const tabs = [
  { id: "all", label: "すべて", icon: Sparkles },
  { id: "popular", label: "人気", icon: Flame },
  { id: "new", label: "新着", icon: TrendingUp },
];

type QuestRow = {
  id: string;
  title: string | null;
  area_name: string | null;
  cover_image_url: string | null;
};

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchQuests = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("quests")
        .select("id, title, area_name, cover_image_url")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) {
        setError("クエストの取得に失敗しました");
        setQuests([]);
      } else {
        setQuests(data || []);
      }
      setLoading(false);
    };
    fetchQuests();
  }, []);

  useEffect(() => {
    const fetchPurchased = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("purchases")
        .select("quest_id")
        .eq("user_id", user.id);
      if (data) {
        setPurchasedIds(new Set(data.map(p => p.quest_id)));
      }
    };
    fetchPurchased();
  }, [user]);

  const displayQuests = useMemo(() => {
    let filtered = quests;

    // Keyword filter
    if (keyword) {
      filtered = filtered.filter((q) =>
        (q.title || "").toLowerCase().includes(keyword.toLowerCase())
      );
    }

    return filtered;
  }, [quests, keyword, activeTab]);

  const heroQuest = displayQuests[0];
  const featured = displayQuests.slice(1, 4);
  const recentQuests = displayQuests.slice(0, 6);

  const handleQuestClick = (id: string) => {
    // Check if quest is purchased
    if (purchasedIds.has(id)) {
      // Navigate to gameplay screen for purchased quests
      navigate(`/gameplay/${id}`);
    } else {
      // Navigate to quest detail/purchase screen for unpurchased quests
      navigate(`/quest/${id}`);
    }
  };



  return (
    <div className="space-y-6 pb-6">
      {/* Hero Section */}
      <div
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2f1d0f] via-[#4a2f1d] to-[#1a1008] shadow-xl cursor-pointer group"
        onClick={() => heroQuest && handleQuestClick(heroQuest.id)}
      >
        {loading ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-6 w-32 bg-white/10" />
            <Skeleton className="h-8 w-3/4 bg-white/10" />
            <Skeleton className="h-40 w-full rounded-xl bg-white/10" />
          </div>
        ) : heroQuest ? (
          <>
            {/* Background Image */}
            {heroQuest.cover_image_url && (
              <div className="absolute inset-0">
                <img
                  src={heroQuest.cover_image_url}
                  alt=""
                  className="w-full h-full object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2f1d0f] via-[#2f1d0f]/70 to-transparent" />
              </div>
            )}

            {/* Content */}
            <div className="relative p-5 space-y-3 min-h-[220px] flex flex-col justify-end">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#ffb566] to-[#e67a28] text-white text-xs font-bold w-fit shadow-lg">
                <Crown className="w-4 h-4" />
                今週のピックアップ
              </div>

              <h1 className="text-2xl font-bold text-white leading-tight line-clamp-2 drop-shadow-lg">
                {heroQuest.title}
              </h1>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-sm text-white/80">
                  <MapPin className="w-4 h-4" />
                  {heroQuest.area_name || "エリア未設定"}
                </span>
              </div>

              <Button
                className="w-fit mt-2 bg-white text-[#2f1d0f] hover:bg-white/90 rounded-full px-5 font-bold shadow-lg group-hover:scale-105 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuestClick(heroQuest.id);
                }}
              >
                <Play className="w-4 h-4 mr-2 fill-current" />
                詳細を見る
              </Button>
            </div>
          </>
        ) : (
          <div className="p-6 min-h-[200px] flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ffb566]/20 to-[#e67a28]/20 flex items-center justify-center mb-4 animate-float">
              <Compass className="w-8 h-8 text-[#e67a28]" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">冒険を始めよう</h2>
            <p className="text-sm text-white/70 mb-4">現在公開中のクエストを準備しています</p>
            <Button
              className="bg-gradient-to-r from-[#ffb566] to-[#e67a28] text-white font-bold hover:opacity-90 shadow-lg"
              onClick={() => navigate("/quests")}
            >
              クエストを探す
            </Button>
          </div>
        )}
      </div>

      {/* Quick Search */}
      <div
        className="flex items-center gap-3 rounded-2xl bg-[#f7efe5] border border-[#eadfd0] px-4 py-3 cursor-pointer hover:border-[#e67a28]/50 transition-colors"
        onClick={() => navigate("/quests")}
      >
        <Search className="w-5 h-5 text-[#c27a34]" />
        <span className="text-sm text-[#b07a4c]">クエストを探す...</span>
        <ChevronRight className="w-4 h-4 text-[#c27a34] ml-auto" />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${isActive
                ? "bg-gradient-to-r from-[#ffb566] to-[#e67a28] text-white shadow-md"
                : "bg-white border border-[#eadfd0] text-[#5f4a35] hover:border-[#e67a28]/50"
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Featured Quests - Horizontal Scroll */}
      {featured.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#e67a28]" />
              <h2 className="text-lg font-bold text-[#2f1d0f]">注目のクエスト</h2>
            </div>
            <button
              onClick={() => navigate("/quests")}
              className="text-xs text-[#e67a28] font-semibold flex items-center gap-0.5"
            >
              すべて見る
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {featured.map((quest) => (
              <div
                key={quest.id}
                onClick={() => handleQuestClick(quest.id)}
                className="relative w-[200px] shrink-0 rounded-2xl overflow-hidden shadow-lg cursor-pointer group"
              >
                <div className="h-[140px] bg-gradient-to-br from-[#f7efe5] to-[#eadfd0]">
                  {quest.cover_image_url ? (
                    <img
                      src={quest.cover_image_url}
                      alt={quest.title || "Quest"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Target className="w-10 h-10 text-[#c27a34]/30" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-sm font-bold text-white line-clamp-2 mb-1">
                    {quest.title || "タイトル未設定"}
                  </h3>
                  <span className="text-[10px] text-white/70 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {quest.area_name || "エリア未設定"}
                  </span>
                </div>
                {purchasedIds.has(quest.id) && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                    購入済み
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quest List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-[#e67a28]" />
          <h2 className="text-lg font-bold text-[#2f1d0f]">すべてのクエスト</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-2xl border border-[#eadfd0] bg-white">
                <Skeleton className="w-24 h-20 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-rose-600 mb-3">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              再読み込み
            </Button>
          </div>
        ) : recentQuests.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f7efe5] to-[#eadfd0] flex items-center justify-center mx-auto mb-4 animate-float">
              <Sparkles className="w-10 h-10 text-[#c27a34]" />
            </div>
            <h3 className="text-lg font-bold text-[#2f1d0f] mb-2">冒険の準備中</h3>
            <p className="text-sm text-[#7c644c] mb-4">新しいクエストを準備しています<br />もう少しお待ちください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentQuests.map((quest, index) => (
              <div
                key={quest.id}
                onClick={() => handleQuestClick(quest.id)}
                className="flex gap-3 p-3 rounded-2xl border border-[#eadfd0] bg-white shadow-sm hover:shadow-md hover:border-[#e67a28]/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Thumbnail */}
                <div className="w-24 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-[#f7efe5] to-[#eadfd0] shrink-0">
                  {quest.cover_image_url ? (
                    <img
                      src={quest.cover_image_url}
                      alt={quest.title || "Quest"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Target className="w-6 h-6 text-[#c27a34]/30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#2f1d0f] line-clamp-1 mb-1">
                      {quest.title || "タイトル未設定"}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {quest.area_name && (
                        <span className="text-[10px] text-[#7c644c] flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {quest.area_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {purchasedIds.has(quest.id) ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] rounded-full">
                        購入済み
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-[#e67a28] font-semibold">詳細を見る →</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-[#c27a34] group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View More Button */}
        {recentQuests.length > 0 && (
          <Button
            variant="outline"
            className="w-full border-[#eadfd0] text-[#7c644c] hover:bg-[#f7efe5] hover:text-[#e67a28] hover:border-[#e67a28]/50"
            onClick={() => navigate("/quests")}
          >
            すべてのクエストを見る
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Home;
