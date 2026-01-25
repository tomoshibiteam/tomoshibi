export type Difficulty = "easy" | "medium" | "hard";

export interface QuestGenerationRequest {
  prompt: string;
  difficulty: Difficulty;
  spot_count: number;
  theme_tags?: string[];
  genre_support?: string;
  tone_support?: string;
  prompt_support?: {
    protagonist?: string;
    objective?: string;
    ending?: string;
    when?: string;
    where?: string;
    purpose?: string;
    withWhom?: string;
  };
  center_location?: { lat: number; lng: number };
  radius_km?: number;
}

export interface PlayerPreviewOutput {
  title: string;
  one_liner: string;
  trailer: string;
  mission: string;
  teasers: string[];
  summary_actions: string[];
  route_meta: {
    area_start: string;
    area_end: string;
    distance_km: string;
    estimated_time_min: string;
    spots_count: number;
    outdoor_ratio_percent: string;
    recommended_people: string;
    difficulty_label: string;
    difficulty_reason: string;
    weather_note: string;
  };
  highlight_spots: { name: string; teaser_experience: string }[];
  tags: string[];
  prep_and_safety: string[];
  cta_copy: { primary: string; secondary: string; note: string };
}

export interface QuestDualOutput {
  player_preview: PlayerPreviewOutput;
  creator_payload: QuestCreatorPayload;
}

export interface QuestMainPlot {
  premise?: string;
  goal?: string;
  final_reveal_outline?: string;
}

export interface QuestSpotScene {
  spot_id?: string;
  spot_name: string;
  place_id?: string;
  address?: string;
  google_maps_url?: string;
  googleMapsUrl?: string;
  lat?: number;
  lng?: number;
  scene_role?: string;
  question_text?: string;
  answer_text?: string;
  hint_text?: string;
  explanation_text?: string;
}

export interface QuestCreatorPayload {
  quest_id?: string;
  quest_title: string;
  cover_image_url?: string;
  coverImageUrl?: string;
  main_plot?: QuestMainPlot;
  spots?: QuestSpotScene[];
  meta_puzzle?: { explanation?: string };
  generation_metadata?: {
    validation_warnings?: string[];
  };
}

interface DifyConfig {
  apiKey: string;
  endpoint: string;
  timeout: number;
}

const DEFAULT_TIMEOUT_MS = 300000;

const resolveEndpoint = (endpoint: string) => {
  if (typeof window === "undefined") return endpoint;
  const isDev = (import.meta as any).env?.DEV || (import.meta as any).env?.MODE === "development";
  if (isDev && endpoint.includes("https://api.dify.ai")) {
    return endpoint.replace("https://api.dify.ai", "/api/dify");
  }
  if (isDev && /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(endpoint)) {
    return endpoint.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, "/api/dify");
  }
  return endpoint;
};

const convertRequestToInputs = (request: QuestGenerationRequest) => ({
  prompt: request.prompt,
  difficulty: request.difficulty,
  spot_count: request.spot_count,
  theme_tags: request.theme_tags?.join(",") || "",
  genre_support: request.genre_support || "",
  tone_support: request.tone_support || "",
  protagonist: request.prompt_support?.protagonist || "",
  objective: request.prompt_support?.objective || "",
  ending: request.prompt_support?.ending || "",
  when: request.prompt_support?.when || "",
  where: request.prompt_support?.where || "",
  purpose: request.prompt_support?.purpose || "",
  with_whom: request.prompt_support?.withWhom || "",
  center_lat: request.center_location?.lat?.toString() || "35.6812",
  center_lng: request.center_location?.lng?.toString() || "139.7671",
  radius_km: request.radius_km?.toString() || "1",
});

const parseDifyOutput = (raw: any): QuestDualOutput => {
  let output = raw?.data?.outputs;
  if (!output) {
    throw new Error("Dify output is missing");
  }

  if (output && typeof output === "object" && "result" in output) {
    const resultValue = (output as any).result;
    if (typeof resultValue === "string") {
      try {
        output = JSON.parse(resultValue);
      } catch {
        // Keep as-is if JSON parse fails.
      }
    } else if (typeof resultValue === "object") {
      output = resultValue;
    }
  }

  if (!output?.player_preview) {
    throw new Error("Dify output is missing player_preview");
  }
  if (!output?.creator_payload) {
    throw new Error("Dify output is missing creator_payload");
  }

  return output as QuestDualOutput;
};

export const createDifyConfigFromEnv = (): DifyConfig => {
  const env = (import.meta as any).env || {};
  const apiKey = env.VITE_DIFY_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_DIFY_API_KEY is not set");
  }
  const endpoint =
    env.VITE_DIFY_ENDPOINT || "https://api.dify.ai/v1/workflows/run";
  const timeout = parseInt(env.VITE_GENERATION_TIMEOUT || `${DEFAULT_TIMEOUT_MS}`, 10);
  return { apiKey, endpoint, timeout };
};

export const generateQuestWithDify = async (
  request: QuestGenerationRequest,
  config: DifyConfig
): Promise<QuestDualOutput> => {
  const endpoint = resolveEndpoint(config.endpoint);
  const inputs = convertRequestToInputs(request);
  console.log("[Dify] Request", {
    endpoint,
    promptPreview: request.prompt?.slice(0, 120),
    difficulty: request.difficulty,
    spotCount: request.spot_count,
    hasLocation: Boolean(request.center_location),
  });

  /* DEBUG LOGGING */
  const finalEndpoint = endpoint.startsWith("/") ? `${window.location.origin}${endpoint}` : endpoint;
  console.log("[Dify] Request Start", {
    originalEndpoint: config.endpoint,
    resolvedEndpoint: endpoint,
    finalUrl: finalEndpoint,
    isDev: (import.meta as any).env?.DEV,
    inputs,
  });

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs,
        response_mode: "blocking",
        user: "quest-mobile",
      }),
      signal: AbortSignal.timeout(config.timeout || DEFAULT_TIMEOUT_MS),
    });
  } catch (err: any) {
    console.error("[Dify] Fetch Error Details:", {
      message: err.message,
      name: err.name,
      cause: err.cause,
      stack: err.stack,
    });
    // Rethrow with more context
    throw new Error(`Connection failed: ${err.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Dify] Response error", {
      status: response.status,
      statusText: response.statusText,
      errorText: errorText.slice(0, 500),
    });
    throw new Error(`Dify API error (${response.status}): ${errorText}`);
  }

  const raw = await response.json();
  console.log("[Dify] Response ok", {
    workflowRunId: raw?.workflow_run_id,
    status: raw?.data?.status,
  });
  if (raw?.data?.error) {
    console.warn("[Dify] Response warning", raw.data.error);
  }
  return parseDifyOutput(raw);
};
