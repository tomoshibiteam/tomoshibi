/**
 * useAnalytics - Lightweight gameplay event tracking hook
 * 
 * Sends events to gameplay_events table for analytics and drop-off analysis.
 * Designed for minimal performance impact - fire-and-forget pattern.
 */

import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Generate a session ID for this browser session
const getSessionId = (): string => {
    let sessionId = sessionStorage.getItem('gameplay_session_id');
    if (!sessionId) {
        sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('gameplay_session_id', sessionId);
    }
    return sessionId;
};

export type GameplayEventType =
    | 'session_start'
    | 'session_resume'
    | 'session_complete'
    | 'session_abandon'
    | 'mode_travel'
    | 'mode_story'
    | 'mode_puzzle'
    | 'mode_epilogue'
    | 'arrival_attempt'
    | 'arrival_success'
    | 'arrival_fail'
    | 'arrival_manual'
    | 'nav_open'
    | 'puzzle_submit'
    | 'puzzle_hint'
    | 'puzzle_reveal'
    | 'feedback_submit'
    | 'score_mode_toggle'
    | 'spot_score';

interface AnalyticsContext {
    questId: string;
    spotId?: string | null;
    spotIndex?: number;
}

export function useAnalytics(context: AnalyticsContext) {
    const { user } = useAuth();
    const sessionId = useRef(getSessionId());
    const lastModeRef = useRef<string>('travel');
    const lastSpotIndexRef = useRef<number>(context.spotIndex || 0);

    // Update refs when context changes
    useEffect(() => {
        if (context.spotIndex !== undefined) {
            lastSpotIndexRef.current = context.spotIndex;
        }
    }, [context.spotIndex]);

    /**
     * Track a gameplay event (fire-and-forget)
     */
    const track = useCallback(
        async (eventType: GameplayEventType, eventData: Record<string, any> = {}) => {
            // Update mode tracking
            if (eventType.startsWith('mode_')) {
                lastModeRef.current = eventType.replace('mode_', '');
            }

            try {
                await supabase.from('gameplay_events').insert({
                    user_id: user?.id || null,
                    quest_id: context.questId,
                    spot_id: context.spotId || null,
                    session_id: sessionId.current,
                    event_type: eventType,
                    event_data: eventData,
                });
            } catch (error) {
                // Silently fail - analytics should never block gameplay
                console.warn('Analytics event failed:', error);
            }
        },
        [user?.id, context.questId, context.spotId]
    );

    /**
     * Track session abandonment on page unload
     */
    useEffect(() => {
        const handleBeforeUnload = () => {
            // Use sendBeacon for reliable delivery on page close
            const payload = JSON.stringify({
                user_id: user?.id || null,
                quest_id: context.questId,
                spot_id: context.spotId || null,
                session_id: sessionId.current,
                event_type: 'session_abandon',
                event_data: {
                    last_mode: lastModeRef.current,
                    last_spot_index: lastSpotIndexRef.current,
                },
            });

            // Use navigator.sendBeacon for reliable delivery
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            if (supabaseUrl && supabaseKey) {
                navigator.sendBeacon(
                    `${supabaseUrl}/rest/v1/gameplay_events`,
                    new Blob([payload], { type: 'application/json' })
                );
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [user?.id, context.questId, context.spotId]);

    return { track };
}

// Feedback categories
export const FEEDBACK_CATEGORIES = [
    { value: 'lost', labelJa: '迷子になった', labelEn: "I'm lost" },
    { value: 'gps_error', labelJa: 'GPSがおかしい', labelEn: 'GPS issue' },
    { value: 'puzzle_hard', labelJa: '謎が難しい', labelEn: 'Puzzle too hard' },
    { value: 'answer_rejected', labelJa: '答えが通らない', labelEn: 'Answer not accepted' },
    { value: 'ui_confusing', labelJa: '操作が分からない', labelEn: 'Confusing UI' },
    { value: 'other', labelJa: 'その他', labelEn: 'Other' },
] as const;

export type FeedbackCategory = typeof FEEDBACK_CATEGORIES[number]['value'];

/**
 * Submit user feedback (困っている報告)
 */
export async function submitFeedback(
    userId: string | null,
    questId: string,
    spotId: string | null,
    category: FeedbackCategory,
    message: string,
    context: Record<string, any> = {}
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.from('user_feedback').insert({
            user_id: userId,
            quest_id: questId,
            spot_id: spotId,
            category,
            message: message || null,
            context,
        });

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('Feedback submission failed:', error);
        return { success: false, error: error.message };
    }
}
