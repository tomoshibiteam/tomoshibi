import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X, Sparkles, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface ProSubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const QUICK_FEATURES = [
    { icon: Zap, text: 'AIクレジット10倍増量（月50→500）' },
    { icon: Sparkles, text: '目的別テンプレート（家族/グルメ/歴史など）' },
    { icon: Crown, text: '多言語対応（英語・中国語・韓国語）' },
    { icon: Zap, text: '手数料優遇（30%→20%）' },
];

export default function ProSubscriptionModal({ isOpen, onClose }: ProSubscriptionModalProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubscribe = async () => {
        if (!user) {
            onClose();
            navigate('/?login=true');
            return;
        }

        setIsLoading(true);

        // Stripe Payment Link (Test Mode)
        const paymentLink = 'https://buy.stripe.com/test_3cI6oG4IAb0Bh0h1pdds400';

        // Add customer email and success/cancel URLs as parameters
        const successUrl = encodeURIComponent(`${window.location.origin}/canvas`);
        const cancelUrl = encodeURIComponent(`${window.location.origin}/subscription?canceled=true`);

        // Redirect to Stripe Checkout
        window.location.href = `${paymentLink}?prefilled_email=${encodeURIComponent(user.email || '')}&success_url=${successUrl}&cancel_url=${cancelUrl}`;
    };

    const handleViewDetails = () => {
        onClose();
        navigate('/subscription');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden pointer-events-auto">
                            {/* Header */}
                            <div className="relative p-6 pb-4 text-center border-b border-stone-100 bg-gradient-to-r from-amber-50 to-white">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                                >
                                    <X size={18} />
                                </button>

                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 mb-4">
                                    <Crown size={14} className="text-brand-gold" />
                                    <span className="text-brand-gold font-bold text-xs">TOMOSHIBI Pro</span>
                                </div>

                                <h2 className="text-xl font-bold text-brand-dark mb-1">
                                    Pro機能をアンロック
                                </h2>
                                <p className="text-stone-500 text-sm">
                                    より自由にクエストを創造しよう
                                </p>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                {/* Price */}
                                <div className="text-center">
                                    <div className="flex items-end justify-center gap-1">
                                        <span className="text-3xl font-bold text-brand-dark">¥1,980</span>
                                        <span className="text-stone-400 pb-0.5">/月</span>
                                    </div>
                                </div>

                                {/* Quick Features */}
                                <div className="space-y-2">
                                    {QUICK_FEATURES.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                                            <div className="w-8 h-8 rounded-lg bg-brand-gold/20 flex items-center justify-center flex-shrink-0">
                                                <feature.icon size={16} className="text-brand-gold" />
                                            </div>
                                            <span className="text-stone-700 text-sm">{feature.text}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* CTA Buttons */}
                                <div className="space-y-3 pt-2">
                                    <button
                                        onClick={handleSubscribe}
                                        disabled={isLoading}
                                        className="w-full py-3.5 rounded-xl bg-brand-dark text-white font-bold hover:bg-brand-gold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                処理中...
                                            </>
                                        ) : (
                                            <>
                                                <Crown size={18} />
                                                Proプランに登録
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleViewDetails}
                                        className="w-full py-2.5 rounded-xl text-stone-500 hover:text-brand-dark text-sm font-medium transition-colors flex items-center justify-center gap-1"
                                    >
                                        詳細を見る
                                        <ArrowRight size={14} />
                                    </button>
                                </div>

                                {/* Footer note */}
                                <p className="text-center text-stone-400 text-xs">
                                    いつでもキャンセル可能 • Stripeで安全に決済
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
