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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#e67a28] animate-spin" />
            </div>
        );
    }

    if (!quest) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
                <p className="text-[#7c644c] mb-4">クエストが見つかりませんでした</p>
                <Button variant="outline" onClick={() => navigate("/quests")}>
                    クエスト一覧に戻る
                </Button>
            </div>
        );
    }

    const difficulty = quest.difficulty || "初級";
    const difficultyStyle = {
        "初級": "bg-emerald-100 text-emerald-700",
        "中級": "bg-amber-100 text-amber-700",
        "上級": "bg-rose-100 text-rose-700",
    }[difficulty] || "bg-stone-100 text-stone-700";

    return (
        <div className="min-h-screen pb-24">
            {/* Hero Image */}
            <div className="relative w-full aspect-[16/10] overflow-hidden bg-[#2f1d0f]">
                {quest.cover_image_url ? (
                    <img
                        src={quest.cover_image_url}
                        alt={quest.title || "Quest"}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#f7efe5] to-[#eadfd0]" />
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 p-2 rounded-full bg-white/20 backdrop-blur-md text-white z-10"
                >
                    <ChevronLeft size={20} />
                </button>

                {/* Like & Share */}
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                    <button
                        onClick={() => setLiked(!liked)}
                        className={`p-2 rounded-full backdrop-blur-md transition-all ${liked ? "bg-rose-500/90 text-white" : "bg-white/20 text-white"
                            }`}
                    >
                        <Heart size={18} className={liked ? "fill-current" : ""} />
                    </button>
                    <button className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white">
                        <Share2 size={18} />
                    </button>
                </div>

                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${difficultyStyle}`}>
                            {difficulty}
                        </span>
                        {quest.area_name && (
                            <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-medium flex items-center gap-1">
                                <MapPin size={10} />
                                {quest.area_name}
                            </span>
                        )}
                    </div>
                    <h1
                        className="text-2xl font-black text-white drop-shadow-xl leading-tight mb-2"
                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
                    >
                        {quest.title || "タイトル未設定"}
                    </h1>
                    <div className="flex items-center gap-3 text-white/80 text-xs">
                        <span className="flex items-center gap-1">
                            <Star size={12} className="text-amber-400 fill-amber-400" />
                            {stats.rating.toFixed(1)} ({stats.reviewCount}件)
                        </span>
                        {stats.playCount > 0 && (
                            <span className="flex items-center gap-1">
                                <Users size={12} />
                                {stats.playCount}人プレイ
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-[#f7efe5]">
                        <Clock size={16} className="text-[#e67a28]" />
                        <div>
                            <div className="text-sm font-bold text-[#2f1d0f]">
                                約{Math.round((quest.duration_min || 60) / 5) * 5}分
                            </div>
                            <div className="text-[10px] text-[#7c644c]">所要時間</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-[#f7efe5]">
                        <Compass size={16} className="text-[#e67a28]" />
                        <div>
                            <div className="text-sm font-bold text-[#2f1d0f]">
                                {(quest.distance_km || 2).toFixed(1)}km
                            </div>
                            <div className="text-[10px] text-[#7c644c]">総距離</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-[#f7efe5]">
                        <Footprints size={16} className="text-[#e67a28]" />
                        <div>
                            <div className="text-sm font-bold text-[#2f1d0f]">{spots.length}箇所</div>
                            <div className="text-[10px] text-[#7c644c]">スポット数</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-[#f7efe5]">
                        <Trophy size={16} className="text-[#e67a28]" />
                        <div>
                            <div className="text-sm font-bold text-[#2f1d0f]">
                                {stats.clearRate !== null ? `${stats.clearRate}%` : "—"}
                            </div>
                            <div className="text-[10px] text-[#7c644c]">クリア率</div>
                        </div>
                    </div>
                </div>

                {/* CTA Button - Above Description */}
                <div className="mb-6">
                    {purchased ? (
                        <Button
                            onClick={handleStartQuest}
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2"
                        >
                            <Play size={18} fill="currentColor" />
                            クエストを開始する
                        </Button>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="shrink-0">
                                <div className="text-[10px] text-[#7c644c]">参加費</div>
                                <div className="text-base font-bold text-[#2f1d0f]">無料</div>
                            </div>
                            <Button
                                onClick={handlePurchase}
                                disabled={purchasing}
                                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#ffb566] to-[#e67a28] hover:from-[#e67a28] hover:to-[#d66a18] text-white font-bold text-sm"
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

                {/* Description */}
                <div>
                    <h2 className="text-sm font-bold text-[#2f1d0f] mb-2">概要</h2>
                    <p className="text-sm text-[#5f4a35] leading-relaxed">
                        {quest.description || "街を歩きながら謎を解く、新しい体験型アドベンチャー。"}
                    </p>
                </div>

                {/* Features */}
                <div className="p-4 rounded-xl bg-[#f7efe5] space-y-3">
                    <h2 className="text-sm font-bold text-[#2f1d0f]">このクエストの特徴</h2>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-[#5f4a35]">
                            <MapPin size={14} className="text-[#e67a28]" />
                            スタート地点: {quest.area_name || "未設定"}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#5f4a35]">
                            <Clock size={14} className="text-[#e67a28]" />
                            24時間いつでもプレイ可能
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#5f4a35]">
                            <Shield size={14} className="text-[#e67a28]" />
                            初心者でも安心のヒント機能付き
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#5f4a35]">
                            <Users size={14} className="text-[#e67a28]" />
                            1人でも仲間とでも楽しめます
                        </div>
                    </div>
                </div>

                {/* Creator */}
                {creator?.username && (
                    <div>
                        <h2 className="text-sm font-bold text-[#2f1d0f] mb-2">クリエーター</h2>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f7efe5]">
                            <div className="w-10 h-10 rounded-full bg-[#e67a28]/20 flex items-center justify-center text-[#e67a28] font-bold">
                                {creator.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-[#2f1d0f]">{creator.username}</div>
                                <div className="text-[10px] text-[#7c644c]">クエストクリエーター</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Notice */}
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex gap-2">
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <div className="text-xs font-bold text-amber-800 mb-0.5">ご注意</div>
                        <p className="text-[10px] text-amber-700 leading-relaxed">
                            このクエストは屋外を歩きながら進めます。歩きやすい服装・靴でご参加ください。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuestDetail;
