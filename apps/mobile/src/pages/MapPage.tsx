import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    MapPin,
    Target,
    Navigation,
    Loader2,
    X,
    ChevronRight,
    Locate
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { DEFAULT_CENTER } from "@/lib/mapConfig";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Dark mode map style
const MAP_STYLE = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

type Quest = {
    id: string;
    title: string | null;
    area_name: string | null;
    cover_image_url: string | null;
    lat?: number | null;
    lng?: number | null;
    difficulty?: number | null;
};

type Spot = {
    id: string;
    quest_id: string;
    name: string;
    lat: number;
    lng: number;
    quest_title?: string;
    quest_cover?: string;
};

// Map controller component
const MapController = ({
    userLocation,
    onLocate
}: {
    userLocation: { lat: number; lng: number } | null;
    onLocate: () => void;
}) => {
    const map = useMap();

    const handleLocate = useCallback(() => {
        if (map && userLocation) {
            map.panTo(userLocation);
            map.setZoom(15);
        }
        onLocate();
    }, [map, userLocation, onLocate]);

    return (
        <button
            onClick={handleLocate}
            className="absolute bottom-24 right-4 w-12 h-12 rounded-full bg-white shadow-lg border border-[#eadfd0] flex items-center justify-center hover:bg-[#f7efe5] transition-colors z-10"
        >
            <Locate className="w-5 h-5 text-[#e67a28]" />
        </button>
    );
};

const MapPage = () => {
    const navigate = useNavigate();
    const [spots, setSpots] = useState<Spot[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
    const [locating, setLocating] = useState(false);

    useEffect(() => {
        const fetchSpots = async () => {
            setLoading(true);
            // Fetch first spot of each published quest
            const { data: questData } = await supabase
                .from("quests")
                .select("id, title, cover_image_url")
                .eq("status", "published");

            if (!questData) {
                setLoading(false);
                return;
            }

            const questIds = questData.map(q => q.id);
            const questLookup: Record<string, typeof questData[0]> = {};
            questData.forEach(q => { questLookup[q.id] = q; });

            const { data: spotData } = await supabase
                .from("spots")
                .select("id, quest_id, name, lat, lng, order_index")
                .in("quest_id", questIds)
                .eq("order_index", 1);

            if (spotData) {
                const mappedSpots = spotData
                    .filter(s => s.lat && s.lng)
                    .map(s => ({
                        id: s.id,
                        quest_id: s.quest_id,
                        name: s.name,
                        lat: s.lat!,
                        lng: s.lng!,
                        quest_title: questLookup[s.quest_id]?.title || "クエスト",
                        quest_cover: questLookup[s.quest_id]?.cover_image_url || undefined,
                    }));
                setSpots(mappedSpots);
            }
            setLoading(false);
        };
        fetchSpots();
    }, []);

    const handleLocate = useCallback(() => {
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setLocating(false);
            },
            () => setLocating(false),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    useEffect(() => {
        handleLocate();
    }, []);

    const handleSpotClick = (spot: Spot) => {
        setSelectedSpot(spot);
    };

    const handleQuestDetail = () => {
        if (selectedSpot) {
            navigate(`/cases/${selectedSpot.quest_id}`);
        }
    };

    const mapCenter = userLocation || DEFAULT_CENTER;

    return (
        <div className="relative h-[calc(100vh-140px)] -mx-4 -mt-4">
            {/* Map */}
            <APIProvider apiKey={API_KEY}>
                <GoogleMap
                    defaultCenter={mapCenter}
                    defaultZoom={13}
                    mapId="tomoshibi_quest_map"
                    gestureHandling="greedy"
                    disableDefaultUI={true}
                    className="w-full h-full"
                >
                    <MapController userLocation={userLocation} onLocate={handleLocate} />

                    {/* Quest Spot Markers */}
                    {spots.map((spot) => (
                        <AdvancedMarker
                            key={spot.id}
                            position={{ lat: spot.lat, lng: spot.lng }}
                            onClick={() => handleSpotClick(spot)}
                        >
                            <div className={`relative cursor-pointer transition-transform hover:scale-110 ${selectedSpot?.id === spot.id ? 'scale-125' : ''}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${selectedSpot?.id === spot.id
                                    ? 'bg-gradient-to-br from-[#ffb566] to-[#e67a28]'
                                    : 'bg-white border-2 border-[#e67a28]'
                                    }`}>
                                    <Target className={`w-5 h-5 ${selectedSpot?.id === spot.id ? 'text-white' : 'text-[#e67a28]'}`} />
                                </div>
                                {selectedSpot?.id === spot.id && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#e67a28] rotate-45" />
                                )}
                            </div>
                        </AdvancedMarker>
                    ))}

                    {/* User Location Marker */}
                    {userLocation && (
                        <AdvancedMarker position={userLocation}>
                            <div className="relative">
                                <div className="absolute -inset-3 bg-blue-500/20 rounded-full animate-ping" />
                                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
                            </div>
                        </AdvancedMarker>
                    )}
                </GoogleMap>
            </APIProvider>

            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 bg-[#242f3e]/80 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-[#d59563] text-sm">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        マップを読み込み中...
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="absolute top-4 left-4 right-4">
                <div className="bg-white/95 backdrop-blur rounded-2xl px-4 py-3 shadow-lg border border-[#eadfd0]">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-sm font-bold text-[#2f1d0f]">クエストマップ</h1>
                            <p className="text-[10px] text-[#7c644c]">{spots.length}件のクエストが見つかりました</p>
                        </div>
                        {locating && (
                            <div className="flex items-center gap-1 text-[10px] text-[#7c644c]">
                                <Navigation className="w-3 h-3 animate-pulse" />
                                位置取得中
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Selected Spot Card */}
            {selectedSpot && (
                <div className="absolute bottom-4 left-4 right-4 z-20">
                    <div className="bg-white rounded-2xl shadow-xl border border-[#eadfd0] overflow-hidden">
                        <div className="flex gap-3 p-3">
                            {/* Image */}
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-[#f7efe5] to-[#eadfd0] shrink-0">
                                {selectedSpot.quest_cover ? (
                                    <img
                                        src={selectedSpot.quest_cover}
                                        alt={selectedSpot.quest_title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Target className="w-8 h-8 text-[#c27a34]/30" />
                                    </div>
                                )}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-bold text-[#2f1d0f] line-clamp-1">
                                            {selectedSpot.quest_title}
                                        </h3>
                                        <p className="text-[10px] text-[#7c644c] flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3 h-3" />
                                            {selectedSpot.name}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedSpot(null)}
                                        className="p-1 rounded-full hover:bg-[#f7efe5] transition-colors"
                                    >
                                        <X className="w-4 h-4 text-[#7c644c]" />
                                    </button>
                                </div>
                                <Button
                                    onClick={handleQuestDetail}
                                    className="w-full mt-2 h-9 bg-gradient-to-r from-[#ffb566] to-[#e67a28] text-white text-xs font-bold rounded-xl"
                                >
                                    詳細を見る
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapPage;
