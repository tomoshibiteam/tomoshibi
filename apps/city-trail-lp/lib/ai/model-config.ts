/**
 * AI Model Configuration
 * 
 * Centralized configuration for selecting appropriate Gemini models
 * based on task complexity and requirements.
 */

export type TaskType =
    | 'translation'      // Simple translation tasks
    | 'story'           // Complex story generation
    | 'puzzle'          // Puzzle logic and hints
    | 'motif'           // Creative motif generation
    | 'general';        // General quest generation

/**
 * Model selection map
 * - Flash: Fast, cost-effective for simple/structured tasks
 * - Pro: Higher quality for complex creative/logical tasks
 */
const MODEL_MAP: Record<TaskType, string> = {
    translation: 'gemini-2.0-flash',
    story: 'gemini-2.0-flash',
    puzzle: 'gemini-2.0-flash',
    motif: 'gemini-2.0-flash',
    general: 'gemini-2.0-flash',
};

/**
 * Get the appropriate Gemini model for a given task type
 * 
 * @param taskType - The type of task to be performed
 * @returns The model name to use for the API call
 * 
 * @example
 * ```typescript
 * const model = getModelForTask('translation');
 * // Returns: 'gemini-2.0-flash'
 * ```
 */
export function getModelForTask(taskType: TaskType): string {
    return MODEL_MAP[taskType];
}

/**
 * Generate the full API endpoint URL for a given task type
 * 
 * @param taskType - The type of task to be performed
 * @param apiKey - Gemini API key
 * @returns The complete API endpoint URL
 */
export function getModelEndpoint(taskType: TaskType, apiKey: string): string {
    const model = getModelForTask(taskType);
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

/**
 * Check if a task type uses the Flash model (for cost estimation)
 */
export function usesFlashModel(taskType: TaskType): boolean {
    return getModelForTask(taskType) === 'gemini-2.0-flash';
}

/**
 * Get all task types that use Flash model (useful for analytics)
 */
export function getFlashTaskTypes(): TaskType[] {
    return (Object.keys(MODEL_MAP) as TaskType[]).filter(usesFlashModel);
}

/**
 * Get all task types that use Pro model (useful for analytics)
 */
export function getProTaskTypes(): TaskType[] {
    return (Object.keys(MODEL_MAP) as TaskType[]).filter(
        taskType => !usesFlashModel(taskType)
    );
}
