/**
 * HeroGenerateSection - シンプルで見やすいプロンプト入力ヒーロー
 * 
 * Suno風の大きなプロンプト入力を中心に、
 * TOMOSHIBIの世界観を維持しつつクリーンなデザイン
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    ArrowRight,
    Loader2,
    ChevronDown,
    MapPin,
} from 'lucide-react';

// 背景画像（スライドショー用）
const LEFT_IMAGES = [
    '/images/hero-bg-1.png',
    '/images/hero-bg-3.png',
];

const RIGHT_IMAGES = [
    '/images/hero-bg-2.png',
    '/images/hero-bg-4.png',
];

// 例文プロンプト
const EXAMPLE_PROMPTS = [
    { text: '中之島で90分、レトロ建築×探偵ミステリー', emoji: '🏛️' },
    { text: '浅草で60分、食べ歩き×宝探し', emoji: '🍡' },
    { text: '京都で120分、歴史探訪×謎解き', emoji: '⛩️' },
];

interface HeroGenerateSectionProps {
    onNavigateToQuests?: () => void;
    translations?: {
        title: string;
        description: string;
    };
}

export default function HeroGenerateSection({
    onNavigateToQuests,
    translations,
}: HeroGenerateSectionProps) {
    const navigate = useNavigate();
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // スライドショー用のインデックス
    const [leftIndex, setLeftIndex] = useState(0);
    const [rightIndex, setRightIndex] = useState(0);

    // スライドショー効果
    useEffect(() => {
        const leftTimer = setInterval(() => {
            setLeftIndex((prev) => (prev + 1) % LEFT_IMAGES.length);
        }, 9000);

        const rightTimer = setInterval(() => {
            setRightIndex((prev) => (prev + 1) % RIGHT_IMAGES.length);
        }, 9000);

        return () => {
            clearInterval(leftTimer);
            clearInterval(rightTimer);
        };
    }, []);

    // 例文クリック
    const handleExampleClick = (example: string) => {
        setPrompt(example);
    };

    // 生成開始
    const handleGenerate = () => {
        if (!prompt.trim()) return;

        setIsLoading(true);

        // パラメータを構築
        const params = new URLSearchParams();
        params.set('prompt', prompt);

        // クエスト作成画面へ遷移（別ポートのため直接URL遷移）
        window.location.href = `http://localhost:4174/creator/canvas/?${params.toString()}`;
    };

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-stone-50 via-white to-amber-50/20" />

            {/* Subtle grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:48px_48px]" />

            {/* Ambient glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-gold/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Left slideshow */}
            <div className="absolute left-[5%] top-[20%] w-80 h-80 rounded-3xl overflow-hidden shadow-2xl pointer-events-none opacity-80 rotate-[-6deg]">
                <AnimatePresence mode="wait">
                    <motion.img
                        key={leftIndex}
                        src={LEFT_IMAGES[leftIndex]}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                    />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent" />
            </div>

            {/* Right slideshow */}
            <div className="absolute right-[5%] bottom-[15%] w-72 h-72 rounded-3xl overflow-hidden shadow-2xl pointer-events-none opacity-80 rotate-[8deg]">
                <AnimatePresence mode="wait">
                    <motion.img
                        key={rightIndex}
                        src={RIGHT_IMAGES[rightIndex]}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                    />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 pt-32 pb-20">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-5xl mx-auto text-center"
                >
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur border border-brand-gold/20 rounded-full text-sm font-medium text-brand-dark mb-8 shadow-sm">
                        <Sparkles size={16} className="text-brand-gold" />
                        AIクエストジェネレーター
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-brand-dark leading-tight mb-6">
                        {translations?.title?.split('\n')[0] || 'いつもの街が、'}
                        <br />
                        <span className="text-brand-gold">
                            {translations?.title?.split('\n')[1] || '冒険の舞台に。'}
                        </span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-lg text-stone-600 mb-12 max-w-2xl mx-auto">
                        あなたのアイデアを入力するだけ。<br className="hidden sm:block" />
                        AIが街歩き×謎解きのウォーキングクエストを自動生成します。
                    </p>

                    {/* ========== MAIN INPUT ========== */}
                    <div className="relative max-w-4xl mx-auto mb-8">
                        <div className="relative bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200 overflow-hidden">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="どんなクエストを作りたいですか？&#10;例：大阪・中之島で90分、レトロ建築を巡る探偵ミステリー"
                                className="w-full px-6 py-5 text-lg bg-transparent resize-none focus:outline-none placeholder:text-stone-400 min-h-[120px]"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
                                        e.preventDefault();
                                        handleGenerate();
                                    }
                                }}
                            />

                            {/* Bottom bar */}
                            <div className="flex items-center justify-between px-4 py-3 bg-stone-50 border-t border-stone-100">
                                <span className="text-xs text-stone-400">
                                    Enter で生成開始
                                </span>
                                <button
                                    onClick={handleGenerate}
                                    disabled={!prompt.trim() || isLoading}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-brand-gold to-amber-500 text-white font-bold rounded-xl shadow-lg shadow-brand-gold/25 hover:shadow-xl hover:shadow-brand-gold/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    {isLoading ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <>
                                            クエストを生成
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ========== EXAMPLE PROMPTS ========== */}
                    <div className="flex flex-wrap justify-center gap-3 mb-16">
                        <span className="text-sm text-stone-400 mr-2">試してみる:</span>
                        {EXAMPLE_PROMPTS.map((example, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleExampleClick(example.text)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-white border border-stone-200 hover:border-brand-gold/50 rounded-full text-sm text-stone-600 hover:text-brand-dark transition-all shadow-sm hover:shadow"
                            >
                                <span>{example.emoji}</span>
                                <span className="hidden sm:inline">{example.text.slice(0, 20)}...</span>
                                <span className="sm:hidden">{example.text.split('、')[0]}</span>
                            </button>
                        ))}
                    </div>

                    {/* ========== SUB CTA ========== */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
                        <button
                            onClick={onNavigateToQuests}
                            className="flex items-center gap-2 text-stone-500 hover:text-brand-dark transition-colors"
                        >
                            <MapPin size={16} />
                            既存のクエストを探す
                            <ChevronDown size={14} className="rotate-[-90deg]" />
                        </button>
                    </div>
                </motion.div>

                {/* Scroll indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
                >
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        <ChevronDown size={24} className="text-stone-300" />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
