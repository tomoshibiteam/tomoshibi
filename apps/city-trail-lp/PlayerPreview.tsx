import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import {
    MapPin,
    Clock,
    Star,
    Play,
    Edit3,
    Save,
    Footprints,
    Users,
    Globe,
    Sparkles,
    ChevronRight,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Target,
    Zap,
    Navigation,
} from 'lucide-react';
import { PlayerPreviewOutput } from './lib/puzzle-pipeline/layton-types';

// Types
interface SpotPreviewData {
    id: string;
    name: string;
    lat: number;
    lng: number;
    isHighlight?: boolean;
    highlightDescription?: string;
}

interface BasicInfoPreview {
    title: string;
    description: string;
    area: string;
    difficulty: string;
    tags: string[];
    highlights?: string[]; // Key selling points (3-5 items)
    recommendedFor?: string[]; // Target audience/scenes
}

interface StoryPreview {
    prologueBody: string;
    atmosphere?: string; // Overall mood/vibe
    whatToExpect?: string; // Detailed experience description
    mission?: string; // What the player aims to accomplish
    clearCondition?: string; // How to complete the quest
    teaser?: string; // Spoiler-free exciting hint
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
    onPlay,
    onEdit,
    onSaveDraft,
}: PlayerPreviewProps) {
    const [showAllSpots, setShowAllSpots] = React.useState(false);
    const [showDetailedExperience, setShowDetailedExperience] = React.useState(false);

    const difficultyStars = getDifficultyStars(basicInfo?.difficulty || 'medium');
    const difficultyLabel = getDifficultyLabel(basicInfo?.difficulty || 'medium');

    // Calculate map center from spots
    const mapCenter = spots.length > 0
        ? {
            lat: spots.reduce((sum, s) => sum + s.lat, 0) / spots.length,
            lng: spots.reduce((sum, s) => sum + s.lng, 0) / spots.length,
        }
        : { lat: 35.6812, lng: 139.7671 }; // Default to Tokyo

    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
            {/* Hero Section */}
            <div className="relative bg-gradient-to-br from-brand-dark via-stone-800 to-stone-900 text-white overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 z-0">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }} />
                </div>

                <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-16">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 mb-4"
                    >
                        <span className="px-3 py-1 rounded-full bg-brand-gold/20 text-brand-gold text-xs font-bold flex items-center gap-1.5">
                            <Sparkles size={12} />
                            AIが生成したクエスト
                        </span>
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-4xl font-bold mb-4 font-serif"
                    >
                        {basicInfo?.title || '新しいクエスト'}
                    </motion.h1>

                    {/* Tags */}
                    {basicInfo?.tags && basicInfo.tags.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.15 }}
                            className="flex flex-wrap gap-2 mb-6"
                        >
                            {basicInfo.tags.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium"
                                >
                                    {tag}
                                </span>
                            ))}
                        </motion.div>
                    )}

                    {/* Stats Grid with Difficulty Explanation */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 text-brand-gold mb-1">
                                    <Clock size={16} />
                                    <span className="text-xs font-medium text-white/60">所要時間</span>
                                </div>
                                <p className="text-xl font-bold">約{estimatedDuration}分</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 text-brand-gold mb-1">
                                    <Star size={16} />
                                    <span className="text-xs font-medium text-white/60">難易度</span>
                                </div>
                                <p className="text-xl font-bold flex items-center gap-1">
                                    {difficultyLabel}
                                    <span className="text-brand-gold ml-1">
                                        {'★'.repeat(difficultyStars)}{'☆'.repeat(3 - difficultyStars)}
                                    </span>
                                </p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 text-brand-gold mb-1">
                                    <MapPin size={16} />
                                    <span className="text-xs font-medium text-white/60">スポット数</span>
                                </div>
                                <p className="text-xl font-bold">{spots.length}箇所</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 text-brand-gold mb-1">
                                    <Users size={16} />
                                    <span className="text-xs font-medium text-white/60">推奨人数</span>
                                </div>
                                <p className="text-xl font-bold">1〜4人</p>
                            </div>
                        </div>

                        {/* Difficulty Explanation - NEW */}
                        {difficultyExplanation && (
                            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                                <p className="text-xs text-white/80">{difficultyExplanation}</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* PRIMARY CTA - Immediately after hero (IMPROVEMENT #1) */}
            {!isGenerating && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="max-w-4xl mx-auto px-6 -mt-6 relative z-10"
                >
                    <button
                        onClick={onPlay}
                        className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-white font-bold text-lg shadow-xl shadow-brand-gold/25 hover:shadow-2xl hover:shadow-brand-gold/30 transition-all flex items-center justify-center gap-3"
                    >
                        <Play size={24} fill="currentColor" />
                        プレイヤーとして挑戦する
                    </button>
                </motion.div>
            )}

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Generation Progress Banner */}
                {isGenerating && generationPhase && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-brand-gold/10 to-amber-50 border border-brand-gold/30 rounded-xl p-4 mb-8"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-gold/20 flex items-center justify-center flex-shrink-0">
                                <Sparkles size={20} className="text-brand-gold animate-pulse" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-brand-dark mb-0.5">
                                    {generationPhase}
                                </p>
                                <p className="text-xs text-stone-600">
                                    クエストの詳細を生成しています。しばらくお待ちください...
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Mission & Clear Condition (IMPROVEMENT #3) */}
                {(story?.mission || story?.clearCondition) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-8"
                    >
                        <h2 className="text-lg font-bold text-brand-dark mb-3 flex items-center gap-2">
                            <Target size={18} className="text-brand-gold" />
                            あなたの使命
                        </h2>
                        <div className="bg-gradient-to-br from-violet-50 to-white rounded-xl border border-violet-200 p-5 shadow-sm space-y-4">
                            {story.mission && (
                                <div>
                                    <h3 className="text-xs font-bold text-violet-600 mb-1.5">ミッション</h3>
                                    <p className="text-sm text-stone-700 leading-relaxed">{story.mission}</p>
                                </div>
                            )}
                            {story.clearCondition && (
                                <div className="pt-3 border-t border-violet-100">
                                    <h3 className="text-xs font-bold text-violet-600 mb-1.5">クリア条件</h3>
                                    <p className="text-sm text-stone-700 leading-relaxed">{story.clearCondition}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Teaser Card (IMPROVEMENT #4) */}
                {story?.teaser && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="mb-8"
                    >
                        <div className="bg-gradient-to-br from-amber-50 via-white to-rose-50 rounded-xl border-2 border-amber-200 p-6 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 rounded-full -translate-y-16 translate-x-16"></div>
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-3">
                                    <Zap size={18} className="text-amber-500" />
                                    <h3 className="text-sm font-bold text-amber-700">この冒険の鍵</h3>
                                </div>
                                <p className="text-base text-stone-800 leading-relaxed font-medium">
                                    {story.teaser}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Highlights Section - Improved (IMPROVEMENT #2) */}
                {basicInfo?.highlights && basicInfo.highlights.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mb-8"
                    >
                        <h2 className="text-lg font-bold text-brand-dark mb-3 flex items-center gap-2">
                            <Sparkles size={18} className="text-brand-gold" />
                            このクエストの魅力
                        </h2>
                        <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-200 p-5 shadow-sm">
                            <ul className="space-y-3">
                                {basicInfo.highlights.map((highlight, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-brand-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Sparkles size={14} className="text-brand-gold" />
                                        </div>
                                        <p className="text-sm text-stone-700 leading-relaxed flex-1">
                                            {highlight}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                )}

                {/* What to Expect - 3-line Summary (IMPROVEMENT #8) */}
                {story?.whatToExpect && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="mb-8"
                    >
                        <h2 className="text-lg font-bold text-brand-dark mb-3 flex items-center gap-2">
                            <Play size={18} className="text-brand-gold" />
                            どんな体験ができる？
                        </h2>
                        <div className="bg-gradient-to-br from-stone-50 to-white rounded-xl border border-stone-200 p-5 shadow-sm">
                            {/* 3-line summary */}
                            {!showDetailedExperience && (
                                <div className="space-y-2">
                                    <p className="text-sm text-stone-700 leading-relaxed">
                                        街歩きしながら、{spots.length}つのスポットで謎を解き明かす
                                    </p>
                                    <p className="text-sm text-stone-700 leading-relaxed">
                                        各スポットで1問、合計{spots.length}問の謎解き
                                    </p>
                                    <p className="text-sm text-stone-700 leading-relaxed">
                                        最後に全ての手がかりを繋げて終幕へ
                                    </p>
                                    <button
                                        onClick={() => setShowDetailedExperience(true)}
                                        className="mt-3 flex items-center gap-1 text-xs text-brand-gold hover:text-amber-600 font-medium transition-colors"
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
                                        <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                                            {story.whatToExpect}
                                        </p>
                                        {story.atmosphere && (
                                            <div className="mt-4 pt-4 border-t border-stone-100">
                                                <p className="text-xs text-stone-500 font-medium mb-1">雰囲気</p>
                                                <p className="text-sm text-stone-600">{story.atmosphere}</p>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setShowDetailedExperience(false)}
                                            className="mt-3 flex items-center gap-1 text-xs text-brand-gold hover:text-amber-600 font-medium transition-colors"
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
                        <h2 className="text-lg font-bold text-brand-dark mb-3 flex items-center gap-2">
                            <Footprints size={18} className="text-brand-gold" />
                            物語の始まり
                        </h2>
                        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
                            <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                                {story?.prologueBody || basicInfo?.description}
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Route Map with Metadata (IMPROVEMENT #5) */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="mb-8"
                >
                    <h2 className="text-lg font-bold text-brand-dark mb-3 flex items-center gap-2">
                        <Navigation size={18} className="text-brand-gold" />
                        ルート情報
                    </h2>

                    {/* Route Metadata - NEW */}
                    {routeMetadata && (
                        <div className="bg-white rounded-xl border border-stone-200 p-4 mb-3 shadow-sm">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {routeMetadata.distanceKm && (
                                    <div>
                                        <p className="text-xs text-stone-500 mb-0.5">移動距離</p>
                                        <p className="text-sm font-bold text-brand-dark">約{routeMetadata.distanceKm}km</p>
                                    </div>
                                )}
                                {routeMetadata.walkingMinutes && (
                                    <div>
                                        <p className="text-xs text-stone-500 mb-0.5">歩行時間</p>
                                        <p className="text-sm font-bold text-brand-dark">約{routeMetadata.walkingMinutes}分</p>
                                    </div>
                                )}
                                {routeMetadata.outdoorRatio !== undefined && (
                                    <div>
                                        <p className="text-xs text-stone-500 mb-0.5">屋外比率</p>
                                        <p className="text-sm font-bold text-brand-dark">{Math.round(routeMetadata.outdoorRatio * 100)}%</p>
                                    </div>
                                )}
                                {routeMetadata.startPoint && (
                                    <div className="col-span-2 md:col-span-2">
                                        <p className="text-xs text-stone-500 mb-0.5">開始地点</p>
                                        <p className="text-sm font-medium text-stone-700">{routeMetadata.startPoint}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                        {MAPS_API_KEY ? (
                            <APIProvider apiKey={MAPS_API_KEY}>
                                <div className="h-64 w-full">
                                    <Map
                                        defaultCenter={mapCenter}
                                        defaultZoom={14}
                                        mapId="player-preview-map"
                                        disableDefaultUI={true}
                                        gestureHandling="cooperative"
                                    >
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
                            <div className="h-64 w-full bg-stone-100 flex items-center justify-center text-stone-500 text-sm">
                                地図を読み込み中...
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Spot Highlights - Unique & Visual (IMPROVEMENT #6) */}
                {spots.some(s => s.isHighlight && s.highlightDescription) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mb-8"
                    >
                        <h2 className="text-lg font-bold text-brand-dark mb-3 flex items-center gap-2">
                            <Star size={18} className="text-brand-gold" />
                            注目スポット
                        </h2>
                        <div className="grid gap-4">
                            {spots
                                .filter(s => s.isHighlight && s.highlightDescription)
                                .map((spot, idx) => (
                                    <div
                                        key={spot.id}
                                        className="bg-white rounded-xl border-2 border-amber-100 p-4 shadow-sm hover:border-brand-gold/50 transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-gold to-amber-500 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-md">
                                                {spots.indexOf(spot) + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-brand-dark mb-1.5 text-base">
                                                    {spot.name}
                                                </h3>
                                                <p className="text-sm text-stone-600 leading-relaxed">
                                                    {spot.highlightDescription}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </motion.div>
                )}

                {/* Spot List - Collapsible (IMPROVEMENT #6) */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 }}
                    className="mb-8"
                >
                    <button
                        onClick={() => setShowAllSpots(!showAllSpots)}
                        className="w-full flex items-center justify-between text-left mb-3"
                    >
                        <h2 className="text-lg font-bold text-brand-dark flex items-center gap-2">
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
                                            className="flex items-center gap-4 p-4 hover:bg-stone-50 transition-colors"
                                        >
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-gold/10 text-brand-gold font-bold text-sm flex-shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-brand-dark truncate">
                                                    {spot.name}
                                                </p>
                                                <p className="text-xs text-stone-500">
                                                    謎が待っています...
                                                </p>
                                            </div>
                                            <ChevronRight size={16} className="text-stone-400 flex-shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Recommended For - Expanded (IMPROVEMENT #9) */}
                {basicInfo?.recommendedFor && basicInfo.recommendedFor.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="mb-8"
                    >
                        <h2 className="text-lg font-bold text-brand-dark mb-3 flex items-center gap-2">
                            <Users size={18} className="text-brand-gold" />
                            こんな人におすすめ
                        </h2>
                        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-200 p-5 shadow-sm">
                            <div className="flex flex-wrap gap-2">
                                {basicInfo.recommendedFor.map((target, idx) => (
                                    <span
                                        key={idx}
                                        className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium"
                                    >
                                        {target}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Practical Info */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                    className="mb-10"
                >
                    <h2 className="text-lg font-bold text-brand-dark mb-3 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-brand-gold" />
                        準備と注意事項
                    </h2>
                    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-brand-dark mb-2">持ち物</h3>
                                <ul className="text-sm text-stone-600 space-y-1">
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-gold"></div>
                                        スマートフォン（充電済み）
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-gold"></div>
                                        歩きやすい靴
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-gold"></div>
                                        飲み物（推奨）
                                    </li>
                                </ul>
                            </div>
                            <div className="pt-4 border-t border-stone-100">
                                <h3 className="text-sm font-bold text-brand-dark mb-2">注意事項</h3>
                                <ul className="text-sm text-stone-600 space-y-1">
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                        天候により体験内容が変わる場合があります
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                        交通ルールを守り、周囲に注意して進んでください
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                        スポットの営業時間にご注意ください
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Publishing Note (IMPROVEMENT #10) */}
                {!isGenerating && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8"
                    >
                        <p className="text-sm text-blue-800 leading-relaxed">
                            💡 <strong>テストプレイ後に、内容を確認してから一般公開できます。</strong>
                            編集画面では謎や答えが表示されます（ネタバレ注意）。
                        </p>
                    </motion.div>
                )}

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.85 }}
                    className="space-y-3"
                >
                    {/* Primary: Play */}
                    <button
                        onClick={onPlay}
                        className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-white font-bold text-lg shadow-lg shadow-brand-gold/25 hover:shadow-xl hover:shadow-brand-gold/30 transition-all flex items-center justify-center gap-3"
                    >
                        <Play size={24} fill="currentColor" />
                        プレイヤーとして挑戦する
                    </button>

                    {/* Secondary: Edit */}
                    <button
                        onClick={onEdit}
                        className="w-full py-3 px-6 rounded-xl bg-white border-2 border-stone-200 text-stone-700 font-bold hover:border-stone-300 hover:bg-stone-50 transition-all flex items-center justify-center gap-2"
                    >
                        <Edit3 size={18} />
                        クリエイターとして編集する
                        <span className="text-xs text-rose-500 ml-1">（ネタバレ）</span>
                    </button>

                    {/* Tertiary: Save Draft */}
                    <button
                        onClick={onSaveDraft}
                        className="w-full py-3 px-6 rounded-xl text-stone-500 font-medium hover:text-stone-700 hover:bg-stone-100 transition-all flex items-center justify-center gap-2"
                    >
                        <Save size={16} />
                        あとで決める（マイ下書きに保存）
                    </button>
                </motion.div>

                {/* Bottom Spacing */}
                <div className="h-8" />
            </div>
        </div>
    );
}
