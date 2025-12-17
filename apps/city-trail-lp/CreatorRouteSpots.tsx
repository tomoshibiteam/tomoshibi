import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { TomoshibiLogo } from './TomoshibiLogo';
import { supabase } from './supabaseClient';
import { GripVertical, Trash2, Pencil } from 'lucide-react';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import ConfirmationModal from './ConfirmationModal';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || '';

interface RouteSpot {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    orderIndex: number;
    status?: string;
}

const MapHandler = ({
    routeSpots,
    selectedCoords,
    onMapClick
}: {
    routeSpots: RouteSpot[],
    selectedCoords: { lat: number, lng: number } | null,
    onMapClick: (lat: number, lng: number) => void
}) => {
    const map = useMap();
    const maps = useMapsLibrary('maps');
    const [path, setPath] = useState<google.maps.Polyline | null>(null);
    const hasFitBoundsRef = useRef<boolean>(false);

    useEffect(() => {
        if (!map || !maps) return;

        if (path) {
            path.setPath(routeSpots.map(s => ({ lat: s.lat, lng: s.lng })));
        } else {
            const line = new maps.Polyline({
                path: routeSpots.map(s => ({ lat: s.lat, lng: s.lng })),
                geodesic: true,
                strokeColor: '#2563eb',
                strokeOpacity: 0.75,
                strokeWeight: 4,
            });
            line.setMap(map);
            setPath(line);
        }

        if (routeSpots.length > 0 && !hasFitBoundsRef.current) {
            const bounds = new google.maps.LatLngBounds();
            routeSpots.forEach(s => bounds.extend({ lat: s.lat, lng: s.lng }));
            map.fitBounds(bounds, 40);
            hasFitBoundsRef.current = true;
        }

        return () => {
            if (path && routeSpots.length === 0) {
                path.setMap(null);
            }
        };
    }, [map, maps, routeSpots, path]);

    // Handle map clicks
    useEffect(() => {
        if (!map) return;
        const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
                onMapClick(e.latLng.lat(), e.latLng.lng());
            }
        });
        return () => listener.remove();
    }, [map, onMapClick]);

    // Note: Removed panTo on selectedCoords change for better UX
    // Users can see where they clicked without the map jumping around

    return (
        <>
            {routeSpots.map((spot, idx) => (
                <AdvancedMarker
                    key={spot.id}
                    position={{ lat: spot.lat, lng: spot.lng }}
                    title={spot.name}
                >
                    <div className="w-8 h-8 rounded-full bg-brand-dark text-white text-sm font-bold flex items-center justify-center shadow-lg border-2 border-white">
                        {idx + 1}
                    </div>
                </AdvancedMarker>
            ))}
        </>
    );
};


