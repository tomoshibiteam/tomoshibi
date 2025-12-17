// PlayerLanguageSelector.tsx - Language selection UI for players before starting a quest
import React from 'react';
import { Globe, Check, AlertTriangle } from 'lucide-react';

export type TranslationQuality = 'full' | 'reviewed' | 'auto' | 'partial' | 'not_available';

interface LanguageOption {
    code: string;
    quality: TranslationQuality;
    hasHighDependency?: boolean; // Some puzzles require Japanese
}

interface PlayerLanguageSelectorProps {
    availableLanguages: string[];
    languageOptions?: LanguageOption[];
    selectedLanguage: string;
    onSelectLanguage: (lang: string) => void;
    onConfirm: () => void;
    className?: string;
}

const LANGUAGE_INFO: Record<string, { name: string; nativeName: string; flag: string }> = {
    ja: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
    en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
    zh: { name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳' },
    ko: { name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
};

const QUALITY_LABELS: Record<TranslationQuality, { en: string; ja: string; ko: string; color: string }> = {
    full: { en: 'Fully Supported', ja: 'フル対応', ko: '완전 지원', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    reviewed: { en: 'Reviewed', ja: 'レビュー済み', ko: '검토됨', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    auto: { en: 'Auto-translated', ja: '自動翻訳', ko: '자동 번역', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    partial: { en: 'Some Japanese Required', ja: '一部日本語必要', ko: '일부 일본어 필요', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    not_available: { en: 'Not Available', ja: '未対応', ko: '지원 안함', color: 'bg-stone-100 text-stone-500 border-stone-200' },
};

export default function PlayerLanguageSelector({
    availableLanguages,
    languageOptions,
    selectedLanguage,
    onSelectLanguage,
    onConfirm,
    className = '',
}: PlayerLanguageSelectorProps) {
    const getQuality = (lang: string): TranslationQuality => {
        if (lang === 'ja') return 'full';
        const opt = languageOptions?.find(o => o.code === lang);
        if (opt) return opt.quality;
        return 'auto';
    };

    const hasPartialWarning = languageOptions?.find(o => o.code === selectedLanguage)?.hasHighDependency;
    const uiLang = selectedLanguage === 'ko' ? 'ko' : selectedLanguage === 'ja' ? 'ja' : 'en';

    return (
        <div className={`bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md mx-auto ${className}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-dark to-brand-gold px-6 py-5 text-center">
                <Globe className="w-8 h-8 text-white mx-auto mb-2" />
                <h2 className="text-xl font-serif font-bold text-white">Select Language</h2>
                <p className="text-sm text-white/80 mt-1">言語を選択してください</p>
            </div>

            {/* Language Options */}
            <div className="p-6 space-y-3">
                {availableLanguages.map((lang) => {
                    const info = LANGUAGE_INFO[lang] || { name: lang, nativeName: lang, flag: '🌐' };
                    const isSelected = selectedLanguage === lang;
                    const quality = getQuality(lang);
                    const qualityLabel = QUALITY_LABELS[quality];
                    const opt = languageOptions?.find(o => o.code === lang);

                    return (
                        <button
                            key={lang}
                            onClick={() => onSelectLanguage(lang)}
                            disabled={quality === 'not_available'}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${quality === 'not_available'
                                    ? 'border-stone-200 bg-stone-50 opacity-60 cursor-not-allowed'
                                    : isSelected
                                        ? 'border-brand-gold bg-brand-gold/10 shadow-md'
                                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                                }`}
                        >
                            <span className="text-3xl">{info.flag}</span>
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-brand-dark">{info.nativeName}</p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${qualityLabel.color}`}>
                                        {qualityLabel[uiLang]}
                                    </span>
                                </div>
                                <p className="text-xs text-stone-500">{info.name}</p>
                                {opt?.hasHighDependency && lang !== 'ja' && (
                                    <p className="text-[10px] text-orange-600 mt-1 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        {uiLang === 'ja' ? '一部の謎は日本語が必要' : uiLang === 'ko' ? '일부 퍼즐은 일본어 필요' : 'Some puzzles require Japanese'}
                                    </p>
                                )}
                            </div>
                            {isSelected && quality !== 'not_available' && (
                                <div className="w-6 h-6 rounded-full bg-brand-gold flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Warning for partial support */}
            {hasPartialWarning && selectedLanguage !== 'ja' && (
                <div className="mx-6 mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex gap-2 text-sm">
                    <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="text-orange-700">
                        {uiLang === 'ja'
                            ? '一部の謎は日本語が必要な可能性があります。プレイ中に言語を切り替えることができます。'
                            : uiLang === 'ko'
                                ? '일부 퍼즐은 일본어가 필요할 수 있어요. 플레이 중 언제든 언어를 변경할 수 있어요.'
                                : 'Some puzzles may require Japanese. You can switch language anytime during play.'}
                    </div>
                </div>
            )}

            {/* Confirm Button */}
            <div className="px-6 pb-6">
                <button
                    onClick={onConfirm}
                    disabled={!selectedLanguage || getQuality(selectedLanguage) === 'not_available'}
                    className="w-full py-4 bg-gradient-to-r from-brand-dark to-brand-gold text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {selectedLanguage === 'ja' ? '開始する' : selectedLanguage === 'ko' ? '시작' : 'Start Quest'}
                </button>
            </div>
        </div>
    );
}

