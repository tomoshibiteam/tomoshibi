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
        <div className="min-h-screen pb-8">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-[#e67a28]" />
                    <h1 className="text-xl font-bold text-[#2f1d0f]">クエスト一覧</h1>
                </div>
                <p className="text-sm text-[#7c644c]">冒険が待っている街へ出かけよう</p>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#c27a34] transition-colors peer-focus:text-[#e67a28]" />
                <input
                    type="text"
                    placeholder="クエストを検索..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="peer w-full pl-12 pr-4 py-3 rounded-2xl bg-[#f7efe5] border border-[#eadfd0] text-sm text-[#2f1d0f] placeholder:text-[#b07a4c] focus:outline-none focus:ring-2 focus:ring-[#e67a28]/30 focus:border-[#e67a28] transition-all duration-200"
                />
            </div>

            {/* Filters */}
            <div className="space-y-3 mb-6">
                {/* Area Filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <MapPin className="w-4 h-4 text-[#7c644c] shrink-0" />
                    {areaFilters.map((area) => (
                        <button
                            key={area}
                            onClick={() => setSelectedArea(area)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedArea === area
                                ? "bg-gradient-to-r from-[#ffb566] to-[#e67a28] text-white shadow-sm"
                                : "bg-white border border-[#eadfd0] text-[#5f4a35] hover:border-[#e67a28]/50"
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
                <div className={viewMode === "grid" ? "grid grid-cols-2 gap-3" : "space-y-3"}>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-2xl border border-[#eadfd0] bg-white overflow-hidden">
                            <Skeleton className="h-32 w-full" />
                            <div className="p-3 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-12">
                    <p className="text-sm text-rose-600">{error}</p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => window.location.reload()}
                    >
                        再読み込み
                    </Button>
                </div>
            ) : filteredQuests.length === 0 ? (
                <div className="text-center py-12 animate-fade-in">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f7efe5] to-[#eadfd0] flex items-center justify-center mx-auto mb-4 animate-float">
                        <Sparkles className="w-10 h-10 text-[#c27a34]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#2f1d0f] mb-2">該当するクエストがありません</h3>
                    <p className="text-sm text-[#7c644c] mb-4">条件を変更して再度お探しください</p>
                    <Button
                        variant="outline"
                        className="border-[#eadfd0] hover:bg-[#f7efe5] hover:border-[#e67a28]/50 transition-all"
                        onClick={() => {
                            setKeyword("");
                            setSelectedArea("すべて");
                        }}
                    >
                        フィルターをリセット
                    </Button>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 gap-3">
                    {filteredQuests.map((quest, index) => (
                        <div
                            key={quest.id}
                            onClick={() => handleQuestClick(quest.id)}
                            className="group rounded-2xl border border-[#eadfd0] bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-[#e67a28]/30 hover:-translate-y-1 transition-all duration-200 cursor-pointer animate-scale-in"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="relative h-28 overflow-hidden bg-gradient-to-br from-[#f7efe5] to-[#eadfd0]">
                                {quest.cover_image_url ? (
                                    <img
                                        src={quest.cover_image_url}
                                        alt={quest.title || "Quest"}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Target className="w-8 h-8 text-[#c27a34]/30" />
                                    </div>
                                )}
                                {purchasedIds.has(quest.id) && (
                                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                                        購入済み
                                    </div>
                                )}
                            </div>
                            <div className="p-3 space-y-2">
                                <h3 className="text-sm font-semibold text-[#2f1d0f] line-clamp-2 leading-tight">
                                    {quest.title || "タイトル未設定"}
                                </h3>
                                {quest.area_name && (
                                    <span className="text-[10px] text-[#7c644c] flex items-center gap-0.5">
                                        <MapPin className="w-3 h-3" />
                                        {quest.area_name}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredQuests.map((quest) => (
                        <div
                            key={quest.id}
                            onClick={() => handleQuestClick(quest.id)}
                            className="group flex gap-3 rounded-2xl border border-[#eadfd0] bg-white p-3 shadow-sm hover:shadow-md hover:border-[#e67a28]/30 transition-all cursor-pointer"
                        >
                            <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-[#f7efe5] to-[#eadfd0] shrink-0">
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
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-[#2f1d0f] line-clamp-2 leading-tight mb-1">
                                        {quest.title || "タイトル未設定"}
                                    </h3>
                                    {quest.area_name && (
                                        <span className="text-[10px] text-[#7c644c] flex items-center gap-0.5">
                                            <MapPin className="w-3 h-3" />
                                            {quest.area_name}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    {purchasedIds.has(quest.id) ? (
                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] rounded-full">
                                            購入済み
                                        </Badge>
                                    ) : (
                                        <span className="text-[10px] text-[#7c644c]">詳細を見る</span>
                                    )}
                                    <ChevronRight className="w-4 h-4 text-[#c27a34] group-hover:translate-x-1 transition-transform" />
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
