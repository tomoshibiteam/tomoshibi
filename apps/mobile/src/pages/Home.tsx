import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin } from "lucide-react";
import { generateUUID } from "@/lib/uuid";
import LanternPrompt from "@/components/home/LanternPrompt";
import QuestWizard from "@/components/home/QuestWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import JourneyMapPreview from "@/components/quest/JourneyMapPreview";
import PlayerPreview from "@/components/quest/PlayerPreview";
import {
  PlayerPreviewOutput,
  QuestCreatorPayload,
  QuestGenerationRequest,
} from "@/lib/difyQuest";
import { createQuestGeneratorConfigFromEnv, generateQuest } from "@/lib/questGenerator";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import RetroGlobe from "@/components/home/RetroGlobe";
import QuestShowcase from "@/components/home/QuestShowcase";
import { useQuest } from "@/contexts/QuestContext";

const GENERATION_PHASES = [
  "モチーフを選定中...",
  "物語を構築中...",
  "謎を設計中...",
  "品質を検証中...",
];

const LEGACY_SERIES = new Set(["灯りの回廊", "港町の手紙"]);
const OFFICIAL_SERIES = "TOMOSHIBI公式クエスト";
const DEFAULT_SPOT_COUNT = 7;
const DEFAULT_DIFFICULTY: QuestGenerationRequest["difficulty"] = "medium";
const DEFAULT_RADIUS_KM = 1.5;
const FALLBACK_COORDS = { lat: 35.6812, lng: 139.7671 };

