// Supabase Edge Function: generate-character-image
// Generates character portrait images using Gemini and uploads to Supabase Storage

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GenerateCharacterRequest {
    characterId: string
    name: string
    role: string
    personality: string
    imagePrompt: string
    questId: string
    // Optional context for consistent world view
    questTitle?: string
    questTheme?: string
    artStyle?: string
}

const extractImageData = (candidate: any): string[] => {
    const imageDataList: string[] = []

    // 1. Check for direct images array (older SDK format)
    const fromImages = candidate?.images || candidate?.generatedImages || []
    fromImages.forEach((img: any) => {
        const data = img?.imageBytes || img?.base64 || img?.data
        if (data) imageDataList.push(data)
    })

    // 2. Check for content.parts (REST API format - most common)
    const parts = candidate?.content?.parts || []
    parts.forEach((part: any) => {
        const inlineData = part?.inlineData || part?.inline_data
        if (inlineData?.data) {
            imageDataList.push(inlineData.data)
        } else if (part?.data) {
            imageDataList.push(part.data)
        }
    })

    // 3. Check for direct inlineData on candidate
    if (candidate?.inlineData?.data) {
        imageDataList.push(candidate.inlineData.data)
    }

    return imageDataList
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiApiKey) {
            throw new Error('GEMINI_API_KEY not configured')
        }

        const {
            characterId,
            name,
            role,
            personality,
            imagePrompt,
            questId,
            questTitle,
            questTheme,
            artStyle,
        } = await req.json() as GenerateCharacterRequest

        if (!characterId || !imagePrompt || !questId) {
            throw new Error('characterId, imagePrompt, and questId are required')
        }

        // Build a detailed prompt for character portrait generation
        // Emphasize consistent world view and specific requirements
        const prompt = `
Generate an image: A full-body character illustration for a mystery walking game.

=== CRITICAL REQUIREMENTS (MUST FOLLOW) ===
1. BACKGROUND: Solid color #f7f0e5 (warm cream/paper color) - NO gradients, NO patterns
2. FULL BODY: Show the ENTIRE body from head to feet, not cropped
3. NO TEXT: Absolutely NO text, letters, numbers, or typography anywhere in the image
4. ASPECT RATIO: 9:16 vertical portrait orientation
5. CENTERED: Character centered in frame with some margin around them

=== ART STYLE (CONSISTENT FOR ALL CHARACTERS IN THIS QUEST) ===
- Style: ${artStyle || 'Soft anime illustration style with watercolor-like textures'}
- Theme: ${questTheme || 'Japanese mystery urban adventure'}
- Quest: ${questTitle || 'City walking mystery'}
- All characters in this quest share the same art style and world view
- Clean lines, warm color palette, inviting and friendly atmosphere

=== CHARACTER DETAILS ===
- Name: ${name || 'Character'}
- Role: ${role || 'Supporting Character'}
- Personality: ${personality || 'Friendly and helpful'}

=== VISUAL DESCRIPTION ===
${imagePrompt}

=== POSE & EXPRESSION ===
- Standing pose, relaxed and natural
- Facing slightly toward the viewer (3/4 view preferred)
- Expression matching the personality described above
- Face clearly visible and detailed (will be cropped for avatar icon)

Generate this full-body character illustration now on the #f7f0e5 background.
`.trim()

        console.log('[generate-character-image] Generating for:', { characterId, name })

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.8,
                        responseModalities: ['TEXT', 'IMAGE'],
                    },
                }),
            }
        )

        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text()
            console.error('[generate-character-image] Gemini API error:', errText)
            throw new Error(`Gemini API error: ${errText}`)
        }

        const geminiData = await geminiResponse.json()
        const candidates = Array.isArray(geminiData?.candidates) ? geminiData.candidates : [geminiData]
        const imageDataList: string[] = []
        candidates.forEach((candidate: any) => {
            imageDataList.push(...extractImageData(candidate))
        })

        if (!imageDataList.length) {
            console.error('[generate-character-image] No image data in response')
            throw new Error('No image data returned from Gemini')
        }

        // Upload the first image
        const base64Data = imageDataList[0]
        const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
        const fileName = `${questId}/characters/${characterId}-${Date.now()}.png`

        console.log('[generate-character-image] Uploading:', fileName)

        const { error: uploadError } = await supabaseClient
            .storage
            .from('quest-images')
            .upload(fileName, binaryData, {
                contentType: 'image/png',
                upsert: true,
            })

        if (uploadError) {
            console.error('[generate-character-image] Upload error:', uploadError)
            throw new Error(`Upload failed: ${uploadError.message}`)
        }

        const { data: { publicUrl } } = supabaseClient
            .storage
            .from('quest-images')
            .getPublicUrl(fileName)

        console.log('[generate-character-image] Success:', publicUrl)

        return new Response(
            JSON.stringify({
                success: true,
                imageUrl: publicUrl,
                characterId,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error: any) {
        console.error('[generate-character-image] Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
