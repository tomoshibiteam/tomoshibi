import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin,
    Clock,
    Star,
    ChevronLeft,
    ChevronRight,
    Shield,
    ArrowRight,
    Info,
    CheckCircle,
    Play,
    Users,
    Compass,
    Calendar,
    Share2,
    Heart,
    AlertCircle,
    Footprints,
    Trophy,
    Globe
} from 'lucide-react';
import { TomoshibiLogo } from './TomoshibiLogo';
import PlayerLanguageSelector from './PlayerLanguageSelector';

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
    supported_languages?: string[];
    reviewList?: { id: string; rating: number; name: string; date: string; comment: string }[];
}

// --- Components ---
const DifficultyBadge = ({ level }: { level: Quest['difficulty'] }) => {
    const styles = {
        '初級': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
        '中級': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        '上級': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' }
    };
    const s = styles[level];

    return (
        <span className={`px-3 py-1 rounded-full border text-xs font-bold ${s.bg} ${s.text} ${s.border}`}>
            {level}
        </span>
    );
};

const StatCard = ({ icon: Icon, value, label, sub }: { icon: any; value: string; label: string; sub?: string }) => (
    <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center">
            <Icon size={18} className="text-brand-gold" />
        </div>
        <div>
            <div className="text-lg font-bold text-stone-900">{value}</div>
            <div className="text-xs text-stone-500">{label}</div>
        </div>
    </div>
);

const FeatureItem = ({ icon: Icon, text }: { icon: any; text: string }) => (
    <div className="flex items-center gap-3 py-3">
        <div className="w-8 h-8 rounded-lg bg-brand-gold/10 flex items-center justify-center">
            <Icon size={16} className="text-brand-gold" />
        </div>
        <span className="text-sm text-stone-700">{text}</span>
    </div>
);

