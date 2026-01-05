import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Crown,
    Check,
    X,
    Zap,
    Shield,
    TrendingUp,
    Coins,
    ChevronDown,
    ChevronRight,
    Menu,
    Sparkles,
    Users,
    Globe,
    BarChart2,
    Lock,
    Building2,
    Star,
} from 'lucide-react';
import { useAuth } from './AuthProvider';

// ========== TYPES ==========
interface PlanFeature {
    text: string;
}

interface Plan {
    id: 'free' | 'pro' | 'studio';
    name: string;
    tagline: string;
    price: string;
    priceNote?: string;
    cta: string;
    ctaVariant: 'primary' | 'secondary' | 'outline';
    badge?: string;
    features: PlanFeature[];
    footnote?: string;
}

interface FaqItem {
    question: string;
    answer: string;
}

interface FeatureRow {
    name: string;
    desc?: string;
    free: string | boolean;
    pro: string | boolean;
    studio: string | boolean;
}

interface FeatureCategory {
    name: string;
    rows: FeatureRow[];
}

// ========== DATA ==========
const PLANS: Plan[] = [
    {
        id: 'free',
        name: 'Free',
        tagline: 'まず1本作って公開する方向け',
        price: '¥0',
        cta: '無料で始める',
        ctaVariant: 'outline',
        features: [
            { text: '同時公開：最大3本' },
            { text: '制作テンプレ：基本テンプレのみ' },
            { text: 'AI：月50クレジット' },
            { text: '分析：基本（再生数/完走率/評価）' },
            { text: '収益化：販売可能' },
            { text: 'サポート：標準' },
        ],
        footnote: 'まずは無料で公開まで。伸ばす段階でProへ',
    },
    {
        id: 'pro',
        name: 'Creator Pro',
        tagline: '"伸びる・稼げる"を仕組みで回すクリエイター向け',
        price: '¥1,980',
        priceNote: '/月（年払いで2ヶ月分お得）',
        cta: 'Proを始める',
        ctaVariant: 'primary',
        badge: 'おすすめ',
        features: [
            { text: 'AI強化：クレジット大幅増＋作風プリセット' },
            { text: 'テンプレ強化：目的別テンプレ（家族/グルメ/歴史等）' },
            { text: '多言語：英語ほか自動翻訳・生成' },
            { text: '品質：公開前チェック強化＋審査優先' },
            { text: '成長：おすすめ枠・特集応募など露出優先' },
            { text: '改善：離脱地点分析＋レビュー要約＋A/Bテスト' },
            { text: '収益化：クーポン/バンドル/団体コード＋手数料優遇' },
        ],
        footnote: '月1本以上公開するなら最もおすすめ',
    },
    {
        id: 'studio',
        name: 'Studio',
        tagline: 'チーム制作・自治体/施設案件など"運用"向け',
        price: 'お問い合わせ',
        cta: '相談する',
        ctaVariant: 'secondary',
        features: [
            { text: '共同編集・権限管理（編集/承認/公開）' },
            { text: '監修フロー・ブランド/素材管理' },
            { text: '複数案件ダッシュボード（エリア/顧客別）' },
            { text: '配布機能（専用コード・団体導線）' },
            { text: '優先サポート' },
            { text: '契約・請求（請求書払い等）' },
        ],
    },
];

const VALUE_PROPS = [
    { icon: Zap, title: '制作スピード', desc: '高品質テンプレ＆AIで制作時間を短縮' },
    { icon: Shield, title: '品質担保', desc: '公開前チェック＆優先審査で評価が安定' },
    { icon: TrendingUp, title: '見つかる', desc: 'おすすめ枠・配布導線で伸びやすい' },
    { icon: Coins, title: '稼ぐ', desc: '販売機能＆手数料優遇で収益化を加速' },
];

