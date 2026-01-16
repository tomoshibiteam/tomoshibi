/**
 * Unified Quest Generator
 * 
 * Difyワークフローと既存のGemini直結パイプラインを統合
 * 環境変数で切り替え可能、フォールバック対応
 */

import {
    QuestGenerationRequest,
    QuestDualOutput,
    PipelineCallbacks,
} from './layton-types';
import { generateLaytonQuest } from './layton-pipeline';
import { generateQuestWithDify, generateQuestWithDifyStreaming, DifyConfig } from './dify-adapter';

/**
 * 生成モード
 */
export type GenerationMode = 'dify' | 'gemini' | 'auto';

/**
 * 統合設定
 */
export interface UnifiedGeneratorConfig {
    mode: GenerationMode;
    geminiApiKey: string;
    difyApiKey?: string;
    difyEndpoint?: string;
    enableStreaming?: boolean;
    timeout?: number;
}

/**
 * 統合クエスト生成関数
 * 
 * 環境変数とフォールバックロジックで最適な生成方法を選択
 * 
 * @param request クエスト生成リクエスト
 * @param config 設定
 * @param callbacks 進捗コールバック
 * @returns QuestDualOutput
 */
export async function generateQuest(
    request: QuestGenerationRequest,
    config: UnifiedGeneratorConfig,
    callbacks?: Partial<PipelineCallbacks>
): Promise<QuestDualOutput> {
    const mode = determineMode(config);

    console.log(`[Generator] Using mode: ${mode}`);

    // Difyモード
    if (mode === 'dify') {
        try {
            return await generateWithDify(request, config, callbacks);
        } catch (error) {
            console.warn('[Generator] Dify failed, falling back to Gemini:', error);
            // フォールバック: Geminiに切り替え
            return await generateWithGemini(request, config, callbacks);
        }
    }

    // Geminiモード（デフォルト）
    return await generateWithGemini(request, config, callbacks);
}

/**
 * 使用するモードを決定
 */
function determineMode(config: UnifiedGeneratorConfig): GenerationMode {
    // 明示的にモードが指定されている場合
    if (config.mode === 'dify' || config.mode === 'gemini') {
        return config.mode;
    }

    // autoモード: Dify APIキーがあればDify、なければGemini
    if (config.mode === 'auto') {
        return config.difyApiKey ? 'dify' : 'gemini';
    }

    // デフォルトはGemini
    return 'gemini';
}

/**
 * Difyで生成
 */
async function generateWithDify(
    request: QuestGenerationRequest,
    config: UnifiedGeneratorConfig,
    callbacks?: Partial<PipelineCallbacks>
): Promise<QuestDualOutput> {
    // 環境変数からAPIキーを取得（configになければ）
    const apiKey = config.difyApiKey || (import.meta as any).env?.VITE_DIFY_API_KEY;

    if (!apiKey) {
        throw new Error('Dify API key is required for Dify mode. Set VITE_DIFY_API_KEY in .env');
    }

    const difyConfig: DifyConfig = {
        apiKey,
        endpoint: config.difyEndpoint || getDefaultDifyEndpoint(),
        timeout: config.timeout,
    };

    // ストリーミングモード
    if (config.enableStreaming) {
        console.log('[Generator] Using Dify streaming mode');
        return await generateQuestWithDifyStreaming(request, difyConfig, callbacks);
    }

    // ブロッキングモード
    console.log('[Generator] Using Dify blocking mode');
    return await generateQuestWithDify(request, difyConfig, callbacks);
}

/**
 * Geminiで生成（既存パイプライン）
 */
async function generateWithGemini(
    request: QuestGenerationRequest,
    config: UnifiedGeneratorConfig,
    callbacks?: Partial<PipelineCallbacks>
): Promise<QuestDualOutput> {
    if (!config.geminiApiKey) {
        throw new Error('Gemini API key is required for Gemini mode');
    }

    console.log('[Generator] Using Gemini direct pipeline');
    return await generateLaytonQuest(request, config.geminiApiKey, callbacks);
}

/**
 * デフォルトのDifyエンドポイントを取得
 */
function getDefaultDifyEndpoint(): string {
    // 環境変数から取得、なければデフォルト
    return (import.meta as any).env?.VITE_DIFY_ENDPOINT || 'https://api.dify.ai/v1/workflows/run';
}

/**
 * 環境変数から設定を自動構築
 */
export function createConfigFromEnv(): UnifiedGeneratorConfig {
    const env = (import.meta as any).env;

    return {
        mode: (env?.VITE_GENERATION_MODE as GenerationMode) || 'auto',
        geminiApiKey: env?.VITE_GEMINI_API_KEY || '',
        difyApiKey: env?.VITE_DIFY_API_KEY,
        difyEndpoint: env?.VITE_DIFY_ENDPOINT,
        enableStreaming: env?.VITE_DIFY_STREAMING === 'true',
        timeout: parseInt(env?.VITE_GENERATION_TIMEOUT || '300000', 10),
    };
}
