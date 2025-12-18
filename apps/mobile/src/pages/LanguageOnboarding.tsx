/**
 * LanguageOnboarding - Initial language selection screen
 * 
 * Shown on first app launch to establish user's preferred language.
 * Detects device locale and recommends accordingly.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Check, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { savePreferredLanguage } from '@/hooks/useResolvedLanguage';

const LANGUAGES = [
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
];

const TRANSLATIONS = {
    ja: {
        title: '表示言語を選択',
        subtitle: 'おすすめの言語が自動で選択されています。後から変更できます。',
        recommended: 'おすすめ',
        continue: '続ける',
        footer: 'いつでも設定から変更できます',
    },
    en: {
        title: 'Choose your language',
        subtitle: 'We selected a recommended language for you. You can change it anytime.',
        recommended: 'Recommended',
        continue: 'Continue',
        footer: 'You can change this anytime in settings',
    },
    ko: {
        title: '언어를 선택하세요',
        subtitle: '추천 언어가 자동으로 선택되었습니다. 언제든 변경할 수 있어요.',
        recommended: '추천',
        continue: '계속',
        footer: '설정에서 언제든 변경할 수 있어요',
    },
};

function detectRecommendedLanguage(): string {
    const browserLang = navigator.language?.split('-')[0]?.toLowerCase() || 'ja';
    const supported = LANGUAGES.map(l => l.code);
    return supported.includes(browserLang) ? browserLang : 'ja';
}

export default function LanguageOnboarding() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [selectedLanguage, setSelectedLanguage] = useState<string>('');
    const [recommendedLanguage, setRecommendedLanguage] = useState<string>('ja');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const rec = detectRecommendedLanguage();
        setRecommendedLanguage(rec);
        setSelectedLanguage(rec);
    }, []);

    const t = TRANSLATIONS[selectedLanguage as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

    const handleContinue = async () => {
        setSaving(true);
        try {
            await savePreferredLanguage(user?.id || null, selectedLanguage);
            navigate('/quests');
        } catch (error) {
            console.error('Error saving language:', error);
            navigate('/quests');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#FEF9F3] via-[#F7E7D3] to-[#EDD9C0] flex flex-col items-center justify-center p-6">
            {/* Logo */}
            <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#F4A853] to-[#D87A32] shadow-lg mb-4">
                    <Globe className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-serif font-bold text-[#3D2E1F] tracking-wide">
                    TOMOSHIBI
                </h1>
            </div>

            {/* Card */}
            <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 text-center border-b border-[#E8D5BE]">
                    <h2 className="text-xl font-bold text-[#3D2E1F]">{t.title}</h2>
                    <p className="text-sm text-[#7A6652] mt-1">{t.subtitle}</p>
                </div>

                {/* Language Options */}
                <div className="p-6 space-y-3">
                    {LANGUAGES.map((lang) => {
                        const isSelected = selectedLanguage === lang.code;
                        const isRecommended = recommendedLanguage === lang.code;

                        return (
                            <button
                                key={lang.code}
                                onClick={() => setSelectedLanguage(lang.code)}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${isSelected
                                        ? 'border-[#D87A32] bg-[#D87A32]/10 shadow-md'
                                        : 'border-[#E8D5BE] hover:border-[#D87A32]/50 hover:bg-[#FEF9F3]'
                                    }`}
                            >
                                <span className="text-3xl">{lang.flag}</span>
                                <div className="flex-1 text-left">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-[#3D2E1F]">{lang.nativeName}</span>
                                        {isRecommended && (
                                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#D87A32]/20 text-[#D87A32] flex items-center gap-1">
                                                <Sparkles className="w-3 h-3" />
                                                {t.recommended}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-[#9B8A7A]">{lang.name}</span>
                                </div>
                                {isSelected && (
                                    <div className="w-6 h-6 rounded-full bg-[#D87A32] flex items-center justify-center">
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Continue Button */}
                <div className="px-6 pb-6">
                    <button
                        onClick={handleContinue}
                        disabled={!selectedLanguage || saving}
                        className="w-full py-4 bg-gradient-to-r from-[#F4A853] to-[#D87A32] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? '...' : t.continue}
                    </button>
                    <p className="text-xs text-[#9B8A7A] text-center mt-3">{t.footer}</p>
                </div>
            </div>
        </div>
    );
}
