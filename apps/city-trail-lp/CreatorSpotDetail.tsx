import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TomoshibiLogo } from './TomoshibiLogo';
import { supabase } from './supabaseClient';
import {
    ArrowLeft,
    ArrowRight,
    Bold,
    Italic,
    Strikethrough,
    Link as LinkIcon,
    Heading,
    Quote,
    List,
    ListOrdered,
    Undo,
    Redo,
    Image as ImageIcon,
    Music,
    Mic,
    Upload,
    CheckCircle,
    Target,
    Loader2 as Spinner
} from 'lucide-react';

const RichTextToolbar = () => (
    <div className="flex items-center gap-1 p-2 border-b border-stone-200 bg-stone-50/50 backdrop-blur overflow-x-auto sticky top-0 z-10">
        <button className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"><Bold size={16} /></button>
        <button className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"><Italic size={16} /></button>
        <button className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"><Strikethrough size={16} /></button>
        <div className="w-px h-4 bg-stone-300 mx-2" />
        <button className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"><LinkIcon size={16} /></button>
        <button className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"><Heading size={16} /></button>
        <button className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"><Quote size={16} /></button>
        <div className="w-px h-4 bg-stone-300 mx-2" />
        <button className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"><List size={16} /></button>
        <button className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"><ListOrdered size={16} /></button>
        <div className="w-px h-4 bg-stone-300 mx-2" />
        <button className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"><Undo size={16} /></button>
        <button className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"><Redo size={16} /></button>
    </div>
);

const FileUploadArea = ({ label, formats }: { label: string, formats: string }) => (
    <div className="mt-3 group">
        <div className="border-2 border-dashed border-stone-200 rounded-xl p-6 flex flex-col items-center justify-center text-stone-400 hover:text-brand-dark hover:border-brand-gold/50 hover:bg-brand-gold/5 transition-all cursor-pointer bg-stone-50">
            <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                <Upload size={20} className="opacity-70 group-hover:opacity-100 group-hover:text-brand-gold" />
            </div>
            <span className="text-sm font-bold text-stone-600 group-hover:text-brand-dark">{label}</span>
            <span className="text-xs mt-1 text-stone-400">対応フォーマット: {formats}</span>
        </div>
    </div>
);

