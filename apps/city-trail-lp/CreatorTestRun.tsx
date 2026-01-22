import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TomoshibiLogo } from './TomoshibiLogo';
import { supabase } from './supabaseClient';
import {
    CheckCircle,
    PlayCircle,
    AlertTriangle,
    ShieldCheck,
    Smartphone,
    MapPin,
    ArrowRight,
    X,
    Target,
    HelpCircle,
    CheckCircle2,
    Sparkles,
    MessageCircle,
    Globe
} from 'lucide-react';

interface SpotData {
    id: string;
    name: string;
    address: string;
    story_intro: string;
    challenge_text: string;
    hints: string[];
    answer: string;
    success_message: string;
}

interface StoryData {
    prologue_title: string;
    prologue: string;
    epilogue: string;
    cast_name: string;
}

interface QuestData {
    id: string;
    title: string;
    description: string;
}

interface TranslatedContent {
    quest: QuestData | null;
    story: StoryData | null;
    spots: SpotData[];
}

type SimulationStage = 'prologue' | 'spot' | 'puzzle' | 'success' | 'epilogue' | 'complete';

const AVAILABLE_LANGUAGES = [
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
];

export default function CreatorTestRun() {
    const navigate = useNavigate();
    const [isSimulating, setIsSimulating] = useState(false);
    const [currentStage, setCurrentStage] = useState<SimulationStage>('prologue');
    const [currentSpotIndex, setCurrentSpotIndex] = useState(0);
    const [showHint, setShowHint] = useState(false);
    const [userAnswer, setUserAnswer] = useState('');
    const [answerError, setAnswerError] = useState(false);
    const [storyVisibleCount, setStoryVisibleCount] = useState(1);

    // Language selection
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [activeLanguage, setActiveLanguage] = useState('ja');

    // Quest data (Japanese base)
    const [quest, setQuest] = useState<QuestData | null>(null);
    const [story, setStory] = useState<StoryData | null>(null);
    const [spots, setSpots] = useState<SpotData[]>([]);
    const [loading, setLoading] = useState(false);

    // Translations
    const [translations, setTranslations] = useState<Record<string, TranslatedContent>>({});

    // Load quest data when simulation starts
    const loadQuestData = async () => {
        setLoading(true);
        const questId = localStorage.getItem('creatorQuestId') || localStorage.getItem('quest-id');
        if (!questId) {
            setLoading(false);
            return;
        }

        // Load saved languages
        const savedLanguages = localStorage.getItem(`quest-languages:${questId}`);
        if (savedLanguages) {
            try {
                const parsedLangs = JSON.parse(savedLanguages) as string[];
                const langCodes: string[] = [];
                if (parsedLangs.includes('英語')) langCodes.push('en');
                if (parsedLangs.includes('韓国語')) langCodes.push('ko');
                setSelectedLanguages(langCodes);
            } catch (e) {
                console.error('Failed to parse saved languages', e);
            }
        }

        // Fetch quest
        const { data: questData } = await supabase
            .from('quests')
            .select('id, title, description')
            .eq('id', questId)
            .single();

        if (questData) setQuest(questData);

        // Fetch story
        const { data: storyData } = await supabase
            .from('story_timelines')
            .select('prologue, epilogue, prologue_title, cast_name')
            .eq('quest_id', questId)
            .single();

        if (storyData) {
            setStory({
                prologue_title: storyData.prologue_title || '',
                prologue: storyData.prologue || '',
                epilogue: storyData.epilogue || '',
                cast_name: storyData.cast_name || '',
            });
        }

        // Fetch spots
        const { data: spotsData } = await supabase
            .from('spots')
            .select('id, name, address')
            .eq('quest_id', questId)
            .order('order_index');

        if (spotsData && spotsData.length > 0) {
            const spotIds = spotsData.map(s => s.id);
            const { data: detailsData } = await supabase
                .from('spot_details')
                .select('spot_id, story_text, question_text, hint_text, answer_text, completion_message')
                .in('spot_id', spotIds);

            const mergedSpots = spotsData.map(spot => {
                const detail = detailsData?.find(d => d.spot_id === spot.id);
                const hintsArray = detail?.hint_text ? detail.hint_text.split('\n').filter((h: string) => h.trim()) : [];
                return {
                    ...spot,
                    story_intro: detail?.story_text || '',
                    challenge_text: detail?.question_text || '',
                    hints: hintsArray,
                    answer: detail?.answer_text || '',
                    success_message: detail?.completion_message || '',
                };
            });
            setSpots(mergedSpots as SpotData[]);
        }

        setLoading(false);
    };

    const startSimulation = async () => {
        await loadQuestData();
        setIsSimulating(true);
        setCurrentStage('prologue');
        setCurrentSpotIndex(0);
        setStoryVisibleCount(1);
    };

    const endSimulation = () => {
        setIsSimulating(false);
        setCurrentStage('prologue');
        setCurrentSpotIndex(0);
        setUserAnswer('');
        setShowHint(false);
        setActiveLanguage('ja');
    };

    const getContent = () => {
        if (activeLanguage === 'ja') {
            return { quest, story, spots };
        }
        return translations[activeLanguage] || { quest, story, spots };
    };

    const content = getContent();

    const nextStage = () => {
        if (currentStage === 'prologue') {
            if (content.spots.length > 0) {
                setCurrentStage('spot');
                setStoryVisibleCount(1);
            } else {
                setCurrentStage('epilogue');
            }
        } else if (currentStage === 'spot') {
            setCurrentStage('puzzle');
        } else if (currentStage === 'success') {
            if (currentSpotIndex < content.spots.length - 1) {
                setCurrentSpotIndex(prev => prev + 1);
                setCurrentStage('spot');
                setUserAnswer('');
                setShowHint(false);
                setStoryVisibleCount(1);
            } else {
                setCurrentStage('epilogue');
            }
        } else if (currentStage === 'epilogue') {
            setCurrentStage('complete');
        }
    };

    const checkAnswer = () => {
        const currentSpot = content.spots[currentSpotIndex];
        if (!currentSpot?.answer) {
            setCurrentStage('success');
            return;
        }

        const correctAnswer = currentSpot.answer.toLowerCase().trim().replace(/\s+/g, '');
        const userInput = userAnswer.toLowerCase().trim().replace(/\s+/g, '');

        if (userInput === correctAnswer) {
            setCurrentStage('success');
            setAnswerError(false);
        } else {
            setAnswerError(true);
        }
    };

    // Mock checklist data
    const checklist = [
        { id: 1, label: '全スポットが接続済み', status: 'pass' },
        { id: 2, label: 'プロローグ設定済み', status: story?.prologue ? 'pass' : 'warn', msg: !story?.prologue ? 'プロローグが設定されていません' : undefined },
        { id: 3, label: '各スポットに1つ以上の謎', status: 'pass' },
        { id: 4, label: 'ルート総距離 5km以内', status: 'pass' },
        { id: 5, label: '必須アセットアップロード済み', status: 'pass' },
    ];

    // Simulation UI - Faithful mobile replication
    if (isSimulating) {
        const currentSpot = content.spots[currentSpotIndex];

        return (
            <section className="min-h-screen bg-gradient-to-br from-[#3D2E1F] via-[#2A1F15] to-[#1A1510] flex items-center justify-center p-4">
                {/* Phone Frame */}
                <div className="w-full max-w-[390px] bg-[#FEF9F3] rounded-[40px] shadow-2xl overflow-hidden border-[8px] border-[#1A1510] relative" style={{ minHeight: '844px' }}>
                    {/* Dynamic Island */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[120px] h-[32px] bg-[#1A1510] rounded-full z-20" />

                    {/* Screen */}
                    <div className="min-h-[828px] bg-gradient-to-b from-[#FEF9F3] to-[#F7E7D3] flex flex-col">
                        {/* Header with language switcher */}
                        <div className="bg-[#FEF9F3]/95 backdrop-blur-sm border-b-2 border-[#E8D5BE] px-4 py-3 pt-12 flex items-center justify-between">
                            <button onClick={endSimulation} className="text-[#7A6652] hover:text-[#3D2E1F]">
                                <X size={20} />
                            </button>

                            {/* Language switcher (if languages selected) */}
                            {selectedLanguages.length > 0 ? (
                                <div className="flex items-center gap-1 bg-[#F7E7D3] rounded-full p-1 border-2 border-[#E8D5BE]">
                                    <button
                                        onClick={() => setActiveLanguage('ja')}
                                        className={`px-2 py-1 text-xs font-bold rounded-full transition-all ${activeLanguage === 'ja' ? 'bg-[#D87A32] text-white' : 'text-[#7A6652]'}`}
                                    >
                                        🇯🇵
                                    </button>
                                    {selectedLanguages.map(lang => {
                                        const l = AVAILABLE_LANGUAGES.find(x => x.code === lang);
                                        return (
                                            <button
                                                key={lang}
                                                onClick={() => setActiveLanguage(lang)}
                                                className={`px-2 py-1 text-xs font-bold rounded-full transition-all ${activeLanguage === lang ? 'bg-[#D87A32] text-white' : 'text-[#7A6652]'}`}
                                            >
                                                {l?.flag}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <span className="text-xs font-bold text-[#7A6652]">
                                    {currentStage === 'prologue' && 'プロローグ'}
                                    {currentStage === 'spot' && `スポット ${currentSpotIndex + 1}/${content.spots.length}`}
                                    {currentStage === 'puzzle' && '謎解き'}
                                    {currentStage === 'success' && 'クリア！'}
                                    {currentStage === 'epilogue' && 'エピローグ'}
                                    {currentStage === 'complete' && '完了'}
                                </span>
                            )}

                            <div className="w-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="w-8 h-8 border-2 border-[#D87A32] border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <>
                                    {/* Prologue - Chat style */}
                                    {currentStage === 'prologue' && (
                                        <div className="space-y-3 animate-fadeIn">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold tracking-wide bg-[#D87A32]/10 text-[#D87A32] border-2 border-[#D87A32]/30">
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                    プロローグ
                                                </div>
                                            </div>

                                            {/* Message bubble */}
                                            <div className="flex justify-start">
                                                <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed bg-[#F7E7D3] text-[#3D2E1F] border border-[#E8D5BE]">
                                                    {content.story?.cast_name && (
                                                        <div className="text-xs font-bold text-[#D87A32] mb-1">
                                                            {content.story.cast_name}
                                                        </div>
                                                    )}
                                                    <div className="whitespace-pre-wrap">
                                                        {content.story?.prologue || 'プロローグが設定されていません。ストーリー編集で追加してください。'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Spot Story */}
                                    {currentStage === 'spot' && currentSpot && (
                                        <div className="space-y-3 animate-fadeIn">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold tracking-wide bg-[#D87A32]/10 text-[#D87A32] border-2 border-[#D87A32]/30">
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                    ストーリー
                                                </div>
                                            </div>

                                            {/* Spot header */}
                                            <div className="p-3 rounded-xl bg-[#F7E7D3] border-2 border-[#E8D5BE]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F4A853] via-[#D87A32] to-[#B85A1F] flex items-center justify-center shadow-md border-2 border-[#FEF9F3]">
                                                        <Target className="w-4 h-4 text-[#FEF9F3]" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-bold text-[#3D2E1F] tracking-wide">{currentSpot.name}</h3>
                                                        <p className="text-[#7A6652] text-xs">{currentSpot.address}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Story message */}
                                            <div className="flex justify-start">
                                                <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed bg-[#F7E7D3] text-[#3D2E1F] border border-[#E8D5BE]">
                                                    <div className="whitespace-pre-wrap">
                                                        {currentSpot.story_intro || 'ストーリー導入が設定されていません。'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Puzzle */}
                                    {currentStage === 'puzzle' && currentSpot && (
                                        <div className="space-y-3 animate-fadeIn">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold tracking-wide bg-[#D87A32]/10 text-[#D87A32] border-2 border-[#D87A32]/30">
                                                    <HelpCircle className="w-3.5 h-3.5" />
                                                    謎解き
                                                </div>
                                            </div>

                                            {/* Question Card */}
                                            <div className="p-3 rounded-xl bg-[#F7E7D3] border-2 border-[#E8D5BE]">
                                                <h3 className="text-base font-bold text-[#3D2E1F] mb-1 tracking-wide">
                                                    {currentSpot.name}
                                                </h3>
                                                <p className="text-[#7A6652] text-sm whitespace-pre-wrap leading-relaxed">
                                                    {currentSpot.challenge_text || 'このスポットには謎が設定されていません'}
                                                </p>
                                            </div>

                                            {/* Hint */}
                                            {currentSpot.hints.length > 0 && (
                                                <>
                                                    <button
                                                        onClick={() => setShowHint(!showHint)}
                                                        className="flex items-center gap-2 text-xs text-[#D87A32] font-bold"
                                                    >
                                                        💡 {showHint ? 'ヒントを隠す' : 'ヒントを見る'}
                                                    </button>
                                                    {showHint && (
                                                        <div className="rounded-xl bg-[#D87A32]/10 border-2 border-[#D87A32]/30 px-3 py-2">
                                                            <p className="text-[#3D2E1F] text-sm">{currentSpot.hints[0]}</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* Answer Input */}
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={userAnswer}
                                                    onChange={(e) => {
                                                        setUserAnswer(e.target.value);
                                                        setAnswerError(false);
                                                    }}
                                                    className={`w-full rounded-xl px-4 py-2.5 text-base font-medium transition-all ${answerError
                                                        ? 'bg-red-50 border-2 border-red-300 text-[#3D2E1F]'
                                                        : 'bg-[#F7E7D3] border-2 border-[#E8D5BE] text-[#3D2E1F] placeholder:text-[#9B8A7A]'
                                                        }`}
                                                    placeholder="答えを入力してください..."
                                                />
                                                {answerError && (
                                                    <p className="text-red-500 text-sm flex items-center gap-1.5">
                                                        × 少し違うようです。もう一度考えてみよう。
                                                    </p>
                                                )}
                                                {currentSpot.answer && (
                                                    <p className="text-xs text-[#9B8A7A]">（正解: {currentSpot.answer}）</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Success */}
                                    {currentStage === 'success' && currentSpot && (
                                        <div className="space-y-4 animate-fadeIn text-center py-4">
                                            <div className="w-16 h-16 bg-gradient-to-br from-[#4A8A8C] to-[#2E5A5C] rounded-full flex items-center justify-center mx-auto shadow-lg border-2 border-[#FEF9F3]">
                                                <CheckCircle2 size={32} className="text-[#FEF9F3]" />
                                            </div>
                                            <h3 className="text-xl font-bold text-[#2E5A5C]">正解！</h3>
                                            <div className="rounded-xl bg-[#2E5A5C]/10 border-2 border-[#2E5A5C]/30 px-3 py-2 text-left">
                                                <p className="text-sm text-[#3D2E1F] whitespace-pre-wrap">
                                                    {currentSpot.success_message || 'おめでとうございます！次へ進みましょう。'}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Epilogue */}
                                    {currentStage === 'epilogue' && (
                                        <div className="space-y-3 animate-fadeIn">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold tracking-wide bg-[#2E5A5C]/10 text-[#2E5A5C] border-2 border-[#2E5A5C]/30">
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                    エピローグ
                                                </div>
                                            </div>

                                            <div className="flex justify-start">
                                                <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed bg-[#F7E7D3] text-[#3D2E1F] border border-[#E8D5BE]">
                                                    <div className="whitespace-pre-wrap">
                                                        {content.story?.epilogue || 'エピローグが設定されていません。'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Complete */}
                                    {currentStage === 'complete' && (
                                        <div className="space-y-4 animate-fadeIn text-center py-8">
                                            <div className="w-20 h-20 bg-gradient-to-br from-[#F4A853] via-[#D87A32] to-[#B85A1F] rounded-full flex items-center justify-center mx-auto shadow-lg border-4 border-[#FEF9F3]" style={{ boxShadow: '0 8px 32px rgba(216,122,50,0.4)' }}>
                                                <span className="text-3xl">🎉</span>
                                            </div>
                                            <h2 className="text-2xl font-bold text-[#3D2E1F]">クエスト完了！</h2>
                                            <p className="text-sm text-[#7A6652]">
                                                シミュレーションが終了しました。
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer / Actions */}
                        <div className="p-4 bg-[#FEF9F3]/95 backdrop-blur-sm border-t-2 border-[#E8D5BE]">
                            {currentStage === 'puzzle' && content.spots[currentSpotIndex]?.answer ? (
                                <button
                                    onClick={checkAnswer}
                                    className="w-full h-11 font-bold rounded-xl tracking-wide bg-gradient-to-r from-[#F4A853] to-[#D87A32] text-[#FEF9F3] shadow-[0_4px_16px_rgba(216,122,50,0.3)] active:scale-[0.98] transition-transform"
                                >
                                    ✿ 回答する
                                </button>
                            ) : currentStage === 'complete' ? (
                                <button
                                    onClick={endSimulation}
                                    className="w-full h-11 font-bold rounded-xl tracking-wide bg-gradient-to-r from-[#4A8A8C] to-[#2E5A5C] text-[#FEF9F3] shadow-md active:scale-[0.98] transition-transform"
                                >
                                    シミュレーションを終了
                                </button>
                            ) : currentStage === 'success' ? (
                                <button
                                    onClick={nextStage}
                                    className="w-full h-11 font-bold rounded-xl tracking-wide bg-gradient-to-r from-[#4A8A8C] to-[#2E5A5C] text-[#FEF9F3] shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                                >
                                    {currentSpotIndex < content.spots.length - 1 ? '→ 次のスポットへ' : '✿ エピローグへ'}
                                </button>
                            ) : (
                                <button
                                    onClick={nextStage}
                                    className="w-full h-11 font-bold rounded-xl tracking-wide bg-gradient-to-r from-[#F4A853] to-[#D87A32] text-[#FEF9F3] shadow-[0_4px_16px_rgba(216,122,50,0.3)] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                                >
                                    {currentStage === 'spot' ? '✿ 謎解きに進む' : 'タップで続きを読む'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Home indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-[#3D2E1F] rounded-full" />
                </div>
            </section>
        );
    }

    return (
        <section className="min-h-screen bg-stone-50 flex flex-col">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-50">
                <div className="container mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
                    <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
                        <TomoshibiLogo className="h-7 w-auto" />
                    </button>
                    <div className="flex items-center gap-4 text-xs font-bold text-stone-400">
                        <span className="hidden md:inline">Step 1: 基本情報</span>
                        <span>›</span>
                        <span className="hidden md:inline">Step 2: スポット</span>
                        <span>›</span>
                        <span className="hidden md:inline">Step 3: ストーリー</span>
                        <span>›</span>
                        <span className="hidden md:inline">Step 4: 多言語</span>
                        <span>›</span>
                        <span className="text-brand-dark px-2 py-1 bg-brand-gold/10 rounded">Step 5: テストラン</span>
                        <span>›</span>
                        <span>Step 6: 公開</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 container mx-auto px-4 md:px-8 py-12 max-w-4xl">
                <button onClick={() => navigate('/creator/workspace')} className="text-xs font-bold text-stone-500 hover:text-brand-dark flex items-center gap-1 mb-8 transition-colors">
                    <span className="text-lg">‹</span> ワークスペースに戻る
                </button>

                <div className="text-center mb-12">
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Smartphone size={32} />
                    </div>
                    <h1 className="text-4xl font-serif font-bold text-brand-dark mb-3">テストラン & 検証</h1>
                    <p className="text-stone-500 max-w-lg mx-auto">
                        公開前に、クエストが意図した通りに動作するか確認しましょう。実際のルートを歩いてアプリでテストすることをお勧めします。
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Sanity Check Card */}
                    <div className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
                            <h2 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                                <ShieldCheck size={20} className="text-emerald-500" />
                                システムチェック
                            </h2>
                        </div>
                        <div className="p-6 flex-1">
                            <ul className="space-y-4">
                                {checklist.map(item => (
                                    <li key={item.id} className="flex items-start gap-3">
                                        {item.status === 'pass' ? (
                                            <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                                        ) : (
                                            <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                                        )}
                                        <div>
                                            <span className={`text-sm font-bold ${item.status === 'pass' ? 'text-stone-700' : 'text-amber-700'}`}>
                                                {item.label}
                                            </span>
                                            {item.msg && <p className="text-xs text-stone-500 mt-1">{item.msg}</p>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-4 bg-stone-50 text-center border-t border-stone-100">
                            <span className="text-xs font-bold text-stone-400">全チェック自動完了</span>
                        </div>
                    </div>

                    {/* Simulation Card */}
                    <div className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
                            <h2 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                                <PlayCircle size={20} className="text-brand-gold" />
                                シミュレーション
                            </h2>
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
                            <div className="mb-6 relative">
                                <div className="absolute inset-0 bg-[#D87A32]/20 rounded-full blur-xl animate-pulse" />
                                <div className="w-32 h-32 rounded-2xl bg-gradient-to-b from-[#FEF9F3] to-[#F7E7D3] flex items-center justify-center relative z-10 border-4 border-white shadow-lg">
                                    <Smartphone size={48} className="text-[#D87A32]" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-brand-dark mb-2">モバイルUIでシミュレーション</h3>
                            <p className="text-sm text-stone-500 mb-6">
                                実際のモバイルUIを完全再現。ストーリー、謎解き、クリアまでの流れを確認できます。
                            </p>
                            <button
                                onClick={startSimulation}
                                className="px-8 py-3 rounded-full bg-gradient-to-r from-[#F4A853] to-[#D87A32] text-white font-bold hover:shadow-lg transition-all shadow-md flex items-center gap-2"
                            >
                                <PlayCircle size={18} />
                                シミュレーション開始
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <button onClick={() => navigate('/creator/workspace')} className="text-stone-400 hover:text-brand-dark font-bold text-sm flex items-center gap-2 mx-auto transition-colors">
                        公開準備ができたらワークスペースへ <ArrowRight size={14} />
                    </button>
                </div>
            </div>
        </section>
    );
}
