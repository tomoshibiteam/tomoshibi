/**
 * Dify Workflow Adapter
 * 
 * Difyワークフローと既存のLayton Pipelineを接続するアダプター
 * 入出力インターフェースを固定し、内部実装を切り替え可能にする
 */

import {
    QuestGenerationRequest,
    QuestDualOutput,
    PipelineCallbacks,
    PipelineState,
} from './layton-types';

/**
 * Dify API設定
 */
export interface DifyConfig {
    apiKey: string;
    endpoint: string;
    workflowId?: string;
    timeout?: number; // ms
}

/**
 * Dify APIレスポンス型
 */
interface DifyWorkflowResponse {
    workflow_run_id: string;
    task_id: string;
    data: {
        id: string;
        workflow_id: string;
        status: 'running' | 'succeeded' | 'failed' | 'stopped';
        outputs: QuestDualOutput;
        error?: string;
        elapsed_time: number;
        total_tokens: number;
        created_at: number;
    };
}

/**
 * Difyストリーミングイベント型
 */
interface DifyStreamEvent {
    event: 'workflow_started' | 'node_started' | 'node_finished' | 'workflow_finished' | 'error';
    task_id: string;
    workflow_run_id: string;
    data: {
        id: string;
        node_id?: string;
        node_type?: string;
        title?: string;
        index?: number;
        outputs?: any;
        error?: string;
    };
}

/**
 * Difyワークフローを使用してクエストを生成
 * Supabase Edge Function経由で呼び出し（APIキーを安全に管理）
 * 
 * @param request クエスト生成リクエスト（入力変数）
 * @param config Dify設定
 * @param callbacks 進捗コールバック
 * @returns QuestDualOutput（出力変数）
 */
