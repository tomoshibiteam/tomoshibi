import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    MapPin,
    Clock,
    Star,
    Users,
    Compass,
    Footprints,
    Trophy,
    Shield,
    Play,
    Heart,
    Share2,
    AlertCircle,
    Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface Quest {
    id: string;
    title: string | null;
    description: string | null;
    area_name: string | null;
    cover_image_url: string | null;
    distance_km: number | null;
    duration_min: number | null;
    difficulty: string | null;
    tags: string[] | null;
    supported_languages: string[] | null;
    creator_id: string | null;
}

interface Creator {
    username: string | null;
}

interface Stats {
    rating: number;
    reviewCount: number;
    playCount: number;
    clearRate: number | null;
    avgDurationMin: number | null;
}

const QuestDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [quest, setQuest] = useState<Quest | null>(null);
    const [creator, setCreator] = useState<Creator | null>(null);
    const [stats, setStats] = useState<Stats>({
        rating: 0,
        reviewCount: 0,
        playCount: 0,
        clearRate: null,
        avgDurationMin: null,
    });
    const [spots, setSpots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchased, setPurchased] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [liked, setLiked] = useState(false);

    // New state for prologue accordion
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    useEffect(() => {
        const fetchQuestDetails = async () => {
            if (!id) return;
            setLoading(true);

            // Fetch quest, spots, reviews, sessions in parallel
            const [questRes, spotsRes, reviewsRes, sessionsRes] = await Promise.all([
                supabase
                    .from("quests")
                    .select("*, profiles!quests_creator_id_fkey(username)")
                    .eq("id", id)
                    .single(),
                supabase
                    .from("spots")
                    .select("id, name, address")
                    .eq("quest_id", id)
                    .order("order_index", { ascending: true }),
                supabase
                    .from("quest_reviews")
                    .select("rating")
                    .eq("quest_id", id),
                supabase
                    .from("play_sessions")
                    .select("ended_at, duration_sec")
                    .eq("quest_id", id),
            ]);

            if (questRes.data) {
                setQuest(questRes.data);
                setCreator(questRes.data.profiles || null);
            }

            if (spotsRes.data) {
                setSpots(spotsRes.data);
            }

            // Calculate stats
            const reviews = (reviewsRes.data || []).filter((r: any) => r.rating != null);
            const avgRating = reviews.length > 0
                ? parseFloat((reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1))
                : 0;
            const sessions = sessionsRes.data || [];
            const playCount = sessions.length;
            const clearCount = sessions.filter((s: any) => s.ended_at != null).length;
            const clearRate = playCount > 0 ? Math.round((clearCount / playCount) * 100) : null;
            const durations = sessions.filter((s: any) => s.duration_sec != null).map((s: any) => s.duration_sec);
            const avgDuration = durations.length > 0
                ? Math.round((durations.reduce((a: number, b: number) => a + b, 0) / durations.length) / 60)
                : null;

            setStats({
                rating: avgRating,
                reviewCount: reviews.length,
                playCount,
                clearRate,
                avgDurationMin: avgDuration,
            });

            // Check if purchased
            if (user) {
                const { data: purchaseData } = await supabase
                    .from("purchases")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("quest_id", id)
                    .single();
                setPurchased(!!purchaseData);
            }

            setLoading(false);
        };

        fetchQuestDetails();
    }, [id, user]);

    const handlePurchase = async () => {
        if (!user || !id) return;
        setPurchasing(true);
        try {
            const { error } = await supabase.from("purchases").insert({
                user_id: user.id,
                quest_id: id,
            });
            if (!error) {
                setPurchased(true);
            }
        } catch (e) {
            console.error("Purchase error:", e);
        }
        setPurchasing(false);
    };

    const handleStartQuest = () => {
        if (!id) return;
        navigate(`/gameplay/${id}`);
    };

    // Helper to calculate approximate steps (approx 1400 steps per km)
    const steps = quest ? Math.round((quest.distance_km || 0) * 1400) : 0;

    const difficulty = quest?.difficulty || "NORMAL";
    const difficultyStyle = {
        "EASY": "bg-[#2E5A5C] text-[#FEF9F3]",
        "NORMAL": "bg-[#D87A32] text-[#FEF9F3]",
        "HARD": "bg-[#B85A1F] text-[#FEF9F3]",
    }[difficulty] || "bg-[#7A6652] text-[#FEF9F3]";

    const difficultyLabel = {
        "EASY": "初級",
        "NORMAL": "中級",
        "HARD": "上級",
    }[difficulty] || "初級";

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FEF9F3]">
                <Loader2 className="w-8 h-8 text-[#D87A32] animate-spin" />
            </div>
        );
    }

    if (!quest) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-[#FEF9F3]">
                <p className="text-[#7A6652] mb-4 font-serif">物語が見つかりませんでした</p>
                <Button variant="outline" onClick={() => navigate("/quests")} className="font-serif border-[#E8D5BE] text-[#7A6652]">
                    物語一覧に戻る
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FEF9F3] pb-32 relative overflow-x-hidden font-serif text-[#3D2E1F]">
            {/* Sepia Vignette for cinematic focus */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_transparent_10%,_#E8D5BE_120%)] z-0 pointer-events-none opacity-60" />

            {/* 1. Hero Section (Full Width) */}
            <div className="relative w-full aspect-[4/3] z-10 shadow-md">
                {quest.cover_image_url ? (
                    <img
                        src={quest.cover_image_url}
                        alt={quest.title || "Quest"}
                        className="w-full h-full object-cover sepia-[.15]"
                    />
                ) : (
                    <div className="w-full h-full bg-[#E8D5BE] flex items-center justify-center">
                        <Compass className="w-16 h-16 text-[#FEF9F3]/50" />
                    </div>
                )}

                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 p-3 rounded-full bg-[#FEF9F3]/90 backdrop-blur-md text-[#3D2E1F] shadow-sm border border-[#E8D5BE] hover:bg-white transition-all active:scale-95 z-20"
                >
                    <ChevronLeft size={20} />
                </button>

                {/* Header Actions */}
                <div className="absolute top-4 right-4 flex gap-3 z-20">
                    <button
                        onClick={() => setLiked(!liked)}
                        className={`p-3 rounded-full backdrop-blur-md border border-[#E8D5BE] shadow-sm transition-all active:scale-95 ${liked ? "bg-[#D87A32] text-white border-[#D87A32]" : "bg-[#FEF9F3]/90 text-[#3D2E1F] hover:bg-white"
                            }`}
                    >
                        <Heart size={20} className={liked ? "fill-current" : ""} />
                    </button>
                    <button className="p-3 rounded-full bg-[#FEF9F3]/90 backdrop-blur-md text-[#3D2E1F] border border-[#E8D5BE] shadow-sm hover:bg-white transition-all active:scale-95">
                        <Share2 size={20} />
                    </button>
                </div>

                {/* Bottom Shadow Gradient for text readability if needed */}
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#FEF9F3] to-transparent" />
            </div>

            {/* Main Content Container */}
            <div className="relative z-10 px-5 -mt-4">

                {/* Title & Tags */}
                <div className="mb-6">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest shadow-sm ${difficultyStyle}`}>
                            {difficultyLabel}
                        </span>
                        {quest.area_name && (
                            <span className="px-3 py-1 rounded-full bg-white border border-[#E8D5BE] text-[#7A6652] text-[10px] font-bold tracking-wide flex items-center gap-1 shadow-sm">
                                <MapPin size={10} />
                                {quest.area_name}
                            </span>
                        )}
                        <div className="flex items-center gap-1 ml-auto text-[#D87A32] bg-white px-2 py-1 rounded-full border border-[#E8D5BE] shadow-sm">
                            <Star size={12} className="fill-current" />
                            <span className="text-xs font-bold">{stats.rating.toFixed(1)}</span>
                            <span className="text-[10px] text-[#7A6652] opacity-70">({stats.reviewCount})</span>
                        </div>
                    </div>

                    <h1 className="text-2xl font-black text-[#3D2E1F] leading-tight mb-2 tracking-wide drop-shadow-sm">
                        {quest.title || "タイトル未設定"}
                    </h1>
                </div>

                {/* 2. Specs Visualization */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="bg-white/60 p-3 rounded-2xl border border-[#E8D5BE] flex flex-col items-center justify-center text-center shadow-sm">
                        <Clock className="w-6 h-6 text-[#D87A32] mb-1" />
                        <span className="text-lg font-black text-[#3D2E1F] leading-none mb-0.5">
                            {Math.round((quest.duration_min || 60) / 5) * 5}
                            <span className="text-[10px] font-normal ml-0.5">分</span>
                        </span>
                        <span className="text-[10px] text-[#7A6652] tracking-wide font-bold">所要時間</span>
                    </div>
                    <div className="bg-white/60 p-3 rounded-2xl border border-[#E8D5BE] flex flex-col items-center justify-center text-center shadow-sm">
                        <Compass className="w-6 h-6 text-[#D87A32] mb-1" />
                        <span className="text-lg font-black text-[#3D2E1F] leading-none mb-0.5">
                            {(quest.distance_km || 2).toFixed(1)}
                            <span className="text-[10px] font-normal ml-0.5">km</span>
                        </span>
                        <span className="text-[10px] text-[#7A6652] tracking-wide font-bold">移動距離</span>
                    </div>
                    <div className="bg-white/60 p-3 rounded-2xl border border-[#E8D5BE] flex flex-col items-center justify-center text-center shadow-sm">
                        <Footprints className="w-6 h-6 text-[#D87A32] mb-1" />
                        <span className="text-lg font-black text-[#3D2E1F] leading-none mb-0.5">
                            {steps.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-[#7A6652] tracking-wide font-bold">歩数</span>
                    </div>
                </div>

                {/* 3. Prologue (Accordion) */}
                <div className="mb-8">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-[#3D2E1F] mb-4 tracking-widest">
                        <span className="w-8 h-px bg-[#D87A32]" />
                        プロローグ
                    </h2>

                    <div className="relative">
                        <div
                            className={`text-sm text-[#5f4a35] leading-loose transition-all duration-500 overflow-hidden whitespace-pre-line ${isDescriptionExpanded ? "max-h-[1000px]" : "max-h-[5.5em]"
                                }`}
                        >
                            {(() => {
                                const text = quest.description || "街を歩きながら謎を解く、新しい体験型アドベンチャー。";
                                // Add newline after punctuation if not already present to improve readability
                                return text.replace(/([。！？])(?=[^」\n])/g, "$1\n");
                            })()}
                        </div>

                        {!isDescriptionExpanded && (
                            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#FEF9F3] via-[#FEF9F3]/90 to-transparent flex items-end justify-center pointer-events-none" />
                        )}
                    </div>

                    <button
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                        className="w-full mt-2 py-2 flex items-center justify-center gap-1 text-xs font-bold text-[#D87A32] hover:text-[#B85A1F] transition-colors uppercase tracking-widest group"
                    >
                        {isDescriptionExpanded ? "閉じる" : "続きを読む"}
                        <ChevronLeft
                            size={14}
                            className={`transition-transform duration-300 ${isDescriptionExpanded ? "rotate-90" : "-rotate-90"}`}
                        />
                    </button>
                </div>

                {/* 4. Features (Cards Grid) */}
                <div className="mb-8">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-[#3D2E1F] mb-4 tracking-widest">
                        <span className="w-8 h-px bg-[#D87A32]" />
                        特徴
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-white/50 border border-[#E8D5BE] flex flex-col items-start gap-2 h-full">
                            <div className="w-8 h-8 rounded-full bg-[#D87A32]/10 flex items-center justify-center shrink-0 text-[#D87A32]">
                                <Clock size={16} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-[#3D2E1F] mb-1">いつでもプレイ</h3>
                                <p className="text-[10px] text-[#7A6652] leading-tight">24時間いつでも開始可能</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/50 border border-[#E8D5BE] flex flex-col items-start gap-2 h-full">
                            <div className="w-8 h-8 rounded-full bg-[#D87A32]/10 flex items-center justify-center shrink-0 text-[#D87A32]">
                                <Shield size={16} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-[#3D2E1F] mb-1">ヒント機能</h3>
                                <p className="text-[10px] text-[#7A6652] leading-tight">初心者でも安心のサポート</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/50 border border-[#E8D5BE] flex flex-col items-start gap-2 h-full">
                            <div className="w-8 h-8 rounded-full bg-[#D87A32]/10 flex items-center justify-center shrink-0 text-[#D87A32]">
                                <Users size={16} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-[#3D2E1F] mb-1">1人でも仲間とでも</h3>
                                <p className="text-[10px] text-[#7A6652] leading-tight">自由なスタイルで</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/50 border border-[#E8D5BE] flex flex-col items-start gap-2 h-full">
                            <div className="w-8 h-8 rounded-full bg-[#D87A32]/10 flex items-center justify-center shrink-0 text-[#D87A32]">
                                <MapPin size={16} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-[#3D2E1F] mb-1">開始地点</h3>
                                <p className="text-[10px] text-[#7A6652] leading-tight truncate w-full">{quest.area_name || "エリア未設定"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Creator */}
                {creator?.username && (
                    <div className="mb-4">
                        <h2 className="flex items-center gap-2 text-sm font-bold text-[#3D2E1F] mb-4 tracking-widest">
                            <span className="w-8 h-px bg-[#D87A32]" />
                            クリエイター
                        </h2>
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#fffcf9] border border-[#E8D5BE] shadow-sm">
                            <div className="w-12 h-12 rounded-full bg-[#E8D5BE] flex items-center justify-center text-[#7A6652] font-serif font-bold text-lg border-2 border-white shadow-sm shrink-0">
                                {creator.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-[#3D2E1F]">{creator.username}</div>
                                <div className="text-[10px] text-[#7A6652] tracking-widest">ストーリーテラー</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 5. Sticky Footer CTA */}
            <div className="fixed bottom-16 left-0 right-0 p-4 bg-[#FEF9F3]/95 backdrop-blur-md border-t border-[#E8D5BE] z-50 shadow-[0_-4px_20px_rgba(61,46,31,0.05)]">
                <div className="max-w-md mx-auto w-full">
                    {purchased ? (
                        <Button
                            onClick={handleStartQuest}
                            className="w-full h-14 rounded-full bg-gradient-to-r from-[#D87A32] to-[#B85A1F] hover:from-[#E88B43] hover:to-[#C96B30] text-white font-bold tracking-widest text-base shadow-lg shadow-[#D87A32]/25 hover:shadow-xl hover:scale-[1.02] transition-all"
                        >
                            <Play size={20} fill="currentColor" className="mr-2" />
                            物語を始める
                        </Button>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="w-1/3 flex flex-col items-center justify-center">
                                <span className="text-[10px] font-bold text-[#7A6652] tracking-widest">参加費用</span>
                                <span className="text-xl font-black text-[#3D2E1F]">無料</span>
                            </div>
                            <Button
                                onClick={handlePurchase}
                                disabled={purchasing}
                                className="flex-1 h-14 rounded-full bg-[#3D2E1F] hover:bg-[#2A1F15] text-[#FEF9F3] font-bold tracking-widest text-sm shadow-xl active:scale-95 transition-all"
                            >
                                {purchasing ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    "参加する"
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuestDetail;
