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
    <div className="space-y-6 pb-6 bg-[#FAFAFA] -mx-4 -mt-6 px-4 pt-6">
      {/* Hero Section - Edgeless Design */}
      <div
        className="relative overflow-hidden -mx-4 cursor-pointer group"
        onClick={() => heroQuest && handleQuestClick(heroQuest.id)}
      >
        {loading ? (
          <div className="h-[280px] bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
        ) : heroQuest ? (
          <>
            {/* Background Image - Edge to Edge */}
            <div className="relative h-[280px]">
              {heroQuest.cover_image_url ? (
                <img
                  src={heroQuest.cover_image_url}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#2f1d0f] to-[#4a2f1d]" />
              )}
              {/* Smooth Gradient Overlay */}
              <div className="absolute inset-0 gradient-overlay-smooth" />
            </div>

            {/* Content - Positioned over gradient */}
            <div className="absolute bottom-0 left-0 right-0 p-5 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F2994A]/90 text-white text-[10px] font-semibold uppercase tracking-wider">
                <Crown className="w-3 h-3" />
                今週のピックアップ
              </div>

              <h1 className="text-xl font-bold text-white leading-snug line-clamp-2 drop-shadow-sm">
                {heroQuest.title}
              </h1>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-white/80">
                  <MapPin className="w-3.5 h-3.5" />
                  {heroQuest.area_name || "エリア未設定"}
                </span>
              </div>

              {/* Glass Morphism Button */}
              <button
                className="inline-flex items-center gap-2 px-4 py-2.5 mt-1 rounded-full bg-white/90 backdrop-blur-sm text-[#333333] text-sm font-semibold shadow-soft hover:bg-white transition-all min-h-[44px]"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuestClick(heroQuest.id);
                }}
              >
                <Play className="w-4 h-4 fill-[#F2994A] text-[#F2994A]" />
                詳細を見る
              </button>
            </div>
          </>
        ) : (
          <div className="h-[240px] bg-gradient-to-br from-[#2f1d0f] to-[#4a2f1d] flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-4 animate-float">
              <Compass className="w-7 h-7 text-[#F2994A]" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">冒険を始めよう</h2>
            <p className="text-sm text-white/60 mb-4">現在公開中のクエストを準備しています</p>
            <button
              className="px-5 py-2.5 rounded-full bg-[#F2994A] text-white text-sm font-semibold min-h-[44px]"
              onClick={() => navigate("/quests")}
            >
              クエストを探す
            </button>
          </div>
        )}
      </div>

      {/* Quick Search - Minimal Design */}
      <div
        className="flex items-center gap-3 rounded-2xl bg-[#F5F5F5] px-4 py-3.5 cursor-pointer hover:bg-[#EFEFEF] transition-colors min-h-[52px]"
        onClick={() => navigate("/quests")}
      >
        <Search className="w-5 h-5 text-[#999999]" />
        <span className="text-sm text-[#999999]">クエストを探す...</span>
        <ChevronRight className="w-4 h-4 text-[#CCCCCC] ml-auto" />
      </div>

      {/* Category Tabs - Modern Chip Style */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all min-h-[44px] ${isActive
                ? "bg-[#FFF5EB] text-[#F2994A] border border-[#F2994A]/20"
                : "bg-white text-[#666666] border border-[#EEEEEE] hover:border-[#DDDDDD]"
                }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#F2994A]" : "text-[#999999]"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Featured Quests - Horizontal Scroll */}
      {featured.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#333333]">注目のクエスト</h2>
            <button
              onClick={() => navigate("/quests")}
              className="text-xs text-[#F2994A] font-medium flex items-center gap-0.5 min-h-[44px] px-2"
            >
              すべて見る
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
            {featured.map((quest) => (
              <div
                key={quest.id}
                onClick={() => handleQuestClick(quest.id)}
                className="relative w-[180px] shrink-0 rounded-3xl overflow-hidden bg-white shadow-soft cursor-pointer group hover:shadow-soft-lg transition-all duration-300"
              >
                {/* Image */}
                <div className="relative h-[120px]">
                  {quest.cover_image_url ? (
                    <img
                      src={quest.cover_image_url}
                      alt={quest.title || "Quest"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#F5F5F5] to-[#EEEEEE] flex items-center justify-center">
                      <Target className="w-8 h-8 text-[#CCCCCC]" />
                    </div>
                  )}
                  {/* Smooth overlay */}
                  <div className="absolute inset-0 gradient-overlay-smooth" />
                  {/* Purchased badge */}
                  {purchasedIds.has(quest.id) && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/90 backdrop-blur-sm text-white text-[9px] font-semibold">
                      購入済み
                    </div>
                  )}
                </div>
                {/* Content */}
                <div className="p-3 space-y-1">
                  <h3 className="text-sm font-bold text-[#333333] line-clamp-2 leading-snug">
                    {quest.title || "タイトル未設定"}
                  </h3>
                  <span className="text-[11px] text-[#999999] flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {quest.area_name || "エリア未設定"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quest List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-[#333333]">すべてのクエスト</h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-2xl bg-white shadow-soft">
                <Skeleton className="w-20 h-20 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-rose-600 mb-3">{error}</p>
            <button
              className="px-4 py-2.5 rounded-full border border-[#EEEEEE] text-[#666666] text-sm font-medium min-h-[44px]"
              onClick={() => window.location.reload()}
            >
              再読み込み
            </button>
          </div>
        ) : recentQuests.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4 animate-float">
              <Sparkles className="w-8 h-8 text-[#F2994A]" />
            </div>
            <h3 className="text-base font-bold text-[#333333] mb-2">冒険の準備中</h3>
            <p className="text-sm text-[#999999] mb-4">新しいクエストを準備しています<br />もう少しお待ちください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentQuests.map((quest, index) => (
              <div
                key={quest.id}
                onClick={() => handleQuestClick(quest.id)}
                className="flex gap-3 p-3 rounded-2xl bg-white shadow-soft hover:shadow-soft-lg transition-all duration-300 cursor-pointer group animate-slide-up min-h-[88px]"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Thumbnail */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F5F5F5] shrink-0">
                  {quest.cover_image_url ? (
                    <img
                      src={quest.cover_image_url}
                      alt={quest.title || "Quest"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Target className="w-6 h-6 text-[#CCCCCC]" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <h3 className="text-sm font-bold text-[#333333] line-clamp-1 mb-1">
                      {quest.title || "タイトル未設定"}
                    </h3>
                    {quest.area_name && (
                      <span className="text-[11px] text-[#999999] flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {quest.area_name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    {purchasedIds.has(quest.id) ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-medium">
                        購入済み
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#F2994A] font-medium">詳細を見る</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-[#CCCCCC] group-hover:text-[#F2994A] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View More Button */}
        {recentQuests.length > 0 && (
          <button
            className="w-full py-3 rounded-2xl border border-[#EEEEEE] bg-white text-[#666666] text-sm font-medium hover:bg-[#FAFAFA] hover:border-[#DDDDDD] transition-all min-h-[48px]"
            onClick={() => navigate("/quests")}
          >
            すべてのクエストを見る
            <ChevronRight className="w-4 h-4 ml-1 inline-block" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Home;
