import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Search,
    MapPin,
    Grid3X3,
    List,
    ChevronRight,
    Sparkles,
    Target,
    Loader2,
    Clock,
    Map as MapIcon,
    Navigation,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

type Quest = {
    id: string;
    title: string | null;
    area_name: string | null;
    cover_image_url: string | null;
    start_location?: { lat: number; lng: number } | null;
};

const areaFilters = ["すべて", "東京", "大阪", "京都", "その他"];

// Area name mapping for English to Japanese
const areaMapping: Record<string, string> = {
    "tokyo": "東京",
    "osaka": "大阪",
    "kyoto": "京都",
};

// Component to handle map camera updates
const MapController = ({
    points,
    panTo
}: {
    points: { lat: number; lng: number }[],
    panTo?: { lat: number; lng: number } | null
}) => {
    const map = useMap();

    // Auto-fit bounds when points change
    useEffect(() => {
        if (!map || points.length === 0) return;
        const bounds = new google.maps.LatLngBounds();
        points.forEach(point => bounds.extend(point));
        map.fitBounds(bounds, 50);
    }, [map, points]);

    // Pan to specific location when requested
    useEffect(() => {
        if (!map || !panTo) return;
        map.panTo(panTo);
    }, [map, panTo]);

    return null;
};

const Quests = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [keyword, setKeyword] = useState("");
    const [selectedArea, setSelectedArea] = useState("すべて");
    const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
    const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());

    // Map State
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        const fetchQuests = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch quests along with spots to determine start location
                const { data, error } = await supabase
                    .from("quests")
                    .select("id, title, area_name, cover_image_url, spots(lat, lng, order_index)")
                    .eq("status", "published")
                    .order("created_at", { ascending: false });

                if (error) {
                    console.error("Quests fetch error:", error);
                    setError("クエストの取得に失敗しました");
                    setQuests([]);
                } else {
                    const formattedQuests: Quest[] = (data || []).map((q: any) => {
                        // Find the spot with order_index 1 or the first one
                        let startLoc = null;
                        if (q.spots && Array.isArray(q.spots) && q.spots.length > 0) {
                            const sortedSpots = q.spots.sort((a: any, b: any) =>
                                (a.order_index || 0) - (b.order_index || 0)
                            );
                            const firstSpot = sortedSpots[0];
                            if (firstSpot.lat && firstSpot.lng) {
                                startLoc = { lat: firstSpot.lat, lng: firstSpot.lng };
                            }
                        }
                        return {
                            id: q.id,
                            title: q.title,
                            area_name: q.area_name,
                            cover_image_url: q.cover_image_url,
                            start_location: startLoc
                        };
                    });
                    setQuests(formattedQuests);
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

    // Get Current Location
    const handleUseCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const loc = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setUserLocation(loc);
                setMapCenter(loc);
                // Switch to map view if getting location
                if (viewMode !== 'map') setViewMode('map');
            },
            (err) => console.warn("Location fetch error", err),
            { enableHighAccuracy: true }
        );
    }, [viewMode]);

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

    const activeQuestPoints = useMemo(() => {
        return filteredQuests
            .map(q => q.start_location)
            .filter((loc): loc is { lat: number; lng: number } => !!loc);
    }, [filteredQuests]);

    const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
    const [selectedQuestDetail, setSelectedQuestDetail] = useState<any | null>(null);
    const [modalLoading, setModalLoading] = useState(false);

    const handleQuestClick = (questId: string) => {
        setSelectedQuestId(questId);
    };

    useEffect(() => {
        const fetchQuestDetail = async () => {
            if (!selectedQuestId) {
                setSelectedQuestDetail(null);
                return;
            }
            setModalLoading(true);
            try {
                // Fetch basic details needed for preview
                const { data, error } = await supabase
                    .from("quests")
                    .select("*, spots(count)")
                    .eq("id", selectedQuestId)
                    .single();

                if (data) {
                    // Check reviews for rating (simplified avg)
                    const { data: reviews } = await supabase
                        .from("quest_reviews")
                        .select("rating")
                        .eq("quest_id", selectedQuestId);

                    const avgRating = reviews && reviews.length > 0
                        ? (reviews.reduce((a: any, b: any) => a + b.rating, 0) / reviews.length).toFixed(1)
                        : null;

                    setSelectedQuestDetail({ ...data, rating: avgRating, spotsCount: data.spots?.[0]?.count ?? 0 });
                }
            } catch (e) {
                console.error("Failed to fetch detail", e);
            }
            setModalLoading(false);
        };
        fetchQuestDetail();
    }, [selectedQuestId]);

    const handleNavigateToDetail = () => {
        if (selectedQuestId) {
            navigate(`/quest/${selectedQuestId}`);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#FEF9F3] relative overflow-hidden">
            {/* Standard List/Grid Layout Container - Hide if Map Mode */}
            {viewMode !== 'map' && (
                <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4 relative">
                    {/* Sepia Vignette for cinematic focus */}
                    <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_transparent_10%,_#E8D5BE_120%)] z-0 pointer-events-none opacity-60" />

                    {/* Header */}
                    <div className="mb-5 relative z-10">
                        <h1 className="text-2xl font-bold font-serif text-[#3D2E1F] mb-1 tracking-widest">物語の入り口</h1>
                        <p className="text-xs font-serif text-[#7A6652] tracking-wide">未知なる冒険が待っている街へ出かけよう</p>

                        <button
                            onClick={handleUseCurrentLocation}
                            className="mt-2 text-[10px] text-[#D87A32] flex items-center gap-1 font-bold tracking-wide hover:underline"
                        >
                            <Navigation className="w-3 h-3" />
                            現在地付近のクエストを探す
                        </button>
                    </div>

                    {/* Search Bar - Cinematic Design */}
                    <div className="relative mb-5 z-10">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A6652]" />
                        <input
                            type="text"
                            placeholder="物語を検索..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white/80 border border-[#E8D5BE] text-base font-serif text-[#3D2E1F] placeholder:text-[#7A6652]/50 focus:outline-none focus:ring-2 focus:ring-[#D87A32]/20 focus:border-[#D87A32] transition-all min-h-[52px] shadow-sm"
                        />
                    </div>

                    {/* Filters & View Toggle */}
                    <div className="space-y-4 mb-6 relative z-10">
                        {/* Area Filter */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {areaFilters.map((area) => (
                                <button
                                    key={area}
                                    onClick={() => setSelectedArea(area)}
                                    className={`px-5 py-2 rounded-full text-xs font-serif font-bold whitespace-nowrap transition-all border shadow-sm ${selectedArea === area
                                        ? "bg-[#D87A32] text-[#FEF9F3] border-[#D87A32]"
                                        : "bg-white/80 text-[#7A6652] border-[#E8D5BE] hover:bg-[#FEF9F3] hover:border-[#D87A32]/50"
                                        }`}
                                >
                                    {area}
                                </button>
                            ))}
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center justify-between px-1">
                            <p className="text-xs font-serif text-[#7A6652] tracking-widest">
                                {filteredQuests.length} STRORIES FOUND
                            </p>
                            <div className="flex items-center gap-1 bg-[#E8D5BE]/30 rounded-lg p-1 border border-[#E8D5BE]">
                                <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-[#FEF9F3] shadow-sm text-[#D87A32]" : "text-[#7A6652]/60 hover:text-[#7A6652]"}`}><Grid3X3 className="w-4 h-4" /></button>
                                <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-[#FEF9F3] shadow-sm text-[#D87A32]" : "text-[#7A6652]/60 hover:text-[#7A6652]"}`}><List className="w-4 h-4" /></button>
                                <button onClick={() => setViewMode("map")} className={`p-1.5 rounded-md transition-all ${viewMode === "map" ? "bg-[#FEF9F3] shadow-sm text-[#D87A32]" : "text-[#7A6652]/60 hover:text-[#7A6652]"}`}><MapIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>

                    {/* Quest List */}
                    {loading ? (
                        <div className={`relative z-10 ${viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-4"}`}>
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="rounded-3xl bg-white/60 overflow-hidden border border-[#E8D5BE]">
                                    <Skeleton className={viewMode === "grid" ? "w-full aspect-[6/4] bg-[#E8D5BE]/20" : "h-24 w-24 float-left rounded-2xl m-3 bg-[#E8D5BE]/20"} />
                                    <div className="p-4 space-y-3 clear-both">
                                        <Skeleton className="h-4 w-3/4 bg-[#E8D5BE]/20" />
                                        <Skeleton className="h-3 w-1/2 bg-[#E8D5BE]/20" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 relative z-10 animate-fade-in">
                            <p className="text-sm font-serif text-[#B85A1F] mb-4">{error}</p>
                            <button className="px-6 py-2.5 rounded-full border border-[#D87A32]/30 text-[#D87A32] text-sm font-serif font-bold hover:bg-[#D87A32]/5 transition-all" onClick={() => window.location.reload()}>再読み込み</button>
                        </div>
                    ) : filteredQuests.length === 0 ? (
                        <div className="text-center py-16 animate-fade-in relative z-10">
                            <div className="w-20 h-20 rounded-full bg-[#FEF9F3] border-2 border-[#E8D5BE] flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <Sparkles className="w-8 h-8 text-[#D87A32]/50" />
                            </div>
                            <h3 className="text-lg font-bold font-serif text-[#3D2E1F] mb-2">物語が見つかりません</h3>
                            <button className="px-6 py-2.5 rounded-full bg-white/50 border border-[#E8D5BE] text-[#7A6652] text-xs font-serif font-bold hover:bg-white transition-all shadow-sm" onClick={() => { setKeyword(""); setSelectedArea("すべて"); }}>フィルターをリセット</button>
                        </div>
                    ) : (
                        <div className={`relative z-10 pb-8 ${viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-4"}`}>
                            {filteredQuests.map((quest, index) => (
                                <div
                                    key={quest.id}
                                    onClick={() => handleQuestClick(quest.id)}
                                    className={`group rounded-3xl bg-[#FEF9F3] overflow-hidden shadow-[0_4px_20px_rgba(61,46,31,0.05)] border border-[#7A6652]/10 hover:border-[#D87A32]/30 transition-all duration-500 cursor-pointer animate-in fade-in slide-in-from-bottom-4 fill-mode-both ${viewMode === "list" ? "flex gap-4 p-3 min-h-[104px]" : ""}`}
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <div className={`relative overflow-hidden bg-[#E8D5BE] ${viewMode === "grid" ? "w-full aspect-[6/4]" : "w-24 h-24 rounded-2xl shrink-0 border border-[#7A6652]/10"}`}>
                                        {quest.cover_image_url ? (
                                            <img src={quest.cover_image_url} alt={quest.title || "Quest"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 sepia-[.2]" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><Target className="w-8 h-8 text-[#FEF9F3]/50" /></div>
                                        )}
                                        {viewMode === "grid" && <div className="absolute inset-0 bg-gradient-to-t from-[#3D2E1F]/60 to-transparent opacity-60" />}
                                        {purchasedIds.has(quest.id) && (
                                            <div className={`absolute rounded-full ${viewMode === 'grid' ? 'top-2 right-2 px-2.5 py-1 bg-[#2E5A5C]/90 backdrop-blur-sm text-[#FEF9F3] text-[9px] font-serif font-bold tracking-widest border border-[#FEF9F3]/20' : 'top-1 right-1 w-2.5 h-2.5 bg-[#2E5A5C] border border-[#FEF9F3] shadow-sm animate-pulse'}`}>
                                                {viewMode === 'grid' ? 'ACQUIRED' : ''}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`space-y-2 relative ${viewMode === "grid" ? "p-4" : "flex-1 min-w-0 flex flex-col justify-center py-1"}`}>
                                        <div>
                                            <h3 className="text-sm font-bold font-serif text-[#3D2E1F] line-clamp-2 leading-relaxed tracking-wide group-hover:text-[#D87A32] transition-colors">{quest.title || "タイトル未設定"}</h3>
                                            {quest.area_name && (
                                                <span className="text-xs font-serif text-[#7A6652] flex items-center gap-1 opacity-80 mt-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {quest.area_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Map Mode Container */}
            {/* Map Mode Container */}
            {viewMode === 'map' && (
                <div className="flex-1 relative bg-[#E8D5BE]/20">
                    {/* Top Left: Location Button */}
                    <button
                        onClick={handleUseCurrentLocation}
                        className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-md rounded-full w-12 h-12 flex items-center justify-center shadow-md border border-[#E8D5BE] text-[#3D2E1F] hover:text-[#D87A32] transition-colors"
                    >
                        <Navigation className="w-5 h-5" />
                    </button>

                    {/* Top Right: View Toggle */}
                    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                        <div className="bg-white/90 backdrop-blur-md rounded-xl p-1 shadow-md border border-[#E8D5BE] flex gap-1">
                            <button onClick={() => setViewMode("grid")} className="p-2 rounded-lg text-[#7A6652] hover:bg-[#FEF9F3]"><Grid3X3 className="w-5 h-5" /></button>
                            <button onClick={() => setViewMode("list")} className="p-2 rounded-lg text-[#7A6652] hover:bg-[#FEF9F3]"><List className="w-5 h-5" /></button>
                            <button onClick={() => setViewMode("map")} className="p-2 rounded-lg bg-[#FEF9F3] text-[#D87A32] shadow-sm"><MapIcon className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {MAPS_API_KEY ? (
                        <APIProvider apiKey={MAPS_API_KEY}>
                            <Map
                                defaultCenter={{ lat: 35.6812, lng: 139.7671 }} // Default fallback
                                defaultZoom={13}
                                mapId="quest-list-map"
                                disableDefaultUI={true}
                                gestureHandling="greedy"
                            >
                                <MapController points={activeQuestPoints} panTo={mapCenter} />
                                {filteredQuests.map((quest) => (
                                    quest.start_location && (
                                        <AdvancedMarker
                                            key={quest.id}
                                            position={quest.start_location}
                                            onClick={() => handleQuestClick(quest.id)}
                                        >
                                            <div className="relative group cursor-pointer transition-transform hover:scale-110 hover:-translate-y-1">
                                                <div className="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden bg-[#E8D5BE] relative z-20">
                                                    {quest.cover_image_url ? (
                                                        <img src={quest.cover_image_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-[#D87A32]"><Target className="w-5 h-5 text-white" /></div>
                                                    )}
                                                </div>
                                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-4 h-4 bg-white z-10 border-b border-r border-[#E8D5BE/50]" />

                                                {/* Tooltip on Hover */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[150px] bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 text-center">
                                                    <p className="text-[10px] font-bold text-[#3D2E1F] truncate">{quest.title}</p>
                                                </div>
                                            </div>
                                        </AdvancedMarker>
                                    )
                                ))}
                                {userLocation && (
                                    <AdvancedMarker position={userLocation}>
                                        <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md animate-pulse" />
                                    </AdvancedMarker>
                                )}
                            </Map>
                        </APIProvider>
                    ) : (
                        <div className="flex items-center justify-center h-full text-[#7A6652] text-sm font-serif">
                            地図の読み込みに失敗しました
                        </div>
                    )}
                </div>
            )}

            {/* Quest Preview Modal relative to the Page Context */}
            <Dialog open={!!selectedQuestId} onOpenChange={(open) => !open && setSelectedQuestId(null)}>
                <DialogContent className="max-w-md w-[90%] rounded-3xl bg-[#FEF9F3] border-[#E8D5BE] p-0 overflow-hidden shadow-2xl">
                    <div className="relative h-48 bg-[#E8D5BE]">
                        {selectedQuestDetail?.cover_image_url ? (
                            <img src={selectedQuestDetail.cover_image_url} alt="Cover" className="w-full h-full object-cover sepia-[0.3]" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Target className="w-12 h-12 text-[#7A6652]/30" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#3D2E1F] via-transparent to-transparent opacity-80" />
                        <div className="absolute bottom-4 left-4 right-4">
                            <span className="inline-block px-2.5 py-1 rounded-full bg-[#D87A32] text-[#FEF9F3] text-[10px] font-serif font-bold tracking-widest border border-[#FEF9F3]/20 mb-2">
                                {selectedQuestDetail?.difficulty || "NORMAL"}
                            </span>
                            <h2 className="text-xl font-bold font-serif text-[#FEF9F3] leading-snug tracking-wide shadow-black drop-shadow-md">
                                {selectedQuestDetail?.title || "Loading..."}
                            </h2>
                        </div>
                    </div>

                    <div className="p-6">
                        {modalLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-8 h-8 text-[#D87A32] animate-spin" />
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    <div className="text-center p-2 rounded-xl bg-white/50 border border-[#E8D5BE]">
                                        <Clock className="w-4 h-4 text-[#D87A32] mx-auto mb-1" />
                                        <p className="text-[10px] text-[#7A6652] font-serif">TIME</p>
                                        <p className="text-xs font-bold text-[#3D2E1F]">{selectedQuestDetail?.duration_min ?? 60} min</p>
                                    </div>
                                    <div className="text-center p-2 rounded-xl bg-white/50 border border-[#E8D5BE]">
                                        <MapPin className="w-4 h-4 text-[#D87A32] mx-auto mb-1" />
                                        <p className="text-[10px] text-[#7A6652] font-serif">AREA</p>
                                        <p className="text-xs font-bold text-[#3D2E1F] truncate px-1">{selectedQuestDetail?.area_name ?? "Unknown"}</p>
                                    </div>
                                    <div className="text-center p-2 rounded-xl bg-white/50 border border-[#E8D5BE]">
                                        <Target className="w-4 h-4 text-[#D87A32] mx-auto mb-1" />
                                        <p className="text-[10px] text-[#7A6652] font-serif">SPOTS</p>
                                        <p className="text-xs font-bold text-[#3D2E1F]">{selectedQuestDetail?.spotsCount ?? 0}</p>
                                    </div>
                                </div>

                                <p className="text-sm text-[#7A6652] font-serif leading-relaxed line-clamp-3 mb-6">
                                    {selectedQuestDetail?.description || "No description available."}
                                </p>

                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        className="flex-1 rounded-full border-[#D87A32] text-[#D87A32] font-serif font-bold hover:bg-[#D87A32]/10"
                                        onClick={() => setSelectedQuestId(null)}
                                    >
                                        閉じる
                                    </Button>
                                    <Button
                                        className="flex-[2] rounded-full bg-gradient-to-r from-[#D87A32] to-[#B85A1F] text-white font-serif font-bold tracking-widest hover:shadow-lg transition-transform active:scale-95"
                                        onClick={handleNavigateToDetail}
                                    >
                                        詳細を見る
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Quests;
