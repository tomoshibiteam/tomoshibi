// TranslationPanel.tsx - Multilingual authoring UI component for creators
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Globe, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Edit2, Save } from 'lucide-react';

interface TranslationPanelProps {
    questId: string | null;
    className?: string;
}

interface QuestTranslation {
    lang: string;
    title: string;
    description: string;
    is_published: boolean;
}

interface SpotTranslation {
    spot_id: string;
    lang: string;
    name: string;
    description: string;
}

interface StoryTranslation {
    lang: string;
    prologue: string;
    epilogue: string;
}

const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh', name: '简体中文', flag: '🇨🇳' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
];

export default function TranslationPanel({ questId, className = '' }: TranslationPanelProps) {
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [translations, setTranslations] = useState<Record<string, QuestTranslation>>({});
    const [storyTranslations, setStoryTranslations] = useState<Record<string, StoryTranslation>>({});
    const [expandedLang, setExpandedLang] = useState<string | null>(null);
    const [editingField, setEditingField] = useState<{ lang: string; field: string } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);

    // Load existing translations
    useEffect(() => {
        if (!questId) return;

        const loadTranslations = async () => {
            // Load quest translations
            const { data: questTrans } = await supabase
                .from('quest_translations')
                .select('*')
                .eq('quest_id', questId);

            if (questTrans) {
                const transMap: Record<string, QuestTranslation> = {};
                questTrans.forEach((t: any) => {
                    transMap[t.lang] = t;
                });
                setTranslations(transMap);
                setSelectedLanguages(Object.keys(transMap));
            }

            // Load story translations
            const { data: storyTrans } = await supabase
                .from('story_translations')
                .select('*')
                .eq('quest_id', questId);

            if (storyTrans) {
                const storyMap: Record<string, StoryTranslation> = {};
                storyTrans.forEach((t: any) => {
                    storyMap[t.lang] = t;
                });
                setStoryTranslations(storyMap);
            }
        };

        loadTranslations();
    }, [questId]);

    const toggleLanguage = (code: string) => {
        setSelectedLanguages((prev) =>
            prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
        );
    };

    const handleGenerate = async () => {
        if (!questId || selectedLanguages.length === 0) return;

        setIsGenerating(true);
        setGenerationError(null);

        try {
            const response = await supabase.functions.invoke('translate-quest', {
                body: { questId, targetLanguages: selectedLanguages },
            });

            if (response.error) {
                throw new Error(response.error.message);
            }

            // Reload translations
            const { data: questTrans } = await supabase
                .from('quest_translations')
                .select('*')
                .eq('quest_id', questId);

            if (questTrans) {
                const transMap: Record<string, QuestTranslation> = {};
                questTrans.forEach((t: any) => {
                    transMap[t.lang] = t;
                });
                setTranslations(transMap);
            }

            const { data: storyTrans } = await supabase
                .from('story_translations')
                .select('*')
                .eq('quest_id', questId);

            if (storyTrans) {
                const storyMap: Record<string, StoryTranslation> = {};
                storyTrans.forEach((t: any) => {
                    storyMap[t.lang] = t;
                });
                setStoryTranslations(storyMap);
            }
        } catch (err: any) {
            setGenerationError(err.message || '翻訳生成に失敗しました');
        } finally {
            setIsGenerating(false);
        }
    };

    const startEditing = (lang: string, field: string, currentValue: string) => {
        setEditingField({ lang, field });
        setEditValue(currentValue);
    };

    const saveEdit = async () => {
        if (!editingField || !questId) return;

        setSaving(true);
        const { lang, field } = editingField;

        try {
            if (field === 'title' || field === 'description') {
                await supabase
                    .from('quest_translations')
                    .update({ [field]: editValue })
                    .eq('quest_id', questId)
                    .eq('lang', lang);

                setTranslations((prev) => ({
                    ...prev,
                    [lang]: { ...prev[lang], [field]: editValue },
                }));
            } else if (field === 'prologue' || field === 'epilogue') {
                await supabase
                    .from('story_translations')
                    .update({ [field]: editValue })
                    .eq('quest_id', questId)
                    .eq('lang', lang);

                setStoryTranslations((prev) => ({
                    ...prev,
                    [lang]: { ...prev[lang], [field]: editValue },
                }));
            }
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
            setEditingField(null);
            setEditValue('');
        }
    };

    const togglePublish = async (lang: string, currentStatus: boolean) => {
        if (!questId) return;

        await supabase
            .from('quest_translations')
            .update({ is_published: !currentStatus })
            .eq('quest_id', questId)
            .eq('lang', lang);

        setTranslations((prev) => ({
            ...prev,
            [lang]: { ...prev[lang], is_published: !currentStatus },
        }));
    };

    if (!questId) {
        return (
            <div className={`bg-stone-50 rounded-xl p-4 text-center text-stone-500 text-sm ${className}`}>
                クエストを保存してから多言語設定を行ってください
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden ${className}`}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-stone-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-brand-dark">多言語オーサリング</h3>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                    AIを使って自動翻訳を生成し、インバウンド観光客に対応
                </p>
            </div>

            {/* Language Selection */}
            <div className="p-6 border-b border-stone-100">
                <p className="text-sm font-bold text-stone-700 mb-3">対応言語を選択</p>
                <div className="flex flex-wrap gap-2">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => toggleLanguage(lang.code)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${selectedLanguages.includes(lang.code)
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                        >
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                            {translations[lang.code] && (
                                <CheckCircle className="w-4 h-4" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Generate Button */}
            <div className="p-6 border-b border-stone-100">
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || selectedLanguages.length === 0}
                    className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>AIで翻訳生成中...</span>
                        </>
                    ) : (
                        <>
                            <Globe className="w-4 h-4" />
                            <span>AIで多言語版を生成</span>
                        </>
                    )}
                </button>

                {generationError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">{generationError}</p>
                    </div>
                )}
            </div>

            {/* Translation Preview */}
            {Object.keys(translations).length > 0 && (
                <div className="divide-y divide-stone-100">
                    {SUPPORTED_LANGUAGES.filter((l) => translations[l.code]).map((lang) => {
                        const trans = translations[lang.code];
                        const storyTrans = storyTranslations[lang.code];
                        const isExpanded = expandedLang === lang.code;

                        return (
                            <div key={lang.code} className="bg-white">
                                {/* Language Header */}
                                <button
                                    onClick={() => setExpandedLang(isExpanded ? null : lang.code)}
                                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{lang.flag}</span>
                                        <span className="font-bold text-stone-800">{lang.name}</span>
                                        {trans.is_published ? (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                                公開中
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                                                下書き
                                            </span>
                                        )}
                                    </div>
                                    {isExpanded ? (
                                        <ChevronUp className="w-5 h-5 text-stone-400" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-stone-400" />
                                    )}
                                </button>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="px-6 pb-6 space-y-4">
                                        {/* Title */}
                                        <div className="bg-stone-50 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs font-bold text-stone-500 uppercase">Title</label>
                                                {editingField?.lang === lang.code && editingField?.field === 'title' ? (
                                                    <button
                                                        onClick={saveEdit}
                                                        disabled={saving}
                                                        className="text-xs text-indigo-600 font-bold flex items-center gap-1"
                                                    >
                                                        <Save className="w-3 h-3" />
                                                        {saving ? '保存中...' : '保存'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => startEditing(lang.code, 'title', trans.title)}
                                                        className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                        編集
                                                    </button>
                                                )}
                                            </div>
                                            {editingField?.lang === lang.code && editingField?.field === 'title' ? (
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                />
                                            ) : (
                                                <p className="text-stone-800">{trans.title || '(未入力)'}</p>
                                            )}
                                        </div>

                                        {/* Description */}
                                        <div className="bg-stone-50 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs font-bold text-stone-500 uppercase">Description</label>
                                                {editingField?.lang === lang.code && editingField?.field === 'description' ? (
                                                    <button
                                                        onClick={saveEdit}
                                                        disabled={saving}
                                                        className="text-xs text-indigo-600 font-bold flex items-center gap-1"
                                                    >
                                                        <Save className="w-3 h-3" />
                                                        {saving ? '保存中...' : '保存'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => startEditing(lang.code, 'description', trans.description)}
                                                        className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                        編集
                                                    </button>
                                                )}
                                            </div>
                                            {editingField?.lang === lang.code && editingField?.field === 'description' ? (
                                                <textarea
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    rows={3}
                                                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                />
                                            ) : (
                                                <p className="text-stone-700 text-sm whitespace-pre-wrap">
                                                    {trans.description || '(未入力)'}
                                                </p>
                                            )}
                                        </div>

                                        {/* Prologue */}
                                        {storyTrans && (
                                            <div className="bg-stone-50 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-xs font-bold text-stone-500 uppercase">Prologue</label>
                                                    {editingField?.lang === lang.code && editingField?.field === 'prologue' ? (
                                                        <button
                                                            onClick={saveEdit}
                                                            disabled={saving}
                                                            className="text-xs text-indigo-600 font-bold flex items-center gap-1"
                                                        >
                                                            <Save className="w-3 h-3" />
                                                            {saving ? '保存中...' : '保存'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => startEditing(lang.code, 'prologue', storyTrans.prologue)}
                                                            className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1"
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                            編集
                                                        </button>
                                                    )}
                                                </div>
                                                {editingField?.lang === lang.code && editingField?.field === 'prologue' ? (
                                                    <textarea
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        rows={4}
                                                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                    />
                                                ) : (
                                                    <p className="text-stone-700 text-sm whitespace-pre-wrap">
                                                        {storyTrans.prologue || '(未入力)'}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Publish Toggle */}
                                        <div className="flex items-center justify-between pt-2">
                                            <span className="text-sm text-stone-600">この言語版を公開する</span>
                                            <button
                                                onClick={() => togglePublish(lang.code, trans.is_published)}
                                                className={`relative w-12 h-6 rounded-full transition-colors ${trans.is_published ? 'bg-green-500' : 'bg-stone-300'
                                                    }`}
                                            >
                                                <span
                                                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${trans.is_published ? 'translate-x-6' : ''
                                                        }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
