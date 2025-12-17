import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin,
    Navigation,
    Menu,
    X,
    ChevronUp,
    Compass,
    ScanLine,
    Lightbulb,
    Gift
} from 'lucide-react';
import { TomoshibiLogo } from './TomoshibiLogo';

// Environment variables
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Mock Data for Demo
const MOCK_QUEST = {
    id: 'q1',
    title: '渋谷路地裏・タイムトラベル',
    storyVal: 85,
    currentStep: 2,
    totalSteps: 5,
    currentObjective: '古い郵便ポストを探せ',
    nextHint: '赤くて丸い、昔ながらの形をしている。',
    targetLocation: { lat: 35.6604, lng: 139.7001 }, // Near Shibuya station
};

// Dark Mode Map Style
const MAP_STYLE = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#263c3f" }],
    },
    {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#6b9a76" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#38414e" }],
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#212a37" }],
    },
    {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#9ca5b3" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#746855" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#1f2835" }],
    },
    {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#f3d19c" }],
    },
    {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#2f3948" }],
    },
    {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#17263c" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#515c6d" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#17263c" }],
    },
];

const CompassOverlay = () => (
    <div className="absolute top-24 right-4 z-10">
        <div className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center shadow-lg">
            <Compass className="text-white/80 w-6 h-6" />
        </div>
    </div>
);

const UserLocationMarker = () => {
    return (
        <div className="relative flex items-center justify-center">
            <div className="absolute w-20 h-20 bg-brand-gold/20 rounded-full animate-ping" />
            <div className="absolute w-4 h-4 bg-brand-gold rounded-full border-2 border-white shadow-lg z-10" />
            {/* Direction Cone */}
            <div className="absolute w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[24px] border-t-brand-gold/30 -top-8 rotate-0" />
        </div>
    );
};

export default function PlayerGameView({ onBackHome }: { onBackHome: () => void }) {
    const [currentView, setCurrentView] = useState<'map' | 'ar' | 'menu'>('map');
    const [drawerOpen, setDrawerOpen] = useState(true);
    const [showHint, setShowHint] = useState(false);

    // Simulated location State
    const [userLoc, setUserLoc] = useState({ lat: 35.659, lng: 139.7005 });

    return (
        <div className="relative h-screen w-full bg-stone-900 overflow-hidden text-white font-sans">

            {/* --- Full Screen Map --- */}
            <div className="absolute inset-0 z-0">
                <APIProvider apiKey={API_KEY}>
                    <Map
                        defaultCenter={userLoc}
                        defaultZoom={17}
                        mapId="tomoshibi_game_map"
                        options={{
                            styles: MAP_STYLE,
                            disableDefaultUI: true,
                            zoomControl: false,
                            gestureHandling: 'greedy',
                        }}
                        className="w-full h-full"
                    >
                        <AdvancedMarker position={userLoc}>
                            <UserLocationMarker />
                        </AdvancedMarker>

                        {/* Quest Target Marker (Semi-hidden or vague area) */}
                        <AdvancedMarker position={MOCK_QUEST.targetLocation}>
                            <div className="w-32 h-32 bg-brand-gold/5 rounded-full border-2 border-brand-gold/30 border-dashed animate-[spin_10s_linear_infinite]" />
                        </AdvancedMarker>
                    </Map>
                </APIProvider>
            </div>

            {/* --- Top HUD --- */}
            <div className="absolute top-0 left-0 right-0 p-4 pt-12 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none">
                <div className="flex items-start justify-between pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <button onClick={onBackHome} className="w-10 h-10 bg-white/10 backdrop-blur rounded-full flex items-center justify-center border border-white/20">
                            <X size={20} />
                        </button>
                        <div>
                            <div className="px-2 py-0.5 bg-brand-gold text-brand-dark text-[10px] font-bold rounded-full inline-block mb-1">
                                QUEST IN PROGRESS
                            </div>
                            <h2 className="text-lg font-bold leading-none shadow-black drop-shadow-md">{MOCK_QUEST.title}</h2>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="text-2xl font-bold font-serif italic text-brand-gold drop-shadow-md">
                            {MOCK_QUEST.currentStep} <span className="text-sm text-white/60 not-italic font-sans">/ {MOCK_QUEST.totalSteps}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Map Overlays --- */}
            <CompassOverlay />

            {/* --- Bottom Drawer (Mission Control) --- */}
            <div className={`absolute bottom-0 left-0 right-0 transition-transform duration-500 z-20 ${drawerOpen ? 'translate-y-0' : 'translate-y-[85%]'}`}>
                {/* Drawer Handle */}
                <div
                    className="w-full h-8 flex justify-center items-center -mt-8 pt-4 pb-2 cursor-pointer pointer-events-auto"
                    onClick={() => setDrawerOpen(!drawerOpen)}
                >
                    <div className="w-12 h-1.5 bg-white/80 rounded-full shadow-lg" />
                </div>

                <div className="bg-stone-900/90 backdrop-blur-xl border-t border-white/10 rounded-t-[2rem] p-6 pb-12 shadow-2xl h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 text-brand-gold">
                            <Navigation size={18} className="animate-pulse" />
                            <span className="text-xs font-bold tracking-widest uppercase">Current Objective</span>
                        </div>
                        <button
                            onClick={() => setShowHint(!showHint)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-xs font-bold hover:bg-white/20 transition-colors"
                        >
                            <Lightbulb size={14} className={showHint ? "text-yellow-400" : "text-stone-400"} />
                            {showHint ? 'Hide Hint' : 'Need Hint?'}
                        </button>
                    </div>

                    <h3 className="text-2xl font-bold mb-4">{MOCK_QUEST.currentObjective}</h3>

                    <AnimatePresence>
                        {showHint && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-brand-gold/10 border border-brand-gold/30 p-4 rounded-xl mb-6 overflow-hidden"
                            >
                                <p className="text-sm text-brand-gold">{MOCK_QUEST.nextHint}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="grid grid-cols-2 gap-4">
                        <button className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-gold/80 to-brand-gold text-brand-dark p-4 rounded-2xl font-bold shadow-lg shadow-brand-gold/20 active:scale-95 transition-transform">
                            <ScanLine size={24} />
                            <span>Scan Object</span>
                        </button>
                        <button className="flex flex-col items-center justify-center gap-2 bg-stone-800 border border-white/10 p-4 rounded-2xl font-bold active:scale-95 transition-transform hover:bg-stone-700">
                            <Menu size={24} />
                            <span>Items</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Safe Area for mobile home bar --- */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-transparent" />
        </div>
    );
}
