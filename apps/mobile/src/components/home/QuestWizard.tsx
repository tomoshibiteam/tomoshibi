import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Sparkles, Heart, Clock, ArrowRight, Compass, Flame, Book, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useQuest, Answer as ContextAnswer } from "@/contexts/QuestContext";

interface Question {
    id: string;
    question: string;
    placeholder: string;
    icon: React.ElementType;
    required: boolean;
    suggestions?: string[];
}

interface AnswerDisplay {
    questionId: string;
    question: string;
    answer: string;
    icon: React.ElementType;
}

const QUESTIONS: Question[] = [
    {
        id: "location",
        question: "クエストを始めたい場所を教えてください",
        placeholder: "例：渋谷、現在地付近、鎌倉駅周辺",
        icon: MapPin,
        required: true,
        suggestions: ["現在地付近", "渋谷", "新宿", "鎌倉"],
    },
    {
        id: "genre",
        question: "どんな雰囲気・ジャンルがお好みですか？",
        placeholder: "例：ホラー、ミステリー、ラブストーリー、歴史探訪",
        icon: Sparkles,
        required: true,
        suggestions: ["ホラー", "ミステリー", "ラブストーリー", "歴史探訪", "グルメ"],
    },
    {
        id: "purpose",
        question: "どんな体験をしたいですか？",
        placeholder: "例：怖がりたい、謎を解きたい、学びたい",
        icon: Heart,
        required: true,
        suggestions: ["怖がりたい", "謎を解きたい", "ときめきたい", "学びたい", "笑いたい"],
    },
    {
        id: "duration",
        question: "どのくらいの時間で楽しみたいですか？",
        placeholder: "例：30分、1時間、2時間",
        icon: Clock,
        required: true,
        suggestions: ["30分", "1時間", "2時間"],
    },
    {
        id: "series",
        question: "シリーズに追加しますか？（任意）",
        placeholder: "シリーズ名を入力または選択",
        icon: Book,
        required: false,
        suggestions: [],
    },
];

interface QuestWizardProps {
    onComplete: (answers: Record<string, string>) => void;
    onLocationHint?: (value: string) => void;
    onCancel?: () => void;
    seriesOptions?: string[];
    onAddSeriesRequest?: () => void;
}

