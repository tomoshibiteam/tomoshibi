import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Menu, X, ChevronUp,
  MapPin, Navigation, Target, CheckCircle2,
  Footprints, Sparkles, ChevronLeft,
  MessageCircle, HelpCircle, Eye, Lock, Globe, AlertCircle, Star, Flame
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { GameSession, GameSpot } from "@/types/gameplay";
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { DEFAULT_CENTER } from "@/lib/mapConfig";
import { useTranslatedQuest } from "@/hooks/useTranslatedQuest";
import { useAnalytics } from "@/hooks/useAnalytics";
import FeedbackModal from "@/components/FeedbackModal";

// Google Maps API Key
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Map Style - using default Google Maps styling
const MAP_STYLE: google.maps.MapTypeStyle[] = [];

type QuestRow = {
  id: string;
  title?: string | null;
  area_name?: string | null;
  description?: string | null;
};

type ChatMessage = {
  id: string;
  speakerType: "narrator" | "character" | "system";
  name?: string | null;
  avatarUrl?: string | null;
  text: string;
  alignment: "left" | "center" | "right";
};

// Component to draw route using Directions API and auto-fit bounds
const RoutePathsHandler = ({
  origin,
  destination,
}: {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
}) => {
  const map = useMap();
  const routes = useMapsLibrary('routes');
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const hasFitBoundsRef = useRef<boolean>(false);

  useEffect(() => {
    if (!map || !routes || directionsRenderer) return;
    const renderer = new routes.DirectionsRenderer({
      suppressMarkers: true,
      preserveViewport: true,
      polylineOptions: {
        strokeColor: '#e67a28',
        strokeOpacity: 0.85,
        strokeWeight: 4,
      },
    });
    renderer.setMap(map);
    setDirectionsRenderer(renderer);
    return () => {
      renderer.setMap(null);
    };
  }, [map, routes, directionsRenderer]);

  useEffect(() => {
    hasFitBoundsRef.current = false;
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  useEffect(() => {
    if (!map || !routes || !directionsRenderer) return;
    if (!origin || !destination) {
      directionsRenderer.setMap(null);
      return;
    }

    directionsRenderer.setMap(map);
    const service = new routes.DirectionsService();
    service.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);
          if (!hasFitBoundsRef.current) {
            const bounds = result.routes?.[0]?.bounds;
            if (bounds) {
              map.fitBounds(bounds, {
                top: 80,
                right: 40,
                bottom: 200,
                left: 40,
              });
              hasFitBoundsRef.current = true;
            }
          }
        } else {
          console.warn("directions error", status);
        }
      }
    );
  }, [
    map,
    routes,
    directionsRenderer,
    origin?.lat,
    origin?.lng,
    destination?.lat,
    destination?.lng,
  ]);

  return null;
};


