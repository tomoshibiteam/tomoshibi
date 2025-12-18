import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin,
    Clock,
    Star,
    ChevronRight,
    Search,
    SlidersHorizontal,
    ChevronLeft,
    Compass,
    Users,
    X,
    ChevronDown,
    Grid3X3,
    List,
    Sparkles,
    Flame,
    Map,
    Footprints
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { TomoshibiLogo } from './TomoshibiLogo';

// --- Types ---
interface QuestStop {
    name: string;
    clue: string;
    action: string;
}

interface Quest {
    id: string;
    title: string;
    area: string;
    distanceKm: number;
    durationMin: number;
    difficulty: '初級' | '中級' | '上級';
    tags: string[];
    rating: number;
    reviews: number;
    cover: string;
    description: string;
    teaser: string;
    startingPoint: string;
    reward: string;
    timeWindow: string;
    mood: string;
    stops: QuestStop[];
    creatorName?: string;
    creatorId?: string;
    storyPrologue?: string;
    storyEpilogue?: string;
    owned?: boolean;
    playCount?: number;
    clearRate?: number | null;
    avgDurationMin?: number | null;
}

// --- Components ---

const DifficultyBadge = ({ level, labels }: { level: Quest['difficulty']; labels?: { beginner: string; intermediate: string; advanced: string } }) => {
    const defaultLabels = { beginner: '初級', intermediate: '中級', advanced: '上級' };
    const l = labels || defaultLabels;
    const displayMap: Record<string, string> = {
        '初級': l.beginner,
        '中級': l.intermediate,
        '上級': l.advanced,
    };
    const styles = {
        '初級': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        '中級': 'bg-amber-50 text-amber-700 border-amber-200',
        '上級': 'bg-rose-50 text-rose-700 border-rose-200'
    };

    return (
        <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${styles[level]}`}>
            {displayMap[level] || level}
        </span>
    );
};

// Grid Card - Enhanced with glassmorphism and better visuals
const QuestGridCard = ({ quest, onSelect }: { quest: Quest; onSelect: (quest: Quest) => void }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            onClick={() => onSelect(quest)}
            className="group relative bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden cursor-pointer border border-stone-200/60 hover:border-amber-400/60 shadow-sm hover:shadow-xl hover:shadow-amber-100/50 transition-all duration-300"
        >
            {/* Cover Image */}
            <div className="relative aspect-[4/3] overflow-hidden">
                <img
                    src={quest.cover}
                    alt={quest.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

                {/* Decorative corner glow */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Rating Badge - Enhanced */}
                {quest.rating > 0 && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-white/50">
                        <Star size={13} className="text-amber-500 fill-amber-500" />
                        <span className="text-sm font-bold text-stone-800">{quest.rating.toFixed(1)}</span>
                        <span className="text-[10px] text-stone-500">({quest.reviews})</span>
                    </div>
                )}

                {/* Bottom info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2 text-white/90 text-xs">
                        <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                            <Clock size={12} />
                            <span>約{Math.round(quest.durationMin / 5) * 5}分</span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                            <Compass size={12} />
                            <span>{quest.distanceKm.toFixed(1)}km</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 relative">
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/0 to-amber-100/0 group-hover:from-amber-50/50 group-hover:to-amber-100/30 transition-all duration-300" />

                <div className="relative">
                    <div className="flex items-center gap-2 text-xs text-stone-500 mb-2">
                        <MapPin size={12} className="text-amber-600" />
                        <span className="font-medium">{quest.area}</span>
                        <span className="text-stone-300">•</span>
                        <DifficultyBadge level={quest.difficulty} />
                    </div>

                    <h3 className="font-bold text-stone-900 leading-snug mb-3 line-clamp-2 group-hover:text-amber-700 transition-colors duration-200">
                        {quest.title}
                    </h3>

                    <div className="flex items-center justify-between">
                        <p className="text-xs text-stone-500 line-clamp-1 flex-1 mr-2">
                            {quest.description || '街を歩きながら謎を解く冒険'}
                        </p>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md group-hover:shadow-amber-200 transition-shadow">
                            <ChevronRight size={16} className="text-white" />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// List Card
const QuestListCard = ({ quest, onSelect }: { quest: Quest; onSelect: (quest: Quest) => void }) => {
    return (
        <div
            onClick={() => onSelect(quest)}
            className="group flex bg-white rounded-xl overflow-hidden cursor-pointer border border-stone-200 hover:border-brand-gold hover:shadow-lg transition-all duration-200"
        >
            {/* Cover Image */}
            <div className="relative w-48 flex-shrink-0 overflow-hidden">
                <img
                    src={quest.cover}
                    alt={quest.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
            </div>

            {/* Content */}
            <div className="flex-1 p-4 flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-2 text-xs text-stone-500 mb-2">
                        <MapPin size={12} />
                        <span>{quest.area}</span>
                        <span className="text-stone-300">•</span>
                        <DifficultyBadge level={quest.difficulty} />
                    </div>

                    <h3 className="font-bold text-stone-900 leading-snug mb-2 group-hover:text-brand-gold transition-colors">
                        {quest.title}
                    </h3>

                    <p className="text-sm text-stone-500 line-clamp-2 mb-3">
                        {quest.description || '街を歩きながら謎を解く、新しい体験型アドベンチャー'}
                    </p>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-stone-500">
                        <div className="flex items-center gap-1">
                            <Clock size={14} />
                            <span>約{Math.round(quest.durationMin / 5) * 5}分</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Compass size={14} />
                            <span>{quest.distanceKm.toFixed(1)}km</span>
                        </div>
                        {quest.rating > 0 && (
                            <div className="flex items-center gap-1">
                                <Star size={14} className="text-amber-500 fill-amber-500" />
                                <span className="font-medium text-stone-700">{quest.rating.toFixed(1)}</span>
                                <span className="text-stone-400">({quest.reviews})</span>
                            </div>
                        )}
                    </div>
                    <ChevronRight size={20} className="text-stone-400 group-hover:text-brand-gold transition-colors" />
                </div>
            </div>
        </div>
    );
};

// Filter Chip - Enhanced with animation
const FilterChip = ({
    label,
    active,
    onClick,
    count
}: {
    label: string;
    active: boolean;
    onClick: () => void;
    count?: number;
}) => (
    <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${active
            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-200/50'
            : 'bg-white/80 backdrop-blur-sm border border-stone-200 text-stone-600 hover:border-amber-300 hover:bg-amber-50/50'
            }`}
    >
        {label}
        {count !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'}`}>
                {count}
            </span>
        )}
    </motion.button>
);

