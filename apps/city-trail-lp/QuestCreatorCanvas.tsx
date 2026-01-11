import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
    Lightbulb,
    Compass,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthProvider';
import SectionCard from './SectionCard';
import ProSubscriptionModal from './ProSubscriptionModal';
import {
    Section,
    SectionStatus,
    GenerationInput,
    INSPIRATION_TAGS,
    GENRE_SUPPORT_TAGS,
    TONE_SUPPORT_TAGS,
    PromptSupport,
    GenreSupportId,
    ToneSupportId,
    PROMPT_SUPPORT_PLACEHOLDERS,
} from './questCreatorTypes';
import { TomoshibiLogo } from './TomoshibiLogo';
import {
    generateLaytonQuest,
    QuestGenerationRequest,
    QuestOutput,
    SpotScene,
    MainPlot,
    PipelineState,
    PlayerPreviewOutput,
    QuestDualOutput,
} from './lib/puzzle-pipeline';
import { getModelEndpoint } from './lib/ai/model-config';
import { DEMO_BASIC_INFO, DEMO_STORY, DEMO_SPOTS } from './lib/demo-data';
import PlayerPreview from './PlayerPreview';

interface QuestCreatorCanvasProps {
    questId: string | null;
    onBack: () => void;
    onLogoHome: () => void;
    onPublish: () => void;
    onTestRun: () => void;
    onQuestIdChange?: (questId: string) => void;
}

interface BasicInfoData {
    title: string;
    description: string;
    area: string;
    difficulty: string;
    tags: string[];
    coverImageUrl?: string;
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
    // Layton Pipeline additions
    playerHandout?: string;      // 資料（謎を解くための情報）
    solutionSteps?: string[];    // 解法ステップ
    loreReveal?: string;         // 背景解説
    plotKey?: string;            // 物語の鍵
    puzzleType?: string;         // 謎のタイプ（logic/pattern/cipher等）
    sceneRole?: string;          // シーンの役割（導入/展開/転換等）
    linkingRationale?: string;   // なぜこの謎がこのスポットか
}

interface StoryData {
    castName: string;
    castTone: string;
    prologueTitle: string;
    prologueBody: string;
    epilogueBody: string;
    characters: { id: string; name: string; role: string; color: string; tone: string; motivation?: string; sampleDialogue?: string }[];
}

type DialogueLine = {
    speakerType: 'character' | 'narrator';
    speakerName?: string;
    text: string;
};

type SpotDialogue = {
    spot_index: number;
    preDialogue: DialogueLine[];
    postDialogue: DialogueLine[];
};

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

const TRIP_DURATION_OPTIONS = [
    { value: 30, label: 'サクッと', note: '30分' },
    { value: 60, label: 'ほどほど', note: '60分' },
    { value: 90, label: 'しっかり', note: '90分' },
    { value: 120, label: 'じっくり', note: '120分' },
];

const SPOT_COUNT_OPTIONS = [5, 7, 10, 12];

const TRIP_DIFFICULTY_OPTIONS = [
    { value: 'easy' as const, label: 'ゆるめ', desc: 'ヒント多めで安心' },
    { value: 'medium' as const, label: 'バランス', desc: 'ほどよい手応え' },
    { value: 'hard' as const, label: 'チャレンジ', desc: '推理好き向け' },
];

const SPOT_RANGE_BY_DURATION: Record<number, { min: number; max: number }> = {
    30: { min: 5, max: 5 },
    60: { min: 5, max: 7 },
    90: { min: 7, max: 10 },
    120: { min: 7, max: 12 },
};

const getSpotRangeForDuration = (duration: number) => SPOT_RANGE_BY_DURATION[duration] ?? { min: 5, max: 10 };
const isSpotCountAllowed = (duration: number, spotCount: number) => {
    const { min, max } = getSpotRangeForDuration(duration);
    return spotCount >= min && spotCount <= max;
};
const getMinDurationForSpotCount = (spotCount: number) => {
    const durations = Object.keys(SPOT_RANGE_BY_DURATION)
        .map((v) => parseInt(v, 10))
        .sort((a, b) => a - b);
    return durations.find((d) => isSpotCountAllowed(d, spotCount)) ?? durations[durations.length - 1];
};