const GamePlay = () => {
  const { eventId } = useParams<{ eventId: string }>();
  // eventId を questId として扱う（quest_id で progress 保存）
  const questIdParam = eventId;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Get language from URL params (default: ja)
  const selectedLanguage = searchParams.get('lang') || 'ja';

  // Fetch translated content based on selected language
  const {
    quest: translatedQuest,
    spots: translatedSpots,
    puzzles: translatedPuzzles,
    story: translatedStory,
    isLoading: translationLoading,
  } = useTranslatedQuest(questIdParam || null, selectedLanguage);

  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [gpsRequesting, setGpsRequesting] = useState(false);
  const [gpsPromptError, setGpsPromptError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "locationUnavailable" | "tooFar" | "nearTarget"
  >("locationUnavailable");
  const [puzzleLoading, setPuzzleLoading] = useState(false);
  const [puzzleQuestion, setPuzzleQuestion] = useState<string | null>(null);
  const [puzzleAnswer, setPuzzleAnswer] = useState<string | null>(null);
  const [puzzleInput, setPuzzleInput] = useState("");
  const [puzzleError, setPuzzleError] = useState<string | null>(null);
  const [puzzleState, setPuzzleState] = useState<
    "idle" | "incorrect" | "correct" | "revealedAnswer"
  >("idle");
  const [attemptCount, setAttemptCount] = useState(0);
  const [usedHintCount, setUsedHintCount] = useState(0);
  const [puzzleHints, setPuzzleHints] = useState<string[]>([]);
  const [revealedHintLevel, setRevealedHintLevel] = useState(0);
  const [showAnswerHelp, setShowAnswerHelp] = useState(false);
  const [lastDurationSec, setLastDurationSec] = useState<number | null>(null);
  const [gameMode, setGameMode] = useState<"travel" | "story" | "puzzle">("travel");

  const [storyMessages, setStoryMessages] = useState<ChatMessage[]>([]);
  const [storyVisibleCount, setStoryVisibleCount] = useState(1);
  const [storyStage, setStoryStage] = useState<"pre" | "post" | null>(null);
  type StoryLogEntry = {
    id: string;
    spotId?: string | null;
    spotName?: string | null;
    stage: "prologue" | "pre" | "post";
    messages: ChatMessage[];
  };
  const [storyLog, setStoryLog] = useState<StoryLogEntry[]>([]);
  const [showStoryLog, setShowStoryLog] = useState(false);
  const [lastStoryMessages, setLastStoryMessages] = useState<ChatMessage[]>([]);
  const sessionStartRef = useRef<number | null>(null);
  const isDev = import.meta.env.DEV;
  const [progressId, setProgressId] = useState<string | null>(null);
  const [progressStatus, setProgressStatus] = useState<
    "not_started" | "in_progress" | "completed"
  >("not_started");
  const [showCompletion, setShowCompletion] = useState(false);
  const [prologueText, setPrologueText] = useState<string | null>(null);
  const [epilogueText, setEpilogueText] = useState<string | null>(null);
  const [showPrologueOverlay, setShowPrologueOverlay] = useState(false);
  const [showEpilogueOverlay, setShowEpilogueOverlay] = useState(false);
  const [prologueMessages, setPrologueMessages] = useState<ChatMessage[]>([]);
  const [prologueVisibleCount, setPrologueVisibleCount] = useState(1);
  const [epilogueMessages, setEpilogueMessages] = useState<ChatMessage[]>([]);
  const [epilogueVisibleCount, setEpilogueVisibleCount] = useState(1);
  const [reviewRating, setReviewRating] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [progressColumn] = useState<"quest_id">("quest_id");
  const [spotStoryMap, setSpotStoryMap] = useState<
    Record<string, { pre: ChatMessage[]; post: ChatMessage[] }>
  >({});
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const sheetDragRef = useRef<{ startY: number; startCollapsed: boolean; startExpanded: boolean } | null>(null);
  const [showLanguageSwitcher, setShowLanguageSwitcher] = useState(false);
  const [switchingToLanguage, setSwitchingToLanguage] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Score mode gamification (session-based, selected at game start)
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [scoreModeEnabled, setScoreModeEnabled] = useState(false);
  const [scoreModeDecided, setScoreModeDecided] = useState(false); // Has user made choice this session?
  const [spotStartTime, setSpotStartTime] = useState<number>(Date.now());
  const [spotScores, setSpotScores] = useState<{ spotId: string, score: number, stars: number }[]>([]);
  const [currentSpotScore, setCurrentSpotScore] = useState<{ score: number, stars: number } | null>(null);

  const storyScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (gameMode === "story" && storyScrollRef.current) {
      storyScrollRef.current.scrollTop = storyScrollRef.current.scrollHeight;
    }
  }, [storyVisibleCount, gameMode]);

  // Pre-Start state: game hasn't begun yet (at first spot, not arrived)
  const [hasArrivedAtFirstSpot, setHasArrivedAtFirstSpot] = useState(false);

  const currentSpot = useMemo(() => {
    if (!session) return null;
    return session.spots[session.progressStep - 1] || null;
  }, [session]);

  const isLastSpot = useMemo(() => {
    if (!session) return false;
    return session.progressStep >= session.spots.length;
  }, [session]);

  // Pre-Start detection: at first spot, game not started yet
  const isPreStart = useMemo(() => {
    return session?.progressStep === 1 && !hasArrivedAtFirstSpot && gameMode === 'travel';
  }, [session?.progressStep, hasArrivedAtFirstSpot, gameMode]);

  // Analytics hook for event tracking (after currentSpot is defined)
  const { track } = useAnalytics({
    questId: questIdParam || '',
    spotId: currentSpot?.id || null,
    spotIndex: session?.progressStep || 0,
  });

  useEffect(() => {
    if (session?.isCompleted) {
      setShowCompletion(true);
    }
  }, [session?.isCompleted]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!questIdParam) {
      setError("クエストIDが指定されていません");
      setLoading(false);
      return;
    }
    loadSession(questIdParam, user.id);
  }, [authLoading, user, questIdParam]);

  const loadSession = async (questId: string, userId: string) => {
    try {
      setLoading(true);
      setError(null);
      setShowCompletion(false);
      setShowEpilogueOverlay(false);
      setGameMode("travel");

      const [
        { data: questData },
        { data: purchaseData, error: purchaseErr },
        { data: progressData },
        { data: storyData },
      ] =
        await Promise.all([
          supabase
            .from("quests")
            .select("id, title, area_name, description, status, creator_id")
            .eq("id", questId)
            .maybeSingle(),
          supabase.from("purchases").select("id, quest_id").eq("user_id", userId),
          supabase
            .from("user_progress")
            .select("id, current_step, status")
            .eq("user_id", userId)
            .eq("quest_id", questId)
            .maybeSingle(),
          supabase
            .from("story_timelines")
            .select("prologue, epilogue")
            .eq("quest_id", questId)
            .maybeSingle(),
        ]);

      if (!questData) {
        throw new Error("クエスト情報の取得に失敗しました");
      }

      const isOwner = questData.creator_id === userId;

      if (questData.status && questData.status !== "published" && !isOwner) {
        setError("このクエストは公開されていません");
        setLoading(false);
        return;
      }

      const ownsQuest = (purchaseData || []).some((p: any) => p.quest_id === questId);
      if (!ownsQuest && !isOwner) {
        setError("このクエストは未購入です。/cases から購入してください。");
        setLoading(false);
        return;
      }

      const [{ data: spotsData, error: spotsErr }] = await Promise.all([
        supabase
          .from("spots")
          .select("*")
          .eq("quest_id", questId)
          .order("order_index", { ascending: true }),
      ]);

      if (spotsErr) {
        throw new Error(spotsErr.message || "スポットの取得に失敗しました");
      }

      const spotIds = spotsData?.map((s: any) => s.id) || [];
      let spotDetailsMap = new Map<string, { story_text?: string | null; nav_text?: string | null; question_text?: string | null; puzzle_question?: string | null }>();
      if (spotIds.length > 0) {
        const { data: spotDetailsData, error: spotDetailsErr } = await supabase
          .from("spot_details")
          .select("spot_id, story_text, nav_text, question_text, puzzle_question")
          .in("spot_id", spotIds);
        if (spotDetailsErr) {
          console.warn("spot_details fetch error", spotDetailsErr);
        } else {
          spotDetailsMap = new Map(
            (spotDetailsData || []).map((detail: any) => [
              detail.spot_id,
              {
                story_text: detail.story_text,
                nav_text: detail.nav_text,
                question_text: detail.question_text,
                puzzle_question: detail.puzzle_question,
              },
            ])
          );
        }
      }

      const spots: GameSpot[] =
        spotsData?.map((s: any) => ({
          id: s.id,
          orderIndex: s.order_index ?? 0,
          name: s.name || "スポット",
          description:
            spotDetailsMap.get(s.id)?.story_text ||
            spotDetailsMap.get(s.id)?.nav_text ||
            spotDetailsMap.get(s.id)?.question_text ||
            spotDetailsMap.get(s.id)?.puzzle_question ||
            null,
          lat: s.lat ?? null,
          lng: s.lng ?? null,
        })) || [];
      // spot_story_messages を一括取得してキャッシュ
      if (spots.length) {
        const spotIds = spots.map((s) => s.id);
        const { data: storyMsgs, error: storyErr } = await supabase
          .from("spot_story_messages")
          .select("spot_id, stage, order_index, speaker_type, speaker_name, avatar_url, text")
          .in("spot_id", spotIds)
          .order("stage", { ascending: true })
          .order("order_index", { ascending: true });
        if (storyErr) {
          console.warn("spot_story_messages fetch error", storyErr);
        } else {
          const grouped: Record<string, { pre: ChatMessage[]; post: ChatMessage[] }> = {};
          storyMsgs?.forEach((m: any, idx: number) => {
            const sid = m.spot_id;
            if (!grouped[sid]) grouped[sid] = { pre: [], post: [] };
            const msg: ChatMessage = {
              id: m.id || `spotmsg-${idx}`,
              speakerType: (m.speaker_type as any) || "narrator",
              name: m.speaker_name,
              avatarUrl: m.avatar_url,
              text: m.text || "",
              alignment:
                m.speaker_type === "character"
                  ? "left"
                  : m.speaker_type === "system"
                    ? "center"
                    : "left",
            };
            if ((m.stage || "").toLowerCase() === "pre_puzzle") {
              grouped[sid].pre.push(msg);
            } else if ((m.stage || "").toLowerCase() === "post_puzzle") {
              grouped[sid].post.push(msg);
            }
          });
          setSpotStoryMap(grouped);
        }
      }

      // Sanitize epilogue text to remove puzzle logic/debug info
      const sanitizeEpilogue = (text: string | null): string | null => {
        if (!text) return null;
        // Split by common headers that indicate the start of puzzle explanation/logic
        const patterns = [
          "キーワードを以下のように変換します",
          "謎の解説",
          "【解説】",
          "謎解き解説",
          "合計すると",
          "アルファベットの順番に",
          "**解説**"
        ];

        let cleanText = text;
        for (const pattern of patterns) {
          const index = cleanText.indexOf(pattern);
          if (index !== -1) {
            cleanText = cleanText.substring(0, index).trim();
          }
        }
        return cleanText;
      };

      const prologue = storyData?.prologue || null;
      const rawEpilogue = storyData?.epilogue || null;
      const epilogue = sanitizeEpilogue(rawEpilogue);

      setPrologueText(prologue);
      setEpilogueText(epilogue);
      const resolvedPrologue: ChatMessage[] = prologue
        ? [
          {
            id: "prologue-1",
            speakerType: "narrator",
            name: "物語のあらすじ",
            text: prologue,
            alignment: "left",
          },
        ]
        : [
          {
            id: "prologue-1",
            speakerType: "narrator",
            name: "物語のあらすじ",
            text: "物語を開始します。準備ができたら進めてください。",
            alignment: "left",
          },
        ];
      const resolvedEpilogue: ChatMessage[] = epilogue
        ? [
          {
            id: "epilogue-1",
            speakerType: "narrator",
            name: "物語の結末",
            text: epilogue,
            alignment: "left",
          },
        ]
        : [
          {
            id: "epilogue-1",
            speakerType: "narrator",
            name: "物語の結末",
            text: "エピローグは未設定です。冒険お疲れさまでした。",
            alignment: "left",
          },
        ];

      setPrologueMessages(resolvedPrologue);
      setEpilogueMessages(resolvedEpilogue);
      setPrologueVisibleCount(1);
      setEpilogueVisibleCount(1);
      setStoryLog([
        {
          id: "log-prologue",
          spotId: null,
          spotName: "プロローグ",
          stage: "prologue",
          messages: resolvedPrologue,
        },
      ]);

      let sortedSpots = [...spots].sort((a, b) => a.orderIndex - b.orderIndex);
      if (!sortedSpots.length) {
        throw new Error("スポット情報が不足しているためプレイできません");
      }
      let initialStep = progressData?.current_step ? Math.max(1, progressData.current_step) : 1;
      let normalizedStep = Math.min(initialStep, sortedSpots.length);
      let progressRowId = progressData?.id || null;
      let pgStatus: "not_started" | "in_progress" | "completed" =
        (progressData?.status as any) || "not_started";

      // 初回プレイなら progress を作成
      if (!progressData && user) {
        const { data: inserted, error: insertErr } = await supabase
          .from("user_progress")
          .insert({
            user_id: user.id,
            quest_id: questId,
            current_step: normalizedStep,
            status: "in_progress",
          })
          .select("id, status, current_step")
          .maybeSingle();
        if (!insertErr && inserted?.id) {
          progressRowId = inserted.id;
          pgStatus = (inserted.status as any) || "in_progress";
          initialStep = inserted.current_step || 1;
          normalizedStep = Math.min(Math.max(1, initialStep), sortedSpots.length);
        }
      }

      setProgressId(progressRowId);
      setProgressStatus(pgStatus);

      setSession({
        eventId: questId, // events テーブルが無いので questId をそのまま eventId として扱う
        questId: questId,
        title: questData.title || "タイトル未設定",
        areaName: questData.area_name,
        description: questData.description,
        spots: sortedSpots,
        progressStep: normalizedStep,
        isCompleted: pgStatus === "completed",
      });
      // プロローグ表示判定：スポット1到着時に行うためここでは非表示
      setShowPrologueOverlay(false);
      // セッション開始時刻をセット（再開時も新規計測とする）
      sessionStartRef.current = Date.now();

      // Show mode selection for new sessions (step 1) or if not yet decided
      if (normalizedStep === 1 && !scoreModeDecided) {
        setShowModeSelection(true);
      }

      setLastDurationSec(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "プレイデータの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (!session || advancing) return;
    if (session.isCompleted) return;
    const lastIndex = session.spots.length;
    const nextStep = session.progressStep + 1;
    const isLast = nextStep > lastIndex;
    try {
      setAdvancing(true);
      if (isLast) {
        setSession({ ...session, progressStep: Math.min(nextStep, lastIndex), isCompleted: true });
        await upsertProgress(lastIndex, "completed");
        setShowCompletion(false);
        setEpilogueVisibleCount(1);
        setShowEpilogueOverlay(true);
      } else {
        setSession({ ...session, progressStep: nextStep });
        await upsertProgress(nextStep, "in_progress");
      }
    } catch (err: any) {
      toast({
        title: "進行更新に失敗しました",
        description: err.message || "しばらくしてから再度お試しください",
        variant: "destructive",
      });
    } finally {
      setAdvancing(false);
    }
  };

  const handleComplete = async () => {
    if (!session) return;
    const total = session.spots.length;
    setSession({ ...session, isCompleted: true, progressStep: Math.max(session.progressStep, total) });
    await upsertProgress(total, "completed");
    track('session_complete', { total_spots: total });
    // セッションサマリ保存
    const endedAt = Date.now();
    if (sessionStartRef.current && user) {
      const durationSec = Math.max(0, Math.floor((endedAt - sessionStartRef.current) / 1000));
      setLastDurationSec(durationSec);
      // best-effort: play_sessions テーブルがある場合に保存する。無ければログだけ。
      try {
        await supabase.from("play_sessions").insert({
          user_id: user.id,
          quest_id: session.questId,
          started_at: new Date(sessionStartRef.current).toISOString(),
          ended_at: new Date(endedAt).toISOString(),
          duration_sec: durationSec,
          solved_spots: total,
        });
      } catch (e) {
        console.warn("play session insert failed (play_sessions 未作成の可能性)", e);
      }
    }
    setShowCompletion(false);
    setEpilogueVisibleCount(1);
    setShowEpilogueOverlay(true);
    // 自分のレビューを事前に取得
    if (user) {
      try {
        const { data } = await supabase
          .from("quest_reviews")
          .select("rating,comment")
          .eq("user_id", user.id)
          .eq("quest_id", session.questId)
          .maybeSingle();
        if (data) {
          setReviewRating(data.rating ?? null);
          setReviewComment(data.comment ?? "");
          setReviewSubmitted(true);
        } else {
          setReviewRating(null);
          setReviewComment("");
          setReviewSubmitted(false);
        }
      } catch (e) {
        console.warn("fetch review failed (quest_reviews 無い可能性)", e);
      }
    }
  };

  const startPuzzle = async () => {
    if (!session || !currentSpot) return;
    setGameMode("puzzle");
    track('mode_puzzle', { spot_index: session.progressStep });
    // 謎データ取得
    setPuzzleLoading(true);
    setPuzzleError(null);
    setPuzzleQuestion(null);
    setPuzzleAnswer(null);
    setPuzzleInput("");
    setPuzzleState("idle");
    setAttemptCount(0);
    setPuzzleHints([]);
    setRevealedHintLevel(0);
    setShowAnswerHelp(false);
    try {
      const { data, error } = await supabase
        .from("spot_details")
        .select("question_text, answer_text, hint_text")
        .eq("spot_id", currentSpot.id)
        .maybeSingle();
      if (error) {
        console.warn("puzzle fetch error", error);
      }
      const hasPuzzle = data && (data.question_text || data.answer_text);
      if (!hasPuzzle) {
        setPuzzleQuestion("このスポットには謎が設定されていません。");
        setPuzzleAnswer(null);
        return;
      }
      setPuzzleQuestion(data?.question_text || null);
      setPuzzleAnswer(data?.answer_text || null);

      // Parse hints (format: "Hint1 || Hint2 || Hint3")
      const hints = data?.hint_text
        ? data.hint_text.split('||').map((h: string) => h.trim()).filter(Boolean)
        : [];
      setPuzzleHints(hints);

    } finally {
      setPuzzleLoading(false);
    }
  };

  // 実際のスポット到着処理（ストーリー/謎解き開始）
  const executeSpotArrival = async () => {
    if (!session || !currentSpot) return;
    // ストーリー(到着後)があれば先にチャット表示
    const msgs = await fetchStoryMessages(currentSpot.id, "pre_puzzle");
    const useMsgs = msgs.length > 0 ? msgs : defaultStoryMessage("pre");
    setStoryMessages(useMsgs);
    setLastStoryMessages(useMsgs);
    setStoryVisibleCount(1);
    setStoryStage("pre");
    setGameMode("story");
    track('mode_story', { spot_index: session.progressStep, stage: 'pre' });
    // ログに追加（表示開始時点で登録）
    setStoryLog((prev) => [
      ...prev,
      {
        id: `log-${currentSpot.id}-pre-${Date.now()}`,
        spotId: currentSpot.id,
        spotName: currentSpot.name,
        stage: "pre",
        messages: useMsgs,
      },
    ]);
  };

  const handleArrive = async () => {
    if (!session || !currentSpot) return;

    // スポット1の場合は先にプロローグを表示（"任務を開始する"で実処理へ）
    if (session.progressStep === 1) {
      setHasArrivedAtFirstSpot(true);
      setPrologueVisibleCount(1);
      setSpotStartTime(Date.now());
      track('mode_story', { spot_index: 1, from_pre_start: true });
      setShowPrologueOverlay(true);
      return;
    }

    await executeSpotArrival();
  };

  const normalizeAnswer = (value: string) => {
    let s = value.toString().trim().toLowerCase();
    // Remove all whitespace (including full-width)
    s = s.replace(/[\s　]+/g, "");
    // Normalize full-width to half-width
    s = s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    );
    // Remove punctuation
    s = s.replace(/[。、．，！？!?,\.・ー−\-]/g, "");
    // NFKC normalization for kana variants
    s = s.normalize('NFKC');
    return s;
  };

  // Convert katakana to hiragana for fuzzy matching
  const toHiragana = (s: string) =>
    s.replace(/[\u30A1-\u30F6]/g, (m) =>
      String.fromCharCode(m.charCodeAt(0) - 0x60)
    );

  // Check if answer is correct with fuzzy matching
  const checkAnswer = (userInput: string, correctAnswer: string): boolean => {
    const userNorm = normalizeAnswer(userInput);
    const correctNorm = normalizeAnswer(correctAnswer);
    // Exact match
    if (userNorm === correctNorm) return true;
    // Hiragana/katakana match
    if (toHiragana(userNorm) === toHiragana(correctNorm)) return true;
    return false;
  };

  const fetchStoryMessages = async (
    spotId: string,
    stage: "pre_puzzle" | "post_puzzle"
  ): Promise<ChatMessage[]> => {
    // 先にキャッシュを確認
    const cached = spotStoryMap[spotId];
    if (cached) {
      return stage === "pre_puzzle" ? cached.pre : cached.post;
    }
    try {
      const { data, error } = await supabase
        .from("spot_story_messages")
        .select(
          "id, stage, order_index, speaker_type, speaker_name, avatar_url, text"
        )
        .eq("spot_id", spotId)
        .eq("stage", stage)
        .order("order_index", { ascending: true });
      if (error) {
        console.warn("story fetch error", error);
        return [];
      }
      return (
        data?.map((m: any) => ({
          id: m.id,
          speakerType: (m.speaker_type as any) || "narrator",
          name: m.speaker_name,
          avatarUrl: m.avatar_url,
          text: m.text || "",
          alignment:
            m.speaker_type === "character"
              ? "left"
              : m.speaker_type === "system"
                ? "center"
                : "left",
        })) || []
      );
    } catch (e) {
      console.warn("story fetch failed", e);
      return [];
    }
  };

  const defaultStoryMessage = (stage: "pre" | "post"): ChatMessage[] => [
    {
      id: `story-${stage}-placeholder`,
      speakerType: "narrator",
      name: stage === "pre" ? "到着時の物語" : "クリア後の物語",
      text:
        stage === "pre"
          ? "このスポットの物語はまだ設定されていません。準備ができたら謎に進みましょう。"
          : "クリア後の物語は未設定です。次のスポットへ進みましょう。",
      alignment: "left",
    },
  ];

  const upsertProgress = async (step: number, status: "in_progress" | "completed") => {
    if (!user || !session) return;
    try {
      // onConflict で user_id, quest_id をキーに upsert し、確実に保存
      const { data, error } = await supabase
        .from("user_progress")
        .upsert(
          {
            id: progressId || undefined,
            user_id: user.id,
            quest_id: session.questId,
            current_step: step,
            status,
          },
          { onConflict: "user_id,quest_id" }
        )
        .select("id, status")
        .maybeSingle();
      if (error) throw error;
      if (data?.id) setProgressId(data.id);
      if (data?.status) setProgressStatus(data.status as any);
      else setProgressStatus(status);
    } catch (err) {
      console.warn("progress update failed", err);
      toast({
        title: "進行保存に失敗しました",
        description: "通信状況をご確認ください",
        variant: "destructive",
      });
    }
  };

  const showPostStory = async () => {
    if (!currentSpot) return;
    const postMsgs = await fetchStoryMessages(currentSpot.id, "post_puzzle");
    const useMsgs = postMsgs.length > 0 ? postMsgs : defaultStoryMessage("post");
    setStoryMessages(useMsgs);
    setLastStoryMessages(useMsgs);
    setStoryVisibleCount(1);
    setStoryStage("post");
    setGameMode("story");
    setStoryLog((prev) => [
      ...prev,
      {
        id: `log-${currentSpot.id}-post-${Date.now()}`,
        spotId: currentSpot.id,
        spotName: currentSpot.name,
        stage: "post",
        messages: useMsgs,
      },
    ]);
  };

  const proceedAfterPuzzle = async () => {
    // Record score if score mode enabled
    if (scoreModeEnabled && currentSpot) {
      const scoreResult = calculateSpotScore();
      setCurrentSpotScore(scoreResult);
      setSpotScores(prev => [...prev, { spotId: currentSpot.id, score: scoreResult.score, stars: scoreResult.stars }]);
      track('spot_score', {
        score: scoreResult.score,
        stars: scoreResult.stars,
        hints_used: revealedHintLevel,
        errors: attemptCount,
        time_sec: Math.floor((Date.now() - spotStartTime) / 1000)
      });
    }

    setPuzzleError(null);
    setPuzzleInput("");
    setPuzzleState("idle");
    await showPostStory();
  };

  const handleSubmitAnswer = async () => {
    if (!session || !currentSpot) return;
    // 正解後は「次へ進む」扱い
    if (puzzleState === "correct" || puzzleState === "revealedAnswer") {
      await proceedAfterPuzzle();
      return;
    }
    if (!puzzleAnswer) { // Simplified check as puzzleHasData is removed
      await proceedAfterPuzzle();
      return;
    }
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);
    const isCorrect = checkAnswer(puzzleInput, puzzleAnswer);

    // Track puzzle submission
    track('puzzle_submit', { correct: isCorrect, attempt_count: newAttemptCount });

    if (isCorrect) {
      setPuzzleError(null);
      setPuzzleState("correct");
      setShowAnswerHelp(false);
      // Auto-advance to epilogue after brief delay
      setTimeout(() => {
        proceedAfterPuzzle();
      }, 1500);
    } else {
      setPuzzleState("incorrect");
      // Failed attempt guidance
      if (newAttemptCount >= 5) {
        setShowAnswerHelp(true);
        setPuzzleError("答えが違うようです。入力形式を確認してみましょう。");
      } else if (newAttemptCount >= 3 && puzzleHints.length > revealedHintLevel) {
        setPuzzleError("ヒントを見てみましょう！💡");
      } else {
        setPuzzleError("少し違うようです。もう一度考えてみよう。");
      }
    }
  };

  // Reveal next hint with analytics
  const revealNextHint = () => {
    const newLevel = revealedHintLevel + 1;
    setRevealedHintLevel(newLevel);
    setUsedHintCount(prevCount => prevCount + 1);
    track('puzzle_hint', { hint_level: newLevel, attempt_count: attemptCount });
  };

  // Select game mode at session start
  const selectGameMode = (scoreMode: boolean) => {
    setScoreModeEnabled(scoreMode);
    setScoreModeDecided(true);
    setShowModeSelection(false);
    setSpotStartTime(Date.now()); // Reset timer for first spot
    track('score_mode_toggle', { enabled: scoreMode, at_start: true });
  };

  // Disable score mode mid-game (opt-out only)
  const disableScoreMode = () => {
    setScoreModeEnabled(false);
    setSpotScores([]); // Clear collected scores
    setCurrentSpotScore(null);
    track('score_mode_toggle', { enabled: false, at_start: false });
  };

  // Calculate spot score based on time, hints, and errors
  const calculateSpotScore = (): { score: number; stars: number } => {
    const baseScore = 1000;
    const timeElapsed = (Date.now() - spotStartTime) / 1000; // seconds
    // Time penalty: -50 per minute over 3 minutes, max -300
    const timePenalty = Math.min(300, Math.max(0, Math.floor((timeElapsed - 180) / 60) * 50));
    // Hint penalty: -100 per hint
    const hintPenalty = revealedHintLevel * 100;
    // Error penalty: -30 per wrong answer
    const errorPenalty = attemptCount * 30;

    const score = Math.max(300, baseScore - timePenalty - hintPenalty - errorPenalty);
    const stars = score >= 900 ? 3 : score >= 600 ? 2 : 1;

    return { score, stars };
  };

  const haversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Google Maps uses component-based approach, so we just set mapReady
  useEffect(() => {
    // For Google Maps API, we set mapReady immediately as the Map component handles loading
    setMapReady(true);
  }, []);

  const hasCoords = currentSpot?.lat != null && currentSpot?.lng != null;
  const NEAR_THRESHOLD = 120; // meters

  // 位置情報監視
  useEffect(() => {
    if (!gpsEnabled) {
      setDistance(null);
      setLocationStatus("locationUnavailable");
      return;
    }
    if (!currentSpot || currentSpot.lat == null || currentSpot.lng == null) {
      setDistance(null);
      setLocationStatus("locationUnavailable");
      return;
    }
    if (!navigator.geolocation) {
      setLocationStatus("locationUnavailable");
      setDistance(null);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const d = haversineDistance(
          pos.coords.latitude,
          pos.coords.longitude,
          currentSpot.lat!,
          currentSpot.lng!
        );
        setDistance(d);
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (d <= NEAR_THRESHOLD) {
          setLocationStatus("nearTarget");
        } else {
          setLocationStatus("tooFar");
        }
      },
      (err) => {
        console.warn("geo error", err);
        setLocationStatus("locationUnavailable");
        setDistance(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpot?.id, gpsEnabled]);

  const isNear = locationStatus === "nearTarget";

  // Calculate ETA for walking (5 km/h average)
  const etaMinutes = distance != null ? Math.ceil((distance / 1000) / 5 * 60) : null;

  // Distance formatting helper
  const formatDistance = (d: number | null) => {
    if (d == null) return '—';
    return d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`;
  };

  // Open external navigation app
  const openNavigation = (spotOverride?: { lat: number | null; lng: number | null } | null) => {
    const targetSpot = spotOverride ?? currentSpot;
    if (!targetSpot?.lat || !targetSpot?.lng) return;
    const dest = `${targetSpot.lat},${targetSpot.lng}`;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // Track navigation open event
    track('nav_open', { spot_index: session?.progressStep || 0 });

    if (isIOS) {
      // Apple Maps
      window.open(`maps://maps.apple.com/?daddr=${dest}&dirflg=w`, '_blank');
    } else {
      // Google Maps
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`, '_blank');
    }
  };

  const requestGpsPermission = () => {
    if (!window.isSecureContext) {
      setGpsPromptError("位置情報はHTTPSまたはlocalhostでのみ利用できます。");
      return;
    }
    if (!navigator.geolocation) {
      setGpsPromptError("この端末では位置情報を利用できません。");
      return;
    }
    setGpsPromptError(null);
    setGpsRequesting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsEnabled(true);
        setGpsPromptError(null);
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsRequesting(false);
      },
      (err) => {
        console.warn("geo permission error", err);
        setGpsPromptError("位置情報の許可が必要です。");
        setGpsRequesting(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  // Return to map/travel mode
  const returnToMap = () => {
    track('mode_travel', { from: gameMode });
    setGameMode('travel');
  };

  // Get mode label for status display
  const getModeLabel = () => {
    if (gameMode === 'travel') return { icon: '🚶', label: '移動中' };
    if (gameMode === 'story') {
      return storyStage === 'post'
        ? { icon: '📖', label: 'エピソード' }
        : { icon: '📖', label: '会話中' };
    }
    if (gameMode === 'puzzle') return { icon: '🧩', label: '謎解き中' };
    return { icon: '🎯', label: '' };
  };

  // Mode Status Bar component - shows progress, mode, and map access
  const renderModeStatusBar = () => {
    const mode = getModeLabel();
    return (
      <div className="flex items-center justify-between mb-2 px-1">
        {/* Map button */}
        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F7E7D3] border border-[#E8D5BE] text-[#D87A32] hover:bg-[#E8D5BE] transition-colors text-xs font-medium"
          onClick={returnToMap}
        >
          <MapPin className="w-3.5 h-3.5" />
          地図
        </button>

        {/* Progress */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#D87A32]/10 border border-[#D87A32]/30">
          <span className="text-xs font-bold text-[#D87A32]">
            {session?.progressStep || 1}/{session?.spots.length || 1}
          </span>
        </div>

        {/* Mode label */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F7E7D3] border border-[#E8D5BE] text-xs font-medium text-[#7A6652]">
          <span>{mode.icon}</span>
          <span>{mode.label}</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-sm text-[#7c644c]">
        <Loader2 className="w-6 h-6 animate-spin text-[#c35f1f]" />
        <p>プレイデータを読み込んでいます...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sm text-[#7c644c] space-y-3 px-4">
        <p>{error || "プレイデータが見つかりませんでした"}</p>
        <Button variant="outline" onClick={() => navigate("/profile")}>
          クエスト一覧へ戻る
        </Button>
      </div>
    );
  }

  const handleReplay = async () => {
    if (!session || !user) return;
    const { error } = await supabase
      .from("user_progress")
      .upsert(
        {
          user_id: user.id,
          quest_id: session.questId,
          current_step: 1,
          status: "in_progress",
        },
        { onConflict: "user_id,quest_id" }
      )
      .select("id, status, current_step")
      .maybeSingle();

    if (error) {
      console.warn("replay upsert failed", error);
      toast({
        title: "再プレイの準備に失敗しました",
        description: "通信状況をご確認ください",
        variant: "destructive",
      });
      return;
    }

    // ローカル状態を初期化して最初から開始
    setSession({ ...session, isCompleted: false, progressStep: 1 });
    setProgressStatus("in_progress");
    setShowCompletion(false);
    setShowEpilogueOverlay(false);
    setShowPrologueOverlay(false); // 再プレイ時も最初は非表示（スポット1到着で表示）
    setPrologueVisibleCount(1);
    setGameMode("travel");

    // Show mode selection for new sessions
    setScoreModeDecided(false);
    setScoreModeEnabled(false);
    setSpotScores([]);
    setShowModeSelection(true);

    setLastDurationSec(null);
    sessionStartRef.current = Date.now();
  };

  const renderCompletedOverlay = () => {
    if (!showCompletion || showEpilogueOverlay || !session) return null;
    const durationText =
      lastDurationSec != null
        ? `${Math.floor(lastDurationSec / 60)}分${(lastDurationSec % 60)
          .toString()
          .padStart(2, "0")}秒`
        : null;

    return (
      <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-all duration-500">
        {/* Semi-transparent Light Paper Background with Blur to show Map */}
        <div className="absolute inset-0 bg-[#FEF9F3]/90 backdrop-blur-md z-0" />

        {/* Vignette for cinematic focus - Sepia Tone */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_20%,_#E8D5BE_120%)] z-0 pointer-events-none opacity-60" />

        <div className="relative z-10 w-full h-full max-w-xl px-6 py-8 flex flex-col items-center overflow-y-auto">

          {/* Header Section */}
          <div
            className="flex flex-col items-center gap-6 mt-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both"
            style={{ animationDelay: '200ms' }}
          >
            {/* Title with decorative lines to match Prologue style */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="h-px w-8 md:w-12 bg-[#7A6652]/40" />
              <div className="flex items-center gap-3">
                <Star className="w-6 h-6 text-[#D87A32] animate-pulse" fill="currentColor" />
                <div
                  className="text-xl md:text-2xl font-medium text-center font-serif text-[#3D2E1F] tracking-[0.2em] whitespace-nowrap"
                  style={{ textShadow: '0 0 1px rgba(61, 46, 31, 0.1)' }}
                >
                  Quest Clear
                </div>
              </div>
              <div className="h-px w-8 md:w-12 bg-[#7A6652]/40" />
            </div>

            <div className="text-sm font-serif text-[#7A6652] tracking-widest text-center">
              全スポットをクリアしました！
            </div>

            <h2 className="text-xl font-bold font-serif text-[#3D2E1F] leading-tight text-center tracking-wide px-4">
              {session.title}
            </h2>
          </div>

          {/* Stats Section */}
          <div
            className="grid grid-cols-2 gap-4 w-full mt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both"
            style={{ animationDelay: '500ms' }}
          >
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#FEF9F3] border border-[#7A6652]/20 shadow-sm">
              <div className="text-[10px] text-[#7A6652] uppercase tracking-[0.2em] mb-2 font-serif">Play Time</div>
              <div className="text-xl font-medium font-serif text-[#3D2E1F] tracking-widest">
                {durationText ?? "—"}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#FEF9F3] border border-[#7A6652]/20 shadow-sm">
              <div className="text-[10px] text-[#7A6652] uppercase tracking-[0.2em] mb-2 font-serif">Total Spots</div>
              <div className="text-xl font-medium font-serif text-[#3D2E1F] tracking-widest">
                {session.spots.length} / {session.spots.length}
              </div>
            </div>
          </div>

          {/* Review Section */}
          <div
            className="w-full mt-8 p-6 rounded-2xl bg-[#FEF9F3] border border-[#7A6652]/20 shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both"
            style={{ animationDelay: '800ms' }}
          >
            <div className="text-sm font-medium font-serif text-[#3D2E1F] text-center tracking-widest mb-4">
              クエストの評価
            </div>
            <div className="flex items-center justify-center gap-3 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className={`text-3xl transition-transform hover:scale-110 active:scale-95 ${reviewRating && reviewRating >= star ? "text-[#D87A32]" : "text-[#E8D5BE]"}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full rounded-xl border border-[#7A6652]/30 bg-white/80 px-3 py-2 text-sm text-[#3D2E1F] placeholder:text-[#3D2E1F]/40 focus:outline-none focus:ring-2 focus:ring-[#D87A32]/30 focus:border-[#D87A32] font-serif"
              placeholder="感想をお聞かせください（任意）"
              rows={2}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-[#7A6652] font-serif">
                {reviewSubmitted ? "✓ 送信済み" : ""}
              </span>
              <Button
                size="sm"
                disabled={!reviewRating || reviewSubmitting || reviewSubmitted}
                className="bg-gradient-to-r from-[#D87A32] to-[#B85A1F] hover:from-[#E88B43] hover:to-[#C96B30] text-white rounded-lg px-4 font-serif font-medium shadow-md"
                onClick={async () => {
                  if (!user || !session) return;
                  if (!reviewRating) return;
                  setReviewSubmitting(true);
                  try {
                    await supabase.from("quest_reviews").upsert({
                      user_id: user.id,
                      quest_id: session.questId,
                      rating: reviewRating,
                      comment: reviewComment || null,
                    });
                    setReviewSubmitted(true);
                  } catch (e) {
                    console.warn("review submit failed", e);
                    toast({ title: "送信に失敗しました", description: "通信状況をご確認ください", variant: "destructive" });
                  } finally {
                    setReviewSubmitting(false);
                  }
                }}
              >
                {reviewSubmitting ? "送信中..." : reviewSubmitted ? "送信済み" : "送信"}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full mt-8 grid gap-3 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both" style={{ animationDelay: '1000ms' }}>
            <Button
              className="w-full h-12 bg-gradient-to-r from-[#D87A32] to-[#B85A1F] hover:from-[#E88B43] hover:to-[#C96B30] text-white font-serif font-medium text-base rounded-full shadow-xl tracking-widest"
              onClick={() => {
                setShowCompletion(false);
                navigate("/");
              }}
            >
              ホームに戻る
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-10 border-[#7A6652]/30 bg-white/50 text-[#7A6652] hover:bg-[#FEF9F3] hover:text-[#5C4532] rounded-full font-serif font-medium tracking-wide"
                onClick={() => {
                  setShowCompletion(false);
                  navigate("/profile");
                }}
              >
                プロフィール
              </Button>
              <Button
                variant="outline"
                className="h-10 border-[#7A6652]/30 bg-white/50 text-[#7A6652] hover:bg-[#FEF9F3] hover:text-[#5C4532] rounded-full font-serif font-medium tracking-wide"
                onClick={handleReplay}
              >
                もう一度プレイ
              </Button>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const renderMapUI = () => {
    const mapCenter = currentSpot?.lat && currentSpot?.lng
      ? { lat: currentSpot.lat, lng: currentSpot.lng }
      : DEFAULT_CENTER;

    // Visited spots (already completed)
    const visitedSpots = session.spots
      .filter((_, idx) => idx < session.progressStep - 1)
      .filter((s) => s.lat != null && s.lng != null);

    // Next spot (upcoming target)
    const nextSpot = session.spots[session.progressStep] &&
      session.spots[session.progressStep].lat != null &&
      session.spots[session.progressStep].lng != null
      ? session.spots[session.progressStep]
      : null;

    // Current and next spot positions for bounds fitting
    const currentSpotPos = currentSpot?.lat != null && currentSpot?.lng != null
      ? { lat: currentSpot.lat, lng: currentSpot.lng }
      : null;
    const nextSpotPos = nextSpot
      ? { lat: nextSpot.lat!, lng: nextSpot.lng! }
      : null;
    const routeOrigin = currentSpotPos;
    const routeDestination = nextSpotPos;

    return (
      <div className="relative flex-1 h-full bg-[#F7E7D3]">
        <APIProvider apiKey={API_KEY} libraries={["routes"]}>
          <GoogleMap
            defaultCenter={mapCenter}
            defaultZoom={17}
            mapId="tomoshibi_mobile_game_map"
            gestureHandling="greedy"
            disableDefaultUI={true}
            colorScheme="LIGHT"
            className="absolute inset-0 w-full h-full min-h-[420px]"
          >
            {/* Route trail and bounds handler */}
            <RoutePathsHandler
              origin={routeOrigin}
              destination={routeDestination}
            />


            {/* Visited spots - clean numbered style */}
            {visitedSpots.map((spot, idx) => (
              <AdvancedMarker
                key={`visited-${spot.id}`}
                position={{ lat: spot.lat!, lng: spot.lng! }}
                className="z-10"
              >
                <div className="relative group">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#C9B8A3] to-[#A89888] rounded-full border-2 border-[#E8D5BE] shadow-md flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-[#7A6652]" />
                  </div>
                  {/* Tooltip */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 hidden group-hover:block pointer-events-none">
                    <div className="bg-[#3D2E1F] text-[#FEF9F3] text-[10px] font-bold px-2 py-1 rounded shadow-lg">
                      {spot.name}
                    </div>
                  </div>
                </div>
              </AdvancedMarker>
            ))}

            {/* Current spot marker - Circular Style with Progress */}
            {currentSpot?.lat != null && currentSpot?.lng != null && (
              <AdvancedMarker
                position={{ lat: currentSpot.lat, lng: currentSpot.lng }}
                className="z-30"
              >
                <div className="relative flex flex-col items-center justify-center">
                  {/* Pulsing Effect */}
                  <div className="absolute w-16 h-16 bg-[#D87A32]/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                  <div className="absolute w-12 h-12 bg-[#D87A32]/30 rounded-full animate-pulse" style={{ animationDuration: '2s' }} />

                  {/* Main Circular Marker */}
                  <div className="relative w-11 h-11 bg-gradient-to-br from-[#F4A853] via-[#D87A32] to-[#B85A1F] rounded-full border-2 border-[#FEF9F3] shadow-[0_4px_20px_rgba(216,122,50,0.5)] flex items-center justify-center">
                    <Target className="w-5 h-5 text-[#FEF9F3]" />
                  </div>

                  {/* Spot Name Label (Below) */}
                  <div className="absolute -bottom-9 flex flex-col items-center z-40 whitespace-nowrap">
                    <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[6px] border-b-white/95" />
                    <div className="bg-white/95 backdrop-blur-sm text-[#3D2E1F] text-xs font-bold px-2.5 py-1 rounded-lg border border-[#E8D5BE] shadow-md">
                      {currentSpot.name}
                    </div>
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {/* Next spot marker - simple locked style */}
            {nextSpot && (
              <AdvancedMarker
                position={{ lat: nextSpot.lat!, lng: nextSpot.lng! }}
                className="z-20"
              >
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#9B8A7A] to-[#7A6652] rounded-full border-2 border-[#E8D5BE] shadow-md flex items-center justify-center">
                    <Lock className="w-4 h-4 text-[#E8D5BE]" />
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {/* User location marker - warm style */}
            {userLocation && (
              <AdvancedMarker position={userLocation}>
                <div className="relative flex items-center justify-center">
                  {/* Direction indicator */}
                  <div className="absolute -top-1 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-[#2E5A5C]" />
                  {/* Accuracy ring */}
                  <div className="absolute w-12 h-12 bg-[#2E5A5C]/20 rounded-full animate-pulse" />
                  {/* Avatar */}
                  <div className="relative w-8 h-8 bg-gradient-to-br from-[#4A8A8C] to-[#2E5A5C] rounded-full border-2 border-[#FEF9F3] shadow-lg flex items-center justify-center">
                    <Navigation className="w-4 h-4 text-[#FEF9F3] transform rotate-45" />
                  </div>
                </div>
              </AdvancedMarker>
            )}
          </GoogleMap>
        </APIProvider>





        {/* Distance & Progress Indicator Overlay */}
        {/* Distance & Progress Indicator Overlay */}
        {distance != null && (
          <div className="absolute top-4 left-4 pointer-events-none z-10">
            <div className="flex flex-col bg-[#FEF9F3]/90 border border-[#E8D5BE] rounded-xl shadow-[0_4px_20px_rgba(61,46,31,0.1)] backdrop-blur-md pointer-events-auto px-5 py-3 min-w-[120px]">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D87A32] animate-pulse shadow-[0_0_8px_#D87A32]" />
                  <span className="text-[10px] font-bold font-serif text-[#7A6652] uppercase tracking-[0.2em]">
                    Next Spot
                  </span>
                </div>
                <span className="text-[10px] font-bold font-serif text-[#D87A32] bg-[#F7E7D3] px-2 py-0.5 rounded-full border border-[#D87A32]/20">
                  {session.progressStep} / {session.spots.length}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[#3D2E1F] text-2xl font-black font-serif tracking-tighter leading-none decoration-clone">
                  {distance < 1000 ? Math.round(distance) : (distance / 1000).toFixed(1)}
                </span>
                <span className="text-[#7A6652] text-xs font-bold font-serif ml-0.5">
                  {distance < 1000 ? 'm' : 'km'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Menu button only */}
        <div className="absolute top-3 right-3 pointer-events-none z-20">
          <button
            onClick={() => setMenuOpen(true)}
            className="w-11 h-11 rounded-full bg-[#FEF9F3]/90 border border-[#E8D5BE] flex items-center justify-center shadow-[0_4px_16px_rgba(61,46,31,0.1)] hover:bg-[#F7E7D3] transition-all duration-300 pointer-events-auto backdrop-blur-sm group"
          >
            <Menu className="w-5 h-5 text-[#3D2E1F] group-hover:scale-110 transition-transform" />
          </button>
        </div>



        {(!mapReady || loading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f4efe8]/95">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center animate-pulse">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium">マップを読み込み中...</span>
            </div>
          </div>
        )}

        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm text-rose-400 bg-rose-900/80 px-4 py-2 rounded-xl border border-rose-500/50 shadow-lg">
              {mapError}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEpilogueOverlay = () => {
    if (!showEpilogueOverlay || !session) return null;

    return (
      <div
        className="absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-all duration-500"
        onClick={() => {
          if (epilogueVisibleCount <= epilogueMessages.length) {
            setEpilogueVisibleCount(c => c + 1);
          }
        }}
      >
        {/* Semi-transparent Light Paper Background with Blur to show Map */}
        <div className="absolute inset-0 bg-[#FEF9F3]/85 backdrop-blur-sm z-0" />

        {/* Vignette for cinematic focus - Sepia Tone */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_20%,_#E8D5BE_120%)] z-0 pointer-events-none opacity-60" />

        <div className="relative z-10 w-full h-full max-w-xl px-8 py-10 flex flex-col items-center justify-between pointer-events-none">

          {/* Quest Title - Top Section */}
          <div
            className="flex flex-col items-center gap-2 mt-4 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both"
            style={{ animationDelay: '500ms' }}
          >
            <div className="text-xs font-serif tracking-[0.3em] text-[#7A6652] uppercase text-center opacity-90">
              {session.title}
            </div>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#7A6652]/50 to-transparent" />
          </div>

          {/* Main Content Area - Center Section */}
          <div
            className="flex-1 w-full min-h-0 my-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both flex flex-col"
            style={{ animationDelay: '1500ms' }}
          >
            <div className="flex-1 overflow-y-auto px-1 scrollbar-hide">
              {epilogueVisibleCount <= epilogueMessages.length ? (
                // Message Display Phase
                (() => {
                  const msg = epilogueMessages[epilogueVisibleCount - 1];
                  // Fallback for empty/single message case if array is weird, though usually covered
                  if (!msg && epilogueMessages.length === 0) {
                    return (
                      <div className="text-[#3D2E1F] font-serif text-lg text-center mt-10">
                        {epilogueText || "Epilogue"}
                      </div>
                    )
                  }
                  const isNarrator = msg?.speakerType === "narrator" || !msg?.speakerType;
                  return (
                    <div
                      key={msg?.id || epilogueVisibleCount}
                      className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in-95 duration-700 fill-mode-both min-h-full justify-center py-4"
                    >
                      {/* Speaker Name */}
                      {msg?.name && (
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="h-px w-8 bg-[#7A6652]/40" />
                          <div className="text-[#5C4532] text-sm font-bold tracking-widest uppercase py-0.5">
                            {msg.name}
                          </div>
                          <div className="h-px w-8 bg-[#7A6652]/40" />
                        </div>
                      )}

                      {/* Main Text - High Contrast */}
                      <div
                        className={`text-base md:text-lg leading-loose font-medium text-center font-serif tracking-wide whitespace-pre-wrap ${isNarrator ? "text-[#7A6652] italic" : "text-[#3D2E1F]"
                          }`}
                        style={{
                          textShadow: '0 0 1px rgba(61, 46, 31, 0.1)'
                        }}
                      >
                        {msg?.text?.replace(/([。！？]+)/g, "$1\n")}
                      </div>
                    </div>
                  );
                })()
              ) : (
                // Mission Clear Phase
                <div className="flex flex-col items-center justify-center min-h-full space-y-8 animate-in zoom-in-95 duration-700 pointer-events-auto py-4">
                  {/* Title with decorative lines */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="h-px w-8 md:w-12 bg-[#7A6652]/40" />
                    <div className="flex items-center gap-3">
                      <Star className="w-5 h-5 text-[#D87A32] animate-pulse" fill="currentColor" />
                      <div
                        className="text-lg md:text-xl font-medium text-center font-serif text-[#3D2E1F] tracking-[0.2em] whitespace-nowrap"
                        style={{ textShadow: '0 0 1px rgba(61, 46, 31, 0.1)' }}
                      >
                        物語の結末
                      </div>
                    </div>
                    <div className="h-px w-8 md:w-12 bg-[#7A6652]/40" />
                  </div>

                  <div className="relative group shrink-0">
                    <div className="absolute -inset-1 rounded-full bg-[#D87A32] opacity-30 blur-lg animate-pulse" />
                    <Button
                      className="relative h-14 px-12 bg-gradient-to-r from-[#D87A32] to-[#B85A1F] hover:from-[#E88B43] hover:to-[#C96B30] text-[#FEF9F3] text-base md:text-lg font-medium font-serif rounded-full shadow-xl tracking-[0.2em] transition-all hover:scale-105 active:scale-95 border border-[#FEF9F3]/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEpilogueOverlay(false);
                        setShowCompletion(true);
                      }}
                    >
                      Quest Clear
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tap Prompt - Bottom Section */}
          <div
            className="h-10 flex items-center justify-center shrink-0 animate-in fade-in duration-1000 fill-mode-both"
            style={{ animationDelay: '3000ms' }}
          >
            {epilogueVisibleCount <= epilogueMessages.length && (
              <div className="animate-pulse text-xs text-[#7A6652] tracking-widest border-b border-[#7A6652]/30 pb-0.5">
                Tap to continue
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Touch/pointer handlers for draggable sheet
  const handleSheetDragStart = (e: React.TouchEvent | React.PointerEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    sheetDragRef.current = {
      startY: clientY,
      startCollapsed: sheetCollapsed,
      startExpanded: sheetExpanded,
    };
  };

  const handleSheetDragMove = (e: React.TouchEvent | React.PointerEvent) => {
    if (!sheetDragRef.current) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - sheetDragRef.current.startY;

    // Dragging down (positive deltaY) -> collapse
    // Dragging up (negative deltaY) -> expand
    if (deltaY > 60 && !sheetDragRef.current.startCollapsed) {
      setSheetCollapsed(true);
      setSheetExpanded(false);
    } else if (deltaY < -60 && sheetDragRef.current.startCollapsed) {
      setSheetCollapsed(false);
    } else if (deltaY < -100 && !sheetDragRef.current.startExpanded && !sheetCollapsed) {
      setSheetExpanded(true);
    } else if (deltaY > 60 && sheetDragRef.current.startExpanded) {
      setSheetExpanded(false);
    }
  };

  const handleSheetDragEnd = () => {
    sheetDragRef.current = null;
  };

  const renderSheet = () => (
    <div
      className={`mx-auto max-w-[430px] bg-[#FEF9F3] shadow-[0_-8px_30px_rgba(61,46,31,0.15)] rounded-t-3xl transition-all duration-300 border border-[#E8D5BE] relative z-30 ${sheetCollapsed
        ? "px-5 pt-3 pb-3"
        : sheetExpanded
          ? "px-6 pt-4 pb-6 h-[60%] overflow-y-auto"
          : "px-6 pt-4 pb-6"
        }`}
      onTouchStart={handleSheetDragStart}
      onTouchMove={handleSheetDragMove}
      onTouchEnd={handleSheetDragEnd}
      onPointerDown={handleSheetDragStart}
      onPointerMove={handleSheetDragMove}
      onPointerUp={handleSheetDragEnd}
      style={{ touchAction: 'none' }}
    >
      {/* Drag handle */}
      <div className="w-full flex justify-center mb-3">
        <div
          className="w-12 h-1.5 rounded-full bg-[#E8D5BE] cursor-grab active:cursor-grabbing hover:bg-[#D87A32]/40 transition-colors"
          onClick={() => {
            if (sheetCollapsed) {
              setSheetCollapsed(false);
            } else {
              setSheetExpanded((prev) => !prev);
            }
          }}
        />
      </div>

      {/* Collapsed peek */}
      {sheetCollapsed && (
        <div className="flex items-center justify-center gap-2 py-1 animate-in fade-in">
          <ChevronUp className="w-4 h-4 text-[#7A6652]" />
          <span className="text-[#3D2E1F] text-xs font-serif font-bold tracking-widest uppercase">Swipe Up</span>
          <ChevronUp className="w-4 h-4 text-[#7A6652]" />
        </div>
      )}

      {/* Main content - hidden when collapsed */}
      {!sheetCollapsed && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {gameMode === "travel" && (
            <>
              {/* Header Section */}
              <div className="flex items-center gap-4 mb-5 pb-4 border-b border-[#E8D5BE]/50">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg shrink-0 border-2 border-[#FEF9F3] relative overflow-hidden ${isPreStart
                  ? 'bg-[#2E5A5C]'
                  : 'bg-[#D87A32]'
                  }`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                  {isPreStart ? (
                    <span className="text-[#FEF9F3] text-[10px] font-serif font-bold tracking-widest">START</span>
                  ) : (
                    <div className="text-[#FEF9F3] font-serif font-bold text-lg">{session.progressStep}</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold font-serif text-[#D87A32] tracking-[0.2em] uppercase">
                      {isPreStart ? 'Mission Start' : `Target Spot ${session.progressStep}`}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#D87A32]/30 to-transparent" />
                  </div>
                  <h2 className="text-lg font-bold font-serif text-[#3D2E1F] leading-tight line-clamp-1 tracking-wide">
                    {currentSpot?.name || "未知の場所"}
                  </h2>
                  <p className="text-[#7A6652] text-xs font-serif mt-1 flex items-center gap-1 opacity-80">
                    <MapPin className="w-3 h-3" />
                    {isPreStart ? currentSpot?.name : (session.areaName || "Area Unknown")}
                  </p>
                </div>
              </div>

              {isPreStart && (
                <div className="mb-4 p-4 bg-[#2E5A5C]/5 rounded-xl border border-[#2E5A5C]/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10"><Footprints className="w-12 h-12 text-[#2E5A5C]" /></div>
                  <p className="text-sm text-[#3D2E1F] font-serif leading-loose relative z-10">
                    <span className="text-[#2E5A5C] font-bold tracking-wider text-xs block mb-1">CURRENT OBJECTIVE</span>
                    この地点から物語が始まります。<br />まずは開始地点へ向かってください。
                  </p>
                </div>
              )}

              {sheetExpanded && currentSpot?.description && (
                <div className="mb-4 p-4 bg-[#F7E7D3]/50 rounded-xl border border-[#E8D5BE]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D87A32]" />
                    <span className="text-[#7A6652] text-[10px] font-bold font-serif uppercase tracking-widest">Mission Detail</span>
                  </div>
                  <p className="text-[#3D2E1F] text-sm font-serif leading-relaxed whitespace-pre-wrap opacity-90">
                    {currentSpot.description}
                  </p>
                </div>
              )}

              <div className="space-y-3 mt-2">
                <Button
                  className={`relative w-full h-14 text-sm font-bold font-serif rounded-full transition-all duration-300 tracking-[0.15em] shadow-lg hover:shadow-xl active:scale-[0.98] border border-[#FEF9F3]/20 ${isNear
                    ? "bg-gradient-to-r from-[#4A8A8C] to-[#2E5A5C] text-[#FEF9F3]"
                    : "bg-[#E8D5BE] text-[#7A6652] opacity-80 hover:opacity-100"
                    }`}
                  onClick={handleArrive}
                  disabled={advancing || (!isNear && !isDev)}
                >
                  <span className="flex items-center justify-center gap-3">
                    {isNear ? (
                      <>
                        <Sparkles className="w-5 h-5 animate-pulse" />
                        {isLastSpot ? "クエストを完了する" : "ミッションを開始する"}
                      </>
                    ) : (
                      <>
                        <Target className="w-4 h-4" />
                        <div>
                          <span className="block text-[10px] opacity-70 tracking-normal font-sans">あと {formatDistance(distance)}</span>
                          到着まで移動してください
                        </div>
                      </>
                    )}
                  </span>
                </Button>
              </div>

              <div className="mt-3 text-center min-h-[20px]">
                {isNear && (
                  <p className="text-[#2E5A5C] text-xs font-serif font-bold animate-pulse tracking-wide">
                    目的地付近です。開始ボタンを押してください。
                  </p>
                )}
                {!isNear && gpsEnabled && locationStatus === "locationUnavailable" && (
                  <p className="text-rose-500 text-xs font-serif">
                    現在地を取得できませんでした
                  </p>
                )}
              </div>
            </>
          )}

          {/* Story and Puzzle modes are handled by top-level overlays now */}
        </div>
      )}
    </div>
  );

  const renderStatusBadge = () => {
    if (session.isCompleted) {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300">
          完了
        </Badge>
      );
    }
    if (hasCoords && distance != null) {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-300">
          {distance.toFixed(0)}m
        </Badge>
      );
    }
    return null;
  };

  const handleStoryAdvance = () => {
    if (storyVisibleCount < storyMessages.length) {
      setStoryVisibleCount((c) => Math.min(storyMessages.length, c + 1));
      return;
    }
    // すべて表示済み
    setGameMode("travel");
    if (storyStage === "pre") {
      // 謎へ進む
      startPuzzle();
    } else if (storyStage === "post") {
      // 次のスポットへ
      if (isLastSpot) {
        handleComplete();
      } else {
        handleNext();
      }
    }
  };

  const handleSkip = () => {
    if (gameMode === "story") {
      if (storyStage === "pre") {
        startPuzzle();
        return;
      }
      if (storyStage === "post") {
        setGameMode("travel");
        if (isLastSpot) {
          handleComplete();
        } else {
          handleNext();
        }
      }
      return;
    }
    if (gameMode === "puzzle") {
      proceedAfterPuzzle();
    }
  };

  /* New Full Screen Story Renderer */
  const renderStoryScreen = () => {
    // Generate a consistent color for character names
    const getCharacterColor = (name: string) => {
      const colors = [
        "#C0392B", // Deep Red
        "#2980B9", // Strong Blue
        "#16A085", // Teal
        "#8E44AD", // Wisteria Purple
        "#D35400", // Pumpkin Orange
        "#2C3E50", // Midnight Blue
        "#27AE60", // Nephritis Green
      ];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    // Find the latest character image to use as background
    const getCurrentBackgroundImage = () => {
      // Look backwards from current visible message
      for (let i = storyVisibleCount - 1; i >= 0; i--) {
        const msg = storyMessages[i];
        if (msg.speakerType === 'character' && msg.avatarUrl) {
          return msg.avatarUrl;
        }
      }
      return null;
    };

    const bgImage = getCurrentBackgroundImage();

    return (
      <div
        className="absolute inset-0 z-50 flex flex-col bg-[#0F0F0F]"
        onClick={handleStoryAdvance}
      >
        {/* Background Image Layer */}
        {bgImage ? (
          <div className="absolute inset-0 transition-opacity duration-700 ease-in-out">
            <img
              src={bgImage}
              alt="Character"
              className="w-full h-full object-cover opacity-100" // Keep full opacity, assume image is high quality
            />
            {/* Cinematic Gradients */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#3D2E1F] via-transparent to-transparent opacity-60" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[#FEF9F3]">
            {/* Vignette for cinematic focus - Sepia Tone (Prologue Style) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_20%,_#E8D5BE_120%)] opacity-60" />
          </div>
        )}

        {/* Header Area */}
        <div className="relative z-10 px-6 pt-14 pb-4 flex flex-col items-start gap-2 pointer-events-none">
          <div className="flex-1 min-w-0 pr-12">
            <div className={`text-[10px] font-serif tracking-[0.2em] uppercase mb-1 truncate ${bgImage ? "text-white/60" : "text-[#7A6652]/80"}`}>
              {session?.title}
            </div>
            <div className={`text-lg font-bold font-serif tracking-widest break-words mb-2 ${bgImage ? "text-white" : "text-[#3D2E1F]"}`}>
              {currentSpot?.name}
            </div>
            {/* Mode Badge - Moved to left */}
            <div className={`inline-flex px-3 py-1 rounded-full backdrop-blur-md border text-[10px] font-serif tracking-wider whitespace-nowrap ${bgImage
              ? "bg-white/10 border-white/20 text-white"
              : "bg-[#D87A32]/10 border-[#D87A32]/20 text-[#D87A32]"
              }`}>
              物語
            </div>
          </div>
        </div>

        {/* Menu Button (Absolute Top-Right) */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(true);
            }}
            className="w-11 h-11 rounded-full bg-[#FEF9F3]/90 border border-[#E8D5BE] flex items-center justify-center shadow-[0_4px_16px_rgba(61,46,31,0.1)] hover:bg-[#F7E7D3] transition-all duration-300 pointer-events-auto backdrop-blur-sm group"
          >
            <Menu className="w-5 h-5 text-[#3D2E1F] group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Chat Area */}
        <div
          ref={storyScrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-6 relative z-10 scrollbar-hide mask-gradient-top"
          style={{ maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)' }}
        >
          {/* Add top spacing */}
          <div className="h-4" />

          {storyMessages.slice(0, storyVisibleCount).map((m, idx) => {
            const isLast = idx === storyVisibleCount - 1;
            const isUser = m.alignment === 'right'; // Assuming alignment matches role
            const isSystem = m.speakerType === 'system' || m.alignment === 'center';
            const isNarrator = m.speakerType === 'narrator';

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isUser
                  ? "items-end"
                  : isSystem || isNarrator
                    ? "items-center"
                    : "items-start"
                  } animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both`}
              >
                {/* Character Name Label */}
                {m.name && !isSystem && !isNarrator && !isUser && (
                  <div
                    className="text-[10px] font-bold ml-2 mb-1 tracking-wider"
                    style={{
                      color: getCharacterColor(m.name),
                      textShadow: "1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff" // White stroke effect for visibility
                    }}
                  >
                    {m.name}
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`max-w-[85%] px-5 py-3 relative shadow-lg backdrop-blur-sm ${isUser
                    ? "bg-[#D87A32]/90 text-white rounded-2xl rounded-tr-sm border border-[#F4A853]/30"
                    : isSystem || isNarrator
                      ? "bg-black/40 text-white/90 text-xs italic text-center px-8 py-2 rounded-full border border-white/10"
                      : "bg-white/90 text-[#3D2E1F] rounded-2xl rounded-tl-sm border border-white/40"
                    }`}
                >
                  <div className={`text-sm font-serif leading-relaxed whitespace-pre-wrap ${isSystem || isNarrator ? "tracking-widest" : "tracking-wide"}`}>
                    {m.text}
                  </div>

                  {/* Triangle for speech bubble */}
                  {!isSystem && !isNarrator && (
                    <div className={`absolute top-0 w-0 h-0 border-8 ${isUser
                      ? "right-[-8px] border-t-[#D87A32]/90 border-r-transparent border-l-transparent border-b-transparent"
                      : "left-[-8px] border-t-white/90 border-l-transparent border-r-transparent border-b-transparent"
                      }`} />
                  )}
                </div>
              </div>
            );
          })}

          {/* Bottom Spacer */}
          <div className="h-32" />
        </div>

        {/* Footer / Controls */}
        <div className="relative z-20 p-6 pb-12 bg-gradient-to-t from-[#FEF9F3] via-[#FEF9F3]/90 to-transparent">
          {/* If end of story */}
          {(storyStage === "post" && storyVisibleCount >= storyMessages.length && !isLastSpot) ||
            (storyStage === "pre" && storyVisibleCount >= storyMessages.length) ? (
            <Button
              className="w-full h-14 font-bold font-serif rounded-full tracking-[0.2em] active:scale-[0.95] transition-all shadow-[0_0_20px_rgba(216,122,50,0.5)] bg-gradient-to-r from-[#D87A32] to-[#B85A1F] text-white border border-[#F4A853]/20 animate-pulse"
              onClick={(e) => {
                e.stopPropagation();
                if (storyStage === "pre") {
                  startPuzzle();
                } else {
                  const nextSpot = session?.spots[session.progressStep];
                  openNavigation(nextSpot ? { lat: nextSpot.lat ?? null, lng: nextSpot.lng ?? null } : null);
                  handleNext();
                }
              }}
            >
              {storyStage === "pre" ? "ミッションを開始" : "次のスポットへ移動"}
            </Button>
          ) : storyVisibleCount >= storyMessages.length && isLastSpot && storyStage === "post" ? (
            <Button
              className="w-full h-14 font-bold font-serif rounded-full tracking-[0.2em] shadow-[0_0_20px_rgba(255,255,255,0.3)] bg-gradient-to-r from-[#4A8A8C] to-[#2E5A5C] text-white border border-white/20"
              onClick={(e) => {
                e.stopPropagation();
                handleComplete();
              }}
            >
              クエストを完了
            </Button>
          ) : (
            // Tap prompt
            <div className="flex flex-col items-center gap-2 opacity-80">
              <div className="w-1.5 h-1.5 rounded-full bg-[#7A6652] animate-bounce" />
              <span className="text-[10px] font-serif tracking-[0.3em] text-[#7A6652] uppercase">タップして次へ</span>
            </div>
          )}

          {/* Skip button logic */}
          <div className="absolute top-4 right-4">
            <button
              className="text-[10px] text-[#7A6652]/60 hover:text-[#7A6652] transition-colors bg-[#7A6652]/10 px-3 py-1 rounded-full backdrop-blur-md"
              onClick={(e) => {
                e.stopPropagation();
                handleSkip();
              }}
            >
              スキップ
            </button>
          </div>
        </div>
      </div >
    );
  };

  /* New Full Screen Puzzle Renderer */
  const renderPuzzleScreen = () => {
    return (
      <div className="absolute inset-0 z-50 flex flex-col bg-[#F7E7D3]">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[#3D2E1F]/5 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#3D2E1F 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}
        />

        {/* Header */}
        <div className="relative z-10 px-6 pt-14 pb-4 flex justify-between items-center border-b border-[#3D2E1F]/10 bg-[#F7E7D3]/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#3D2E1F] flex items-center justify-center text-white">
              <span className="font-serif font-bold text-lg">?</span>
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#D87A32] uppercase tracking-widest">謎解きミッション</div>
              <div className="text-sm font-bold text-[#3D2E1F] font-serif tracking-wide">{currentSpot?.name}</div>
            </div>
          </div>
          {/* Give Up / Skip - positioned left of menu */}
          <button
            className="text-xs font-serif text-[#7A6652] underline underline-offset-2 opacity-60 hover:opacity-100 whitespace-nowrap pr-2"
            onClick={() => proceedAfterPuzzle()}
          >
            スキップ
          </button>
        </div>

        {/* Menu Button (Absolute Top-Right) */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setMenuOpen(true)}
            className="w-11 h-11 rounded-full bg-[#FEF9F3]/90 border border-[#E8D5BE] flex items-center justify-center shadow-[0_4px_16px_rgba(61,46,31,0.1)] hover:bg-[#F7E7D3] transition-all duration-300 pointer-events-auto backdrop-blur-sm group"
          >
            <Menu className="w-5 h-5 text-[#3D2E1F] group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 relative z-10 w-full max-w-lg mx-auto">

          {/* Question Card */}
          <div className="bg-[#FEF9F3] p-6 rounded-2xl shadow-[0_4px_20px_rgba(61,46,31,0.08)] border border-[#E8D5BE] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D87A32] to-[#F4A853]" />
            <h3 className="text-xs font-bold text-[#9B8A7A] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <MessageCircle className="w-3 h-3" />
              問題
            </h3>
            <div className="text-[#3D2E1F] font-serif font-medium leading-loose text-base whitespace-pre-wrap">
              {puzzleQuestion || "問題文が設定されていません"}
            </div>
          </div>

          {/* Answer & Inputs */}
          <div className="bg-white/50 p-6 rounded-2xl border border-[#E8D5BE] space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#7A6652] uppercase tracking-[0.2em] ml-1">回答を入力</label>
              <div className="relative">
                <input
                  type="text"
                  value={puzzleInput}
                  onChange={(e) => setPuzzleInput(e.target.value)}
                  className={`w-full bg-[#FEF9F3] border-2 px-4 py-4 text-xl font-serif font-bold text-center tracking-widest rounded-xl transition-all placeholder:text-[#9B8A7A]/30 focus:outline-none focus:ring-4 focus:ring-[#D87A32]/10 ${puzzleState === "correct"
                    ? "border-[#2E5A5C] text-[#2E5A5C] bg-[#2E5A5C]/5"
                    : puzzleState === "incorrect"
                      ? "border-red-300 text-red-800 bg-red-50"
                      : "border-[#E8D5BE] focus:border-[#D87A32] text-[#3D2E1F]"
                    }`}
                  placeholder="答えを入力"
                  disabled={puzzleState === "correct"}
                />
                {puzzleState === "correct" && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2E5A5C] animate-in zoom-in spin-in-90 duration-500">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {puzzleError && (
              <div className="flex items-center gap-2 justify-center text-rose-500 bg-rose-50 py-2 rounded-lg animate-in shake">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-bold font-serif">{puzzleError}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              className={`w-full h-14 font-bold font-serif rounded-full tracking-[0.2em] text-base shadow-lg transition-all active:scale-[0.98] ${puzzleState === "correct" || puzzleState === "revealedAnswer"
                ? "bg-gradient-to-r from-[#4A8A8C] to-[#2E5A5C] text-[#FEF9F3] hover:brightness-105"
                : "bg-gradient-to-r from-[#3D2E1F] to-[#281d12] text-[#FEF9F3] hover:from-[#4a3623] hover:to-[#382819]"
                }`}
              onClick={handleSubmitAnswer}
              disabled={puzzleLoading}
            >
              {puzzleState === "correct" || puzzleState === "revealedAnswer"
                ? isLastSpot ? "クエスト完了" : "正解！次へ進む"
                : "回答する"
              }
            </Button>
          </div>

          {/* Hint Section */}
          {(puzzleHints.length > 0) && puzzleState !== "correct" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#9B8A7A] uppercase tracking-[0.2em]">ヒント</span>
                <span className="text-[10px] font-medium text-[#D87A32]">使用数: {revealedHintLevel}/{puzzleHints.length}</span>
              </div>

              {/* Active Hints */}
              <div className="space-y-2">
                {puzzleHints.slice(0, revealedHintLevel).map((hint, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-amber-100/50 border border-amber-200 text-amber-900 text-sm font-serif flex gap-3 animate-in fade-in slide-in-from-top-2">
                    <span className="text-lg">💡</span>
                    <span className="leading-relaxed">{hint}</span>
                  </div>
                ))}
              </div>

              {/* Reveal Button */}
              {revealedHintLevel < puzzleHints.length && (
                <button
                  onClick={revealNextHint}
                  className="w-full py-4 rounded-xl border-2 border-dashed border-[#D87A32]/30 text-[#D87A32] text-xs font-bold font-serif tracking-widest hover:bg-[#D87A32]/5 hover:border-[#D87A32]/50 transition-all flex items-center justify-center gap-2 group"
                >
                  <span className="group-hover:scale-110 transition-transform duration-300">🔓</span>
                  ヒントを開く (残り {puzzleHints.length - revealedHintLevel})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };


  const showGpsPrompt = !gpsEnabled && !showModeSelection;

  /* Sidebar Renderer */
  const RenderSidebar = () => {
    if (!menuOpen) return null;
    return (
      <div className="absolute inset-0 z-[100] flex justify-end pointer-events-none">
        <div
          className="absolute inset-0 bg-[#3D2E1F]/40 backdrop-blur-sm transition-opacity"
          onClick={() => setMenuOpen(false)}
          style={{ pointerEvents: "auto" }}
        />
        <div
          className="relative h-full w-3/4 max-w-[280px] bg-[#FEF9F3] shadow-2xl p-6 space-y-6 border-l border-[#E8D5BE] pointer-events-auto overflow-y-auto animate-in slide-in-from-right duration-300"
          style={{ minWidth: "260px" }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold font-serif text-[#3D2E1F] tracking-[0.2em] border-b-2 border-[#D87A32]/20 pb-1">MENU</h3>
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="閉じる"
              className="w-8 h-8 rounded-full bg-transparent border border-[#7A6652]/20 flex items-center justify-center hover:bg-[#D87A32] hover:text-white hover:border-transparent transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <button
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white/50 border border-[#E8D5BE] hover:border-[#D87A32]/50 hover:bg-white transition-all text-[#3D2E1F] font-serif font-bold tracking-wide group"
              onClick={() => {
                setMenuOpen(false);
                navigate("/");
              }}
            >
              <ChevronLeft className="w-4 h-4 text-[#D87A32] group-hover:-translate-x-1 transition-transform" />
              ホームに戻る
            </button>

            <button
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white/50 border border-[#E8D5BE] hover:border-[#D87A32]/50 hover:bg-white transition-all text-[#7A6652] font-serif font-bold tracking-wide group"
              onClick={() => {
                setMenuOpen(false);
                navigate("/profile");
              }}
            >
              <MapPin className="w-4 h-4 text-[#2E5A5C] group-hover:scale-110 transition-transform" />
              クエスト一覧
            </button>

            <button
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white/50 border border-[#E8D5BE] hover:border-[#D87A32]/50 hover:bg-white transition-all text-[#7A6652] font-serif font-bold tracking-wide group"
              onClick={() => {
                setMenuOpen(false);
                setShowStoryLog(true);
              }}
            >
              <MessageCircle className="w-4 h-4 text-[#D87A32] group-hover:scale-110 transition-transform" />
              ストーリーログ
            </button>
          </div>

          <div className="pt-6 border-t border-[#E8D5BE]/30">
            <p className="text-[10px] text-center text-[#7A6652]/40 font-serif tracking-widest">TOMOSHIBI &copy; 2024</p>
          </div>

          {/* Language Switch Button */}
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F7E7D3] border-2 border-[#E8D5BE] hover:border-[#D87A32]/50 transition-colors text-[#7A6652] font-medium tracking-wide"
            onClick={() => {
              setMenuOpen(false);
              setShowLanguageSwitcher(true);
            }}
          >
            <Globe className="w-5 h-5 text-[#2E5A5C]" />
            {selectedLanguage === 'ja' ? '言語' : selectedLanguage === 'ko' ? '언어' : 'Language'}: {selectedLanguage.toUpperCase()}
          </button>

          {/* Score Mode Status / Disable (opt-out only) */}
          {scoreModeEnabled ? (
            <button
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 transition-colors font-medium tracking-wide bg-amber-50 border-amber-300 text-amber-800 hover:border-amber-400"
              onClick={() => {
                setMenuOpen(false);
                disableScoreMode();
              }}
            >
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                スコアモード
              </div>
              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-200 text-amber-800">
                解除する
              </span>
            </button>
          ) : scoreModeDecided && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 bg-[#F7E7D3] border-[#E8D5BE] text-[#9B8A7A] font-medium tracking-wide">
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-[#9B8A7A]" />
                スコアモード
              </div>
              <span className="px-2 py-0.5 text-xs rounded-full bg-[#E8D5BE] text-[#9B8A7A]">
                OFF
              </span>
            </div>
          )}

          {/* Report Issue Button */}
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F7E7D3] border-2 border-[#E8D5BE] hover:border-rose-300 transition-colors text-[#7A6652] font-medium tracking-wide"
            onClick={() => {
              setMenuOpen(false);
              setShowFeedbackModal(true);
              track('feedback_submit', { opened: true });
            }}
          >
            <AlertCircle className="w-5 h-5 text-rose-500" />
            {selectedLanguage === 'ja' ? '困っている・報告' : selectedLanguage === 'ko' ? '문제 신고' : 'Report Issue'}
          </button>

          {/* Quest info */}
          <div className="mt-auto pt-6 border-t-2 border-[#E8D5BE]">
            <div className="text-[#7A6652] text-xs uppercase tracking-widest mb-2">現在のクエスト</div>
            <div className="text-[#3D2E1F] font-medium text-sm tracking-wide">{session?.title || "クエスト"}</div>
            <div className="text-[#7A6652] text-xs mt-1 tracking-wide">
              進捗: {session?.progressStep || 0}/{session?.spots.length || 0} スポット
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#F7E7D3] relative overflow-hidden font-serif">
      {/* Game Mode Selection Dialog (shown at session start) */}
      {showModeSelection && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div
            className="absolute inset-0 bg-[#3D2E1F]/60 backdrop-blur-sm"
            style={{ pointerEvents: "auto" }}
          />
          <div className="relative bg-[#FEF9F3] rounded-2xl shadow-[0_8px_40px_rgba(61,46,31,0.2)] p-6 mx-6 max-w-[380px] w-full border border-[#E8D5BE] pointer-events-auto animate-in zoom-in-95 duration-500">
            <h2 className="text-xl font-bold font-serif text-[#3D2E1F] text-center mb-1 tracking-[0.2em] uppercase">
              Game Mode
            </h2>
            <div className="w-12 h-px bg-[#D87A32]/30 mx-auto mb-4" />
            <p className="text-sm font-serif text-[#7A6652] text-center mb-6 leading-relaxed">
              プレイスタイルを選んでください
            </p>

            {/* Story Mode Option */}
            <button
              className="w-full p-4 rounded-xl border border-[#E8D5BE] bg-[#F7E7D3]/50 hover:bg-[#F7E7D3] hover:border-[#D87A32]/50 transition-all mb-3 text-left group shadow-sm hover:shadow-md"
              onClick={() => selectGameMode(false)}
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#2E5A5C] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-5 h-5 text-[#FEF9F3]" />
                </div>
                <div>
                  <div className="font-bold font-serif text-[#3D2E1F] text-lg tracking-wide">ストーリーモード</div>
                  <div className="text-[10px] font-bold text-[#2E5A5C] uppercase tracking-widest border border-[#2E5A5C]/20 px-1.5 py-0.5 rounded inline-block bg-white/50">Recommended</div>
                </div>
              </div>
              <p className="text-xs text-[#7A6652] pl-14 font-serif leading-relaxed opacity-90">
                物語と謎解きをじっくり楽しむ。<br />スコアは記録しません。
              </p>
            </button>

            {/* Score Mode Option */}
            <button
              className="w-full p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-400 transition-all text-left group shadow-sm hover:shadow-md"
              onClick={() => selectGameMode(true)}
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Star className="w-5 h-5 text-white fill-white" />
                </div>
                <div>
                  <div className="font-bold font-serif text-amber-900 text-lg tracking-wide">スコアモード</div>
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest border border-amber-600/20 px-1.5 py-0.5 rounded inline-block bg-white/50">Challenge</div>
                </div>
              </div>
              <p className="text-xs text-amber-800 pl-14 font-serif leading-relaxed opacity-90">
                時間・ヒント使用数でスコアを計測。<br />達成感を味わいたい方へ。
              </p>
            </button>
          </div>
        </div>
      )}

      {showGpsPrompt && (
        <div className="absolute inset-0 z-[55] flex items-center justify-center bg-[#3D2E1F]/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-[360px] rounded-2xl bg-[#FEF9F3] shadow-2xl border border-[#E8D5BE] p-6 space-y-4 text-center animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-[#FEF9F3] border-2 border-[#D87A32] flex items-center justify-center mx-auto mb-2 shadow-lg">
              <Navigation className="w-6 h-6 text-[#D87A32]" />
            </div>
            <h3 className="text-lg font-bold font-serif text-[#3D2E1F] tracking-widest uppercase">GPS Required</h3>
            <p className="text-xs font-serif text-[#7A6652] leading-loose">
              このゲームは位置情報を使って進行します。<br />GPSの利用を許可してください。
            </p>
            {gpsPromptError && (
              <p className="text-xs font-serif text-rose-500 bg-rose-50 py-1 px-2 rounded">{gpsPromptError}</p>
            )}
            <Button
              className="w-full h-12 bg-gradient-to-r from-[#4A8A8C] to-[#2E5A5C] text-white font-bold font-serif rounded-full shadow-lg tracking-widest hover:brightness-110"
              onClick={requestGpsPermission}
              disabled={gpsRequesting}
            >
              {gpsRequesting ? "確認中..." : "許可する"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* Prologue overlay - Cinematic Adventure Version (Map Background) */}
        {showPrologueOverlay && session && (
          <div
            className="absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-all duration-500"
            onClick={() => {
              // Advance to next message if not at the "Start" screen
              if (prologueVisibleCount <= prologueMessages.length) {
                setPrologueVisibleCount(c => c + 1);
              }
            }}
          >
            {/* Semi-transparent Light Paper Background with Blur to show Map */}
            <div className="absolute inset-0 bg-[#FEF9F3]/85 backdrop-blur-sm z-0" />

            {/* Vignette for cinematic focus - Sepia Tone */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_20%,_#E8D5BE_120%)] z-0 pointer-events-none opacity-60" />

            <div className="relative z-10 w-full h-full max-w-xl px-8 py-10 flex flex-col items-center justify-between pointer-events-none">

              {/* Quest Title - Top Section */}
              <div
                className="flex flex-col items-center gap-2 mt-4 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both"
                style={{ animationDelay: '500ms' }}
              >
                <div className="text-xs font-serif tracking-[0.3em] text-[#7A6652] uppercase text-center opacity-90">
                  {session.title}
                </div>
                <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#7A6652]/50 to-transparent" />
              </div>

              {/* Main Content Area - Center Section */}
              <div
                className="flex-1 flex flex-col items-center justify-center w-full min-h-0 my-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both"
                style={{ animationDelay: '1500ms' }}
              >
                {prologueVisibleCount <= prologueMessages.length ? (
                  // Message Display Phase
                  (() => {
                    const msg = prologueMessages[prologueVisibleCount - 1];
                    const isNarrator = msg?.speakerType === "narrator" || !msg?.speakerType;
                    return (
                      <div
                        key={msg?.id || prologueVisibleCount}
                        className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in-95 duration-700 fill-mode-both"
                      >
                        {/* Speaker Name */}
                        {msg?.name && (
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="h-px w-8 bg-[#7A6652]/40" />
                            <div className="text-[#5C4532] text-sm font-bold tracking-widest uppercase py-0.5">
                              {msg.name}
                            </div>
                            <div className="h-px w-8 bg-[#7A6652]/40" />
                          </div>
                        )}

                        {/* Main Text - High Contrast */}
                        <div
                          className={`text-base md:text-lg leading-loose font-medium text-center font-serif tracking-wide whitespace-pre-wrap ${isNarrator ? "text-[#7A6652] italic" : "text-[#3D2E1F]"
                            }`}
                          style={{
                            textShadow: '0 0 1px rgba(61, 46, 31, 0.1)'
                          }}
                        >
                          {msg?.text?.replace(/([。！？]+)/g, "$1\n")}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  // Ready to Start Phase
                  <div className="flex flex-col items-center space-y-8 animate-in zoom-in-95 duration-700 pointer-events-auto">
                    {/* Title with decorative lines to match Prologue style */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="h-px w-8 md:w-12 bg-[#7A6652]/40" />
                      <div className="flex items-center gap-3">
                        <Flame className="w-5 h-5 text-[#D87A32] animate-pulse" fill="currentColor" />
                        <div
                          className="text-lg md:text-xl font-medium text-center font-serif text-[#3D2E1F] tracking-[0.2em] whitespace-nowrap"
                          style={{ textShadow: '0 0 1px rgba(61, 46, 31, 0.1)' }}
                        >
                          物語をはじめよう
                        </div>
                      </div>
                      <div className="h-px w-8 md:w-12 bg-[#7A6652]/40" />
                    </div>

                    <div className="relative group shrink-0">
                      <div className="absolute -inset-1 rounded-full bg-[#D87A32] opacity-30 blur-lg animate-pulse" />
                      <Button
                        className="relative h-14 px-12 bg-gradient-to-r from-[#D87A32] to-[#B85A1F] hover:from-[#E88B43] hover:to-[#C96B30] text-[#FEF9F3] text-base md:text-lg font-medium font-serif rounded-full shadow-xl tracking-[0.2em] transition-all hover:scale-105 active:scale-95 border border-[#FEF9F3]/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPrologueOverlay(false);
                          if (session?.progressStep === 1) {
                            executeSpotArrival();
                          }
                        }}
                      >
                        クエストを開始する
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tap Prompt - Bottom Section */}
              <div
                className="h-10 flex items-center justify-center shrink-0 animate-in fade-in duration-1000 fill-mode-both"
                style={{ animationDelay: '3000ms' }}
              >
                {prologueVisibleCount <= prologueMessages.length && (
                  <div className="animate-pulse text-xs text-[#7A6652] tracking-widest border-b border-[#7A6652]/30 pb-0.5">
                    Tap to continue
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {renderMapUI()}

        {/* Full Screen Mode Overlays */}
        {gameMode === "story" && renderStoryScreen()}
        {gameMode === "puzzle" && renderPuzzleScreen()}

        {renderEpilogueOverlay()}
        {renderCompletedOverlay()}
        {showStoryLog && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-[430px] rounded-3xl bg-white shadow-2xl border border-[#eadfd0] p-5 space-y-4 max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold text-[#2f1d0f]">ストーリーログ</div>
                <button
                  className="text-[11px] underline underline-offset-2 text-[#c35f1f]"
                  onClick={() => setShowStoryLog(false)}
                >
                  閉じる
                </button>
              </div>
              <div className="space-y-3">
                {storyLog.length === 0 ? (
                  <p className="text-sm text-[#7c644c]">まだ会話は記録されていません。</p>
                ) : (
                  storyLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-[#eadfd0] bg-[#f9f4ec] p-3 space-y-2"
                    >
                      <div className="text-xs font-semibold text-[#c35f1f]">
                        {entry.stage === "prologue"
                          ? "プロローグ"
                          : entry.stage === "pre"
                            ? `スポット: ${entry.spotName || entry.spotId || ""}（到着）`
                            : `スポット: ${entry.spotName || entry.spotId || ""}（後日談）`}
                      </div>
                      <div className="space-y-1">
                        {entry.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`flex ${m.alignment === "right"
                              ? "justify-end"
                              : m.alignment === "center"
                                ? "justify-center"
                                : "justify-start"
                              }`}
                          >
                            <div
                              className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${m.alignment === "right"
                                ? "bg-[#ffe3c4] text-[#3b2615]"
                                : m.alignment === "center"
                                  ? "bg-[#f1e8dc] text-[#3b2615]"
                                  : "bg-white text-[#3b2615] border border-[#eadfd0]"
                                }`}
                            >
                              {m.name && (
                                <div className="text-[11px] font-semibold text-[#c35f1f] mb-1">
                                  {m.name}
                                </div>
                              )}
                              <div className="whitespace-pre-wrap">{m.text}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        {gameMode === 'travel' && !showPrologueOverlay && !showEpilogueOverlay && (
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <div className="pointer-events-auto">{renderSheet()}</div>
          </div>
        )}
      </div>

      {/* Language Switcher Modal */}
      {showLanguageSwitcher && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#3D2E1F]/60">
          <div className="w-[90%] max-w-[360px] bg-[#FEF9F3] rounded-3xl shadow-2xl border-2 border-[#E8D5BE] overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-[#3D2E1F] to-[#D87A32] text-center">
              <Globe className="w-8 h-8 text-white mx-auto mb-2" />
              <h3 className="text-xl font-bold text-white">
                {selectedLanguage === 'ja' ? '言語を切り替える' : selectedLanguage === 'ko' ? '언어 변경' : 'Switch Language'}
              </h3>
              <p className="text-sm text-white/80 mt-1">
                {selectedLanguage === 'ja' ? '進行状況は保存されます' : selectedLanguage === 'ko' ? '진행 상황은 저장됩니다' : 'Your progress will be saved'}
              </p>
            </div>
            <div className="p-5 space-y-3">
              {['ja', 'en', 'ko'].map((lang) => {
                const isSelected = selectedLanguage === lang;
                const labels: Record<string, { name: string; flag: string }> = {
                  ja: { name: '日本語', flag: '🇯🇵' },
                  en: { name: 'English', flag: '🇺🇸' },
                  ko: { name: '한국어', flag: '🇰🇷' },
                };
                const l = labels[lang];
                return (
                  <button
                    key={lang}
                    onClick={() => setSwitchingToLanguage(lang)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${switchingToLanguage === lang
                      ? 'border-[#D87A32] bg-[#D87A32]/10 shadow-md'
                      : isSelected
                        ? 'border-[#2E5A5C] bg-[#2E5A5C]/10'
                        : 'border-[#E8D5BE] hover:border-[#D87A32]/50'
                      }`}
                  >
                    <span className="text-2xl">{l.flag}</span>
                    <span className="font-bold text-[#3D2E1F] flex-1 text-left">{l.name}</span>
                    {isSelected && (
                      <span className="text-xs bg-[#2E5A5C]/20 text-[#2E5A5C] px-2 py-1 rounded-full">
                        {selectedLanguage === 'ja' ? '現在' : selectedLanguage === 'ko' ? '현재' : 'Current'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => {
                  setShowLanguageSwitcher(false);
                  setSwitchingToLanguage(null);
                }}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-[#E8D5BE] text-[#7A6652] font-medium hover:bg-[#F7E7D3] transition-colors"
              >
                {selectedLanguage === 'ja' ? 'キャンセル' : selectedLanguage === 'ko' ? '취소' : 'Cancel'}
              </button>
              <button
                disabled={!switchingToLanguage || switchingToLanguage === selectedLanguage}
                onClick={() => {
                  if (switchingToLanguage && switchingToLanguage !== selectedLanguage) {
                    // Update URL with new language and reload
                    const url = new URL(window.location.href);
                    url.searchParams.set('lang', switchingToLanguage);
                    window.location.href = url.toString();
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#D87A32] to-[#F4A853] text-white font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedLanguage === 'ja' ? '切り替える' : selectedLanguage === 'ko' ? '변경' : 'Switch'}
              </button>
            </div>
          </div>
        </div>
      )}

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        questId={questIdParam || ''}
        spotId={currentSpot?.id || null}
        userId={user?.id || null}
        currentMode={gameMode}
        spotIndex={session?.progressStep || 0}
        language={selectedLanguage === 'ko' ? 'ko' : selectedLanguage === 'ja' ? 'ja' : 'en'}
      />

      {/* Sidebar rendered last to be on top of everything */}
      <RenderSidebar />
    </div>
  );
};

export default GamePlay;
