import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface QuestGenerationRequest {
    prompt: string
    difficulty: 'easy' | 'medium' | 'hard'
    spot_count: number
    theme_tags?: string[]
    genre_support?: string
    tone_support?: string
    prompt_support?: {
        protagonist?: string
        objective?: string
        ending?: string
        when?: string
        where?: string
        purpose?: string
        withWhom?: string
    }
    center_location?: {
        lat: number
        lng: number
    }
    radius_km?: number
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get Dify configuration from environment
        const difyApiKey = Deno.env.get('DIFY_API_KEY')
        const difyBaseUrl = Deno.env.get('DIFY_BASE_URL') || 'https://api.dify.ai/v1'

        if (!difyApiKey) {
            throw new Error('DIFY_API_KEY is not configured')
        }

        // Parse request body
        const requestData: QuestGenerationRequest = await req.json()

        // Convert request to Dify inputs
        const difyInputs = {
            // Required fields
            prompt: requestData.prompt,
            difficulty: requestData.difficulty,
            spot_count: requestData.spot_count,

            // Optional fields
            theme_tags: requestData.theme_tags?.join(',') || '',
            genre_support: requestData.genre_support || '',
            tone_support: requestData.tone_support || '',

            // Prompt support fields
            protagonist: requestData.prompt_support?.protagonist || '',
            objective: requestData.prompt_support?.objective || '',
            ending: requestData.prompt_support?.ending || '',
            when: requestData.prompt_support?.when || '',
            where: requestData.prompt_support?.where || '',
            purpose: requestData.prompt_support?.purpose || '',
            with_whom: requestData.prompt_support?.withWhom || '',

            // Location fields
            center_lat: requestData.center_location?.lat?.toString() || '',
            center_lng: requestData.center_location?.lng?.toString() || '',
            radius_km: requestData.radius_km?.toString() || '1',
        }

        console.log('[Dify] Calling workflow with inputs:', {
            prompt: difyInputs.prompt,
            spot_count: difyInputs.spot_count,
            difficulty: difyInputs.difficulty,
        })

        // Call Dify API
        const difyResponse = await fetch(`${difyBaseUrl}/workflows/run`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${difyApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: difyInputs,
                response_mode: 'blocking',
                user: 'quest-creator',
            }),
        })

        if (!difyResponse.ok) {
            const errorText = await difyResponse.text()
            console.error('[Dify] API error:', errorText)
            throw new Error(`Dify API error (${difyResponse.status}): ${errorText}`)
        }

        const difyResult = await difyResponse.json()

        // Check for workflow failure
        if (difyResult.data?.status === 'failed') {
            throw new Error(`Dify workflow failed: ${difyResult.data.error || 'Unknown error'}`)
        }

        // Extract outputs
        const output = difyResult.data?.outputs

        if (!output) {
            throw new Error('No outputs in Dify response')
        }

        console.log('[Dify] Workflow completed successfully:', {
            workflow_run_id: difyResult.workflow_run_id,
            elapsed_time: difyResult.data?.elapsed_time,
            total_tokens: difyResult.data?.total_tokens,
        })

        // Return the result
        return new Response(
            JSON.stringify(output),
            {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            }
        )
    } catch (error) {
        console.error('[Dify] Error:', error)
        return new Response(
            JSON.stringify({
                error: error.message || 'Internal server error',
            }),
            {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            }
        )
    }
})
