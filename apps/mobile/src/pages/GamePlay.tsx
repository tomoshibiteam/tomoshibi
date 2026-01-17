import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Menu, X, ChevronUp, ChevronDown,
  MapPin, Navigation, Target, CheckCircle2,
  Footprints, Trophy, Sparkles, ChevronLeft,
  MessageCircle, HelpCircle, Eye, Lock, Globe, AlertCircle, Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { GameSession, GameSpot } from "@/types/gameplay";
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
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

// Component to draw route polyline and auto-fit bounds
const RoutePathsHandler = ({
  routePoints,
  currentSpot,
  nextSpot,
}: {
  routePoints: { lat: number; lng: number }[];
  currentSpot: { lat: number; lng: number } | null;
  nextSpot: { lat: number; lng: number } | null;
}) => {
  const map = useMap();
  const maps = useMapsLibrary('maps');
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);
  const hasFitBoundsRef = useRef<boolean>(false);

  // Draw polyline for route trail
  useEffect(() => {
    if (!map || !maps) return;

    const pathPoints = routePoints.map(p => ({ lat: p.lat, lng: p.lng }));

    if (polyline) {
      polyline.setPath(pathPoints);
    } else if (pathPoints.length >= 1) {
      const line = new maps.Polyline({
        path: pathPoints,
        geodesic: true,
        strokeColor: '#e67a28',
        strokeOpacity: 0.8,
        strokeWeight: 4,
      });
      line.setMap(map);
      setPolyline(line);
    }

    return () => {
      // Cleanup only when component unmounts
    };
  }, [map, maps, routePoints, polyline]);

  // Cleanup polyline on unmount
  useEffect(() => {
    return () => {
      if (polyline) {
        polyline.setMap(null);
      }
    };
  }, []);

  // Auto-fit bounds to show current and next spots
  useEffect(() => {
    if (!map || !currentSpot) return;

    // Reset fit bounds flag when spots change
    hasFitBoundsRef.current = false;

    if (!hasFitBoundsRef.current) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(currentSpot);

      if (nextSpot) {
        bounds.extend(nextSpot);
      }

      // Add some padding and fit
      map.fitBounds(bounds, {
        top: 80,
        right: 40,
        bottom: 200,
        left: 40,
      });

      hasFitBoundsRef.current = true;
    }
  }, [map, currentSpot?.lat, currentSpot?.lng, nextSpot?.lat, nextSpot?.lng]);

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
  const [locError, setLocError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "locationUnavailable" | "tooFar" | "nearTarget"
  >("locationUnavailable");
  const [puzzleMode, setPuzzleMode] = useState(false);
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

  // Travel mode state for rescue logic
  const [travelModeStartTime, setTravelModeStartTime] = useState<number | null>(null);
  const [arrivalAttempts, setArrivalAttempts] = useState(0);
  const [showRescueConfirm, setShowRescueConfirm] = useState(false);

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

  // Ready to start: at first spot, arrived but not started
  const isReadyToStart = useMemo(() => {
    return session?.progressStep === 1 && hasArrivedAtFirstSpot && gameMode === 'travel';
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
            .select("id, title, area_name, description, status")
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

      if (questData.status && questData.status !== "published") {
        setError("このクエストは公開されていません");
        setLoading(false);
        return;
      }

      const ownsQuest = (purchaseData || []).some((p: any) => p.quest_id === questId);
      if (!ownsQuest) {
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

      const spots: GameSpot[] =
        spotsData?.map((s: any) => ({
          id: s.id,
          orderIndex: s.order_index ?? 0,
          name: s.name || "スポット",
          description: s.description,
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

      // Story texts
      const prologue =
        storyData?.prologue ||
        storyData?.prologue_body ||
        storyData?.prologue_text ||
        null;
      const epilogue =
        storyData?.epilogue ||
        storyData?.epilogue_body ||
        storyData?.epilogue_text ||
        null;
      setPrologueText(prologue);
      setEpilogueText(epilogue);
      const resolvedPrologue = prologue
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
      const resolvedEpilogue = epilogue
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
        setPuzzleMode(true);
        return;
      }
      setPuzzleQuestion(data?.question_text || null);
      setPuzzleAnswer(data?.answer_text || null);

      // Parse hints (format: "Hint1 || Hint2 || Hint3")
      const hints = data?.hint_text
        ? data.hint_text.split('||').map((h: string) => h.trim()).filter(Boolean)
        : [];
      setPuzzleHints(hints);

      setPuzzleMode(true);
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
    setPuzzleMode(false);
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

    setPuzzleMode(false);
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

  // Handle quest start from Pre-Start state
  const handleStartQuest = () => {
    if (!currentSpot) return;
    // Mark as arrived and started
    setHasArrivedAtFirstSpot(true);
    // Trigger prologue
    setPrologueVisibleCount(1);
    setShowPrologueOverlay(true);
    // Reset spot timer
    setSpotStartTime(Date.now());
    track('mode_story', { spot_index: 1, from_pre_start: true });
  };

  // 開発用: 距離や回答を無視して即進行
  const devSkipCurrent = () => {
    setPuzzleMode(false);
    setPuzzleError(null);
    setPuzzleInput("");
    // スキップでも後日談メッセージを表示（無ければプレースホルダ）
    (async () => {
      if (session && currentSpot) {
        await showPostStory();
        return;
      }
      if (isLastSpot) {
        handleComplete();
      } else {
        handleNext();
      }
    })();
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
    if (!currentSpot || currentSpot.lat == null || currentSpot.lng == null) {
      setDistance(null);
      setLocationStatus("locationUnavailable");
      return;
    }
    if (!navigator.geolocation) {
      setLocError("位置情報が取得できません");
      setLocationStatus("locationUnavailable");
      setDistance(null);
      return;
    }
    setLocError(null);
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
        setLocError("現在地を取得できませんでした");
        setLocationStatus("locationUnavailable");
        setDistance(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpot?.id]);

  const isNear = locationStatus === "nearTarget";
  const distanceLabel =
    locationStatus === "tooFar" || locationStatus === "nearTarget"
      ? distance != null
        ? `目的地まで約 ${distance.toFixed(0)}m`
        : ""
      : locError || "";
  const arrivalDisabled =
    locationStatus === "tooFar" || !!session?.isCompleted || gameMode !== "travel";

  // Calculate ETA for walking (5 km/h average)
  const etaMinutes = distance != null ? Math.ceil((distance / 1000) / 5 * 60) : null;

  // Distance formatting helper
  const formatDistance = (d: number | null) => {
    if (d == null) return '—';
    return d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`;
  };

  // Rescue option visibility: show after 2 min travel OR 3+ failed attempts OR GPS unavailable
  const travelDurationSec = travelModeStartTime ? Math.floor((Date.now() - travelModeStartTime) / 1000) : 0;
  const showRescueOption = (
    (travelDurationSec > 120 && distance != null && distance < 500) ||
    arrivalAttempts >= 3 ||
    locationStatus === "locationUnavailable"
  );

  // Open external navigation app
  const openNavigation = () => {
    if (!currentSpot?.lat || !currentSpot?.lng) return;
    const dest = `${currentSpot.lat},${currentSpot.lng}`;
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

  // Handle manual/rescue arrival
  const handleRescueArrive = () => {
    setShowRescueConfirm(false);
    track('arrival_manual', { spot_index: session?.progressStep || 0, distance });
    handleArrive();
  };

  // Track travel mode start time
  useEffect(() => {
    if (gameMode === 'travel' && !travelModeStartTime) {
      setTravelModeStartTime(Date.now());
    } else if (gameMode !== 'travel') {
      setTravelModeStartTime(null);
      setArrivalAttempts(0);
    }
  }, [gameMode, travelModeStartTime]);

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
    setPuzzleMode(false);

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
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/95 backdrop-blur-sm p-4">
        <div className="w-full max-w-[400px] max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-[#eadfd0]">
          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="text-center">
              <div className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-[#ffb566] to-[#e67a28] text-white text-xs font-bold uppercase tracking-wide mb-2">
                🎉 Mission Clear
              </div>
              <h2 className="text-xl font-bold text-[#2f1d0f] leading-tight">
                {session.title}
              </h2>
              <p className="text-sm text-[#7c644c] mt-1">
                全スポットをクリアしました！
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-[#fff8f0] to-[#f7efe5] border border-[#eadfd0] p-3 text-center">
                <div className="text-[10px] text-[#7c644c] uppercase tracking-wide mb-1">プレイ時間</div>
                <div className="text-lg font-bold text-[#2f1d0f]">{durationText ?? "—"}</div>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-[#fff8f0] to-[#f7efe5] border border-[#eadfd0] p-3 text-center">
                <div className="text-[10px] text-[#7c644c] uppercase tracking-wide mb-1">クリアスポット</div>
                <div className="text-lg font-bold text-[#2f1d0f]">
                  {session.spots.length} / {session.spots.length}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                className="w-full h-12 bg-gradient-to-r from-[#ffb566] to-[#e67a28] text-white font-bold text-base rounded-xl shadow-lg"
                onClick={() => {
                  setShowCompletion(false);
                  navigate("/");
                }}
              >
                ホームに戻る
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-10 border-[#eadfd0] text-[#7c644c] hover:bg-[#f7efe5] rounded-xl"
                  onClick={() => {
                    setShowCompletion(false);
                    navigate("/profile");
                  }}
                >
                  プロフィール
                </Button>
                <Button
                  variant="outline"
                  className="h-10 border-[#e67a28] text-[#e67a28] hover:bg-[#fff8f0] rounded-xl"
                  onClick={handleReplay}
                >
                  もう一度プレイ
                </Button>
              </div>
            </div>

            {/* Review Section */}
            <div className="rounded-2xl border border-[#eadfd0] bg-[#faf8f5] p-4 space-y-3">
              <div className="text-sm font-bold text-[#2f1d0f]">クエストの評価</div>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className={`text-3xl transition-transform hover:scale-110 ${reviewRating && reviewRating >= star ? "text-[#e67a28]" : "text-[#e0d6ca]"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full rounded-xl border border-[#eadfd0] bg-white px-3 py-2 text-sm text-[#2f1d0f] placeholder:text-[#b5a99a] focus:outline-none focus:ring-2 focus:ring-[#e67a28]/30 focus:border-[#e67a28]"
                placeholder="感想をお聞かせください（任意）"
                rows={2}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#7c644c]">
                  {reviewSubmitted ? "✓ 送信済み" : ""}
                </span>
                <Button
                  size="sm"
                  disabled={!reviewRating || reviewSubmitting || reviewSubmitted}
                  className="bg-[#e67a28] hover:bg-[#d26216] text-white rounded-lg px-4"
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

    // Route points for polyline trail (visited + current spot)
    const routePoints = [
      ...visitedSpots.map(s => ({ lat: s.lat!, lng: s.lng! })),
      ...(currentSpot?.lat != null && currentSpot?.lng != null
        ? [{ lat: currentSpot.lat, lng: currentSpot.lng }]
        : []),
    ];

    // Current and next spot positions for bounds fitting
    const currentSpotPos = currentSpot?.lat != null && currentSpot?.lng != null
      ? { lat: currentSpot.lat, lng: currentSpot.lng }
      : null;
    const nextSpotPos = nextSpot
      ? { lat: nextSpot.lat!, lng: nextSpot.lng! }
      : null;

    const progressPercent = (session.progressStep / session.spots.length) * 100;

    return (
      <div className="relative flex-1 h-full bg-[#F7E7D3]">
        <APIProvider apiKey={API_KEY}>
          <Map
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
              routePoints={routePoints}
              currentSpot={currentSpotPos}
              nextSpot={nextSpotPos}
            />

            {/* Visited spots - wax seal style, faded */}
            {visitedSpots.map((spot, idx) => (
              <AdvancedMarker
                key={`visited-${spot.id}`}
                position={{ lat: spot.lat!, lng: spot.lng! }}
              >
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#C9B8A3] to-[#A89888] rounded-full border-2 border-[#E8D5BE] shadow-md flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-[#7A6652]" />
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#7A6652] bg-[#E8D5BE] px-1.5 py-0.5 rounded-full shadow-sm">
                    {idx + 1}
                  </div>
                </div>
              </AdvancedMarker>
            ))}

            {/* Current spot marker - wax seal / lantern style */}
            {currentSpot?.lat != null && currentSpot?.lng != null && (
              <AdvancedMarker position={{ lat: currentSpot.lat, lng: currentSpot.lng }}>
                <div className="relative flex items-center justify-center">
                  {/* Outer glow rings - lantern effect */}
                  <div className="absolute w-16 h-16 bg-[#D87A32]/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                  <div className="absolute w-12 h-12 bg-[#D87A32]/30 rounded-full animate-pulse" style={{ animationDuration: '2s' }} />
                  {/* Wax seal marker */}
                  <div className="relative w-11 h-11 bg-gradient-to-br from-[#F4A853] via-[#D87A32] to-[#B85A1F] rounded-full border-2 border-[#FEF9F3] shadow-[0_4px_20px_rgba(216,122,50,0.5)] flex items-center justify-center">
                    <Target className="w-5 h-5 text-[#FEF9F3]" />
                  </div>
                  {/* Progress badge */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-[#3D2E1F] bg-[#FEF9F3] px-2 py-0.5 rounded-full shadow-md border border-[#E8D5BE]">
                    {session.progressStep}/{session.spots.length}
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {/* Next spot marker - locked, faded ink style */}
            {nextSpot && (
              <AdvancedMarker position={{ lat: nextSpot.lat!, lng: nextSpot.lng! }}>
                <div className="relative opacity-50">
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
          </Map>
        </APIProvider>



        {/* Menu button only */}
        <div className="absolute top-3 right-3 pointer-events-none">
          <button
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 rounded-full bg-[#FEF9F3]/95 backdrop-blur-sm border-2 border-[#E8D5BE] flex items-center justify-center shadow-md hover:bg-[#F7E7D3] transition-colors pointer-events-auto"
          >
            <Menu className="w-5 h-5 text-[#3D2E1F]" />
          </button>
        </div>



        {(!mapReady || loading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f4efe8]/95 backdrop-blur-sm">
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
    const hasMessages = epilogueMessages.length > 0;
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/90 backdrop-blur-sm px-4">
        <div className="w-full max-w-[420px] rounded-3xl bg-white shadow-2xl border border-[#eadfd0] p-5 space-y-4 text-center">
          <div className="text-xs font-semibold text-[#c35f1f] tracking-wide">
            エピローグ
          </div>
          <div className="text-xl font-bold text-[#2f1d0f] leading-tight">
            {session.title}
          </div>
          {hasMessages ? (
            <div className="bg-[#f9f4ec] border border-[#eadfd0] rounded-2xl px-3 py-3 max-h-72 overflow-auto space-y-3 text-left">
              {epilogueMessages.slice(0, epilogueVisibleCount).map((m) => (
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
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${m.alignment === "right"
                      ? "bg-[#ffe3c4] text-[#3b2615]"
                      : m.alignment === "center"
                        ? "bg-[#f1e8dc] text-[#3b2615]"
                        : "bg-white text-[#3b2615] border border-[#eadfd0]"
                      }`}
                  >
                    {m.name && (
                      <div className="text-xs font-semibold text-[#c35f1f] mb-1">
                        {m.name}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{m.text}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[#7c644c] max-h-60 overflow-auto whitespace-pre-wrap leading-relaxed text-left bg-[#f9f4ec] border border-[#eadfd0] rounded-2xl px-3 py-3">
              {epilogueText || "エピローグはまだ設定されていません。"}
            </div>
          )}
          <Button
            className="w-full bg-gradient-to-r from-[#ffb566] to-[#e67a28] text-white"
            onClick={() => {
              if (hasMessages && epilogueVisibleCount < epilogueMessages.length) {
                setEpilogueVisibleCount((c) => Math.min(c + 1, epilogueMessages.length));
              } else {
                setShowEpilogueOverlay(false);
                setShowCompletion(true);
              }
            }}
          >
            {hasMessages && epilogueVisibleCount < epilogueMessages.length ? "次へ" : "Mission Clear へ"}
          </Button>
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
      className={`mx-auto max-w-[430px] bg-[#FEF9F3] shadow-xl rounded-2xl transition-all duration-300 border-2 border-[#E8D5BE] ${sheetCollapsed
        ? "px-4 pt-2 pb-2"
        : sheetExpanded
          ? "px-4 pt-3 pb-4 h-[50%]"
          : "px-4 pt-3 pb-4"
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
      <div
        className="w-8 h-1 rounded-full bg-[#E8D5BE] mx-auto mb-2 cursor-grab active:cursor-grabbing hover:bg-[#D87A32]/40 transition-colors"
        onClick={() => {
          if (sheetCollapsed) {
            setSheetCollapsed(false);
          } else {
            setSheetExpanded((prev) => !prev);
          }
        }}
      />

      {/* Collapsed peek */}
      {sheetCollapsed && (
        <div className="flex items-center justify-center gap-2 py-1">
          <ChevronUp className="w-4 h-4 text-[#7A6652]" />
          <span className="text-[#3D2E1F] text-xs tracking-wide">スワイプして表示</span>
          <ChevronUp className="w-4 h-4 text-[#7A6652]" />
        </div>
      )}

      {/* Main content - hidden when collapsed */}
      {!sheetCollapsed && (
        <>
          {/* Spot Info Card - Pre-Start vs In-Quest */}
          <div className="flex items-start gap-3 mb-3">
            {/* Wax seal spot icon - shows START for pre-start */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md flex-shrink-0 border-2 border-[#FEF9F3] ${isPreStart
              ? 'bg-gradient-to-br from-[#2E5A5C] via-[#3A7478] to-[#2E5A5C] animate-pulse'
              : 'bg-gradient-to-br from-[#F4A853] via-[#D87A32] to-[#B85A1F]'
              }`}>
              {isPreStart ? (
                <span className="text-[#FEF9F3] text-[10px] font-bold">START</span>
              ) : (
                <Target className="w-4 h-4 text-[#FEF9F3]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-[#3D2E1F] leading-tight line-clamp-1 mb-0.5 tracking-wide">
                {isPreStart ? '開始地点' : (currentSpot?.name || "次のスポット")}
              </h2>
              <p className="text-[#7A6652] text-xs tracking-wide">
                {isPreStart ? currentSpot?.name : (session.areaName || "エリア")}
              </p>
            </div>
          </div>

          {/* Pre-Start Guidance */}
          {isPreStart && (
            <div className="mb-3 p-3 bg-[#2E5A5C]/10 rounded-xl border border-[#2E5A5C]/30">
              <p className="text-sm text-[#3D2E1F] leading-relaxed">
                🚩 <span className="font-bold">クエスト開始前</span><br />
                この地点から物語が始まります。まずは開始地点に到着してください。
              </p>
            </div>
          )}

          {/* Distance badge */}
          {distance != null && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F7E7D3] border-2 border-[#E8D5BE] rounded-full">
                <Footprints className="w-3.5 h-3.5 text-[#D87A32]" />
                <span className="text-[#3D2E1F] text-xs font-bold tracking-wide">
                  {distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`}
                </span>
              </div>
            </div>
          )}

          {/* Expanded content - mission scroll */}
          {sheetExpanded && currentSpot?.description && (
            <div className="mb-3 p-3 bg-[#F7E7D3] rounded-xl border-2 border-[#E8D5BE]">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-3.5 h-3.5 text-[#D87A32]" />
                <span className="text-[#D87A32] text-xs font-bold uppercase tracking-widest">ミッション</span>
              </div>
              <p className="text-[#3D2E1F] text-sm leading-relaxed whitespace-pre-wrap">
                {currentSpot.description}
              </p>
            </div>
          )}

          {/* Progress and ETA Info */}
          <div className="mb-3 px-3 py-2 bg-[#F7E7D3] rounded-xl border-2 border-[#E8D5BE]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#7A6652] font-medium">次のスポット</span>
              <span className="text-xs font-bold text-[#D87A32]">{session.progressStep}/{session.spots.length}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-[#3D2E1F] font-medium">
              <Footprints className="w-4 h-4 text-[#D87A32]" />
              <span>{formatDistance(distance)}</span>
              {etaMinutes != null && etaMinutes > 0 && (
                <span className="text-[#7A6652]">• 徒歩約{etaMinutes}分</span>
              )}
            </div>
          </div>

          {/* Pre-Start Tips */}
          {isPreStart && (
            <div className="mb-3 space-y-1">
              <div className="flex items-center gap-2 text-xs text-[#7A6652]">
                <MapPin className="w-3 h-3" />
                <span>GPSをONにしてください</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#7A6652]">
                <AlertCircle className="w-3 h-3" />
                <span>歩行中の操作に注意</span>
              </div>
            </div>
          )}

          {/* Dual CTA Buttons - Pre-Start vs In-Quest */}
          <div className="space-y-2">
            {/* Primary: Navigation */}
            <Button
              className="relative w-full h-11 text-sm font-bold rounded-xl transition-all duration-200 tracking-wide active:scale-[0.98] bg-gradient-to-r from-[#F4A853] to-[#D87A32] text-[#FEF9F3] shadow-[0_4px_16px_rgba(216,122,50,0.3)]"
              onClick={openNavigation}
            >
              <span className="flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                {isPreStart ? '開始地点へナビ' : 'ナビを開く'}
              </span>
            </Button>

            {/* Secondary: Start/Arrive - Conditional */}
            {isPreStart ? (
              // Pre-Start: "ここから始める" button
              <Button
                className={`relative w-full h-11 text-sm font-bold rounded-xl transition-all duration-200 tracking-wide active:scale-[0.98] ${isNear
                  ? "bg-gradient-to-r from-[#4A8A8C] to-[#2E5A5C] text-[#FEF9F3] shadow-md"
                  : "bg-[#E8D5BE] text-[#7A6652] border-2 border-[#D8C8B8]"
                  }`}
                onClick={isNear ? handleStartQuest : undefined}
                disabled={!isNear && !isDev}
              >
                {isNear ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    ここから始める
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    ここから始める（あと{formatDistance(distance)}）
                  </span>
                )}
              </Button>
            ) : (
              // In-Quest: Normal arrival button
              <Button
                className={`relative w-full h-11 text-sm font-bold rounded-xl transition-all duration-200 tracking-wide active:scale-[0.98] ${isNear
                  ? "bg-gradient-to-r from-[#4A8A8C] to-[#2E5A5C] text-[#FEF9F3] shadow-md"
                  : "bg-[#E8D5BE] text-[#7A6652] border-2 border-[#D8C8B8]"
                  }`}
                onClick={() => {
                  if (!isNear) {
                    setArrivalAttempts(prev => prev + 1);
                  }
                  handleArrive();
                }}
                disabled={advancing || (!isNear && !isDev)}
              >
                <span className="flex items-center gap-2">
                  {isNear ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {isLastSpot ? "✿ クエスト完了！" : "✿ 到着した！"}
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4" />
                      到着した（あと{formatDistance(distance)}）
                    </>
                  )}
                </span>
              </Button>
            )}
          </div>

          {/* Status / Rescue Messages */}
          <div className="mt-2 text-center">
            {isNear && (
              <p className="text-[#2E5A5C] text-xs font-medium">
                🎉 目的地付近に到着しました！
              </p>
            )}
            {!isNear && locationStatus === "locationUnavailable" && (
              <p className="text-rose-500 text-xs">
                現在地を取得できませんでした
              </p>
            )}
          </div>

          {/* Rescue Option - GPS troubles fallback */}
          {showRescueOption && !isNear && (
            <div className="mt-3 pt-3 border-t border-[#E8D5BE]">
              <button
                className="w-full text-xs text-[#D87A32] hover:text-[#B85A1F] underline underline-offset-2 transition-colors flex items-center justify-center gap-1"
                onClick={() => setShowRescueConfirm(true)}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                GPS問題？ 手動で到着する
              </button>
            </div>
          )}

          {/* Rescue Confirmation Modal */}
          {showRescueConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D2E1F]/50 backdrop-blur-sm">
              <div className="bg-[#FEF9F3] rounded-2xl p-5 mx-4 max-w-sm shadow-2xl border-2 border-[#E8D5BE]">
                <h3 className="text-lg font-bold text-[#3D2E1F] mb-2">手動で到着する</h3>
                <p className="text-sm text-[#7A6652] mb-4">
                  GPSが不安定な場合、手動で到着処理を行えます。本当に目的地付近にいますか？
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-[#E8D5BE] text-[#7A6652] hover:bg-[#D8C8B8]"
                    onClick={() => setShowRescueConfirm(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-[#4A8A8C] to-[#2E5A5C] text-[#FEF9F3]"
                    onClick={handleRescueArrive}
                  >
                    到着する
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Dev skip button */}
          {isDev && (
            <button
              className="mt-2 text-xs text-[#D87A32]/60 hover:text-[#D87A32] underline underline-offset-2 block mx-auto transition-colors"
              onClick={() => handleArrive()}
            >
              DEV: スキップ
            </button>
          )}


        </>
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

  const renderStory = () => {
    if (gameMode !== "story") return null;
    return (
      <div className="absolute inset-0 z-30 flex items-end pointer-events-none bg-[#3D2E1F]/30 backdrop-blur-sm">
        <div className="pointer-events-auto w-full px-4 pb-4">
          <div className="mx-auto max-w-[430px] rounded-2xl bg-[#FEF9F3] shadow-xl p-4 space-y-3 border-2 border-[#E8D5BE]">
            {/* Mode Status Bar */}
            {renderModeStatusBar()}

            {/* Messages */}
            <div className="space-y-2 max-h-52 overflow-auto pr-1">
              {storyMessages.slice(0, storyVisibleCount).map((m) => (
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
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${m.alignment === "right"
                      ? "bg-[#D87A32]/15 text-[#3D2E1F] border border-[#D87A32]/30"
                      : m.alignment === "center"
                        ? "bg-[#F7E7D3] text-[#7A6652] text-xs italic"
                        : "bg-[#F7E7D3] text-[#3D2E1F] border border-[#E8D5BE]"
                      }`}
                  >
                    {m.name && (
                      <div className="text-xs font-bold text-[#D87A32] mb-1">
                        {m.name}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{m.text}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Next Spot Preview (only in post/epilogue stage) */}
            {storyStage === "post" && !isLastSpot && storyVisibleCount >= storyMessages.length && (
              <div className="p-3 rounded-xl bg-[#2E5A5C]/10 border border-[#2E5A5C]/30 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-[#2E5A5C]" />
                  <span className="text-xs font-bold text-[#2E5A5C]">次のスポット</span>
                </div>
                <div className="text-sm font-medium text-[#3D2E1F]">
                  {session?.spots[session.progressStep]?.name || "次のスポット"}
                </div>
                <div className="text-xs text-[#7A6652] mt-0.5 flex items-center gap-2">
                  <Footprints className="w-3.5 h-3.5" />
                  {formatDistance(distance)}
                  {etaMinutes != null && etaMinutes > 0 && (
                    <span>• 徒歩約{etaMinutes}分</span>
                  )}
                </div>
              </div>
            )}

            {/* CTA Buttons - Enhanced for epilogue */}
            {storyStage === "post" && storyVisibleCount >= storyMessages.length && !isLastSpot ? (
              // Epilogue completed - show dual CTAs
              <div className="space-y-2">
                <Button
                  className="w-full h-11 font-bold rounded-xl tracking-wide active:scale-[0.98] bg-gradient-to-r from-[#F4A853] to-[#D87A32] text-[#FEF9F3] shadow-[0_4px_16px_rgba(216,122,50,0.3)]"
                  onClick={() => {
                    openNavigation();
                    handleNext();
                  }}
                >
                  <span className="flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    ナビを開いて次へ
                  </span>
                </Button>
                <Button
                  className="w-full h-10 font-medium rounded-xl tracking-wide active:scale-[0.98] bg-[#E8D5BE] text-[#7A6652] border-2 border-[#D8C8B8]"
                  onClick={handleNext}
                >
                  スキップして進む
                </Button>
              </div>
            ) : (
              // Regular story navigation
              <Button
                className={`w-full h-11 font-bold rounded-xl tracking-wide active:scale-[0.98] ${storyStage === "post"
                  ? "bg-gradient-to-r from-[#4A8A8C] to-[#2E5A5C] text-[#FEF9F3] shadow-md"
                  : "bg-gradient-to-r from-[#F4A853] to-[#D87A32] text-[#FEF9F3] shadow-[0_4px_16px_rgba(216,122,50,0.3)]"
                  }`}
                onClick={handleStoryAdvance}
              >
                {storyVisibleCount < storyMessages.length
                  ? "次へ"
                  : storyStage === "post"
                    ? isLastSpot
                      ? "✿ クエストクリア"
                      : "次のスポットへ"
                    : "謎解きへ"}
              </Button>
            )}

            {/* Secondary actions - less intrusive */}
            <div className="flex items-center justify-between pt-1">
              <button
                className="text-xs text-[#7A6652] hover:text-[#D87A32] transition-colors flex items-center gap-1"
                onClick={() => setShowStoryLog(true)}
              >
                <Eye className="w-3 h-3" />
                これまでの会話
              </button>
              {storyStage === "pre" && (
                <button
                  className="text-xs text-[#7A6652] hover:text-[#D87A32] transition-colors"
                  onClick={() => startPuzzle()}
                >
                  スキップ →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPuzzle = () => {
    if (gameMode !== "puzzle") return null;
    return (
      <div className="absolute inset-0 z-30 flex items-end pointer-events-none bg-[#3D2E1F]/30 backdrop-blur-sm">
        <div className="pointer-events-auto w-full px-4 pb-4">
          <div className="mx-auto max-w-[430px] rounded-2xl bg-[#FEF9F3] shadow-xl p-4 space-y-3 border-2 border-[#E8D5BE]">
            {/* Mode Status Bar */}
            {renderModeStatusBar()}

            {/* Question Card */}
            <div className="p-3 rounded-xl bg-[#F7E7D3] border-2 border-[#E8D5BE]">
              <h3 className="text-base font-bold text-[#3D2E1F] mb-1 tracking-wide">
                {currentSpot?.name || "スポット"}
              </h3>
              <p className="text-[#7A6652] text-sm whitespace-pre-wrap leading-relaxed">
                {puzzleQuestion || "このスポットには謎が設定されていません"}
              </p>
            </div>

            {/* Answer Input */}
            <div className="space-y-2">
              <input
                type="text"
                value={puzzleInput}
                onChange={(e) => setPuzzleInput(e.target.value)}
                className={`w-full rounded-xl px-4 py-2.5 text-base font-medium transition-all ${puzzleState === "correct"
                  ? "bg-[#2E5A5C]/10 border-2 border-[#2E5A5C] text-[#2E5A5C]"
                  : puzzleState === "incorrect"
                    ? "bg-red-50 border-2 border-red-300 text-[#3D2E1F]"
                    : "bg-[#F7E7D3] border-2 border-[#E8D5BE] text-[#3D2E1F] placeholder:text-[#9B8A7A]"
                  }`}
                placeholder="答えを入力してください..."
                disabled={puzzleState === "correct"}
              />

              {puzzleError && (
                <p className="text-red-500 text-sm flex items-center gap-1.5">
                  × {puzzleError}
                </p>
              )}

              {puzzleState === "incorrect" && (
                <p className="text-[#7A6652] text-xs">
                  試行回数: {attemptCount} 回
                </p>
              )}

              {puzzleState === "correct" && (
                <p className="text-[#2E5A5C] text-xs font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  正解！
                </p>
              )}
            </div>

            {/* Tiered Hints Section */}
            {puzzleHints.length > 0 && puzzleState !== "correct" && (
              <div className="space-y-2">
                {/* Revealed hints */}
                {puzzleHints.slice(0, revealedHintLevel).map((hint, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="text-xs font-bold text-amber-700 mb-0.5">💡 ヒント {idx + 1}</div>
                    <div className="text-sm text-amber-900">{hint}</div>
                  </div>
                ))}

                {/* Reveal next hint button */}
                {revealedHintLevel < puzzleHints.length && (
                  <button
                    onClick={revealNextHint}
                    className="w-full py-2 px-3 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 text-sm font-medium hover:bg-amber-200 transition-colors flex items-center justify-center gap-2"
                  >
                    💡 ヒント{revealedHintLevel + 1}を見る（{puzzleHints.length - revealedHintLevel}個残り）
                  </button>
                )}
              </div>
            )}

            {/* Answer Format Help */}
            {showAnswerHelp && puzzleState !== "correct" && (
              <div className="p-3 rounded-xl bg-violet-50 border border-violet-200">
                <h4 className="font-bold text-violet-700 text-sm mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  答えが通らない？
                </h4>
                <ul className="text-xs text-violet-600 space-y-1">
                  <li>• <b>ひらがな/カタカナ</b>を変えてみる</li>
                  <li>• <b>スペース</b>を入れない</li>
                  <li>• 英語は<b>大文字/小文字</b>を変えてみる</li>
                  <li>• 数字は<b>半角</b>で入力</li>
                  <li>• 句読点（。、）は入れない</li>
                </ul>
              </div>
            )}

            {/* Revealed Answer */}
            {puzzleState === "revealedAnswer" && (
              <div className="rounded-xl bg-[#2E5A5C]/10 border-2 border-[#2E5A5C]/30 px-3 py-2">
                <div className="text-[#2E5A5C] text-xs font-bold mb-1">答え</div>
                <div className="text-[#3D2E1F] whitespace-pre-wrap text-sm">
                  {puzzleAnswer || "答えは未設定です"}
                </div>
              </div>
            )}

            {/* Submit Button - Unified wording */}
            <Button
              className={`w-full h-11 font-bold rounded-xl tracking-wide active:scale-[0.98] ${puzzleState === "correct" || puzzleState === "revealedAnswer"
                ? "bg-gradient-to-r from-[#4A8A8C] to-[#2E5A5C] text-[#FEF9F3] shadow-md"
                : "bg-gradient-to-r from-[#F4A853] to-[#D87A32] text-[#FEF9F3] shadow-[0_4px_16px_rgba(216,122,50,0.3)]"
                }`}
              onClick={handleSubmitAnswer}
              disabled={puzzleLoading}
            >
              {puzzleState === "correct" || puzzleState === "revealedAnswer"
                ? isLastSpot
                  ? "✿ クエストクリア"
                  : "次のスポットへ"
                : "回答する"}
            </Button>

            {/* Secondary actions - less intrusive */}
            <div className="flex items-center justify-between pt-1">
              <button
                className="text-xs text-[#7A6652] hover:text-[#D87A32] transition-colors flex items-center gap-1"
                onClick={() => {
                  setStoryMessages(lastStoryMessages);
                  setStoryVisibleCount(lastStoryMessages.length || 1);
                  setStoryStage("pre");
                  setGameMode("story");
                  setPuzzleMode(false);
                }}
              >
                <Eye className="w-3 h-3" />
                会話を見る
              </button>

              {/* Hint shortcut when not all revealed */}
              {puzzleHints.length > revealedHintLevel && puzzleState !== "correct" && (
                <button
                  className="text-xs text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1"
                  onClick={revealNextHint}
                >
                  💡 ヒント
                </button>
              )}

              {isDev && (
                <button
                  className="text-xs text-[#D87A32]/60 hover:text-[#D87A32] transition-colors"
                  onClick={devSkipCurrent}
                >
                  DEV: スキップ
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#F7E7D3] relative overflow-hidden">
      {/* Game Mode Selection Dialog (shown at session start) */}
      {showModeSelection && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div
            className="absolute inset-0 bg-[#3D2E1F]/60 backdrop-blur-md"
            style={{ pointerEvents: "auto" }}
          />
          <div className="relative bg-[#FEF9F3] rounded-2xl shadow-2xl p-6 mx-6 max-w-[380px] w-full border-2 border-[#E8D5BE] pointer-events-auto">
            <h2 className="text-xl font-bold text-[#3D2E1F] text-center mb-2 tracking-wide">
              🎮 ゲームモード選択
            </h2>
            <p className="text-sm text-[#7A6652] text-center mb-5">
              プレイスタイルを選んでください
            </p>

            {/* Story Mode Option */}
            <button
              className="w-full p-4 rounded-xl border-2 border-[#E8D5BE] bg-[#F7E7D3] hover:border-[#D87A32] transition-all mb-3 text-left"
              onClick={() => selectGameMode(false)}
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-[#2E5A5C]/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-[#2E5A5C]" />
                </div>
                <div>
                  <div className="font-bold text-[#3D2E1F]">ストーリーモード</div>
                  <div className="text-xs text-[#7A6652]">おすすめ</div>
                </div>
              </div>
              <p className="text-xs text-[#7A6652] ml-13 pl-13">
                じっくり物語と謎解きを楽しむ。スコアは記録しません。
              </p>
            </button>

            {/* Score Mode Option */}
            <button
              className="w-full p-4 rounded-xl border-2 border-amber-200 bg-amber-50 hover:border-amber-400 transition-all text-left"
              onClick={() => selectGameMode(true)}
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                </div>
                <div>
                  <div className="font-bold text-amber-800">スコアモード</div>
                  <div className="text-xs text-amber-600">⭐ チャレンジ</div>
                </div>
              </div>
              <p className="text-xs text-amber-700 ml-13 pl-13">
                時間・ヒント・正解率でスコアを計測。達成感を味わう！
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Side menu overlay */}
      {menuOpen && (
        <div className="absolute inset-0 z-50 flex justify-end pointer-events-none">
          <div
            className="absolute inset-0 bg-[#3D2E1F]/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            style={{ pointerEvents: "auto" }}
          />
          <div
            className="relative h-full w-3/4 max-w-[280px] bg-[#FEF9F3] shadow-2xl p-5 space-y-4 border-l-2 border-[#E8D5BE] pointer-events-auto"
            style={{ minWidth: "240px" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#3D2E1F] tracking-wide">メニュー</h3>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="閉じる"
                className="w-8 h-8 rounded-full bg-[#F7E7D3] border-2 border-[#E8D5BE] flex items-center justify-center hover:bg-[#E8D5BE] transition-colors"
              >
                <X className="w-5 h-5 text-[#7A6652]" />
              </button>
            </div>

            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F7E7D3] border-2 border-[#E8D5BE] hover:border-[#D87A32]/50 transition-colors text-[#3D2E1F] font-medium tracking-wide"
              onClick={() => {
                setMenuOpen(false);
                navigate("/");
              }}
            >
              <ChevronLeft className="w-5 h-5 text-[#D87A32]" />
              ホームに戻る
            </button>

            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F7E7D3] border-2 border-[#E8D5BE] hover:border-[#D87A32]/50 transition-colors text-[#7A6652] font-medium tracking-wide"
              onClick={() => {
                setMenuOpen(false);
                navigate("/profile");
              }}
            >
              <MapPin className="w-5 h-5 text-[#2E5A5C]" />
              クエスト一覧
            </button>

            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F7E7D3] border-2 border-[#E8D5BE] hover:border-[#D87A32]/50 transition-colors text-[#7A6652] font-medium tracking-wide"
              onClick={() => {
                setMenuOpen(false);
                setShowStoryLog(true);
              }}
            >
              <MessageCircle className="w-5 h-5 text-[#D87A32]" />
              ストーリーログ
            </button>

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
      )}

      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* Prologue overlay */}
        {showPrologueOverlay && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/90 backdrop-blur-sm px-4">
            <div className="w-full max-w-[420px] rounded-3xl bg-white shadow-2xl border border-[#eadfd0] p-5 space-y-4 text-center">
              <div className="text-xs font-semibold text-[#c35f1f] uppercase tracking-wide">
                Mission Briefing
              </div>
              <div className="text-xl font-bold text-[#2f1d0f] leading-tight">
                {session?.title || "クエスト"}
              </div>
              {prologueMessages.length > 0 ? (
                <div className="bg-[#f9f4ec] border border-[#eadfd0] rounded-2xl px-3 py-3 max-h-72 overflow-auto space-y-3 text-left">
                  {prologueMessages.slice(0, prologueVisibleCount).map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.alignment === "right" ? "justify-end" : m.alignment === "center" ? "justify-center" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${m.alignment === "right"
                          ? "bg-[#ffe3c4] text-[#3b2615]"
                          : m.alignment === "center"
                            ? "bg-[#f1e8dc] text-[#3b2615]"
                            : "bg-white text-[#3b2615] border border-[#eadfd0]"
                          }`}
                      >
                        {m.name && (
                          <div className="text-xs font-semibold text-[#c35f1f] mb-1">
                            {m.name}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{m.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[#7c644c] max-h-60 overflow-auto whitespace-pre-wrap leading-relaxed text-left bg-[#f9f4ec] border border-[#eadfd0] rounded-2xl px-3 py-3">
                  {prologueText || "プロローグは未設定です。準備ができたら任務を開始してください。"}
                </div>
              )}
              <div className="flex items-center gap-2">
                {prologueMessages.length > 0 && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowPrologueOverlay(false)}
                  >
                    スキップ
                  </Button>
                )}
                <Button
                  className="flex-1 bg-gradient-to-r from-[#ffb566] to-[#e67a28] text-white"
                  onClick={() => {
                    if (prologueMessages.length > 0 && prologueVisibleCount < prologueMessages.length) {
                      setPrologueVisibleCount((c) => Math.min(c + 1, prologueMessages.length));
                    } else {
                      setShowPrologueOverlay(false);
                      // スポット1の場合はプロローグ終了後に実到着処理へ
                      if (session?.progressStep === 1) {
                        executeSpotArrival();
                      }
                    }
                  }}
                >
                  {prologueMessages.length > 0 && prologueVisibleCount < prologueMessages.length
                    ? "次へ"
                    : "任務を開始する"}
                </Button>
              </div>
            </div>
          </div>
        )}
        {renderEpilogueOverlay()}
        {renderMapUI()}
        {renderCompletedOverlay()}
        {renderStory()}
        {puzzleMode && renderPuzzle()}
        {showStoryLog && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
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
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <div className="pointer-events-auto">{renderSheet()}</div>
        </div>
      </div>

      {/* Language Switcher Modal */}
      {showLanguageSwitcher && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#3D2E1F]/60 backdrop-blur-sm">
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

      {/* Feedback Modal */}
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
    </div>
  );
};

export default GamePlay;
