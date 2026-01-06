// CreatorMultilingual.tsx - Dedicated page for multilingual authoring
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TomoshibiLogo } from './TomoshibiLogo';
import { Globe, Check, Languages, ChevronDown, ChevronUp, MapPin, BookOpen, Users, MessageCircle } from 'lucide-react';
import { supabase } from './supabaseClient';
import { getModelEndpoint } from './lib/ai/model-config';

interface QuestData {
    id: string;
    title: string;
    description: string;
    area_name: string;
    difficulty: string;
    target_audience: string;
}

interface StoryData {
    prologue_title: string;
    prologue: string;
    epilogue: string;
    cast_name: string;
    cast_tone: string;
    characters: CharacterData[];
}

interface SpotData {
    id: string;
    name: string;
    address: string;
    order_index: number;
    story_intro: string;
    challenge_text: string;
    hints: string[];
    answer: string;
    success_message: string;
    directions: string;
}

interface CharacterData {
    id?: string;
    name: string;
    role?: string;
    tone?: string;
    description?: string;
}

interface SpotConversation {
    spot_id: string;
    message_type: 'pre_puzzle' | 'post_puzzle';
    sequence: number;
    speaker_type: 'character' | 'narrator';
    speaker_name: string;
    message_text: string;
}

const AVAILABLE_LANGUAGES = [
    { code: 'en', name: '英語', flag: '🇺🇸' },
    { code: 'ko', name: '韓国語', flag: '🇰🇷' },
];

