import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin,
    Users,
    Building2,
    Sparkles,
    Target,
    BarChart3,
    Globe2,
    Trash2,
    Shield,
    ChevronDown,
    ChevronRight,
    ArrowRight,
    CheckCircle2,
    FileText,
    Store,
    TreeDeciduous,
    Briefcase,
    GraduationCap,
    AlertTriangle,
    Calendar,
    Gift,
    Send,
    Check,
    X,
    Menu,
    MousePointer2,
    PieChart,
    TrendingUp,
    Smartphone,
    Navigation,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ============================================
// Shared Components
// ============================================

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


const SectionHeading = ({ children, subtitle, light = false }: { children?: React.ReactNode; subtitle?: string; light?: boolean }) => (
    <div className="text-center mb-16 px-4">
        <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`text-3xl md:text-5xl font-serif font-bold mb-6 ${light ? 'text-white' : 'text-brand-dark'}`}
        >
            {children}
        </motion.h2>
        {subtitle && (
            <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className={`max-w-2xl mx-auto text-base md:text-lg leading-relaxed ${light ? 'text-white/80' : 'text-stone-600'}`}
            >
                {subtitle}
            </motion.p>
        )}
        <div className={`w-20 h-1.5 mx-auto mt-8 rounded-full ${light ? 'bg-white/30' : 'bg-brand-gold'}`} />
    </div>
);

const Badge = ({ children, color = 'gold' }: { children: React.ReactNode; color?: 'gold' | 'dark' | 'white' }) => {
    const styles = {
        gold: 'bg-brand-gold/10 text-amber-700 border-brand-gold/20',
        dark: 'bg-brand-dark/5 text-brand-dark border-brand-dark/10',
        white: 'bg-white/10 text-white border-white/20',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${styles[color]}`}>
            {children}
        </span>
    );
};

// ============================================
// Interactive Components
// ============================================

// 1. Solution Selector
const SolutionSelector = () => {
    const [activeTab, setActiveTab] = useState<'depopulation' | 'litter' | 'disaster'>('depopulation');

    const content = {
        depopulation: {
            title: '地域回遊・観光振興',
            subtitle: '過疎化対策・ファン作り',
            problem: '観光客が特定スポットに集中し、周辺地域への経済効果が薄い。',
            solution: '物語の手がかりを地域全体に分散させ、自然な回遊導線を設計。',
            color: 'from-amber-500 to-orange-600',
            icon: MapPin,
            kpis: ['回遊エリア数 3.5倍', '滞在時間 +45分', '店舗立ち寄り率 28%UP'],
        },
        litter: {
            title: '環境美化・ゴミ拾い',
            subtitle: 'スカベンジャーハント',
            problem: '環境活動への参加者が固定化し、若年層の関心が低い。',
            solution: 'ゴミ拾いを「宝探し競争」にゲーム化。楽しみながら街を綺麗に。',
            color: 'from-emerald-500 to-teal-600',
            icon: Trash2,
            kpis: ['若年層参加率 60%超', '回収ゴミ量 1.2トン', '満足度 98%'],
        },
        disaster: {
            title: '防災・減災訓練',
            subtitle: '防災トレイル',
            problem: 'ハザードマップの認知度が低く、座学の訓練では行動が定着しない。',
            solution: '避難所や危険箇所を巡るミッションで、実際の避難行動を身体で覚える。',
            color: 'from-blue-500 to-indigo-600',
            icon: Shield,
            kpis: ['避難経路認知率 92%', '家族参加率 85%', '継続実施意向 100%'],
        },
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-stone-100">
            <div className="flex border-b border-stone-100 overflow-x-auto">
                {(Object.entries(content) as [keyof typeof content, typeof content['depopulation']][]).map(([key, data]) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key as any)}
                        className={`flex-1 min-w-[160px] py-6 px-4 text-center transition-all relative group ${activeTab === key ? 'text-brand-dark' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
                            }`}
                    >
                        <div className={`w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center transition-colors ${activeTab === key ? `bg-gradient-to-br ${data.color} text-white shadow-lg` : 'bg-stone-100 text-stone-400'
                            }`}>
                            <data.icon className="w-5 h-5" />
                        </div>
                        <div className="font-bold text-sm md:text-base">{data.title}</div>
                        <div className="text-xs mt-1 opacity-70">{data.subtitle}</div>
                        {activeTab === key && (
                            <motion.div
                                layoutId="activeTab"
                                className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${data.color}`}
                            />
                        )}
                    </button>
                ))}
            </div>

            <div className="p-8 md:p-12 bg-stone-50/50">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="grid md:grid-cols-2 gap-12 items-center"
                    >
                        <div className="space-y-8">
                            <div>
                                <Badge color="dark">課題（Problem）</Badge>
                                <h3 className="text-2xl font-bold text-stone-800 mt-4 leading-relaxed">
                                    {content[activeTab].problem}
                                </h3>
                            </div>
                            <div className="relative pl-6 border-l-4 border-brand-gold">
                                <Badge color="gold">解決策（Solution）</Badge>
                                <p className="text-lg text-stone-600 mt-4 leading-relaxed">
                                    {content[activeTab].solution}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {content[activeTab].kpis.map((kpi, idx) => (
                                    <div key={idx} className="bg-white px-4 py-3 rounded-xl shadow-sm border border-stone-100 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-brand-gold" />
                                        <span className="font-bold text-brand-dark text-sm">{kpi}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Visual Representation Area */}
                        <div className={`relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br ${content[activeTab].color} p-1 flex items-center justify-center`}>
                            <div className="absolute inset-0 bg-black/10" />
                            <div className="bg-white/95 backdrop-blur-sm w-full h-full rounded-xl flex flex-col items-center justify-center p-6 text-center">
                                {/* Abstract UI representation */}
                                <div className="w-16 h-16 rounded-full bg-stone-100 mb-4 flex items-center justify-center animate-bounce">
                                    {(() => {
                                        const ActiveIcon = content[activeTab].icon;
                                        return <ActiveIcon className={`w-8 h-8 text-${activeTab === 'litter' ? 'emerald' : activeTab === 'disaster' ? 'blue' : 'amber'}-600`} />;
                                    })()}
                                </div>
                                <div className="space-y-2 w-full max-w-[200px]">
                                    <div className="h-2 bg-stone-100 rounded-full w-full" />
                                    <div className="h-2 bg-stone-100 rounded-full w-3/4 mx-auto" />
                                </div>
                                <div className="mt-6 flex gap-4">
                                    <div className="w-20 h-24 bg-stone-50 rounded-lg border border-stone-100 shadow-sm" />
                                    <div className="w-20 h-24 bg-stone-50 rounded-lg border border-stone-100 shadow-sm translate-y-4" />
                                    <div className="w-20 h-24 bg-stone-50 rounded-lg border border-stone-100 shadow-sm" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div >
    );
};

