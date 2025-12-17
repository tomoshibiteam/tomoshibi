import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TomoshibiLogo } from './TomoshibiLogo';
import { supabase } from './supabaseClient';
import {
    ArrowLeft,
    BookOpen,
    Users,
    MessageCircle,
    Plus,
    Trash2,
    Save,
    CheckCircle,
    Edit2,
    Sparkles,
    MapPin,
    ChevronRight,
    GripVertical,
    Wand2,
    X
} from 'lucide-react';

interface CastCharacter {
    id: string;
    name: string;
    role: string;
    icon?: string;
    color: string;
}

interface StoryData {
    prologue: string;
    epilogue: string;
    characters: CastCharacter[];
}

interface DialogueLine {
    id: string;
    speakerType: 'character' | 'narrator' | 'system';
    speakerName: string;
    avatarUrl?: string;
    text: string;
}

interface SpotData {
    id: string;
    name: string;
    orderIndex: number;
    puzzleText?: string;
    answer?: string;
}

interface SpotConversations {
    [spotId: string]: {
        pre: DialogueLine[];
        post: DialogueLine[];
    };
}

const DEFAULT_CHARACTERS = [
    { id: 'c1', name: '案内人', role: 'ガイド', color: 'bg-brand-gold' },
    { id: 'c2', name: '謎の声', role: '語り手', color: 'bg-indigo-500' }
];

const buildFallbackIconUrl = (name: string) =>
    `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(name)}&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9`;

const buildFallbackDialogue = (
    stage: 'pre' | 'post',
    spot: SpotData,
    characters: CastCharacter[]
): DialogueLine[] => {
    const speaker = characters[0]?.name || '案内人';
    if (stage === 'pre') {
        return [
            { id: `fallback-pre-${spot.id}-0`, speakerType: 'character', speakerName: speaker, text: `${spot.name} に着いたね。ここで何か手がかりが見つかりそうだよ。` },
            { id: `fallback-pre-${spot.id}-1`, speakerType: 'narrator', speakerName: 'ナレーション', text: spot.puzzleText ? `謎: ${spot.puzzleText}` : '周囲を観察してヒントを探そう。' },
            { id: `fallback-pre-${spot.id}-2`, speakerType: 'character', speakerName: speaker, text: 'まずは周りをよく見てみよう。' },
        ];
    }
    return [
        { id: `fallback-post-${spot.id}-0`, speakerType: 'character', speakerName: speaker, text: 'やった！ 今の謎は突破できたね。' },
        { id: `fallback-post-${spot.id}-1`, speakerType: 'narrator', speakerName: 'ナレーション', text: spot.answer ? `正解: ${spot.answer}` : '次の手がかりへ進もう。' },
        { id: `fallback-post-${spot.id}-2`, speakerType: 'character', speakerName: speaker, text: 'この調子で進もう。' },
    ];
};