export async function generateQuestWithDify(
    request: QuestGenerationRequest,
    config: DifyConfig,
    callbacks?: Partial<PipelineCallbacks>
): Promise<QuestDualOutput> {
    const onProgress = callbacks?.onProgress || (() => { });
    const onError = callbacks?.onError || (() => { });

    try {
        console.log('[Dify] Starting quest generation via Supabase Edge Function');

        // Supabase Edge Functionのエンドポイント
        const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
            throw new Error('VITE_SUPABASE_URL is not configured');
        }

        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-quest`;

        console.log('[Dify] Calling Edge Function:', edgeFunctionUrl);

        // Edge Function経由でDifyを呼び出し
        const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''}`,
            },
            body: JSON.stringify(request),
            signal: AbortSignal.timeout(config.timeout || 300000),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Edge Function error (${response.status}): ${errorText}`);
        }

        const output: QuestDualOutput = await response.json();

        // 出力を検証
        validateDifyOutput(output);

        console.log('[Dify] Quest generation completed successfully:', {
            spots_count: output.creator_payload.spots.length,
            title: output.creator_payload.quest_title,
        });

        // 完了通知
        onProgress({
            current_step: 4,
            step_name: 'validation',
            progress: 100,
        });

        return output;
    } catch (error: any) {
        console.error('[Dify] Quest generation error:', error);
        onError(error, {
            current_step: 1,
            step_name: 'motif_selection',
            progress: 0,
            error: error.message,
        });
        throw error;
    }
}

/**
 * Difyストリーミングモードでクエストを生成
 * 
 * @param request クエスト生成リクエスト
 * @param config Dify設定
 * @param callbacks 進捗コールバック
 * @returns QuestDualOutput
 */
export async function generateQuestWithDifyStreaming(
    request: QuestGenerationRequest,
    config: DifyConfig,
    callbacks?: Partial<PipelineCallbacks>
): Promise<QuestDualOutput> {
    const onProgress = callbacks?.onProgress || (() => { });
    const onSpotComplete = callbacks?.onSpotComplete || (() => { });
    const onPlotComplete = callbacks?.onPlotComplete || (() => { });
    const onError = callbacks?.onError || (() => { });

    return new Promise((resolve, reject) => {
        const difyInputs = convertRequestToDifyInputs(request);
        const endpoint = config.endpoint || 'https://api.dify.ai/v1/workflows/run';

        // Server-Sent Eventsでストリーミング
        const eventSource = new EventSource(
            `${endpoint}?${new URLSearchParams({
                inputs: JSON.stringify(difyInputs),
                response_mode: 'streaming',
                user: 'quest-creator',
            })}`
        );

        let finalOutput: QuestDualOutput | null = null;

        eventSource.addEventListener('message', (event) => {
            try {
                const data: DifyStreamEvent = JSON.parse(event.data);

                switch (data.event) {
                    case 'workflow_started':
                        console.log('[Dify] Workflow started:', data.workflow_run_id);
                        break;

                    case 'node_started':
                        // ノード開始時の進捗更新
                        const state = mapNodeToState(data.data.node_id || '', data.data.index || 0);
                        onProgress(state);
                        break;

                    case 'node_finished':
                        // ノード完了時のコールバック
                        handleNodeFinished(data, callbacks);
                        break;

                    case 'workflow_finished':
                        console.log('[Dify] Workflow finished');
                        if (data.data.outputs) {
                            finalOutput = data.data.outputs as QuestDualOutput;
                            validateDifyOutput(finalOutput);
                            eventSource.close();
                            resolve(finalOutput);
                        }
                        break;

                    case 'error':
                        console.error('[Dify] Workflow error:', data.data.error);
                        eventSource.close();
                        reject(new Error(data.data.error || 'Dify workflow error'));
                        break;
                }
            } catch (error) {
                console.error('[Dify] Event parsing error:', error);
            }
        });

        eventSource.addEventListener('error', (error) => {
            console.error('[Dify] EventSource error:', error);
            eventSource.close();
            reject(new Error('Dify streaming connection error'));
        });

        // タイムアウト処理
        setTimeout(() => {
            if (!finalOutput) {
                eventSource.close();
                reject(new Error('Dify workflow timeout'));
            }
        }, config.timeout || 300000);
    });
}

/**
 * QuestGenerationRequestをDify入力形式に変換
 */
function convertRequestToDifyInputs(request: QuestGenerationRequest): Record<string, any> {
    return {
        // 必須フィールド
        prompt: request.prompt,
        difficulty: request.difficulty,
        spot_count: request.spot_count,

        // オプションフィールド（undefinedの場合は空文字列）
        theme_tags: request.theme_tags?.join(',') || '',
        genre_support: request.genre_support || '',
        tone_support: request.tone_support || '',

        // prompt_support（各フィールドを個別に）
        protagonist: request.prompt_support?.protagonist || '',
        objective: request.prompt_support?.objective || '',
        ending: request.prompt_support?.ending || '',
        when: request.prompt_support?.when || '',
        where: request.prompt_support?.where || '',
        purpose: request.prompt_support?.purpose || '',
        with_whom: request.prompt_support?.withWhom || '',

        // 位置情報
        center_lat: request.center_location?.lat?.toString() || '',
        center_lng: request.center_location?.lng?.toString() || '',
        radius_km: request.radius_km?.toString() || '1',
    };
}

/**
 * Dify出力を検証
 */
function validateDifyOutput(output: QuestDualOutput): void {
    if (!output) {
        throw new Error('Dify output is null or undefined');
    }

    if (!output.player_preview) {
        throw new Error('Missing player_preview in Dify output');
    }

    if (!output.creator_payload) {
        throw new Error('Missing creator_payload in Dify output');
    }

    if (!output.creator_payload.spots || output.creator_payload.spots.length === 0) {
        throw new Error('No spots in creator_payload');
    }

    if (!output.creator_payload.quest_title) {
        throw new Error('Missing quest_title in creator_payload');
    }

    console.log('[Dify] Output validation passed');
}

/**
 * ノードIDをパイプラインステートにマッピング
 */
function mapNodeToState(nodeId: string, index: number): PipelineState {
    // ノードIDの命名規則に応じて調整
    if (nodeId.includes('spot') || nodeId.includes('generate')) {
        return {
            current_step: 1,
            step_name: 'motif_selection',
            progress: 10,
        };
    } else if (nodeId.includes('plot') || nodeId.includes('story')) {
        return {
            current_step: 2,
            step_name: 'plot_creation',
            progress: 30,
        };
    } else if (nodeId.includes('puzzle')) {
        return {
            current_step: 3,
            step_name: 'puzzle_design',
            progress: 50 + (index * 5),
            current_spot_index: index,
        };
    } else if (nodeId.includes('validate')) {
        return {
            current_step: 4,
            step_name: 'validation',
            progress: 90,
        };
    }

    return {
        current_step: 1,
        step_name: 'motif_selection',
        progress: 0,
    };
}

/**
 * ノード完了時の処理
 */
function handleNodeFinished(
    event: DifyStreamEvent,
    callbacks?: Partial<PipelineCallbacks>
): void {
    const nodeId = event.data.node_id || '';
    const outputs = event.data.outputs;

    if (!outputs || !callbacks) return;

    // プロット完了
    if (nodeId.includes('plot') && callbacks.onPlotComplete && outputs.main_plot) {
        callbacks.onPlotComplete(outputs.main_plot);
    }

    // スポット完了
    if (nodeId.includes('spot') && callbacks.onSpotComplete && outputs.spot) {
        const index = event.data.index || 0;
        callbacks.onSpotComplete(outputs.spot, index);
    }
}
