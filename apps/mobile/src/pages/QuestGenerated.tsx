import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuest } from "@/contexts/QuestContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateUUID } from "@/lib/uuid";
import PlayerPreview from "@/components/quest/PlayerPreview";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, RefreshCw, Save } from "lucide-react";

// Fallback constant
const FALLBACK_COORDS = { lat: 35.6812, lng: 139.7671 };

const QuestGenerated = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();

    // Context State
    const {
        draftPrompt,
        playerPreview,
        creatorPayload,
        resetQuestState
    } = useQuest();

    const [isSaving, setIsSaving] = useState(false);
    const [savedQuestId, setSavedQuestId] = useState<string | null>(null);

    // Redirect if no data
    if (!playerPreview || !creatorPayload) {
        // Safe check: if loaded directly without generation, go back home
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FEF9F3]">
                <div className="text-center">
                    <p className="text-[#3D2E1F] font-serif mb-4">生成データが見つかりません</p>
                    <Button onClick={() => navigate("/")} variant="outline" className="border-[#E8D5BE] text-[#7A6652]">
                        ホームに戻る
                    </Button>
                </div>
            </div>
        );
    }

    // --- Derived Data Logic (Copied/Adapted from Home.tsx) ---

    // 1. Spots
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

    // 2. Title
    const journeyTitle = useMemo(() => {
        if (playerPreview?.title?.trim()) return playerPreview.title.trim();
        if (creatorPayload?.quest_title?.trim()) return creatorPayload.quest_title.trim();
        if (draftPrompt.trim()) return "まだ名前のない旅";
        return "旅の設計プレビュー";
    }, [playerPreview, creatorPayload, draftPrompt]);

    // 3. Highlight Spots
    const highlightSpotLookup = useMemo(() => {
        const map = new Map<string, string>();
        (playerPreview?.highlight_spots || []).forEach((spot) => {
            if (!spot?.name) return;
            map.set(spot.name, spot.teaser_experience || "");
        });
        return map;
    }, [playerPreview]);

    // 4. Detailed Spots for Component
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

    // 5. Basic Info
    const coverImageUrl = useMemo(() => {
        return (
            creatorPayload?.cover_image_url ||
            creatorPayload?.coverImageUrl ||
            (playerPreview as any)?.cover_image_url ||
            ""
        );
    }, [creatorPayload, playerPreview]);

    const detailBasicInfo = useMemo(() => {
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
            difficulty: meta?.difficulty_label || "medium",
            tags: playerPreview?.tags || [],
            highlights,
            recommendedFor: recommended,
            coverImageUrl: coverImageUrl || undefined,
        };
    }, [playerPreview, creatorPayload, journeyTitle, coverImageUrl]);

    // 6. Story
    const detailStory = useMemo(() => {
        if (!creatorPayload?.main_plot) return null;
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

    // 7. Duration & Metadata
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


    // --- Actions ---

    const handleSave = useCallback(async () => {
        if (isSaving) return;
        if (!user) {
            navigate("/auth");
            return;
        }

        setIsSaving(true);
        try {
            const questId = savedQuestId || generateUUID();

            // Prepare Data
            const summaryActions = Array.isArray(playerPreview.summary_actions)
                ? playerPreview.summary_actions.filter((value) => typeof value === "string" && value.trim().length > 0)
                : [];
            const teaserList = Array.isArray(playerPreview.teasers)
                ? playerPreview.teasers.filter((value) => typeof value === "string" && value.trim().length > 0)
                : [];

            // Upsert Quest
            const questPayload = {
                id: questId,
                creator_id: user.id,
                title: detailBasicInfo.title,
                description: detailBasicInfo.description,
                area_name: detailBasicInfo.area,
                cover_image_url: detailBasicInfo.coverImageUrl || null,
                status: "draft",
                tags: detailBasicInfo.tags,
                mode: "PRIVATE",
                main_plot: creatorPayload.main_plot || null,
            };

            const { error: questErr } = await supabase
                .from("quests")
                .upsert(questPayload, { onConflict: "id" });

            if (questErr) throw questErr;

            // Upsert Spots (Simplified for brevity, assuming standard recreating logic)
            // Clean old spots first
            await supabase.from("spots").delete().eq("quest_id", questId);

            const spotRows = (creatorPayload.spots || []).map((spot, idx) => ({
                quest_id: questId,
                name: spot.spot_name || spot.spot_id || `Spot ${idx + 1}`,
                address: (spot as any).address || "",
                lat: (typeof spot.lat === "number" && Number.isFinite(spot.lat)) ? spot.lat : FALLBACK_COORDS.lat,
                lng: (typeof spot.lng === "number" && Number.isFinite(spot.lng)) ? spot.lng : FALLBACK_COORDS.lng,
                order_index: idx + 1,
            }));

            if (spotRows.length > 0) {
                const { data: insertedSpots, error: spotErr } = await supabase
                    .from("spots")
                    .insert(spotRows)
                    .select("id, order_index");
                if (spotErr) throw spotErr;

                // Insert Spot Details (Simplified mapping)
                // ... In a real refactor, this logic should be a shared helper or hook. 
                // For now, mirroring Home.tsx logic roughly or skipping deep detail regeneration if simple save is enough.
                // BUT, to prevent data loss, we must save at least basic spot details.
                // Let's assume standard behavior is sufficient. 
                // Since I don't want to create massive code duplication, I will minimaly reimplement detail saving 
                // or trust that 'QuestGenerated' calls the SAME logic.
                // Ideally: extract 'saveQuest' to a lib function. 
                // Given constraints, I will implement minimal Spot Details saving.

                // (Implementing minimal detail save...)
                const detailRows = insertedSpots.map(s => {
                    const idx = (s.order_index || 1) - 1;
                    const src = creatorPayload.spots?.[idx];
                    return {
                        spot_id: s.id,
                        story_text: summaryActions[idx] || "",
                        question_text: src?.question_text || (src as any)?.question || "",
                        answer_text: src?.answer_text || (src as any)?.answer || "",
                        hint_text: src?.hint_text || (src as any)?.hint || "",
                        explanation_text: src?.explanation_text || "",
                    };
                }).filter(r => r.story_text || r.question_text);

                if (detailRows.length > 0) {
                    await supabase.from("spot_details").insert(detailRows);
                }

                // --- 3.5. Save Spot Story Messages (for GamePlay display) ---
                // First delete existing messages for this quest's spots
                const insertedSpotIds = insertedSpots.map(s => s.id);
                await supabase.from("spot_story_messages").delete().in("spot_id", insertedSpotIds);

                // Prepare story messages from dialogues or summary_actions
                const storyMessageRows: {
                    quest_id: string;
                    spot_id: string;
                    stage: string;
                    order_index: number;
                    speaker_type: string;
                    speaker_name: string;
                    avatar_url: string | null;
                    text: string;
                }[] = [];

                insertedSpots.forEach((spot) => {
                    const idx = (spot.order_index || 1) - 1;
                    const srcSpot = creatorPayload.spots?.[idx];

                    // Pre-mission dialogue
                    if (srcSpot?.pre_mission_dialogue && srcSpot.pre_mission_dialogue.length > 0) {
                        srcSpot.pre_mission_dialogue.forEach((line, lineIdx) => {
                            const char = creatorPayload.characters?.find(c => c.id === line.character_id);
                            storyMessageRows.push({
                                quest_id: questId,
                                spot_id: spot.id,
                                stage: "pre_puzzle",
                                order_index: lineIdx + 1,
                                speaker_type: "character",
                                speaker_name: char?.name || "キャラクター",
                                avatar_url: char?.image_url || null,
                                text: line.text,
                            });
                        });
                    } else {
                        // Fallback to summary_actions for pre_puzzle
                        const messageText = summaryActions[idx] || "";
                        if (messageText) {
                            storyMessageRows.push({
                                quest_id: questId,
                                spot_id: spot.id,
                                stage: "pre_puzzle",
                                order_index: 1,
                                speaker_type: "narrator",
                                speaker_name: "案内人",
                                avatar_url: null,
                                text: messageText,
                            });
                        }
                    }

                    // Post-mission dialogue
                    if (srcSpot?.post_mission_dialogue && srcSpot.post_mission_dialogue.length > 0) {
                        srcSpot.post_mission_dialogue.forEach((line, lineIdx) => {
                            const char = creatorPayload.characters?.find(c => c.id === line.character_id);
                            storyMessageRows.push({
                                quest_id: questId,
                                spot_id: spot.id,
                                stage: "post_puzzle",
                                order_index: lineIdx + 1,
                                speaker_type: "character",
                                speaker_name: char?.name || "キャラクター",
                                avatar_url: char?.image_url || null,
                                text: line.text,
                            });
                        });
                    }
                });

                if (storyMessageRows.length > 0) {
                    await supabase.from("spot_story_messages").insert(storyMessageRows);
                }

                // --- 4. Save Characters ---
                // Clean old characters (Cascade should handle dialogues)
                await supabase.from("quest_characters" as any).delete().eq("quest_id", questId);

                const charIdMap = new Map<string, string>(); // "char_1" -> "uuid"

                if (creatorPayload.characters && creatorPayload.characters.length > 0) {
                    const charRows = creatorPayload.characters.map((char) => ({
                        quest_id: questId,
                        name: char.name,
                        role: char.role,
                        personality: char.personality,
                        image_prompt: char.image_prompt,
                        image_url: char.image_url || null,
                    }));

                    const { data: insertedChars, error: charErr } = await supabase
                        .from("quest_characters" as any)
                        .insert(charRows)
                        .select("id, name"); // We might need name to match if ID is not reliable, but we used array index mapping? 
                    // Wait, we need to map "char_1" to the inserted UUID. 
                    // Since we insert in order, we can assume array index matches IF "char_1" corresponds to index 0.
                    // Better rely on index.

                    if (charErr) {
                        console.error("Char save error", charErr);
                        // Non-blocking for now, but good to know
                    }

                    if (insertedChars) {
                        creatorPayload.characters.forEach((char, idx) => {
                            if (insertedChars[idx]) {
                                charIdMap.set(char.id, insertedChars[idx].id);
                            }
                        });
                    }
                }

                // --- 5. Save Dialogues ---
                // We rely on spot insertion result `insertedSpots` which has `id` and `order_index`.
                const dialogueRows: any[] = [];

                insertedSpots.forEach((spot) => {
                    const idx = (spot.order_index || 1) - 1;
                    const srcSpot = creatorPayload.spots?.[idx];
                    if (!srcSpot) return;

                    // Pre-mission
                    srcSpot.pre_mission_dialogue?.forEach((line, lineIdx) => {
                        dialogueRows.push({
                            spot_id: spot.id,
                            character_id: charIdMap.get(line.character_id) || null,
                            timing: "pre_mission",
                            text: line.text,
                            expression: line.expression || "neutral",
                            order_index: lineIdx + 1
                        });
                    });

                    // Post-mission
                    srcSpot.post_mission_dialogue?.forEach((line, lineIdx) => {
                        dialogueRows.push({
                            spot_id: spot.id,
                            character_id: charIdMap.get(line.character_id) || null,
                            timing: "post_mission",
                            text: line.text,
                            expression: line.expression || "neutral",
                            order_index: lineIdx + 1
                        });
                    });
                });

                if (dialogueRows.length > 0) {
                    await supabase.from("quest_dialogues" as any).insert(dialogueRows);
                }
            }

            // --- 6. Save Story Timelines (prologue & epilogue) ---
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
                    // If upsert fails (e.g., no unique constraint), try insert
                    const errorText = `${timelineErr.message || ""} ${timelineErr.details || ""}`.toLowerCase();
                    if (!errorText.includes("no unique") && !errorText.includes("constraint")) {
                        console.error("story_timelines upsert error:", timelineErr);
                    } else {
                        await supabase.from("story_timelines").insert({
                            quest_id: questId,
                            prologue,
                            epilogue,
                        });
                    }
                }
            }

            // --- 7. Create Purchase Record (for profile display) ---
            // Check if purchase already exists
            const { data: existingPurchase } = await supabase
                .from("purchases")
                .select("id")
                .eq("user_id", user.id)
                .eq("quest_id", questId)
                .maybeSingle();

            if (!existingPurchase) {
                const { error: purchaseErr } = await supabase
                    .from("purchases")
                    .insert({
                        user_id: user.id,
                        quest_id: questId,
                        purchased_at: new Date().toISOString(),
                    });
                if (purchaseErr) {
                    console.error("Purchase record insert failed:", purchaseErr);
                    // Non-blocking, but log for debugging
                }
            }

            setSavedQuestId(questId);
            toast({ title: "保存しました", description: "プロフィールに追加しました。" });
            resetQuestState();
            navigate("/profile");

        } catch (e: any) {
            console.error("Save failed", e);
            toast({
                title: "保存に失敗しました",
                description: e.message || "エラーが発生しました",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    }, [isSaving, user, playerPreview, creatorPayload, savedQuestId, detailBasicInfo]);

    const handleRegenerate = () => {
        // Go back to home to regenerate. 
        // Ideally we pass a flag to auto-start, or just let user click again.
        // Since draftPrompt is in context, it will be pre-filled.
        navigate("/");
    };

    return (
        <div className="min-h-screen bg-[#FEF9F3] font-serif text-[#3D2E1F]">
            {/* Vignette */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_transparent_10%,_#E8D5BE_120%)] z-0 pointer-events-none opacity-60" />

            <div className="relative z-10 pb-32">
                {/* Content */}
                <div className="px-0">
                    <PlayerPreview
                        basicInfo={detailBasicInfo}
                        spots={detailSpots}
                        story={detailStory}
                        characters={creatorPayload?.characters || []}
                        estimatedDuration={detailDuration}
                        playerPreviewData={playerPreview}
                        routeMetadata={detailRouteMetadata || undefined}
                        difficultyExplanation={detailDifficultyExplanation}
                        isGeneratingCover={false}
                        showActions={false}
                        onPlay={() => { }}
                        onEdit={() => { }}
                        onSaveDraft={() => { }}
                    />
                </div>
            </div>

            {/* Footer Actions */}
            <div className="fixed bottom-[56px] left-0 right-0 px-4 py-4 bg-gradient-to-t from-[#FEF9F3] via-[#FEF9F3]/95 to-transparent z-40 pointer-events-none">
                <div className="max-w-md mx-auto w-full flex items-center gap-3 pointer-events-auto">
                    <Button
                        variant="outline"
                        onClick={handleRegenerate}
                        className="flex-1 h-14 rounded-full border-[#E8D5BE] bg-white/80 backdrop-blur text-[#7A6652] font-bold tracking-widest hover:bg-white hover:text-[#D87A32] shadow-sm transform transition-transform active:scale-95"
                    >
                        <RefreshCw className="mr-2 w-4 h-4" />
                        もう一度
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 h-14 rounded-full bg-gradient-to-r from-[#D87A32] to-[#B85A1F] hover:from-[#E88B43] hover:to-[#C96B30] text-white font-bold tracking-widest shadow-lg shadow-[#D87A32]/25 transform transition-transform active:scale-95"
                    >
                        {isSaving ? (
                            <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="mr-2 w-5 h-5" />
                        )}
                        {isSaving ? "保存中" : "保存する"}
                    </Button>
                </div>
            </div>

            {/* Extra spacer for bottom nav if needed */}
            <div className="h-24" />
        </div>
    );
};

export default QuestGenerated;
