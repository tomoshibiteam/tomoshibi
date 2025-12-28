import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Users, Heart, Target, Globe2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Types for translation support
interface AboutPageTranslations {
    nav: { about: string };
    aboutPage: {
        title: string;
        subtitle: string;
        missionTitle: string;
        missionText: string;
        visionTitle: string;
        visionText: string;
        valuesTitle: string;
        values: { title: string; description: string }[];
        teamTitle: string;
        teamSubtitle: string;
        members: { name: string; role: string; bio: string }[];
        backToHome: string;
    };
}

interface AboutPageProps {
    t: AboutPageTranslations;
    onLogoHome?: () => void;
}

// Tomoshibi Logo component
const TomoshibiLogo = ({ className = "h-8", color = "#484132" }: { className?: string, color?: string }) => (
    <svg viewBox="0 0 220 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="TOMOSHIBI Logo">
        <text x="0" y="30" fontSize="28" fontWeight="bold" fontFamily="'Noto Sans JP', sans-serif" fill={color} letterSpacing="0.05em">TOMOSHIBI</text>
        <g transform="translate(175, 4)">
            <path d="M16 0C7.2 0 0 7.2 0 16C0 22.1 3.4 27.3 8.3 30V36H23.7V30C28.6 27.3 32 22.1 32 16C32 7.2 24.8 0 16 0Z" fill={color} />
            <path d="M16 26C16 26 21 20 21 14C21 11 19 9 16 6C13 9 11 11 11 14C11 20 16 26 16 26Z" fill="#fbbf24" />
            <path d="M16 3V5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
            <path d="M9 6L10.5 7.5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
            <path d="M23 6L21.5 7.5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        </g>
    </svg>
);

// Value icons
const VALUE_ICONS = [Heart, Target, Globe2, Users];

export default function AboutPage({ t, onLogoHome }: AboutPageProps) {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onLogoHome) {
            onLogoHome();
        } else {
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-brand-base">
            {/* Header */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-stone-200 z-50">
                <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-stone-600 hover:text-brand-dark transition-colors"
                    >
                        <ChevronLeft size={20} />
                        <span className="text-sm font-medium">{t.aboutPage.backToHome}</span>
                    </button>
                    <button onClick={handleBack}>
                        <TomoshibiLogo className="h-6 w-auto" color="#484132" />
                    </button>
                    <div className="w-24" /> {/* Spacer for centering */}
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-20 md:py-32 bg-gradient-to-b from-brand-base to-white">
                <div className="container mx-auto px-4 md:px-8 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="inline-block px-4 py-1.5 bg-brand-gold/10 text-brand-gold text-sm font-bold rounded-full mb-6">
                            About Us
                        </span>
                        <h1 className="text-4xl md:text-6xl font-serif font-bold text-brand-dark mb-6 whitespace-pre-line">
                            {t.aboutPage.title}
                        </h1>
                        <p className="text-lg md:text-xl text-stone-600 max-w-2xl mx-auto">
                            {t.aboutPage.subtitle}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Mission & Vision */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 md:px-8">
                    <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="bg-gradient-to-br from-brand-gold/5 to-amber-50 rounded-3xl p-8 md:p-10 border border-brand-gold/20"
                        >
                            <div className="w-14 h-14 bg-brand-gold/20 rounded-2xl flex items-center justify-center mb-6">
                                <Target className="w-7 h-7 text-brand-gold" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-serif font-bold text-brand-dark mb-4">
                                {t.aboutPage.missionTitle}
                            </h2>
                            <p className="text-stone-600 leading-relaxed">
                                {t.aboutPage.missionText}
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl p-8 md:p-10 border border-violet-200/50"
                        >
                            <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mb-6">
                                <Globe2 className="w-7 h-7 text-violet-600" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-serif font-bold text-brand-dark mb-4">
                                {t.aboutPage.visionTitle}
                            </h2>
                            <p className="text-stone-600 leading-relaxed">
                                {t.aboutPage.visionText}
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="py-20 bg-brand-base">
                <div className="container mx-auto px-4 md:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-brand-dark">
                            {t.aboutPage.valuesTitle}
                        </h2>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        {t.aboutPage.values.map((value, index) => {
                            const Icon = VALUE_ICONS[index % VALUE_ICONS.length];
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 hover:shadow-lg hover:border-brand-gold/30 transition-all"
                                >
                                    <div className="w-12 h-12 bg-brand-gold/10 rounded-xl flex items-center justify-center mb-4">
                                        <Icon className="w-6 h-6 text-brand-gold" />
                                    </div>
                                    <h3 className="text-lg font-bold text-brand-dark mb-2">{value.title}</h3>
                                    <p className="text-sm text-stone-600">{value.description}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Team Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 md:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-brand-dark mb-4">
                            {t.aboutPage.teamTitle}
                        </h2>
                        <p className="text-stone-600 max-w-2xl mx-auto">
                            {t.aboutPage.teamSubtitle}
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {t.aboutPage.members.map((member, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="group bg-gradient-to-br from-stone-50 to-white rounded-2xl p-6 border border-stone-100 hover:border-brand-gold/30 hover:shadow-lg transition-all"
                            >
                                <div className="w-20 h-20 bg-gradient-to-br from-brand-gold/20 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                                    <Users className="w-8 h-8 text-brand-gold" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-brand-dark mb-1">{member.name}</h3>
                                    <p className="text-sm font-medium text-brand-gold mb-3">{member.role}</p>
                                    <p className="text-sm text-stone-600 leading-relaxed">{member.bio}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-brand-dark py-10">
                <div className="container mx-auto px-4 md:px-8 text-center">
                    <TomoshibiLogo className="h-8 w-auto mx-auto mb-4" color="#78716c" />
                    <p className="text-xs text-stone-500">
                        &copy; {new Date().getFullYear()} TOMOSHIBI. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