export default function QuestCreatorCanvas({
    questId,
    onBack,
    onLogoHome,
    onPublish,
    onTestRun,
    onQuestIdChange,
}: QuestCreatorCanvasProps) {
    const { user, isPro } = useAuth();
    const navigate = useNavigate();

    // Input state
    const [mode, setMode] = useState<'simple' | 'pro'>('simple');
    const [prompt, setPrompt] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [activeContentOptions, setActiveContentOptions] = useState<string[]>(['spots', 'story', 'mystery']);

    // Prompt-first design: genre/tone only
    const [promptSupport] = useState<PromptSupport>({});
    const [genreSupport, setGenreSupport] = useState<GenreSupportId | undefined>();
    const [toneSupport, setToneSupport] = useState<ToneSupportId | undefined>();

    // Custom constraints
    const [constraints, setConstraints] = useState({
        duration: 60,
        difficulty: 'medium' as 'easy' | 'medium' | 'hard',
        spotCount: 7,
        radiusKm: 1, // 半径（km）デフォルト1km = 現在地から1km圏内
    });
    const [travelProfile, setTravelProfile] = useState({
        when: '',
        where: '',
        purpose: '',
        withWhom: '',
    });

    // 現在地
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationPhase, setGenerationPhase] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Generated content
    const [basicInfo, setBasicInfo] = useState<BasicInfoData | null>(null);
    const [spots, setSpots] = useState<SpotData[]>([]);
    const [story, setStory] = useState<StoryData | null>(null);
    const [playerPreviewData, setPlayerPreviewData] = useState<PlayerPreviewOutput | null>(null);
    const [creatorPayload, setCreatorPayload] = useState<QuestOutput | null>(null);
    const [spotDialogues, setSpotDialogues] = useState<SpotDialogue[] | null>(null);
    const spotDialoguesRef = useRef<SpotDialogue[] | null>(null);
    const [coverImageUrl, setCoverImageUrl] = useState<string>('');
    const [isGeneratingCover, setIsGeneratingCover] = useState(false);

    // Section states
    const [sectionStates, setSectionStates] = useState<Record<string, SectionStatus>>({});
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

    // Mobile tab state
    const [activeTab, setActiveTab] = useState<'input' | 'canvas'>('input');

    // View mode: input -> preview (after generation) -> canvas (after edit click)
    const [viewMode, setViewMode] = useState<'input' | 'preview' | 'canvas'>('input');

    // Edit form states
    const [editBasicInfo, setEditBasicInfo] = useState<BasicInfoData | null>(null);
    const [editSpots, setEditSpots] = useState<Record<string, SpotData>>({});
    const [editStory, setEditStory] = useState<StoryData | null>(null);

    // Content tab state (route / story / mystery)
    const [contentTab, setContentTab] = useState<'route' | 'story' | 'mystery'>('route');

    // Selected spot for detail view
    const [selectedSpotIndex, setSelectedSpotIndex] = useState<number | null>(null);

    // 謎・テストタブの展開状態
    const [expandedMysterySpots, setExpandedMysterySpots] = useState<Set<string>>(new Set());

    // Character edit slide-over state
    const [characterEditOpen, setCharacterEditOpen] = useState(false);
    const [focusedCharacterId, setFocusedCharacterId] = useState<string | null>(null);

    const spotRangeForSelectedDuration = getSpotRangeForDuration(constraints.duration);
    const maxSpotsForSelectedDuration = spotRangeForSelectedDuration.max;
    const minSpotsForSelectedDuration = spotRangeForSelectedDuration.min;
    const minDurationForSelectedSpotCount = getMinDurationForSpotCount(constraints.spotCount);

    // Checklist completion state
    const [checklistState, setChecklistState] = useState<Record<string, boolean>>({
        title: false,
        spots: false,
        mystery: false,
        story: false,
        preview: false,
    });

    // Pro subscription modal state
    const [showProModal, setShowProModal] = useState(false);
    const [showConstraints, setShowConstraints] = useState(false);

    // URL パラメータから prompt を読み取る
    const [searchParams] = useSearchParams();
    const urlPromptRef = useRef(false); // 一度だけ実行するためのフラグ

    useEffect(() => {
        const urlPrompt = searchParams.get('prompt');
        if (urlPrompt && !urlPromptRef.current && !prompt) {
            urlPromptRef.current = true;
            setPrompt(urlPrompt);
            // 少し遅延してから自動生成開始
            setTimeout(() => {
                // handleGenerate をトリガー
                const generateButton = document.querySelector('[data-generate-trigger]') as HTMLButtonElement;
                if (generateButton) {
                    generateButton.click();
                }
            }, 500);
        }
    }, [searchParams, prompt]);

    // Saving state
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [draftQuestId, setDraftQuestId] = useState<string | null>(questId);

    const hasContent = basicInfo !== null || spots.length > 0 || story !== null;

    // Loading state for initial data fetch
    const [isLoading, setIsLoading] = useState(false);

    const generateSpotDialogues = async (
        storyData: StoryData,
        spotsData: SpotData[],
        questData?: QuestOutput
    ): Promise<SpotDialogue[] | null> => {
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
        if (!apiKey || !storyData || !spotsData.length) return null;
        const questSource = questData || creatorPayload;
        const castList = [
            { name: storyData.castName || '案内人', role: storyData.castTone || '案内人', tone: storyData.castTone || '' },
            ...(storyData.characters || []).map((c) => ({
                name: c.name || '',
                role: c.role || '',
                tone: c.tone || '',
            })),
        ].filter((c) => c.name);
        const spotInputs = spotsData.map((s, idx) => ({
            spot_index: idx,
            name: s.name,
            scene_role: s.sceneRole || '',
            plot_key: s.plotKey || '',
            puzzle_type: s.puzzleType || '',
            story_hint: s.storyText || '',
            puzzle_hint: s.challengeText || '',
        }));
        const prompt = `
あなたは長編の街歩きミステリーを設計する脚本家です。
以下の情報をもとに、各スポットでの会話（pre/post）を生成してください。

【重要条件】
- スポットは順番通りに物語の起承転結を形成すること
- 会話は物語の進行に必須の内容のみ（無関係な雑談は禁止）
- 各スポットの会話は、そのスポットの謎/物語の鍵に必ず触れること
- 話者は必ず以下の登場人物リストから選ぶこと
- preDialogue: 2〜4行、postDialogue: 1〜2行
- 返答はJSONのみ

【クエスト概要】
タイトル: ${questSource?.quest_title || basicInfo?.title || ''}
あらすじ: ${questSource?.main_plot?.premise || ''}
目的: ${questSource?.main_plot?.goal || ''}
対立/謎: ${questSource?.main_plot?.antagonist_or_mystery || ''}
結末: ${questSource?.main_plot?.final_reveal_outline || ''}

【登場人物】
${castList.map((c) => `- ${c.name}（役割:${c.role || '未設定'} / トーン:${c.tone || '未設定'}）`).join('\n')}

【スポット情報】
${spotInputs
    .map((s) => `#${s.spot_index + 1} ${s.name}
  - scene_role: ${s.scene_role}
  - plot_key: ${s.plot_key}
  - puzzle_type: ${s.puzzle_type}
  - story_hint: ${s.story_hint}
  - puzzle_hint: ${s.puzzle_hint}`)
    .join('\n')}

【出力形式】
{
  "spot_dialogues": [
    {
      "spot_index": 0,
      "preDialogue": [
        { "speakerType": "character", "speakerName": "登場人物名", "text": "会話文" }
      ],
      "postDialogue": [
        { "speakerType": "character", "speakerName": "登場人物名", "text": "会話文" }
      ]
    }
  ]
}
`.trim();

        const res = await fetch(getModelEndpoint('story', apiKey), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
        if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.match(/```json([\s\S]*?)```/);
        const jsonText = jsonMatch ? jsonMatch[1] : text;
        const parsed = JSON.parse(jsonText.trim());
        const dialogues = Array.isArray(parsed?.spot_dialogues) ? (parsed.spot_dialogues as SpotDialogue[]) : null;
        console.log('[Canvas] Generated spot dialogues:', dialogues);
        return dialogues;
    };

    const generateCoverImage = async (payload: {
        questId: string;
        title: string;
        premise: string;
        goal?: string;
        area?: string;
        tags?: string[];
        tone?: string;
        genre?: string;
        protagonist?: string;
        objective?: string;
        ending?: string;
        when?: string;
        where?: string;
        purpose?: string;
        withWhom?: string;
    }) => {
        if (!payload.questId) return;
        setIsGeneratingCover(true);
        try {
            const response = await supabase.functions.invoke('generate-quest-cover', {
                body: {
                    questId: payload.questId,
                    title: payload.title,
                    premise: payload.premise,
                    goal: payload.goal || '',
                    area: payload.area || '',
                    tags: payload.tags || [],
                    tone: payload.tone || '',
                    genre: payload.genre || '',
                    protagonist: payload.protagonist || '',
                    objective: payload.objective || '',
                    ending: payload.ending || '',
                    when: payload.when || '',
                    where: payload.where || '',
                    purpose: payload.purpose || '',
                    withWhom: payload.withWhom || '',
                },
            });

            if (response.error) {
                throw response.error;
            }

            const imageUrl = response.data?.imageUrl || response.data?.imageUrls?.[0] || '';
            if (!imageUrl) return;

            setCoverImageUrl(imageUrl);
            setBasicInfo((prev) => (prev ? { ...prev, coverImageUrl: imageUrl } : prev));

            const { error: updateErr } = await supabase
                .from('quests')
                .update({ cover_image_url: imageUrl })
                .eq('id', payload.questId);
            if (updateErr) {
                console.warn('[Canvas] cover_image_url update skipped:', updateErr);
            }
        } catch (err) {
            console.warn('[Canvas] Cover image generation failed:', err);
        } finally {
            setIsGeneratingCover(false);
        }
    };

    useEffect(() => {
        setDraftQuestId(questId);
    }, [questId]);

    // Load existing quest data when editing from profile
    useEffect(() => {
        if (!questId) return;

        const loadQuestData = async () => {
            setIsLoading(true);

            try {
                // Load basic info from quests table
                const { data: questData } = await supabase
                    .from('quests')
                    .select('*')
                    .eq('id', questId)
                    .maybeSingle();

                if (questData && questData.title) {
                    setCoverImageUrl(questData.cover_image_url || '');
                    setBasicInfo({
                        title: questData.title || '',
                        description: questData.description || '',
                        area: questData.area_name || '',
                        difficulty: '中級',
                        tags: Array.isArray(questData.tags) ? questData.tags : [],
                        coverImageUrl: questData.cover_image_url || '',
                    });
                    setSectionStates(prev => ({ ...prev, 'basic-info': 'ready' }));
                }

                // Load spots with details
                const { data: spotsData } = await supabase
                    .from('spots')
                    .select('*, spot_details(*)')
                    .eq('quest_id', questId)
                    .order('order_index', { ascending: true });

                if (spotsData && spotsData.length > 0) {
                    const loadedSpots: SpotData[] = spotsData.map((s: any, idx: number) => {
                        const detail = Array.isArray(s.spot_details) ? s.spot_details[0] : s.spot_details;
                        return {
                            id: s.id || `spot-${idx}`,
                            name: s.name || '',
                            address: s.address || '',
                            lat: s.lat || 0,
                            lng: s.lng || 0,
                            directions: detail?.nav_text || '',
                            storyText: detail?.story_text || '',
                            challengeText: detail?.question_text || '',
                            hints: detail?.hint_text ? detail.hint_text.split('\n').filter((h: string) => h.trim()) : [],
                            answer: detail?.answer_text || '',
                            successMessage: detail?.completion_message || '',
                        };
                    });
                    setSpots(loadedSpots);
                    // Mark each spot as ready
                    const spotStates: Record<string, SectionStatus> = {};
                    loadedSpots.forEach((_, idx) => {
                        spotStates[`spot-${idx}`] = 'ready';
                    });
                    setSectionStates(prev => ({ ...prev, ...spotStates }));
                }

                // Load story from story_timelines table
                const { data: storyData } = await supabase
                    .from('story_timelines')
                    .select('*')
                    .eq('quest_id', questId)
                    .maybeSingle();

                if (storyData) {
                    setStory({
                        castName: storyData.cast_name || '',
                        castTone: storyData.cast_tone || '',
                        prologueTitle: '',
                        prologueBody: storyData.prologue || '',
                        epilogueBody: storyData.epilogue || '',
                        characters: Array.isArray(storyData.characters) ? storyData.characters : [],
                    });
                    setSectionStates(prev => ({ ...prev, 'story': 'ready' }));
                }

                // Switch to canvas view if we loaded content
                if (questData?.title || (spotsData && spotsData.length > 0)) {
                    setActiveTab('canvas');
                }

            } catch (err) {
                console.error('Error loading quest data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadQuestData();
    }, [questId]);

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

    // デモデータをロード（API呼び出しなしでUIテスト）
    const handleLoadDemoData = () => {
        setBasicInfo(DEMO_BASIC_INFO);
        setStory(DEMO_STORY);
        setSpots(DEMO_SPOTS as SpotData[]);
        setActiveTab('canvas');
        setSectionStates({
            'basic-info': 'ready',
            'spot-0': 'ready',
            'spot-1': 'ready',
            'spot-2': 'ready',
            'story': 'ready',
        });
        setError(null);
    };

    // 現在地を取得
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError('お使いのブラウザは位置情報に対応していません');
            return;
        }

        setIsLoadingLocation(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Google Geocoding APIで住所を取得
                try {
                    const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
                    if (apiKey) {
                        const res = await fetch(
                            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=ja&key=${apiKey}`
                        );
                        const data = await res.json();
                        const address = data.results?.[0]?.formatted_address?.replace(/日本、〒[\d-]+\s*/, '') || '';
                        setCurrentLocation({ lat, lng, address });
                    } else {
                        setCurrentLocation({ lat, lng });
                    }
                } catch {
                    setCurrentLocation({ lat, lng });
                }
                setIsLoadingLocation(false);
            },
            (err) => {
                setError('位置情報の取得に失敗しました: ' + err.message);
                setIsLoadingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('プロンプトを入力してください');
            return;
        }

        console.log('[Canvas] handleGenerate started');
        setIsGenerating(true);
        setError(null);

        // Switch to player preview mode immediately (UI shows preview while generation happens in background)
        setViewMode('preview');
        setActiveTab('canvas'); // Ensure right panel is visible on mobile

        // Reset state
        setBasicInfo(null);
        setSpots([]);
        setStory(null);
        setCoverImageUrl('');
        setSpotDialogues(null);
        spotDialoguesRef.current = null;

        try {
            let activeQuestId = draftQuestId || questId;
            if (!activeQuestId) {
                activeQuestId = crypto.randomUUID();
                localStorage.setItem('quest-id', activeQuestId);
                setDraftQuestId(activeQuestId);
                onQuestIdChange?.(activeQuestId);
            }

            // Get Gemini API key
            const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error('VITE_GEMINI_API_KEY が設定されていません。');
            }

            // Layton Pipeline Request - main prompt first, support info as constraints
            const clampedSpotCount = Math.min(12, Math.max(5, constraints.spotCount));
            const request: QuestGenerationRequest = {
                prompt,
                difficulty: constraints.difficulty,
                spot_count: clampedSpotCount,
                theme_tags: selectedTags.length > 0 ? selectedTags : undefined,
                genre_support: genreSupport ? GENRE_SUPPORT_TAGS.find(g => g.id === genreSupport)?.label : undefined,
                tone_support: toneSupport ? TONE_SUPPORT_TAGS.find(t => t.id === toneSupport)?.label : undefined,
                prompt_support: (promptSupport.protagonist || promptSupport.objective || promptSupport.ending || travelProfile.when || travelProfile.where || travelProfile.purpose || travelProfile.withWhom)
                    ? {
                        protagonist: promptSupport.protagonist,
                        objective: promptSupport.objective,
                        ending: promptSupport.ending,
                        when: travelProfile.when,
                        where: travelProfile.where,
                        purpose: travelProfile.purpose,
                        withWhom: travelProfile.withWhom,
                    }
                    : undefined,
                center_location: currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : undefined,
                radius_km: constraints.radiusKm,
            };

            // Generate using Layton Pipeline
            const dualOutput: QuestDualOutput = await generateLaytonQuest(request, apiKey, {
                onProgress: (state: PipelineState) => {
                    const stepNames: Record<string, string> = {
                        motif_selection: 'モチーフを選定中...',
                        plot_creation: '物語を構築中...',
                        puzzle_design: `謎を設計中... (${state.current_spot_index ?? 0 + 1}/${state.total_spots ?? 0})`,
                        validation: '品質を検証中...',
                    };
                    setGenerationPhase(stepNames[state.step_name] || 'AIがクエストを設計中...');

                    // Update section states based on progress
                    if (state.step_name === 'plot_creation') {
                        setSectionStates({ 'basic-info': 'generating' });
                    } else if (state.step_name === 'puzzle_design' && state.current_spot_index !== undefined) {
                        setSectionStates((prev) => ({ ...prev, [`spot-${state.current_spot_index}`]: 'generating' }));
                    }
                },
                onPlotComplete: (mainPlot: MainPlot) => {
                    // Set basic info from main plot
                    setBasicInfo({
                        title: '',  // Will be set after quest completes
                        description: mainPlot.premise,
                        area: '',
                        difficulty: constraints.difficulty === 'easy' ? '初級' : constraints.difficulty === 'medium' ? '中級' : '上級',
                        tags: selectedTags,
                        coverImageUrl: coverImageUrl || '',
                    });
                    setSectionStates({ 'basic-info': 'ready' });
                },
                onSpotComplete: (spot: SpotScene, index: number) => {
                    // Convert SpotScene to SpotData with Layton Pipeline fields
                    const newSpot: SpotData = {
                        id: spot.spot_id,
                        name: spot.spot_name,
                        address: '',
                        lat: spot.lat,
                        lng: spot.lng,
                        directions: spot.lore_card.player_handout,
                        storyText: spot.lore_card.short_story_text,
                        challengeText: spot.puzzle.prompt,
                        hints: spot.puzzle.hints,
                        answer: spot.puzzle.answer,
                        successMessage: spot.reward.next_hook,
                        // Layton Pipeline additions
                        playerHandout: spot.lore_card.player_handout,
                        solutionSteps: spot.puzzle.solution_steps,
                        loreReveal: spot.reward.lore_reveal,
                        plotKey: spot.reward.plot_key,
                        puzzleType: spot.puzzle.type,
                        sceneRole: spot.scene_role,
                        linkingRationale: spot.linking_rationale,
                    };
                    setSpots((prev) => {
                        const next = [...prev];
                        next[index] = newSpot;
                        return next;
                    });
                    setSectionStates((prev) => ({ ...prev, [`spot-${index}`]: 'ready' }));
                },
            });

            // Generate highlights from quest data
            const highlights = [
                `${spots.length}箇所の魅力的なスポットを巡る`,
                'ミステリアスな物語',
                constraints.difficulty === 'easy' ? '初心者でも楽しめる' : constraints.difficulty === 'hard' ? '謎解き上級者向け' : '謎解き好きにぴったり',
                currentLocation ? `${currentLocation.address || '現在地'}周辺を探索` : '街を探索する体験',
            ].filter(Boolean);

            // Generate recommended for
            const recommendedFor = [];
            if (constraints.difficulty === 'easy') {
                recommendedFor.push('初めての謎解き体験');
            }
            if (constraints.duration <= 60) {
                recommendedFor.push('週末のショート散歩');
            }
            recommendedFor.push('友達と一緒に');
            if (selectedTags.includes('歴史')) {
                recommendedFor.push('歴史好きな方');
            }

            // Update basic info with final title and player_preview data
            const preview = dualOutput.player_preview;
            const quest = dualOutput.creator_payload;

            // Store player preview for PlayerPreview component
            setPlayerPreviewData(preview);
            // Store full creator payload for database save
            setCreatorPayload(quest);
            console.log('[Canvas] Generation complete (before save):', {
                questId: questId || draftQuestId,
                title: quest.quest_title,
                spots: quest.spots?.length || spots.length,
                characters: preview?.characters?.length,
            });

            setBasicInfo({
                title: quest.quest_title,
                description: quest.main_plot.premise,
                area: currentLocation?.address || '',
                difficulty: constraints.difficulty === 'easy' ? '初級' : constraints.difficulty === 'medium' ? '中級' : '上級',
                tags: preview.tags || selectedTags,
                highlights: preview.teasers?.slice(0, 4) || highlights,
                recommendedFor: preview.tags?.slice(0, 7) || recommendedFor,
                coverImageUrl: coverImageUrl || '',
            });

            // Set story data from preview and quest
            const nextStory = {
                castName: '謎の案内人',
                castTone: '知的でミステリアス',
                prologueTitle: '冒険の始まり',
                prologueBody: preview.trailer || quest.main_plot.premise + '\n\n' + quest.main_plot.goal,
                epilogueBody: quest.main_plot.final_reveal_outline + '\n\n' + quest.meta_puzzle.explanation,
                characters: [
                    { id: 'c1', name: '案内人', role: 'ナビゲーター', color: 'bg-brand-gold', tone: 'ミステリアス' }
                ],
                atmosphere: preview.route_meta.weather_note || 'ミステリアスな雰囲気',
                whatToExpect: preview.summary_actions?.join(' → ') || '歩く → 探す → 解く',
                mission: preview.mission,
                clearCondition: '最終スポットですべての暗号を解き、エンディングに到達する',
                teaser: preview.teasers?.[0] || 'このクエストには秘密が待っています',
            };
            setStory(nextStory);

            const toneLabel = toneSupport ? TONE_SUPPORT_TAGS.find((t) => t.id === toneSupport)?.label : '';
            const genreLabel = genreSupport ? GENRE_SUPPORT_TAGS.find((g) => g.id === genreSupport)?.label : '';
            void generateCoverImage({
                questId: activeQuestId,
                title: quest.quest_title,
                premise: quest.main_plot.premise,
                goal: quest.main_plot.goal,
                area: currentLocation?.address || '',
                tags: preview.tags || selectedTags,
                tone: toneLabel || preview.route_meta?.weather_note || '',
                genre: genreLabel || '',
                protagonist: promptSupport.protagonist,
                objective: promptSupport.objective,
                ending: promptSupport.ending,
                when: travelProfile.when,
                where: travelProfile.where,
                purpose: travelProfile.purpose,
                withWhom: travelProfile.withWhom,
            });

            try {
                const spotsForDialogue: SpotData[] = quest.spots?.length
                    ? quest.spots.map((s, idx) => ({
                        id: s.spot_id || `spot-${idx}`,
                        name: s.spot_name,
                        address: '',
                        lat: s.lat,
                        lng: s.lng,
                        directions: s.lore_card.player_handout,
                        storyText: s.lore_card.short_story_text,
                        challengeText: s.puzzle.prompt,
                        hints: s.puzzle.hints,
                        answer: s.puzzle.answer,
                        successMessage: s.reward.next_hook,
                        playerHandout: s.lore_card.player_handout,
                        solutionSteps: s.puzzle.solution_steps,
                        loreReveal: s.reward.lore_reveal,
                        plotKey: s.reward.plot_key,
                        puzzleType: s.puzzle.type,
                        sceneRole: s.scene_role,
                        linkingRationale: s.linking_rationale,
                    }))
                    : spots;
                console.log('[Canvas] Dialogue generation inputs:', {
                    spots: spotsForDialogue.length,
                    cast: nextStory.characters?.length || 0,
                });
                const dialogues = await generateSpotDialogues(nextStory, spotsForDialogue, quest);
                if (dialogues) {
                    console.log('[Canvas] Generated spot dialogues (before save):', dialogues);
                    spotDialoguesRef.current = dialogues;
                    setSpotDialogues(dialogues);
                }
            } catch (dialogueErr) {
                console.warn('[Canvas] Dialogue generation failed:', dialogueErr);
            }

            // Final state updates
            setSectionStates((prev) => ({ ...prev, 'story': 'ready' }));
            setGenerationPhase('');

            // Log validation results
            if (quest.generation_metadata.validation_warnings?.length) {
                console.log('Validation warnings:', quest.generation_metadata.validation_warnings);
            }

        } catch (err: any) {
            console.error('Generation error:', err);
            setError(err.message || '生成に失敗しました。時間をおいて再試行してください。');
            setSectionStates({});
        } finally {
            setIsGenerating(false);
        }
    };

    const saveToDatabase = async (qId: string, result: any, mappedSpots: SpotData[]) => {
        try {
            // Build main_plot for quests table (map from Layton types to step page types)
            const mainPlotData = creatorPayload?.main_plot ? {
                premise: creatorPayload.main_plot.premise,
                goal: creatorPayload.main_plot.goal,
                antagonist: creatorPayload.main_plot.antagonist_or_mystery,
                finalReveal: creatorPayload.main_plot.final_reveal_outline,
            } : null;

            // Use upsert to create or update the quest, include creator_id for profile listing
            await supabase.from('quests').upsert({
                id: qId,
                creator_id: user?.id,
                title: result.title,
                description: result.description,
                area_name: result.area,
                tags: result.tags,
                cover_image_url: coverImageUrl || result.coverImageUrl || null,
                status: 'draft',
                mode: 'PRIVATE',
                main_plot: mainPlotData,
            }, { onConflict: 'id' });

            const spotRows = mappedSpots.map((s, idx) => ({
                quest_id: qId,
                name: s.name,
                address: s.address,
                lat: s.lat,
                lng: s.lng,
                order_index: idx + 1,
            }));

            const { data: existingSpots } = await supabase
                .from('spots')
                .select('id')
                .eq('quest_id', qId);
            if (existingSpots && existingSpots.length > 0) {
                const existingSpotIds = existingSpots.map((s) => s.id);
                await supabase.from('spot_story_messages').delete().in('spot_id', existingSpotIds);
            }

            await supabase.from('spots').delete().eq('quest_id', qId);
            const { error: spotErr } = await supabase.from('spots').insert(spotRows);
            if (spotErr) {
                console.error('[Canvas] spots insert failed:', spotErr);
                throw spotErr;
            }
            const { data: insertedSpots, error: insertedReadErr } = await supabase
                .from('spots')
                .select('id, order_index')
                .eq('quest_id', qId)
                .order('order_index', { ascending: true });
            if (insertedReadErr) {
                console.error('[Canvas] spots select after insert failed:', insertedReadErr);
                throw insertedReadErr;
            }
            const insertedByOrder = new globalThis.Map<number, string>();
            (insertedSpots || []).forEach((s) => {
                if (s.order_index != null) insertedByOrder.set(s.order_index, s.id);
            });

            if (spotRows.length) {
                // Map Layton pipeline puzzle types to step page types
                const puzzleTypeMap: Record<string, string> = {
                    'logic': 'logic',
                    'pattern': 'pattern',
                    'cipher': 'cipher',
                    'wordplay': 'wordplay',
                    'lateral': 'lateral',
                    'math': 'arithmetic',
                };

                // Map Layton scene roles to step page scene roles
                const sceneRoleMap: Record<string, string> = {
                    '導入': 'introduction',
                    '展開': 'development',
                    '転換': 'turning_point',
                    '真相接近': 'truth_approach',
                    'ミスリード解除': 'misdirect_clear',
                    '結末': 'conclusion',
                };

                const detailRows = spotRows.map((spot, idx) => {
                    const spotData = mappedSpots[idx];
                    const pipelineSpot = creatorPayload?.spots?.[idx];
                    const spotId = insertedByOrder.get(idx + 1);
                    if (!spotId) return null;

                    // Build puzzle_config for step page format
                    const puzzleConfig = pipelineSpot ? {
                        puzzleType: puzzleTypeMap[pipelineSpot.puzzle.type] || 'logic',
                        difficulty: pipelineSpot.puzzle.difficulty,
                        solutionSteps: pipelineSpot.puzzle.solution_steps || [],
                        hints: {
                            hint1: pipelineSpot.puzzle.hints?.[0] || '',
                            hint2: pipelineSpot.puzzle.hints?.[1] || '',
                            hint3: pipelineSpot.puzzle.hints?.[2] || '',
                        }
                    } : null;

                    // Build lore_card for step page format
                    const loreCard = pipelineSpot ? {
                        narrativeText: pipelineSpot.lore_card.short_story_text || '',
                        usedFacts: pipelineSpot.lore_card.facts_used || [],
                        playerMaterial: pipelineSpot.lore_card.player_handout || '',
                    } : null;

                    // Build reward for step page format
                    const reward = pipelineSpot ? {
                        loreReveal: pipelineSpot.reward.lore_reveal || '',
                        plotKey: pipelineSpot.reward.plot_key || '',
                        nextHook: pipelineSpot.reward.next_hook || '',
                    } : null;

                    // Build scene_settings for step page format
                    const sceneSettings = pipelineSpot ? {
                        sceneRole: sceneRoleMap[pipelineSpot.scene_role] || 'development',
                        linkingRationale: pipelineSpot.linking_rationale || '',
                    } : null;

                    return {
                        spot_id: spotId,
                        nav_text: spotData?.directions || '',
                        story_text: spotData?.storyText || '',
                        question_text: spotData?.challengeText || '',
                        hint_text: spotData?.hints?.join('\n') || '',
                        answer_text: spotData?.answer || '',
                        completion_message: spotData?.successMessage || '',
                        answer_type: 'text',
                        puzzle_config: puzzleConfig,
                        lore_card: loreCard,
                        reward: reward,
                        scene_settings: sceneSettings,
                    };
                }).filter(Boolean) as { spot_id: string }[];
                const { error: detailErr } = await supabase.from('spot_details').upsert(detailRows, { onConflict: 'spot_id' });
                if (detailErr) {
                    console.error('[Canvas] spot_details upsert failed:', detailErr);
                    throw detailErr;
                }
            }

            // Build meta_puzzle for step page format
            const metaPuzzleData = creatorPayload?.meta_puzzle ? {
                keys: creatorPayload.meta_puzzle.inputs.map((input, idx) => ({
                    spotId: creatorPayload.spots?.[idx]?.spot_id || `spot-${idx}`,
                    plotKey: creatorPayload.spots?.[idx]?.reward?.plot_key || '',
                    isUsed: true,
                })),
                questionText: creatorPayload.meta_puzzle.prompt || '',
                finalAnswer: creatorPayload.meta_puzzle.answer || '',
                truthConnection: creatorPayload.meta_puzzle.explanation || '',
            } : null;

            if (result.story) {
                await supabase.from('story_timelines').upsert({
                    quest_id: qId,
                    prologue: result.story.prologueBody,
                    epilogue: result.story.epilogueBody,
                    cast_name: result.story.castName,
                    cast_tone: result.story.castTone,
                    characters: result.story.characters,
                    meta_puzzle: metaPuzzleData,
                }, { onConflict: 'quest_id' });
            }

            const spotDialoguesToSave = spotDialoguesRef.current;
            if (spotDialoguesToSave && spotRows.length) {
                const spotIds = Array.from(insertedByOrder.values());
                await supabase.from('spot_story_messages').delete().in('spot_id', spotIds);
                const rows: {
                    spot_id: string;
                    stage: 'pre_puzzle' | 'post_puzzle';
                    order_index: number;
                    speaker_type: 'character' | 'narrator';
                    speaker_name: string;
                    text: string;
                }[] = [];
                spotDialoguesToSave.forEach((dialogue) => {
                    const spotId = insertedByOrder.get(dialogue.spot_index + 1);
                    if (!spotId) return;
                    (dialogue.preDialogue || []).forEach((line, idx) => {
                        rows.push({
                            spot_id: spotId,
                            stage: 'pre_puzzle',
                            order_index: idx + 1,
                            speaker_type: line.speakerType || 'character',
                            speaker_name: line.speakerName || '',
                            text: line.text || '',
                        });
                    });
                    (dialogue.postDialogue || []).forEach((line, idx) => {
                        rows.push({
                            spot_id: spotId,
                            stage: 'post_puzzle',
                            order_index: idx + 1,
                            speaker_type: line.speakerType || 'character',
                            speaker_name: line.speakerName || '',
                            text: line.text || '',
                        });
                    });
                });
                if (rows.length) {
                    console.log('[Canvas] Inserting spot_story_messages:', rows);
                    const { error } = await supabase.from('spot_story_messages').insert(rows);
                    if (error) {
                        console.error('[Canvas] spot_story_messages insert failed:', error);
                    }
                }
            } else if (!spotDialoguesToSave) {
                console.warn('[Canvas] No spot dialogues available for save. Skipping spot_story_messages insert.');
            }
        } catch (err) {
            console.error('Save to DB error:', err);
        }
    };

    // Manual save handler
    const handleSaveQuest = async (): Promise<string | null> => {
        // Generate questId if it doesn't exist (new quest from Canvas)
        let activeQuestId = draftQuestId;
        if (!activeQuestId || activeQuestId === 'new') {
            activeQuestId = crypto.randomUUID();
            localStorage.setItem('quest-id', activeQuestId);
            setDraftQuestId(activeQuestId);
            onQuestIdChange?.(activeQuestId);
            console.log('[Canvas] Generated new quest ID:', activeQuestId);
        }

        if (!basicInfo) {
            setSaveMessage('保存するコンテンツがありません');
            setTimeout(() => setSaveMessage(null), 3000);
            return null;
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
                coverImageUrl: basicInfo.coverImageUrl || coverImageUrl || '',
                story: story ? {
                    prologueBody: story.prologueBody,
                    epilogueBody: story.epilogueBody,
                    castName: story.castName,
                    castTone: story.castTone,
                    characters: story.characters,
                } : null,
            };

            await saveToDatabase(activeQuestId, result, spots);
            setSaveMessage('保存しました！');
            setTimeout(() => setSaveMessage(null), 3000);
            return activeQuestId;
        } catch (err) {
            console.error('Save error:', err);
            setSaveMessage('保存に失敗しました');
            setTimeout(() => setSaveMessage(null), 3000);
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white pt-16">
            {/* Main Canvas Content - always show two-column layout */}
            <div className="min-h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] md:overflow-hidden">
                <div className="flex flex-col md:flex-row md:min-h-0">
                    {/* Left Panel - Input */}
                    <div
                        className={`w-full md:w-[380px] md:h-[calc(100vh-4rem)] md:overflow-y-auto md:min-h-0 md:border-r border-stone-200 bg-white ${activeTab === 'input' ? 'block' : 'hidden md:block'
                            }`}
                    >
                        <div className="p-5 pt-12 space-y-5">
                            {/* Mode toggle - hidden for Pro users (always Pro mode) */}
                            {!isPro && (
                                <div className="flex items-center bg-stone-100 rounded-full p-0.5">
                                    <button
                                        onClick={() => setMode('simple')}
                                        className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${mode === 'simple'
                                            ? 'bg-white text-brand-dark shadow-sm'
                                            : 'text-stone-500'
                                            }`}
                                    >
                                        Free
                                    </button>
                                    <button
                                        onClick={() => setShowProModal(true)}
                                        className="flex-1 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1 text-stone-500 hover:text-amber-600"
                                    >
                                        <Crown size={12} className="text-amber-500" />
                                        Pro
                                    </button>
                                </div>
                            )}

                            {/* ========== 1) MAIN PROMPT (Hero) ========== */}
                            <div className="relative">
                                <label className="flex items-center gap-2 text-sm font-bold text-brand-dark mb-2">
                                    <Sparkles size={16} className="text-brand-gold" />
                                    どんなクエストを作りたいですか？
                                </label>
                                <div className="relative">
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="例：浅草の夜に消えた絵を追うミステリー"
                                        className="w-full h-28 p-4 pr-10 rounded-xl border-2 border-stone-200 text-sm text-brand-dark placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold resize-none"
                                    />
                                    <button
                                        onClick={generateRandomPrompt}
                                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-brand-dark transition-colors"
                                        title="ランダム生成"
                                    >
                                        <Dices size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* ========== CONSTRAINT TOGGLE ========== */}
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => setShowConstraints((prev) => !prev)}
                                    className="flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-brand-dark transition-colors"
                                >
                                    <Lightbulb size={14} />
                                    旅の条件を設定する（任意）
                                    <ChevronDown size={14} className={`transition-transform ${showConstraints ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            <AnimatePresence>
                                    {showConstraints && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden space-y-4"
                                    >
                                        {/* ========== 2) TRAVEL PROFILE ========== */}
                                        <div className="space-y-3 rounded-2xl border border-stone-200 bg-white/90 p-4 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <Compass size={14} className="text-brand-gold" />
                                                <span className="text-xs font-bold text-stone-600">旅の基本情報</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] text-stone-400 mb-1">いつ？</label>
                                                    <input
                                                        type="text"
                                                        value={travelProfile.when}
                                                        onChange={(e) => setTravelProfile((p) => ({ ...p, when: e.target.value }))}
                                                        placeholder="例: 週末の午後"
                                                        className="w-full px-2 py-2 rounded-lg border border-stone-200 text-xs placeholder:text-stone-300"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-stone-400 mb-1">どこで？</label>
                                                    <input
                                                        type="text"
                                                        value={travelProfile.where}
                                                        onChange={(e) => setTravelProfile((p) => ({ ...p, where: e.target.value }))}
                                                        placeholder="例: 浅草周辺"
                                                        className="w-full px-2 py-2 rounded-lg border border-stone-200 text-xs placeholder:text-stone-300"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-stone-400 mb-1">目的は？</label>
                                                    <input
                                                        type="text"
                                                        value={travelProfile.purpose}
                                                        onChange={(e) => setTravelProfile((p) => ({ ...p, purpose: e.target.value }))}
                                                        placeholder="例: 観光と謎解き"
                                                        className="w-full px-2 py-2 rounded-lg border border-stone-200 text-xs placeholder:text-stone-300"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-stone-400 mb-1">誰と？</label>
                                                    <input
                                                        type="text"
                                                        value={travelProfile.withWhom}
                                                        onChange={(e) => setTravelProfile((p) => ({ ...p, withWhom: e.target.value }))}
                                                        placeholder="例: 友達と2人"
                                                        className="w-full px-2 py-2 rounded-lg border border-stone-200 text-xs placeholder:text-stone-300"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* ========== 3) TRIP PLANNING (Traveler UI) ========== */}
                                        <div className="space-y-4 rounded-2xl border border-stone-200 bg-white/90 p-4 shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={14} className="text-brand-gold" />
                                                    <span className="text-xs font-bold text-stone-600">旅のプランニング</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <label className="flex items-center gap-2 text-xs font-medium text-stone-500 mb-2">
                                                        <Clock size={12} className="text-stone-400" />
                                                        どれくらい歩きたい？
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {TRIP_DURATION_OPTIONS.map((option) => (
                                                            <button
                                                                key={option.value}
                                                                onClick={() => {
                                                                    if (!isSpotCountAllowed(option.value, constraints.spotCount)) return;
                                                                    setConstraints((c) => ({ ...c, duration: option.value }));
                                                                }}
                                                                disabled={!isSpotCountAllowed(option.value, constraints.spotCount)}
                                                                className={`px-3 py-2 rounded-xl text-left transition-all border ${constraints.duration === option.value
                                                                    ? 'bg-brand-gold text-white border-brand-gold'
                                                                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                                                                    } ${!isSpotCountAllowed(option.value, constraints.spotCount)
                                                                        ? 'opacity-40 cursor-not-allowed hover:bg-white'
                                                                        : ''}`}
                                                            >
                                                                <div className="text-xs font-bold">{option.label}</div>
                                                                <div className="text-[10px] opacity-80">{option.note}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-stone-400 mt-1">
                                                        現実的に難しい組み合わせは選択できません
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="flex items-center gap-2 text-xs font-medium text-stone-500 mb-2">
                                                        <MapPin size={12} className="text-stone-400" />
                                                        立ち寄りスポット数
                                                    </label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {SPOT_COUNT_OPTIONS.map((count) => (
                                                            <button
                                                                key={count}
                                                                onClick={() => {
                                                                    if (count > maxSpotsForSelectedDuration || count < minSpotsForSelectedDuration) return;
                                                                    setConstraints((c) => ({ ...c, spotCount: count }));
                                                                }}
                                                                disabled={count > maxSpotsForSelectedDuration || count < minSpotsForSelectedDuration}
                                                                className={`px-3 py-2 rounded-full text-xs font-bold transition-all ${constraints.spotCount === count
                                                                    ? 'bg-brand-dark text-white'
                                                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                                                    } ${count > maxSpotsForSelectedDuration || count < minSpotsForSelectedDuration
                                                                        ? 'opacity-40 cursor-not-allowed hover:bg-stone-100'
                                                                        : ''}`}
                                                            >
                                                                {count}スポット
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-stone-400 mt-1">
                                                        {constraints.spotCount > maxSpotsForSelectedDuration
                                                            ? `${constraints.duration}分なら最大${maxSpotsForSelectedDuration}スポットまで`
                                                            : constraints.spotCount < minSpotsForSelectedDuration
                                                                ? `${constraints.duration}分なら最低${minSpotsForSelectedDuration}スポットから`
                                                                : `選択範囲: ${minSpotsForSelectedDuration}〜${maxSpotsForSelectedDuration}スポット`}
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="flex items-center gap-2 text-xs font-medium text-stone-500 mb-2">
                                                        <Flame size={12} className="text-stone-400" />
                                                        謎解きの手応え
                                                    </label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {TRIP_DIFFICULTY_OPTIONS.map((option) => (
                                                            <button
                                                                key={option.value}
                                                                onClick={() => setConstraints((c) => ({ ...c, difficulty: option.value }))}
                                                                className={`p-2 rounded-xl text-left transition-all border ${constraints.difficulty === option.value
                                                                    ? 'bg-stone-900 text-white border-stone-900'
                                                                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                                                                    }`}
                                                            >
                                                                <div className="text-xs font-bold">{option.label}</div>
                                                                <div className="text-[10px] opacity-70">{option.desc}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-stone-400 mt-1">
                                                        {minDurationForSelectedSpotCount > constraints.duration
                                                            ? `${constraints.spotCount}スポットなら${minDurationForSelectedSpotCount}分以上がおすすめ`
                                                            : '体感に合わせて選べます'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ========== 4) MOOD & GENRE ========== */}
                                        <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                                            <div>
                                                <label className="block text-xs font-medium text-stone-500 mb-2">
                                                    🎨 旅のムード（任意）
                                                </label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {TONE_SUPPORT_TAGS.map((tone) => (
                                                        <button
                                                            key={tone.id}
                                                            onClick={() => setToneSupport(toneSupport === tone.id ? undefined : tone.id)}
                                                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all ${toneSupport === tone.id
                                                                ? 'bg-violet-500 text-white'
                                                                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                                                                }`}
                                                            title={tone.description}
                                                        >
                                                            {toneSupport !== tone.id && <Plus size={10} />}
                                                            {tone.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-stone-500 mb-2">
                                                    🏷️ 興味のあるジャンル（任意）
                                                </label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {GENRE_SUPPORT_TAGS.map((genre) => (
                                                        <button
                                                            key={genre.id}
                                                            onClick={() => setGenreSupport(genreSupport === genre.id ? undefined : genre.id)}
                                                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all ${genreSupport === genre.id
                                                                ? 'bg-brand-gold text-white'
                                                                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                                                                }`}
                                                            title={genre.description}
                                                        >
                                                            {genreSupport !== genre.id && <Plus size={10} />}
                                                            {genre.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* ========== 5) AREA & RADIUS ========== */}
                                        <div className="space-y-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                                            <div>
                                                <label className="flex items-center gap-2 text-xs font-medium text-stone-500 mb-2">
                                                    📍 いまいる場所から探す
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={getCurrentLocation}
                                                        disabled={isLoadingLocation}
                                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${currentLocation
                                                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                            : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                                                            }`}
                                                    >
                                                        {isLoadingLocation ? (
                                                            <>
                                                                <Loader2 size={14} className="animate-spin" />
                                                                取得中...
                                                            </>
                                                        ) : currentLocation ? (
                                                            <>
                                                                <MapPin size={14} />
                                                                {currentLocation.address?.slice(0, 20) || '現在地取得済み'}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <MapPin size={14} />
                                                                現在地を取得
                                                            </>
                                                        )}
                                                    </button>
                                                    {currentLocation && (
                                                        <button
                                                            onClick={() => setCurrentLocation(null)}
                                                            className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
                                                            title="クリア"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="flex items-center justify-between text-xs text-stone-500 mb-2">
                                                    <span>🎯 歩く範囲</span>
                                                    <span className="font-bold text-brand-dark">{constraints.radiusKm}km圏内</span>
                                                </label>
                                                <input
                                                    type="range"
                                                    min="0.5"
                                                    max="5"
                                                    step="0.5"
                                                    value={constraints.radiusKm}
                                                    onChange={(e) => setConstraints(c => ({ ...c, radiusKm: parseFloat(e.target.value) }))}
                                                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-brand-gold"
                                                />
                                                <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                                                    <span>500m</span>
                                                    <span>2km</span>
                                                    <span>3.5km</span>
                                                    <span>5km</span>
                                                </div>
                                                <p className="text-[10px] text-stone-400 mt-2">
                                                    いまいる場所から{constraints.radiusKm}km以内のエリアで作成
                                                </p>
                                            </div>
                                        </div>

                                        {/* ========== AI SUMMARY PREVIEW ========== */}
                                        {prompt.trim() && (
                                            <div className="p-3 bg-gradient-to-r from-stone-50 to-amber-50 rounded-xl border border-amber-100">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Sparkles size={14} className="text-brand-gold" />
                                                    <span className="text-xs font-bold text-stone-600">AIへの入力サマリー</span>
                                                </div>
                        <div className="text-xs text-stone-600 space-y-1">
                                                    <div><span className="font-medium text-stone-700">メイン：</span>{prompt.slice(0, 50)}{prompt.length > 50 && '...'}</div>
                                                    {genreSupport && (
                                                        <div><span className="font-medium text-stone-700">ジャンル：</span>{GENRE_SUPPORT_TAGS.find(g => g.id === genreSupport)?.label}</div>
                                                    )}
                                                    {toneSupport && (
                                                        <div><span className="font-medium text-stone-700">ムード：</span>{TONE_SUPPORT_TAGS.find(t => t.id === toneSupport)?.label}</div>
                                                    )}
                                                    {(travelProfile.when || travelProfile.where || travelProfile.purpose || travelProfile.withWhom) && (
                                                        <div><span className="font-medium text-stone-700">旅の基本：</span>
                                                            {[travelProfile.when && `いつ=${travelProfile.when}`, travelProfile.where && `どこ=${travelProfile.where}`, travelProfile.purpose && `目的=${travelProfile.purpose}`, travelProfile.withWhom && `誰と=${travelProfile.withWhom}`].filter(Boolean).join(' / ')}
                                                        </div>
                                                    )}
                                                    <div><span className="font-medium text-stone-700">設定：</span>難易度={constraints.difficulty === 'easy' ? '初級' : constraints.difficulty === 'medium' ? '中級' : '上級'} / スポット数={constraints.spotCount}</div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Error */}
                            {error && (
                                <div className="p-3 rounded-lg bg-rose-50 text-rose-600 text-xs">
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Create Button (like Suno) */}
                        <div className="sticky bottom-0 p-4 bg-gradient-to-t from-white via-white to-transparent space-y-2">
                            <button
                                onClick={handleGenerate}
                                data-generate-trigger
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
                            {/* Demo Data Button - for UI/UX testing without API */}
                        </div>
                    </div>

                    {/* Right Panel - Dashboard Workspace */}
                    <div
                        className={`flex-1 md:h-[calc(100vh-4rem)] md:min-h-0 md:overflow-y-auto bg-stone-50 ${activeTab === 'canvas' ? 'block' : 'hidden md:block'
                            }`}
                    >
                        {/* Content area */}
                        <div className="p-4 md:p-6">
                            {/* Player Preview Mode - shown after generation, no spoilers */}
                            {viewMode === 'preview' && basicInfo ? (
                                <PlayerPreview
                                    basicInfo={basicInfo}
                                    spots={spots.map((s, idx) => ({
                                        id: s.id,
                                        name: s.name,
                                        lat: s.lat,
                                        lng: s.lng,
                                        isHighlight: idx < 3, // Mark first 3 spots as highlights
                                        highlightDescription: idx < 3 ? `${s.name}では、${s.sceneRole || 'この場所ならではの'}謎解きが待っています。` : undefined
                                    }))}
                                    story={story || null}
                                    estimatedDuration={constraints.duration}
                                    isGenerating={isGenerating}
                                    generationPhase={generationPhase}
                                    playerPreviewData={playerPreviewData}
                                    isGeneratingCover={isGeneratingCover}
                                    routeMetadata={playerPreviewData?.route_meta ? {
                                        distanceKm: parseFloat(playerPreviewData.route_meta.distance_km) || spots.length * 0.3,
                                        walkingMinutes: parseInt(playerPreviewData.route_meta.estimated_time_min) || constraints.duration,
                                        outdoorRatio: parseFloat(playerPreviewData.route_meta.outdoor_ratio_percent) / 100 || 0.7,
                                        startPoint: playerPreviewData.route_meta.area_start,
                                        endPoint: playerPreviewData.route_meta.area_end,
                                    } : {
                                        distanceKm: spots.length > 0 ? spots.length * 0.3 : undefined,
                                        walkingMinutes: constraints.duration,
                                        outdoorRatio: 0.7,
                                        startPoint: spots[0]?.name,
                                        endPoint: spots[spots.length - 1]?.name,
                                    }}
                                    difficultyExplanation={
                                        playerPreviewData?.route_meta?.difficulty_reason ||
                                        (constraints.difficulty === 'easy'
                                            ? 'ひらめき型：ヒントあり、初心者でも楽しめます'
                                            : constraints.difficulty === 'hard'
                                                ? '推理型：3〜4回の詰まりポイントあり（上級者向け）'
                                                : '探索＋推理：現地の情報を読み解くタイプ（ほど良い難易度）')
                                    }
                                    onPlay={async () => {
                                        // Start play session - save first, then navigate to test run
                                        const savedQuestId = await handleSaveQuest();
                                        if (savedQuestId) {
                                            onTestRun();
                                        }
                                    }}
                                    onEdit={() => {
                                        // Switch to canvas (edit) mode - shows spoilers
                                        setViewMode('canvas');
                                        setActiveTab('canvas');
                                    }}
                                    onSaveDraft={async () => {
                                        // Save and navigate to workspace for editing
                                        const savedQuestId = await handleSaveQuest();
                                        if (savedQuestId) {
                                            // Navigate to workspace with the quest ID
                                            navigate(`/creator/workspace/${savedQuestId}`);
                                        } else {
                                            // If save failed, go back to profile
                                            onBack();
                                        }
                                    }}
                                />
                            ) : !hasContent && !isGenerating ? (
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
                                /* Dashboard Content (Canvas Mode or Generating) */
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
                                                    {contentTab === 'mystery' && spots.length > 0 && (() => {
                                                        const toggleExpanded = (spotId: string) => {
                                                            setExpandedMysterySpots(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(spotId)) {
                                                                    next.delete(spotId);
                                                                } else {
                                                                    next.add(spotId);
                                                                }
                                                                return next;
                                                            });
                                                        };
                                                        return (
                                                            <motion.div
                                                                key="mystery"
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                className="p-4 max-h-[calc(100vh-320px)] min-h-[450px] overflow-y-auto"
                                                            >
                                                                {/* Summary Header */}
                                                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-200">
                                                                    <div className="flex items-center gap-2">
                                                                        <Dices size={16} className="text-brand-gold" />
                                                                        <span className="text-sm font-bold text-brand-dark">{spots.length}個の謎</span>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => setExpandedMysterySpots(new Set(spots.map(s => s.id)))}
                                                                            className="px-2 py-1 text-[10px] text-stone-500 hover:text-brand-gold"
                                                                        >
                                                                            すべて展開
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setExpandedMysterySpots(new Set())}
                                                                            className="px-2 py-1 text-[10px] text-stone-500 hover:text-brand-gold"
                                                                        >
                                                                            すべて閉じる
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Compact Accordion List */}
                                                                <div className="space-y-2">
                                                                    {spots.map((spot, idx) => {
                                                                        const isExpanded = expandedMysterySpots.has(spot.id);
                                                                        return (
                                                                            <div
                                                                                key={spot.id}
                                                                                className={`rounded-lg border transition-all ${isExpanded
                                                                                    ? 'border-brand-gold/30 bg-white shadow-sm'
                                                                                    : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                                                                                    }`}
                                                                            >
                                                                                {/* Compact Header - Always Visible */}
                                                                                <button
                                                                                    onClick={() => toggleExpanded(spot.id)}
                                                                                    className="w-full p-3 flex items-center gap-3 text-left"
                                                                                >
                                                                                    {/* Number Badge */}
                                                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isExpanded ? 'bg-brand-gold text-white' : 'bg-stone-300 text-white'
                                                                                        }`}>
                                                                                        {idx + 1}
                                                                                    </div>

                                                                                    {/* Main Content */}
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="font-bold text-sm text-brand-dark truncate">{spot.name}</span>
                                                                                            {spot.puzzleType && (
                                                                                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded text-[9px] font-bold flex-shrink-0">
                                                                                                    {spot.puzzleType}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        {!isExpanded && (
                                                                                            <p className="text-xs text-stone-500 truncate mt-0.5">
                                                                                                {spot.challengeText.slice(0, 50)}...
                                                                                            </p>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Answer Preview & Expand Icon */}
                                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                                        {!isExpanded && (
                                                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">
                                                                                                A: {spot.answer}
                                                                                            </span>
                                                                                        )}
                                                                                        <ChevronDown
                                                                                            size={16}
                                                                                            className={`text-stone-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                                                        />
                                                                                    </div>
                                                                                </button>

                                                                                {/* Expanded Content */}
                                                                                <AnimatePresence>
                                                                                    {isExpanded && (
                                                                                        <motion.div
                                                                                            initial={{ height: 0, opacity: 0 }}
                                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                                            exit={{ height: 0, opacity: 0 }}
                                                                                            className="overflow-hidden"
                                                                                        >
                                                                                            <div className="px-3 pb-3 space-y-2">
                                                                                                {/* 1. 謎の問題 */}
                                                                                                <div className="p-2.5 bg-stone-100 rounded-lg">
                                                                                                    <p className="text-[10px] text-stone-500 font-bold mb-1 flex items-center gap-1">
                                                                                                        <Sparkles size={10} /> 謎の問題
                                                                                                    </p>
                                                                                                    <p className="text-xs text-brand-dark whitespace-pre-wrap">{spot.challengeText}</p>
                                                                                                </div>

                                                                                                {/* 2. 資料 */}
                                                                                                {spot.playerHandout && (
                                                                                                    <div className="p-2.5 bg-blue-50 rounded-lg">
                                                                                                        <p className="text-[10px] text-blue-600 font-bold mb-1 flex items-center gap-1">
                                                                                                            <BookOpen size={10} /> 資料
                                                                                                        </p>
                                                                                                        <p className="text-xs text-blue-900 whitespace-pre-wrap">{spot.playerHandout}</p>
                                                                                                    </div>
                                                                                                )}

                                                                                                {/* 3. ヒント */}
                                                                                                {spot.hints && spot.hints.length > 0 && (
                                                                                                    <div className="p-2.5 bg-amber-50 rounded-lg">
                                                                                                        <p className="text-[10px] text-amber-600 font-bold mb-1 flex items-center gap-1">
                                                                                                            <Lightbulb size={10} /> ヒント
                                                                                                        </p>
                                                                                                        <div className="space-y-0.5">
                                                                                                            {spot.hints.map((hint, hIdx) => (
                                                                                                                <p key={hIdx} className="text-[11px] text-amber-900">
                                                                                                                    <span className="font-bold text-amber-500">{hIdx + 1}.</span> {hint}
                                                                                                                </p>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}

                                                                                                {/* 4. 正解 */}
                                                                                                <div className="p-2.5 bg-emerald-50 rounded-lg flex items-center gap-2">
                                                                                                    <CheckCircle size={14} className="text-emerald-600" />
                                                                                                    <span className="text-xs font-bold text-emerald-700">正解: {spot.answer}</span>
                                                                                                </div>

                                                                                                {/* 5. 解法ステップ */}
                                                                                                {spot.solutionSteps && spot.solutionSteps.length > 0 && (
                                                                                                    <div className="p-2.5 bg-violet-50 rounded-lg">
                                                                                                        <p className="text-[10px] text-violet-600 font-bold mb-1">解法ステップ</p>
                                                                                                        <div className="space-y-0.5">
                                                                                                            {spot.solutionSteps.map((step, sIdx) => (
                                                                                                                <p key={sIdx} className="text-[11px] text-violet-900">
                                                                                                                    <span className="font-bold text-violet-500">{sIdx + 1}.</span> {step}
                                                                                                                </p>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}

                                                                                                {/* 6. 背景解説 */}
                                                                                                {spot.loreReveal && (
                                                                                                    <div className="p-2.5 bg-rose-50 rounded-lg">
                                                                                                        <p className="text-[10px] text-rose-600 font-bold mb-1">🎓 背景解説</p>
                                                                                                        <p className="text-[11px] text-rose-900">{spot.loreReveal}</p>
                                                                                                    </div>
                                                                                                )}

                                                                                                {/* Tags */}
                                                                                                <div className="flex gap-1 flex-wrap pt-1">
                                                                                                    {spot.sceneRole && (
                                                                                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold">
                                                                                                            {spot.sceneRole}
                                                                                                        </span>
                                                                                                    )}
                                                                                                    {spot.plotKey && (
                                                                                                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold">
                                                                                                            🔑 {spot.plotKey}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>

                                                                                                {/* Actions */}
                                                                                                <div className="flex gap-1.5 pt-2 border-t border-stone-200">
                                                                                                    <button className="px-2.5 py-1 rounded bg-stone-100 text-[10px] font-bold text-stone-600 hover:bg-stone-200">編集</button>
                                                                                                    <button className="px-2.5 py-1 rounded bg-stone-100 text-[10px] font-bold text-stone-600 hover:bg-stone-200">再生成</button>
                                                                                                    <button className="px-2.5 py-1 rounded bg-brand-gold/10 text-[10px] font-bold text-brand-gold hover:bg-brand-gold/20">テスト</button>
                                                                                                </div>
                                                                                            </div>
                                                                                        </motion.div>
                                                                                    )}
                                                                                </AnimatePresence>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })()}
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

                                    {/* Save Quest FAB - Always visible after generation */}
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

            {/* Pro Subscription Modal */}
            <ProSubscriptionModal
                isOpen={showProModal}
                onClose={() => setShowProModal(false)}
            />
        </div>
    );
}
