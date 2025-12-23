import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Wand2,
    MapPin,
    Clock,
    Loader2,
    BookOpen,
    CheckCircle,
    Send,
    Eye,
    Dices,
    Plus,
    Flame,
    ChevronDown,
    Edit,
    Users,
    X,
    Save,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthProvider';
import SectionCard from './SectionCard';
import {
    Section,
    SectionStatus,
    GenerationInput,
    INSPIRATION_TAGS,
} from './questCreatorTypes';
import { TomoshibiLogo } from './TomoshibiLogo';

interface QuestCreatorCanvasProps {
    questId: string | null;
    onBack: () => void;
    onLogoHome: () => void;
    onPublish: () => void;
    onTestRun: () => void;
}

interface BasicInfoData {
    title: string;
    description: string;
    area: string;
    difficulty: string;
    tags: string[];
}

interface SpotData {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    directions: string;
    storyText: string;
    challengeText: string;
    hints: string[];
    answer: string;
    successMessage: string;
}

interface StoryData {
    castName: string;
    castTone: string;
    prologueTitle: string;
    prologueBody: string;
    epilogueBody: string;
    characters: { id: string; name: string; role: string; color: string; tone: string; motivation?: string; sampleDialogue?: string }[];
}

// Google Maps API Key
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Map handler component for displaying route spots with polyline
// Pans to each new spot during generation, then fits all spots when complete
const RouteMapHandler = ({ spots, isGenerating = false }: { spots: SpotData[], isGenerating?: boolean }) => {
    const map = useMap();
    const maps = useMapsLibrary('maps');
    const [path, setPath] = useState<google.maps.Polyline | null>(null);
    const prevSpotCountRef = useRef<number>(0);
    const hasCompletedFitRef = useRef<boolean>(false);

    useEffect(() => {
        if (!map || !maps || spots.length === 0) return;

        // Update or create polyline
        if (path) {
            path.setPath(spots.map(s => ({ lat: s.lat, lng: s.lng })));
        } else {
            const line = new maps.Polyline({
                path: spots.map(s => ({ lat: s.lat, lng: s.lng })),
                geodesic: true,
                strokeColor: '#C9A227', // brand-gold
                strokeOpacity: 0.8,
                strokeWeight: 4,
            });
            line.setMap(map);
            setPath(line);
        }

        // If a new spot was added, pan to it
        if (spots.length > prevSpotCountRef.current) {
            const newSpot = spots[spots.length - 1];
            map.panTo({ lat: newSpot.lat, lng: newSpot.lng });
            map.setZoom(16); // Zoom in to show the new spot
            prevSpotCountRef.current = spots.length;
        }

        return () => {
            if (path && spots.length === 0) {
                path.setMap(null);
            }
        };
    }, [map, maps, spots, path]);

    // When generation is complete, fit all spots in view
    useEffect(() => {
        if (!map || spots.length === 0) return;

        // Fit bounds when generation is complete (isGenerating goes from true to false)
        // Or when we have all spots and haven't done the final fit yet
        if (!isGenerating && spots.length >= 7 && !hasCompletedFitRef.current) {
            // Small delay to let the last spot animation play
            const timer = setTimeout(() => {
                const bounds = new google.maps.LatLngBounds();
                spots.forEach(s => bounds.extend({ lat: s.lat, lng: s.lng }));
                map.fitBounds(bounds, 60);
                hasCompletedFitRef.current = true;
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [map, spots, isGenerating]);

    // Reset the completed fit flag when spots are cleared
    useEffect(() => {
        if (spots.length === 0) {
            hasCompletedFitRef.current = false;
            prevSpotCountRef.current = 0;
        }
    }, [spots.length]);

    return (
        <>
            {spots.map((spot, idx) => (
                <AdvancedMarker
                    key={spot.id}
                    position={{ lat: spot.lat, lng: spot.lng }}
                    title={spot.name}
                >
                    <motion.div
                        initial={{ scale: 0, y: -20 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ delay: idx * 0.15, type: 'spring', stiffness: 300 }}
                        className="w-10 h-10 rounded-full bg-brand-gold text-white text-sm font-bold flex items-center justify-center shadow-lg border-2 border-white"
                    >
                        {idx + 1}
                    </motion.div>
                </AdvancedMarker>
            ))}
        </>
    );
};

// Content type options (like Suno's Audio/Lyrics/Instrumental)
const CONTENT_OPTIONS = [
    { id: 'spots', label: 'スポット', icon: MapPin, active: true },
    { id: 'story', label: 'ストーリー', icon: BookOpen, active: true },
    { id: 'mystery', label: '謎', icon: Sparkles, active: true },
];

export default function QuestCreatorCanvas({
    questId,
    onBack,
    onLogoHome,
    onPublish,
    onTestRun,
}: QuestCreatorCanvasProps) {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Input state
    const [mode, setMode] = useState<'simple' | 'custom'>('simple');
    const [prompt, setPrompt] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [activeContentOptions, setActiveContentOptions] = useState<string[]>(['spots', 'story', 'mystery']);

    // Custom constraints
    const [constraints, setConstraints] = useState({
        duration: 60,
        difficulty: 'medium' as 'easy' | 'medium' | 'hard',
        spotCount: 10,
    });

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationPhase, setGenerationPhase] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Generated content
    const [basicInfo, setBasicInfo] = useState<BasicInfoData | null>(null);
    const [spots, setSpots] = useState<SpotData[]>([]);
    const [story, setStory] = useState<StoryData | null>(null);

    // Section states
    const [sectionStates, setSectionStates] = useState<Record<string, SectionStatus>>({});
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

    // Mobile tab state
    const [activeTab, setActiveTab] = useState<'input' | 'canvas'>('input');

    // Edit form states
    const [editBasicInfo, setEditBasicInfo] = useState<BasicInfoData | null>(null);
    const [editSpots, setEditSpots] = useState<Record<string, SpotData>>({});
    const [editStory, setEditStory] = useState<StoryData | null>(null);

    // Credits (mock for now)
    const [credits] = useState(50);

    // Content tab state (route / story / mystery)
    const [contentTab, setContentTab] = useState<'route' | 'story' | 'mystery'>('route');

    // Selected spot for detail view
    const [selectedSpotIndex, setSelectedSpotIndex] = useState<number | null>(null);

    // Character edit slide-over state
    const [characterEditOpen, setCharacterEditOpen] = useState(false);
    const [focusedCharacterId, setFocusedCharacterId] = useState<string | null>(null);

    // Checklist completion state
    const [checklistState, setChecklistState] = useState<Record<string, boolean>>({
        title: false,
        spots: false,
        mystery: false,
        story: false,
        preview: false,
    });

    // Saving state
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const hasContent = basicInfo !== null || spots.length > 0 || story !== null;

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const toggleContentOption = (optionId: string) => {
        setActiveContentOptions((prev) =>
            prev.includes(optionId)
                ? prev.filter((id) => id !== optionId)
                : [...prev, optionId]
        );
    };

    const toggleCollapse = (sectionId: string) => {
        setCollapsedSections((prev) => {
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    };

    const generateRandomPrompt = () => {
        const prompts = [
            '渋谷のストリートカルチャーを巡るミステリー。消えたグラフィティアーティストの謎',
            '鎌倉の古刹を巡る歴史ミステリー。鎌倉時代の秘宝を探せ',
            '下北沢のカフェ巡りクエスト。隠れ家カフェのマスターが残した暗号',
            '浅草の夜を彩るナイトクエスト。江戸の怪談をたどる',
            '横浜赤レンガ倉庫エリアの謎解き。貿易商が残した暗号文書',
        ];
        setPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
    };

    const startEdit = (sectionId: string) => {
        setEditingSection(sectionId);
        setSectionStates((prev) => ({ ...prev, [sectionId]: 'editing' }));

        if (sectionId === 'basic-info' && basicInfo) {
            setEditBasicInfo({ ...basicInfo });
        } else if (sectionId.startsWith('spot-')) {
            const spotIndex = parseInt(sectionId.replace('spot-', ''), 10);
            const spot = spots[spotIndex];
            if (spot) {
                setEditSpots((prev) => ({ ...prev, [sectionId]: { ...spot } }));
            }
        } else if (sectionId === 'story' && story) {
            setEditStory({ ...story });
        }
    };

    const cancelEdit = (sectionId: string) => {
        setEditingSection(null);
        setSectionStates((prev) => ({ ...prev, [sectionId]: 'ready' }));
        setEditBasicInfo(null);
        setEditSpots((prev) => {
            const next = { ...prev };
            delete next[sectionId];
            return next;
        });
        setEditStory(null);
    };

    const saveEdit = async (sectionId: string) => {
        if (sectionId === 'basic-info' && editBasicInfo) {
            setBasicInfo(editBasicInfo);
            if (questId) {
                await supabase.from('quests').update({
                    title: editBasicInfo.title,
                    description: editBasicInfo.description,
                    area_name: editBasicInfo.area,
                    tags: editBasicInfo.tags,
                }).eq('id', questId);
            }
        } else if (sectionId.startsWith('spot-')) {
            const spotIndex = parseInt(sectionId.replace('spot-', ''), 10);
            const editedSpot = editSpots[sectionId];
            if (editedSpot) {
                setSpots((prev) => {
                    const next = [...prev];
                    next[spotIndex] = editedSpot;
                    return next;
                });
            }
        } else if (sectionId === 'story' && editStory) {
            setStory(editStory);
        }

        setEditingSection(null);
        setSectionStates((prev) => ({ ...prev, [sectionId]: 'ready' }));
        setEditBasicInfo(null);
        setEditSpots((prev) => {
            const next = { ...prev };
            delete next[sectionId];
            return next;
        });
        setEditStory(null);
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('プロンプトを入力してください');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setActiveTab('canvas');

        // Demo mock data based on user prompt
        const demoData = {
            title: `${prompt.slice(0, 20)}...の謎解きクエスト`,
            description: `${prompt}をテーマにした、街歩きと謎解きを組み合わせたインタラクティブなクエストです。歴史的な場所を巡りながら、隠された秘密を解き明かしましょう。`,
            area: '渋谷・原宿エリア',
            difficulty: constraints.difficulty === 'easy' ? '初級' : constraints.difficulty === 'medium' ? '中級' : '上級',
            // Add location keywords (prefecture, city, ward) + selected tags
            tags: ['東京都', '渋谷区', '原宿', ...(selectedTags.length > 0 ? selectedTags : ['ミステリー', '街歩き'])],
            routeSpots: [
                {
                    name: '明治神宮 大鳥居',
                    address: '東京都渋谷区代々木神園町1-1',
                    lat: 35.6764,
                    lng: 139.6993,
                    directions: '原宿駅から徒歩5分。大きな鳥居が目印です。',
                    storyText: '物語はここから始まる。100年の歴史を持つこの場所に、失われた宝の最初の手がかりが隠されている...',
                    challengeText: 'この鳥居の高さは何メートル？ヒント：日本最大の木造鳥居です。',
                    hints: ['周囲の案内板を確認してみましょう', '12メートルを超えています'],
                    answer: '12',
                    successMessage: '正解！次の目的地へ進みましょう。'
                },
                {
                    name: '竹下通り入口',
                    address: '東京都渋谷区神宮前1丁目',
                    lat: 35.6702,
                    lng: 139.7026,
                    directions: '原宿駅竹下口から直進。カラフルな看板が目印。',
                    storyText: '若者文化の発信地。ここで2つ目の暗号が見つかるという...',
                    challengeText: '竹下通りの長さは約何メートル？',
                    hints: ['350mから400mの間です', 'ゆっくり歩いて5分程度'],
                    answer: '350',
                    successMessage: '素晴らしい！謎が解けてきました。'
                },
                {
                    name: '表参道ヒルズ',
                    address: '東京都渋谷区神宮前4-12-10',
                    lat: 35.6677,
                    lng: 139.7089,
                    directions: '表参道駅A2出口から徒歩2分。',
                    storyText: '安藤忠雄が設計したこの建物には、秘密の通路があるという噂が...',
                    challengeText: 'この建物を設計した建築家の名前は？',
                    hints: ['日本を代表する建築家', '名前は「忠雄」'],
                    answer: '安藤忠雄',
                    successMessage: '完璧！次の手がかりへ。'
                },
                {
                    name: '東郷神社',
                    address: '東京都渋谷区神宮前1-5-3',
                    lat: 35.6716,
                    lng: 139.7048,
                    directions: '竹下通りから徒歩3分。静かな神社です。',
                    storyText: '日露戦争の英雄を祀るこの神社には、知られざる歴史が眠っている...',
                    challengeText: 'この神社に祀られている人物の苗字は？',
                    hints: ['日露戦争で活躍した海軍大将', '平'],
                    answer: '東郷',
                    successMessage: '歴史を紐解いていきます。'
                },
                {
                    name: 'キャットストリート',
                    address: '東京都渋谷区神宮前5丁目',
                    lat: 35.6665,
                    lng: 139.7065,
                    directions: '表参道から渋谷方面へ。おしゃれなショップが並ぶ通り。',
                    storyText: 'かつて渋谷川だったこの場所。川の記憶が次のヒントを教えてくれる...',
                    challengeText: 'この通りの正式名称は「旧○○川遊歩道」？',
                    hints: ['かつては川でした', '「しぶや」と読みます'],
                    answer: '渋谷',
                    successMessage: '川の記憶をたどって進みましょう。'
                },
                {
                    name: '渋谷ヒカリエ',
                    address: '東京都渋谷区渋谷2-21-1',
                    lat: 35.6590,
                    lng: 139.7038,
                    directions: '渋谷駅直結。高層ビルが目印。',
                    storyText: '未来と過去が交差する場所。展望台から見える景色に最後のヒントが...',
                    challengeText: 'ヒカリエの11階にある展望スペースの名前は？',
                    hints: ['「スカイ」がつきます', '無料で入れます'],
                    answer: 'スカイロビー',
                    successMessage: 'あと一歩で宝に辿り着きます！'
                },
                {
                    name: 'ハチ公像',
                    address: '東京都渋谷区道玄坂1丁目',
                    lat: 35.6590,
                    lng: 139.7006,
                    directions: '渋谷駅ハチ公口すぐ。待ち合わせの定番スポット。',
                    storyText: '忠犬ハチ公の物語が、この冒険の結末を見届ける...',
                    challengeText: 'ハチ公が亡くなった年は西暦何年？',
                    hints: ['1930年代です', '昭和10年'],
                    answer: '1935',
                    successMessage: 'おめでとうございます！すべての謎を解き明かしました！'
                }
            ],
            story: {
                castName: '謎の案内人・灯火',
                castTone: '知的で少しミステリアスな口調',
                prologueTitle: '失われた宝の伝説',
                prologueBody: 'この街には、100年前に隠された宝があるという伝説があります。あなたは偶然手に入れた古い地図を頼りに、その謎を解き明かす冒険に出ることになりました...',
                epilogueBody: 'おめでとうございます！すべての謎を解き明かしました。宝は物質的なものではなく、この旅で得た経験と知識でした。',
                characters: [
                    { id: 'c1', name: '灯火', role: '案内人', color: 'bg-brand-gold', tone: 'ミステリアス・知的', motivation: '真実を求める者を導く', sampleDialogue: '真実は、見える場所にはない...探求せよ' },
                    { id: 'c2', name: '歴史博士', role: 'ヒント提供者', color: 'bg-emerald-500', tone: '丁寧・博識', motivation: '歴史の知識を伝承する', sampleDialogue: 'お答えしましょう。この地には...' }
                ]
            }
        };

        try {
            // Reset state
            setBasicInfo(null);
            setSpots([]);
            setStory(null);

            // Phase 1: Basic Info generating
            setSectionStates({ 'basic-info': 'generating' });
            setGenerationPhase('基本情報を生成中...');
            await new Promise((r) => setTimeout(r, 1200));

            // Show basic info as ready
            setBasicInfo({
                title: demoData.title,
                description: demoData.description,
                area: demoData.area,
                difficulty: demoData.difficulty,
                tags: demoData.tags,
            });
            setSectionStates({ 'basic-info': 'ready' });

            // Phase 2: Spots generating one by one
            setGenerationPhase('スポットを生成中...');
            const mappedSpots: SpotData[] = [];

            for (let i = 0; i < demoData.routeSpots.length; i++) {
                // Show this spot as generating
                setSectionStates((prev) => ({ ...prev, [`spot-${i}`]: 'generating' }));
                await new Promise((r) => setTimeout(r, 800));

                // Add spot and mark as ready
                const s = demoData.routeSpots[i];
                const newSpot: SpotData = {
                    id: `spot-${i}`,
                    name: s.name,
                    address: s.address,
                    lat: s.lat,
                    lng: s.lng,
                    directions: s.directions,
                    storyText: s.storyText,
                    challengeText: s.challengeText,
                    hints: s.hints,
                    answer: s.answer,
                    successMessage: s.successMessage,
                };
                mappedSpots.push(newSpot);
                setSpots([...mappedSpots]);
                setSectionStates((prev) => ({ ...prev, [`spot-${i}`]: 'ready' }));
            }

            // Phase 3: Story generating
            setGenerationPhase('ストーリーを構築中...');
            setSectionStates((prev) => ({ ...prev, 'story': 'generating' }));
            await new Promise((r) => setTimeout(r, 1000));

            setStory({
                castName: demoData.story.castName,
                castTone: demoData.story.castTone,
                prologueTitle: demoData.story.prologueTitle,
                prologueBody: demoData.story.prologueBody,
                epilogueBody: demoData.story.epilogueBody,
                characters: demoData.story.characters,
            });
            setSectionStates((prev) => ({ ...prev, 'story': 'ready' }));

            setGenerationPhase('');

        } catch (err: any) {
            console.error('Generation error:', err);
            setError(err.message || '生成に失敗しました');
            setSectionStates({});
        } finally {
            setIsGenerating(false);
        }
    };

    const saveToDatabase = async (qId: string, result: any, mappedSpots: SpotData[]) => {
        try {
            // Use upsert to create or update the quest, include creator_id for profile listing
            await supabase.from('quests').upsert({
                id: qId,
                creator_id: user?.id,
                title: result.title,
                description: result.description,
                area_name: result.area,
                tags: result.tags,
                status: 'draft',
                mode: 'PRIVATE',
            }, { onConflict: 'id' });

            const spotRows = mappedSpots.map((s, idx) => ({
                id: crypto.randomUUID(),
                quest_id: qId,
                name: s.name,
                address: s.address,
                lat: s.lat,
                lng: s.lng,
                order_index: idx + 1,
                status: 'draft',
            }));

            await supabase.from('spots').delete().eq('quest_id', qId);
            const { data: insertedSpots } = await supabase.from('spots').insert(spotRows).select('id');

            if (insertedSpots) {
                const detailRows = insertedSpots.map((spot, idx) => ({
                    id: spot.id,
                    spot_id: spot.id,
                    nav_text: mappedSpots[idx]?.directions || '',
                    story_text: mappedSpots[idx]?.storyText || '',
                    question_text: mappedSpots[idx]?.challengeText || '',
                    hint_text: mappedSpots[idx]?.hints?.join('\n') || '',
                    answer_text: mappedSpots[idx]?.answer || '',
                    completion_message: mappedSpots[idx]?.successMessage || '',
                    answer_type: 'text',
                }));
                await supabase.from('spot_details').upsert(detailRows);
            }

            if (result.story) {
                await supabase.from('story_timelines').upsert({
                    quest_id: qId,
                    prologue: result.story.prologueBody,
                    epilogue: result.story.epilogueBody,
                    cast_name: result.story.castName,
                    cast_tone: result.story.castTone,
                    characters: result.story.characters,
                });
            }
        } catch (err) {
            console.error('Save to DB error:', err);
        }
    };

    // Manual save handler
    const handleSaveQuest = async () => {
        if (!questId || !basicInfo) {
            setSaveMessage('保存するコンテンツがありません');
            setTimeout(() => setSaveMessage(null), 3000);
            return;
        }

        setIsSaving(true);
        setSaveMessage(null);

        try {
            // Build result object from current state
            const result = {
                title: basicInfo.title,
                description: basicInfo.description,
                area: basicInfo.area,
                tags: basicInfo.tags,
                story: story ? {
                    prologueBody: story.prologueBody,
                    epilogueBody: story.epilogueBody,
                    castName: story.castName,
                    castTone: story.castTone,
                    characters: story.characters,
                } : null,
            };

            await saveToDatabase(questId, result, spots);
            setSaveMessage('保存しました！');
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (err) {
            console.error('Save error:', err);
            setSaveMessage('保存に失敗しました');
            setTimeout(() => setSaveMessage(null), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-white pt-16">
            {/* Main Content - uses shared header from LandingPage */}
            <div className="min-h-screen">
                <div className="flex flex-col md:flex-row">
                    {/* Left Panel - Input */}
                    <div
                        className={`w-full md:w-[380px] md:min-h-screen md:border-r border-stone-200 bg-white md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:overflow-y-auto ${activeTab === 'input' ? 'block' : 'hidden md:block'
                            }`}
                    >
                        <div className="p-5 pt-12 space-y-5">
                            {/* Mode toggle - visible on all screen sizes */}
                            <div className="flex items-center bg-stone-100 rounded-full p-0.5">
                                <button
                                    onClick={() => setMode('simple')}
                                    className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${mode === 'simple'
                                        ? 'bg-white text-brand-dark shadow-sm'
                                        : 'text-stone-500'
                                        }`}
                                >
                                    Simple
                                </button>
                                <button
                                    onClick={() => setMode('custom')}
                                    className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${mode === 'custom'
                                        ? 'bg-white text-brand-dark shadow-sm'
                                        : 'text-stone-500'
                                        }`}
                                >
                                    Custom
                                </button>
                            </div>

                            {/* Quest Description (like Song Description) */}
                            <div className="relative">
                                <label className="block text-xs font-medium text-stone-500 mb-2">
                                    Quest Description
                                </label>
                                <div className="relative">
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="例: 浅草で歴史を巡るミステリー。江戸時代の商人が残した謎を解き明かす..."
                                        className="w-full h-28 p-3 pr-10 rounded-xl border border-stone-200 text-sm text-brand-dark placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold resize-none"
                                    />
                                    {/* Random/Dice button (like Suno) */}
                                    <button
                                        onClick={generateRandomPrompt}
                                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-brand-dark transition-colors"
                                        title="ランダム生成"
                                    >
                                        <Dices size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Content options (like Suno's + Audio, + Lyrics, Instrumental) */}
                            <div className="flex flex-wrap gap-2">
                                {CONTENT_OPTIONS.map((option) => {
                                    const Icon = option.icon;
                                    const isActive = activeContentOptions.includes(option.id);
                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => toggleContentOption(option.id)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isActive
                                                ? 'bg-brand-dark text-white'
                                                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                                                }`}
                                        >
                                            {!isActive && <Plus size={12} />}
                                            <Icon size={12} />
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Custom Constraints */}
                            <AnimatePresence>
                                {mode === 'custom' && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="space-y-4 p-4 bg-stone-50 rounded-xl border border-stone-100">
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wide mb-1">
                                                        Duration
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={14} className="text-stone-400" />
                                                        <input
                                                            type="number"
                                                            value={constraints.duration}
                                                            onChange={(e) =>
                                                                setConstraints((c) => ({ ...c, duration: parseInt(e.target.value) || 60 }))
                                                            }
                                                            className="w-16 px-2 py-1 rounded-lg border border-stone-200 text-xs"
                                                        />
                                                        <span className="text-xs text-stone-400">min</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wide mb-1">
                                                        Spots
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={14} className="text-stone-400" />
                                                        <input
                                                            type="number"
                                                            value={constraints.spotCount}
                                                            onChange={(e) =>
                                                                setConstraints((c) => ({ ...c, spotCount: parseInt(e.target.value) || 10 }))
                                                            }
                                                            className="w-16 px-2 py-1 rounded-lg border border-stone-200 text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wide mb-2">
                                                    Difficulty
                                                </label>
                                                <div className="flex gap-1">
                                                    {(['easy', 'medium', 'hard'] as const).map((d) => (
                                                        <button
                                                            key={d}
                                                            onClick={() => setConstraints((c) => ({ ...c, difficulty: d }))}
                                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${constraints.difficulty === d
                                                                ? 'bg-brand-dark text-white'
                                                                : 'bg-white text-stone-400 hover:bg-stone-100 border border-stone-200'
                                                                }`}
                                                        >
                                                            {d === 'easy' ? 'Easy' : d === 'medium' ? 'Medium' : 'Hard'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Inspiration (like Suno) */}
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-2">
                                    Inspiration
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {INSPIRATION_TAGS.map((tag) => (
                                        <button
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${selectedTags.includes(tag)
                                                ? 'bg-brand-gold text-white'
                                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                                }`}
                                        >
                                            {!selectedTags.includes(tag) && <Plus size={10} />}
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="p-3 rounded-lg bg-rose-50 text-rose-600 text-xs">
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Create Button (like Suno) */}
                        <div className="sticky bottom-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !prompt.trim()}
                                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isGenerating || !prompt.trim()
                                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-brand-dark to-stone-700 text-white hover:from-brand-gold hover:to-amber-600 shadow-lg shadow-brand-dark/20'
                                    }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        {generationPhase || 'Creating...'}
                                    </>
                                ) : (
                                    <>
                                        <Wand2 size={16} />
                                        Create
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Panel - Dashboard Workspace */}
                    <div
                        className={`flex-1 min-h-screen bg-stone-50 ${activeTab === 'canvas' ? 'block' : 'hidden md:block'
                            }`}
                    >
                        {/* Content area */}
                        <div className="p-4 md:p-6 min-h-[calc(100vh-4rem)] overflow-y-auto">
                            {!hasContent && !isGenerating ? (
                                /* Empty State */
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]"
                                >
                                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                                        <Sparkles size={32} className="text-stone-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-stone-400 mb-2">
                                        まだ何も生成されていません
                                    </h3>
                                    <p className="text-sm text-stone-400">
                                        左パネルでプロンプトを入力して、クエストを生成しましょう
                                    </p>
                                </motion.div>
                            ) : (
                                /* Dashboard Content */
                                <div className="space-y-4">
                                    {/* Generation Progress (when generating) */}
                                    {isGenerating && generationPhase && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-gradient-to-r from-brand-gold/10 to-amber-50 rounded-2xl border border-brand-gold/30 p-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-brand-gold/20 flex items-center justify-center">
                                                    <Loader2 size={20} className="animate-spin text-brand-gold" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-brand-dark">{generationPhase}</p>
                                                    <p className="text-xs text-stone-500">AIがクエストを生成しています...</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* 1. Quest Highlight Card - Editable */}
                                    {basicInfo && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden hover:border-brand-gold/50 hover:shadow-md transition-all cursor-pointer group"
                                        >
                                            {/* Editable Header */}
                                            <div className="px-5 py-3 bg-gradient-to-r from-brand-gold/5 to-amber-50 border-b border-stone-100 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Edit size={14} className="text-brand-gold" />
                                                    <span className="text-xs font-bold text-brand-gold">クリックして編集</span>
                                                </div>
                                                <span className="text-[10px] text-stone-500">📍 {basicInfo.area}</span>
                                            </div>
                                            {/* Content */}
                                            <div className="p-5">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex-1">
                                                        <h2 className="text-xl font-bold text-brand-dark mb-2 group-hover:text-brand-gold transition-colors">{basicInfo.title}</h2>
                                                        <p className="text-sm text-stone-600 leading-relaxed">{basicInfo.description}</p>
                                                    </div>
                                                </div>
                                                {/* All stats and tags in one row */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 rounded-lg">
                                                        <Clock size={14} className="text-stone-500" />
                                                        <span className="text-xs font-bold text-stone-700">60分</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 rounded-lg">
                                                        <MapPin size={14} className="text-emerald-500" />
                                                        <span className="text-xs font-bold text-stone-700">{spots.length}スポット</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 rounded-lg">
                                                        <Flame size={14} className="text-amber-600" />
                                                        <span className="text-xs font-bold text-amber-700">{basicInfo.difficulty}</span>
                                                    </div>
                                                    {/* Location Tags */}
                                                    {basicInfo.tags.slice(0, 3).map((tag) => (
                                                        <span key={tag} className="px-2.5 py-1.5 bg-blue-50 rounded-lg text-xs font-bold text-blue-600">
                                                            📍 {tag}
                                                        </span>
                                                    ))}
                                                    {/* Category Tags */}
                                                    {basicInfo.tags.slice(3).map((tag) => (
                                                        <span key={tag} className="px-2.5 py-1.5 bg-brand-gold/10 rounded-lg text-xs font-bold text-brand-gold">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}


                                    {/* Content Tabs */}
                                    {hasContent && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
                                        >
                                            {/* Tab Navigation */}
                                            <div className="flex border-b border-stone-100">
                                                {[
                                                    { id: 'route', label: 'ルート', icon: MapPin },
                                                    { id: 'story', label: 'ストーリー', icon: BookOpen },
                                                    { id: 'mystery', label: '謎・テスト', icon: Dices },
                                                ].map((tab) => (
                                                    <button
                                                        key={tab.id}
                                                        onClick={() => setContentTab(tab.id as 'route' | 'story' | 'mystery')}
                                                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all ${contentTab === tab.id
                                                            ? 'text-brand-gold border-b-2 border-brand-gold bg-brand-gold/5'
                                                            : 'text-stone-500 hover:text-brand-dark hover:bg-stone-50'
                                                            }`}
                                                    >
                                                        <tab.icon size={16} />
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Tab Content */}
                                            <div className="p-0">
                                                <AnimatePresence mode="wait">
                                                    {/* Route Tab */}
                                                    {contentTab === 'route' && spots.length > 0 && (
                                                        <motion.div
                                                            key="route"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="flex h-[calc(100vh-320px)] min-h-[450px]"
                                                        >
                                                            {/* Map */}
                                                            <div className="flex-1 relative">
                                                                <APIProvider apiKey={MAPS_API_KEY}>
                                                                    <Map
                                                                        mapId="4f910f9227657629"
                                                                        defaultCenter={{ lat: 35.6764, lng: 139.6993 }}
                                                                        defaultZoom={14}
                                                                        gestureHandling={'greedy'}
                                                                        disableDefaultUI={true}
                                                                        className="w-full h-full"
                                                                    >
                                                                        <RouteMapHandler spots={spots} isGenerating={isGenerating} />
                                                                    </Map>
                                                                </APIProvider>
                                                            </div>
                                                            {/* Spot List */}
                                                            <div className="w-80 border-l border-stone-100 overflow-y-auto">
                                                                <div className="p-3 space-y-2">
                                                                    {spots.map((spot, idx) => (
                                                                        <motion.div
                                                                            key={spot.id}
                                                                            initial={{ opacity: 0, x: 20 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: idx * 0.1 }}
                                                                            onClick={() => setSelectedSpotIndex(selectedSpotIndex === idx ? null : idx)}
                                                                            className={`p-3 rounded-xl cursor-pointer transition-all ${selectedSpotIndex === idx
                                                                                ? 'bg-brand-gold/10 border border-brand-gold/30'
                                                                                : 'bg-stone-50 border border-stone-100 hover:border-brand-gold/20'
                                                                                }`}
                                                                        >
                                                                            <div className="flex items-start gap-2">
                                                                                <div className="w-6 h-6 rounded-full bg-brand-gold text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                                                    {idx + 1}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <h5 className="font-bold text-xs text-brand-dark truncate">{spot.name}</h5>
                                                                                    <p className="text-[10px] text-stone-500 truncate">{spot.address}</p>
                                                                                </div>
                                                                            </div>
                                                                            {/* Expanded Details */}
                                                                            <AnimatePresence>
                                                                                {selectedSpotIndex === idx && (
                                                                                    <motion.div
                                                                                        initial={{ height: 0, opacity: 0 }}
                                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                                        exit={{ height: 0, opacity: 0 }}
                                                                                        className="mt-3 pt-3 border-t border-stone-200 space-y-2"
                                                                                    >
                                                                                        <div>
                                                                                            <p className="text-[10px] font-bold text-stone-400 uppercase mb-0.5">ストーリー</p>
                                                                                            <p className="text-xs text-stone-600 line-clamp-2">{spot.storyText}</p>
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-[10px] font-bold text-stone-400 uppercase mb-0.5">謎</p>
                                                                                            <p className="text-xs text-brand-dark">{spot.challengeText}</p>
                                                                                            <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600">
                                                                                                <CheckCircle size={8} />
                                                                                                <span>正解: {spot.answer}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex gap-1 pt-1">
                                                                                            <button className="px-2 py-1 rounded bg-stone-100 text-[10px] font-bold text-stone-600 hover:bg-stone-200">編集</button>
                                                                                            <button className="px-2 py-1 rounded bg-stone-100 text-[10px] font-bold text-stone-600 hover:bg-stone-200">再生成</button>
                                                                                            <button className="px-2 py-1 rounded bg-brand-gold/10 text-[10px] font-bold text-brand-gold hover:bg-brand-gold/20">試走</button>
                                                                                        </div>
                                                                                    </motion.div>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </motion.div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                    {/* Story Tab */}
                                                    {contentTab === 'story' && story && (
                                                        <motion.div
                                                            key="story"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="flex flex-col max-h-[calc(100vh-320px)] min-h-[450px]"
                                                        >
                                                            {/* Story Timeline - Fixed at top */}
                                                            <div className="p-4 border-b border-stone-100 bg-gradient-to-r from-stone-50 to-white">
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <Sparkles size={14} className="text-brand-gold" />
                                                                    <span className="text-xs font-bold text-stone-600">ストーリーマップ</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                                                                    {/* Prologue Node */}
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedSpotIndex(-1);
                                                                            document.getElementById('scene-prologue')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                        }}
                                                                        className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all ${selectedSpotIndex === -1
                                                                            ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'
                                                                            : 'bg-stone-100 text-stone-600 hover:bg-amber-50'
                                                                            }`}
                                                                    >
                                                                        <div className="text-[10px] opacity-60">導入</div>
                                                                        <div>P</div>
                                                                    </button>
                                                                    <div className="w-4 h-0.5 bg-stone-200 flex-shrink-0" />

                                                                    {/* Spot Nodes */}
                                                                    {spots.map((spot, idx) => (
                                                                        <React.Fragment key={spot.id}>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedSpotIndex(idx);
                                                                                    document.getElementById(`scene-spot-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                                }}
                                                                                className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all ${selectedSpotIndex === idx
                                                                                    ? 'bg-brand-gold text-white ring-2 ring-brand-gold/50'
                                                                                    : 'bg-stone-100 text-stone-600 hover:bg-brand-gold/10'
                                                                                    }`}
                                                                            >
                                                                                <div className="text-[10px] opacity-60">
                                                                                    {idx === 0 ? '発見' : idx === spots.length - 1 ? '山場' : idx < 3 ? '展開' : '激化'}
                                                                                </div>
                                                                                <div>{idx + 1}</div>
                                                                            </button>
                                                                            {idx < spots.length - 1 && (
                                                                                <div className="w-4 h-0.5 bg-stone-200 flex-shrink-0" />
                                                                            )}
                                                                        </React.Fragment>
                                                                    ))}

                                                                    <div className="w-4 h-0.5 bg-stone-200 flex-shrink-0" />
                                                                    {/* Epilogue Node */}
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedSpotIndex(spots.length);
                                                                            document.getElementById('scene-epilogue')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                        }}
                                                                        className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all ${selectedSpotIndex === spots.length
                                                                            ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300'
                                                                            : 'bg-stone-100 text-stone-600 hover:bg-emerald-50'
                                                                            }`}
                                                                    >
                                                                        <div className="text-[10px] opacity-60">結末</div>
                                                                        <div>E</div>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Scrollable Content */}
                                                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                                                {/* Enhanced Character Summary - Always Visible */}
                                                                {story.characters.length > 0 && (
                                                                    <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200">
                                                                        <div className="flex items-center justify-between mb-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <Users size={16} className="text-purple-600" />
                                                                                <span className="text-sm font-bold text-purple-900">登場人物</span>
                                                                                <span className="text-xs text-purple-500">この物語に登場</span>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => setCharacterEditOpen(true)}
                                                                                className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 rounded-lg text-xs font-bold text-purple-700 hover:bg-purple-200 transition-colors"
                                                                            >
                                                                                <Edit size={12} /> 人物を編集
                                                                            </button>
                                                                        </div>
                                                                        <div className="flex gap-3 overflow-x-auto pb-1">
                                                                            {story.characters.map((c) => (
                                                                                <div
                                                                                    key={c.id}
                                                                                    onClick={() => {
                                                                                        setFocusedCharacterId(c.id);
                                                                                        setCharacterEditOpen(true);
                                                                                    }}
                                                                                    className="flex-shrink-0 w-44 p-3 bg-white rounded-xl border border-purple-100 hover:border-purple-300 cursor-pointer transition-all hover:shadow-sm"
                                                                                >
                                                                                    <div className="flex items-center gap-2 mb-2">
                                                                                        <div className={`w-8 h-8 rounded-full ${c.color || 'bg-stone-400'} flex items-center justify-center text-white text-sm font-bold`}>
                                                                                            {c.name.charAt(0)}
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-sm font-bold text-brand-dark">{c.name}</p>
                                                                                            <p className="text-[10px] text-purple-600">{c.role}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <p className="text-[10px] text-stone-500 mb-1">🎭 {c.tone}</p>
                                                                                    {c.motivation && (
                                                                                        <p className="text-[10px] text-stone-500 mb-1">🎯 {c.motivation}</p>
                                                                                    )}
                                                                                    {c.sampleDialogue && (
                                                                                        <p className="text-xs text-stone-600 italic line-clamp-2 mt-1">「{c.sampleDialogue}」</p>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Prologue Scene Card */}
                                                                <motion.div
                                                                    id="scene-prologue"
                                                                    layout
                                                                    className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedSpotIndex === -1
                                                                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
                                                                        : 'bg-white border-stone-200 hover:border-amber-200'
                                                                        }`}
                                                                    onClick={() => setSelectedSpotIndex(-1)}
                                                                >
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <BookOpen size={14} className="text-amber-600" />
                                                                        <span className="text-sm font-bold text-amber-900">プロローグ</span>
                                                                        <span className="px-2 py-0.5 bg-amber-100 rounded text-[10px] font-bold text-amber-700">導入</span>
                                                                        <span className="px-2 py-0.5 bg-stone-100 rounded text-[10px] text-stone-500">期待→好奇心</span>
                                                                    </div>
                                                                    <p className={`text-sm text-stone-600 leading-relaxed ${selectedSpotIndex === -1 ? '' : 'line-clamp-2'}`}>
                                                                        {story.prologueBody}
                                                                    </p>
                                                                    {selectedSpotIndex === -1 && (
                                                                        <div className="flex gap-2 mt-3 pt-3 border-t border-amber-200">
                                                                            <button className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 rounded-lg text-xs font-bold text-amber-700 hover:bg-amber-200 transition-colors">
                                                                                <Edit size={12} /> 編集
                                                                            </button>
                                                                            <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold text-amber-700 hover:bg-amber-50 transition-colors">
                                                                                <Wand2 size={12} /> テンポ↑
                                                                            </button>
                                                                            <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold text-amber-700 hover:bg-amber-50 transition-colors">
                                                                                <Sparkles size={12} /> 伏線追加
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </motion.div>

                                                                {/* Spot Scene Cards */}
                                                                {spots.map((spot, idx) => (
                                                                    <motion.div
                                                                        key={spot.id}
                                                                        id={`scene-spot-${idx}`}
                                                                        layout
                                                                        className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedSpotIndex === idx
                                                                            ? 'bg-brand-gold/5 border-brand-gold ring-2 ring-brand-gold/30'
                                                                            : 'bg-white border-stone-200 hover:border-brand-gold/50'
                                                                            }`}
                                                                        onClick={() => setSelectedSpotIndex(idx)}
                                                                    >
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <div className="w-6 h-6 rounded-full bg-brand-gold text-white flex items-center justify-center text-xs font-bold">
                                                                                {idx + 1}
                                                                            </div>
                                                                            <span className="text-sm font-bold text-brand-dark">{spot.name}</span>
                                                                            <span className="px-2 py-0.5 bg-stone-100 rounded text-[10px] text-stone-500">
                                                                                {idx === 0 ? '期待→発見' : idx === spots.length - 1 ? '緊張→達成' : '好奇心→驚き'}
                                                                            </span>
                                                                        </div>
                                                                        {/* Character Chips */}
                                                                        <div className="flex items-center gap-1 mb-2">
                                                                            {story.characters.slice(0, idx === 0 ? 1 : 2).map((c) => (
                                                                                <button
                                                                                    key={c.id}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setFocusedCharacterId(c.id);
                                                                                        setCharacterEditOpen(true);
                                                                                    }}
                                                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${c.color} text-white hover:ring-2 ring-white/50 transition-all`}
                                                                                >
                                                                                    {c.name.charAt(0)} {c.name}
                                                                                </button>
                                                                            ))}
                                                                            <span className="text-[10px] text-stone-400">が登場</span>
                                                                        </div>
                                                                        <p className={`text-sm text-stone-600 leading-relaxed ${selectedSpotIndex === idx ? '' : 'line-clamp-2'}`}>
                                                                            {spot.storyText}
                                                                        </p>
                                                                        {selectedSpotIndex === idx && (
                                                                            <div className="flex gap-2 mt-3 pt-3 border-t border-brand-gold/20">
                                                                                <button className="flex items-center gap-1 px-3 py-1.5 bg-brand-gold/10 rounded-lg text-xs font-bold text-brand-gold hover:bg-brand-gold/20 transition-colors">
                                                                                    <Edit size={12} /> 編集
                                                                                </button>
                                                                                <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-brand-gold/30 rounded-lg text-xs font-bold text-brand-gold hover:bg-brand-gold/5 transition-colors">
                                                                                    <Wand2 size={12} /> ミステリー感↑
                                                                                </button>
                                                                                <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-brand-gold/30 rounded-lg text-xs font-bold text-brand-gold hover:bg-brand-gold/5 transition-colors">
                                                                                    <Flame size={12} /> 感情↑
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </motion.div>
                                                                ))}

                                                                {/* Epilogue Scene Card */}
                                                                <motion.div
                                                                    id="scene-epilogue"
                                                                    layout
                                                                    className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedSpotIndex === spots.length
                                                                        ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                                                                        : 'bg-white border-stone-200 hover:border-emerald-200'
                                                                        }`}
                                                                    onClick={() => setSelectedSpotIndex(spots.length)}
                                                                >
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <BookOpen size={14} className="text-emerald-600" />
                                                                        <span className="text-sm font-bold text-emerald-900">エピローグ</span>
                                                                        <span className="px-2 py-0.5 bg-emerald-100 rounded text-[10px] font-bold text-emerald-700">結末</span>
                                                                        <span className="px-2 py-0.5 bg-stone-100 rounded text-[10px] text-stone-500">達成→満足</span>
                                                                    </div>
                                                                    <p className={`text-sm text-stone-600 leading-relaxed ${selectedSpotIndex === spots.length ? '' : 'line-clamp-2'}`}>
                                                                        {story.epilogueBody}
                                                                    </p>
                                                                    {selectedSpotIndex === spots.length && (
                                                                        <div className="flex gap-2 mt-3 pt-3 border-t border-emerald-200">
                                                                            <button className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-200 transition-colors">
                                                                                <Edit size={12} /> 編集
                                                                            </button>
                                                                            <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors">
                                                                                <Wand2 size={12} /> 余韻を追加
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            </div>

                                                            {/* Quality Checklist - Fixed at bottom */}
                                                            <div className="p-3 border-t border-stone-100 bg-stone-50">
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <CheckCircle size={14} className="text-emerald-500" />
                                                                    <span className="font-bold text-stone-600">品質チェック</span>
                                                                    {story.prologueBody.length > 200 ? (
                                                                        <span className="px-2 py-0.5 bg-amber-100 rounded text-amber-700">
                                                                            ⚠️ プロローグが長め（{story.prologueBody.length}文字）
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 bg-emerald-100 rounded text-emerald-700">
                                                                            ✓ 問題なし
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                    {/* Mystery Tab */}
                                                    {contentTab === 'mystery' && spots.length > 0 && (
                                                        <motion.div
                                                            key="mystery"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="p-5 max-h-[calc(100vh-320px)] min-h-[450px] overflow-y-auto"
                                                        >
                                                            <div className="space-y-3">
                                                                {spots.map((spot, idx) => (
                                                                    <div key={spot.id} className="p-4 rounded-xl bg-stone-50 border border-stone-100">
                                                                        <div className="flex items-start gap-3 mb-3">
                                                                            <div className="w-6 h-6 rounded-full bg-brand-gold text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                                                {idx + 1}
                                                                            </div>
                                                                            <div>
                                                                                <h5 className="font-bold text-sm text-brand-dark">{spot.name}</h5>
                                                                                <p className="text-[10px] text-stone-500">{spot.address}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="ml-9 space-y-2">
                                                                            <div className="p-3 bg-white rounded-lg border border-stone-200">
                                                                                <p className="text-xs text-stone-400 font-bold mb-1">謎の問題</p>
                                                                                <p className="text-sm text-brand-dark">{spot.challengeText}</p>
                                                                            </div>
                                                                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                                                                <div className="flex items-center gap-1 text-xs text-emerald-700">
                                                                                    <CheckCircle size={12} />
                                                                                    <span className="font-bold">正解: {spot.answer}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex gap-2 pt-1">
                                                                                <button className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50">編集</button>
                                                                                <button className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50">再生成</button>
                                                                                <button className="px-3 py-1.5 rounded-lg bg-brand-gold/10 border border-brand-gold/30 text-xs font-bold text-brand-gold hover:bg-brand-gold/20">この謎をテスト</button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Character Edit Modal */}
                                    <AnimatePresence>
                                        {characterEditOpen && story && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="fixed inset-0 z-40 flex items-center justify-center"
                                            >
                                                {/* Backdrop */}
                                                <div
                                                    onClick={() => setCharacterEditOpen(false)}
                                                    className="absolute inset-0 bg-black/40"
                                                />
                                                {/* Modal Panel */}
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                                    className="relative w-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col"
                                                >
                                                    {/* Header */}
                                                    <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Users size={18} className="text-purple-600" />
                                                            <h2 className="text-lg font-bold text-brand-dark">登場人物を編集</h2>
                                                        </div>
                                                        <button
                                                            onClick={() => setCharacterEditOpen(false)}
                                                            className="p-1 hover:bg-stone-100 rounded"
                                                        >
                                                            <X size={20} className="text-stone-500" />
                                                        </button>
                                                    </div>

                                                    {/* Characters List */}
                                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                                        {story.characters.map((c) => (
                                                            <div
                                                                key={c.id}
                                                                className={`p-4 rounded-xl border transition-all ${focusedCharacterId === c.id
                                                                    ? 'border-purple-300 bg-purple-50 ring-2 ring-purple-200'
                                                                    : 'border-stone-200 bg-white'
                                                                    }`}
                                                                onClick={() => setFocusedCharacterId(c.id)}
                                                            >
                                                                {/* Left-Right Layout */}
                                                                <div className="flex gap-4">
                                                                    {/* Left: Character Avatar */}
                                                                    <div className="flex-shrink-0 flex flex-col items-center gap-2">
                                                                        <div className={`w-20 h-20 rounded-2xl ${c.color} flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>
                                                                            {c.name.charAt(0)}
                                                                        </div>
                                                                        <button className="text-[10px] text-purple-600 hover:text-purple-800 font-medium">
                                                                            画像を変更
                                                                        </button>
                                                                    </div>

                                                                    {/* Right: Character Details */}
                                                                    <div className="flex-1 space-y-3">
                                                                        {/* Name & Role */}
                                                                        <div className="flex gap-3">
                                                                            <div className="flex-1">
                                                                                <label className="text-[10px] font-bold text-stone-400 uppercase">名前</label>
                                                                                <input
                                                                                    type="text"
                                                                                    defaultValue={c.name}
                                                                                    className="w-full text-sm font-bold text-brand-dark bg-stone-50 rounded-lg px-3 py-2 border border-stone-200 focus:border-purple-500 focus:outline-none"
                                                                                />
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <label className="text-[10px] font-bold text-stone-400 uppercase">役割</label>
                                                                                <input
                                                                                    type="text"
                                                                                    defaultValue={c.role}
                                                                                    className="w-full text-sm text-purple-600 bg-stone-50 rounded-lg px-3 py-2 border border-stone-200 focus:border-purple-500 focus:outline-none"
                                                                                    placeholder="案内人、ヒント提供者など"
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        {/* Tone */}
                                                                        <div>
                                                                            <label className="text-[10px] font-bold text-stone-400 uppercase">口調</label>
                                                                            <input
                                                                                type="text"
                                                                                defaultValue={c.tone}
                                                                                className="w-full text-sm text-stone-700 bg-stone-50 rounded-lg px-3 py-2 border border-stone-200 focus:border-purple-500 focus:outline-none"
                                                                                placeholder="ミステリアス、丁寧、フレンドリー..."
                                                                            />
                                                                        </div>

                                                                        {/* Motivation */}
                                                                        <div>
                                                                            <label className="text-[10px] font-bold text-stone-400 uppercase">動機・目的</label>
                                                                            <input
                                                                                type="text"
                                                                                defaultValue={c.motivation || ''}
                                                                                className="w-full text-sm text-stone-700 bg-stone-50 rounded-lg px-3 py-2 border border-stone-200 focus:border-purple-500 focus:outline-none"
                                                                                placeholder="このキャラクターの目的は..."
                                                                            />
                                                                        </div>

                                                                        {/* Sample Dialogue */}
                                                                        <div>
                                                                            <label className="text-[10px] font-bold text-stone-400 uppercase">台詞例</label>
                                                                            <div className="flex gap-2">
                                                                                <input
                                                                                    type="text"
                                                                                    defaultValue={c.sampleDialogue || ''}
                                                                                    className="flex-1 text-sm text-stone-700 bg-stone-50 rounded-lg px-3 py-2 border border-stone-200 focus:border-purple-500 focus:outline-none italic"
                                                                                    placeholder="「このキャラらしい台詞...」"
                                                                                />
                                                                                <button className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-200 transition-colors flex items-center gap-1">
                                                                                    <Wand2 size={14} /> 生成
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* Add Character Button */}
                                                        <button className="w-full p-4 border-2 border-dashed border-stone-300 rounded-xl text-sm text-stone-500 hover:border-purple-300 hover:text-purple-600 transition-colors">
                                                            + 新しい人物を追加
                                                        </button>
                                                    </div>

                                                    {/* Footer with Apply Options */}
                                                    <div className="p-4 bg-stone-50 border-t border-stone-200">
                                                        <p className="text-xs font-bold text-stone-500 mb-2">変更を反映する範囲</p>
                                                        <div className="flex gap-2 mb-3">
                                                            <label className="flex items-center gap-1 text-xs cursor-pointer">
                                                                <input type="radio" name="scope" value="all" defaultChecked className="accent-purple-600" />
                                                                <span>全章に反映</span>
                                                            </label>
                                                            <label className="flex items-center gap-1 text-xs cursor-pointer">
                                                                <input type="radio" name="scope" value="from-here" className="accent-purple-600" />
                                                                <span>この章以降</span>
                                                            </label>
                                                            <label className="flex items-center gap-1 text-xs cursor-pointer">
                                                                <input type="radio" name="scope" value="this-only" className="accent-purple-600" />
                                                                <span>この章のみ</span>
                                                            </label>
                                                        </div>
                                                        <button
                                                            onClick={() => setCharacterEditOpen(false)}
                                                            className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors"
                                                        >
                                                            保存して反映
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Save Quest FAB */}
                                    {hasContent && !isGenerating && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
                                        >
                                            {saveMessage && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    className={`px-4 py-2 rounded-lg text-sm font-bold shadow-lg ${saveMessage.includes('失敗') ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                                                        }`}
                                                >
                                                    {saveMessage}
                                                </motion.div>
                                            )}
                                            <button
                                                onClick={handleSaveQuest}
                                                disabled={isSaving}
                                                className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold shadow-lg transition-all hover:shadow-xl ${isSaving
                                                    ? 'bg-stone-400 text-white cursor-wait'
                                                    : 'bg-brand-dark text-white hover:bg-brand-gold'
                                                    }`}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <Loader2 size={18} className="animate-spin" />
                                                        保存中...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save size={18} />
                                                        クエスト保存
                                                    </>
                                                )}
                                            </button>
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
