import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { APIProvider, AdvancedMarker, Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
import { Compass, MapPin, Sparkles } from "lucide-react";

interface JourneySpot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  placeId?: string;
  mapUrl?: string;
}

interface JourneyMapPreviewProps {
  isGenerating: boolean;
  generationPhase?: string;
  title: string;
  teaser?: string;
  badges?: string[];
  spots: JourneySpot[];
  center?: { lat: number; lng: number } | null;
  coverImageUrl?: string;
}

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "tomoshibi_quest_map";
const FALLBACK_CENTER = { lat: 35.6812, lng: 139.7671 };

const MapPanController = ({ target }: { target: { lat: number; lng: number } | null }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;
    map.panTo(target);
  }, [map, target]);

  return null;
};

const JourneyMapPreview = ({
  isGenerating,
  generationPhase,
  title,
  teaser,
  badges = [],
  spots,
  center,
  coverImageUrl,
}: JourneyMapPreviewProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isTeaserExpanded, setIsTeaserExpanded] = useState(false);
  const [visibleSpotCount, setVisibleSpotCount] = useState(0);
  const [hasUserSelected, setHasUserSelected] = useState(false);

  useEffect(() => {
    if (isGenerating) {
      setVisibleSpotCount(0);
      return;
    }
    if (spots.length === 0) {
      setVisibleSpotCount(0);
      return;
    }
    setSelectedIndex(0);
    setHasUserSelected(false);
    setVisibleSpotCount(1);
    let current = 1;
    const timer = window.setInterval(() => {
      current += 1;
      setVisibleSpotCount(current);
      if (current >= spots.length) {
        window.clearInterval(timer);
      }
    }, 900);
    return () => window.clearInterval(timer);
  }, [isGenerating, spots.length]);

  useEffect(() => {
    if (isGenerating) return;
    if (visibleSpotCount <= 0) return;
    if (!hasUserSelected) {
      setSelectedIndex(visibleSpotCount - 1);
      return;
    }
    if (selectedIndex >= visibleSpotCount) {
      setSelectedIndex(visibleSpotCount - 1);
    }
  }, [visibleSpotCount, selectedIndex, isGenerating, hasUserSelected]);

  const visibleSpots = spots.slice(0, Math.max(visibleSpotCount, 0));
  const selectedSpot = visibleSpots[selectedIndex];

  const mapCenter = useMemo(() => {
    if (center) return center;
    if (selectedSpot) return { lat: selectedSpot.lat, lng: selectedSpot.lng };
    if (visibleSpots.length > 0) {
      return {
        lat: visibleSpots.reduce((sum, s) => sum + s.lat, 0) / visibleSpots.length,
        lng: visibleSpots.reduce((sum, s) => sum + s.lng, 0) / visibleSpots.length,
      };
    }
    return FALLBACK_CENTER;
  }, [center, selectedSpot, visibleSpots]);

  return (
    <div className="relative h-full min-h-full bg-white">
      <div className="absolute inset-0 bg-white">
        {MAPS_API_KEY ? (
          <APIProvider apiKey={MAPS_API_KEY}>
            <GoogleMap
              defaultCenter={mapCenter}
              defaultZoom={visibleSpots.length > 0 ? 14 : 12}
              mapId={MAP_ID}
              disableDefaultUI={true}
              gestureHandling="greedy"
              className="absolute inset-0 w-full h-full"
            >
              <MapPanController target={selectedSpot ? { lat: selectedSpot.lat, lng: selectedSpot.lng } : null} />
              {visibleSpots.map((spot, idx) => {
                const isActive = idx === selectedIndex;
                return (
                  <AdvancedMarker key={spot.id} position={{ lat: spot.lat, lng: spot.lng }}>
                    <motion.div
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        duration: 0.35,
                        delay: idx * 0.05,
                        ease: "easeOut",
                      }}
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shadow-lg border transition-transform ${isActive
                        ? "bg-brand-gold text-white border-brand-gold"
                        : "bg-white text-brand-dark border-stone-200"
                        }`}
                    >
                      {idx + 1}
                    </motion.div>
                  </AdvancedMarker>
                );
              })}
            </GoogleMap>
          </APIProvider>
        ) : (
          <div className="absolute inset-0 bg-stone-100 flex items-center justify-center text-stone-500 text-sm">
            地図を読み込み中...
          </div>
        )}
      </div>

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/10 via-transparent to-white/30" />

      {isGenerating && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#1d1a16]/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(217,119,6,0.24),_transparent_55%)]" />
          <motion.div
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_60%)]"
          />
          <div className="relative z-10 w-[min(340px,90%)] rounded-[28px] border border-white/20 bg-white/10 p-6 text-center text-white shadow-2xl">
            <div className="flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="relative w-14 h-14"
              >
                <div className="absolute inset-0 rounded-full border border-white/30 border-dashed" />
                <div className="absolute inset-2 rounded-full border border-white/40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-amber-300" />
                </div>
              </motion.div>
            </div>
            <div className="mt-4 text-xs tracking-[0.4em] uppercase text-white/70">Journey Craft</div>
            <div className="text-xl font-bold mt-2">旅を設計しています</div>
            <div className="text-xs text-white/70 mt-2">
              {generationPhase || "AIがクエストを組み立て中..."}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              {[0, 1, 2].map((index) => (
                <motion.span
                  key={index}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: index * 0.2 }}
                  className="w-2 h-2 rounded-full bg-white/70"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {!isGenerating && (
        <>
          <div className="absolute top-3 left-3 right-3 z-20 pointer-events-auto">
            <div className="rounded-[24px] bg-gradient-to-r from-white/90 via-white/70 to-white/90 p-[1px] shadow-[0_16px_42px_rgba(28,25,23,0.14)]">
              <div className="bg-white/92 backdrop-blur-2xl border border-stone-200/60 rounded-[22px] p-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-brand-gold/10 border border-white shadow-sm flex items-center justify-center">
                    {coverImageUrl ? (
                      <img
                        src={coverImageUrl}
                        alt={title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Compass className="w-4 h-4 text-brand-gold" />
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-[0.22em]">
                      旅の設計プレビュー
                    </div>
                    <div className="text-sm font-extrabold text-brand-dark line-clamp-1">{title}</div>
                  </div>
                </div>
                <div className="mt-2 space-y-1.5 max-h-[26vh] overflow-y-auto pr-1">
                  {teaser && (
                    <div>
                      <p
                        className={`text-xs text-stone-600 leading-[1.6] ${isTeaserExpanded ? "" : "max-h-[3.2em] overflow-hidden"}`}
                      >
                        {teaser}
                      </p>
                      {teaser.length > 80 && (
                        <button
                          type="button"
                          onClick={() => setIsTeaserExpanded((prev) => !prev)}
                          className="mt-1.5 text-[10px] font-bold text-brand-gold hover:text-amber-600 transition-colors py-1"
                        >
                          {isTeaserExpanded ? "閉じる" : "全文を見る"}
                        </button>
                      )}
                    </div>
                  )}
                  {badges.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                      {badges.map((badge) => (
                        <span
                          key={badge}
                          className="flex-none px-2.5 py-1 rounded-lg bg-white/80 border border-stone-200 text-[10px] font-bold text-stone-700 shadow-[0_6px_16px_rgba(28,25,23,0.08)]"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {visibleSpots.length > 0 && (
            <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-auto">
              <div className="bg-white/92 backdrop-blur-2xl border border-stone-200/80 rounded-xl shadow-[0_12px_34px_rgba(28,25,23,0.12)] p-2">
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-brand-dark px-1">
                  <span>旅の流れ</span>
                  <span className="text-[10px] text-stone-500">スポットをタップでフォーカス</span>
                </div>
                <div className="mt-1.5 flex gap-2 overflow-x-auto overflow-y-hidden pb-1.5 scrollbar-hide snap-x snap-mandatory overscroll-x-contain touch-pan-x">
                  {visibleSpots.map((spot, idx) => {
                    const isActive = idx === selectedIndex;
                    const rawMapUrl = spot.mapUrl || "";
                    const preferredMapUrl =
                      rawMapUrl.includes("/maps/place") || rawMapUrl.includes("place_id")
                        ? rawMapUrl
                        : "";
                    const mapUrl =
                      preferredMapUrl ||
                      (spot.placeId
                        ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(spot.placeId)}`
                        : `https://www.google.com/maps/place/${encodeURIComponent(spot.name || "")}`);
                    return (
                      <motion.div
                        key={spot.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setHasUserSelected(true);
                          setSelectedIndex(idx);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setHasUserSelected(true);
                            setSelectedIndex(idx);
                          }
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.08 }}
                        className={`flex-none min-w-[144px] rounded-xl border px-3 py-2 text-left transition-all snap-start ${isActive
                          ? "bg-gradient-to-br from-amber-50 to-white border-brand-gold/40 shadow-sm"
                          : "bg-white border-stone-300 hover:border-brand-gold/40"
                          }`}
                      >
                        <div className="text-[10px] font-bold text-stone-400">Spot {idx + 1}</div>
                        <div className="text-xs font-extrabold text-brand-dark truncate mt-0.5">
                          {spot.name || `Spot ${idx + 1}`}
                        </div>
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/90 px-2 py-1 text-[10px] font-bold text-stone-600 hover:border-brand-gold/40 hover:text-brand-gold transition-colors"
                        >
                          <MapPin size={12} />
                          地図で開く
                        </a>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default JourneyMapPreview;