// Sort Dropdown
const SortDropdown = ({
    value,
    onChange,
    labels,
}: {
    value: string;
    onChange: (val: string) => void;
    labels?: { newest: string; popular: string; rating: string; durationAsc: string; durationDesc: string };
}) => {
    const [open, setOpen] = useState(false);
    const l = labels || {
        newest: '新着順',
        popular: '人気順',
        rating: '評価順',
        durationAsc: '所要時間（短い順）',
        durationDesc: '所要時間（長い順）',
    };
    const options = [
        { value: 'newest', label: l.newest },
        { value: 'popular', label: l.popular },
        { value: 'rating', label: l.rating },
        { value: 'duration-asc', label: l.durationAsc },
        { value: 'duration-desc', label: l.durationDesc },
    ];
    const current = options.find(o => o.value === value);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-700 hover:border-stone-400 transition-colors"
            >
                <span>{current?.label}</span>
                <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute right-0 top-full mt-2 w-48 bg-white border border-stone-200 rounded-lg shadow-lg z-50 overflow-hidden"
                        >
                            {options.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => { onChange(opt.value); setOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-stone-50 transition-colors ${value === opt.value ? 'bg-brand-base text-brand-dark font-medium' : 'text-stone-700'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Main Page Component ---

export default function PlayerQuestList({
    onSelectQuest,
    onBackHome,
    ownedQuestIds = [],
    initialBrandFilter,
    t,
}: {
    onSelectQuest: (quest: Quest) => void;
    onBackHome: () => void;
    ownedQuestIds?: string[];
    initialBrandFilter?: string | null;
    t?: {
        loading: string;
        questCount: (count: number) => string;
        searchPlaceholder: string;
        all: string;
        beginner: string;
        intermediate: string;
        advanced: string;
        clearFilters: string;
        noQuestsFound: string;
        tryDifferent: string;
        sortNewest: string;
        sortPopular: string;
        sortRating: string;
        sortDurationAsc: string;
        sortDurationDesc: string;
        minutes: (min: number) => string;
        defaultDescription: string;
    };
}) {
    // Default translations (Japanese fallback)
    const defaultT = {
        loading: '読み込み中...',
        questCount: (count: number) => `${count}件のクエスト`,
        searchPlaceholder: 'クエストを検索...',
        all: 'すべて',
        beginner: '初級',
        intermediate: '中級',
        advanced: '上級',
        clearFilters: 'フィルターをクリア',
        noQuestsFound: 'クエストが見つかりませんでした',
        tryDifferent: '検索条件を変更してお試しください',
        sortNewest: '新着順',
        sortPopular: '人気順',
        sortRating: '評価順',
        sortDurationAsc: '所要時間（短い順）',
        sortDurationDesc: '所要時間（長い順）',
        minutes: (min: number) => `約${min}分`,
        defaultDescription: '街を歩きながら謎を解く、新しい体験型アドベンチャー',
    };
    const tr = t || defaultT;

    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
    const [selectedArea, setSelectedArea] = useState<string | null>(null);
    const [selectedBrand, setSelectedBrand] = useState<string | null>(initialBrandFilter || null);

    // Brand definitions
    const BRANDS = [
        { id: 'spr', label: 'SPR探偵事務所', keywords: ['SPR', 'SPR探偵事務所', '探偵'] },
    ];

    useEffect(() => {
        const fetchQuests = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('quests')
                .select('*, profiles!quests_creator_id_fkey(username)')
                .eq('status', 'published')
                .order('created_at', { ascending: false });

            if (data) {
                const mapped = data.map((q: any) => ({
                    id: q.id,
                    title: q.title || 'Unknown Quest',
                    area: q.area_name || 'The City',
                    distanceKm: q.distance_km || 2.5,
                    durationMin: q.duration_min || 45,
                    difficulty: '中級' as const,
                    tags: (q.tags as string[]) || [],
                    rating: 4.5,
                    reviews: 12,
                    cover: q.cover_image_url || 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1000&q=80',
                    description: q.description || '',
                    teaser: q.area_name || '',
                    startingPoint: 'To be revealed',
                    reward: 'Digital collectible',
                    timeWindow: 'Anytime',
                    mood: 'Adventure',
                    stops: [],
                    creatorName: q.profiles?.username,
                    creatorId: q.creator_id,
                    owned: ownedQuestIds.includes(q.id),
                    playCount: 100,
                    clearRate: 80,
                    avgDurationMin: 50,
                }));
                setQuests(mapped);
            }
            setLoading(false);
        };
        fetchQuests();
    }, [ownedQuestIds]);

    // Get unique areas for filter
    const areas = useMemo(() => {
        return [...new Set(quests.map(q => q.area))];
    }, [quests]);

    // Filter and sort quests
    const filteredQuests = useMemo(() => {
        let result = [...quests];

        // Brand filter (SPR Detective Agency etc.)
        if (selectedBrand) {
            const brand = BRANDS.find(b => b.id === selectedBrand);
            if (brand) {
                result = result.filter(q => {
                    const titleMatch = brand.keywords.some(kw => q.title.includes(kw));
                    const tagMatch = q.tags.some(tag => brand.keywords.some(kw => tag.includes(kw)));
                    const descMatch = brand.keywords.some(kw => q.description.includes(kw));
                    return titleMatch || tagMatch || descMatch;
                });
            }
        }

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(q =>
                q.title.toLowerCase().includes(query) ||
                q.area.toLowerCase().includes(query) ||
                q.description.toLowerCase().includes(query)
            );
        }

        // Difficulty filter
        if (selectedDifficulty) {
            result = result.filter(q => q.difficulty === selectedDifficulty);
        }

        // Area filter
        if (selectedArea) {
            result = result.filter(q => q.area === selectedArea);
        }

        // Sort
        switch (sortBy) {
            case 'popular':
                result.sort((a, b) => b.playCount! - a.playCount!);
                break;
            case 'rating':
                result.sort((a, b) => b.rating - a.rating);
                break;
            case 'duration-asc':
                result.sort((a, b) => a.durationMin - b.durationMin);
                break;
            case 'duration-desc':
                result.sort((a, b) => b.durationMin - a.durationMin);
                break;
            default:
                // newest - already sorted by created_at
                break;
        }

        return result;
    }, [quests, searchQuery, sortBy, selectedDifficulty, selectedArea, selectedBrand]);

    const hasActiveFilters = selectedDifficulty || selectedArea || searchQuery || selectedBrand;

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedDifficulty(null);
        setSelectedArea(null);
        setSelectedBrand(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-50 via-stone-50 to-amber-50/30 pt-20">

            {/* Search & Filter Bar - Enhanced */}
            <div className="sticky top-16 z-30 bg-white/80 backdrop-blur-lg border-b border-stone-200/60 py-4 shadow-sm">
                <div className="container mx-auto px-4">
                    {/* Search Input - Enhanced */}
                    <div className="relative mb-4">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" />
                        <input
                            type="text"
                            placeholder={tr.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border-2 border-stone-200 rounded-xl text-sm placeholder-stone-400 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-lg focus:shadow-amber-100/50 transition-all duration-300"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    {/* Filter Chips */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <FilterChip
                            label={tr.all}
                            active={!selectedDifficulty && !selectedArea && !selectedBrand}
                            onClick={clearFilters}
                        />
                        <div className="w-px h-6 bg-stone-200" />
                        {/* Brand Filters */}
                        {BRANDS.map(brand => (
                            <FilterChip
                                key={brand.id}
                                label={brand.label}
                                active={selectedBrand === brand.id}
                                onClick={() => setSelectedBrand(selectedBrand === brand.id ? null : brand.id)}
                            />
                        ))}
                        <div className="w-px h-6 bg-stone-200" />
                        <FilterChip
                            label={tr.beginner}
                            active={selectedDifficulty === '初級'}
                            onClick={() => setSelectedDifficulty(selectedDifficulty === '初級' ? null : '初級')}
                        />
                        <FilterChip
                            label={tr.intermediate}
                            active={selectedDifficulty === '中級'}
                            onClick={() => setSelectedDifficulty(selectedDifficulty === '中級' ? null : '中級')}
                        />
                        <FilterChip
                            label={tr.advanced}
                            active={selectedDifficulty === '上級'}
                            onClick={() => setSelectedDifficulty(selectedDifficulty === '上級' ? null : '上級')}
                        />
                        {areas.length > 0 && (
                            <>
                                <div className="w-px h-6 bg-stone-200" />
                                {areas.slice(0, 3).map(area => (
                                    <FilterChip
                                        key={area}
                                        label={area}
                                        active={selectedArea === area}
                                        onClick={() => setSelectedArea(selectedArea === area ? null : area)}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white border-b border-stone-100 py-3">
                <div className="container mx-auto px-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-brand-gold hover:bg-brand-gold/10 rounded-full transition-colors"
                            >
                                <X size={14} />
                                {tr.clearFilters}
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <SortDropdown
                            value={sortBy}
                            onChange={setSortBy}
                            labels={{
                                newest: tr.sortNewest,
                                popular: tr.sortPopular,
                                rating: tr.sortRating,
                                durationAsc: tr.sortDurationAsc,
                                durationDesc: tr.sortDurationDesc,
                            }}
                        />

                        <div className="flex items-center bg-stone-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
                            >
                                <Grid3X3 size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="container mx-auto px-4 py-8">
                {loading ? (
                    <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className={`relative bg-white rounded-2xl overflow-hidden ${viewMode === 'grid' ? 'aspect-[4/5]' : 'h-36'}`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-stone-100 via-stone-50 to-stone-100 animate-pulse" />
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                            </motion.div>
                        ))}
                    </div>
                ) : filteredQuests.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="py-16 text-center"
                    >
                        {/* Animated Lantern Illustration */}
                        <div className="relative w-32 h-32 mx-auto mb-6">
                            <motion.div
                                className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-200/50 to-amber-400/30"
                                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                                <motion.div
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <Compass className="text-amber-600" size={40} />
                                </motion.div>
                            </div>
                            {/* Floating sparkles */}
                            <motion.div
                                className="absolute -top-2 -right-2"
                                animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <Sparkles className="text-amber-400" size={16} />
                            </motion.div>
                            <motion.div
                                className="absolute -bottom-1 -left-1"
                                animate={{ y: [0, -3, 0], opacity: [0.3, 0.7, 0.3] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                            >
                                <Sparkles className="text-amber-300" size={12} />
                            </motion.div>
                        </div>

                        <h3 className="text-xl font-bold text-stone-800 mb-2">
                            新たな冒険を探そう
                        </h3>
                        <p className="text-stone-500 text-sm mb-6 max-w-sm mx-auto">
                            {tr.noQuestsFound}。{tr.tryDifferent}
                        </p>
                        {hasActiveFilters && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={clearFilters}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-medium rounded-full shadow-lg shadow-amber-200/50 hover:shadow-xl hover:shadow-amber-300/50 transition-shadow"
                            >
                                <X size={16} />
                                {tr.clearFilters}
                            </motion.button>
                        )}
                    </motion.div>
                ) : viewMode === 'grid' ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filteredQuests.map((quest) => (
                            <QuestGridCard key={quest.id} quest={quest} onSelect={onSelectQuest} />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredQuests.map((quest) => (
                            <QuestListCard key={quest.id} quest={quest} onSelect={onSelectQuest} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
