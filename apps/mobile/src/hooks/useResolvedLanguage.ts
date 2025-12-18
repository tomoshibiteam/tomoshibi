/**
 * useResolvedLanguage - Unified language resolution hook
 * 
 * Priority:
 * 1. Deep Link (?lang=)
 * 2. Quest Language (user_progress.quest_language)
 * 3. Preferred Language (profiles.preferred_language)
 * 4. Device Locale (navigator.language)
 * 5. Fallback ('ja')
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type LanguageSource = 'deepLink' | 'quest' | 'preferred' | 'locale' | 'fallback';

const SUPPORTED_LANGUAGES = ['ja', 'en', 'ko'];
const FALLBACK_LANGUAGE = 'ja';

function detectDeviceLocale(): string {
    const browserLang = navigator.language?.split('-')[0]?.toLowerCase() || 'ja';
    return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : FALLBACK_LANGUAGE;
}

export interface ResolvedLanguage {
    language: string;
    source: LanguageSource;
    fallbackReason?: string;
    isLoading: boolean;
}

export function useResolvedLanguage(
    questId: string | null,
    supportedLanguages?: string[]
): ResolvedLanguage {
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    const [preferredLanguage, setPreferredLanguage] = useState<string | null>(null);
    const [questLanguage, setQuestLanguage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Deep link language from URL
    const deepLinkLang = searchParams.get('lang');

    // Fetch user preferences
    useEffect(() => {
        const fetchLanguagePreferences = async () => {
            if (!user) {
                // Try localStorage as fallback for anonymous users
                const storedPref = localStorage.getItem('preferredLanguage');
                setPreferredLanguage(storedPref);
                setIsLoading(false);
                return;
            }

            try {
                // Fetch preferred language from profiles
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('preferred_language')
                    .eq('id', user.id)
                    .single();

                if (profileData?.preferred_language) {
                    setPreferredLanguage(profileData.preferred_language);
                }

                // Fetch quest-specific language if questId provided
                if (questId) {
                    const { data: progressData } = await supabase
                        .from('user_progress')
                        .select('quest_language')
                        .eq('user_id', user.id)
                        .eq('quest_id', questId)
                        .single();

                    if (progressData?.quest_language) {
                        setQuestLanguage(progressData.quest_language);
                    }
                }
            } catch (error) {
                console.error('Error fetching language preferences:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLanguagePreferences();
    }, [user, questId]);

    // Resolve language based on priority
    const resolved = useMemo((): ResolvedLanguage => {
        const questSupports = supportedLanguages || SUPPORTED_LANGUAGES;

        const tryLanguage = (
            lang: string | null,
            source: LanguageSource
        ): { language: string; source: LanguageSource; fallbackReason?: string } | null => {
            if (!lang) return null;
            if (questSupports.includes(lang)) {
                return { language: lang, source };
            }
            return null;
        };

        // 1. Deep Link
        const deepResult = tryLanguage(deepLinkLang, 'deepLink');
        if (deepResult) return { ...deepResult, isLoading };

        // 2. Quest Language
        const questResult = tryLanguage(questLanguage, 'quest');
        if (questResult) return { ...questResult, isLoading };

        // 3. Preferred Language
        const prefResult = tryLanguage(preferredLanguage, 'preferred');
        if (prefResult) return { ...prefResult, isLoading };

        // 4. Device Locale
        const deviceLang = detectDeviceLocale();
        const localeResult = tryLanguage(deviceLang, 'locale');
        if (localeResult) return { ...localeResult, isLoading };

        // 5. Fallback
        const fallbackResult = tryLanguage(FALLBACK_LANGUAGE, 'fallback');
        if (fallbackResult) return { ...fallbackResult, isLoading };

        // Ultimate fallback (should never reach here)
        return {
            language: FALLBACK_LANGUAGE,
            source: 'fallback',
            fallbackReason: 'No supported language found',
            isLoading,
        };
    }, [deepLinkLang, questLanguage, preferredLanguage, supportedLanguages, isLoading]);

    return resolved;
}

// Utility: Save preferred language
export async function savePreferredLanguage(
    userId: string | null,
    language: string
): Promise<void> {
    // Always save to localStorage as backup
    localStorage.setItem('preferredLanguage', language);
    localStorage.setItem('onboardingComplete', 'true');

    if (!userId) return;

    try {
        await supabase
            .from('profiles')
            .update({ preferred_language: language })
            .eq('id', userId);
    } catch (error) {
        console.error('Error saving preferred language:', error);
    }
}

// Utility: Save quest language
export async function saveQuestLanguage(
    userId: string,
    questId: string,
    language: string
): Promise<void> {
    try {
        await supabase
            .from('user_progress')
            .update({ quest_language: language })
            .eq('user_id', userId)
            .eq('quest_id', questId);
    } catch (error) {
        console.error('Error saving quest language:', error);
    }
}

// Utility: Check if onboarding is complete
export function isOnboardingComplete(): boolean {
    return localStorage.getItem('onboardingComplete') === 'true';
}
