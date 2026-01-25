import { QuestGenerationRequest, QuestDualOutput } from "./difyQuest";

interface GeminiConfig {
  apiKey: string;
  model: string;
  timeout: number;
}

const DEFAULT_TIMEOUT_MS = 300000;
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

const getDifficultyLabel = (difficulty: QuestGenerationRequest["difficulty"]) => {
  switch (difficulty) {
    case "easy":
      return "初級";
    case "medium":
      return "中級";
    case "hard":
      return "上級";
    default:
      return "中級";
  }
};

const buildGeminiPrompt = (request: QuestGenerationRequest) => {
  const difficultyLabel = getDifficultyLabel(request.difficulty);
  const tags = request.theme_tags?.filter(Boolean).join(", ") || "none";
  const support = request.prompt_support || {};
  const supportLines = [
    support.protagonist ? `Protagonist: ${support.protagonist}` : null,
    support.objective ? `Objective: ${support.objective}` : null,
    support.ending ? `Ending: ${support.ending}` : null,
    support.when ? `When: ${support.when}` : null,
    support.where ? `Where: ${support.where}` : null,
    support.purpose ? `Purpose: ${support.purpose}` : null,
    support.withWhom ? `With whom: ${support.withWhom}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const centerLat = request.center_location?.lat ?? 35.6812;
  const centerLng = request.center_location?.lng ?? 139.7671;
  const radiusKm = request.radius_km ?? 1;

  return [
    "You are a quest designer for a city walking mystery game.",
    "Return ONLY valid JSON with the exact schema below. No markdown, no commentary.",
    "All narrative text must be in Japanese.",
    "",
    `User prompt: ${request.prompt}`,
    `Difficulty: ${request.difficulty} (${difficultyLabel})`,
    `Spot count: ${request.spot_count}`,
    `Theme tags: ${tags}`,
    `Genre support: ${request.genre_support || "none"}`,
    `Tone support: ${request.tone_support || "none"}`,
    supportLines ? `Prompt support:\n${supportLines}` : "Prompt support: none",
    `Center location: lat ${centerLat}, lng ${centerLng}`,
    `Radius: ${radiusKm} km`,
    "",
    "Schema (fill all fields, keep numbers as strings where specified):",
    "{",
    '  "player_preview": {',
    '    "title": "string",',
    '    "one_liner": "string",',
    '    "trailer": "string",',
    '    "mission": "string",',
    '    "teasers": ["string", "..."],',
    '    "summary_actions": ["string", "..."],',
    '    "route_meta": {',
    '      "area_start": "string",',
    '      "area_end": "string",',
    '      "distance_km": "string",',
    '      "estimated_time_min": "string",',
    '      "spots_count": number,',
    '      "outdoor_ratio_percent": "string",',
    '      "recommended_people": "string",',
    '      "difficulty_label": "string",',
    '      "difficulty_reason": "string",',
    '      "weather_note": "string"',
    "    },",
    '    "highlight_spots": [{ "name": "string", "teaser_experience": "string" }],',
    '    "tags": ["string", "..."],',
    '    "prep_and_safety": ["string", "..."],',
    '    "cta_copy": { "primary": "string", "secondary": "string", "note": "string" }',
    "  },",
    '  "creator_payload": {',
    '    "quest_title": "string",',
    '    "main_plot": { "premise": "string", "goal": "string", "final_reveal_outline": "string" },',
    '    "spots": [',
    '      {',
    '        "spot_id": "spot-1",',
    '        "spot_name": "string",',
    '        "place_id": "string or empty",',
    '        "address": "string or empty",',
    '        "lat": number,',
    '        "lng": number,',
    '        "scene_role": "string",',
    '        "question_text": "string",',
    '        "answer_text": "string",',
    '        "hint_text": "string",',
    '        "explanation_text": "string"',
    "      }",
    "    ],",
    '    "meta_puzzle": { "explanation": "string" }',
    "  }",
    "}",
    "",
    "Rules:",
    "- Provide exactly the requested number of spots.",
    "- Use unique spot names.",
    "- Use coordinates near the center location within the radius.",
    "- difficulty_label must be 初級/中級/上級.",
    "- distance_km, estimated_time_min, outdoor_ratio_percent must be strings.",
    "- For each spot, include question_text and answer_text. hint_text may include multiple hints separated by '||'.",
  ].join("\n");
};

const extractJsonString = (text: string) => {
  const trimmed = text.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
};

const normalizeGeminiOutput = (raw: any): QuestDualOutput => {
  let output = raw;
  if (output?.data?.outputs) {
    output = output.data.outputs;
  }
  if (output && typeof output === "object" && "result" in output) {
    const resultValue = (output as any).result;
    if (typeof resultValue === "string") {
      output = JSON.parse(resultValue);
    } else if (typeof resultValue === "object") {
      output = resultValue;
    }
  }

  if (!output?.player_preview) {
    throw new Error("Gemini output is missing player_preview");
  }
  if (!output?.creator_payload) {
    throw new Error("Gemini output is missing creator_payload");
  }
  return output as QuestDualOutput;
};

export const createGeminiConfigFromEnv = (): GeminiConfig => {
  const env = (import.meta as any).env || {};
  const apiKey = env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is not set");
  }
  const model = env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const timeout = parseInt(env.VITE_GENERATION_TIMEOUT || `${DEFAULT_TIMEOUT_MS}`, 10);
  return { apiKey, model, timeout };
};

export const generateQuestWithGemini = async (
  request: QuestGenerationRequest,
  config: GeminiConfig
): Promise<QuestDualOutput> => {
  const prompt = buildGeminiPrompt(request);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
        },
      }),
      signal: AbortSignal.timeout(config.timeout || DEFAULT_TIMEOUT_MS),
    });
  } catch (err: any) {
    console.error("[Gemini] Fetch Error Details:", {
      message: err.message,
      name: err.name,
      cause: err.cause,
      stack: err.stack,
    });
    throw new Error(`Connection failed: ${err.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Gemini] Response error", {
      status: response.status,
      statusText: response.statusText,
      errorText: errorText.slice(0, 500),
    });
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const raw = await response.json();
  const text = raw?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part?.text)
    .filter(Boolean)
    .join("\n");

  if (!text) {
    throw new Error("Gemini response missing content");
  }

  const jsonText = extractJsonString(text);
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    console.error("[Gemini] JSON parse error", { jsonText: jsonText.slice(0, 500) });
    throw new Error("Gemini response is not valid JSON");
  }

  return normalizeGeminiOutput(parsed);
};
