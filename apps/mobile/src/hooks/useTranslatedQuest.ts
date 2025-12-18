// useTranslatedQuest.ts - Hook for fetching translated quest content based on selected language
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

interface TranslatedQuest {
    title: string;
    description: string;
}

interface TranslatedSpot {
    id: string;
    name: string;
    description: string;
}

interface TranslatedPuzzle {
    spotDetailId: string;
    questionText: string;
    hintText: string;
    successMessage: string;
    isUntranslatable: boolean;
}

interface TranslatedStory {
    prologue: string;
    epilogue: string;
}

interface UseTranslatedQuestResult {
    quest: TranslatedQuest | null;
    spots: TranslatedSpot[];
    puzzles: TranslatedPuzzle[];
    story: TranslatedStory | null;
    availableLanguages: string[];
    isLoading: boolean;
    error: string | null;
}

export function useTranslatedQuest(questId: string | null, lang: string): UseTranslatedQuestResult {
    const [quest, setQuest] = useState<TranslatedQuest | null>(null);
    const [spots, setSpots] = useState<TranslatedSpot[]>([]);
    const [puzzles, setPuzzles] = useState<TranslatedPuzzle[]>([]);
    const [story, setStory] = useState<TranslatedStory | null>(null);
    const [availableLanguages, setAvailableLanguages] = useState<string[]>(['ja']);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!questId) {
            setIsLoading(false);
            return;
        }

        const fetchTranslatedContent = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // 1. Fetch available languages from quest
                const { data: questData } = await supabase
                    .from('quests')
                    .select('title, description, supported_languages')
                    .eq('id', questId)
                    .single();

                if (questData?.supported_languages) {
                    setAvailableLanguages(questData.supported_languages);
                }

                // 2. Fetch quest translation (or use base language)
                if (lang === 'ja' || !questData?.supported_languages?.includes(lang)) {
                    // Use base Japanese content
                    setQuest({
                        title: questData?.title || '',
                        description: questData?.description || '',
                    });
                } else {
                    // Fetch translation
                    const { data: questTrans } = await supabase
                        .from('quest_translations')
                        .select('title, description')
                        .eq('quest_id', questId)
                        .eq('lang', lang)
                        .eq('is_published', true)
                        .single();

                    if (questTrans) {
                        setQuest({
                            title: questTrans.title || questData?.title || '',
                            description: questTrans.description || questData?.description || '',
                        });
                    } else {
                        // Fallback to Japanese
                        setQuest({
                            title: questData?.title || '',
                            description: questData?.description || '',
                        });
                    }
                }

                // 3. Fetch spots and translations
                const { data: spotsData } = await supabase
                    .from('spots')
                    .select('id, name, description')
                    .eq('quest_id', questId)
                    .order('order_index', { ascending: true });

                if (spotsData && lang !== 'ja') {
                    const spotIds = spotsData.map((s) => s.id);
                    const { data: spotTrans } = await supabase
                        .from('spot_translations')
                        .select('spot_id, name, description')
                        .in('spot_id', spotIds)
                        .eq('lang', lang);

                    const transMap = new Map(spotTrans?.map((t) => [t.spot_id, t]) || []);

                    setSpots(
                        spotsData.map((s) => ({
                            id: s.id,
                            name: transMap.get(s.id)?.name || s.name || '',
                            description: transMap.get(s.id)?.description || s.description || '',
                        }))
                    );
                } else {
                    setSpots(
                        spotsData?.map((s) => ({
                            id: s.id,
                            name: s.name || '',
                            description: s.description || '',
                        })) || []
                    );
                }

                // 4. Fetch puzzles (spot_details) and translations
                if (spotsData) {
                    const spotIds = spotsData.map((s) => s.id);
                    const { data: detailsData } = await supabase
                        .from('spot_details')
                        .select('id, spot_id, question_text, hint_text, explanation_text, language_dependency_level')
                        .in('spot_id', spotIds);

                    if (detailsData && lang !== 'ja') {
                        const detailIds = detailsData.map((d) => d.id);
                        const { data: puzzleTrans } = await supabase
                            .from('puzzle_translations')
                            .select('spot_detail_id, question_text, hint_text, success_message, translation_status')
                            .in('spot_detail_id', detailIds)
                            .eq('lang', lang);

                        const transMap = new Map(puzzleTrans?.map((t) => [t.spot_detail_id, t]) || []);

                        setPuzzles(
                            detailsData.map((d) => {
                                const trans = transMap.get(d.id);
                                const isUntranslatable = trans?.translation_status === 'untranslatable' || d.language_dependency_level === 'high';

                                return {
                                    spotDetailId: d.id,
                                    questionText: isUntranslatable ? d.question_text || '' : trans?.question_text || d.question_text || '',
                                    hintText: isUntranslatable ? d.hint_text || '' : trans?.hint_text || d.hint_text || '',
                                    successMessage: isUntranslatable ? d.explanation_text || '' : trans?.success_message || d.explanation_text || '',
                                    isUntranslatable,
                                };
                            })
                        );
                    } else {
                        setPuzzles(
                            detailsData?.map((d) => ({
                                spotDetailId: d.id,
                                questionText: d.question_text || '',
                                hintText: d.hint_text || '',
                                successMessage: d.explanation_text || '',
                                isUntranslatable: false,
                            })) || []
                        );
                    }
                }

                // 5. Fetch story and translation
                const { data: storyData } = await supabase
                    .from('story_timelines')
                    .select('prologue, epilogue')
                    .eq('quest_id', questId)
                    .single();

                if (lang !== 'ja') {
                    const { data: storyTrans } = await supabase
                        .from('story_translations')
                        .select('prologue, epilogue')
                        .eq('quest_id', questId)
                        .eq('lang', lang)
                        .single();

                    if (storyTrans) {
                        setStory({
                            prologue: storyTrans.prologue || storyData?.prologue || '',
                            epilogue: storyTrans.epilogue || storyData?.epilogue || '',
                        });
                    } else {
                        setStory(storyData ? { prologue: storyData.prologue || '', epilogue: storyData.epilogue || '' } : null);
                    }
                } else {
                    setStory(storyData ? { prologue: storyData.prologue || '', epilogue: storyData.epilogue || '' } : null);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to fetch translated content');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTranslatedContent();
    }, [questId, lang]);

    return { quest, spots, puzzles, story, availableLanguages, isLoading, error };
}
