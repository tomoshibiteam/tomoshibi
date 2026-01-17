import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Search,
    MapPin,
    Grid3X3,
    List,
    ChevronRight,
    Sparkles,
    Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

type Quest = {
    id: string;
    title: string | null;
    area_name: string | null;
    cover_image_url: string | null;
};

const areaFilters = ["すべて", "東京", "大阪", "京都", "その他"];

// Area name mapping for English to Japanese
const areaMapping: Record<string, string> = {
    "tokyo": "東京",
    "osaka": "大阪",
    "kyoto": "京都",
};


const Quests = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [keyword, setKeyword] = useState("");
    const [selectedArea, setSelectedArea] = useState("すべて");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchQuests = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error } = await supabase
                    .from("quests")
                    .select("id, title, area_name, cover_image_url")
                    .eq("status", "published")
                    .order("created_at", { ascending: false });

                if (error) {
                    console.error("Quests fetch error:", error);
                    setError("クエストの取得に失敗しました");
                    setQuests([]);
                } else {
                    setQuests(data || []);
                }
            } catch (e) {
                console.error("Quests fetch exception:", e);
                setError("クエストの取得に失敗しました");
                setQuests([]);
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

    const filteredQuests = useMemo(() => {
        return quests.filter((q) => {
            // Keyword filter
            if (keyword && !(q.title || "").toLowerCase().includes(keyword.toLowerCase())) {
                return false;
            }

            // Area filter
            if (selectedArea !== "すべて") {
                const area = (q.area_name || "").toLowerCase();

                // Normalize area name (convert English to Japanese if needed)
                const normalizedArea = areaMapping[area] || q.area_name || "";

                if (selectedArea === "その他") {
                    // "その他" means not Tokyo, Osaka, or Kyoto
                    const majorCities = ["東京", "大阪", "京都"];
                    const isMajorCity = majorCities.some(city =>
                        normalizedArea.includes(city) || area.includes(city.toLowerCase())
                    );
                    if (isMajorCity) return false;
                } else {
                    // Check if the area matches the selected filter
                    const matchesJapanese = normalizedArea.includes(selectedArea);
                    const matchesEnglish = Object.entries(areaMapping).some(
                        ([eng, jpn]) => jpn === selectedArea && area.includes(eng)
                    );
                    if (!matchesJapanese && !matchesEnglish) return false;
                }
            }
            return true;
        });
    }, [quests, keyword, selectedArea]);

    const handleQuestClick = (questId: string) => {
        navigate(`/quest/${questId}`);
    };

    return (
        <div className="min-h-screen pb-8 bg-[#FAFAFA] -mx-4 -mt-6 px-4 pt-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-lg font-bold text-[#333333] mb-1">クエスト一覧</h1>
                <p className="text-sm text-[#999999]">冒険が待っている街へ出かけよう</p>
            </div>

            {/* Search Bar - Minimal Design */}
            <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999]" />
                <input
                    type="text"
                    placeholder="クエストを検索..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#F5F5F5] text-sm text-[#333333] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-[#F2994A]/20 focus:bg-white transition-all min-h-[52px]"
                />
            </div>

            {/* Filters */}
            <div className="space-y-3 mb-6">
                {/* Area Filter - Modern Chip Style */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {areaFilters.map((area) => (
                        <button
                            key={area}
                            onClick={() => setSelectedArea(area)}
                            className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all min-h-[36px] ${selectedArea === area
                                ? "bg-[#FFF5EB] text-[#F2994A] border border-[#F2994A]/20"
                                : "bg-white text-[#666666] border border-[#EEEEEE] hover:border-[#DDDDDD]"
                                }`}
                        >
                            {area}
                        </button>
                    ))}
                </div>

                {/* View Toggle */}
                <div className="flex items-center justify-between">
                    <p className="text-xs text-[#7c644c]">
                        {filteredQuests.length}件のクエスト
                    </p>
                    <div className="flex items-center gap-1 bg-[#f7efe5] rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-[#e67a28]" : "text-[#7c644c]"
                                }`}
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-[#e67a28]" : "text-[#7c644c]"
                                }`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Quest List */}
            {loading ? (
                <div className={viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-4"}>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-3xl bg-white overflow-hidden shadow-soft">
                            <Skeleton className={viewMode === "grid" ? "h-32 w-full" : "h-24 w-24 float-left rounded-2xl m-3"} />
                            <div className="p-4 space-y-2 clear-both">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-12">
                    <p className="text-sm text-rose-600 mb-4">{error}</p>
                    <button
                        className="px-6 py-2.5 rounded-full border border-[#EEEEEE] text-[#666666] text-sm font-medium hover:bg-[#FAFAFA] transition-all min-h-[44px]"
                        onClick={() => window.location.reload()}
                    >
                        再読み込み
                    </button>
                </div>
            ) : filteredQuests.length === 0 ? (
                <div className="text-center py-16 animate-fade-in">
                    <div className="w-20 h-20 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-6 animate-float">
                        <Sparkles className="w-10 h-10 text-[#F2994A]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#333333] mb-2">該当するクエストがありません</h3>
                    <p className="text-sm text-[#999999] mb-6">条件を変更して再度お探しください</p>
                    <button
                        className="px-6 py-2.5 rounded-full border border-[#EEEEEE] text-[#666666] text-sm font-medium hover:bg-[#FAFAFA] transition-all min-h-[44px]"
                        onClick={() => {
                            setKeyword("");
                            setSelectedArea("すべて");
                        }}
                    >
                        フィルターをリセット
                    </button>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 gap-4">
                    {filteredQuests.map((quest, index) => (
                        <div
                            key={quest.id}
                            onClick={() => handleQuestClick(quest.id)}
                            className="group rounded-3xl bg-white overflow-hidden shadow-soft hover:shadow-soft-lg transition-all duration-300 cursor-pointer animate-slide-up"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="relative h-32 overflow-hidden bg-[#F5F5F5]">
                                {quest.cover_image_url ? (
                                    <img
                                        src={quest.cover_image_url}
                                        alt={quest.title || "Quest"}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Target className="w-8 h-8 text-[#CCCCCC]" />
                                    </div>
                                )}
                                {/* Smooth Overlay */}
                                <div className="absolute inset-0 gradient-overlay-smooth" />

                                {purchasedIds.has(quest.id) && (
                                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/90 backdrop-blur-sm text-white text-[9px] font-semibold shadow-sm">
                                        購入済み
                                    </div>
                                )}
                            </div>
                            <div className="p-3.5 space-y-1.5">
                                <h3 className="text-sm font-bold text-[#333333] line-clamp-2 leading-snug min-h-[2.5em]">
                                    {quest.title || "タイトル未設定"}
                                </h3>
                                {quest.area_name && (
                                    <span className="text-[11px] text-[#999999] flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {quest.area_name}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredQuests.map((quest, index) => (
                        <div
                            key={quest.id}
                            onClick={() => handleQuestClick(quest.id)}
                            className="group flex gap-3.5 rounded-3xl bg-white p-3 shadow-soft hover:shadow-soft-lg transition-all duration-300 cursor-pointer animate-slide-up min-h-[104px]"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="relative w-24 h-20 rounded-2xl overflow-hidden bg-[#F5F5F5] shrink-0 self-center">
                                {quest.cover_image_url ? (
                                    <img
                                        src={quest.cover_image_url}
                                        alt={quest.title || "Quest"}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Target className="w-8 h-8 text-[#CCCCCC]" />
                                    </div>
                                )}
                                {purchasedIds.has(quest.id) && (
                                    <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shadow-sm" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5 gap-2">
                                <div>
                                    <h3 className="text-sm font-bold text-[#333333] line-clamp-2 leading-snug mb-1">
                                        {quest.title || "タイトル未設定"}
                                    </h3>
                                    {quest.area_name && (
                                        <span className="text-[11px] text-[#999999] flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {quest.area_name}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-end">
                                    <span className="text-[10px] text-[#F2994A] font-medium flex items-center gap-0.5">
                                        詳細を見る
                                        <ChevronRight className="w-3 h-3" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


export default Quests;