const PRO_PILLARS = [
    {
        id: 'speed',
        icon: Zap,
        label: 'Speed',
        title: '制作スピード',
        desc: 'テンプレとAIで、企画〜台本〜ミッション作成を短縮。',
    },
    {
        id: 'quality',
        icon: Shield,
        label: 'Quality',
        title: '品質担保',
        desc: '公開前チェックと優先審査で、評価のムラを減らす。',
    },
    {
        id: 'growth',
        icon: TrendingUp,
        label: 'Growth',
        title: '見つかる',
        desc: '露出機会と配布導線で、"作っただけ"で終わらない。',
    },
    {
        id: 'monetize',
        icon: Coins,
        label: 'Monetize',
        title: '稼ぐ',
        desc: '販売機能＋手数料優遇で、収益化の再現性を作る。',
    },
];

const RECOMMENDATION = [
    { plan: 'Free', desc: '初めて作る／1本試したい' },
    { plan: 'Pro', desc: '毎月公開したい／売上を伸ばしたい／改善を回したい' },
    { plan: 'Studio', desc: 'チームで運用／自治体・施設案件／複数エリア管理' },
];

const FAQ_ITEMS: FaqItem[] = [
    { question: 'FreeからProに変更できますか？', answer: 'はい、いつでもアップグレード可能です。設定画面から「Proにアップグレード」を選択してください。作成したクエストや分析データはすべて引き継がれます。' },
    { question: 'ProからFreeに戻せますか？', answer: 'はい、いつでもダウングレード可能です。次回請求日以降にFreeプランに移行します。Pro限定機能で作成したコンテンツは閲覧可能ですが、編集にはProが必要です。' },
    { question: 'AIクレジットは何に使われますか？繰り越しは？', answer: 'AIクレジットは、ストーリー生成、謎の自動作成、翻訳などに使用されます。未使用クレジットは翌月に繰り越されません。Proプランでは大幅に増量されます。' },
    { question: '多言語はどこまで対応していますか？', answer: 'Proプランでは、英語、中国語（簡体/繁体）、韓国語に対応しています。AIによる自動翻訳と、ネイティブチェック済みのUIを提供します。' },
    { question: '作品（クエスト）の著作権は誰に帰属しますか？', answer: '著作権はクリエイターに帰属します。TOMOSHIBIはプラットフォーム利用規約に基づき、配信に必要な範囲でのみ利用許諾を受けます。' },
    { question: '不適切表現のチェックや審査基準は？', answer: '公開前に自動チェック（安全性/不適切表現/著作権）を実施します。Proプランでは審査優先レーンにより、通常より早く公開されます。' },
    { question: '収益分配と手数料は？入金タイミングは？', answer: 'Freeプランは手数料30%、Proプランは20%です。入金は月末締め翌月15日払いです。Proプランでは入金サイクル短縮オプションもあります。' },
    { question: 'クーポンや団体コードはどう使いますか？', answer: 'Proプランで利用可能です。クーポンは割引コードとして配布、団体コードは学校・企業・ツアー向けに一括購入を可能にします。' },
    { question: 'チームで作りたい場合はどのプランですか？', answer: 'Studioプランをおすすめします。共同編集、権限管理、監修フローなど、チーム制作に必要な機能が揃っています。' },
    { question: '解約方法・返金は？', answer: '設定画面からいつでも解約可能です。解約後は次回請求日までProプランをご利用いただけます。日割り返金は原則行っておりません。' },
];