export default function PlayerQuestDetail({
    quest,
    onBackToList,
    onBackHome,
    onOpenApp,
    purchased,
    onPurchase,
    purchasing,
    t,
}: {
    quest: Quest;
    onBackToList: () => void;
    onBackHome: () => void;
    onOpenApp: (lang?: string) => void;
    comingSoon?: boolean;
    onScrollNotify?: () => void;
    purchased: boolean;
    onPurchase: (questId: string) => void;
    purchasing: boolean;
    t?: {
        reviews: (count: number) => string;
        playersPlayed: (count: number) => string;
        duration: string;
        distance: string;
        spots: string;
        clearRate: string;
        overview: string;
        defaultDescription: string;
        features: string;
        startingPoint: string;
        availableAnytime: string;
        hintFeature: string;
        soloOrTeam: string;
        howToPlay: string;
        step1Title: string;
        step1Desc: string;
        step2Title: string;
        step2Desc: string;
        step3Title: string;
        step3Desc: string;
        reviewsTitle: string;
        viewAll: string;
        creator: string;
        questCreator: string;
        notice: string;
        noticeText: string;
        startQuest: string;
        participationFee: string;
        free: string;
        join: string;
        processing: string;
        aboutMin: (min: number) => string;
        spotsCount: (count: number) => string;
    };
}) {
    // Default translations (Japanese fallback)
    const defaultT = {
        reviews: (count: number) => `${count}件のレビュー`,
        playersPlayed: (count: number) => `${count}人がプレイ`,
        duration: '所要時間',
        distance: '総距離',
        spots: 'スポット数',
        clearRate: 'クリア率',
        overview: '概要',
        defaultDescription: '街を歩きながら謎を解く、新しい体験型アドベンチャー。スマートフォン片手に、街の隠された物語を発見しましょう。',
        features: 'このクエストの特徴',
        startingPoint: 'スタート地点',
        availableAnytime: '24時間いつでもプレイ可能',
        hintFeature: '初心者でも安心のヒント機能付き',
        soloOrTeam: '1人でも仲間とでも楽しめます',
        howToPlay: '遊び方',
        step1Title: 'クエストを開始',
        step1Desc: 'スタート地点まで移動してアプリを起動',
        step2Title: '謎を解く',
        step2Desc: '各スポットで出題される謎を解いて次へ進む',
        step3Title: 'ゴール',
        step3Desc: '全ての謎を解き明かしてクリア！',
        reviewsTitle: 'レビュー',
        viewAll: 'すべて見る',
        creator: 'クリエーター',
        questCreator: 'クエストクリエーター',
        notice: 'ご注意',
        noticeText: 'このクエストは屋外を歩きながら進めます。歩きやすい服装・靴でご参加ください。天候や交通状況にご注意ください。',
        startQuest: 'クエストを開始する',
        participationFee: '参加費',
        free: '無料',
        join: '参加する',
        processing: '処理中...',
        aboutMin: (min: number) => `約${min}分`,
        spotsCount: (count: number) => `${count}箇所`,
    };
    const tr = t || defaultT;

    const [liked, setLiked] = useState(false);
    const [showLanguageSelector, setShowLanguageSelector] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('ja');

    // Available languages from quest or default to Japanese only
    const availableLanguages = quest.supported_languages?.length ? quest.supported_languages : ['ja'];
    const hasMultipleLanguages = availableLanguages.length > 1;

    const handleStartQuest = () => {
        if (hasMultipleLanguages) {
            setShowLanguageSelector(true);
        } else {
            onOpenApp('ja');
        }
    };

    const handleConfirmLanguage = () => {
        setShowLanguageSelector(false);
        onOpenApp(selectedLanguage);
    };

    return (
        <div className="min-h-screen bg-white pt-24">
            {/* Hero Image with Overlaid Title */}
            <div className="relative w-full aspect-[16/10] md:aspect-[21/9] overflow-hidden bg-stone-900">
                <img
                    src={quest.cover}
                    alt={quest.title}
                    className="w-full h-full object-cover"
                />
                {/* Cinematic gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

                {/* Like and Share buttons */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                    <button
                        onClick={() => setLiked(!liked)}
                        className={`p-2.5 rounded-full backdrop-blur-md transition-all ${liked ? 'bg-rose-500/90 text-white' : 'bg-white/20 border border-white/30 text-white hover:bg-white/30'}`}
                    >
                        <Heart size={18} className={liked ? 'fill-current' : ''} />
                    </button>
                    <button className="p-2.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 transition-colors">
                        <Share2 size={18} />
                    </button>
                </div>

                {/* Title overlay at bottom-left */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="absolute bottom-0 left-0 right-0 p-6 md:p-10"
                >
                    <div className="container mx-auto">
                        {/* Badges */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className={`px-3 py-1.5 rounded-full backdrop-blur-md text-xs font-bold ${quest.difficulty === '初級' ? 'bg-emerald-500/80 text-white' :
                                quest.difficulty === '中級' ? 'bg-amber-500/80 text-white' :
                                    'bg-rose-500/80 text-white'
                                }`}>
                                {quest.difficulty}
                            </span>
                            <span className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1">
                                <MapPin size={12} />
                                {quest.area}
                            </span>
                        </div>

                        {/* Quest Title */}
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg tracking-tight leading-tight max-w-4xl">
                            {quest.title}
                        </h1>

                        {/* Rating and stats inline */}
                        <div className="flex flex-wrap items-center gap-4 text-white/90">
                            <div className="flex items-center gap-1.5">
                                <Star size={18} className="text-amber-400 fill-amber-400" />
                                <span className="font-bold text-white">{quest.rating.toFixed(1)}</span>
                                <span className="text-white/70 text-sm">({tr.reviews(quest.reviews)})</span>
                            </div>
                            {quest.playCount && (
                                <span className="text-white/70 text-sm flex items-center gap-1">
                                    <Users size={14} />
                                    {tr.playersPlayed(quest.playCount)}
                                </span>
                            )}
                            <span className="text-white/70 text-sm flex items-center gap-1">
                                <Clock size={14} />
                                {tr.aboutMin(Math.round(quest.durationMin / 5) * 5)}
                            </span>
                            <span className="text-white/70 text-sm flex items-center gap-1">
                                <Compass size={14} />
                                {quest.distanceKm.toFixed(1)}km
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-6 pb-32">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    <StatCard
                        icon={Clock}
                        value={tr.aboutMin(Math.round(quest.durationMin / 5) * 5)}
                        label={tr.duration}
                    />
                    <StatCard
                        icon={Compass}
                        value={`${quest.distanceKm.toFixed(1)}km`}
                        label={tr.distance}
                    />
                    <StatCard
                        icon={Footprints}
                        value={tr.spotsCount(quest.stops?.length || 3)}
                        label={tr.spots}
                    />
                    <StatCard
                        icon={Trophy}
                        value={quest.clearRate ? `${quest.clearRate}%` : '—'}
                        label={tr.clearRate}
                    />
                </div>

                {/* Description */}
                <section className="mb-8">
                    <h2 className="text-lg font-bold text-stone-900 mb-3">{tr.overview}</h2>
                    <p className="text-stone-600 leading-relaxed">
                        {quest.description || quest.teaser || tr.defaultDescription}
                    </p>
                </section>

                {/* Features */}
                <section className="mb-8 p-5 bg-stone-50 rounded-2xl">
                    <h2 className="text-lg font-bold text-stone-900 mb-2">{tr.features}</h2>
                    <div className="divide-y divide-stone-200">
                        <FeatureItem icon={MapPin} text={`${tr.startingPoint}: ${quest.startingPoint || quest.area}`} />
                        <FeatureItem icon={Clock} text={quest.timeWindow || tr.availableAnytime} />
                        <FeatureItem icon={Shield} text={tr.hintFeature} />
                        <FeatureItem icon={Users} text={tr.soloOrTeam} />
                    </div>
                </section>

                {/* How to Play */}
                <section className="mb-8">
                    <h2 className="text-lg font-bold text-stone-900 mb-4">{tr.howToPlay}</h2>
                    <div className="space-y-4">
                        {[
                            { step: 1, title: tr.step1Title, desc: tr.step1Desc },
                            { step: 2, title: tr.step2Title, desc: tr.step2Desc },
                            { step: 3, title: tr.step3Title, desc: tr.step3Desc },
                        ].map(item => (
                            <div key={item.step} className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-brand-gold text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                                    {item.step}
                                </div>
                                <div>
                                    <div className="font-bold text-stone-900">{item.title}</div>
                                    <div className="text-sm text-stone-500">{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Reviews */}
                <section className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-stone-900">{tr.reviewsTitle}</h2>
                        {(quest.reviewList?.length || 0) > 3 && (
                            <button className="text-sm text-brand-gold font-medium hover:underline">
                                {tr.viewAll}
                            </button>
                        )}
                    </div>

                    {quest.reviewList && quest.reviewList.length > 0 ? (
                        <div className="space-y-4">
                            {quest.reviewList.slice(0, 5).map(review => (
                                <div key={review.id} className="p-4 bg-stone-50 rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-stone-300 flex items-center justify-center text-white font-bold text-xs">
                                                {review.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-stone-900 text-sm">{review.name}</div>
                                                <div className="text-xs text-stone-400">{review.date}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    size={12}
                                                    className={i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-stone-300'}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    {review.comment && (
                                        <p className="text-sm text-stone-600">{review.comment}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 bg-stone-50 rounded-xl text-center">
                            <p className="text-stone-400 text-sm">まだレビューがありません</p>
                        </div>
                    )}
                </section>

                {/* Creator */}
                {quest.creatorName && (
                    <section className="mb-8">
                        <h2 className="text-lg font-bold text-stone-900 mb-3">{tr.creator}</h2>
                        <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl">
                            <div className="w-12 h-12 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold font-bold">
                                {quest.creatorName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="font-bold text-stone-900">{quest.creatorName}</div>
                                <div className="text-sm text-stone-500">{tr.questCreator}</div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Notice */}
                <section className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-8">
                    <div className="flex gap-3">
                        <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <div className="font-medium text-amber-800 mb-1">{tr.notice}</div>
                            <p className="text-sm text-amber-700">
                                {tr.noticeText}
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            {/* Fixed Bottom CTA */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 z-30">
                <div className="container mx-auto">
                    {purchased ? (
                        <div className="flex items-center gap-3">
                            {hasMultipleLanguages && (
                                <button
                                    onClick={() => setShowLanguageSelector(true)}
                                    className="px-4 py-4 border border-stone-200 rounded-xl flex items-center gap-2 text-stone-600 hover:bg-stone-50 transition-colors"
                                >
                                    <Globe size={18} />
                                </button>
                            )}
                            <button
                                onClick={handleStartQuest}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                <Play size={20} fill="currentColor" />
                                {tr.startQuest}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <div className="text-xs text-stone-500">{tr.participationFee}</div>
                                <div className="text-xl font-bold text-stone-900">{tr.free}</div>
                            </div>
                            <button
                                onClick={() => onPurchase(quest.id)}
                                disabled={purchasing}
                                className="flex-1 bg-brand-gold hover:bg-amber-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {purchasing ? (
                                    <span>{tr.processing}</span>
                                ) : (
                                    <>
                                        <span>{tr.join}</span>
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Language Selector Modal */}
            <AnimatePresence>
                {showLanguageSelector && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowLanguageSelector(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <PlayerLanguageSelector
                                availableLanguages={availableLanguages}
                                selectedLanguage={selectedLanguage}
                                onSelectLanguage={setSelectedLanguage}
                                onConfirm={handleConfirmLanguage}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
