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
    Users,
    User,
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

interface CharacterPreview {
    id: string;
    name: string;
    role: string;
    personality: string;
    image_url?: string;
}

interface PlayerPreviewProps {
    basicInfo: BasicInfoPreview | null;
    spots: SpotPreviewData[];
    story: StoryPreview | null;
    characters?: CharacterPreview[];
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
    characters = [],
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
        <div className="w-full font-serif text-[#3D2E1F]">
            {/* Hero Section - Match Quest Detail */}
            <div className="relative w-full aspect-[16/10] overflow-hidden bg-[#2f1d0f] text-white">
                {basicInfo?.coverImageUrl ? (
                    <img
                        src={basicInfo.coverImageUrl}
                        alt={basicInfo?.title || 'Quest cover'}
                        className="w-full h-full object-cover opacity-90"
                    />
                ) : (
                    <div className="w-full h-full bg-[#E8D5BE]" />
                )}
                {/* Vignette & Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#3D2E1F] via-transparent to-transparent opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent opacity-40" />

                <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-sm border border-white/20 backdrop-blur-md ${difficultyStyle}`}>
                            {difficultyLabel}
                        </span>
                        {basicInfo?.area && (
                            <span className="px-3 py-1 rounded-full bg-[#3D2E1F]/60 backdrop-blur-md text-[#FEF9F3] text-[10px] font-bold tracking-wide flex items-center gap-1 border border-[#FEF9F3]/20">
                                <MapPin size={10} />
                                {basicInfo.area}
                            </span>
                        )}
                        {isGeneratingCover && (
                            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold tracking-widest animate-pulse border border-white/20">
                                画像生成中...
                            </span>
                        )}
                    </div>
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl sm:text-3xl font-bold text-[#FEF9F3] leading-tight mb-2 line-clamp-2 tracking-wide"
                        style={{ textShadow: '0 2px 10px rgba(61,46,31,0.5)' }}
                    >
                        {basicInfo?.title || '新しいクエスト'}
                    </motion.h1>
                    <div className="flex items-center gap-4 text-[#FEF9F3]/90 text-xs font-medium tracking-wider">
                        <span className="flex items-center gap-1.5">
                            <Clock size={14} className="text-[#D87A32]" />
                            約{estimatedDuration}分
                        </span>
                        <span className="flex items-center gap-1.5">
                            <MapPin size={14} className="text-[#D87A32]" />
                            {spots.length}スポット
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
                        className="bg-white/80 backdrop-blur rounded-2xl shadow-[0_4px_20px_rgba(61,46,31,0.1)] p-2 border border-[#E8D5BE]"
                    >
                        <button
                            onClick={onPlay}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D87A32] to-[#B85A1F] text-white font-bold text-lg shadow-lg hover:shadow-[#D87A32]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 tracking-widest"
                        >
                            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
                                <Play size={16} fill="currentColor" />
                            </span>
                            冒険を始める
                        </button>
                    </motion.div>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
                {/* Stats Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 mb-8"
                >
                    <div className="flex flex-col items-center justify-center bg-white/50 border border-[#E8D5BE] rounded-xl py-4 flex-1 min-w-0 shadow-sm">
                        <Clock size={18} className="text-[#D87A32] mb-1.5" />
                        <span className="text-[10px] text-[#7A6652] tracking-widest font-bold uppercase mb-0.5">所要時間</span>
                        <span className="text-sm font-bold text-[#3D2E1F]">{estimatedDuration}分</span>
                    </div>

                    <div className="flex flex-col items-center justify-center bg-white/50 border border-[#E8D5BE] rounded-xl py-4 flex-1 min-w-0 shadow-sm">
                        <Star size={18} className="text-[#D87A32] mb-1.5" />
                        <span className="text-[10px] text-[#7A6652] tracking-widest font-bold uppercase mb-0.5">難易度</span>
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-[#3D2E1F]">{difficultyLabel}</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center bg-white/50 border border-[#E8D5BE] rounded-xl py-4 flex-1 min-w-0 shadow-sm">
                        <MapPin size={18} className="text-[#D87A32] mb-1.5" />
                        <span className="text-[10px] text-[#7A6652] tracking-widest font-bold uppercase mb-0.5">スポット数</span>
                        <span className="text-sm font-bold text-[#3D2E1F]">{spots.length}箇所</span>
                    </div>
                </motion.div>

                {/* Generation Progress Banner */}
                {isGenerating && generationPhase && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#FEF9F3] border border-[#D87A32]/30 rounded-xl p-4 mb-8 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#D87A32]" />
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#E8D5BE] flex items-center justify-center flex-shrink-0 animate-pulse">
                                <Sparkles size={18} className="text-[#D87A32]" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-[#3D2E1F] mb-0.5 tracking-wide">
                                    {generationPhase}
                                </p>
                                <p className="text-xs text-[#7A6652]">
                                    物語を紡いでいます...
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Clear Condition (Mission) */}
                {(story?.mission || story?.clearCondition) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-8"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Target size={18} className="text-[#D87A32]" />
                            <h2 className="text-base font-bold text-[#3D2E1F] tracking-widest">目標</h2>
                        </div>
                        <div className="bg-white/60 rounded-xl border border-[#E8D5BE] p-6 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-[#E8D5BE]/20 rounded-bl-full -mr-4 -mt-4 pointer-events-none" />
                            {story.mission && (
                                <div className="mb-4">
                                    <h3 className="text-[10px] font-bold text-[#7A6652] tracking-widest uppercase mb-2">指令</h3>
                                    <p className="text-sm text-[#3D2E1F] leading-relaxed font-medium">{story.mission}</p>
                                </div>
                            )}
                            {story.clearCondition && (
                                <div className={`${story.mission ? 'pt-4 border-t border-[#E8D5BE]/50' : ''}`}>
                                    <h3 className="text-[10px] font-bold text-[#7A6652] tracking-widest uppercase mb-2">クリア条件</h3>
                                    <p className="text-sm text-[#3D2E1F] leading-relaxed font-medium">{story.clearCondition}</p>
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
                        className="mb-8"
                    >
                        <div className="bg-gradient-to-br from-[#FEF9F3] via-white to-[#E8D5BE]/20 rounded-xl border border-[#E8D5BE] p-6 shadow-md relative overflow-hidden group">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#D87A32]/10 rounded-full blur-xl group-hover:bg-[#D87A32]/20 transition-all duration-500" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3">
                                    <Zap size={16} className="text-[#D87A32]" />
                                    <h3 className="text-xs font-bold text-[#7A6652] tracking-widest uppercase">冒険の鍵</h3>
                                </div>
                                <p className="text-sm sm:text-base text-[#3D2E1F] leading-loose font-serif italic">
                                    "{story.teaser}"
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
                        className="mb-8"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles size={18} className="text-[#D87A32]" />
                            <h2 className="text-base font-bold text-[#3D2E1F] tracking-widest">見どころ</h2>
                        </div>
                        <div className="bg-white/60 rounded-xl border border-[#E8D5BE] p-5 shadow-sm">
                            <ul className="space-y-4">
                                {basicInfo.highlights.map((highlight, idx) => (
                                    <li key={idx} className="flex items-start gap-4">
                                        <div className="w-6 h-6 rounded-full bg-[#FEF9F3] border border-[#E8D5BE] flex items-center justify-center flex-shrink-0 mt-0.5 text-[#D87A32] font-bold text-xs">
                                            {idx + 1}
                                        </div>
                                        <p className="text-sm text-[#3D2E1F] leading-relaxed pt-0.5">
                                            {highlight}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                )}

                {/* Characters Section */}
                {characters && characters.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.42 }}
                        className="mb-8"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Users size={18} className="text-[#D87A32]" />
                            <h2 className="text-base font-bold text-[#3D2E1F] tracking-widest">登場人物</h2>
                        </div>
                        <div className="bg-white/60 rounded-xl border border-[#E8D5BE] p-5 shadow-sm">
                            <div className="grid gap-4">
                                {characters.map((char) => (
                                    <div key={char.id} className="flex items-start gap-4 p-3 bg-[#FEF9F3] rounded-lg border border-[#E8D5BE]/50">
                                        {/* Character Avatar */}
                                        <div className="flex-shrink-0">
                                            {char.image_url ? (
                                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#D87A32] shadow-md">
                                                    <img
                                                        src={char.image_url}
                                                        alt={char.name}
                                                        className="w-full h-full object-cover object-top"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E8D5BE] to-[#D87A32]/30 flex items-center justify-center border-2 border-[#D87A32]/50">
                                                    <User size={24} className="text-[#7A6652]" />
                                                </div>
                                            )}
                                        </div>
                                        {/* Character Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-sm font-bold text-[#3D2E1F]">{char.name}</h3>
                                                <span className="px-2 py-0.5 bg-[#D87A32]/10 text-[#D87A32] text-[10px] font-bold rounded-full tracking-wide">
                                                    {char.role}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[#7A6652] leading-relaxed line-clamp-2">
                                                {char.personality}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* What to Expect */}
                {story?.whatToExpect && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="mb-8"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Play size={18} className="text-[#D87A32]" />
                            <h2 className="text-base font-bold text-[#3D2E1F] tracking-widest">体験内容</h2>
                        </div>
                        <div className="bg-white/60 rounded-xl border border-[#E8D5BE] p-5 shadow-sm">
                            {!showDetailedExperience && (
                                <div>
                                    <p className="text-sm text-[#3D2E1F] leading-relaxed line-clamp-3 whitespace-pre-wrap">
                                        {story.whatToExpect}
                                    </p>
                                    <button
                                        onClick={() => setShowDetailedExperience(true)}
                                        className="mt-2 flex items-center gap-1 text-xs text-[#D87A32] font-bold tracking-wide hover:underline"
                                    >
                                        詳細を見る <ChevronDown size={14} />
                                    </button>
                                </div>
                            )}

                            <AnimatePresence>
                                {showDetailedExperience && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                    >
                                        <p className="text-sm text-[#3D2E1F] leading-relaxed whitespace-pre-wrap">
                                            {story.whatToExpect}
                                        </p>
                                        {story.atmosphere && (
                                            <div className="mt-4 pt-4 border-t border-[#E8D5BE]/50">
                                                <p className="text-[10px] text-[#7A6652] font-bold uppercase mb-1">雰囲気</p>
                                                <p className="text-sm text-[#3D2E1F]">{story.atmosphere}</p>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setShowDetailedExperience(false)}
                                            className="mt-3 flex items-center gap-1 text-xs text-[#D87A32] font-bold tracking-wide hover:underline"
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
                        className="mb-8"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Footprints size={18} className="text-[#D87A32]" />
                            <h2 className="text-base font-bold text-[#3D2E1F] tracking-widest">物語の始まり</h2>
                        </div>
                        <div className="bg-white rounded-xl border border-[#E8D5BE] p-6 shadow-sm">
                            <p className="text-sm sm:text-base text-[#3D2E1F] leading-loose font-serif whitespace-pre-wrap">
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
                    className="mb-8"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Navigation size={18} className="text-[#D87A32]" />
                        <h2 className="text-base font-bold text-[#3D2E1F] tracking-widest">ルートマップ</h2>
                    </div>

                    {/* Route Metadata */}
                    {routeMetadata && (
                        <div className="bg-white/60 rounded-xl border border-[#E8D5BE] p-4 mb-4 shadow-sm">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {routeMetadata.distanceKm && (
                                    <div>
                                        <p className="text-[10px] text-[#7A6652] font-bold uppercase mb-0.5">距離</p>
                                        <p className="text-sm font-bold text-[#3D2E1F]">
                                            約{routeMetadata.distanceKm}km
                                        </p>
                                    </div>
                                )}
                                {routeMetadata.walkingMinutes && (
                                    <div>
                                        <p className="text-[10px] text-[#7A6652] font-bold uppercase mb-0.5">歩行時間</p>
                                        <p className="text-sm font-bold text-[#3D2E1F]">
                                            約{routeMetadata.walkingMinutes}分
                                        </p>
                                    </div>
                                )}
                                {routeMetadata.outdoorRatio !== undefined && (
                                    <div>
                                        <p className="text-[10px] text-[#7A6652] font-bold uppercase mb-0.5">屋外比率</p>
                                        <p className="text-sm font-bold text-[#3D2E1F]">
                                            {Math.round(routeMetadata.outdoorRatio * 100)}%
                                        </p>
                                    </div>
                                )}
                                {routeMetadata.startPoint && (
                                    <div className="col-span-2 md:col-span-2">
                                        <p className="text-[10px] text-[#7A6652] font-bold uppercase mb-0.5">開始地点</p>
                                        <p className="text-sm font-medium text-[#3D2E1F] truncate">
                                            {routeMetadata.startPoint}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl border border-[#E8D5BE] overflow-hidden shadow-sm relative z-0">
                        <div className="absolute inset-0 pointer-events-none border-[3px] border-[#E8D5BE]/20 rounded-xl z-20" />
                        {MAPS_API_KEY ? (
                            <APIProvider apiKey={MAPS_API_KEY}>
                                <div className="h-56 sm:h-72 w-full grayscale-[0.2] sepia-[0.1]">
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
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#D87A32] text-white font-bold text-sm shadow-lg border-2 border-white">
                                                    {idx + 1}
                                                </div>
                                            </AdvancedMarker>
                                        ))}
                                    </Map>
                                </div>
                            </APIProvider>
                        ) : (
                            <div className="h-56 sm:h-72 w-full bg-[#E8D5BE]/20 flex items-center justify-center text-[#7A6652] text-sm">
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
                    className="mb-8"
                >
                    <button
                        onClick={() => setShowAllSpots(!showAllSpots)}
                        className="w-full flex items-center justify-between text-left mb-3 group"
                    >
                        <div className="flex items-center gap-2">
                            <MapPin size={18} className="text-[#D87A32]" />
                            <h2 className="text-base font-bold text-[#3D2E1F] tracking-widest group-hover:text-[#D87A32] transition-colors">スポット一覧 ({spots.length})</h2>
                        </div>
                        {showAllSpots ? <ChevronUp size={20} className="text-[#7A6652]" /> : <ChevronDown size={20} className="text-[#7A6652]" />}
                    </button>

                    <AnimatePresence>
                        {showAllSpots && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-white/60 rounded-xl border border-[#E8D5BE] divide-y divide-[#E8D5BE]/50 shadow-sm overflow-hidden">
                                    {spots.map((spot, idx) => (
                                        <div
                                            key={spot.id}
                                            className="flex items-center gap-3 sm:gap-4 p-4 hover:bg-[#FEF9F3] transition-colors"
                                        >
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FEF9F3] border border-[#E8D5BE] text-[#D87A32] font-bold text-xs flex-shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-[#3D2E1F] truncate">
                                                    {spot.name}
                                                </p>
                                            </div>
                                            <a
                                                href={getSpotMapUrl(spot)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] font-bold text-[#7A6652] border border-[#E8D5BE] px-3 py-1.5 rounded-full hover:bg-[#D87A32] hover:text-white hover:border-[#D87A32] transition-all flex-shrink-0 tracking-wide"
                                            >
                                                地図を見る
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Practical Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                    className="mb-10"
                >
                    <div className="bg-white rounded-2xl border border-[#E8D5BE] p-6 shadow-sm">
                        <h2 className="text-base font-bold text-[#3D2E1F] mb-6 flex items-center gap-2 tracking-widest">
                            <div className="w-1 h-5 bg-[#D87A32] rounded-full"></div>
                            注意事項
                        </h2>

                        <div className="grid sm:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-[10px] font-bold text-[#7A6652] uppercase tracking-wider mb-3">持ち物</h3>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-3 text-sm text-[#3D2E1F] bg-[#FEF9F3] p-3 rounded-lg border border-[#E8D5BE]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#D87A32] shrink-0"></div>
                                        スマートフォン（充電済み）
                                    </li>
                                    <li className="flex items-center gap-3 text-sm text-[#3D2E1F] bg-[#FEF9F3] p-3 rounded-lg border border-[#E8D5BE]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#D87A32] shrink-0"></div>
                                        歩きやすい靴
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-[10px] font-bold text-[#7A6652] uppercase tracking-wider mb-3">注意点</h3>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-2 text-sm text-[#3D2E1F]">
                                        <AlertTriangle size={14} className="text-[#D87A32] shrink-0 mt-0.5" />
                                        <span>天候により体験内容が変わる場合があります</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm text-[#3D2E1F]">
                                        <AlertTriangle size={14} className="text-[#D87A32] shrink-0 mt-0.5" />
                                        <span>交通ルールを守り、周囲に注意して進んでください</span>
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
                        className="bg-[#FEF9F3] border border-[#E8D5BE] rounded-xl p-4 mb-8"
                    >
                        <p className="text-xs text-[#7A6652] leading-relaxed">
                            💡 <strong>テストプレイ後に、内容を確認してから一般公開できます。</strong>
                            編集画面では謎や答えが表示されます（ネタバレ注意）。
                        </p>
                    </motion.div>
                )}

                {/* CTA Buttons - Only shown if enabled */}
                {showActions && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.85 }}
                        className="space-y-3"
                    >
                        {/* Primary: Play */}
                        <button
                            onClick={onPlay}
                            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#D87A32] to-[#B85A1F] text-white font-bold text-lg shadow-lg shadow-[#D87A32]/25 hover:shadow-xl hover:shadow-[#D87A32]/30 transition-all flex items-center justify-center gap-3 tracking-widest"
                        >
                            <Play size={22} fill="currentColor" />
                            プレイヤーとして挑戦する
                        </button>
                        {/* Secondary & Tertiary buttons... */}
                    </motion.div>
                )}

                <div className="h-8" />
            </div>
        </div>
    );
}
