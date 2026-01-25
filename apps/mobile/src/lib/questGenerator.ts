import { createDifyConfigFromEnv, generateQuestWithDify, QuestDualOutput, QuestGenerationRequest } from "./difyQuest";
import { createGeminiConfigFromEnv, generateQuestWithGemini } from "./geminiQuest";

export type GenerationMode = "dify" | "gemini" | "auto";

export interface QuestGeneratorConfig {
  mode: GenerationMode;
}

const resolveMode = (mode: GenerationMode): GenerationMode => {
  if (mode === "dify" || mode === "gemini") return mode;
  const env = (import.meta as any).env || {};
  return env.VITE_DIFY_API_KEY ? "dify" : "gemini";
};

export const createQuestGeneratorConfigFromEnv = (): QuestGeneratorConfig => {
  const env = (import.meta as any).env || {};
  const mode = (env.VITE_GENERATION_MODE as GenerationMode) || "auto";
  return { mode };
};

export const generateQuest = async (
  request: QuestGenerationRequest,
  config: QuestGeneratorConfig
): Promise<QuestDualOutput> => {
  const mode = resolveMode(config.mode);
  console.log(`[Generator] Using mode: ${mode}`);

  if (mode === "dify") {
    const difyConfig = createDifyConfigFromEnv();
    return generateQuestWithDify(request, difyConfig);
  }

  const geminiConfig = createGeminiConfigFromEnv();
  return generateQuestWithGemini(request, geminiConfig);
};