export default function CreatorSpotDetail() {
    const { spotId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Core Spot Data
    const [spotName, setSpotName] = useState('');
    const [spotAddress, setSpotAddress] = useState('');

    // Detail Data
    const [directions, setDirections] = useState('');

    const [challengeText, setChallengeText] = useState('');
    const [answerType, setAnswerType] = useState('text');
    const [answerText, setAnswerText] = useState('');

    const [hintText, setHintText] = useState('');
    const [factText, setFactText] = useState('');
    const [etc, setEtc] = useState('');

    useEffect(() => {
        if (spotId) {
            loadSpotData(spotId);
        }
    }, [spotId]);

    const loadSpotData = async (id: string) => {
        setLoading(true);
        // Load Spot
        const { data: spot, error: spotError } = await supabase
            .from('spots')
            .select('*')
            .eq('id', id)
            .single();

        if (spotError || !spot) {
            console.error('Error loading spot:', spotError);
            setLoading(false);
            return;
        }

        setSpotName(spot.name);
        setSpotAddress(spot.address);

        // Load Details
        const { data: details, error: detailError } = await supabase
            .from('spot_details')
            .select('*')
            .eq('spot_id', id)
            .single();

        if (details) {
            setDirections(details.nav_text || '');
            setChallengeText(details.question_text || '');
            setAnswerType(details.answer_type || 'text');
            setAnswerText(details.answer_text || '');
            setHintText(details.hint_text || '');
            setFactText(details.story_text || '');
            // NOTE: ETC is not in standard schema yet, using local state only or mapping to a generic field if possible
            // For now, we just keep it in state
        }

        setLoading(false);
    };

    const handleSave = async () => {
        if (!spotId) return;
        setSaving(true);

        const payload = {
            spot_id: spotId,
            nav_text: directions,
            question_text: challengeText,
            answer_type: answerType,
            answer_text: answerText,
            hint_text: hintText,
            story_text: factText,
            // Assuming we upsert
        };

        const { error } = await supabase
            .from('spot_details')
            .upsert(payload, { onConflict: 'spot_id' });

        setSaving(false);
        if (error) {
            alert('保存に失敗しました');
            console.error(error);
        } else {
            navigate('/creator/route-spots');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
            <div className="text-center">
                <Spinner className="w-8 h-8 mx-auto text-brand-gold mb-2" />
                <p className="text-sm font-bold text-stone-500">スポットデータを読み込み中...</p>
            </div>
        </div>
    );

    return (
        <section className="min-h-screen bg-stone-100/50 pb-20">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/creator/workspace')} className="hover:opacity-80 transition-opacity">
                            <TomoshibiLogo className="h-6 w-auto" />
                        </button>
                        <div className="h-6 w-px bg-stone-300 hidden md:block" />
                        <h1 className="font-bold text-stone-700 hidden md:block">スポット詳細編集</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/creator/route-spots')}
                            className="px-4 py-2 rounded-full font-bold text-stone-500 hover:bg-stone-100 transition-colors text-sm"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 rounded-full bg-brand-dark text-white font-bold text-sm hover:bg-brand-gold transition-colors shadow-lg disabled:opacity-70 flex items-center gap-2"
                        >
                            {saving ? <div className="animate-spin">⏳</div> : <CheckCircle size={16} />}
                            変更を保存
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 md:px-8 py-8 max-w-4xl">
                <button
                    onClick={() => navigate('/creator/route-spots')}
                    className="flex items-center gap-2 text-stone-500 hover:text-brand-dark mb-6 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                    <ArrowLeft size={16} />
                    スポット一覧に戻る
                </button>

                <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 border border-white overflow-hidden">
                    {/* Hero Section */}
                    <div className="p-8 md:p-10 border-b border-stone-100 bg-gradient-to-br from-stone-50 to-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                            <TomoshibiLogo className="w-64 h-64 grayscale" />
                        </div>
                        <div className="relative z-10">
                            <span className="text-xs font-bold text-brand-gold uppercase tracking-wider bg-brand-gold/10 px-3 py-1 rounded-full mb-4 inline-block">
                                選択中のスポット
                            </span>
                            <h2 className="text-4xl font-serif font-bold text-brand-dark mb-2 tracking-tight">{spotName}</h2>
                            <p className="text-stone-500 flex items-center gap-2 text-sm font-medium">
                                📍 {spotAddress}
                            </p>
                        </div>
                    </div>

                    <div className="p-8 md:p-10 space-y-16">
                        {/* Section 1: Directions */}
                        <div className="space-y-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                            <ArrowRight size={18} />
                                        </div>
                                        道順
                                    </h3>
                                    <p className="text-sm text-stone-500 pl-11">
                                        前のスポットからこの場所への行き方を記載してください。
                                    </p>
                                </div>
                            </div>

                            <div className="pl-11">
                                <div className="border border-stone-200 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-brand-gold/10 transition-shadow bg-white shadow-sm hover:shadow-md">
                                    <RichTextToolbar />
                                    <textarea
                                        value={directions}
                                        onChange={e => setDirections(e.target.value)}
                                        className="w-full p-6 min-h-[120px] focus:outline-none resize-y text-stone-700 leading-relaxed placeholder:text-stone-300"
                                        placeholder="例: 駅を出て右に曲がり..."
                                    />
                                    <div className="bg-stone-50 px-4 py-2 text-right text-xs text-stone-400 border-t border-stone-100 font-mono">
                                        {directions.length} 文字
                                    </div>
                                </div>
                                <FileUploadArea
                                    label="写真/動画を追加（任意）"
                                    formats="jpg, png, mp3, mp4"
                                />
                            </div>
                        </div>

                        {/* Section 2: Challenge */}
                        <div className="space-y-6 relative">
                            {/* Decorative vertical line connecting sections */}
                            <div className="absolute left-4 -top-16 bottom-0 w-px bg-stone-100 -z-10" />

                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                                            <Target size={18} />
                                        </div>
                                        謎/チャレンジ
                                    </h3>
                                    <p className="text-sm text-stone-500 pl-11">
                                        この場所に関連する謎や問題を作成してください。
                                    </p>
                                </div>
                            </div>

                            <div className="pl-11 space-y-6">
                                <div className="border border-stone-200 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-brand-gold/10 transition-shadow bg-white shadow-sm hover:shadow-md">
                                    <RichTextToolbar />
                                    <textarea
                                        value={challengeText}
                                        onChange={e => setChallengeText(e.target.value)}
                                        className="w-full p-6 min-h-[120px] focus:outline-none resize-y text-stone-700 leading-relaxed placeholder:text-stone-300"
                                        placeholder="例: 石碑には何と書かれていますか？"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-300 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 rounded-full bg-stone-200 text-stone-500 group-hover:bg-brand-dark group-hover:text-white transition-colors">
                                                <Music size={16} />
                                            </div>
                                            <span className="text-sm font-bold text-stone-600">BGM</span>
                                        </div>
                                        <p className="text-xs text-stone-400">雰囲気設定</p>
                                    </div>
                                    <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-300 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 rounded-full bg-stone-200 text-stone-500 group-hover:bg-brand-dark group-hover:text-white transition-colors">
                                                <Mic size={16} />
                                            </div>
                                            <span className="text-sm font-bold text-stone-600">ナレーション</span>
                                        </div>
                                        <p className="text-xs text-stone-400">音声を追加</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Answer & Hint */}
                        <div className="grid md:grid-cols-2 gap-8 pl-11">
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-brand-dark">回答設定</h3>
                                <div className="space-y-4 p-5 rounded-2xl bg-stone-50 border border-stone-200">
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">回答タイプ</label>
                                        <select
                                            value={answerType}
                                            onChange={e => setAnswerType(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white focus:ring-2 focus:ring-brand-gold/20 outline-none font-bold text-brand-dark text-sm"
                                        >
                                            <option value="text">テキスト入力</option>
                                            <option value="choice">選択式</option>
                                            <option value="number">数値</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">正解</label>
                                        <input
                                            type="text"
                                            value={answerText}
                                            onChange={e => setAnswerText(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white focus:ring-2 focus:ring-brand-gold/20 outline-none font-bold text-brand-dark text-sm"
                                            placeholder="例: 1984, 1984年"
                                        />
                                        <p className="text-[10px] text-stone-400 mt-1.5">* 複数の正解はカンマで区切ってください</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                                    ヒント <span className="bg-brand-gold/20 text-brand-dark text-[10px] px-2 py-0.5 rounded-full">任意</span>
                                </h3>
                                <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
                                    <textarea
                                        value={hintText}
                                        onChange={e => setHintText(e.target.value)}
                                        className="w-full p-4 min-h-[180px] focus:outline-none resize-y text-sm"
                                        placeholder="詰まったプレイヤー向けのヒントを入力..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Story/Facts */}
                        <div className="space-y-6 pt-6 border-t border-stone-100">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                            <Bold size={18} />
                                        </div>
                                        ストーリー / 豆知識
                                    </h3>
                                    <p className="text-sm text-stone-500 pl-11">
                                        このスポットにまつわる物語や歴史を記載してください。
                                    </p>
                                </div>
                            </div>

                            <div className="pl-11">
                                <div className="border border-stone-200 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-brand-gold/10 transition-shadow bg-white shadow-sm hover:shadow-md">
                                    <RichTextToolbar />
                                    <textarea
                                        value={factText}
                                        onChange={e => setFactText(e.target.value)}
                                        className="w-full p-6 min-h-[200px] focus:outline-none resize-y text-stone-700 leading-relaxed placeholder:text-stone-300"
                                        placeholder="ストーリーを入力してください..."
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}
