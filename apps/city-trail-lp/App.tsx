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
const SubscriptionPage = lazy(() => import('./SubscriptionPage'));

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
                    <Route path="/subscription" element={<SubscriptionPage />} />
                    <Route path="*" element={<LandingPage />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