export default function CreatorMultilingual() {
    const navigate = useNavigate();
    const [questId, setQuestId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [activePreviewLang, setActivePreviewLang] = useState<string>('ja');

    // Quest data
    const [quest, setQuest] = useState<QuestData | null>(null);
    const [story, setStory] = useState<StoryData | null>(null);
    const [spots, setSpots] = useState<SpotData[]>([]);
    const [characters, setCharacters] = useState<CharacterData[]>([]);

    // Translations (mock - in real app, fetched from DB)
    const [translations, setTranslations] = useState<Record<string, { quest: QuestData | null; story: StoryData | null; spots: SpotData[]; characters: CharacterData[] }>>({});

    // Spot conversations
    const [spotConversations, setSpotConversations] = useState<SpotConversation[]>([]);

    // Expanded sections
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        basic: true,
        story: true,
        spots: false,
        characters: false,
        conversations: true,
    });

    // Expanded spots
    const [expandedSpots, setExpandedSpots] = useState<Record<string, boolean>>({});

    // Translation generation
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [generationSuccess, setGenerationSuccess] = useState(false);

    useEffect(() => {
        const loadQuest = async () => {
            setLoading(true);
            const storedQuestId = localStorage.getItem('creatorQuestId') || localStorage.getItem('quest-id');
            if (storedQuestId) {
                setQuestId(storedQuestId);

                // Load saved languages from AI Assistant
                const savedLanguages = localStorage.getItem(`quest-languages:${storedQuestId}`);
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

                // Fetch quest basic data
                const { data: questData } = await supabase
                    .from('quests')
                    .select('*')
                    .eq('id', storedQuestId)
                    .single();

                if (questData) {
                    setQuest({
                        id: questData.id,
                        title: questData.title || '',
                        description: questData.description || '',
                        area_name: questData.area_name || '',
                        difficulty: questData.difficulty || '',
                        target_audience: questData.target_audience || '',
                    });
                }

                // Fetch story data from story_timelines table
                const { data: storyData } = await supabase
                    .from('story_timelines')
                    .select('prologue, epilogue, prologue_title, cast_name, cast_tone, characters')
                    .eq('quest_id', storedQuestId)
                    .single();

                if (storyData) {
                    setStory({
                        prologue_title: storyData.prologue_title || '',
                        prologue: storyData.prologue || '',
                        epilogue: storyData.epilogue || '',
                        cast_name: storyData.cast_name || '',
                        cast_tone: storyData.cast_tone || '',
                        characters: storyData.characters || [],
                    });

                    // Set characters from story data
                    if (storyData.characters && Array.isArray(storyData.characters)) {
                        setCharacters(storyData.characters);
                    }
                }

                // Fetch spots with details
                const { data: spotsData } = await supabase
                    .from('spots')
                    .select('id, name, address, order_index')
                    .eq('quest_id', storedQuestId)
                    .order('order_index');

                if (spotsData && spotsData.length > 0) {
                    const spotIds = spotsData.map(s => s.id);
                    const { data: detailsData } = await supabase
                        .from('spot_details')
                        .select('spot_id, nav_text, story_text, question_text, hint_text, answer_text, completion_message')
                        .in('spot_id', spotIds);

                    const mergedSpots = spotsData.map(spot => {
                        const detail = detailsData?.find(d => d.spot_id === spot.id);
                        // Parse hint_text (stored as newline-separated string) into array
                        const hintsArray = detail?.hint_text ? detail.hint_text.split('\n').filter((h: string) => h.trim()) : [];
                        return {
                            ...spot,
                            story_intro: detail?.story_text || '',
                            challenge_text: detail?.question_text || '',
                            hints: hintsArray,
                            answer: detail?.answer_text || '',
                            success_message: detail?.completion_message || '',
                            directions: detail?.nav_text || '',
                        };
                    });
                    setSpots(mergedSpots as SpotData[]);

                    // Fetch spot conversations
                    const { data: conversationsData } = await supabase
                        .from('spot_story_messages')
                        .select('spot_id, message_type, sequence, speaker_type, speaker_name, message_text')
                        .in('spot_id', spotIds)
                        .order('sequence');

                    if (conversationsData) {
                        setSpotConversations(conversationsData as SpotConversation[]);
                    }
                }

                // Fetch existing translations
                const { data: questTranslations } = await supabase
                    .from('quest_translations')
                    .select('lang, title, description')
                    .eq('quest_id', storedQuestId);

                if (questTranslations && questTranslations.length > 0) {
                    const transObj: Record<string, { quest: QuestData | null; story: StoryData | null; spots: SpotData[]; characters: CharacterData[] }> = {};
                    for (const t of questTranslations) {
                        transObj[t.lang] = {
                            quest: questData ? { ...questData, title: t.title, description: t.description } as QuestData : null,
                            story: null,
                            spots: [],
                            characters: [],
                        };
                    }
                    setTranslations(transObj);
                }
            }
            setLoading(false);
        };
        loadQuest();
    }, []);

    const toggleLanguage = (langCode: string) => {
        setSelectedLanguages(prev =>
            prev.includes(langCode)
                ? prev.filter(l => l !== langCode)
                : [...prev, langCode]
        );
    };

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const toggleSpot = (spotId: string) => {
        setExpandedSpots(prev => ({ ...prev, [spotId]: !prev[spotId] }));
    };

    const generateTranslations = async () => {
        if (!questId || selectedLanguages.length === 0 || !quest) return;

        setIsGenerating(true);
        setGenerationError(null);
        setGenerationSuccess(false);

        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            setGenerationError('Gemini APIキーが設定されていません。');
            setIsGenerating(false);
            return;
        }

        try {
            for (const langCode of selectedLanguages) {
                const langName = AVAILABLE_LANGUAGES.find(l => l.code === langCode)?.name || langCode;

                // Build content to translate
                const contentToTranslate = {
                    title: quest.title,
                    description: quest.description,
                    prologue_title: story?.prologue_title || '',
                    prologue: story?.prologue || '',
                    epilogue: story?.epilogue || '',
                    cast_name: story?.cast_name || '',
                    spots: spots.map(s => ({
                        id: s.id,
                        name: s.name,
                        story_intro: s.story_intro,
                        challenge_text: s.challenge_text,
                        hints: s.hints,
                        success_message: s.success_message,
                        directions: s.directions,
                    })),
                };

                const prompt = `あなたはプロの翻訳者です。以下の日本語コンテンツを${langName}に翻訳してください。
地名や固有名詞は適切に翻訳またはそのまま残してください。
ゲームの謎解きやストーリーテリングの雰囲気を維持してください。

入力コンテンツ:
${JSON.stringify(contentToTranslate, null, 2)}

以下のJSON形式で出力してください:
\`\`\`json
{
  "title": "翻訳されたタイトル",
  "description": "翻訳された説明文",
  "prologue_title": "翻訳されたプロローグタイトル",
  "prologue": "翻訳されたプロローグ",
  "epilogue": "翻訳されたエピローグ",
  "cast_name": "翻訳されたキャスト名または原文のまま",
  "spots": [
    {
      "id": "スポットID（変更しない）",
      "name": "翻訳されたスポット名",
      "story_intro": "翻訳されたストーリー導入",
      "challenge_text": "翻訳された謎テキスト",
      "hints": ["翻訳されたヒント1", "翻訳されたヒント2"],
      "success_message": "翻訳された成功メッセージ",
      "directions": "翻訳された道案内"
    }
  ]
}
\`\`\``;

                const res = await fetch(
                    getModelEndpoint('translation', apiKey),
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                        }),
                    }
                );

                if (!res.ok) {
                    throw new Error(`API error: ${res.status}`);
                }

                const data = await res.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const jsonMatch = text.match(/```json([\s\S]*?)```/);
                const jsonText = jsonMatch ? jsonMatch[1] : text;
                const translated = JSON.parse(jsonText.trim());

                // Save to translations state
                setTranslations(prev => ({
                    ...prev,
                    [langCode]: {
                        quest: {
                            ...quest,
                            title: translated.title,
                            description: translated.description,
                        },
                        story: {
                            prologue_title: translated.prologue_title,
                            prologue: translated.prologue,
                            epilogue: translated.epilogue,
                            cast_name: translated.cast_name,
                            cast_tone: story?.cast_tone || '',
                            characters: characters,
                        },
                        spots: translated.spots.map((ts: any, idx: number) => ({
                            ...spots[idx],
                            name: ts.name,
                            story_intro: ts.story_intro,
                            challenge_text: ts.challenge_text,
                            hints: ts.hints || [],
                            success_message: ts.success_message,
                            directions: ts.directions,
                        })),
                        characters: characters,
                    },
                }));

                // Save to database
                await supabase.from('quest_translations').upsert({
                    quest_id: questId,
                    lang: langCode,
                    title: translated.title,
                    description: translated.description,
                });
            }

            setGenerationSuccess(true);
        } catch (err: any) {
            console.error('Translation error:', err);
            setGenerationError(err.message || '翻訳生成に失敗しました');
        } finally {
            setIsGenerating(false);
        }
    };

    const getDisplayContent = () => {
        if (activePreviewLang === 'ja') {
            return { quest, story, spots, characters };
        }
        return translations[activePreviewLang] || { quest: null, story: null, spots: [], characters: [] };
    };

    const displayContent = getDisplayContent();

    if (loading) {
        return (
            <section className="min-h-screen bg-stone-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-stone-500">読み込み中...</p>
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
                        <span className="text-brand-dark px-2 py-1 bg-brand-gold/10 rounded">Step 4: 多言語</span>
                        <span>›</span>
                        <span>Step 5: 確認</span>
                        <span>›</span>
                        <span>Step 6: 公開</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 container mx-auto px-4 md:px-8 py-8 max-w-5xl">
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => navigate('/creator/workspace')}
                        className="text-xs font-bold text-stone-500 hover:text-brand-dark flex items-center gap-1 transition-colors"
                    >
                        <span className="text-lg">‹</span> ワークスペースに戻る
                    </button>
                    <h1 className="text-3xl font-serif font-bold text-brand-dark">多言語オーサリング</h1>
                </div>

                {/* Language Selection */}
                <div className="mb-8 p-6 bg-white rounded-2xl border border-stone-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                            <Languages size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-brand-dark">対応言語を選択</h2>
                            <p className="text-sm text-stone-500">翻訳する言語を選択してください</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex items-center gap-2 px-4 py-3 bg-stone-100 rounded-xl opacity-75">
                            <div className="w-5 h-5 rounded bg-brand-gold flex items-center justify-center">
                                <Check size={14} className="text-white" />
                            </div>
                            <span className="text-sm font-medium whitespace-nowrap">🇯🇵 日本語（ベース）</span>
                        </div>

                        {AVAILABLE_LANGUAGES.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => toggleLanguage(lang.code)}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${selectedLanguages.includes(lang.code)
                                    ? 'bg-brand-gold/10 border-brand-gold text-brand-dark'
                                    : 'bg-white border-stone-200 hover:border-brand-gold/50'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center ${selectedLanguages.includes(lang.code)
                                    ? 'bg-brand-gold'
                                    : 'border border-stone-300'
                                    }`}>
                                    {selectedLanguages.includes(lang.code) && <Check size={14} className="text-white" />}
                                </div>
                                <span className="text-sm font-medium whitespace-nowrap">{lang.flag} {lang.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Preview */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                    {/* Language Toggle Tabs */}
                    <div className="flex border-b border-stone-200">
                        <button
                            onClick={() => setActivePreviewLang('ja')}
                            className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${activePreviewLang === 'ja'
                                ? 'bg-brand-gold/10 text-brand-dark border-b-2 border-brand-gold'
                                : 'text-stone-500 hover:bg-stone-50'
                                }`}
                        >
                            🇯🇵 日本語
                        </button>
                        {selectedLanguages.map(langCode => {
                            const lang = AVAILABLE_LANGUAGES.find(l => l.code === langCode);
                            return (
                                <button
                                    key={langCode}
                                    onClick={() => setActivePreviewLang(langCode)}
                                    className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${activePreviewLang === langCode
                                        ? 'bg-brand-gold/10 text-brand-dark border-b-2 border-brand-gold'
                                        : 'text-stone-500 hover:bg-stone-50'
                                        }`}
                                >
                                    {lang?.flag} {lang?.name}
                                    {!translations[langCode]?.quest && (
                                        <span className="ml-2 text-xs text-orange-500">（未翻訳）</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Sections */}
                    <div className="divide-y divide-stone-100">
                        {/* Basic Info Section */}
                        <div>
                            <button
                                onClick={() => toggleSection('basic')}
                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-brand-dark">📋 基本情報</span>
                                </div>
                                {expandedSections.basic ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            {expandedSections.basic && (
                                <div className="px-6 pb-6 space-y-4">
                                    {displayContent.quest ? (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-4 bg-stone-50 rounded-xl">
                                                    <label className="text-xs font-bold text-stone-500 mb-1 block">タイトル</label>
                                                    <p className="text-lg font-bold text-brand-dark">{displayContent.quest.title || '（未設定）'}</p>
                                                </div>
                                                <div className="p-4 bg-stone-50 rounded-xl">
                                                    <label className="text-xs font-bold text-stone-500 mb-1 block">エリア</label>
                                                    <p className="text-sm">{displayContent.quest.area_name || '（未設定）'}</p>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-stone-50 rounded-xl">
                                                <label className="text-xs font-bold text-stone-500 mb-1 block">説明文</label>
                                                <p className="text-sm text-stone-600 whitespace-pre-wrap">{displayContent.quest.description || '（未設定）'}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-stone-50 rounded-xl">
                                                    <label className="text-xs font-bold text-stone-500 mb-1 block">難易度</label>
                                                    <p className="text-sm">{displayContent.quest.difficulty || '（未設定）'}</p>
                                                </div>
                                                <div className="p-4 bg-stone-50 rounded-xl">
                                                    <label className="text-xs font-bold text-stone-500 mb-1 block">ターゲット</label>
                                                    <p className="text-sm">{displayContent.quest.target_audience || '（未設定）'}</p>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-stone-400 italic">翻訳データがありません。翻訳を実行してください。</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Story Section */}
                        <div>
                            <button
                                onClick={() => toggleSection('story')}
                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <BookOpen size={18} className="text-brand-gold" />
                                    <span className="font-bold text-brand-dark">ストーリー</span>
                                </div>
                                {expandedSections.story ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            {expandedSections.story && (
                                <div className="px-6 pb-6 space-y-4">
                                    {(activePreviewLang === 'ja' ? story : displayContent.story) ? (
                                        <>
                                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                                <label className="text-xs font-bold text-amber-700 mb-1 block">🎭 案内人（キャスト）</label>
                                                <p className="text-sm font-bold">{(activePreviewLang === 'ja' ? story : displayContent.story)?.cast_name || '（未設定）'}</p>
                                                {(activePreviewLang === 'ja' ? story : displayContent.story)?.cast_tone && (
                                                    <p className="text-xs text-stone-500 mt-1">口調: {(activePreviewLang === 'ja' ? story : displayContent.story)?.cast_tone}</p>
                                                )}
                                            </div>
                                            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                                <label className="text-xs font-bold text-indigo-700 mb-2 block">🎬 プロローグ</label>
                                                {(activePreviewLang === 'ja' ? story : displayContent.story)?.prologue_title && (
                                                    <p className="text-sm font-bold mb-2">{(activePreviewLang === 'ja' ? story : displayContent.story)?.prologue_title}</p>
                                                )}
                                                <p className="text-sm text-stone-600 whitespace-pre-wrap">{(activePreviewLang === 'ja' ? story : displayContent.story)?.prologue || '（未設定）'}</p>
                                            </div>
                                            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                                <label className="text-xs font-bold text-purple-700 mb-2 block">🌟 エピローグ</label>
                                                <p className="text-sm text-stone-600 whitespace-pre-wrap">{(activePreviewLang === 'ja' ? story : displayContent.story)?.epilogue || '（未設定）'}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-stone-400 italic">
                                            {activePreviewLang === 'ja' ? 'ストーリーが設定されていません。' : '翻訳データがありません。翻訳を実行してください。'}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Characters Section */}
                        <div>
                            <button
                                onClick={() => toggleSection('characters')}
                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Users size={18} className="text-brand-gold" />
                                    <span className="font-bold text-brand-dark">登場人物 ({(activePreviewLang === 'ja' ? characters : displayContent.characters).length}名)</span>
                                </div>
                                {expandedSections.characters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            {expandedSections.characters && (
                                <div className="px-6 pb-6">
                                    {(activePreviewLang === 'ja' ? characters : displayContent.characters).length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {(activePreviewLang === 'ja' ? characters : displayContent.characters).map((char, idx) => (
                                                <div key={char.id || idx} className="p-4 bg-stone-50 rounded-xl">
                                                    <p className="font-bold text-brand-dark">{char.name || '名前未設定'}</p>
                                                    {char.role && <p className="text-xs text-stone-500">{char.role}</p>}
                                                    {char.tone && <p className="text-xs text-amber-600 mt-1">口調: {char.tone}</p>}
                                                    {char.description && <p className="text-sm text-stone-600 mt-2">{char.description}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-stone-400 italic">登場人物が設定されていません。</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Spots Section */}
                        <div>
                            <button
                                onClick={() => toggleSection('spots')}
                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <MapPin size={18} className="text-brand-gold" />
                                    <span className="font-bold text-brand-dark">スポット ({(activePreviewLang === 'ja' ? spots : displayContent.spots).length}件)</span>
                                </div>
                                {expandedSections.spots ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            {expandedSections.spots && (
                                <div className="px-6 pb-6 space-y-3">
                                    {(activePreviewLang === 'ja' ? spots : displayContent.spots).length > 0 ? (
                                        (activePreviewLang === 'ja' ? spots : displayContent.spots).map((spot, idx) => (
                                            <div key={spot.id || idx} className="border border-stone-200 rounded-xl overflow-hidden">
                                                <button
                                                    onClick={() => toggleSpot(spot.id)}
                                                    className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-7 h-7 rounded-full bg-brand-gold text-white text-sm font-bold flex items-center justify-center">{idx + 1}</span>
                                                        <div className="text-left">
                                                            <p className="font-bold text-brand-dark">{spot.name || '（未設定）'}</p>
                                                            <p className="text-xs text-stone-500">{spot.address}</p>
                                                        </div>
                                                    </div>
                                                    {expandedSpots[spot.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </button>
                                                {expandedSpots[spot.id] && (
                                                    <div className="p-4 space-y-3 bg-white">
                                                        {spot.directions && (
                                                            <div>
                                                                <label className="text-xs font-bold text-stone-500 mb-1 block">📍 道案内</label>
                                                                <p className="text-sm text-stone-600">{spot.directions}</p>
                                                            </div>
                                                        )}
                                                        {spot.story_intro && (
                                                            <div>
                                                                <label className="text-xs font-bold text-stone-500 mb-1 block">📖 ストーリー導入</label>
                                                                <p className="text-sm text-stone-600">{spot.story_intro}</p>
                                                            </div>
                                                        )}
                                                        {spot.challenge_text && (
                                                            <div>
                                                                <label className="text-xs font-bold text-stone-500 mb-1 block">🧩 謎・チャレンジ</label>
                                                                <p className="text-sm text-stone-600">{spot.challenge_text}</p>
                                                            </div>
                                                        )}
                                                        {spot.hints && spot.hints.length > 0 && (
                                                            <div>
                                                                <label className="text-xs font-bold text-stone-500 mb-1 block">💡 ヒント</label>
                                                                <ul className="text-sm text-stone-600 list-disc list-inside">
                                                                    {spot.hints.map((hint, hIdx) => (
                                                                        <li key={hIdx}>{hint}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {spot.answer && (
                                                            <div>
                                                                <label className="text-xs font-bold text-stone-500 mb-1 block">✅ 正解</label>
                                                                <p className="text-sm text-stone-600 font-mono bg-stone-100 px-2 py-1 rounded">{spot.answer}</p>
                                                            </div>
                                                        )}
                                                        {spot.success_message && (
                                                            <div>
                                                                <label className="text-xs font-bold text-stone-500 mb-1 block">🎉 成功メッセージ</label>
                                                                <p className="text-sm text-stone-600">{spot.success_message}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-stone-400 italic">
                                            {activePreviewLang === 'ja' ? 'スポットが設定されていません。' : '翻訳データがありません。翻訳を実行してください。'}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Spot Conversations Section */}
                        <div>
                            <button
                                onClick={() => toggleSection('conversations')}
                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <MessageCircle size={18} className="text-brand-gold" />
                                    <span className="font-bold text-brand-dark">スポット会話</span>
                                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${spotConversations.length > 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {spotConversations.length > 0 ? `${spotConversations.length}件` : '未生成'}
                                    </span>
                                </div>
                                {expandedSections.conversations ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            {expandedSections.conversations && (
                                <div className="px-6 pb-6 space-y-4">
                                    {spotConversations.length > 0 ? (
                                        spots.map((spot, idx) => {
                                            const preMessages = spotConversations.filter(c => c.spot_id === spot.id && c.message_type === 'pre_puzzle');
                                            const postMessages = spotConversations.filter(c => c.spot_id === spot.id && c.message_type === 'post_puzzle');

                                            if (preMessages.length === 0 && postMessages.length === 0) return null;

                                            return (
                                                <div key={spot.id} className="border border-stone-200 rounded-xl overflow-hidden">
                                                    <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-7 h-7 rounded-full bg-brand-gold text-white text-sm font-bold flex items-center justify-center">{idx + 1}</span>
                                                            <p className="font-bold text-brand-dark">{spot.name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-4 space-y-4">
                                                        {preMessages.length > 0 && (
                                                            <div>
                                                                <label className="text-xs font-bold text-indigo-600 mb-2 block">🎬 謎解き前の会話</label>
                                                                <div className="space-y-2">
                                                                    {preMessages.map((msg, mIdx) => (
                                                                        <div key={mIdx} className={`p-3 rounded-lg ${msg.speaker_type === 'narrator' ? 'bg-stone-100 italic' : 'bg-indigo-50'}`}>
                                                                            <p className="text-xs font-bold text-stone-500 mb-1">{msg.speaker_name}</p>
                                                                            <p className="text-sm text-stone-700">{msg.message_text}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {postMessages.length > 0 && (
                                                            <div>
                                                                <label className="text-xs font-bold text-green-600 mb-2 block">🎉 謎解き後の会話</label>
                                                                <div className="space-y-2">
                                                                    {postMessages.map((msg, mIdx) => (
                                                                        <div key={mIdx} className={`p-3 rounded-lg ${msg.speaker_type === 'narrator' ? 'bg-stone-100 italic' : 'bg-green-50'}`}>
                                                                            <p className="text-xs font-bold text-stone-500 mb-1">{msg.speaker_name}</p>
                                                                            <p className="text-sm text-stone-700">{msg.message_text}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-6 text-center bg-stone-50 rounded-xl">
                                            <MessageCircle size={32} className="mx-auto text-stone-300 mb-3" />
                                            <p className="text-sm text-stone-500">スポット会話がまだ生成されていません。</p>
                                            <p className="text-xs text-stone-400 mt-1">AI Assistantでクエストを生成すると、各スポットの会話が自動生成されます。</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Generate Translation Button */}
                {selectedLanguages.length > 0 && (
                    <div className="mt-8 text-center">
                        <button
                            className={`px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 mx-auto ${isGenerating ? 'opacity-75 cursor-not-allowed' : ''}`}
                            onClick={generateTranslations}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    翻訳生成中...
                                </>
                            ) : (
                                <>
                                    <Globe size={20} />
                                    選択した言語で翻訳を生成
                                </>
                            )}
                        </button>
                        <p className="text-xs text-stone-500 mt-2">
                            AI翻訳を使用して、選択した言語のコンテンツを自動生成します
                        </p>

                        {generationError && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                ❌ {generationError}
                            </div>
                        )}

                        {generationSuccess && (
                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                                ✅ 翻訳の生成が完了しました！タブを切り替えて確認してください。
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mt-8 flex gap-4 justify-center">
                    <button
                        onClick={() => {
                            if (questId) {
                                localStorage.setItem(`step-status:${questId}:4`, 'in_progress');
                            }
                            navigate('/creator/workspace');
                        }}
                        className="px-8 py-3 rounded-xl border-2 border-brand-gold bg-white text-brand-gold font-bold text-sm hover:bg-brand-gold/5 transition-all"
                    >
                        一時保存する
                    </button>
                    <button
                        onClick={() => {
                            if (questId) {
                                localStorage.setItem(`step-status:${questId}:4`, 'completed');
                            }
                            navigate('/creator/workspace');
                        }}
                        disabled={selectedLanguages.length === 0}
                        title={selectedLanguages.length === 0 ? '言語を選択してください' : ''}
                        className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${selectedLanguages.length > 0
                            ? 'bg-brand-dark text-white hover:bg-brand-gold hover:shadow-lg hover:-translate-y-0.5'
                            : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                            }`}
                    >
                        完了する
                    </button>
                </div>
            </div>
        </section>
    );
}