// 2. Impact Flow Diagram
const ImpactFlowDiagram = () => {
    const steps = [
        { icon: AlertTriangle, label: '地域課題', sub: '過疎/ゴミ/防災' },
        { icon: Smartphone, label: '街歩きゲーム', sub: 'TOMOSHIBI' },
        { icon: Users, label: '行動変容', sub: '回遊/清掃/避難' },
        { icon: PieChart, label: '成果の可視化', sub: 'ダッシュボード' },
    ];

    return (
        <div className="relative py-12">
            <div className="hidden md:block absolute top-[48px] left-0 right-0 h-0.5 bg-gradient-to-r from-stone-200 via-brand-gold/50 to-stone-200" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
                {steps.map((step, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.15 }}
                        className="flex flex-col items-center text-center group"
                    >
                        <div className="w-24 h-24 bg-white rounded-full shadow-lg border-4 border-white flex items-center justify-center mb-6 relative z-10 transition-transform group-hover:scale-110 group-hover:border-brand-gold duration-300">
                            <step.icon className="w-10 h-10 text-brand-dark group-hover:text-brand-gold transition-colors" />
                            <div className="absolute -right-2 -top-2 w-8 h-8 bg-brand-dark text-white rounded-full flex items-center justify-center font-bold border-2 border-white shadow-md">
                                {idx + 1}
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-brand-dark mb-1">{step.label}</h3>
                        <p className="text-stone-500 text-sm">{step.sub}</p>
                    </motion.div>
                ))}
            </div>

            {/* Dashboard Mock Preview */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="mt-16 mx-auto max-w-4xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden"
            >
                <div className="bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <div className="ml-4 text-xs font-mono text-stone-400">tomoshibi-analytics.dashboard</div>
                </div>
                <div className="p-6 grid grid-cols-3 gap-6">
                    <div className="col-span-2 space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div className="text-xs text-blue-500 font-bold mb-1">総参加者数</div>
                                <div className="text-2xl font-bold text-brand-dark">12,450<span className="text-xs text-stone-400 font-normal ml-1">人</span></div>
                            </div>
                            <div className="flex-1 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                <div className="text-xs text-emerald-600 font-bold mb-1">ミッション完遂率</div>
                                <div className="text-2xl font-bold text-brand-dark">88.2<span className="text-xs text-stone-400 font-normal ml-1">%</span></div>
                            </div>
                        </div>
                        <div className="h-40 bg-stone-50 rounded-xl border border-stone-100 flex items-end justify-between p-4 px-8 pb-0">
                            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                                <div key={i} className="w-8 bg-brand-dark/10 rounded-t-sm" style={{ height: `${h}%` }} />
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="h-full bg-stone-50 rounded-xl border border-stone-100 p-4">
                            <div className="text-xs text-stone-400 font-bold mb-4 uppercase">Popular Spots</div>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded bg-stone-200 text-[10px] flex items-center justify-center text-stone-500 font-bold">{i}</div>
                                    <div className="h-2 bg-stone-200 rounded-full flex-1" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// 3. Use Case Toggle
const UseCaseToggle = () => {
    const [mode, setMode] = useState<'municipality' | 'enterprise'>('municipality');

    // Abstracted data for cleaner code
    const data = {
        municipality: [
            { title: '周遊観光促進', icon: MapPin, text: '隠れた名所を巡るルート設計で、特定エリアへの集中を解消。', tag: '観光課' },
            { title: '商店街活性化', icon: Store, text: '店舗をチェックポイント化し、自然な送客と消費行動を生む。', tag: '産業振興課' },
            { title: '防災・教育', icon: GraduationCap, text: '楽しみながら学ぶ「防災トレイル」や郷土史学習への活用。', tag: '教育委員会' },
        ],
        enterprise: [
            { title: 'CSR・SDGs', icon: TreeDeciduous, text: '環境保全活動をイベント化。楽しみながら社会貢献活動を実施。', tag: 'CSR担当' },
            { title: 'イベント協賛', icon: Gift, text: '地域イベントへの協賛として、ブランド認知と好感度を向上。', tag: '広報・宣伝' },
            { title: 'チームビルディング', icon: Users, text: '社員同士で協力して謎を解く、新しい形の社内・新人研修。', tag: '人事・総務' },
        ]
    };

    return (
        <div>
            <div className="flex justify-center mb-12">
                <div className="bg-stone-100 p-1.5 rounded-full inline-flex relative">
                    {/* Sliding background */}
                    <motion.div
                        className="absolute inset-y-1.5 bg-white rounded-full shadow-md"
                        initial={false}
                        animate={{
                            left: mode === 'municipality' ? '6px' : '50%',
                            width: 'calc(50% - 9px)'
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />

                    <button
                        onClick={() => setMode('municipality')}
                        className={`relative z-10 px-8 py-3 rounded-full text-sm font-bold transition-colors w-40 flex items-center justify-center gap-2 ${mode === 'municipality' ? 'text-brand-dark' : 'text-stone-500'}`}
                    >
                        <Building2 className="w-4 h-4" />
                        自治体様
                    </button>
                    <button
                        onClick={() => setMode('enterprise')}
                        className={`relative z-10 px-8 py-3 rounded-full text-sm font-bold transition-colors w-40 flex items-center justify-center gap-2 ${mode === 'enterprise' ? 'text-brand-dark' : 'text-stone-500'}`}
                    >
                        <Briefcase className="w-4 h-4" />
                        企業様
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {data[mode].map((item, idx) => (
                        <motion.div
                            key={`${mode}-${idx}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2, delay: idx * 0.1 }}
                            className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm hover:shadow-lg transition-all"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === 'municipality' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                                    }`}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-500 px-2 py-1 rounded">
                                    {item.tag}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-brand-dark mb-3">{item.title}</h3>
                            <p className="text-stone-600 text-sm leading-relaxed">{item.text}</p>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

// 4. Comparison Table
const PackageComparison = () => {
    return (
        <div className="overflow-x-auto pb-4">
            <div className="bg-white rounded-2xl shadow-lg border border-stone-200 min-w-[800px]">
                <div className="grid grid-cols-4 border-b border-stone-100 bg-stone-50/50 rounded-t-2xl">
                    <div className="p-6 font-bold text-stone-400 text-sm">プラン比較</div>
                    <div className="p-6 text-center border-l border-stone-100">
                        <div className="font-bold text-brand-dark text-lg mb-1">Pack A</div>
                        <div className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-full inline-block">地域回遊</div>
                    </div>
                    <div className="p-6 text-center border-l border-stone-100 bg-brand-gold/5 relative">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-brand-gold" />
                        <div className="font-bold text-brand-dark text-lg mb-1">Pack B</div>
                        <div className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-full inline-block">清掃ハント</div>
                        <div className="absolute top-2 right-2 text-[10px] bg-brand-dark text-white px-2 py-0.5 rounded-full">人気</div>
                    </div>
                    <div className="p-6 text-center border-l border-stone-100">
                        <div className="font-bold text-brand-dark text-lg mb-1">Pack C</div>
                        <div className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-full inline-block">防災訓練</div>
                    </div>
                </div>

                {[
                    { label: '目的', a: '観光・回遊', b: '環境・CSR', c: '防災・教育' },
                    { label: '実施形態', a: '常設/イベント', b: 'イベント主体', c: 'イベント/訓練' },
                    { label: '店舗連携', a: '○ (5-10店舗)', b: '△ (協賛店)', c: '△ (避難所等)' },
                    { label: '成果指標', a: '回遊・送客数', b: 'ゴミ回収量', c: '理解度・完走率' },
                    { label: '多言語', a: 'オプション', b: '基本不要', c: 'オプション' },
                ].map((row, idx) => (
                    <div key={idx} className="grid grid-cols-4 border-b border-stone-100 last:border-b-0 hover:bg-stone-50/50 transition-colors">
                        <div className="p-5 font-bold text-stone-600 text-sm flex items-center">{row.label}</div>
                        <div className="p-5 text-center text-stone-600 text-sm border-l border-stone-100 flex items-center justify-center">{row.a}</div>
                        <div className="p-5 text-center text-brand-dark font-medium text-sm border-l border-stone-100 bg-brand-gold/5 flex items-center justify-center">{row.b}</div>
                        <div className="p-5 text-center text-stone-600 text-sm border-l border-stone-100 flex items-center justify-center">{row.c}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// 5. Interactive Stepper
const StepsAccordion = () => {
    const [activeStep, setActiveStep] = useState<number | null>(0);
    const steps = [
        { title: 'お問い合わせ', desc: '課題感や実施時期、予算感などをヒアリングさせていただきます。' },
        { title: '企画・設計', desc: 'KPI設計、ルート案、ストーリー構成をご提案します。（約1〜2週間）' },
        { title: '制作・連携', desc: 'クエスト制作、店舗・施設への許諾取り、QRコード設置などを行います。AI活用で最短3日で制作可能。' },
        { title: '公開・PR', desc: '専用LP作成、SNS発信、チラシ配布など、集客施策を支援します。' },
        { title: 'レポート・改善', desc: 'イベント終了後、人流データ・参加者属性・アンケート結果をまとめたレポートを提出します。' },
    ];

    return (
        <div className="space-y-4 max-w-3xl mx-auto">
            {steps.map((step, idx) => (
                <div
                    key={idx}
                    className={`border rounded-2xl transition-all overflow-hidden ${activeStep === idx ? 'border-brand-gold bg-brand-gold/5' : 'border-stone-200 bg-white hover:border-stone-300'}`}
                >
                    <button
                        onClick={() => setActiveStep(activeStep === idx ? null : idx)}
                        className="w-full text-left p-6 flex items-center gap-6"
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${activeStep === idx ? 'bg-brand-gold text-brand-dark' : 'bg-stone-200 text-stone-500'}`}>
                            {idx + 1}
                        </div>
                        <span className={`font-bold text-lg flex-1 ${activeStep === idx ? 'text-brand-dark' : 'text-stone-600'}`}>
                            {step.title}
                        </span>
                        <ChevronDown className={`w-5 h-5 transition-transform ${activeStep === idx ? 'rotate-180 text-brand-dark' : 'text-stone-400'}`} />
                    </button>
                    <AnimatePresence>
                        {activeStep === idx && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-6 pb-6 pt-0 pl-20 pr-10 text-stone-600 leading-relaxed">
                                    {step.desc}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    );
};

// ============================================
// Contact Components (Reused)
// ============================================
const ContactForm = ({ onClose }: { onClose?: () => void }) => {
    const [formData, setFormData] = useState({
        organization: '', name: '', email: '', type: '', message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'form_submit', { event_category: 'B2B', event_label: 'Contact Form', form_type: formData.type });
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSubmitting(false);
        setIsSubmitted(true);
    };

    if (isSubmitted) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-brand-dark mb-3">送信完了</h3>
                <p className="text-stone-600 mb-6">お問い合わせありがとうございます。<br />担当者より2営業日以内にご連絡いたします。</p>
                {onClose && <button onClick={onClose} className="text-brand-gold font-bold hover:underline">閉じる</button>}
            </motion.div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1.5">組織名</label>
                    <input type="text" required value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold" placeholder="株式会社〇〇" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1.5">ご担当者名</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold" placeholder="山田 太郎" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">メールアドレス</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold" placeholder="example@co.jp" />
            </div>
            <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">ご相談種別</label>
                <select required value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold">
                    <option value="">選択してください</option>
                    <option value="municipality">自治体として導入を検討</option>
                    <option value="enterprise">企業として導入を検討</option>
                    <option value="sponsorship">協賛・タイアップを検討</option>
                    <option value="other">その他</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">お問い合わせ内容</label>
                <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={4} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold resize-none" placeholder="詳細をご記入ください" />
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-brand-dark text-white font-bold rounded-xl hover:bg-brand-gold hover:text-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {isSubmitting ? '送信中...' : <><Send className="w-5 h-5" /> 送信する</>}
            </button>
        </form>
    );
};

const ContactModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;
    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-brand-dark">お問い合わせ</h3>
                        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center transition-colors"><X className="w-5 h-5 text-stone-400" /></button>
                    </div>
                    <div className="p-6"><ContactForm onClose={onClose} /></div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ============================================
// Main Page Component
// ============================================

const BusinessLandingPage = () => {
    const navigate = useNavigate();
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const openContact = () => setIsContactOpen(true);
    const scrollToContact = () => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });

    const handleNavClick = (hash: string) => {
        if (hash.startsWith('#')) {
            const el = document.querySelector(hash);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-brand-base font-sans selection:bg-brand-gold/30 text-brand-dark">
            {/* --- Header (Same as Main LP) --- */}
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md py-4 shadow-lg border-b border-stone-200/50' : 'bg-transparent py-6'
                    }`}
            >
                <div className="container mx-auto px-4 md:px-8 flex items-center justify-between">
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
                        <TomoshibiLogo className="h-8 md:h-10 w-auto" />
                    </button>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        <button
                            onClick={() => handleNavClick('#features')}
                            className="text-sm font-medium text-stone-600 hover:text-brand-gold transition-colors relative group"
                        >
                            特徴
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-gold transition-all group-hover:w-full" />
                        </button>
                        <button
                            onClick={() => handleNavClick('#how-it-works')}
                            className="text-sm font-medium text-stone-600 hover:text-brand-gold transition-colors relative group"
                        >
                            遊び方
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-gold transition-all group-hover:w-full" />
                        </button>
                        <button
                            onClick={() => navigate('/creators')}
                            className="text-sm font-medium text-stone-600 hover:text-brand-gold transition-colors relative group"
                        >
                            クリエイターの方へ
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-gold transition-all group-hover:w-full" />
                        </button>

                        {/* Divider */}
                        <div className="w-px h-5 bg-stone-300" />

                        {/* B2B link - currently active */}
                        <span className="text-sm font-medium text-brand-gold">
                            自治体・企業の方へ
                        </span>

                        {/* Primary CTA */}
                        <button
                            onClick={() => navigate('/quests')}
                            className="bg-brand-gold text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-amber-600 transition-all shadow-md hover:shadow-lg"
                        >
                            クエストを探す
                        </button>

                        {/* Login */}
                        <button
                            onClick={() => navigate('/auth')}
                            className="px-4 py-2 rounded-full border border-stone-300 bg-white/80 backdrop-blur text-sm font-bold text-brand-dark hover:border-brand-gold hover:text-brand-gold transition-all shadow-sm"
                        >
                            ログイン
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden w-10 h-10 flex items-center justify-center">
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Nav Dropdown */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden bg-white border-t border-stone-100 overflow-hidden"
                        >
                            <div className="p-4 space-y-2">
                                <button onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }} className="block w-full text-left py-3 px-4 rounded-lg hover:bg-stone-50 font-medium">ホーム</button>
                                <button onClick={() => { navigate('/creators'); setIsMobileMenuOpen(false); }} className="block w-full text-left py-3 px-4 rounded-lg hover:bg-stone-50 font-medium">クリエイターの方へ</button>
                                <div className="py-3 px-4 text-brand-gold font-bold">自治体・企業の方へ（現在のページ）</div>
                                <button onClick={() => { navigate('/quests'); setIsMobileMenuOpen(false); }} className="block w-full text-left py-3 px-4 rounded-lg bg-brand-gold text-white font-bold">クエストを探す</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* --- Hero Section --- */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-4 overflow-hidden">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100/40 via-white to-white" />
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-amber-50/50 to-transparent -z-10 hidden md:block" />

                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                    <div className="text-center md:text-left">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-bold text-stone-500 mb-8 shadow-sm">
                            <Building2 className="w-3.5 h-3.5 text-brand-gold" />
                            自治体・企業向けソリューション
                        </motion.div>
                        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-brand-dark leading-[1.1] mb-8">
                            地域の課題を、<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold to-amber-600">"体験"</span>に変える。
                        </motion.h1>
                        <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg text-stone-600 leading-relaxed mb-10 max-w-lg mx-auto md:mx-0">
                            「TOMOSHIBI」は、街歩きと謎解きを掛け合わせた地域回遊プラットフォーム。
                            ただの観光PRではなく、「人が動く」仕掛けで、過疎化・環境・防災といった地域課題に挑みます。
                        </motion.p>
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                            <button onClick={openContact} className="w-full sm:w-auto px-8 py-4 bg-brand-dark text-white font-bold rounded-full hover:bg-brand-gold hover:text-brand-dark transition-all shadow-xl hover:translate-y-[-2px] flex items-center justify-center gap-2">
                                導入を相談する <ArrowRight className="w-5 h-5" />
                            </button>
                            <button onClick={scrollToContact} className="w-full sm:w-auto px-8 py-4 bg-white text-brand-dark border-2 border-stone-100 font-bold rounded-full hover:border-brand-dark transition-all flex items-center justify-center gap-2">
                                資料ダウンロード
                            </button>
                        </motion.div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-12 flex flex-wrap gap-6 justify-center md:justify-start">
                            {['PoC受付中', '導入地域募集中', 'パートナーシップ'].map((tag) => (
                                <div key={tag} className="flex items-center gap-2 text-xs font-bold text-stone-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {tag}
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Visual Graphic on Right */}
                    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="hidden md:block relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-brand-gold/20 to-transparent rounded-full blur-[100px]" />
                        <div className="relative z-10 w-full aspect-square max-w-lg mx-auto bg-white rounded-[40px] shadow-2xl overflow-hidden border-8 border-white/50">
                            {/* Abstract Map Graphic */}
                            <div className="absolute inset-0 bg-stone-50 opacity-50 pattern-grid-lg" />
                            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-amber-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
                            <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
                            <div className="absolute bottom-1/4 left-1/3 w-32 h-32 bg-pink-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />

                            {/* Mock UI Elements floating */}
                            <div className="absolute top-12 left-12 right-12 bottom-12 border-2 border-dashed border-stone-300 rounded-3xl" />
                            <div className="absolute top-20 left-8 bg-white p-4 rounded-xl shadow-lg border border-stone-100 flex items-center gap-3 animate-float delay-0">
                                <div className="w-10 h-10 bg-brand-dark text-white rounded-lg flex items-center justify-center font-bold">Q1</div>
                                <div><div className="w-24 h-2 bg-stone-200 rounded mb-1" /><div className="w-16 h-2 bg-stone-100 rounded" /></div>
                            </div>
                            <div className="absolute bottom-24 right-8 bg-white p-4 rounded-xl shadow-lg border border-stone-100 flex items-center gap-3 animate-float delay-1000">
                                <MapPin className="w-8 h-8 text-red-500" />
                                <div><div className="text-xs font-bold text-stone-500">CHECK IN</div><div className="text-sm font-bold text-brand-dark">古民家カフェ</div></div>
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-gold/90 backdrop-blur text-white px-6 py-3 rounded-full font-bold shadow-xl animate-pulse">
                                MISSION COMPLETE!
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Scroll Indicator */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-stone-300 flex flex-col items-center gap-2">
                    <span className="text-[10px] tracking-[0.2em] font-bold">SCROLL</span>
                    <div className="w-px h-12 bg-stone-200 overflow-hidden"><div className="w-full h-1/2 bg-brand-gold -mt-full animate-scrolldown" /></div>
                </motion.div>
            </section>

            {/* --- Problem & Solution (Interactive) --- */}
            <section id="solutions" className="py-24 px-4 bg-white relative z-10 rounded-t-[40px] shadow-[0_-20px_40px_rgba(0,0,0,0.03)] border-t border-stone-100">
                <div className="max-w-6xl mx-auto">
                    <SectionHeading subtitle="複雑な地域課題も、ゲーミフィケーションで解決の糸口へ。">
                        課題に応じたアプローチ
                    </SectionHeading>
                    <SolutionSelector />
                </div>
            </section>

            {/* --- Impact Flow (Visual) --- */}
            <section id="flow" className="py-24 px-4 bg-stone-50 overflow-hidden">
                <div className="max-w-6xl mx-auto">
                    <SectionHeading subtitle="『体験』を入口に、人の行動を変え、街の資産として蓄積します。">
                        価値創出の仕組み
                    </SectionHeading>
                    <ImpactFlowDiagram />
                </div>
            </section>

            {/* --- Metrics & Trust --- */}
            <section className="py-20 px-4 bg-brand-dark text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                <div className="max-w-6xl mx-auto text-center relative z-10">
                    <h2 className="text-3xl font-serif font-bold mb-12">定量的な成果を、あなたの街に</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
                        {[
                            { label: 'エリア回遊率', value: '3.5', unit: '倍' },
                            { label: '地域滞在時間', value: '+45', unit: '分' },
                            { label: '行動変容率', value: '82', unit: '%' },
                            { label: '顧客満足度', value: '4.8', unit: '/5' },
                        ].map((m, i) => (
                            <div key={i} className="p-6 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm">
                                <div className="text-white/60 text-sm font-bold mb-2">{m.label}</div>
                                <div className="text-4xl md:text-5xl font-bold text-brand-gold">{m.value}<span className="text-lg text-white/50 ml-1">{m.unit}</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- Use Cases (Segmented) --- */}
            <section id="use-cases" className="py-24 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                    <SectionHeading subtitle="自治体から企業まで、目的に合わせて幅広く活用されています。">
                        活用シーン
                    </SectionHeading>
                    <UseCaseToggle />
                </div>
            </section>

            {/* --- Packages (Comparison) --- */}
            <section id="packages" className="py-24 px-4 bg-stone-50">
                <div className="max-w-6xl mx-auto">
                    <SectionHeading subtitle="スモールスタートから本格展開まで。">
                        導入プラン
                    </SectionHeading>
                    <PackageComparison />
                    <p className="text-center text-stone-500 text-xs mt-6">※ 上記はモデルケースです。ご予算・ご要望に応じて柔軟にカスタマイズ可能です。</p>
                </div>
            </section>

            {/* --- Implementation Steps --- */}
            <section className="py-24 px-4 bg-white">
                <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-16 items-start">
                    <div className="sticky top-24">
                        <SectionHeading subtitle="ご相談から最短1ヶ月で公開可能。">
                            公開までの流れ
                        </SectionHeading>
                        <p className="text-stone-600 mb-8">
                            専任のプランナーが企画から運用まで伴走します。<br />
                            まずはお気軽にご相談ください。
                        </p>
                        <button onClick={openContact} className="px-8 py-4 bg-brand-dark text-white font-bold rounded-full hover:bg-brand-gold hover:text-brand-dark transition-colors shadow-lg">
                            スケジュールを相談する
                        </button>
                    </div>
                    <StepsAccordion />
                </div>
            </section>

            {/* --- FAQ --- */}
            <section id="faq" className="py-24 px-4 bg-stone-50">
                <div className="max-w-3xl mx-auto">
                    <SectionHeading subtitle="よくあるご質問">FAQ</SectionHeading>
                    <div className="space-y-4">
                        {[
                            { q: '導入費用はどのくらいですか？', a: 'イベント規模や期間によりますが、トライアルプランとして50万円〜実施可能です。詳細はお見積りいたします。' },
                            { q: 'どの地域でも対応できますか？', a: 'はい、日本全国対応可能です。現地調査が必要な場合は別途交通費をいただく場合がございます。' },
                            { q: '自社のキャラクターは使えますか？', a: '可能です。既存IPを活用したコラボイベントとしての実施実績もございます。' },
                            { q: '参加者のデータはもらえますか？', a: 'はい、個人情報を除いた統計データ（属性、回遊ログ、アンケート等）をレポートとして提出します。' },
                        ].map((faq, idx) => (
                            <details key={idx} className="group bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden cursor-pointer">
                                <summary className="flex items-center justify-between p-6 font-bold text-stone-700 list-none group-open:text-brand-dark transition-colors">
                                    <div className="flex items-center gap-4">
                                        <span className="w-6 h-6 bg-stone-100 rounded text-stone-400 text-xs flex items-center justify-center font-bold">Q</span>
                                        {faq.q}
                                    </div>
                                    <ChevronDown className="w-5 h-5 text-stone-400 transition-transform group-open:rotate-180" />
                                </summary>
                                <div className="px-6 pb-6 pl-16 text-stone-600 leading-relaxed border-t border-stone-50 pt-4">
                                    {faq.a}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- Final CTA --- */}
            <section id="contact-form" className="py-24 px-4 bg-gradient-to-br from-stone-900 to-brand-dark text-white">
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
                            あなたの街でも、<br />
                            新しい物語を<br />
                            始めませんか？
                        </h2>
                        <p className="text-white/70 text-lg mb-10 leading-relaxed">
                            地域活性化、環境問題、防災意識の向上。<br />
                            TOMOSHIBIなら、それらを「ワクワクする体験」に変えることができます。
                        </p>
                        <div className="flex items-center gap-6 opacity-60">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map(i => <div key={i} className="w-10 h-10 rounded-full bg-stone-700 border-2 border-brand-dark" />)}
                            </div>
                            <span className="text-sm font-bold">多くの自治体・企業様が<br />導入を検討中です</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-3xl p-8 text-stone-800 shadow-2xl">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-brand-gold rounded-full" />
                            お問い合わせ・資料請求
                        </h3>
                        <ContactForm />
                    </div>
                </div>
            </section>

            {/* --- Footer --- */}
            <footer className="bg-stone-950 text-white/40 py-12 px-4 border-t border-white/10">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="font-serif font-bold text-2xl text-white/50">TOMOSHIBI</div>
                    <div className="flex gap-8 text-sm font-bold">
                        <a href="/topics" className="hover:text-white transition-colors">運営会社</a>
                        <a href="/privacy" className="hover:text-white transition-colors">プライバシーポリシー</a>
                        <a href="/terms" className="hover:text-white transition-colors">利用規約</a>
                    </div>
                    <div className="text-xs">© 2025 TOMOSHIBI Project.</div>
                </div>
            </footer>

            {/* Contact Modal */}
            <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
        </div>
    );
};

export default BusinessLandingPage;
