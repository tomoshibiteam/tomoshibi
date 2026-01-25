import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PlayerPreviewOutput, QuestCreatorPayload } from '@/lib/difyQuest';

export type Answer = {
    questionId: string;
    answer: string;
};

type ViewMode = "idle" | "wizard" | "generating" | "preview";

type QuestContextType = {
    // Wizard State
    wizardAnswers: Answer[];
    setWizardAnswers: (answers: Answer[]) => void;
    wizardStep: number;
    setWizardStep: (step: number) => void;

    // Home State
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    draftPrompt: string;
    setDraftPrompt: (prompt: string) => void;
    playerPreview: PlayerPreviewOutput | null;
    setPlayerPreview: (preview: PlayerPreviewOutput | null) => void;
    creatorPayload: QuestCreatorPayload | null;
    setCreatorPayload: (payload: QuestCreatorPayload | null) => void;

    // Actions
    resetQuestState: () => void;
};

const QuestContext = createContext<QuestContextType | undefined>(undefined);

export const QuestProvider = ({ children }: { children: ReactNode }) => {
    const [wizardAnswers, setWizardAnswers] = useState<Answer[]>([]);
    const [wizardStep, setWizardStep] = useState(0);

    const [viewMode, setViewMode] = useState<ViewMode>("idle");
    const [draftPrompt, setDraftPrompt] = useState("");
    const [playerPreview, setPlayerPreview] = useState<PlayerPreviewOutput | null>(null);
    const [creatorPayload, setCreatorPayload] = useState<QuestCreatorPayload | null>(null);

    const resetQuestState = () => {
        setWizardAnswers([]);
        setWizardStep(0);
        setViewMode("idle");
        setDraftPrompt("");
        setPlayerPreview(null);
        setCreatorPayload(null);
    };

    return (
        <QuestContext.Provider
            value={{
                wizardAnswers,
                setWizardAnswers,
                wizardStep,
                setWizardStep,
                viewMode,
                setViewMode,
                draftPrompt,
                setDraftPrompt,
                playerPreview,
                setPlayerPreview,
                creatorPayload,
                setCreatorPayload,
                resetQuestState,
            }}
        >
            {children}
        </QuestContext.Provider>
    );
};

export const useQuest = () => {
    const context = useContext(QuestContext);
    if (context === undefined) {
        throw new Error('useQuest must be used within a QuestProvider');
    }
    return context;
};
