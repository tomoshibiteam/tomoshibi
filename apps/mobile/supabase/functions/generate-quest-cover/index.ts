// Supabase Edge Function: generate-quest-cover
// Generates quest cover images using Gemini and uploads to Supabase Storage

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GenerateCoverRequest {
  questId: string
  title: string
  premise: string
  goal?: string
  area?: string
  tags?: string[]
  tone?: string
  genre?: string
  protagonist?: string
  objective?: string
  ending?: string
  when?: string
  where?: string
  purpose?: string
  withWhom?: string
}

const extractImageData = (candidate: any): string[] => {
  const fromImages = candidate?.images || candidate?.generatedImages || []
  const fromImagesData = fromImages
    .map((img: any) => img?.imageBytes || img?.base64 || img?.data)
    .filter(Boolean)

  const parts = candidate?.content?.parts || []
  const fromParts = parts
    .map((part: any) => part?.inlineData?.data || part?.inline_data?.data || part?.data)
    .filter(Boolean)

  return [...fromImagesData, ...fromParts]
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
      questId,
      title,
      premise,
      goal,
      area,
      tags,
      tone,
      genre,
      protagonist,
      objective,
      ending,
      when,
      where,
      purpose,
      withWhom,
    } = await req.json() as GenerateCoverRequest
    if (!questId || !title || !premise) {
      throw new Error('questId, title, premise are required')
    }

    const tagText = Array.isArray(tags) && tags.length ? tags.join('、') : 'なし'
    const travelContext = [
      genre ? `Genre: ${genre}` : '',
      tone ? `Tone: ${tone}` : '',
      when ? `Time/Season: ${when}` : '',
      where ? `Place/Vibe: ${where}` : '',
      purpose ? `Purpose: ${purpose}` : '',
      withWhom ? `Companions: ${withWhom}` : '',
      protagonist ? `Protagonist: ${protagonist}` : '',
      objective ? `Objective: ${objective}` : '',
      ending ? `Ending: ${ending}` : '',
    ].filter(Boolean).join('\n')

    const prompt = `
You are an art director for a walking city mystery. Create a cinematic cover image.
Requirements: 16:9 landscape, high fidelity, no text, no logos, no typography.

Visual rules:
- Make the image clearly distinct based on the travel context (time, purpose, companions).
- Reflect time-of-day/season in lighting and color palette.
- Reflect companions in mood and composition (family = warm/safe, couple = intimate, solo = contemplative, friends = dynamic).
- Use 2-3 concrete visual motifs inspired by tags or purpose (lanterns, markets, waterfront, art alleys, shrines, etc.).
- Avoid generic noir unless the tone explicitly calls for it.

Title: ${title}
Location: ${area || 'city in Japan'}
Premise: ${premise}
Goal: ${goal || 'reach the truth behind the mystery'}
Tags: ${tagText}
${travelContext ? `Travel Context:\n${travelContext}` : ''}
`.trim()

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseModalities: ['IMAGE'],
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text()
      throw new Error(`Gemini API error: ${errText}`)
    }

    const geminiData = await geminiResponse.json()
    const candidates = Array.isArray(geminiData?.candidates) ? geminiData.candidates : [geminiData]
    const imageDataList: string[] = []
    candidates.forEach((candidate: any) => {
      imageDataList.push(...extractImageData(candidate))
    })

    if (!imageDataList.length) {
      throw new Error('No image data returned from Gemini')
    }

    const imageUrls: string[] = []
    for (let i = 0; i < imageDataList.length; i++) {
      const base64Data = imageDataList[i]
      if (!base64Data) continue
      const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
      const fileName = `${questId}/cover-ai-${Date.now()}-${i}.png`

      const { error: uploadError } = await supabaseClient
        .storage
        .from('quest-images')
        .upload(fileName, binaryData, {
          contentType: 'image/png',
          upsert: true,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        continue
      }

      const { data: { publicUrl } } = supabaseClient
        .storage
        .from('quest-images')
        .getPublicUrl(fileName)

      imageUrls.push(publicUrl)
    }

    return new Response(
      JSON.stringify({ success: true, imageUrl: imageUrls[0] || null, imageUrls }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Generate cover error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
