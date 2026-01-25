import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Sparkles, Heart, Clock, ArrowRight, Compass, Flame } from "lucide-react";
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
        placeholder: "例：ホラー、探偵、ラブストーリー、歴史探訪",
        icon: Sparkles,
        required: true,
        suggestions: ["ホラー", "探偵・ミステリー", "ラブストーリー", "歴史探訪", "グルメ"],
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
];

interface QuestWizardProps {
    onComplete: (answers: Record<string, string>) => void;
    onLocationHint?: (value: string) => void;
    onCancel?: () => void;
}

const QuestWizard = ({ onComplete, onLocationHint }: QuestWizardProps) => {
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
            answer: trimmed || (currentQuestion.placeholder.split("例：")[1] || "指定なし"),
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
        <div className="flex flex-col h-full pointer-events-auto bg-transparent md:max-w-md md:mx-auto">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-sm">
                        <Compass className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-stone-800">冒険の準備</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-stone-400">
                    <Flame className={cn("w-3 h-3", isComplete ? "text-amber-500 fill-amber-500" : "text-stone-300")} />
                    <span>{wizardAnswers.length} / {QUESTIONS.length}</span>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                <div className="space-y-6 pb-20">
                    <div className="text-center py-6">
                        <p className="text-sm text-stone-500">
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
                                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0 border border-stone-200">
                                    {ans.icon && <ans.icon className="w-4 h-4 text-stone-400" />}
                                </div>
                                <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-stone-100 max-w-[80%]">
                                    <p className="text-sm text-stone-700">{ans.question}</p>
                                </div>
                            </div>

                            {/* Answer Bubble */}
                            <div className="flex items-center justify-end gap-2">
                                <div className="bg-amber-500 rounded-2xl rounded-tr-none px-4 py-2.5 shadow-md shadow-amber-500/20 max-w-[80%]">
                                    <p className="text-sm font-medium text-white">{ans.answer}</p>
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
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-200/50">
                                    <currentQuestion.icon className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 space-y-1 pt-1">
                                    <p className="text-sm font-bold text-amber-900 leading-relaxed">
                                        {currentQuestion.question}
                                    </p>
                                    <p className="text-[10px] text-amber-600/80">
                                        {currentStep + 1}つ目の灯火を見つけましょう
                                    </p>
                                </div>
                            </div>

                            {/* Suggestions Grid */}
                            {currentQuestion.suggestions && (
                                <div className="flex flex-wrap gap-2 pl-2">
                                    {currentQuestion.suggestions.map((suggestion, idx) => (
                                        <motion.button
                                            key={suggestion}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.05 + 0.1 }}
                                            onClick={() => handleNext(suggestion)}
                                            className="shrink-0 px-4 py-2.5 rounded-xl bg-white/60 border border-stone-200 shadow-sm text-xs text-stone-600 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 transition-all active:scale-95"
                                        >
                                            {suggestion}
                                        </motion.button>
                                    ))}
                                </div>
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
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg animate-pulse">
                                    <Sparkles className="w-8 h-8 text-white" />
                                </div>
                                <div className="absolute inset-0 bg-amber-400 rounded-full blur-xl opacity-40 animate-pulse" />
                            </div>
                            <div className="text-center space-y-1">
                                <h3 className="text-lg font-bold text-amber-900">準備が整いました</h3>
                                <p className="text-xs text-amber-700">集めた灯火で未知の物語を生成します</p>
                            </div>

                            <Button
                                onClick={() => completeWizard(wizardAnswers)}
                                className="w-full max-w-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-full py-6 text-lg font-bold shadow-xl active:scale-95 transition-all"
                            >
                                クエストを生成する
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setWizardAnswers([]);
                                    setWizardStep(0);
                                }}
                                className="text-stone-400 hover:text-stone-600 text-xs"
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
                <div className="p-4 bg-white/80 backdrop-blur-md border-t border-stone-100 flex items-center gap-2">
                    <Input
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`${currentQuestion.question}（${currentQuestion.placeholder}）`}
                        className="rounded-full bg-stone-100 border-transparent focus:bg-white transition-all h-12 px-6"
                    />
                    <Button
                        size="icon"
                        onClick={() => handleNext(currentInput)}
                        disabled={!currentInput.trim()}
                        className="rounded-full h-12 w-12 shrink-0 bg-stone-900 hover:bg-stone-800 shadow-md"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                </div>
            )}
        </div>
    );
};

export default QuestWizard;
