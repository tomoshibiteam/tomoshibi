/**
 * FeedbackModal - Lightweight "I'm stuck" feedback collector
 * 
 * Allows users to report issues during gameplay with minimal friction.
 */

import { useState } from 'react';
import { AlertCircle, Send, X } from 'lucide-react';
import { FEEDBACK_CATEGORIES, FeedbackCategory, submitFeedback } from '@/hooks/useAnalytics';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    questId: string;
    spotId: string | null;
    userId: string | null;
    currentMode: string;
    spotIndex: number;
    language?: 'ja' | 'en' | 'ko';
}

const LABELS = {
    ja: {
        title: '困っていますか？',
        subtitle: '問題を報告してください',
        categoryLabel: 'カテゴリ',
        messageLabel: '詳細（任意）',
        messagePlaceholder: '具体的な状況を教えてください...',
        submit: '送信',
        submitting: '送信中...',
        success: 'ありがとうございます！',
        successSub: 'フィードバックを受け付けました',
        close: '閉じる',
    },
    en: {
        title: 'Need help?',
        subtitle: 'Report an issue',
        categoryLabel: 'Category',
        messageLabel: 'Details (optional)',
        messagePlaceholder: 'Tell us more about the issue...',
        submit: 'Submit',
        submitting: 'Submitting...',
        success: 'Thank you!',
        successSub: 'Your feedback has been received',
        close: 'Close',
    },
    ko: {
        title: '도움이 필요하세요?',
        subtitle: '문제를 보고해 주세요',
        categoryLabel: '카테고리',
        messageLabel: '상세 내용 (선택)',
        messagePlaceholder: '상황을 자세히 알려주세요...',
        submit: '제출',
        submitting: '제출 중...',
        success: '감사합니다!',
        successSub: '피드백이 접수되었습니다',
        close: '닫기',
    },
};

export default function FeedbackModal({
    isOpen,
    onClose,
    questId,
    spotId,
    userId,
    currentMode,
    spotIndex,
    language = 'ja',
}: FeedbackModalProps) {
    const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | null>(null);
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const t = LABELS[language];

    const handleSubmit = async () => {
        if (!selectedCategory) return;

        setSubmitting(true);
        const result = await submitFeedback(
            userId,
            questId,
            spotId,
            selectedCategory,
            message,
            { mode: currentMode, spotIndex }
        );
        setSubmitting(false);

        if (result.success) {
            setSubmitted(true);
            setTimeout(() => {
                onClose();
                // Reset for next use
                setSelectedCategory(null);
                setMessage('');
                setSubmitted(false);
            }, 1500);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D2E1F]/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-[360px] bg-[#FEF9F3] rounded-3xl shadow-2xl border-2 border-[#E8D5BE] overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 bg-gradient-to-r from-[#3D2E1F] to-[#7A6652] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-[#F4A853]" />
                        <div>
                            <h3 className="text-lg font-bold text-white">{t.title}</h3>
                            <p className="text-xs text-white/70">{t.subtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {submitted ? (
                    // Success state
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto mb-4 flex items-center justify-center">
                            <Send className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h4 className="text-xl font-bold text-[#3D2E1F]">{t.success}</h4>
                        <p className="text-sm text-[#7A6652] mt-1">{t.successSub}</p>
                    </div>
                ) : (
                    // Form
                    <div className="p-5 space-y-4">
                        {/* Category Selection */}
                        <div>
                            <label className="text-sm font-medium text-[#3D2E1F] block mb-2">
                                {t.categoryLabel}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {FEEDBACK_CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.value}
                                        onClick={() => setSelectedCategory(cat.value)}
                                        className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${selectedCategory === cat.value
                                                ? 'bg-[#D87A32] text-white shadow-md'
                                                : 'bg-[#F7E7D3] text-[#3D2E1F] border border-[#E8D5BE] hover:border-[#D87A32]'
                                            }`}
                                    >
                                        {language === 'en' ? cat.labelEn : cat.labelJa}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Message */}
                        <div>
                            <label className="text-sm font-medium text-[#3D2E1F] block mb-2">
                                {t.messageLabel}
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={t.messagePlaceholder}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border-2 border-[#E8D5BE] bg-white text-[#3D2E1F] placeholder-[#9B8A7A] focus:outline-none focus:border-[#D87A32] resize-none"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedCategory || submitting}
                            className="w-full py-3.5 bg-gradient-to-r from-[#D87A32] to-[#F4A853] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                t.submitting
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    {t.submit}
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
