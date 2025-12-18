// Supabase Edge Function: translate-quest
// Translates quest content (title, description, spots, puzzles, story) to target languages using OpenAI

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TranslateRequest {
    questId: string
    targetLanguages: string[]
}

interface TranslationResult {
    lang: string
    quest: { title: string; description: string }
    spots: Array<{ spotId: string; name: string; description: string }>
    puzzles: Array<{ spotDetailId: string; questionText: string; hintText: string; successMessage: string; status: string }>
    story: { prologue: string; epilogue: string }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openaiApiKey) {
            throw new Error('OPENAI_API_KEY not configured')
        }

        const { questId, targetLanguages }: TranslateRequest = await req.json()

        if (!questId || !targetLanguages?.length) {
            return new Response(
                JSON.stringify({ error: 'questId and targetLanguages are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 1. Fetch quest data
        const { data: quest, error: questError } = await supabaseClient
            .from('quests')
            .select('id, title, description')
            .eq('id', questId)
            .single()

        if (questError || !quest) {
            throw new Error(`Quest not found: ${questId}`)
        }

        // 2. Fetch spots
        const { data: spots } = await supabaseClient
            .from('spots')
            .select('id, name, description')
            .eq('quest_id', questId)
            .order('order_index', { ascending: true })

        // 3. Fetch spot_details (puzzles)
        const spotIds = spots?.map(s => s.id) || []
        const { data: spotDetails } = await supabaseClient
            .from('spot_details')
            .select('id, spot_id, question_text, hint_text, explanation_text, language_dependency_level')
            .in('spot_id', spotIds)

        // 4. Fetch story
        const { data: story } = await supabaseClient
            .from('story_timelines')
            .select('prologue, epilogue')
            .eq('quest_id', questId)
            .single()

        // 5. Translate for each target language
        const results: TranslationResult[] = []

        for (const lang of targetLanguages) {
            const langName = lang === 'en' ? 'English' : lang === 'zh' ? 'Chinese (Simplified)' : lang === 'ko' ? 'Korean' : lang

            // Build prompt
            const prompt = buildTranslationPrompt({
                targetLanguage: langName,
                quest: { title: quest.title || '', description: quest.description || '' },
                spots: spots || [],
                puzzles: spotDetails || [],
                story: { prologue: story?.prologue || '', epilogue: story?.epilogue || '' },
            })

            // Call OpenAI
            const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a professional game localizer. Translate the following Japanese game content to ${langName}. 
Maintain the tone, atmosphere, and game logic. For location names, use appropriate romanization or local equivalents.
Return a JSON object with the translated content. Do not include any markdown formatting.`
                        },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    response_format: { type: 'json_object' },
                }),
            })

            const openaiData = await openaiResponse.json()
            const translatedContent = JSON.parse(openaiData.choices[0].message.content)

            // 6. Save translations to database
            // Quest translation
            await supabaseClient.from('quest_translations').upsert({
                quest_id: questId,
                lang,
                title: translatedContent.quest?.title || '',
                description: translatedContent.quest?.description || '',
                is_published: false,
            }, { onConflict: 'quest_id,lang' })

            // Spot translations
            for (const spot of translatedContent.spots || []) {
                await supabaseClient.from('spot_translations').upsert({
                    spot_id: spot.spotId,
                    lang,
                    name: spot.name || '',
                    description: spot.description || '',
                }, { onConflict: 'spot_id,lang' })
            }

            // Puzzle translations
            for (const puzzle of translatedContent.puzzles || []) {
                const originalPuzzle = spotDetails?.find(sd => sd.id === puzzle.spotDetailId)
                const isUntranslatable = originalPuzzle?.language_dependency_level === 'high'

                await supabaseClient.from('puzzle_translations').upsert({
                    spot_detail_id: puzzle.spotDetailId,
                    lang,
                    question_text: isUntranslatable ? '' : (puzzle.questionText || ''),
                    hint_text: isUntranslatable ? '' : (puzzle.hintText || ''),
                    success_message: isUntranslatable ? '' : (puzzle.successMessage || ''),
                    translation_status: isUntranslatable ? 'untranslatable' : 'draft',
                }, { onConflict: 'spot_detail_id,lang' })
            }

            // Story translation
            await supabaseClient.from('story_translations').upsert({
                quest_id: questId,
                lang,
                prologue: translatedContent.story?.prologue || '',
                epilogue: translatedContent.story?.epilogue || '',
            }, { onConflict: 'quest_id,lang' })

            // Update supported_languages on quest
            const { data: currentQuest } = await supabaseClient
                .from('quests')
                .select('supported_languages')
                .eq('id', questId)
                .single()

            const currentLangs = currentQuest?.supported_languages || ['ja']
            if (!currentLangs.includes(lang)) {
                await supabaseClient
                    .from('quests')
                    .update({ supported_languages: [...currentLangs, lang] })
                    .eq('id', questId)
            }

            results.push({
                lang,
                quest: translatedContent.quest,
                spots: translatedContent.spots,
                puzzles: translatedContent.puzzles,
                story: translatedContent.story,
            })
        }

        return new Response(
            JSON.stringify({ success: true, translations: results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Translation error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

function buildTranslationPrompt(data: {
    targetLanguage: string
    quest: { title: string; description: string }
    spots: Array<{ id: string; name: string; description: string | null }>
    puzzles: Array<{ id: string; spot_id: string; question_text: string | null; hint_text: string | null; explanation_text: string | null; language_dependency_level: string | null }>
    story: { prologue: string; epilogue: string }
}): string {
    const puzzlesForTranslation = data.puzzles
        .filter(p => p.language_dependency_level !== 'high')
        .map(p => ({
            spotDetailId: p.id,
            questionText: p.question_text || '',
            hintText: p.hint_text || '',
            successMessage: p.explanation_text || '',
        }))

    const spotsForTranslation = data.spots.map(s => ({
        spotId: s.id,
        name: s.name || '',
        description: s.description || '',
    }))

    return JSON.stringify({
        instruction: `Translate the following Japanese game content to ${data.targetLanguage}. Return a JSON object with the same structure but with translated text.`,
        content: {
            quest: data.quest,
            spots: spotsForTranslation,
            puzzles: puzzlesForTranslation,
            story: data.story,
        },
        expectedOutputFormat: {
            quest: { title: 'translated title', description: 'translated description' },
            spots: [{ spotId: 'uuid', name: 'translated name', description: 'translated description' }],
            puzzles: [{ spotDetailId: 'uuid', questionText: 'translated question', hintText: 'translated hint', successMessage: 'translated message' }],
            story: { prologue: 'translated prologue', epilogue: 'translated epilogue' },
        },
    }, null, 2)
}