const Home = () => {
  // Use updated Context State
  const {
    viewMode, setViewMode,
    draftPrompt, setDraftPrompt,
    playerPreview, setPlayerPreview,
    creatorPayload, setCreatorPayload,
    resetQuestState
  } = useQuest();

  const [generationPhase, setGenerationPhase] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [generationError, setGenerationError] = useState("");

  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const locationRequestRef = useRef<Promise<{ lat: number; lng: number } | null> | null>(null);
  const [seriesOptions, setSeriesOptions] = useState<string[]>(() => {
    if (typeof window === "undefined") return [OFFICIAL_SERIES];
    const stored = window.localStorage.getItem("tomoshibi.seriesOptions");
    if (!stored) return [OFFICIAL_SERIES];
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [OFFICIAL_SERIES];
      const cleaned = parsed.filter((item) => typeof item === "string" && !LEGACY_SERIES.has(item));
      return cleaned.includes(OFFICIAL_SERIES) ? cleaned : [OFFICIAL_SERIES, ...cleaned];
    } catch {
      return [OFFICIAL_SERIES];
    }
  });
  const [selectedSeries, setSelectedSeries] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("tomoshibi.selectedSeries");
  });
  const [isSeriesOpen, setIsSeriesOpen] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [savedQuestId, setSavedQuestId] = useState<string | null>(null);

  const canGenerate = Boolean(draftPrompt.trim()) && !isGenerating;
  const canRegenerate = Boolean(draftPrompt.trim()) && !isGenerating && !isSaving;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("tomoshibi.seriesOptions", JSON.stringify(seriesOptions));
  }, [seriesOptions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedSeries) {
      window.localStorage.setItem("tomoshibi.selectedSeries", selectedSeries);
    } else {
      window.localStorage.removeItem("tomoshibi.selectedSeries");
    }
  }, [selectedSeries]);

  useEffect(() => {
    if (selectedSeries && LEGACY_SERIES.has(selectedSeries)) {
      setSelectedSeries(null);
    }
  }, [selectedSeries]);

  const generateCoverImage = useCallback(async (payload: {
    questId: string;
    title: string;
    premise: string;
    goal?: string;
    area?: string;
    tags?: string[];
    tone?: string;
    genre?: string;
    protagonist?: string;
    objective?: string;
    ending?: string;
    when?: string;
    where?: string;
    purpose?: string;
    withWhom?: string;
  }) => {
    if (!payload.questId || !payload.title || !payload.premise) return "";
    setIsGeneratingCover(true);
    try {
      const response = await supabase.functions.invoke("generate-quest-cover", {
        body: payload,
      });
      if (response.error) throw response.error;
      return response.data?.imageUrl || response.data?.imageUrls?.[0] || "";
    } catch (error) {
      console.warn("[Home] cover image generation failed:", error);
      return "";
    } finally {
      setIsGeneratingCover(false);
    }
  }, []);

  const handleUseLocation = useCallback(() => {
    if (locationStatus === "loading") return;
    if (locationStatus === "ready") {
      setLocationStatus("idle");
      setLocationCoords(null);
      setLocationError("");
      return;
    }
    setIsLocationDialogOpen(true);
  }, [locationStatus]);

  const fetchCurrentLocation = useCallback(() => {
    if (locationRequestRef.current) return locationRequestRef.current;
    const request = new Promise<{ lat: number; lng: number } | null>((resolve) => {
      const finalize = (result: { lat: number; lng: number } | null) => {
        locationRequestRef.current = null;
        resolve(result);
      };
      if (!navigator.geolocation) {
        setLocationStatus("error");
        setLocationError("この端末では現在地を取得できません");
        finalize(null);
        return;
      }
      setLocationStatus("loading");
      setLocationError("");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocationCoords(coords);
          setLocationStatus("ready");
          finalize(coords);
        },
        () => {
          setLocationStatus("error");
          setLocationError("現在地を取得できませんでした");
          finalize(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
    locationRequestRef.current = request;
    return request;
  }, []);

  const requestLocation = useCallback(async () => {
    setIsLocationDialogOpen(false);
    await fetchCurrentLocation();
  }, [fetchCurrentLocation]);

  const handleAddSeries = useCallback(() => {
    const trimmed = newSeriesName.trim();
    if (!trimmed) return;
    setSeriesOptions((prev) => (prev.includes(trimmed) ? prev : [trimmed, ...prev]));
    setSelectedSeries(trimmed);
    setNewSeriesName("");
    setIsSeriesOpen(false);
  }, [newSeriesName]);

  const handleIgnite = useCallback(async (
    overridePrompt?: string,
    overrideLocation?: { lat: number; lng: number } | null
  ) => {
    const promptToUse = typeof overridePrompt === "string" ? overridePrompt : draftPrompt;
    const trimmed = promptToUse.trim();
    if (!trimmed || isGenerating) return;
    const effectiveLocation =
      overrideLocation !== undefined ? overrideLocation : locationCoords;

    if (!user) {
      toast({
        title: "ログインが必要です",
        description: "クエストを作成するにはログインしてください。",
      });
      navigate("/auth", { state: { returnTo: "/" } });
      return;
    }

    const prefixTokens = [
      ...(effectiveLocation ? ["現在地周辺で"] : []),
      ...(selectedSeries ? [`シリーズ「${selectedSeries}」`] : []),
    ];
    const combinedPrompt = prefixTokens.length > 0 ? `${prefixTokens.join("、")}、${trimmed}` : trimmed;

    setGenerationError("");
    setPlayerPreview(null);
    setCreatorPayload(null);
    setSavedQuestId(null);
    setViewMode("generating");
    setIsGenerating(true);
    setGenerationPhase(GENERATION_PHASES[0]);
    setIsSeriesOpen(false);

    let phaseIndex = 0;
    const phaseTimer = window.setInterval(() => {
      phaseIndex += 1;
      if (phaseIndex < GENERATION_PHASES.length) {
        setGenerationPhase(GENERATION_PHASES[phaseIndex]);
      } else {
        window.clearInterval(phaseTimer);
      }
    }, 1200);

    try {
      const config = createQuestGeneratorConfigFromEnv();
      const request: QuestGenerationRequest = {
        prompt: combinedPrompt,
        difficulty: DEFAULT_DIFFICULTY,
        spot_count: DEFAULT_SPOT_COUNT,
        center_location: effectiveLocation || undefined,
        radius_km: effectiveLocation ? DEFAULT_RADIUS_KM : undefined,
      };
      const output = await generateQuest(request, config);

      window.clearInterval(phaseTimer);

      const existingCover =
        output.creator_payload?.cover_image_url ||
        output.creator_payload?.coverImageUrl ||
        (output.player_preview as any)?.cover_image_url ||
        "";

      let coverImageUrl = existingCover;
      if (!coverImageUrl) {
        setGenerationPhase("カバー画像生成中...");
        const questId = generateUUID();
        setSavedQuestId(questId);
        const title =
          output.creator_payload?.quest_title ||
          output.player_preview?.title ||
          "無題のクエスト";
        const premise =
          output.creator_payload?.main_plot?.premise ||
          output.player_preview?.trailer ||
          output.player_preview?.one_liner ||
          request.prompt ||
          "物語の始まり";
        const area =
          output.player_preview?.route_meta?.area_start ||
          output.player_preview?.route_meta?.area_end ||
          "";

        coverImageUrl = await generateCoverImage({
          questId,
          title,
          premise,
          goal: output.creator_payload?.main_plot?.goal || "",
          area,
          tags: output.player_preview?.tags || [],
          tone: request.tone_support || "",
          genre: request.genre_support || "",
          protagonist: request.prompt_support?.protagonist || "",
          objective: request.prompt_support?.objective || "",
          ending: request.prompt_support?.ending || "",
          when: request.prompt_support?.when || "",
          where: request.prompt_support?.where || "",
          purpose: request.prompt_support?.purpose || "",
          withWhom: request.prompt_support?.withWhom || "",
        });
      }

      const creatorPayloadWithCover = coverImageUrl
        ? { ...output.creator_payload, cover_image_url: coverImageUrl }
        : output.creator_payload;

      setPlayerPreview(output.player_preview);
      setCreatorPayload(creatorPayloadWithCover);
      // Navigate to the output page instead of showing preview inline
      navigate("/quest-generated");
      setViewMode("idle");
    } catch (error: any) {
      console.error("Generation failed:", error);
      setViewMode("idle");
      const errorMsg = error?.message || "クエスト生成に失敗しました";
      setGenerationError(errorMsg);
      toast({
        title: "生成エラー",
        description: "AIによる生成中にエラーが発生しました。\n" + errorMsg,
        variant: "destructive",
      });
    } finally {
      window.clearInterval(phaseTimer);
      setIsGenerating(false);
      setGenerationPhase("");
    }
  }, [
    draftPrompt,
    isGenerating,
    locationCoords,
    selectedSeries,
    user,
    navigate,
    toast,
    generateCoverImage,
    setSavedQuestId,
    setViewMode,
    setPlayerPreview,
    setCreatorPayload,
  ]);

  const handleRegenerate = useCallback(() => {
    if (!canRegenerate) return;
    void handleIgnite();
  }, [canRegenerate, handleIgnite]);

  const handleLocationHint = useCallback((value: string) => {
    if (!value.includes("現在地")) return;
    if (locationStatus === "loading" || locationStatus === "ready") return;
    void fetchCurrentLocation();
  }, [fetchCurrentLocation, locationStatus]);

  const locationLabel = (() => {
    if (locationStatus === "loading") return "現在地: 取得中...";
    if (locationStatus === "ready") return "現在地: 使用中";
    if (locationStatus === "error") return "現在地: 取得失敗";
    return "現在地を使う";
  })();

  const previewSpots = useMemo(() => {
    const rawSpots = creatorPayload?.spots || [];

    return rawSpots.map((spot, idx) => {
      const name = spot.spot_name || `スポット${idx + 1}`;
      const mapUrl =
        (spot as any).google_maps_url ||
        (spot as any).googleMapsUrl ||
        (spot.place_id
          ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(spot.place_id)}`
          : "");
      const lat = typeof spot.lat === "number" && Number.isFinite(spot.lat) ? spot.lat : FALLBACK_COORDS.lat;
      const lng = typeof spot.lng === "number" && Number.isFinite(spot.lng) ? spot.lng : FALLBACK_COORDS.lng;

      return {
        id: spot.spot_id || `spot-${idx + 1}`,
        name,
        lat,
        lng,
        placeId: spot.place_id,
        mapUrl,
      };
    });
  }, [creatorPayload]);

  const journeyTitle = useMemo(() => {
    if (playerPreview?.title?.trim()) return playerPreview.title.trim();
    if (creatorPayload?.quest_title?.trim()) return creatorPayload.quest_title.trim();
    if (draftPrompt.trim()) return "まだ名前のない旅";
    return "旅の設計プレビュー";
  }, [playerPreview, creatorPayload, draftPrompt]);

  const journeyTeaser = useMemo(() => {
    return (
      playerPreview?.trailer?.trim() ||
      creatorPayload?.main_plot?.premise?.trim() ||
      playerPreview?.one_liner?.trim() ||
      ""
    );
  }, [playerPreview, creatorPayload]);

  const journeyBadges = useMemo(() => {
    const badges: string[] = [];
    const meta = playerPreview?.route_meta;
    const distanceValue = meta?.distance_km ? parseFloat(meta.distance_km) : NaN;
    const walkingValue = meta?.estimated_time_min ? parseInt(meta.estimated_time_min, 10) : NaN;
    const spotCount = meta?.spots_count || previewSpots.length;
    const difficultyLabel = meta?.difficulty_label || "";

    if (Number.isFinite(walkingValue)) badges.push(`⏱ ${walkingValue}分`);
    if (Number.isFinite(distanceValue)) badges.push(`🗺 ${distanceValue}km`);
    if (difficultyLabel) {
      const shortLabel =
        difficultyLabel.includes("初") ? "易" : difficultyLabel.includes("上") ? "難" : "中";
      badges.push(`🔥 ${shortLabel}`);
    }
    if (spotCount) badges.push(`📍 ${spotCount} spots`);
    if (locationCoords) badges.push("🧭 現在地周辺");
    if (selectedSeries) badges.push(`📚 ${selectedSeries}`);

    return badges;
  }, [playerPreview, previewSpots.length, locationCoords, selectedSeries]);

  const mapCenter = useMemo(() => {
    if (locationCoords) return locationCoords;
    if (previewSpots.length > 0) {
      return {
        lat: previewSpots.reduce((sum, s) => sum + s.lat, 0) / previewSpots.length,
        lng: previewSpots.reduce((sum, s) => sum + s.lng, 0) / previewSpots.length,
      };
    }
    return FALLBACK_COORDS;
  }, [locationCoords, previewSpots]);

  const coverImageUrl = useMemo(() => {
    return (
      creatorPayload?.cover_image_url ||
      creatorPayload?.coverImageUrl ||
      (playerPreview as any)?.cover_image_url ||
      ""
    );
  }, [creatorPayload, playerPreview]);

  const highlightSpotLookup = useMemo(() => {
    const map = new Map<string, string>();
    (playerPreview?.highlight_spots || []).forEach((spot) => {
      if (!spot?.name) return;
      map.set(spot.name, spot.teaser_experience || "");
    });
    return map;
  }, [playerPreview]);

  const detailSpots = useMemo(() => {
    return previewSpots.map((spot) => ({
      id: spot.id,
      name: spot.name,
      lat: spot.lat,
      lng: spot.lng,
      mapUrl: spot.mapUrl,
      isHighlight: highlightSpotLookup.has(spot.name),
      highlightDescription: highlightSpotLookup.get(spot.name) || undefined,
    }));
  }, [previewSpots, highlightSpotLookup]);

  const detailBasicInfo = useMemo(() => {
    if (!playerPreview && !creatorPayload) return null;
    const meta = playerPreview?.route_meta;
    const recommended = meta?.recommended_people
      ? meta.recommended_people.split(/[、,]/).map((value) => value.trim()).filter(Boolean)
      : [];
    const highlights = (playerPreview?.highlight_spots || [])
      .map((spot) => (spot.teaser_experience ? `${spot.name}：${spot.teaser_experience}` : spot.name))
      .filter(Boolean);
    return {
      title: journeyTitle,
      description:
        creatorPayload?.main_plot?.premise ||
        playerPreview?.trailer ||
        playerPreview?.one_liner ||
        "",
      area: meta?.area_start || meta?.area_end || "",
      difficulty: meta?.difficulty_label || DEFAULT_DIFFICULTY,
      tags: playerPreview?.tags || [],
      highlights,
      recommendedFor: recommended,
      coverImageUrl: coverImageUrl || undefined,
    };
  }, [playerPreview, creatorPayload, journeyTitle, coverImageUrl]);

  const detailStory = useMemo(() => {
    if (!playerPreview && !creatorPayload?.main_plot) return null;
    const summary =
      playerPreview?.summary_actions?.filter(Boolean).join("\n") || "";
    const story = {
      prologueBody:
        creatorPayload?.main_plot?.premise ||
        playerPreview?.trailer ||
        playerPreview?.one_liner ||
        "",
      atmosphere: playerPreview?.route_meta?.weather_note || "",
      whatToExpect: summary,
      mission: playerPreview?.mission || "",
      clearCondition: creatorPayload?.main_plot?.goal || "",
      teaser: playerPreview?.teasers?.[0] || "",
    };
    const hasContent = Object.values(story).some(
      (value) => typeof value === "string" && value.trim().length > 0
    );
    return hasContent ? story : null;
  }, [playerPreview, creatorPayload]);

  const detailDuration = useMemo(() => {
    const minutes = playerPreview?.route_meta?.estimated_time_min;
    const parsed = minutes ? parseInt(minutes, 10) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [playerPreview]);

  const detailRouteMetadata = useMemo(() => {
    const meta = playerPreview?.route_meta;
    if (!meta) return null;
    const distance = parseFloat(meta.distance_km);
    const walkingMinutes = parseInt(meta.estimated_time_min, 10);
    const outdoorPercent = parseFloat(meta.outdoor_ratio_percent);
    return {
      distanceKm: Number.isFinite(distance) ? distance : undefined,
      walkingMinutes: Number.isFinite(walkingMinutes) ? walkingMinutes : undefined,
      outdoorRatio: Number.isFinite(outdoorPercent) ? outdoorPercent / 100 : undefined,
      startPoint: meta.area_start || undefined,
      endPoint: meta.area_end || undefined,
    };
  }, [playerPreview]);

  const detailDifficultyExplanation = useMemo(() => {
    const reason = playerPreview?.route_meta?.difficulty_reason || "";
    return reason.trim() ? reason : undefined;
  }, [playerPreview]);

  const handleSave = useCallback(() => {
    if (isSaving) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!creatorPayload || !playerPreview) {
      toast({ title: "保存できません", description: "生成結果が見つかりませんでした。" });
      return;
    }
    const performSave = async () => {
      setIsSaving(true);
      try {
        // Use saved ID if available, otherwise generate a new valid UUID.
        // We ignore creatorPayload.quest_id because the AI might return non-UUID strings (e.g. "quest-123")
        // which causes DB errors 'invalid input syntax for type uuid'.
        const questId = savedQuestId || generateUUID();
        const summaryActions = Array.isArray(playerPreview.summary_actions)
          ? playerPreview.summary_actions.filter((value) => typeof value === "string" && value.trim().length > 0)
          : [];
        const teaserList = Array.isArray(playerPreview.teasers)
          ? playerPreview.teasers.filter((value) => typeof value === "string" && value.trim().length > 0)
          : [];
        const title = creatorPayload.quest_title || playerPreview.title || "無題のクエスト";
        const description =
          creatorPayload.main_plot?.premise ||
          playerPreview.trailer ||
          playerPreview.one_liner ||
          "";
        const areaName =
          (playerPreview.route_meta as any)?.area_name ||
          playerPreview.route_meta?.area_start ||
          playerPreview.route_meta?.area_end ||
          "";
        const cover = coverImageUrl || null;
        const tags = Array.isArray(playerPreview.tags)
          ? playerPreview.tags.filter((tag) => typeof tag === "string" && tag.trim().length > 0)
          : [];

        const questPayloadBase = {
          id: questId,
          creator_id: user.id,
          title,
          description,
          area_name: areaName,
          cover_image_url: cover,
          status: "draft",
        };
        const questPayloadFull = {
          ...questPayloadBase,
          tags,
          mode: "PRIVATE",
          main_plot: creatorPayload.main_plot || null,
        };
        const { error: questErr } = await supabase
          .from("quests")
          .upsert(questPayloadFull, { onConflict: "id" });
        if (questErr) {
          const errorText = `${questErr.message || ""} ${questErr.details || ""}`.toLowerCase();
          const errorCode = questErr.code as string | undefined;
          const isSchemaIssue =
            ["PGRST204", "42703", "23514", "22P02"].includes(errorCode || "") ||
            errorText.includes("schema cache") ||
            errorText.includes("column") ||
            errorText.includes("invalid input syntax") ||
            errorText.includes("malformed array literal");
          if (!isSchemaIssue) throw questErr;

          const { error: retryErr } = await supabase
            .from("quests")
            .upsert(questPayloadBase, { onConflict: "id" });
          if (retryErr) throw retryErr;
        }

        const spotRows = (creatorPayload.spots || []).map((spot, idx) => ({
          quest_id: questId,
          name: spot.spot_name || spot.spot_id || `Spot ${idx + 1}`,
          address: (spot as any).address || "",
          lat: (typeof spot.lat === "number" && Number.isFinite(spot.lat)) ? spot.lat : FALLBACK_COORDS.lat,
          lng: (typeof spot.lng === "number" && Number.isFinite(spot.lng)) ? spot.lng : FALLBACK_COORDS.lng,
          order_index: idx + 1,
        }));
        if (spotRows.length > 0) {
          const { data: oldSpotRows } = await supabase
            .from("spots")
            .select("id")
            .eq("quest_id", questId);
          if (oldSpotRows && oldSpotRows.length > 0) {
            const oldSpotIds = oldSpotRows.map((spot) => spot.id);
            await supabase.from("spot_details").delete().in("spot_id", oldSpotIds);
            await supabase.from("spot_story_messages").delete().in("spot_id", oldSpotIds);
          }

          await supabase.from("spots").delete().eq("quest_id", questId);
          const { data: insertedSpots, error: spotErr } = await supabase
            .from("spots")
            .insert(spotRows)
            .select("id, order_index");
          if (spotErr) throw spotErr;

          if (insertedSpots && insertedSpots.length > 0) {
            const detailRows = insertedSpots
              .map((spot) => {
                const index = Math.max(0, (spot.order_index || 1) - 1);
                const storyText = summaryActions[index] || teaserList[index] || "";
                const sourceSpot = creatorPayload.spots?.[index];
                const questionText =
                  sourceSpot?.question_text ||
                  (sourceSpot as any)?.question ||
                  (sourceSpot as any)?.puzzle_question ||
                  teaserList[index] ||
                  summaryActions[index] ||
                  "";
                const answerText =
                  sourceSpot?.answer_text ||
                  (sourceSpot as any)?.answer ||
                  (sourceSpot as any)?.puzzle_answer ||
                  "";
                const hintText =
                  sourceSpot?.hint_text ||
                  (sourceSpot as any)?.hint ||
                  (sourceSpot as any)?.puzzle_hint ||
                  "";
                const explanationText =
                  sourceSpot?.explanation_text ||
                  (sourceSpot as any)?.explanation ||
                  "";
                return {
                  spot_id: spot.id,
                  story_text: storyText,
                  question_text: questionText,
                  hint_text: hintText,
                  answer_text: answerText,
                  explanation_text: explanationText || null,
                };
              })
              .filter((row) => row.story_text || row.question_text);
            if (detailRows.length > 0) {
              await supabase.from("spot_details").insert(detailRows);
            }

            const storyMessageRows = insertedSpots
              .map((spot) => {
                const index = Math.max(0, (spot.order_index || 1) - 1);
                const messageText = summaryActions[index] || teaserList[index] || "";
                if (!messageText) return null;
                return {
                  quest_id: questId,
                  spot_id: spot.id,
                  stage: "pre_puzzle",
                  order_index: 1,
                  speaker_type: "narrator",
                  speaker_name: "案内人",
                  avatar_url: null,
                  text: messageText,
                };
              })
              .filter(Boolean) as {
                quest_id: string;
                spot_id: string;
                stage: string;
                order_index: number;
                speaker_type: string;
                speaker_name: string;
                avatar_url: string | null;
                text: string;
              }[];
            if (storyMessageRows.length > 0) {
              await supabase.from("spot_story_messages").insert(storyMessageRows);
            }
          }
        }

        const prologue =
          creatorPayload.main_plot?.premise ||
          playerPreview.trailer ||
          playerPreview.one_liner ||
          "";
        const epilogue =
          creatorPayload.main_plot?.final_reveal_outline ||
          creatorPayload.main_plot?.goal ||
          playerPreview.mission ||
          "";
        if (prologue || epilogue) {
          const { error: timelineErr } = await supabase
            .from("story_timelines")
            .upsert(
              {
                quest_id: questId,
                prologue,
                epilogue,
              },
              { onConflict: "quest_id" }
            );
          if (timelineErr) {
            const errorText = `${timelineErr.message || ""} ${timelineErr.details || ""}`.toLowerCase();
            if (!errorText.includes("no unique") && !errorText.includes("constraint")) {
              throw timelineErr;
            }
            await supabase.from("story_timelines").insert({
              quest_id: questId,
              prologue,
              epilogue,
            });
          }
        }

        const purchasePayload = { user_id: user.id, quest_id: questId };
        const { data: existingPurchases, error: selectErr } = await supabase
          .from("purchases")
          .select("id")
          .eq("user_id", user.id)
          .eq("quest_id", questId)
          .limit(1);
        if (selectErr) throw selectErr;
        if (!existingPurchases || existingPurchases.length === 0) {
          const { error: insertErr } = await supabase
            .from("purchases")
            .insert(purchasePayload);
          if (insertErr) {
            const errorText = insertErr.message?.toLowerCase() || "";
            if (!errorText.includes("duplicate")) {
              throw insertErr;
            }
          }
        }

        setSavedQuestId(questId);
        toast({ title: "保存しました", description: "プロフィールに追加しました。" });
        // After successful save, reset the quest state
        resetQuestState();
        navigate("/profile");
      } catch (err: any) {
        console.error("Save quest failed:", err);
        const errorMessage =
          err?.message ||
          err?.details ||
          err?.hint ||
          "時間をおいて再試行してください。";
        toast({
          title: "保存に失敗しました",
          description: errorMessage
        });
      } finally {
        setIsSaving(false);
      }
    };
    void performSave();
  }, [
    creatorPayload,
    playerPreview,
    savedQuestId,
    user,
    coverImageUrl,
    toast,
    navigate,
    isSaving,
    resetQuestState,
  ]);

  const handleWizardComplete = useCallback(async (answers: Record<string, string>) => {
    // Build prompt from wizard answers
    const promptParts: string[] = [];

    if (answers.location) {
      promptParts.push(`${answers.location}で`);
    }
    if (answers.genre) {
      promptParts.push(`${answers.genre}のような雰囲気で`);
    }
    if (answers.purpose) {
      promptParts.push(answers.purpose);
    }
    if (answers.duration) {
      promptParts.push(`（${answers.duration}程度）`);
    }
    if (answers.playStyle) {
      promptParts.push(`（${answers.playStyle}）`);
    }

    const finalPrompt = promptParts.join("");
    setDraftPrompt(finalPrompt);

    const wantsCurrentLocation =
      typeof answers.location === "string" && answers.location.includes("現在地");
    const overrideLocation = wantsCurrentLocation
      ? (locationCoords || await fetchCurrentLocation())
      : undefined;

    // Trigger generation immediately with the calculated prompt
    handleIgnite(finalPrompt, overrideLocation);
  }, [handleIgnite, setDraftPrompt, fetchCurrentLocation, locationCoords]);

  return (
    <div className="h-full bg-[#FEF9F3] font-serif text-[#3D2E1F] relative overflow-hidden">
      {/* Cinematic Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_10%,_#E8D5BE_120%)] z-0 pointer-events-none opacity-60" />

      <div className="h-full relative z-10">
        <AnimatePresence mode="wait">
          {viewMode === "idle" && (
            <motion.div
              key="wizard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="h-full flex flex-col"
            >
              <div className="h-full flex flex-col relative bg-transparent">
                {/* 3D Background - Retro Globe */}
                <RetroGlobe />

                {/* Quest Wizard */}
                <div className="absolute inset-0 z-10">
                  <QuestWizard onComplete={handleWizardComplete} onLocationHint={handleLocationHint} />
                </div>
              </div>
            </motion.div>
          )}

          {(viewMode === "generating") && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full min-h-0"
            >
              <JourneyMapPreview
                isGenerating={viewMode === "generating"}
                generationPhase={generationPhase}
                title={journeyTitle}
                teaser={journeyTeaser}
                badges={journeyBadges}
                spots={previewSpots}
                center={mapCenter}
                coverImageUrl={coverImageUrl || undefined}
              />
            </motion.div>
          )}
        </AnimatePresence >
      </div >
    </div >
  );
};

export default Home;
