import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Sparkles, Heart, Clock, ArrowRight, Compass, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Question {
    id: string;
    question: string;
    placeholder: string;
    icon: React.ElementType;
    required: boolean;
    suggestions?: string[];
}

interface Answer {
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
    onCancel?: () => void;
}

const QuestWizard = ({ onComplete }: QuestWizardProps) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [currentInput, setCurrentInput] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);

    const currentQuestion = QUESTIONS[currentStep];
    const isComplete = answers.length >= QUESTIONS.length;

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
    }, [answers, isComplete]);

    const completeWizard = () => {
        const answersObj = answers.reduce((acc, ans) => {
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

        const newAnswer: Answer = {
            questionId: currentQuestion.id,
            question: currentQuestion.question,
            answer: trimmed,
            icon: currentQuestion.icon,
        };

        const newAnswers = [...answers, newAnswer];
        setAnswers(newAnswers);

        if (currentStep < QUESTIONS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const Icon = currentQuestion?.icon || Sparkles;

    return (
        <div className="h-full flex flex-col bg-gradient-to-b from-stone-50 via-amber-50/20 to-stone-50">
            {/* Header */}
            <div className="shrink-0 px-4 pt-4 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Compass className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                        <h2 className="text-xs font-bold text-amber-900">クエストデザイナー</h2>
                        <div className="flex gap-0.5 mt-0.5">
                            {QUESTIONS.map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "w-1.5 h-1.5 rounded-full transition-colors",
                                        i < answers.length ? "bg-amber-500" :
                                            i === currentStep ? "bg-amber-300 animate-pulse" : "bg-stone-200"
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Collected Lanterns Preview */}
                <div className="flex -space-x-2">
                    {answers.map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 border-2 border-white shadow-sm flex items-center justify-center"
                        >
                            <Flame className="w-3 h-3 text-white fill-white" />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                <AnimatePresence mode="popLayout">
                    {answers.map((answer, index) => (
                        <motion.div
                            key={`${answer.questionId}-${index}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-2 opacity-60"
                        >
                            <div className="flex items-start gap-2">
                                <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                                    <answer.icon className="w-3 h-3 text-stone-500" />
                                </div>
                                <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-stone-600 shadow-sm border border-stone-100">
                                    {answer.question}
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl rounded-tr-sm px-3 py-2 text-xs text-white shadow-md font-medium">
                                    {answer.answer}
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
                                    <Icon className="w-5 h-5 text-white" />
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

                    {/* Ready state - Show generate button in chat flow */}
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
                                onClick={completeWizard}
                                className="w-full max-w-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-full py-6 text-lg font-bold shadow-xl active:scale-95 transition-all"
                            >
                                クエストを生成する
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={chatEndRef} />
            </div>

            {/* Input Area - Hide when complete */}
            {!isComplete && (
                <div className="shrink-0 px-4 pb-6 pt-2">
                    <div className="bg-white p-2 rounded-2xl shadow-lg border border-amber-100 flex gap-2">
                        <Input
                            value={currentInput}
                            onChange={(e) => setCurrentInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleNext(currentInput);
                                }
                            }}
                            placeholder={currentQuestion.placeholder}
                            className="flex-1 border-0 focus-visible:ring-0 text-sm bg-transparent"
                        />
                        <Button
                            onClick={() => handleNext(currentInput)}
                            disabled={!currentInput.trim() && currentQuestion.required}
                            size="icon"
                            className="rounded-xl bg-amber-900 hover:bg-amber-800 text-white shrink-0"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestWizard;