const FEATURE_CATEGORIES: FeatureCategory[] = [
    {
        name: 'A. 制作',
        rows: [
            { name: '目的別テンプレ', desc: '家族/グルメ/歴史/雨の日等', free: false, pro: true, studio: true },
            { name: '分岐ストーリー', free: false, pro: true, studio: true },
            { name: '難易度設計ガイド', free: '基本', pro: '詳細', studio: '詳細' },
            { name: 'ルート最適化', free: false, pro: true, studio: true },
            { name: 'AIクレジット', free: '月50', pro: '月500', studio: '無制限' },
            { name: '作風プリセット', desc: 'ミステリー/コメディ等', free: false, pro: true, studio: true },
            { name: '多言語生成・翻訳', free: false, pro: true, studio: true },
        ],
    },
    {
        name: 'B. 公開・運用',
        rows: [
            { name: '同時公開数', free: '3本', pro: '無制限', studio: '無制限' },
            { name: '公開予約', free: false, pro: true, studio: true },
            { name: 'バージョン管理', free: false, pro: true, studio: true },
            { name: '下書き/ステージング', free: false, pro: true, studio: true },
            { name: '公開前チェック', free: '基本', pro: '強化', studio: '強化' },
            { name: '審査優先レーン', free: false, pro: true, studio: true },
            { name: '認定バッジ', free: false, pro: '申請可', studio: '自動' },
        ],
    },
    {
        name: 'C. 成長（露出・配布）',
        rows: [
            { name: 'おすすめ表示', free: '標準', pro: '優先', studio: '最優先' },
            { name: '特集応募', free: false, pro: true, studio: true },
            { name: 'OGP/シェア画像自動生成', free: false, pro: true, studio: true },
            { name: 'クエスト紹介ページ', free: '基本', pro: 'カスタム', studio: 'ブランド対応' },
            { name: 'QR配布ページ', free: false, pro: true, studio: true },
            { name: 'SNS投稿テンプレ', free: false, pro: true, studio: true },
        ],
    },
    {
        name: 'D. 分析・改善',
        rows: [
            { name: '再生数・完走率・評価', free: true, pro: true, studio: true },
            { name: 'スポット別離脱地点分析', free: false, pro: true, studio: true },
            { name: 'レビュー要約', desc: '良い/悪い/改善', free: false, pro: true, studio: true },
            { name: 'A/Bテスト', free: false, pro: true, studio: true },
            { name: 'リピート率/周回データ', free: false, pro: true, studio: true },
            { name: '収益分析', desc: '売上・単価・CV', free: false, pro: true, studio: true },
        ],
    },
    {
        name: 'E. 収益化',
        rows: [
            { name: '有料販売', free: true, pro: true, studio: true },
            { name: 'クーポン', free: false, pro: true, studio: true },
            { name: 'バンドル販売', free: false, pro: true, studio: true },
            { name: '団体向けコード', free: false, pro: true, studio: true },
            { name: '手数料', free: '30%', pro: '20%', studio: '要相談' },
            { name: '入金サイクル短縮', free: false, pro: true, studio: true },
        ],
    },
    {
        name: 'F. チーム（Studio中心）',
        rows: [
            { name: '共同編集', free: false, pro: false, studio: true },
            { name: '権限管理', desc: '編集/承認/公開', free: false, pro: false, studio: true },
            { name: '監修フロー', free: false, pro: false, studio: true },
            { name: '素材ライブラリ/権利管理', free: false, pro: false, studio: true },
            { name: '複数案件ダッシュボード', free: false, pro: false, studio: true },
            { name: '請求書払い/契約対応', free: false, pro: false, studio: true },
            { name: '優先サポート', free: false, pro: '◯', studio: '専任' },
        ],
    },
];

// ========== STRIPE CONFIG ==========
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_3cI6oG4IAb0Bh0h1pdds400';

