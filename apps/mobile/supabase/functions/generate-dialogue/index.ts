// Supabase Edge Function: generate-dialogue
// Generates dialogue drafts for spot conversations using Gemini

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateDialogueRequest {
    stage: 'pre' | 'post'
    spotName: string
    puzzleText?: string
    puzzleAnswer?: string
    prevSpotName?: string
    prevSpotPostSummary?: string
    nextSpotName?: string
    characters: Array<{ name: string; role: string }>
    storyTheme?: string
}

interface DialogueLine {
    speakerType: 'character' | 'narrator'
    speakerName: string
    text: string
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiApiKey) {
            throw new Error('GEMINI_API_KEY not configured')
        }

        const request: GenerateDialogueRequest = await req.json()

        const systemPrompt = `あなたは日本のロケーションベースゲームのストーリーライターです。
プレイヤーが街を歩きながら謎を解くゲームの会話を作成してください。

ルール:
- 自然な日本語で書く
- キャラクターの個性を活かす
- 3-5行程度の短い会話にする
- JSONフォーマット {"lines":[{speakerType,speakerName,text}]} で返す
- マークダウンは使わない`

        const userPrompt = request.stage === 'pre'
            ? `スポット「${request.spotName}」の到着後、謎解き開始前の会話を生成してください。

${request.prevSpotName ? `前のスポット「${request.prevSpotName}」から来ました。` : ''}
${request.prevSpotPostSummary ? `前回の最後: ${request.prevSpotPostSummary}` : ''}
${request.puzzleText ? `これから解く謎: ${request.puzzleText}` : ''}
${request.storyTheme ? `物語のテーマ: ${request.storyTheme}` : ''}

登場人物:
${request.characters.map(c => `- ${c.name}（${c.role}）`).join('\n')}

会話は謎解きへの自然な導入になるようにしてください。
最後のセリフは「周りを観察してみよう」「手がかりを探そう」などの行動を促す言葉にしてください。`
            : `スポット「${request.spotName}」の謎を正解した後の会話を生成してください。

${request.puzzleText ? `解いた謎: ${request.puzzleText}` : ''}
${request.puzzleAnswer ? `正解: ${request.puzzleAnswer}` : ''}
${request.nextSpotName ? `次のスポット「${request.nextSpotName}」へ向かいます。` : 'これが最後のスポットです。'}
${request.storyTheme ? `物語のテーマ: ${request.storyTheme}` : ''}

登場人物:
${request.characters.map(c => `- ${c.name}（${c.role}）`).join('\n')}

正解のリアクションと次への導入を含めてください。
${request.nextSpotName ? `最後のセリフは「${request.nextSpotName}へ急ごう」などの移動を促す言葉にしてください。` : '達成感のある締めくくりにしてください。'}`

        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    { role: 'user', parts: [{ text: userPrompt }] }
                ],
                generationConfig: {
                    temperature: 0.7,
                    response_mime_type: 'application/json'
                }
            })
        })

        if (!geminiResponse.ok) {
            const err = await geminiResponse.text()
            throw new Error(`Gemini API error: ${err}`)
        }

        const geminiData = await geminiResponse.json()
        const textContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!textContent) {
            throw new Error('Gemini response missing content')
        }

        let content
        try {
            content = JSON.parse(textContent)
        } catch (_e) {
            throw new Error('Gemini response is not valid JSON')
        }

        // Normalize response format
        const lines: DialogueLine[] = (content.lines || content.dialogue || []).map((line: any) => ({
            speakerType: line.speakerType || (line.speaker === 'ナレーション' ? 'narrator' : 'character'),
            speakerName: line.speakerName || line.speaker || line.name || '案内人',
            text: line.text || line.content || line.message || '',
        }))

        return new Response(
            JSON.stringify({ success: true, lines }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Generate dialogue error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
