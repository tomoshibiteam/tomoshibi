import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { TomoshibiLogo } from './TomoshibiLogo';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { Image, Upload, X, Loader2, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import type { MainPlot } from './questCreatorTypes';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || '';

// Map handler component for Google Maps
const MapHandler = ({
    mapCenter,
    onMapClick,
    onReverseGeocode,
    locationQuery
}: {
    mapCenter: { lat: number, lng: number },
    onMapClick: (lat: number, lng: number) => void,
    onReverseGeocode: (address: string) => void,
    locationQuery?: string
}) => {
    const map = useMap();
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);
    const [markerVisible, setMarkerVisible] = useState(true);
    const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const addressGeocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastResolvedRef = useRef<string>('');

    useEffect(() => {
        if (!map) return;
        map.setCenter(mapCenter);
    }, [map, mapCenter]);

    useEffect(() => {
        if (!map) return;
        if (!geocoderRef.current && (window as any)?.google?.maps?.Geocoder) {
            geocoderRef.current = new google.maps.Geocoder();
        }
        if (!geocoderRef.current) return;

        const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                onMapClick(lat, lng);

                // Debounce reverse geocoding
                if (geocodeTimeoutRef.current) {
                    clearTimeout(geocodeTimeoutRef.current);
                }

                geocodeTimeoutRef.current = setTimeout(() => {
                    geocoderRef.current?.geocode({ location: { lat, lng } }, (results, status) => {
                        if (status === 'OK' && results && results.length > 0) {
                            // より短い地名を優先的に取得
                            let shortName = '';

                            // 最初の結果から地域コンポーネントを探す
                            for (const result of results) {
                                for (const component of result.address_components) {
                                    // locality（市区町村）を優先
                                    if (component.types.includes('locality')) {
                                        shortName = component.long_name;
                                        break;
                                    }
                                    // sublocality_level_1（区など）
                                    if (component.types.includes('sublocality_level_1') && !shortName) {
                                        shortName = component.long_name;
                                    }
                                    // administrative_area_level_2（郡・市など）
                                    if (component.types.includes('administrative_area_level_2') && !shortName) {
                                        shortName = component.long_name;
                                    }
                                }
                                if (shortName) break;
                            }

                            // 見つからなければ最初の結果のフォーマット済み住所を使用
                            const finalAddress = shortName || results[0].formatted_address;
                            onReverseGeocode(finalAddress);
                        }
                    });
                }, 100);
            }
        });

        return () => {
            listener.remove();
            if (geocodeTimeoutRef.current) {
                clearTimeout(geocodeTimeoutRef.current);
            }
            if (addressGeocodeTimeoutRef.current) {
                clearTimeout(addressGeocodeTimeoutRef.current);
            }
        };
    }, [map, onMapClick, onReverseGeocode]);

    useEffect(() => {
        if (!geocoderRef.current && (window as any)?.google?.maps?.Geocoder) {
            geocoderRef.current = new google.maps.Geocoder();
        }
        if (!geocoderRef.current) return;
        const query = (locationQuery || '').trim();
        if (!query) return;
        if (query === lastResolvedRef.current) return;
        if (addressGeocodeTimeoutRef.current) {
            clearTimeout(addressGeocodeTimeoutRef.current);
        }
        addressGeocodeTimeoutRef.current = setTimeout(() => {
            geocoderRef.current?.geocode({ address: query }, (results, status) => {
                if (status === 'OK' && results && results.length > 0) {
                    const result = results[0];
                    const loc = result.geometry?.location;
                    if (loc) {
                        onMapClick(loc.lat(), loc.lng());
                    }
                    if (result.formatted_address && result.formatted_address !== query) {
                        onReverseGeocode(result.formatted_address);
                        lastResolvedRef.current = result.formatted_address;
                    } else {
                        lastResolvedRef.current = query;
                    }
                }
            });
        }, 400);
    }, [locationQuery, onMapClick, onReverseGeocode]);

    return (
        <>
            {markerVisible && (
                <AdvancedMarker position={mapCenter}>
                    <div className="relative">
                        <div
                            className="w-10 h-10 rounded-full bg-brand-gold border-3 border-white shadow-xl flex items-center justify-center"
                            style={{
                                animation: 'markerPulse 2s ease-in-out infinite'
                            }}
                        >
                            <div className="w-3 h-3 rounded-full bg-white" />
                        </div>
                        {/* Drop shadow indicator */}
                        <div
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-black/20 rounded-full blur-sm"
                            style={{ animation: 'shadowPulse 2s ease-in-out infinite' }}
                        />
                    </div>
                </AdvancedMarker>
            )}
        </>
    );
};


