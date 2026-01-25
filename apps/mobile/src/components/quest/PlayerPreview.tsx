import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import {
    MapPin,
    Clock,
    Star,
    Play,
    Edit3,
    Save,
    Footprints,
    Sparkles,
    ChevronRight,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Target,
    Zap,
    Navigation,
} from 'lucide-react';
import { PlayerPreviewOutput } from '@/lib/difyQuest';

// Types
interface SpotPreviewData {
    id: string;
    name: string;
    lat: number;
    lng: number;
    mapUrl?: string;
    isHighlight?: boolean;
    highlightDescription?: string;
}

interface BasicInfoPreview {
    title: string;
    description: string;
    area: string;
    difficulty: string;
    tags: string[];
    highlights?: string[];
    recommendedFor?: string[];
    coverImageUrl?: string;
}

interface StoryPreview {
    prologueBody: string;
    atmosphere?: string;
    whatToExpect?: string;
    mission?: string;
    clearCondition?: string;
    teaser?: string;
}

interface PlayerPreviewProps {
    basicInfo: BasicInfoPreview | null;
    spots: SpotPreviewData[];
    story: StoryPreview | null;
    estimatedDuration?: number;
    isGenerating?: boolean;
    generationPhase?: string;
    playerPreviewData?: PlayerPreviewOutput | null;
    routeMetadata?: {
        distanceKm?: number;
        walkingMinutes?: number;
        outdoorRatio?: number;
        startPoint?: string;
        endPoint?: string;
    };
    difficultyExplanation?: string;
    isGeneratingCover?: boolean;
    showActions?: boolean;
    onPlay: () => void;
    onEdit: () => void;
    onSaveDraft: () => void;
}

// Google Maps API Key
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Difficulty display helper
const getDifficultyStars = (difficulty: string): number => {
    switch (difficulty) {
        case '初級':
        case 'easy':
            return 1;
        case '中級':
        case 'medium':
            return 2;
        case '上級':
        case 'hard':
            return 3;
        default:
            return 2;
    }
};

const getDifficultyLabel = (difficulty: string): string => {
    switch (difficulty) {
        case 'easy':
            return '初級';
        case 'medium':
            return '中級';
        case 'hard':
            return '上級';
        default:
            return difficulty;
    }
};