const QuestWizard = ({ onComplete, onLocationHint, seriesOptions = [], onAddSeriesRequest }: QuestWizardProps) => {
    // Use QuestContext for persistence
    const { wizardAnswers, setWizardAnswers, wizardStep, setWizardStep } = useQuest();

    // Local state for UI
    const [currentInput, setCurrentInput] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);

    const currentStep = wizardStep;
    const currentQuestion = QUESTIONS[currentStep];
    const isComplete = wizardAnswers.length >= QUESTIONS.length;

    // Convert Context answers to Display answers
    const displayAnswers: AnswerDisplay[] = wizardAnswers.map(ans => {
        const q = QUESTIONS.find(q => q.id === ans.questionId);
        return {
            questionId: ans.questionId,
            question: q?.question || "",
            answer: ans.answer,
            icon: q?.icon || MapPin,
        };
    });

    // Clear input when step changes
    useEffect(() => {
        setCurrentInput("");
    }, [currentStep]);

    // Scroll to bottom when new answer is added
    useEffect(() => {
        // Delay slightly to allow DOM to update
        setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }, [wizardAnswers, isComplete]);

    const completeWizard = (finalAnswers: ContextAnswer[]) => {
        const answersObj = finalAnswers.reduce((acc, ans) => {
            if (ans.answer) {
                acc[ans.questionId] = ans.answer;
            }
            return acc;
        }, {} as Record<string, string>);
        onComplete(answersObj);
    };

    const handleNext = (inputValue: string) => {
        const trimmed = inputValue.trim();

        // Check required
        if (!trimmed && currentQuestion.required) return;
        if (currentQuestion.id === "location" && trimmed.includes("現在地")) {
            onLocationHint?.(trimmed);
        }

        const newAnswer: ContextAnswer = {
            questionId: currentQuestion.id,
            answer: trimmed || (currentQuestion.id === "series" ? "指定なし" : (currentQuestion.placeholder.split("例：")[1] || "指定なし")),
        };

        const newAnswers = [...wizardAnswers, newAnswer];
        setWizardAnswers(newAnswers);

        if (currentStep < QUESTIONS.length - 1) {
            setWizardStep(currentStep + 1);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleNext(currentInput);
        }
    };

    // When all answers are collected, show a ready state and wait for explicit generation.

    return (
        <div className="flex flex-col h-full pointer-events-auto bg-transparent md:max-w-md md:mx-auto font-serif">
            <div className="p-4 border-b border-[#E8D5BE] flex items-center justify-between bg-[#FEF9F3]/90 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#E8D5BE] flex items-center justify-center text-[#7A6652] shadow-sm border border-white">
                        <Compass className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-[#3D2E1F] tracking-widest text-sm">冒険の準備</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-[#7A6652]">
                    <Flame className={cn("w-3 h-3", isComplete ? "text-[#D87A32] fill-[#D87A32]" : "text-[#E8D5BE]")} />
                    <span>{wizardAnswers.length} / {QUESTIONS.length}</span>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                <div className="space-y-6 pb-20">
                    <div className="text-center py-6">
                        <p className="text-sm text-[#7A6652] leading-loose">
                            いくつか質問に答えて、<br />
                            あなただけの物語を見つけましょう
                        </p>
                    </div>

                    {/* History */}
                    {displayAnswers.map((ans, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-2"
                        >
                            {/* Question Bubble */}
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-white border border-[#E8D5BE] flex items-center justify-center shrink-0">
                                    {ans.icon && <ans.icon className="w-4 h-4 text-[#7A6652]" />}
                                </div>
                                <div className="bg-white/90 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-[#E8D5BE] max-w-[85%]">
                                    <p className="text-sm text-[#3D2E1F] leading-relaxed">{ans.question}</p>
                                </div>
                            </div>

                            {/* Answer Bubble */}
                            <div className="flex items-center justify-end gap-2">
                                <div className="bg-[#D87A32] rounded-2xl rounded-tr-none px-4 py-2.5 shadow-md shadow-[#D87A32]/20 max-w-[85%]">
                                    <p className="text-sm font-bold text-[#FEF9F3]">{ans.answer}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Current Question - only show if not complete */}
                    {!isComplete && (
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="space-y-4 my-4"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D87A32] to-[#B85A1F] flex items-center justify-center shrink-0 shadow-lg shadow-[#D87A32]/30 border border-white/20">
                                    <currentQuestion.icon className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 space-y-1 pt-1">
                                    <p className="text-sm font-bold text-[#3D2E1F] leading-relaxed">
                                        {currentQuestion.question}
                                    </p>
                                    <p className="text-[10px] text-[#7A6652] tracking-wide font-bold uppercase">
                                        QUESTION {currentStep + 1}
                                    </p>
                                </div>
                            </div>

                            {/* Suggestions Grid */}
                            {currentQuestion.id === "series" ? (
                                <div className="flex flex-wrap gap-2 pl-2">
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => handleNext("指定なし")}
                                        className="shrink-0 px-4 py-2 rounded-xl bg-white/80 border border-[#E8D5BE] shadow-sm text-xs font-bold text-[#7A6652] hover:bg-[#D87A32] hover:text-white hover:border-[#D87A32] transition-all active:scale-95"
                                    >
                                        指定なし
                                    </motion.button>
                                    {seriesOptions.slice(0, 5).map((series, idx) => (
                                        <motion.button
                                            key={series}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.05 + 0.1 }}
                                            onClick={() => handleNext(series)}
                                            className="shrink-0 px-4 py-2 rounded-xl bg-white/80 border border-[#E8D5BE] shadow-sm text-xs font-bold text-[#7A6652] hover:bg-[#D87A32] hover:text-white hover:border-[#D87A32] transition-all active:scale-95"
                                        >
                                            {series}
                                        </motion.button>
                                    ))}
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 }}
                                        onClick={onAddSeriesRequest}
                                        className="shrink-0 px-4 py-2 rounded-xl bg-[#FEF9F3] border border-[#D87A32] border-dashed shadow-sm text-xs font-bold text-[#D87A32] hover:bg-[#D87A32]/10 transition-all active:scale-95 flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" />
                                        新規作成...
                                    </motion.button>
                                </div>
                            ) : (
                                currentQuestion.suggestions && (
                                    <div className="flex flex-wrap gap-2 pl-2">
                                        {currentQuestion.suggestions.map((suggestion, idx) => (
                                            <motion.button
                                                key={suggestion}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: idx * 0.05 + 0.1 }}
                                                onClick={() => handleNext(suggestion)}
                                                className="shrink-0 px-4 py-2 rounded-xl bg-white/80 border border-[#E8D5BE] shadow-sm text-xs font-bold text-[#7A6652] hover:bg-[#D87A32] hover:text-white hover:border-[#D87A32] transition-all active:scale-95"
                                            >
                                                {suggestion}
                                            </motion.button>
                                        ))}
                                    </div>
                                )
                            )}
                        </motion.div>
                    )}

                    {/* Ready state - Show generate button ONLY if we are in complete state but maybe somehow returned here */}
                    {isComplete && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="py-10 flex flex-col items-center justify-center space-y-6"
                        >
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D87A32] to-[#B85A1F] flex items-center justify-center shadow-lg animate-pulse border-2 border-white">
                                    <Sparkles className="w-8 h-8 text-white" />
                                </div>
                                <div className="absolute inset-0 bg-[#D87A32] rounded-full blur-xl opacity-40 animate-pulse" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-bold text-[#3D2E1F] tracking-widest">準備が整いました</h3>
                                <p className="text-xs text-[#7A6652]">集めた灯火で未知の物語を生成します</p>
                            </div>

                            <Button
                                onClick={() => completeWizard(wizardAnswers)}
                                className="w-full max-w-xs h-14 bg-gradient-to-r from-[#D87A32] to-[#B85A1F] hover:from-[#E88B43] hover:to-[#C96B30] text-white rounded-full text-base font-bold tracking-widest shadow-xl shadow-[#D87A32]/25 active:scale-95 transition-all"
                            >
                                クエストを生成する
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setWizardAnswers([]);
                                    setWizardStep(0);
                                }}
                                className="text-[#a59483] hover:text-[#7A6652] text-xs font-bold tracking-wide hover:bg-transparent"
                            >
                                最初からやり直す
                            </Button>
                        </motion.div>
                    )}

                    <div ref={chatEndRef} />
                </div>
            </div>

            {/* Input Area - Hide if complete*/}
            {!isComplete && (
                <div className="p-4 bg-[#FEF9F3]/95 backdrop-blur-md border-t border-[#E8D5BE] flex items-center gap-2 pb-8 md:pb-4">
                    <Input
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`${currentQuestion.placeholder}`}
                        className="rounded-full bg-white border-[#E8D5BE] focus:border-[#D87A32] text-[#3D2E1F] placeholder:text-[#7A6652]/50 h-12 px-6 font-serif shadow-sm"
                    />
                    <Button
                        size="icon"
                        onClick={() => handleNext(currentInput)}
                        disabled={!currentInput.trim()}
                        className="rounded-full h-12 w-12 shrink-0 bg-[#3D2E1F] hover:bg-[#2A1F15] shadow-md text-[#FEF9F3]"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                </div>
            )}
        </div>
    );
};

export default QuestWizard;