export default function CreatorStorytelling() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // State
    const [prologue, setPrologue] = useState('');
    const [epilogue, setEpilogue] = useState('');
    const [characters, setCharacters] = useState<CastCharacter[]>([]);
    const [activeTab, setActiveTab] = useState<'prologue' | 'epilogue' | 'cast' | 'spots'>('prologue');
    const [questId, setQuestId] = useState<string | null>(null);

    // Spot conversation state
    const [spots, setSpots] = useState<SpotData[]>([]);
    const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
    const [spotConversations, setSpotConversations] = useState<SpotConversations>({});
    const [conversationTab, setConversationTab] = useState<'pre' | 'post'>('pre');

    // Icon generation state
    const [iconModalOpen, setIconModalOpen] = useState(false);
    const [generatingIcon, setGeneratingIcon] = useState(false);
    const [generatedIcons, setGeneratedIcons] = useState<string[]>([]);
    const [targetCharacterId, setTargetCharacterId] = useState<string | null>(null);
    const [targetCharacterName, setTargetCharacterName] = useState<string>('');

    // Load story data from Supabase
    useEffect(() => {
        const loadData = async () => {
            const storedQuestId = localStorage.getItem('quest-id');
            if (!storedQuestId) {
                setLoading(false);
                return;
            }
            setQuestId(storedQuestId);

            try {
                // Load story timelines (prologue, epilogue, characters)
                const { data } = await supabase
                    .from('story_timelines')
                    .select('prologue, epilogue, characters, cast_name, cast_tone')
                    .eq('quest_id', storedQuestId)
                    .single();

                if (data) {
                    setPrologue(data.prologue || '');
                    setEpilogue(data.epilogue || '');
                    if (Array.isArray(data.characters) && data.characters.length > 0) {
                        setCharacters(data.characters as CastCharacter[]);
                    } else if (data.cast_name) {
                        setCharacters([{
                            id: 'c1',
                            name: data.cast_name,
                            role: data.cast_tone || 'Navigator',
                            color: 'bg-brand-gold'
                        }]);
                    } else {
                        setCharacters(DEFAULT_CHARACTERS);
                    }
                } else {
                    setCharacters(DEFAULT_CHARACTERS);
                }

                // Load spots with puzzle details
                const { data: spotsData } = await supabase
                    .from('spots')
                    .select('id, name, order_index')
                    .eq('quest_id', storedQuestId)
                    .order('order_index', { ascending: true });

                if (spotsData && spotsData.length > 0) {
                    // Load spot details for puzzle info
                    const spotIds = spotsData.map(s => s.id);
                    const { data: detailsData } = await supabase
                        .from('spot_details')
                        .select('spot_id, puzzle_text, answer')
                        .in('spot_id', spotIds);

                    const detailsMap: Record<string, { puzzleText?: string; answer?: string }> = {};
                    detailsData?.forEach(d => {
                        detailsMap[d.spot_id] = { puzzleText: d.puzzle_text, answer: d.answer };
                    });

                    const mappedSpots: SpotData[] = spotsData.map(s => ({
                        id: s.id,
                        name: s.name || `スポット ${s.order_index}`,
                        orderIndex: s.order_index,
                        puzzleText: detailsMap[s.id]?.puzzleText,
                        answer: detailsMap[s.id]?.answer,
                    }));
                    setSpots(mappedSpots);
                    if (mappedSpots.length > 0) {
                        setSelectedSpotId(mappedSpots[0].id);
                    }

                    // Load existing spot_story_messages
                    const { data: messagesData } = await supabase
                        .from('spot_story_messages')
                        .select('id, spot_id, stage, order_index, speaker_type, speaker_name, avatar_url, text')
                        .in('spot_id', spotIds)
                        .order('order_index', { ascending: true });

                    const convos: SpotConversations = {};
                    mappedSpots.forEach(s => {
                        convos[s.id] = { pre: [], post: [] };
                    });

                    messagesData?.forEach(m => {
                        const line: DialogueLine = {
                            id: m.id,
                            speakerType: (m.speaker_type as 'character' | 'narrator' | 'system') || 'narrator',
                            speakerName: m.speaker_name || '',
                            avatarUrl: m.avatar_url,
                            text: m.text || '',
                        };
                        if (convos[m.spot_id]) {
                            if (m.stage === 'pre_puzzle') {
                                convos[m.spot_id].pre.push(line);
                            } else if (m.stage === 'post_puzzle') {
                                convos[m.spot_id].post.push(line);
                            }
                        }
                    });
                    setSpotConversations(convos);
                }
            } catch (err) {
                console.error('Load failed:', err);
                setCharacters(DEFAULT_CHARACTERS);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleSave = async (status: 'in_progress' | 'completed', shouldNavigate: boolean = false) => {
        if (!questId) {
            alert('クエストIDがありません。ワークスペースから開いてください。');
            return;
        }
        setSaving(true);
        try {
            // Save story timelines (prologue, epilogue, characters)
            await supabase.from('story_timelines').upsert({
                quest_id: questId,
                prologue,
                epilogue,
                characters,
            }, { onConflict: 'quest_id' });

            // Save spot_story_messages
            if (spots.length > 0) {
                const spotIds = spots.map(s => s.id);

                // Delete existing messages for these spots
                await supabase
                    .from('spot_story_messages')
                    .delete()
                    .in('spot_id', spotIds);

                // Insert new messages
                const allMessages: {
                    spot_id: string;
                    stage: string;
                    order_index: number;
                    speaker_type: string;
                    speaker_name: string;
                    avatar_url?: string;
                    text: string;
                }[] = [];

                for (const spotId of spotIds) {
                    const convo = spotConversations[spotId];
                    if (convo) {
                        convo.pre.forEach((line, idx) => {
                            allMessages.push({
                                spot_id: spotId,
                                stage: 'pre_puzzle',
                                order_index: idx,
                                speaker_type: line.speakerType,
                                speaker_name: line.speakerName,
                                avatar_url: line.avatarUrl,
                                text: line.text,
                            });
                        });
                        convo.post.forEach((line, idx) => {
                            allMessages.push({
                                spot_id: spotId,
                                stage: 'post_puzzle',
                                order_index: idx,
                                speaker_type: line.speakerType,
                                speaker_name: line.speakerName,
                                avatar_url: line.avatarUrl,
                                text: line.text,
                            });
                        });
                    }
                }

                if (allMessages.length > 0) {
                    await supabase.from('spot_story_messages').insert(allMessages);
                }
            }

            // Save step status to localStorage
            localStorage.setItem(`step-status:${questId}:3`, status);

            if (shouldNavigate) {
                navigate('/creator/workspace');
            }
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    // Generate dialogue draft using AI

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

    // Generate character icon using AI
    const handleGenerateIcon = async (char: CastCharacter) => {
        setTargetCharacterId(char.id);
        setTargetCharacterName(char.name);
        setGeneratedIcons([]);
        setIconModalOpen(true);
        setGeneratingIcon(true);

        try {
            const response = await supabase.functions.invoke('generate-character-icon', {
                body: {
                    questId: questId || 'temp',
                    characterId: char.id,
                    name: char.name,
                    role: char.role,
                    artStyle: 'anime style', // TODO: Make configurable
                },
            });

            if (response.error) {
                throw response.error;
            }

            if (response.data?.imageUrls?.length) {
                setGeneratedIcons(response.data.imageUrls);
            } else {
                setGeneratedIcons([buildFallbackIconUrl(char.name)]);
            }
        } catch (err) {
            console.error('Icon generation failed:', err);
            setGeneratedIcons([buildFallbackIconUrl(char.name)]);
            alert('アイコン生成に失敗したため、プレースホルダーを提案しました。');
        } finally {
            setGeneratingIcon(false);
        }
    };

    const handleSelectIcon = (iconUrl: string) => {
        if (!targetCharacterId) return;

        const newCharacters = characters.map(c =>
            c.id === targetCharacterId ? { ...c, icon: iconUrl } : c
        );
        setCharacters(newCharacters);
        setIconModalOpen(false);
        setGeneratedIcons([]);
    };

    return (
        <section className="min-h-screen bg-stone-50 flex flex-col relative">
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
                        <span className="text-brand-dark px-2 py-1 bg-brand-gold/10 rounded">Step 3: ストーリー</span>
                        <span>›</span>
                        <span>Step 4: テスト</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 container mx-auto px-4 md:px-8 py-8 max-w-5xl">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate('/creator/workspace')} className="text-xs font-bold text-stone-500 hover:text-brand-dark flex items-center gap-1 transition-colors">
                        <span className="text-lg">‹</span> ワークスペースに戻る
                    </button>
                    <h1 className="text-3xl font-serif font-bold text-brand-dark">ストーリー設定</h1>
                </div>

                <div className="grid lg:grid-cols-12 gap-8 h-[calc(100vh-200px)]">
                    {/* Left Sidebar: Navigation & Cast */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        {/* Navigation Tabs */}
                        <div className="bg-white rounded-2xl border border-stone-200 p-2 shadow-sm">
                            <button
                                onClick={() => setActiveTab('prologue')}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'prologue' ? 'bg-indigo-50 text-indigo-700' : 'text-stone-600 hover:bg-stone-50'}`}
                            >
                                <BookOpen size={18} />
                                プロローグ <span className="text-xs font-normal text-stone-400 ml-auto">導入</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('spots')}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'spots' ? 'bg-emerald-50 text-emerald-700' : 'text-stone-600 hover:bg-stone-50'}`}
                            >
                                <MessageCircle size={18} />
                                スポット会話
                                {spots.length > 0 && (
                                    <span className="text-xs font-normal text-stone-400 ml-auto">{spots.length}件</span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('epilogue')}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'epilogue' ? 'bg-indigo-50 text-indigo-700' : 'text-stone-600 hover:bg-stone-50'}`}
                            >
                                <Sparkles size={18} />
                                エピローグ <span className="text-xs font-normal text-stone-400 ml-auto">エンディング</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('cast')}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'cast' ? 'bg-indigo-50 text-indigo-700' : 'text-stone-600 hover:bg-stone-50'}`}
                            >
                                <Users size={18} />
                                登場人物
                            </button>
                        </div>

                        {/* Quick Hints */}
                        <div className="bg-gradient-to-br from-brand-base/30 to-white rounded-2xl border border-brand-gold/20 p-6">
                            <h3 className="text-sm font-bold text-brand-dark mb-2 flex items-center gap-2">
                                <Sparkles size={14} className="text-brand-gold" /> ストーリーのコツ
                            </h3>
                            <p className="text-xs text-stone-600 leading-relaxed">
                                {activeTab === 'spots'
                                    ? '各スポットで「到着後→謎→解決後」の自然な流れを作りましょう。前後の文脈を確認しながら会話を書くと繋がりが良くなります。'
                                    : '魅力的なクエストには引き込まれる物語が必要です。プロローグで期待感を高め、エピローグでプレイヤーの達成感を演出しましょう。'
                                }
                            </p>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-8 bg-white rounded-3xl border border-stone-200 shadow-xl flex flex-col overflow-hidden relative">
                        {/* Toolbar */}
                        <div className="border-b border-stone-100 p-4 flex justify-between items-center bg-stone-50/50">
                            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                                {activeTab === 'prologue' ? 'オープニング' : activeTab === 'epilogue' ? 'エンディング' : activeTab === 'spots' ? 'スポット会話編集' : '登場人物管理'}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleSave('in_progress', false)}
                                    disabled={saving}
                                    className="px-4 py-1.5 rounded-full bg-brand-dark text-white text-xs font-bold hover:bg-brand-gold transition-colors flex items-center gap-2"
                                >
                                    {saving ? '保存中...' : <><Save size={14} /> 保存</>}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {activeTab === 'prologue' || activeTab === 'epilogue' ? (
                                <div className="space-y-4 h-full flex flex-col">
                                    <textarea
                                        value={activeTab === 'prologue' ? prologue : epilogue}
                                        onChange={(e) => activeTab === 'prologue' ? setPrologue(e.target.value) : setEpilogue(e.target.value)}
                                        className="w-full flex-1 resize-none focus:outline-none text-lg leading-relaxed text-stone-700 placeholder:text-stone-300"
                                        placeholder={activeTab === 'prologue' ? 'プロローグを入力してください...' : 'エピローグを入力してください...'}
                                    />
                                    <div className="text-right text-xs text-stone-400">
                                        {(activeTab === 'prologue' ? prologue : epilogue).length} 文字
                                    </div>
                                </div>
                            ) : activeTab === 'spots' ? (
                                <div className="flex gap-6 h-full">
                                    {/* Spot List Sidebar */}
                                    <div className="w-48 flex-shrink-0 space-y-2">
                                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">スポット一覧</h4>
                                        {spots.map((spot, idx) => (
                                            <button
                                                key={spot.id}
                                                onClick={() => setSelectedSpotId(spot.id)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${selectedSpotId === spot.id
                                                    ? 'bg-emerald-100 text-emerald-800 font-bold'
                                                    : 'text-stone-600 hover:bg-stone-100'
                                                    }`}
                                            >
                                                <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold">
                                                    {idx + 1}
                                                </div>
                                                <span className="truncate">{spot.name}</span>
                                                {spotConversations[spot.id] && (spotConversations[spot.id].pre.length > 0 || spotConversations[spot.id].post.length > 0) && (
                                                    <CheckCircle size={12} className="ml-auto text-emerald-500" />
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Conversation Editor */}
                                    <div className="flex-1 flex flex-col">
                                        {selectedSpotId && spots.find(s => s.id === selectedSpotId) ? (
                                            <>
                                                {/* Pre/Post Tabs */}
                                                <div className="flex gap-2 mb-4">
                                                    <button
                                                        onClick={() => setConversationTab('pre')}
                                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${conversationTab === 'pre'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                                            }`}
                                                    >
                                                        スポット前会話
                                                        <span className="ml-1 text-xs opacity-70">
                                                            ({spotConversations[selectedSpotId]?.pre.length || 0})
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={() => setConversationTab('post')}
                                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${conversationTab === 'post'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                                            }`}
                                                    >
                                                        スポット後会話
                                                        <span className="ml-1 text-xs opacity-70">
                                                            ({spotConversations[selectedSpotId]?.post.length || 0})
                                                        </span>
                                                    </button>
                                                </div>

                                                {/* Context Panel */}
                                                <div className="mb-4 p-3 bg-stone-50 rounded-lg border border-stone-200">
                                                    <div className="text-xs text-stone-500 mb-1">現在の謎:</div>
                                                    <div className="text-sm text-stone-700">
                                                        {spots.find(s => s.id === selectedSpotId)?.puzzleText || '（未設定）'}
                                                    </div>
                                                </div>

                                                {/* Dialogue Lines */}
                                                <div className="flex-1 space-y-3 overflow-y-auto">
                                                    {(conversationTab === 'pre'
                                                        ? spotConversations[selectedSpotId]?.pre
                                                        : spotConversations[selectedSpotId]?.post
                                                    )?.map((line, idx) => (
                                                        <div key={line.id} className="flex gap-3 items-start p-3 bg-white rounded-lg border border-stone-200 group">
                                                            <div className="w-6 text-stone-300 cursor-grab">
                                                                <GripVertical size={16} />
                                                            </div>
                                                            <select
                                                                value={line.speakerType === 'narrator' ? '__narrator__' : line.speakerName}
                                                                onChange={(e) => {
                                                                    const newConvos = { ...spotConversations };
                                                                    const arr = conversationTab === 'pre' ? newConvos[selectedSpotId].pre : newConvos[selectedSpotId].post;
                                                                    const item = arr[idx];
                                                                    if (e.target.value === '__narrator__') {
                                                                        item.speakerType = 'narrator';
                                                                        item.speakerName = 'ナレーション';
                                                                    } else {
                                                                        item.speakerType = 'character';
                                                                        item.speakerName = e.target.value;
                                                                    }
                                                                    setSpotConversations(newConvos);
                                                                }}
                                                                className="w-28 text-xs border border-stone-200 rounded px-2 py-1 bg-white"
                                                            >
                                                                <option value="__narrator__">ナレーション</option>
                                                                {characters.map(c => (
                                                                    <option key={c.id} value={c.name}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                            <textarea
                                                                value={line.text}
                                                                onChange={(e) => {
                                                                    const newConvos = { ...spotConversations };
                                                                    const arr = conversationTab === 'pre' ? newConvos[selectedSpotId].pre : newConvos[selectedSpotId].post;
                                                                    arr[idx].text = e.target.value;
                                                                    setSpotConversations(newConvos);
                                                                }}
                                                                className="flex-1 text-sm resize-none border-0 bg-transparent focus:outline-none"
                                                                rows={2}
                                                                placeholder="セリフを入力..."
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const newConvos = { ...spotConversations };
                                                                    const arr = conversationTab === 'pre' ? newConvos[selectedSpotId].pre : newConvos[selectedSpotId].post;
                                                                    arr.splice(idx, 1);
                                                                    setSpotConversations(newConvos);
                                                                }}
                                                                className="text-stone-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))}

                                                    {(spotConversations[selectedSpotId]?.[conversationTab]?.length || 0) === 0 && (
                                                        <div className="text-center py-8 text-stone-400">
                                                            <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                                                            <p className="text-sm">まだ会話がありません</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2 mt-4 pt-4 border-t border-stone-100">
                                                    <button
                                                        onClick={() => {
                                                            const newConvos = { ...spotConversations };
                                                            const newLine: DialogueLine = {
                                                                id: `new-${Date.now()}`,
                                                                speakerType: 'character',
                                                                speakerName: characters[0]?.name || '案内人',
                                                                text: '',
                                                            };
                                                            if (conversationTab === 'pre') {
                                                                newConvos[selectedSpotId].pre.push(newLine);
                                                            } else {
                                                                newConvos[selectedSpotId].post.push(newLine);
                                                            }
                                                            setSpotConversations(newConvos);
                                                        }}
                                                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                                                    >
                                                        <Plus size={16} /> セリフ追加
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-stone-400">
                                                <div className="text-center">
                                                    <MapPin size={48} className="mx-auto mb-3 opacity-50" />
                                                    <p>左からスポットを選択してください</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-brand-dark">登場人物一覧</h3>
                                        <button className="text-xs font-bold text-brand-gold hover:underline flex items-center gap-1">
                                            <Plus size={14} /> 追加
                                        </button>
                                    </div>

                                    <div className="grid gap-4">
                                        {characters.map((char, charIdx) => (
                                            <div key={char.id} className="p-4 rounded-xl border border-stone-200 bg-stone-50 hover:bg-white transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    {/* Icon with AI generation option */}
                                                    <div className="relative">
                                                        {char.icon ? (
                                                            <img
                                                                src={char.icon}
                                                                alt={char.name}
                                                                className="w-12 h-12 rounded-full object-cover border-2 border-stone-200"
                                                            />
                                                        ) : (
                                                            <div className={`w-12 h-12 rounded-full ${char.color} flex items-center justify-center text-white font-bold text-lg`}>
                                                                {char.name[0]}
                                                            </div>
                                                        )}
                                                        {!char.icon && (
                                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-100 border border-amber-300 rounded-full flex items-center justify-center">
                                                                <span className="text-[10px]">⚠️</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-stone-800">{char.name}</h4>
                                                        <p className="text-xs text-stone-500">{char.role}</p>
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded shadow-sm border border-indigo-100"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleGenerateIcon(char);
                                                            }}
                                                        >
                                                            <Wand2 size={12} /> AI生成
                                                        </button>
                                                        <button className="text-stone-400 hover:text-stone-600 p-1">
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                                {!char.icon && (
                                                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                                                        📷 アイコン未設定 - AI生成またはアップロードで追加してください
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Completion Checklist + Action Buttons */}
                        <div className="border-t border-stone-100 p-3 bg-stone-50/50">
                            {/* Inline Compact Checklist */}
                            <div className="flex flex-wrap items-center gap-3 px-2 py-1.5 bg-white rounded-lg border border-stone-200 mb-3">
                                <span className="text-[10px] font-bold text-stone-400 uppercase">完了条件</span>

                                {/* Prologue - Required */}
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${prologue.trim() ? 'bg-emerald-500 text-white' : 'border border-rose-400 text-rose-400'}`}>
                                        {prologue.trim() ? '✓' : '!'}
                                    </div>
                                    <span className={`text-xs ${prologue.trim() ? 'text-emerald-700' : 'text-rose-600'}`}>
                                        プロローグ<span className="text-[10px] ml-0.5">(必須)</span>
                                    </span>
                                </div>

                                {/* Epilogue - Optional */}
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${epilogue.trim() ? 'bg-emerald-500 text-white' : 'border border-stone-300'}`}>
                                        {epilogue.trim() ? '✓' : ''}
                                    </div>
                                    <span className={`text-xs ${epilogue.trim() ? 'text-emerald-700' : 'text-stone-500'}`}>
                                        エピローグ<span className="text-[10px] ml-0.5 text-stone-400">(任意)</span>
                                    </span>
                                </div>

                                {/* Character Icons - Optional */}
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${characters.every(c => c.icon) ? 'bg-emerald-500 text-white' : 'border border-stone-300'}`}>
                                        {characters.every(c => c.icon) ? '✓' : ''}
                                    </div>
                                    <span className={`text-xs ${characters.every(c => c.icon) ? 'text-emerald-700' : 'text-stone-500'}`}>
                                        アイコン<span className="text-[10px] ml-0.5 text-stone-400">({characters.filter(c => c.icon).length}/{characters.length})</span>
                                    </span>
                                </div>

                                {/* Spot Conversations - Optional */}
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${spots.length > 0 && spots.every(s => (spotConversations[s.id]?.pre?.length || 0) > 0) ? 'bg-emerald-500 text-white' : 'border border-stone-300'}`}>
                                        {spots.length > 0 && spots.every(s => (spotConversations[s.id]?.pre?.length || 0) > 0) ? '✓' : ''}
                                    </div>
                                    <span className={`text-xs ${spots.length > 0 && spots.every(s => (spotConversations[s.id]?.pre?.length || 0) > 0) ? 'text-emerald-700' : 'text-stone-500'}`}>
                                        会話<span className="text-[10px] ml-0.5 text-stone-400">({spots.filter(s => (spotConversations[s.id]?.pre?.length || 0) > 0).length}/{spots.length})</span>
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleSave('in_progress', true)}
                                    disabled={saving}
                                    className="flex-1 py-2.5 rounded-lg border-2 border-brand-gold bg-white text-brand-gold font-bold text-sm hover:bg-brand-gold/5 transition-all disabled:opacity-50"
                                >
                                    {saving ? '保存中...' : '一時保存する'}
                                </button>
                                <button
                                    onClick={() => handleSave('completed', true)}
                                    disabled={saving || !prologue.trim()}
                                    title={!prologue.trim() ? 'プロローグを入力してください' : ''}
                                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-50 ${prologue.trim()
                                        ? 'bg-brand-dark text-white hover:bg-brand-gold hover:shadow-lg'
                                        : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                        }`}
                                >
                                    {saving ? '保存中...' : '完了する'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Icon Modal (Single) */}
            {iconModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-brand-dark">アイコン生成: {targetCharacterName}</h3>
                                <p className="text-xs text-stone-500">キャラクター設定から最適なアイコンをAIが提案します</p>
                            </div>
                            <button onClick={() => setIconModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                                ×
                            </button>
                        </div>

                        <div className="p-8">
                            {generatingIcon ? (
                                <div className="text-center py-12">
                                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                                    <h4 className="text-lg font-bold text-indigo-900 mb-2">生成中...</h4>
                                    <p className="text-sm text-indigo-600/70">AIアーティストが筆を走らせています<br />しばらくお待ちください（約10-20秒）</p>
                                </div>
                            ) : generatedIcons.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {generatedIcons.map((url, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSelectIcon(url)}
                                            className="group relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-all hover:scale-105"
                                        >
                                            <img src={url} alt={`Option ${idx + 1}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <span className="opacity-0 group-hover:opacity-100 bg-white text-indigo-600 text-xs font-bold px-3 py-1 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                                                    これにする
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-stone-500">
                                    生成に失敗しました。もう一度お試しください。
                                </div>
                            )}
                        </div>

                        {!generatingIcon && generatedIcons.length > 0 && (
                            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end gap-3">
                                <button
                                    onClick={() => setIconModalOpen(false)}
                                    className="px-4 py-2 text-stone-500 font-bold text-sm hover:text-stone-700"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={() => handleGenerateIcon(characters.find(c => c.id === targetCharacterId)!)}
                                    className="px-6 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 shadow-lg flex items-center gap-2"
                                >
                                    <Sparkles size={16} /> 再生成する
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