// ========== COMPONENTS ==========
function PlanCard({ plan, billingCycle, user }: { plan: Plan; billingCycle: 'monthly' | 'yearly'; user?: { email?: string } | null }) {
    const navigate = useNavigate();
    const isPro = plan.id === 'pro';

    const handleClick = () => {
        if (plan.id === 'studio') {
            alert('お問い合わせフォームへ');
            return;
        }
        if (plan.id === 'pro') {
            if (!user) {
                navigate('/?login=true');
                return;
            }
            // Redirect to Stripe Payment Link
            const successUrl = encodeURIComponent(`${window.location.origin}/canvas`);
            const cancelUrl = encodeURIComponent(`${window.location.origin}/subscription?canceled=true`);
            window.location.href = `${STRIPE_PAYMENT_LINK}?prefilled_email=${encodeURIComponent(user.email || '')}&success_url=${successUrl}&cancel_url=${cancelUrl}`;
            return;
        }
        // Free plan
        navigate('/?login=true');
    };

    const getButtonClass = () => {
        switch (plan.ctaVariant) {
            case 'primary':
                return 'bg-brand-dark text-white hover:bg-brand-gold';
            case 'secondary':
                return 'bg-stone-800 text-white hover:bg-stone-700';
            case 'outline':
            default:
                return 'bg-white text-brand-dark border-2 border-brand-dark hover:bg-brand-dark hover:text-white';
        }
    };

    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className={`relative flex flex-col bg-white rounded-2xl border-2 p-6 ${isPro ? 'border-brand-gold shadow-xl shadow-brand-gold/10' : 'border-stone-200'}`}
        >
            {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-gold text-white text-xs font-bold rounded-full">
                    {plan.badge}
                </div>
            )}

            <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-brand-dark mb-1">{plan.name}</h3>
                <p className="text-stone-500 text-sm">{plan.tagline}</p>
            </div>

            <div className="text-center mb-6">
                <div className="flex items-end justify-center gap-1">
                    <span className="text-4xl font-bold text-brand-dark">{plan.price}</span>
                    {plan.priceNote && <span className="text-stone-400 text-sm pb-1">{plan.priceNote}</span>}
                </div>
            </div>

            <button
                onClick={handleClick}
                className={`w-full py-3 rounded-xl font-bold transition-all mb-6 ${getButtonClass()}`}
            >
                {plan.cta}
            </button>

            <ul className="space-y-3 flex-1">
                {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                        <Check size={16} className="text-brand-gold flex-shrink-0 mt-0.5" />
                        {f.text}
                    </li>
                ))}
            </ul>

            {plan.footnote && (
                <p className="text-xs text-stone-400 mt-4 pt-4 border-t border-stone-100 text-center">
                    {plan.footnote}
                </p>
            )}
        </motion.div>
    );
}

