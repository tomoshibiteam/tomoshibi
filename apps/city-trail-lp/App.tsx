import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Lazy load all route components for code splitting
const LandingPage = lazy(() => import('./LandingPage'));
const CreatorRouteSpots = lazy(() => import('./CreatorRouteSpots'));
const CreatorMysterySetup = lazy(() => import('./CreatorMysterySetup'));
const CreatorSpotDetail = lazy(() => import('./CreatorSpotDetail'));
const CreatorStorytelling = lazy(() => import('./CreatorStorytelling'));
const CreatorTestRun = lazy(() => import('./CreatorTestRun'));
const CreatorMultilingual = lazy(() => import('./CreatorMultilingual'));
const BusinessLandingPage = lazy(() => import('./BusinessLandingPage'));
const AboutPage = lazy(() => import('./AboutPage'));

// Loading skeleton component
const LoadingSkeleton = () => (
    <div className="min-h-screen bg-brand-base flex flex-col items-center justify-center">
        <div className="text-center">
            {/* Logo placeholder */}
            <div className="mb-6">
                <div className="text-3xl font-serif font-bold text-brand-dark tracking-wider">
                    TOMOSHIBI
                </div>
            </div>
            {/* Loading spinner */}
            <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-2 h-2 bg-brand-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-brand-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-brand-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-sm text-stone-500">読み込み中...</p>
        </div>
    </div>
);

export default function App() {
    return (
        <BrowserRouter>
            <Suspense fallback={<LoadingSkeleton />}>
                <Routes>
                    <Route path="/creator/mystery-setup" element={<CreatorMysterySetup />} />
                    <Route path="/creator/route-spots" element={<CreatorRouteSpots />} />
                    <Route path="/creator/route-spots/:spotId" element={<CreatorSpotDetail />} />
                    <Route path="/creator/storytelling" element={<CreatorStorytelling />} />
                    <Route path="/creator/test-run" element={<CreatorTestRun />} />
                    <Route path="/creator/workspace/languages" element={<CreatorMultilingual />} />
                    <Route path="/business" element={<BusinessLandingPage />} />
                    <Route path="/about" element={<AboutPage t={{
                        nav: { about: 'TOMOSHIBIについて' },
                        aboutPage: {
                            title: 'TOMOSHIBIについて',
                            subtitle: '街歩き×謎解きで、日常を冒険に変える',
                            missionTitle: 'Mission',
                            missionText: '私たちは、テクノロジーと物語の力で、人々が街を歩き、発見し、つながる新しい体験を創造します。日常の風景に隠された物語を解き明かすことで、街への愛着と人々の絆を深めます。',
                            visionTitle: 'Vision',
                            visionText: '世界中の街が、物語で彩られる未来。TOMOSHIBIは、ローカルの魅力を世界に届け、旅行者と地域をつなぐプラットフォームを目指します。',
                            valuesTitle: '私たちの価値観',
                            values: [
                                { title: '冒険心', description: '未知への好奇心を大切にし、新しい発見を楽しむ心を育みます。' },
                                { title: '地域愛', description: '街の歴史や文化を尊重し、地域の魅力を再発見する機会を提供します。' },
                                { title: 'つながり', description: '人と人、人と街をつなぎ、共有体験を通じて絆を深めます。' },
                                { title: '創造性', description: 'クリエイターの自由な発想を支援し、多様な物語を世界に届けます。' },
                            ],
                            teamTitle: '【作成中】運営チーム',
                            teamSubtitle: 'TOMOSHIBIを運営するメンバーを紹介します',
                            members: [
                                { name: 'メンバー 1', role: 'Founder / CEO', bio: 'TOMOSHIBIの創業者。街歩きと謎解きを通じて、新しい体験を創造することに情熱を注いでいます。' },
                                { name: 'メンバー 2', role: 'CTO', bio: '技術面でTOMOSHIBIを支える。ユーザー体験を最高にするための開発をリードしています。' },
                                { name: 'メンバー 3', role: 'クリエイティブディレクター', bio: 'ストーリーテリングとデザインを担当。没入感のある体験を設計しています。' },
                            ],
                            backToHome: 'ホームに戻る',
                        },
                    }} />} />
                    <Route path="*" element={<LandingPage />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