export default function CreatorRouteSpots() {
    const navigate = useNavigate();
    const [questId, setQuestId] = useState<string | null>(localStorage.getItem('quest-id'));
    const [routeSpots, setRouteSpots] = useState<RouteSpot[]>([]);
    const [spotName, setSpotName] = useState('');
    const [spotAddress, setSpotAddress] = useState('');
    const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isLoadingSuggest, setIsLoadingSuggest] = useState(false);
    const [loadingSpots, setLoadingSpots] = useState(false);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [spotToDelete, setSpotToDelete] = useState<string | null>(null);

    // Spot details tracking (spot_id -> has details)
    const [spotDetails, setSpotDetails] = useState<Record<string, boolean>>({});

    const SEGMENT_LIMIT_KM = 0.5;

    const loadSpots = async () => {
        if (!questId) return;
        setLoadingSpots(true);
        const { data, error } = await supabase
            .from('spots')
            .select('*')
            .eq('quest_id', questId)
            .order('order_index', { ascending: true });

        if (!error && data) {
            setRouteSpots(data.map(s => ({
                id: s.id,
                name: s.name,
                address: s.address || '',
                lat: s.lat,
                lng: s.lng,
                orderIndex: s.order_index,
                status: s.status
            })));

            // Load spot details to check if each spot has details
            const spotIds = data.map(s => s.id);
            if (spotIds.length > 0) {
                const { data: detailsData } = await supabase
                    .from('spot_details')
                    .select('spot_id, puzzle_text, answer')
                    .in('spot_id', spotIds);

                const detailsMap: Record<string, boolean> = {};
                detailsData?.forEach(d => {
                    // Consider has details if puzzle_text or answer is set
                    detailsMap[d.spot_id] = !!(d.puzzle_text?.trim() || d.answer?.trim());
                });
                setSpotDetails(detailsMap);
            }
        }
        setLoadingSpots(false);
    };

    useEffect(() => {
        if (!questId) return;

        // 新規クエスト作成フラグをチェック（ID紐付け）
        const initStatus = localStorage.getItem(`quest-init-status:${questId}`);
        if (initStatus === 'pending') {
            setRouteSpots([]);
            setSpotName('');
            setSpotAddress('');
            setSelectedCoords(null);
            localStorage.setItem(`quest-init-status:${questId}`, 'done');
            return;
        }

        loadSpots();
    }, [questId]);

    // MapTiler logic removed in favor of Google Places Autocomplete

    const getZoomFromFeature = (feature: any) => {
        const types: string[] = feature?.place_type || [];
        if (feature?.bbox) return null;
        if (types.includes('poi')) return 16;
        if (types.includes('address')) return 15;
        if (types.includes('locality')) return 13;
        return 15;
    };

    const handleMapClick = (lat: number, lng: number) => {
        setSelectedCoords({ lat, lng });

        // MapTiler Reverse Geocoding
        fetch(`https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_KEY}&language=ja&limit=1`)
            .then((res) => res.json())
            .then((data) => {
                const feature = data?.features?.[0];
                const label = feature?.place_name;
                const text = feature?.text;
                if (label) setSpotAddress(label);
                if (text) setSpotName(text);
            })
            .catch(console.error);
    };

    const addSpot = async () => {
        if (!spotName.trim() || !spotAddress.trim() || !selectedCoords || !questId) return;
        const orderIndex = routeSpots.length + 1;

        const tempId = `temp-${Date.now()}`;
        const newSpot = {
            id: tempId,
            name: spotName.trim(),
            address: spotAddress.trim(),
            lat: selectedCoords.lat,
            lng: selectedCoords.lng,
            orderIndex: orderIndex
        };

        setRouteSpots(prev => [...prev, newSpot]);
        setSpotName('');
        setSpotAddress('');
        setSelectedCoords(null);

        const { data, error } = await supabase
            .from('spots')
            .insert({
                quest_id: questId,
                name: newSpot.name,
                address: newSpot.address,
                lat: newSpot.lat,
                lng: newSpot.lng,
                order_index: orderIndex,
            })
            .select()
            .single();

        if (data) {
            setRouteSpots(prev => prev.map(s => s.id === tempId ? { ...s, id: data.id } : s));
        }
    };

    const calcDistanceKm = (a: RouteSpot, b: RouteSpot) => {
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const lat1 = toRad(a.lat);
        const lat2 = toRad(b.lat);
        const h =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
        return R * c;
    };

    const deleteSpot = (id: string) => {
        setSpotToDelete(id);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!spotToDelete) return;
        const id = spotToDelete;
        setDeleteModalOpen(false);
        setSpotToDelete(null);

        // Optimistic update
        const updatedSpots = routeSpots.filter(s => s.id !== id);
        const reorderedSpots = updatedSpots.map((s, idx) => ({ ...s, orderIndex: idx + 1 }));
        setRouteSpots(reorderedSpots);

        const { error } = await supabase
            .from('spots')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting spot:', error);
            // Revert on error would be ideal, but for now just logging
            alert('削除に失敗しました');
            loadSpots(); // Reload to sync state
        } else {
            // Update order for remaining spots in DB
            if (questId) {
                const payload = reorderedSpots.map((s) => ({
                    id: s.id,
                    quest_id: questId,
                    name: s.name,
                    address: s.address,
                    lat: s.lat,
                    lng: s.lng,
                    order_index: s.orderIndex || 0,
                }));
                await supabase.from('spots').upsert(payload, { onConflict: 'id' });
            }
        }
    };

    const handleDragStart = (id: string, e: React.DragEvent<HTMLDivElement>) => {
        setDraggingId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (id: string, e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (id: string, e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (draggingId && draggingId !== id) {
            const fromId = draggingId;
            const toId = id;

            const updated = [...routeSpots];
            const fromIndex = updated.findIndex((s) => s.id === fromId);
            const toIndex = updated.findIndex((s) => s.id === toId);
            if (fromIndex === -1 || toIndex === -1) return;

            const [moved] = updated.splice(fromIndex, 1);
            updated.splice(toIndex, 0, moved);
            const withOrder = updated.map((s, idx) => ({ ...s, orderIndex: idx + 1 }));
            setRouteSpots(withOrder);
            setDraggingId(null);

            if (questId) {
                const payload = withOrder.map((s) => ({
                    id: s.id,
                    quest_id: questId,
                    name: s.name,
                    address: s.address,
                    lat: s.lat,
                    lng: s.lng,
                    order_index: s.orderIndex || 0,
                }));
                await supabase.from('spots').upsert(payload, { onConflict: 'id' });
            }
        }
    };


    return (
        <APIProvider apiKey={API_KEY}>
            <section className="min-h-screen bg-stone-50 flex flex-col">
                {/* Header */}
                <div className="bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-50">
                    <div className="container mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
                        <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
                            <TomoshibiLogo className="h-7 w-auto" />
                        </button>
                        <div className="flex items-center gap-4 text-xs font-bold text-stone-400">
                            <span className="hidden md:inline">Step 1: 基本情報</span>
                            <span className="hidden md:inline">›</span>
                            <span className="text-brand-dark px-2 py-1 bg-brand-gold/10 rounded">Step 2: スポット</span>
                            <span>›</span>
                            <span>Step 3: ストーリー</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 grid lg:grid-cols-12 min-h-0 bg-stone-50 relative">
                    {/* Left Column: Form & List */}
                    <div className="lg:col-span-5 xl:col-span-4 bg-white border-r border-stone-200 shadow-xl z-20 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-32">
                            <button onClick={() => navigate('/creator/workspace')} className="text-xs font-bold text-stone-500 hover:text-brand-dark flex items-center gap-1 mb-6 transition-colors">
                                <span className="text-lg">‹</span> ワークスペースに戻る
                            </button>

                            <div className="mb-8">
                                <h1 className="text-3xl font-serif font-bold text-brand-dark mb-2">ルート & スポット</h1>
                                <p className="text-sm text-stone-500 leading-relaxed">
                                    プレイヤーが巡るチェックポイントを追加してください。魅力的なスポットをつなぎ合わせ、一本の線を描きましょう。
                                </p>
                            </div>

                            {/* Spot List */}
                            <div className="space-y-6 relative mb-8">
                                {routeSpots.length === 0 && (
                                    <div className="text-center py-12 px-6 border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50">
                                        <p className="font-bold text-stone-400 mb-2">スポットがまだありません</p>
                                        <p className="text-xs text-stone-400">下のフォームか地図をクリックして最初のスポットを追加してください。</p>
                                    </div>
                                )}

                                {routeSpots.map((spot, idx) => {
                                    const prev = idx > 0 ? routeSpots[idx - 1] : null;
                                    const segmentKm = prev ? calcDistanceKm(prev, spot) : 0;
                                    const tooFar = prev ? segmentKm > SEGMENT_LIMIT_KM : false;

                                    return (
                                        <div
                                            key={spot.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(spot.id, e)}
                                            onDragOver={(e) => handleDragOver(spot.id, e)}
                                            onDrop={(e) => handleDrop(spot.id, e)}
                                            onDragEnd={() => setDraggingId(null)}
                                            onMouseEnter={() => setActiveId(spot.id)}
                                            onMouseLeave={() => setActiveId(null)}
                                            className="relative pl-6 group transition-all"
                                        >
                                            {/* Connecting Line */}
                                            {idx < routeSpots.length - 1 && (
                                                <div className="absolute left-9 top-14 bottom-[-1.5rem] w-0.5 bg-stone-200 group-hover:bg-stone-300 transition-colors z-0" />
                                            )}

                                            {/* Distance Info */}
                                            {prev && (
                                                <div className={`absolute -top-4 left-16 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 ${tooFar ? 'bg-rose-100 text-rose-600' : 'bg-stone-100 text-stone-500'
                                                    }`}>
                                                    {segmentKm.toFixed(2)} km {tooFar && '⚠️ 距離超過'}
                                                </div>
                                            )}

                                            <div className={`relative z-10 bg-white rounded-xl border transition-all duration-200 p-2.5 flex items-center gap-2 ${activeId === spot.id ? 'border-brand-gold shadow-md ring-1 ring-brand-gold/50' :
                                                tooFar ? 'border-rose-200 shadow-sm' :
                                                    'border-stone-200 shadow-sm hover:border-brand-gold/50 hover:shadow-md'
                                                }`}>
                                                {/* Number + Drag Handle */}
                                                <div className="flex items-center gap-1">
                                                    <div className="w-6 h-6 rounded-full bg-brand-dark text-white text-xs font-bold flex items-center justify-center">
                                                        {idx + 1}
                                                    </div>
                                                    <button className="text-stone-300 hover:text-stone-500 cursor-move">
                                                        <GripVertical size={12} />
                                                    </button>
                                                </div>

                                                {/* Name + Address */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-sm text-brand-dark truncate">{spot.name}</h3>
                                                    <p className="text-[10px] text-stone-400 truncate">{spot.address}</p>
                                                </div>

                                                {/* Details Status Badge */}
                                                {spotDetails[spot.id] ? (
                                                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded">✓済</span>
                                                ) : (
                                                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-bold rounded">未入力</span>
                                                )}

                                                {/* Actions */}
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/creator/route-spots/${spot.id}`);
                                                        }}
                                                        className="px-2 py-1 rounded bg-stone-100 text-stone-600 text-[10px] font-bold hover:bg-brand-gold hover:text-white transition-colors"
                                                    >
                                                        編集
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteSpot(spot.id);
                                                        }}
                                                        className="p-1 rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                        </div>

                        {/* Add Spot Panel (Sticky Bottom) - Compact Design */}
                        <div className="border-t border-stone-200 bg-white/95 backdrop-blur-md p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                            {/* Add Spot Form - Compact Row */}
                            <div className="flex gap-2 items-center mb-3">
                                <input
                                    value={spotName}
                                    onChange={(e) => setSpotName(e.target.value)}
                                    placeholder="スポット名"
                                    className="w-28 px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:bg-white focus:border-brand-gold/50"
                                />
                                <div className="flex-1">
                                    <PlaceAutocompleteInput
                                        defaultValue={spotAddress}
                                        onPlaceSelect={(place) => {
                                            if (place.formatted_address) setSpotAddress(place.formatted_address);
                                            if (place.name) setSpotName(place.name);
                                            if (place.geometry?.location) {
                                                setSelectedCoords({
                                                    lat: place.geometry.location.lat(),
                                                    lng: place.geometry.location.lng()
                                                });
                                            }
                                        }}
                                        placeholder="住所を検索..."
                                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:bg-white focus:border-brand-gold/50"
                                    />
                                </div>
                                <button
                                    onClick={addSpot}
                                    disabled={!spotName.trim() || !spotAddress.trim() || !selectedCoords}
                                    className="px-3 py-2 rounded-lg bg-brand-dark text-white font-bold text-xs hover:bg-brand-gold disabled:opacity-50 transition-colors"
                                >
                                    +追加
                                </button>
                            </div>

                            {/* Completion Checklist - Inline Compact */}
                            <div className="flex items-center gap-4 px-2 py-1.5 bg-stone-50 rounded-lg mb-3">
                                <span className="text-[10px] font-bold text-stone-400 uppercase">完了条件</span>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${routeSpots.length >= 10 ? 'bg-emerald-500 text-white' : 'border border-stone-300 text-stone-400'}`}>
                                        {routeSpots.length >= 10 ? '✓' : ''}
                                    </div>
                                    <span className={`text-xs ${routeSpots.length >= 10 ? 'text-emerald-700' : 'text-stone-500'}`}>
                                        10箇所以上 <span className="font-mono">({routeSpots.length}/10)</span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${routeSpots.length > 0 && routeSpots.every(s => spotDetails[s.id]) ? 'bg-emerald-500 text-white' : 'border border-stone-300 text-stone-400'}`}>
                                        {routeSpots.length > 0 && routeSpots.every(s => spotDetails[s.id]) ? '✓' : ''}
                                    </div>
                                    <span className={`text-xs ${routeSpots.length > 0 && routeSpots.every(s => spotDetails[s.id]) ? 'text-emerald-700' : 'text-stone-500'}`}>
                                        詳細入力済 <span className="font-mono">({routeSpots.filter(s => spotDetails[s.id]).length}/{routeSpots.length})</span>
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        if (questId) {
                                            localStorage.setItem(`step-status:${questId}:2`, 'in_progress');
                                        }
                                        navigate('/creator/workspace');
                                    }}
                                    className="flex-1 py-2.5 rounded-lg border-2 border-brand-gold bg-white text-brand-gold font-bold text-sm hover:bg-brand-gold/5 transition-all"
                                >
                                    一時保存する
                                </button>
                                <button
                                    onClick={() => {
                                        if (questId) {
                                            localStorage.setItem(`step-status:${questId}:2`, 'completed');
                                        }
                                        navigate('/creator/workspace');
                                    }}
                                    disabled={!(routeSpots.length >= 10 && routeSpots.every(s => spotDetails[s.id]))}
                                    title={!(routeSpots.length >= 10 && routeSpots.every(s => spotDetails[s.id])) ? '完了条件を満たしてください' : ''}
                                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${routeSpots.length >= 10 && routeSpots.every(s => spotDetails[s.id])
                                        ? 'bg-brand-dark text-white hover:bg-brand-gold hover:shadow-lg'
                                        : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                        }`}
                                >
                                    完了する
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Map */}
                    <div className="lg:col-span-7 xl:col-span-8 relative bg-stone-100 hidden lg:block">
                        <Map
                            mapId="4f910f9227657629"
                            defaultCenter={{ lat: 35.6804, lng: 139.7690 }}
                            defaultZoom={13}
                            gestureHandling={'greedy'}
                            disableDefaultUI={false}
                            className="w-full h-full"
                        >
                            <MapHandler
                                routeSpots={routeSpots}
                                selectedCoords={selectedCoords}
                                onMapClick={handleMapClick}
                            />
                            {selectedCoords && (
                                <AdvancedMarker position={selectedCoords}>
                                    <div
                                        className="w-10 h-10 rounded-full bg-brand-gold text-white text-lg font-bold flex items-center justify-center shadow-xl border-3 border-white"
                                        style={{
                                            animation: 'markerAppear 0.3s ease-out, markerPulse 2s ease-in-out infinite 0.3s'
                                        }}
                                    >
                                        +
                                    </div>
                                    {/* Drop shadow indicator */}
                                    <div
                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-black/20 rounded-full blur-sm"
                                        style={{ animation: 'shadowPulse 2s ease-in-out infinite 0.3s' }}
                                    />
                                </AdvancedMarker>
                            )}
                        </Map>
                        <div className="absolute top-6 left-6 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-white/50 pointer-events-none">
                            <p className="text-xs font-bold text-stone-600 flex items-center gap-2">
                                <span>📍</span> 地図をクリックして場所を選択
                            </p>
                        </div>
                    </div>
                </div>

                <ConfirmationModal
                    isOpen={deleteModalOpen}
                    onClose={() => {
                        setDeleteModalOpen(false);
                        setSpotToDelete(null);
                    }}
                    onConfirm={handleConfirmDelete}
                    title="スポットの削除"
                    message="このスポットを削除しますか？削除されたデータは復元できません。"
                    confirmText="削除する"
                    cancelText="キャンセル"
                    isDanger={true}
                />
            </section>
        </APIProvider >
    );
}