function FaqAccordion({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
    return (
        <div className="border-b border-stone-200">
            <button
                onClick={onToggle}
                className="w-full py-5 flex items-center justify-between text-left hover:bg-stone-50 transition-colors"
            >
                <span className="font-bold text-brand-dark pr-4">{item.question}</span>
                <ChevronDown size={20} className={`text-stone-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <p className="pb-5 text-stone-600 text-sm leading-relaxed">{item.answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function FeatureCell({ value }: { value: string | boolean }) {
    if (typeof value === 'boolean') {
        return value ? (
            <Check size={18} className="text-brand-gold mx-auto" />
        ) : (
            <X size={18} className="text-stone-300 mx-auto" />
        );
    }
    return <span className="text-sm text-stone-700">{value}</span>;
}

// ========== MAIN PAGE ==========
export default function SubscriptionPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-white">
            {/* ========== HEADER ========== */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-100">
                <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <button onClick={() => navigate('/')} className="text-2xl font-serif font-bold text-brand-dark tracking-wider">
                        TOMOSHIBI
                    </button>

                    <nav className="hidden md:flex items-center gap-8">
                        <button onClick={() => scrollToSection('plans')} className="text-sm text-stone-600 hover:text-brand-dark transition-colors">プラン</button>
                        <button onClick={() => scrollToSection('comparison')} className="text-sm text-stone-600 hover:text-brand-dark transition-colors">機能比較</button>
                        <button onClick={() => scrollToSection('faq')} className="text-sm text-stone-600 hover:text-brand-dark transition-colors">FAQ</button>
                        <button
                            onClick={() => navigate('/?login=true')}
                            className="px-5 py-2 rounded-full bg-brand-dark text-white text-sm font-bold hover:bg-brand-gold transition-colors"
                        >
                            無料で始める
                        </button>
                    </nav>

                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-stone-600">
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-t border-stone-100 px-4 py-4 space-y-3">
                        <button onClick={() => scrollToSection('plans')} className="block w-full text-left py-2 text-stone-600">プラン</button>
                        <button onClick={() => scrollToSection('comparison')} className="block w-full text-left py-2 text-stone-600">機能比較</button>
                        <button onClick={() => scrollToSection('faq')} className="block w-full text-left py-2 text-stone-600">FAQ</button>
                        <button
                            onClick={() => navigate('/?login=true')}
                            className="w-full py-3 rounded-full bg-brand-dark text-white font-bold"
                        >
                            無料で始める
                        </button>
                    </div>
                )}
            </header>

            {/* ========== HERO ========== */}
            <section className="pt-28 pb-16 px-4 bg-gradient-to-b from-amber-50/50 to-white">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                        <h1 className="text-3xl md:text-5xl font-bold text-brand-dark mb-4 leading-tight">
                            クリエイター向け料金プラン
                        </h1>
                        <p className="text-stone-600 text-lg md:text-xl mb-2">
                            無料で公開まで体験。伸ばして稼ぐなら Creator Pro。
                        </p>
                        <p className="text-stone-500 text-base mb-10">
                            制作・品質・成長・収益化を回す "運用OS" を提供します。
                        </p>

                        {/* Value Props */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                            {VALUE_PROPS.map((v, i) => (
                                <motion.div
                                    key={v.title}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 * i }}
                                    className="bg-white rounded-xl p-4 border border-stone-100 shadow-sm"
                                >
                                    <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-brand-gold/10 flex items-center justify-center">
                                        <v.icon size={20} className="text-brand-gold" />
                                    </div>
                                    <h3 className="font-bold text-brand-dark text-sm mb-1">{v.title}</h3>
                                    <p className="text-stone-500 text-xs">{v.desc}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                            <button
                                onClick={() => navigate('/?login=true')}
                                className="w-full sm:w-auto px-8 py-4 rounded-full bg-brand-dark text-white font-bold text-lg hover:bg-brand-gold transition-colors shadow-lg"
                            >
                                無料で始める
                            </button>
                            <button
                                onClick={() => scrollToSection('plans')}
                                className="w-full sm:w-auto px-8 py-4 rounded-full border-2 border-brand-dark text-brand-dark font-bold text-lg hover:bg-brand-dark hover:text-white transition-colors"
                            >
                                Proの料金を見る
                            </button>
                        </div>
                        <p className="text-stone-400 text-sm">いつでも解約できます・プラン変更はいつでも可能</p>
                    </motion.div>
                </div>
            </section>

            {/* ========== BILLING TOGGLE & PLAN CARDS ========== */}
            <section id="plans" className="py-16 px-4 scroll-mt-20">
                <div className="max-w-5xl mx-auto">
                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4 mb-12">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-brand-dark text-white' : 'text-stone-500 hover:text-brand-dark'}`}
                        >
                            月払い
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-brand-dark text-white' : 'text-stone-500 hover:text-brand-dark'}`}
                        >
                            年払い
                            <span className="px-2 py-0.5 bg-brand-gold text-white text-xs rounded-full">2ヶ月分お得</span>
                        </button>
                    </div>

                    {/* Plan Cards */}
                    <div className="grid md:grid-cols-3 gap-6">
                        {PLANS.map((plan) => (
                            <PlanCard key={plan.id} plan={plan} billingCycle={billingCycle} user={user} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== RECOMMENDATION ========== */}
            <section className="py-12 px-4 bg-stone-50">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-brand-dark text-center mb-8">どれを選べばいい？</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        {RECOMMENDATION.map((r, i) => (
                            <div key={i} className="bg-white rounded-xl p-5 border border-stone-200">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${r.plan === 'Pro' ? 'bg-brand-gold text-white' : 'bg-stone-100 text-stone-600'}`}>
                                    {r.plan}がおすすめ
                                </span>
                                <p className="text-stone-700 text-sm">{r.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== PRO PILLARS ========== */}
            <section className="py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-brand-dark mb-4">
                        Creator Proで、制作が"運用"になる。
                    </h2>
                    <p className="text-stone-500 mb-12">売上が出た瞬間に元が取りやすい設計</p>

                    <div className="grid md:grid-cols-4 gap-6">
                        {PRO_PILLARS.map((p, i) => (
                            <motion.div
                                key={p.id}
                                initial={{ y: 20, opacity: 0 }}
                                whileInView={{ y: 0, opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 * i }}
                                className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm"
                            >
                                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-brand-gold/10 flex items-center justify-center">
                                    <p.icon size={24} className="text-brand-gold" />
                                </div>
                                <span className="text-xs text-brand-gold font-bold uppercase">{p.label}</span>
                                <h3 className="font-bold text-brand-dark mt-1 mb-2">{p.title}</h3>
                                <p className="text-stone-500 text-sm">{p.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== COMPARISON TABLE ========== */}
            <section id="comparison" className="py-16 px-4 bg-stone-50 scroll-mt-20">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-bold text-brand-dark text-center mb-4">
                        すべての機能を比較する
                    </h2>
                    <p className="text-stone-500 text-center mb-12">必要な機能からプランを選べます。いつでも変更可能です。</p>

                    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                                <thead>
                                    <tr className="bg-stone-50 border-b border-stone-200">
                                        <th className="text-left py-4 px-6 font-bold text-brand-dark">機能</th>
                                        <th className="py-4 px-4 font-bold text-stone-500 text-center w-24">Free</th>
                                        <th className="py-4 px-4 font-bold text-brand-gold text-center w-24">Pro</th>
                                        <th className="py-4 px-4 font-bold text-stone-500 text-center w-24">Studio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {FEATURE_CATEGORIES.map((cat) => (
                                        <React.Fragment key={cat.name}>
                                            <tr className="bg-stone-100/50">
                                                <td colSpan={4} className="py-3 px-6 font-bold text-brand-dark text-sm">{cat.name}</td>
                                            </tr>
                                            {cat.rows.map((row, i) => (
                                                <tr key={i} className="border-b border-stone-100 hover:bg-amber-50/30">
                                                    <td className="py-3 px-6">
                                                        <span className="text-sm text-stone-700">{row.name}</span>
                                                        {row.desc && <span className="text-xs text-stone-400 ml-1">（{row.desc}）</span>}
                                                    </td>
                                                    <td className="py-3 px-4 text-center"><FeatureCell value={row.free} /></td>
                                                    <td className="py-3 px-4 text-center bg-brand-gold/5"><FeatureCell value={row.pro} /></td>
                                                    <td className="py-3 px-4 text-center"><FeatureCell value={row.studio} /></td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========== FAQ ========== */}
            <section id="faq" className="py-16 px-4 scroll-mt-20">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-bold text-brand-dark text-center mb-12">よくある質問</h2>
                    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                        {FAQ_ITEMS.map((item, i) => (
                            <FaqAccordion
                                key={i}
                                item={item}
                                isOpen={openFaqIndex === i}
                                onToggle={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== FINAL CTA ========== */}
            <section className="py-20 px-4 bg-gradient-to-b from-amber-50/50 to-white">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-brand-dark mb-4">
                        "作るだけ"から、"伸ばして稼ぐ"へ。
                    </h2>
                    <p className="text-stone-500 mb-8">
                        無料で始めて、必要なタイミングでProにアップグレードできます。
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                        <button
                            onClick={() => navigate('/?login=true')}
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-brand-dark text-white font-bold text-lg hover:bg-brand-gold transition-colors shadow-lg"
                        >
                            無料で始める
                        </button>
                        <button
                            onClick={() => {
                                if (!user) {
                                    navigate('/?login=true');
                                    return;
                                }
                                const successUrl = encodeURIComponent(`${window.location.origin}/canvas`);
                                const cancelUrl = encodeURIComponent(`${window.location.origin}/subscription?canceled=true`);
                                window.location.href = `${STRIPE_PAYMENT_LINK}?prefilled_email=${encodeURIComponent(user.email || '')}&success_url=${successUrl}&cancel_url=${cancelUrl}`;
                            }}
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-brand-gold text-white font-bold text-lg hover:bg-amber-600 transition-colors shadow-lg"
                        >
                            Proを始める
                        </button>
                    </div>
                    <button className="text-stone-500 hover:text-brand-dark text-sm underline">
                        Studioの相談はこちら
                    </button>
                </div>
            </section>

            {/* ========== FOOTER ========== */}
            <footer className="border-t border-stone-100 py-8 text-center">
                <p className="text-stone-400 text-sm">© 2025 TOMOSHIBI. All rights reserved.</p>
            </footer>
        </div>
    );
}