export default function PlayerPreview({
    basicInfo,
    spots,
    story,
    estimatedDuration = 60,
    isGenerating = false,
    generationPhase = '',
    playerPreviewData,
    routeMetadata,
    difficultyExplanation,
    isGeneratingCover = false,
    showActions = true,
    onPlay,
    onEdit,
    onSaveDraft,
}: PlayerPreviewProps) {
    const [showAllSpots, setShowAllSpots] = React.useState(true);
    const [showDetailedExperience, setShowDetailedExperience] = React.useState(false);

    const difficultyStars = getDifficultyStars(basicInfo?.difficulty || 'medium');
    const difficultyLabel = getDifficultyLabel(basicInfo?.difficulty || 'medium');
    const difficultyStyle = {
        '初級': 'bg-emerald-100 text-emerald-700',
        '中級': 'bg-amber-100 text-amber-700',
        '上級': 'bg-rose-100 text-rose-700',
    }[difficultyLabel] || 'bg-stone-100 text-stone-700';

    // Calculate map center from spots
    const mapCenter = spots.length > 0
        ? {
            lat: spots.reduce((sum, s) => sum + s.lat, 0) / spots.length,
            lng: spots.reduce((sum, s) => sum + s.lng, 0) / spots.length,
        }
        : { lat: 35.6812, lng: 139.7671 }; // Default to Tokyo

    const getSpotMapUrl = (spot: SpotPreviewData) => {
        if (spot.mapUrl) return spot.mapUrl;
        const query = `${spot.lat},${spot.lng}`;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    };

    const MapBoundsController = ({ mapSpots }: { mapSpots: SpotPreviewData[] }) => {
        const map = useMap();

        React.useEffect(() => {
            if (!map || mapSpots.length === 0) return;
            const bounds = new google.maps.LatLngBounds();
            mapSpots.forEach((spot) => {
                bounds.extend({ lat: spot.lat, lng: spot.lng });
            });
            map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        }, [map, mapSpots]);

        return null;
    };

    const RoutePathRenderer = ({ mapSpots }: { mapSpots: SpotPreviewData[] }) => {
        const map = useMap();
        const rendererRef = React.useRef<google.maps.DirectionsRenderer | null>(null);
        const serviceRef = React.useRef<google.maps.DirectionsService | null>(null);

        React.useEffect(() => {
            if (!map || !window.google) return;
            if (!serviceRef.current) {
                serviceRef.current = new google.maps.DirectionsService();
            }
            if (!rendererRef.current) {
                rendererRef.current = new google.maps.DirectionsRenderer({
                    map,
                    suppressMarkers: true,
                    preserveViewport: true,
                    polylineOptions: {
                        strokeColor: "#e67a28",
                        strokeOpacity: 0.85,
                        strokeWeight: 4,
                    },
                });
            }
        }, [map]);

        React.useEffect(() => {
            const service = serviceRef.current;
            const renderer = rendererRef.current;
            if (!service || !renderer) return;
            if (mapSpots.length < 2) {
                renderer.setDirections({ routes: [] } as google.maps.DirectionsResult);
                return;
            }

            const origin = { lat: mapSpots[0].lat, lng: mapSpots[0].lng };
            const destination = {
                lat: mapSpots[mapSpots.length - 1].lat,
                lng: mapSpots[mapSpots.length - 1].lng,
            };
            const waypoints = mapSpots.slice(1, -1).map((spot) => ({
                location: { lat: spot.lat, lng: spot.lng },
                stopover: true,
            }));

            service.route(
                {
                    origin,
                    destination,
                    waypoints,
                    travelMode: google.maps.TravelMode.WALKING,
                },
                (result, status) => {
                    if (status === google.maps.DirectionsStatus.OK && result) {
                        renderer.setDirections(result);
                    } else {
                        console.warn("[PlayerPreview] route render failed:", status);
                    }
                }
            );
        }, [mapSpots]);

        React.useEffect(() => {
            return () => {
                if (rendererRef.current) {
                    rendererRef.current.setMap(null);
                    rendererRef.current = null;
                }
            };
        }, []);

        return null;
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
            {/* Hero Section - Match Quest Detail */}
            <div className="relative w-full aspect-[16/10] overflow-hidden bg-[#2f1d0f] text-white">
                {basicInfo?.coverImageUrl ? (
                    <img
                        src={basicInfo.coverImageUrl}
                        alt={basicInfo?.title || 'Quest cover'}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#f7efe5] to-[#eadfd0]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${difficultyStyle}`}>
                            {difficultyLabel}
                        </span>
                        {basicInfo?.area && (
                            <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-medium flex items-center gap-1">
                                <MapPin size={10} />
                                {basicInfo.area}
                            </span>
                        )}
                        {isGeneratingCover && (
                            <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-medium">
                                カバー画像生成中...
                            </span>
                        )}
                    </div>
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl font-black text-white drop-shadow-xl leading-tight mb-2 line-clamp-2"
                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
                    >
                        {basicInfo?.title || '新しいクエスト'}
                    </motion.h1>
                    <div className="flex items-center gap-3 text-white/80 text-xs">
                        <span className="flex items-center gap-1">
                            <Clock size={12} className="text-amber-300" />
                            約{estimatedDuration}分
                        </span>
                        <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {spots.length}箇所
                        </span>
                    </div>
                </div>
            </div>

            {/* PRIMARY CTA - Floating Card Effect */}
            {!isGenerating && showActions && (
                <div className="relative z-20 -mt-8 px-4 sm:px-6 max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="bg-white rounded-2xl shadow-xl p-2"
                    >
                        <button
                            onClick={onPlay}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold text-lg shadow-lg hover:shadow-orange-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <Play size={16} fill="currentColor" />
                            </span>
                            冒険を始める
                        </button>
                    </motion.div>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
                {/* Stats Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-1.5 sm:gap-2 mb-6 sm:mb-8"
                >
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-black/5 border border-stone-200 rounded-lg px-2.5 py-2 sm:px-3 sm:py-2.5 flex-1 min-w-0">
                        <Clock size={14} className="text-amber-400 shrink-0" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] sm:text-[10px] text-stone-500 leading-tight whitespace-nowrap">
                                所要時間
                            </span>
                            <span className="text-[12px] sm:text-sm font-bold text-stone-800 leading-tight whitespace-nowrap truncate">
                                約{estimatedDuration}分
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 bg-black/5 border border-stone-200 rounded-lg px-2.5 py-2 sm:px-3 sm:py-2.5 flex-1 min-w-0">
                        <Star size={14} className="text-amber-400 shrink-0" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] sm:text-[10px] text-stone-500 leading-tight whitespace-nowrap">
                                難易度
                            </span>
                            <div className="flex items-center gap-1 flex-nowrap">
                                <span className="text-[12px] sm:text-sm font-bold text-stone-800 leading-tight whitespace-nowrap">
                                    {difficultyLabel}
                                </span>
                                <span className="text-[9px] sm:text-[10px] text-amber-400 tracking-tighter whitespace-nowrap">
                                    {'★'.repeat(difficultyStars)}{'☆'.repeat(3 - difficultyStars)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 bg-black/5 border border-stone-200 rounded-lg px-2.5 py-2 sm:px-3 sm:py-2.5 flex-1 min-w-0">
                        <MapPin size={14} className="text-amber-400 shrink-0" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] sm:text-[10px] text-stone-500 leading-tight whitespace-nowrap">
                                スポット
                            </span>
                            <span className="text-[12px] sm:text-sm font-bold text-stone-800 leading-tight whitespace-nowrap truncate">
                                {spots.length}箇所
                            </span>
                        </div>
                    </div>
                </motion.div>
                {/* Generation Progress Banner */}
                {isGenerating && generationPhase && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-brand-gold/10 to-amber-50 border border-brand-gold/30 rounded-xl p-3 sm:p-4 mb-6 sm:mb-8"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-gold/20 flex items-center justify-center flex-shrink-0">
                                <Sparkles size={18} className="text-brand-gold animate-pulse" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[13px] sm:text-sm font-bold text-brand-dark mb-0.5">
                                    {generationPhase}
                                </p>
                                <p className="text-[11px] sm:text-xs text-stone-600">
                                    クエストの詳細を生成しています。しばらくお待ちください...
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Mission & Clear Condition */}
                {(story?.mission || story?.clearCondition) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-6 sm:mb-8"
                    >
                        <h2 className="text-base sm:text-lg font-bold text-brand-dark mb-3 flex items-center gap-2">
                            <Target size={18} className="text-brand-gold" />
                            あなたの使命
                        </h2>
                        <div className="bg-gradient-to-br from-violet-50 to-white rounded-xl border border-violet-200 p-4 sm:p-5 shadow-sm space-y-4">
                            {story.mission && (
                                <div>
                                    <h3 className="text-[11px] sm:text-xs font-bold text-violet-600 mb-1.5">ミッション</h3>
                                    <p className="text-[13px] sm:text-sm text-stone-700 leading-relaxed">{story.mission}</p>
                                </div>
                            )}
                            {story.clearCondition && (
                                <div className="pt-3 border-t border-violet-100">
                                    <h3 className="text-[11px] sm:text-xs font-bold text-violet-600 mb-1.5">クリア条件</h3>
                                    <p className="text-[13px] sm:text-sm text-stone-700 leading-relaxed">{story.clearCondition}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Teaser Card */}
                {story?.teaser && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="mb-6 sm:mb-8"
                    >
                        <div className="bg-gradient-to-br from-amber-50 via-white to-rose-50 rounded-xl border-2 border-amber-200 p-4 sm:p-6 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 rounded-full -translate-y-16 translate-x-16"></div>
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-3">
                                    <Zap size={18} className="text-amber-500" />
                                    <h3 className="text-[12px] sm:text-sm font-bold text-amber-700">この冒険の鍵</h3>
                                </div>
                                <p className="text-sm sm:text-base text-stone-800 leading-relaxed font-medium">
                                    {story.teaser}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Highlights Section */}
                {basicInfo?.highlights && basicInfo.highlights.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mb-6 sm:mb-8"
                    >
                        <h2 className="text-base sm:text-lg font-bold text-brand-dark mb-3 flex items-center gap-2">
                            <Sparkles size={18} className="text-brand-gold" />
                            このクエストの魅力
                        </h2>
                        <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-200 p-4 sm:p-5 shadow-sm">
                            <ul className="space-y-2 sm:space-y-3">
                                {basicInfo.highlights.map((highlight, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-brand-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Sparkles size={12} className="text-brand-gold" />
                                        </div>
                                        <p className="text-[13px] sm:text-sm text-stone-700 leading-relaxed flex-1">
                                            {highlight}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                )}

                {/* What to Expect */}
                {story?.whatToExpect && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="mb-6 sm:mb-8"
                    >
                        <h2 className="text-base sm:text-lg font-bold text-brand-dark mb-3 flex items-center gap-2">
                            <Play size={18} className="text-brand-gold" />
                            どんな体験ができる？
                        </h2>
                        <div className="bg-gradient-to-br from-stone-50 to-white rounded-xl border border-stone-200 p-4 sm:p-5 shadow-sm">
                            {/* 3-line summary */}
                            {!showDetailedExperience && (
                                <div className="space-y-2">
                                    <p className="text-[13px] sm:text-sm text-stone-700 leading-relaxed">
                                        街歩きしながら、{spots.length}つのスポットで謎を解き明かす
                                    </p>
                                    <p className="text-[13px] sm:text-sm text-stone-700 leading-relaxed">
                                        各スポットで1問、合計{spots.length}問の謎解き
                                    </p>
                                    <p className="text-[13px] sm:text-sm text-stone-700 leading-relaxed">
                                        最後に全ての手がかりを繋げて終幕へ
                                    </p>
                                    <button
                                        onClick={() => setShowDetailedExperience(true)}
                                        className="mt-3 flex items-center gap-1 text-[11px] sm:text-xs text-brand-gold hover:text-amber-600 font-medium transition-colors"
                                    >
                                        詳細を見る <ChevronDown size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Detailed experience */}
                            <AnimatePresence>
                                {showDetailedExperience && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                    >
                                        <p className="text-[13px] sm:text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                                            {story.whatToExpect}
                                        </p>
                                        {story.atmosphere && (
                                            <div className="mt-4 pt-4 border-t border-stone-100">
                                                <p className="text-[11px] sm:text-xs text-stone-500 font-medium mb-1">雰囲気</p>
                                                <p className="text-[13px] sm:text-sm text-stone-600">{story.atmosphere}</p>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setShowDetailedExperience(false)}
                                            className="mt-3 flex items-center gap-1 text-[11px] sm:text-xs text-brand-gold hover:text-amber-600 font-medium transition-colors"
                                        >
                                            閉じる <ChevronUp size={14} />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}

                {/* Introduction / Story */}
                {(story?.prologueBody || basicInfo?.description) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mb-6 sm:mb-8"
                    >
                        <h2 className="text-base sm:text-lg font-bold text-brand-dark mb-3 flex items-center gap-2">
                            <Footprints size={18} className="text-brand-gold" />
                            物語の始まり
                        </h2>
                        <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 shadow-sm">
                            <p className="text-[13px] sm:text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                                {story?.prologueBody || basicInfo?.description}
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Route Map with Metadata */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="mb-6 sm:mb-8"
                >
                    <h2 className="text-base sm:text-lg font-bold text-brand-dark mb-3 flex items-center gap-2">
                        <Navigation size={18} className="text-brand-gold" />
                        ルート情報
                    </h2>

                    {/* Route Metadata */}
                    {routeMetadata && (
                        <div className="bg-white rounded-xl border border-stone-200 p-3 sm:p-4 mb-3 shadow-sm">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
                                {routeMetadata.distanceKm && (
                                    <div>
                                        <p className="text-[11px] sm:text-xs text-stone-500 mb-0.5">移動距離</p>
                                        <p className="text-[13px] sm:text-sm font-bold text-brand-dark">
                                            約{routeMetadata.distanceKm}km
                                        </p>
                                    </div>
                                )}
                                {routeMetadata.walkingMinutes && (
                                    <div>
                                        <p className="text-[11px] sm:text-xs text-stone-500 mb-0.5">歩行時間</p>
                                        <p className="text-[13px] sm:text-sm font-bold text-brand-dark">
                                            約{routeMetadata.walkingMinutes}分
                                        </p>
                                    </div>
                                )}
                                {routeMetadata.outdoorRatio !== undefined && (
                                    <div>
                                        <p className="text-[11px] sm:text-xs text-stone-500 mb-0.5">屋外比率</p>
                                        <p className="text-[13px] sm:text-sm font-bold text-brand-dark">
                                            {Math.round(routeMetadata.outdoorRatio * 100)}%
                                        </p>
                                    </div>
                                )}
                                {routeMetadata.startPoint && (
                                    <div className="col-span-2 md:col-span-2">
                                        <p className="text-[11px] sm:text-xs text-stone-500 mb-0.5">開始地点</p>
                                        <p className="text-[13px] sm:text-sm font-medium text-stone-700">
                                            {routeMetadata.startPoint}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                        {MAPS_API_KEY ? (
                            <APIProvider apiKey={MAPS_API_KEY}>
                                <div className="h-52 sm:h-64 w-full">
                                    <Map
                                        defaultCenter={mapCenter}
                                        defaultZoom={14}
                                        mapId="player-preview-map"
                                        disableDefaultUI={true}
                                        gestureHandling="cooperative"
                                    >
                                        <MapBoundsController mapSpots={spots} />
                                        <RoutePathRenderer mapSpots={spots} />
                                        {spots.map((spot, idx) => (
                                            <AdvancedMarker
                                                key={spot.id}
                                                position={{ lat: spot.lat, lng: spot.lng }}
                                            >
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-gold text-white font-bold text-sm shadow-lg">
                                                    {idx + 1}
                                                </div>
                                            </AdvancedMarker>
                                        ))}
                                    </Map>
                                </div>
                            </APIProvider>
                        ) : (
                            <div className="h-52 sm:h-64 w-full bg-stone-100 flex items-center justify-center text-stone-500 text-[12px] sm:text-sm">
                                地図を読み込み中...
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Spot List - Collapsible */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 }}
                    className="mb-6 sm:mb-8"
                >
                    <button
                        onClick={() => setShowAllSpots(!showAllSpots)}
                        className="w-full flex items-center justify-between text-left mb-2 sm:mb-3"
                    >
                        <h2 className="text-base sm:text-lg font-bold text-brand-dark flex items-center gap-2">
                            <MapPin size={18} className="text-brand-gold" />
                            全スポット一覧（{spots.length}箇所）
                        </h2>
                        {showAllSpots ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    <AnimatePresence>
                        {showAllSpots && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100 shadow-sm overflow-hidden">
                                    {spots.map((spot, idx) => (
                                        <div
                                            key={spot.id}
                                            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-stone-50 transition-colors"
                                        >
                                            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-gold/10 text-brand-gold font-bold text-[12px] sm:text-sm flex-shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] sm:text-sm font-medium text-brand-dark truncate">
                                                    {spot.name}
                                                </p>
                                            </div>
                                            <a
                                                href={getSpotMapUrl(spot)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[11px] sm:text-xs font-bold text-brand-gold border border-brand-gold/30 px-2.5 py-1 rounded-full hover:bg-brand-gold/10 transition-colors flex-shrink-0"
                                            >
                                                Google Mapで見る
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Practical Info Card - Clean Look */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                    className="mb-8 sm:mb-10"
                >
                    <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
                        <h2 className="text-base font-bold text-stone-800 mb-4 flex items-center gap-2">
                            <div className="w-1 h-5 bg-amber-400 rounded-full"></div>
                            準備と注意事項
                        </h2>

                        <div className="grid sm:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">持ち物</h3>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-sm text-stone-700 bg-stone-50 p-2 rounded-lg">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></div>
                                        スマートフォン（充電済み）
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-stone-700 bg-stone-50 p-2 rounded-lg">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></div>
                                        歩きやすい靴
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">注意事項</h3>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-sm text-stone-700">
                                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                                        天候により体験内容が変わる場合があります
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-stone-700">
                                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                                        交通ルールを守り、周囲に注意して進んでください
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Publishing Note */}
                {!isGenerating && showActions && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-6 sm:mb-8"
                    >
                        <p className="text-[12px] sm:text-sm text-blue-800 leading-relaxed">
                            💡 <strong>テストプレイ後に、内容を確認してから一般公開できます。</strong>
                            編集画面では謎や答えが表示されます（ネタバレ注意）。
                        </p>
                    </motion.div>
                )}

                {/* CTA Buttons */}
                {showActions && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.85 }}
                        className="space-y-2.5 sm:space-y-3"
                    >
                        {/* Primary: Play */}
                        <button
                            onClick={onPlay}
                            className="w-full py-3.5 px-4 sm:py-4 sm:px-6 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-white font-bold text-base sm:text-lg shadow-lg shadow-brand-gold/25 hover:shadow-xl hover:shadow-brand-gold/30 transition-all flex items-center justify-center gap-2 sm:gap-3"
                        >
                            <Play size={22} fill="currentColor" />
                            プレイヤーとして挑戦する
                        </button>

                        {/* Secondary: Edit */}
                        <button
                            onClick={onEdit}
                            className="w-full py-3 px-4 sm:px-6 rounded-xl bg-white border-2 border-stone-200 text-stone-700 font-bold text-[13px] sm:text-sm hover:border-stone-300 hover:bg-stone-50 transition-all flex items-center justify-center gap-2"
                        >
                            <Edit3 size={16} />
                            クリエイターとして編集する
                            <span className="text-[11px] sm:text-xs text-rose-500 ml-1">（ネタバレ）</span>
                        </button>

                        {/* Tertiary: Save Draft */}
                        <button
                            onClick={onSaveDraft}
                            className="w-full py-3 px-4 sm:px-6 rounded-xl text-stone-500 font-medium text-[12px] sm:text-sm hover:text-stone-700 hover:bg-stone-100 transition-all flex items-center justify-center gap-2"
                        >
                            <Save size={14} />
                            あとで決める（マイ下書きに保存）
                        </button>
                    </motion.div>
                )}

                {/* Bottom Spacing */}
                <div className="h-8" />
            </div>
        </div>
    );
}
