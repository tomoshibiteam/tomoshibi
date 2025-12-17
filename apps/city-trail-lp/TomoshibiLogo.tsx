import React from 'react';

export const TomoshibiLogo = ({ className = "h-8", color = "#484132" }: { className?: string, color?: string }) => (
    <svg viewBox="0 0 220 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="TOMOSHIBI Logo">
        <text x="0" y="30" fontSize="28" fontWeight="bold" fontFamily="'Noto Sans JP', sans-serif" fill={color} letterSpacing="0.05em">TOMOSHIBI</text>
        <g transform="translate(175, 4)">
            {/* Keyhole Shape */}
            <path d="M16 0C7.2 0 0 7.2 0 16C0 22.1 3.4 27.3 8.3 30V36H23.7V30C28.6 27.3 32 22.1 32 16C32 7.2 24.8 0 16 0Z" fill={color} />
            {/* Flame Shape */}
            <path d="M16 26C16 26 21 20 21 14C21 11 19 9 16 6C13 9 11 11 11 14C11 20 16 26 16 26Z" fill="#fbbf24" />
            {/* Rays/Sparks */}
            <path d="M16 3V5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
            <path d="M9 6L10.5 7.5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
            <path d="M23 6L21.5 7.5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        </g>
    </svg>
);
