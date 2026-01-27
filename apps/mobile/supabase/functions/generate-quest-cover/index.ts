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
    // Try multiple possible paths for inline data
    const inlineData = part?.inlineData || part?.inline_data
    if (inlineData?.data) {
      imageDataList.push(inlineData.data)
    } else if (part?.data) {
      imageDataList.push(part.data)
    }
  })

  // 3. Check for direct inlineData on candidate (some SDK versions)
  if (candidate?.inlineData?.data) {
    imageDataList.push(candidate.inlineData.data)
  }

  console.log(`[extractImageData] Found ${imageDataList.length} images from candidate`)
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
Generate an image: A cinematic cover art for a walking city mystery adventure game.

Style: High fidelity digital art, 16:9 landscape ratio. No text, no logos, no typography.

Visual direction:
- Create a mysterious yet inviting atmosphere reflecting "${title}"
- Location: ${area || 'a city in Japan'}
- Time and lighting based on: ${travelContext || 'daytime urban exploration'}
- Key visual motifs: ${tagText !== 'なし' ? tagText : 'lanterns, narrow alleys, historic buildings'}
- Mood: Cinematic, intriguing, adventure-ready

Story context:
- Premise: ${premise}
- Goal: ${goal || 'uncover the truth behind a mystery'}

Create this cover image now.
`.trim()

    console.log('[generate-quest-cover] Prompt preview:', prompt.slice(0, 200) + '...')

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text()
      console.error('[generate-quest-cover] Gemini API error response:', errText)
      throw new Error(`Gemini API error: ${errText}`)
    }

    const geminiData = await geminiResponse.json()

    // Debug logging for response structure
    console.log('[generate-quest-cover] Gemini response structure:', JSON.stringify({
      hasResponse: !!geminiData,
      hasCandidates: !!geminiData?.candidates,
      candidatesLength: geminiData?.candidates?.length,
      firstCandidateKeys: geminiData?.candidates?.[0] ? Object.keys(geminiData.candidates[0]) : [],
      contentKeys: geminiData?.candidates?.[0]?.content ? Object.keys(geminiData.candidates[0].content) : [],
      partsLength: geminiData?.candidates?.[0]?.content?.parts?.length,
      firstPartKeys: geminiData?.candidates?.[0]?.content?.parts?.[0] ? Object.keys(geminiData.candidates[0].content.parts[0]) : [],
    }))

    const candidates = Array.isArray(geminiData?.candidates) ? geminiData.candidates : [geminiData]
    const imageDataList: string[] = []
    candidates.forEach((candidate: any) => {
      imageDataList.push(...extractImageData(candidate))
    })

    console.log(`[generate-quest-cover] Total images extracted: ${imageDataList.length}`)

    if (!imageDataList.length) {
      console.error('[generate-quest-cover] Full Gemini response for debugging:', JSON.stringify(geminiData).slice(0, 2000))
      throw new Error('No image data returned from Gemini')
    }

    console.log(`[generate-quest-cover] Starting upload of ${imageDataList.length} image(s)...`)

    const imageUrls: string[] = []
    const uploadErrors: string[] = []

    for (let i = 0; i < imageDataList.length; i++) {
      const base64Data = imageDataList[i]
      if (!base64Data) {
        console.warn(`[generate-quest-cover] Image ${i} has empty data, skipping`)
        continue
      }

      console.log(`[generate-quest-cover] Processing image ${i}, base64 length: ${base64Data.length}`)

      try {
        const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
        const fileName = `${questId}/cover-ai-${Date.now()}-${i}.png`
        console.log(`[generate-quest-cover] Uploading to: ${fileName}, size: ${binaryData.length} bytes`)

        const { error: uploadError } = await supabaseClient
          .storage
          .from('quest-images')
          .upload(fileName, binaryData, {
            contentType: 'image/png',
            upsert: true,
          })

        if (uploadError) {
          console.error('[generate-quest-cover] Upload error:', uploadError)
          uploadErrors.push(`Image ${i}: ${uploadError.message}`)
          continue
        }

        const { data: { publicUrl } } = supabaseClient
          .storage
          .from('quest-images')
          .getPublicUrl(fileName)

        console.log(`[generate-quest-cover] Successfully uploaded, public URL: ${publicUrl}`)
        imageUrls.push(publicUrl)
      } catch (e: any) {
        console.error(`[generate-quest-cover] Error processing image ${i}:`, e)
        uploadErrors.push(`Image ${i}: ${e.message}`)
      }
    }

    if (!imageUrls.length) {
      throw new Error(`All image uploads failed: ${uploadErrors.join('; ')}`)
    }

    console.log(`[generate-quest-cover] Successfully uploaded ${imageUrls.length} image(s)`)
    return new Response(
      JSON.stringify({ success: true, imageUrl: imageUrls[0], imageUrls }),
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
