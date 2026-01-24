import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin } from "lucide-react";
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
  createDifyConfigFromEnv,
  generateQuestWithDify,
  PlayerPreviewOutput,
  QuestCreatorPayload,
  QuestGenerationRequest,
} from "@/lib/difyQuest";
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
const OFFICIAL_SERIES = "SPR探偵事務所の事件簿";
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
  const [generationError, setGenerationError] = useState("");

  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
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

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("この端末では現在地を取得できません");
      setIsLocationDialogOpen(false);
      return;
    }
    setLocationStatus("loading");
    setLocationError("");
    setIsLocationDialogOpen(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus("ready");
      },
      () => {
        setLocationStatus("error");
        setLocationError("現在地を取得できませんでした");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, []);

  const handleAddSeries = useCallback(() => {
    const trimmed = newSeriesName.trim();
    if (!trimmed) return;
    setSeriesOptions((prev) => (prev.includes(trimmed) ? prev : [trimmed, ...prev]));
    setSelectedSeries(trimmed);
    setNewSeriesName("");
    setIsSeriesOpen(false);
  }, [newSeriesName]);

  const handleIgnite = useCallback(async (overridePrompt?: string) => {
    const promptToUse = typeof overridePrompt === "string" ? overridePrompt : draftPrompt;
    const trimmed = promptToUse.trim();
    if (!trimmed || isGenerating) return;

    if (!user) {
      toast({
        title: "ログインが必要です",
        description: "クエストを作成するにはログインしてください。",
      });
      navigate("/auth", { state: { returnTo: "/" } });
      return;
    }

    const prefixTokens = [
      ...(locationCoords ? ["現在地周辺で"] : []),
      ...(selectedSeries ? [`シリーズ「${selectedSeries}」`] : []),
    ];
    const combinedPrompt = prefixTokens.length > 0 ? `${prefixTokens.join("、")}、${trimmed}` : trimmed;

    setGenerationError("");
    setPlayerPreview(null);
    setCreatorPayload(null);
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
      const config = createDifyConfigFromEnv();
      const request: QuestGenerationRequest = {
        prompt: combinedPrompt,
        difficulty: DEFAULT_DIFFICULTY,
        spot_count: DEFAULT_SPOT_COUNT,
        center_location: locationCoords || undefined,
        radius_km: locationCoords ? DEFAULT_RADIUS_KM : undefined,
      };
      const output = await generateQuestWithDify(request, config);

      setPlayerPreview(output.player_preview);
      setCreatorPayload(output.creator_payload);
      setViewMode("preview");
    } catch (error: any) {
      setViewMode("idle");
      setGenerationError(error?.message || "クエスト生成に失敗しました");
    } finally {
      window.clearInterval(phaseTimer);
      setIsGenerating(false);
      setGenerationPhase("");
    }
  }, [draftPrompt, isGenerating, locationCoords, selectedSeries, user, navigate, toast, setViewMode, setPlayerPreview, setCreatorPayload]);

  const handleRegenerate = useCallback(() => {
    if (!canRegenerate) return;
    void handleIgnite();
  }, [canRegenerate, handleIgnite]);

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
        const questId = savedQuestId || creatorPayload.quest_id || crypto.randomUUID();
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

        const { error: questErr } = await supabase
          .from("quests")
          .upsert(
            {
              id: questId,
              creator_id: user.id,
              title,
              description,
              area_name: areaName,
              tags: playerPreview.tags || [],
              cover_image_url: cover,
              status: "draft",
              mode: "PRIVATE",
              main_plot: creatorPayload.main_plot || null,
            },
            { onConflict: "id" }
          );
        if (questErr) throw questErr;

        const spotRows = (creatorPayload.spots || []).map((spot, idx) => ({
          quest_id: questId,
          name: spot.spot_name || spot.spot_id || `Spot ${idx + 1}`,
          address: (spot as any).address || "",
          lat: Number.isFinite(spot.lat) ? spot.lat : null,
          lng: Number.isFinite(spot.lng) ? spot.lng : null,
          order_index: idx + 1,
        }));
        if (spotRows.length > 0) {
          await supabase.from("spots").delete().eq("quest_id", questId);
          const { error: spotErr } = await supabase.from("spots").insert(spotRows);
          if (spotErr) throw spotErr;
        }

        const { error: purchaseErr } = await supabase
          .from("purchases")
          .upsert({ user_id: user.id, quest_id: questId }, { onConflict: "user_id,quest_id" });
        if (purchaseErr) throw purchaseErr;

        setSavedQuestId(questId);
        toast({ title: "保存しました", description: "プロフィールに追加しました。" });
        // After successful save, reset the quest state
        resetQuestState();
        navigate("/profile");
      } catch (err) {
        console.error("Save quest failed:", err);
        toast({ title: "保存に失敗しました", description: "時間をおいて再試行してください。" });
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

    // Trigger generation immediately with the calculated prompt
    handleIgnite(finalPrompt);
  }, [handleIgnite, setDraftPrompt]);

  return (
    <div className="h-full bg-gradient-to-b from-stone-50 to-amber-50/30">
      <div className="h-full">
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
                  <QuestWizard onComplete={handleWizardComplete} />
                </div>
              </div>
            </motion.div>
          )}

          {(viewMode === "generating" || viewMode === "preview") && (
            <motion.div
              key={viewMode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full min-h-0"
            >
              {viewMode === "preview" ? (
                <div className="relative h-full overflow-y-auto bg-white">
                  <div className="pb-24">
                    <PlayerPreview
                      basicInfo={detailBasicInfo}
                      spots={detailSpots}
                      story={detailStory}
                      estimatedDuration={detailDuration}
                      playerPreviewData={playerPreview}
                      routeMetadata={detailRouteMetadata || undefined}
                      difficultyExplanation={detailDifficultyExplanation}
                      showActions={false}
                      onPlay={() => { }}
                      onEdit={() => { }}
                      onSaveDraft={() => { }}
                    />
                  </div>
                  <div className="sticky bottom-0 z-20 bg-white/90 backdrop-blur-md border-t border-stone-200/70">
                    <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 rounded-full bg-gradient-to-r from-brand-gold to-amber-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-gold/20 disabled:opacity-60 active:scale-95 transition-all"
                      >
                        {isSaving ? "保存中..." : "保存する"}
                      </button>
                      <button
                        type="button"
                        onClick={handleRegenerate}
                        disabled={!canRegenerate}
                        className="flex-1 rounded-full border border-stone-200 bg-white px-6 py-3 text-sm font-bold text-stone-600 hover:border-brand-gold/40 hover:text-brand-gold transition-all active:scale-95 disabled:opacity-50"
                      >
                        もう一度生成する
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
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
              )}
            </motion.div>
          )
          }
        </AnimatePresence >
      </div >
    </div >
  );
};

export default Home;
