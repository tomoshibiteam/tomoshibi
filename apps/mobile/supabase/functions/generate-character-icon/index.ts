// Supabase Edge Function: generate-character-icon
// Generates character icons using Gemini image generation and uploads to Supabase Storage

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateIconRequest {
    questId: string
    characterId: string
    name: string
    role: string
    personality?: string
    artStyle?: string
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

        const { questId, characterId, name, role, personality, artStyle } = await req.json()

        const stylePrompt = artStyle || 'anime style, vibrant colors'
        const prompt = `キャラクターのアイコン画像を生成してください。${stylePrompt}。名前: ${name}。役割: ${role}。${personality ? `性格: ${personality}。` : ''} 正面顔、シンプル背景、丸アイコン向け。`

        // Call Gemini image generation (Imagen via Generative Language API)
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagegeneration:generate?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: { text: prompt },
                numberOfImages: 4,
                aspectRatio: "1:1",
                size: "256x256"
            })
        })

        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text()
            throw new Error(`Gemini API error: ${errText}`)
        }

        const geminiData = await geminiResponse.json()

        const imageUrls: string[] = []

        // Upload images to Supabase Storage
        const images = geminiData.images || geminiData.generatedImages || []
        for (let i = 0; i < images.length; i++) {
            const base64Data = images[i]?.imageBytes || images[i]?.base64 || images[i]?.data
            if (!base64Data) continue
            const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
            const fileName = `${questId}/${characterId}_${Date.now()}_${i}.png`

            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('character-icons')
                .upload(fileName, binaryData, {
                    contentType: 'image/png',
                    upsert: true
                })

            if (uploadError) {
                console.error('Upload error:', uploadError)
                continue
            }

            const { data: { publicUrl } } = supabaseClient
                .storage
                .from('character-icons')
                .getPublicUrl(fileName)

            imageUrls.push(publicUrl)
        }

        return new Response(
            JSON.stringify({ success: true, imageUrls }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Generate icon error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