export default function CreatorMysterySetup() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number }>({ lat: 35.6804, lng: 139.769 });
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isLoadingSuggest, setIsLoadingSuggest] = useState(false);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [questId, setQuestId] = useState<string | null>(localStorage.getItem('quest-id'));
    const [coverImage, setCoverImage] = useState<string>('');
    const [uploading, setUploading] = useState(false);
    const [mainPlotExpanded, setMainPlotExpanded] = useState(false);
    const [mainPlot, setMainPlot] = useState<MainPlot>({
        premise: '',
        goal: '',
        antagonist: '',
        finalReveal: ''
    });

    const inputRef = useRef<HTMLInputElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const resolveLocationFromCoords = async (lat: number, lng: number): Promise<string | null> => {
        if (!(window as any)?.google?.maps?.Geocoder) return null;
        const geocoder = new google.maps.Geocoder();
        return new Promise((resolve) => {
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status !== 'OK' || !results || results.length === 0) {
                    resolve(null);
                    return;
                }
                let shortName = '';
                for (const result of results) {
                    for (const component of result.address_components) {
                        if (component.types.includes('locality')) {
                            shortName = component.long_name;
                            break;
                        }
                        if (component.types.includes('sublocality_level_1') && !shortName) {
                            shortName = component.long_name;
                        }
                        if (component.types.includes('administrative_area_level_2') && !shortName) {
                            shortName = component.long_name;
                        }
                    }
                    if (shortName) break;
                }
                resolve(shortName || results[0].formatted_address || null);
            });
        });
    };

    // Load existing quest if ID exists, or clear for new quest
    useEffect(() => {
        console.log('[Mystery Setup] useEffect triggered, questId:', questId);
        if (!questId) {
            console.log('[Mystery Setup] No questId, skipping load');
            return;
        }

        // 新規クエスト作成フラグをチェック（ID紐付け）
        const initStatus = localStorage.getItem(`quest-init-status:${questId}`);
        console.log('[Mystery Setup] Init status:', initStatus);
        if (initStatus === 'pending') {
            // 新規クエストの場合は入力欄をクリアしてフラグを完了に更新
            console.log('[Mystery Setup] New quest, clearing fields');
            setTitle('');
            setDescription('');
            setLocation('');
            setMapCenter({ lat: 35.6804, lng: 139.769 }); // デフォルト位置（東京）
            localStorage.setItem(`quest-init-status:${questId}`, 'done');
            return;
        }

        // 既存クエスト（かつ初期化済み）の場合はDBからデータを読み込む
        const loadQuest = async () => {
            console.log('[Mystery Setup] Loading quest from DB, id:', questId);
            const { data, error } = await supabase.from('quests').select('*').eq('id', questId).maybeSingle();
            console.log('[Mystery Setup] DB response:', { data, error });
            if (error) {
                console.warn('[Mystery Setup] Quest fetch error:', error);
                return;
            }
            if (data) {
                console.log('[Mystery Setup] Setting fields from data:', {
                    title: data.title,
                    description: data.description,
                    area_name: data.area_name
                });
                setTitle(data.title || '');
                setDescription(data.description || '');
                setLocation(data.area_name || '');
                setCoverImage(data.cover_image_url || '');
                if (data.location_lat && data.location_lng) {
                    setMapCenter({ lat: data.location_lat, lng: data.location_lng });
                }
                // Load main_plot if exists
                if (data.main_plot) {
                    setMainPlot(data.main_plot as MainPlot);
                }
                if (!data.area_name) {
                    let coords: { lat: number; lng: number } | null = null;
                    if (data.location_lat && data.location_lng) {
                        coords = { lat: data.location_lat, lng: data.location_lng };
                    } else {
                        const { data: spotData } = await supabase
                            .from('spots')
                            .select('lat, lng')
                            .eq('quest_id', questId)
                            .order('order_index', { ascending: true })
                            .limit(1)
                            .maybeSingle();
                        if (spotData?.lat && spotData?.lng) {
                            coords = { lat: spotData.lat, lng: spotData.lng };
                        }
                    }
                    if (coords) {
                        setMapCenter(coords);
                        const resolved = await resolveLocationFromCoords(coords.lat, coords.lng);
                        if (resolved) {
                            setLocation(resolved);
                            await supabase
                                .from('quests')
                                .update({ area_name: resolved, location_lat: coords.lat, location_lng: coords.lng })
                                .eq('id', questId);
                        }
                    }
                }
            } else {
                console.log('[Mystery Setup] No data found for questId:', questId);
            }
        };
        loadQuest();
    }, [questId]);

    // MapTiler logic removed in favor of Google Places Autocomplete

    const handleImageUpload = async (file: File) => {
        if (!questId || !user) return;
        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${questId}/cover.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('quest-images')
                .upload(fileName, file, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('quest-images')
                .getPublicUrl(fileName);
            setCoverImage(publicUrl);
        } catch (err) {
            console.error('Image upload failed:', err);
            setSaveError('画像のアップロードに失敗しました');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (status: 'in_progress' | 'completed') => {
        console.log('[Mystery Setup] handleSave called with status:', status);
        if (!user) {
            setSaveError('ログインしてください');
            return;
        }
        if (!questId) {
            setSaveError('クエストIDが見つかりません');
            return;
        }
        setSaveError(null);
        setSaving(true);

        const dataToSave = {
            id: questId,
            creator_id: user.id,
            title,
            description,
            area_name: location,
            location_lat: mapCenter.lat,
            location_lng: mapCenter.lng,
            cover_image_url: coverImage,
            main_plot: mainPlot,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        };
        console.log('[Mystery Setup] Data to save:', dataToSave);

        try {
            // Upsert quest data (insert if not exists, update if exists)
            const { data, error } = await supabase
                .from('quests')
                .upsert(dataToSave, { onConflict: 'id' })
                .select();

            console.log('[Mystery Setup] Save response:', { data, error });

            if (error) throw error;

            // Save step status to localStorage for UI display
            localStorage.setItem(`step-status:${questId}:1`, status);
            console.log('[Mystery Setup] Save successful, navigating to workspace');

            // Navigate to workspace
            navigate('/creator/workspace');
        } catch (err: any) {
            console.error('[Mystery Setup] Error saving quest:', err);
            setSaveError('保存に失敗しました: ' + (err.message || '不明なエラー'));
        } finally {
            setSaving(false);
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
                            <span className="text-brand-dark px-2 py-1 bg-brand-gold/10 rounded">Step 1: Basics</span>
                            <span>›</span>
                            <span>Step 2: Spots</span>
                            <span>›</span>
                            <span>Step 3: Story</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 grid lg:grid-cols-12 min-h-0 bg-stone-50">
                    {/* Form Panel */}
                    <div className="lg:col-span-5 xl:col-span-4 bg-white border-r border-stone-200 shadow-xl z-10 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
                        <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
                            <button onClick={() => navigate('/creator/workspace')} className="text-xs font-bold text-stone-500 hover:text-brand-dark flex items-center gap-1 mb-6 transition-colors">
                                <span className="text-lg">‹</span> Back to Workspace
                            </button>

                            <div className="mb-8">
                                <h1 className="text-3xl font-serif font-bold text-brand-dark mb-2">基本情報を入力</h1>
                                <p className="text-sm text-stone-500 leading-relaxed">
                                    クエストの第一歩です。舞台となるエリアと、プレイヤーを惹きつけるタイトルを決めましょう。
                                </p>
                            </div>

                            <div className="space-y-8">
                                {/* Location */}
                                <div className="space-y-2 group">
                                    <label className="text-sm font-bold text-brand-dark flex items-center gap-2">
                                        開催エリア <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-full">必須</span>
                                    </label>
                                    <div className="relative transition-all group-focus-within:ring-4 ring-brand-gold/10 rounded-xl">
                                        <PlaceAutocompleteInput
                                            value={location}
                                            onPlaceSelect={(place) => {
                                                if (place.formatted_address) setLocation(place.formatted_address);
                                                if (place.geometry?.location) {
                                                    setMapCenter({
                                                        lat: place.geometry.location.lat(),
                                                        lng: place.geometry.location.lng()
                                                    });
                                                }
                                                setSuggestions([]);
                                            }}
                                            placeholder="都市名・駅名で検索..."
                                            className="w-full px-4 py-4 rounded-xl border-2 border-stone-100 bg-stone-50 text-sm font-bold text-brand-dark placeholder:text-stone-400 focus:outline-none focus:border-brand-gold/50 focus:bg-white transition-all shadow-sm"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                                            🔍
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-stone-400 pl-1">
                                        ※ 地図上のクリックでも場所を指定・修正できます
                                    </p>
                                </div>

                                {/* Title */}
                                <div className="space-y-2 group">
                                    <label className="text-sm font-bold text-brand-dark flex items-center gap-2">
                                        クエスト名 <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-full">必須</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="例：古都の影と消えた時計台"
                                        className="w-full px-4 py-4 rounded-xl border-2 border-stone-100 bg-stone-50 text-sm font-bold text-brand-dark placeholder:text-stone-400 focus:outline-none focus:border-brand-gold/50 focus:bg-white focus:ring-4 ring-brand-gold/10 transition-all shadow-sm"
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-2 group">
                                    <label className="text-sm font-bold text-brand-dark flex items-center gap-2">
                                        導入ストーリー <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-full">必須</span>
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={4}
                                        placeholder="100年前から伝わる奇妙な噂..."
                                        className="w-full px-4 py-4 rounded-xl border-2 border-stone-100 bg-stone-50 text-sm leading-relaxed text-brand-dark placeholder:text-stone-400 focus:outline-none focus:border-brand-gold/50 focus:bg-white focus:ring-4 ring-brand-gold/10 transition-all shadow-sm resize-none"
                                    />
                                </div>

                                {/* Cover Image */}
                                <div className="space-y-2 group">
                                    <label className="text-sm font-bold text-brand-dark flex items-center gap-2">
                                        カバー画像 <span className="text-[10px] text-stone-400 font-normal bg-stone-100 px-2 py-0.5 rounded-full">任意</span>
                                    </label>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImageUpload(file);
                                        }}
                                    />
                                    {coverImage ? (
                                        <div className="relative rounded-xl overflow-hidden border-2 border-stone-100">
                                            <img
                                                src={coverImage}
                                                alt="Cover"
                                                className="w-full aspect-video object-cover"
                                            />
                                            <div className="absolute top-2 right-2 flex gap-2">
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="p-2 rounded-lg bg-white/90 backdrop-blur text-stone-600 hover:bg-white transition-colors shadow-sm"
                                                >
                                                    <Upload size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setCoverImage('')}
                                                    className="p-2 rounded-lg bg-white/90 backdrop-blur text-rose-500 hover:bg-white transition-colors shadow-sm"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            className="w-full aspect-video rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-brand-gold/50 transition-all flex flex-col items-center justify-center gap-3 text-stone-400 disabled:opacity-50"
                                        >
                                            {uploading ? (
                                                <>
                                                    <Loader2 size={32} className="animate-spin" />
                                                    <span className="text-sm font-medium">アップロード中...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Image size={32} />
                                                    <span className="text-sm font-medium">クリックして画像をアップロード</span>
                                                    <span className="text-xs text-stone-400">推奨: 1200x675px (16:9)</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Main Plot Section (物語骨格) - Collapsible */}
                                <div className="space-y-2 group">
                                    <button
                                        onClick={() => setMainPlotExpanded(!mainPlotExpanded)}
                                        className="w-full flex items-center justify-between text-sm font-bold text-brand-dark hover:text-brand-gold transition-colors"
                                    >
                                        <span className="flex items-center gap-2">
                                            <BookOpen size={16} />
                                            物語骨格
                                            <span className="text-[10px] text-stone-400 font-normal bg-stone-100 px-2 py-0.5 rounded-full">任意・上級者向け</span>
                                        </span>
                                        {mainPlotExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>

                                    {mainPlotExpanded && (
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                            <p className="text-xs text-stone-500">
                                                物語の設計図を定義します。入力しておくと、AI生成時により一貫したストーリーが作られます。
                                            </p>

                                            {/* Premise */}
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-stone-600">前提（Premise）</label>
                                                <textarea
                                                    value={mainPlot.premise}
                                                    onChange={(e) => setMainPlot({ ...mainPlot, premise: e.target.value })}
                                                    placeholder="例: 江戸時代、ある豪商が残した宝の地図が発見された..."
                                                    rows={2}
                                                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm placeholder:text-stone-300 focus:outline-none focus:border-indigo-300 focus:ring-2 ring-indigo-100 transition-all resize-none"
                                                />
                                            </div>

                                            {/* Goal */}
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-stone-600">目的（Goal）</label>
                                                <input
                                                    type="text"
                                                    value={mainPlot.goal}
                                                    onChange={(e) => setMainPlot({ ...mainPlot, goal: e.target.value })}
                                                    placeholder="例: 宝の在処を突き止める"
                                                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm placeholder:text-stone-300 focus:outline-none focus:border-indigo-300 focus:ring-2 ring-indigo-100 transition-all"
                                                />
                                            </div>

                                            {/* Antagonist/Mystery */}
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-stone-600">対立/謎（Antagonist or Mystery）</label>
                                                <input
                                                    type="text"
                                                    value={mainPlot.antagonist}
                                                    onChange={(e) => setMainPlot({ ...mainPlot, antagonist: e.target.value })}
                                                    placeholder="例: 何者かが宝を守るため、巧妙な暗号を残した"
                                                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm placeholder:text-stone-300 focus:outline-none focus:border-indigo-300 focus:ring-2 ring-indigo-100 transition-all"
                                                />
                                            </div>

                                            {/* Final Reveal */}
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-stone-600">真相（Final Reveal Outline）</label>
                                                <textarea
                                                    value={mainPlot.finalReveal}
                                                    onChange={(e) => setMainPlot({ ...mainPlot, finalReveal: e.target.value })}
                                                    placeholder="例: 宝とは金銀財宝ではなく、豪商が人々と築いた信頼関係だった..."
                                                    rows={2}
                                                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm placeholder:text-stone-300 focus:outline-none focus:border-indigo-300 focus:ring-2 ring-indigo-100 transition-all resize-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                {(() => {
                                    const isFormComplete = location.trim() !== '' && title.trim() !== '' && description.trim() !== '';
                                    return (
                                        <div className="flex gap-3 pt-4">
                                            <button
                                                onClick={() => handleSave('in_progress')}
                                                disabled={saving}
                                                className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-700 font-bold text-sm hover:bg-stone-200 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                                            >
                                                {saving ? <span className="animate-spin">⏳</span> : null}
                                                一時保存する
                                            </button>
                                            <button
                                                onClick={() => handleSave('completed')}
                                                disabled={saving || !isFormComplete}
                                                title={!isFormComplete ? '全ての入力欄を埋めてください' : ''}
                                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isFormComplete
                                                    ? 'bg-brand-dark text-white hover:bg-brand-gold hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70'
                                                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                {saving ? <span className="animate-spin">⏳</span> : null}
                                                完了する
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>

                            {saveError && <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 text-xs font-bold">{saveError}</div>}
                        </div>
                    </div>

                    {/* Map Panel */}
                    <div className="lg:col-span-7 xl:col-span-8 relative bg-stone-200">
                        <Map
                            mapId="bf51a910020fa25a"
                            defaultCenter={mapCenter}
                            defaultZoom={11}
                            gestureHandling={'greedy'}
                            disableDefaultUI={false}
                            className="w-full h-full"
                        >
                            <MapHandler
                                mapCenter={mapCenter}
                                onMapClick={(lat, lng) => setMapCenter({ lat, lng })}
                                onReverseGeocode={(address) => setLocation(address)}
                                locationQuery={location}
                            />
                        </Map>

                        {/* Map overlay hint */}
                        <div className="absolute top-6 left-6 right-6 pointer-events-none md:flex justify-center hidden">
                            <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-white/50">
                                <p className="text-xs font-bold text-stone-600 flex items-center gap-2">
                                    <span>📍</span> マップをクリックして中心地を調整できます
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </section>
        </APIProvider>
    );
}
