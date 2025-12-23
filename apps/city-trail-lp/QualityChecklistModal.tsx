import React, { useState, useMemo } from 'react';
import { X, Check, AlertCircle, ChevronRight, Lock, Share2, Globe, Play, Copy, ExternalLink } from 'lucide-react';
import {
    QuestMode,
    QualityChecklist,
    QualityCheckItem,
    QualityCheckCategory,
    QUALITY_CHECKLIST_ITEMS,
    QUALITY_CHECK_CATEGORY_LABELS,
    QUEST_MODE_CONFIG,
    getRequiredChecklistItems,
    isQualityCheckComplete,
    getIncompleteItems,
} from './questCreatorTypes';

interface QualityChecklistModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetMode: QuestMode; // SHARE or PUBLISH
    currentChecklist: QualityChecklist;
    onChecklistChange: (checklist: QualityChecklist) => void;
    onConfirm: () => void;
    userId?: string;
    shareToken?: string | null;
    onGenerateShareToken?: () => void;
}

export default function QualityChecklistModal({
    isOpen,
    onClose,
    targetMode,
    currentChecklist,
    onChecklistChange,
    onConfirm,
    userId,
    shareToken,
    onGenerateShareToken,
}: QualityChecklistModalProps) {
    const [copied, setCopied] = useState(false);

    const requiredItems = useMemo(() => getRequiredChecklistItems(targetMode), [targetMode]);
    const isComplete = useMemo(() => isQualityCheckComplete(targetMode, currentChecklist), [targetMode, currentChecklist]);
    const incompleteItems = useMemo(() => getIncompleteItems(targetMode, currentChecklist), [targetMode, currentChecklist]);

    // Group items by category
    const groupedItems = useMemo(() => {
        const groups: Record<QualityCheckCategory, QualityCheckItem[]> = {
            route: [],
            info: [],
            mystery: [],
            rescue: [],
        };
        requiredItems.forEach(item => {
            groups[item.category].push(item);
        });
        return groups;
    }, [requiredItems]);

    const handleToggleItem = (itemId: string) => {
        const currentRecord = currentChecklist[itemId];
        const newChecklist: QualityChecklist = {
            ...currentChecklist,
            [itemId]: {
                completed: !(currentRecord?.completed),
                completedAt: !(currentRecord?.completed) ? new Date().toISOString() : undefined,
                completedBy: !(currentRecord?.completed) ? userId : undefined,
            },
        };
        onChecklistChange(newChecklist);
    };

    const handleCopyShareLink = async () => {
        if (!shareToken) return;
        const shareUrl = `${window.location.origin}/play/shared/${shareToken}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    if (!isOpen) return null;

    const modeConfig = QUEST_MODE_CONFIG[targetMode];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-stone-200">
                    <div className="flex items-center gap-3">
                        {targetMode === 'SHARE' ? (
                            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
                                <Share2 className="w-5 h-5 text-sky-600" />
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Globe className="w-5 h-5 text-emerald-600" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-stone-800">
                                {targetMode === 'SHARE' ? '共有前チェック' : '公開前チェック'}
                            </h2>
                            <p className="text-sm text-stone-500">{modeConfig.description}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-stone-500" />
                    </button>
                </div>

                {/* Info Banner */}
                <div className={`mx-6 mt-4 p-4 rounded-xl border ${targetMode === 'SHARE' ? 'bg-sky-50 border-sky-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className="flex items-start gap-3">
                        <AlertCircle className={`w-5 h-5 mt-0.5 ${targetMode === 'SHARE' ? 'text-sky-600' : 'text-emerald-600'}`} />
                        <div className="flex-1">
                            <p className={`text-sm font-medium ${targetMode === 'SHARE' ? 'text-sky-800' : 'text-emerald-800'}`}>
                                {targetMode === 'SHARE'
                                    ? '友人や仲間に共有する前に、以下の項目を確認してください。'
                                    : '公開審査を申請する前に、以下の項目を全て確認してください。'}
                            </p>
                            <p className={`text-xs mt-1 ${targetMode === 'SHARE' ? 'text-sky-600' : 'text-emerald-600'}`}>
                                {targetMode === 'SHARE'
                                    ? '少人数でも体験事故を防ぐために、最低限のチェックが必要です。'
                                    : '公開品質を担保し、ブランド信頼を守るために厳格なチェックが必要です。'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Checklist Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {(Object.keys(groupedItems) as QualityCheckCategory[]).map(category => {
                        const items = groupedItems[category];
                        if (items.length === 0) return null;

                        const categoryConfig = QUALITY_CHECK_CATEGORY_LABELS[category];
                        const categoryComplete = items.every(item => currentChecklist[item.id]?.completed);

                        return (
                            <div key={category} className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{categoryConfig.icon}</span>
                                    <h3 className="font-semibold text-stone-700">{categoryConfig.label}</h3>
                                    {categoryComplete && (
                                        <span className="ml-auto text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                            ✓ 完了
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {items.map(item => {
                                        const record = currentChecklist[item.id];
                                        const isChecked = record?.completed === true;

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => handleToggleItem(item.id)}
                                                className={`
                          flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all
                          ${isChecked
                                                        ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-stone-50 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                                                    }
                        `}
                                            >
                                                <div
                                                    className={`
                            w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors
                            ${isChecked
                                                            ? 'bg-emerald-500 text-white'
                                                            : 'bg-white border-2 border-stone-300'
                                                        }
                          `}
                                                >
                                                    {isChecked && <Check className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-medium ${isChecked ? 'text-emerald-800' : 'text-stone-700'}`}>
                                                        {item.label}
                                                    </p>
                                                    <p className={`text-sm ${isChecked ? 'text-emerald-600' : 'text-stone-500'}`}>
                                                        {item.description}
                                                    </p>
                                                </div>
                                                {item.linkedSection && (
                                                    <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isChecked ? 'text-emerald-400' : 'text-stone-400'}`} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="border-t border-stone-200 p-6">
                    {/* Progress indicator */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-stone-600">
                                チェック進捗: {requiredItems.length - incompleteItems.length} / {requiredItems.length}
                            </span>
                            {isComplete ? (
                                <span className="text-emerald-600 font-medium">✓ 全項目完了</span>
                            ) : (
                                <span className="text-amber-600 font-medium">残り {incompleteItems.length} 項目</span>
                            )}
                        </div>
                        <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${((requiredItems.length - incompleteItems.length) / requiredItems.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Share Link (for SHARE mode when complete) */}
                    {targetMode === 'SHARE' && isComplete && (
                        <div className="mb-4 p-4 bg-sky-50 rounded-xl border border-sky-200">
                            <p className="text-sm font-medium text-sky-800 mb-2">共有リンク</p>
                            {shareToken ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${window.location.origin}/play/shared/${shareToken}`}
                                        className="flex-1 px-3 py-2 bg-white border border-sky-200 rounded-lg text-sm text-stone-700"
                                    />
                                    <button
                                        onClick={handleCopyShareLink}
                                        className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors flex items-center gap-2"
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'コピー済み' : 'コピー'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={onGenerateShareToken}
                                    className="w-full px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    共有リンクを生成
                                </button>
                            )}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition-colors"
                        >
                            閉じる
                        </button>
                        {targetMode === 'PUBLISH' && (
                            <button
                                onClick={onConfirm}
                                disabled={!isComplete}
                                className={`
                  flex-1 px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                  ${isComplete
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                    }
                `}
                            >
                                {isComplete ? (
                                    <>
                                        <Globe className="w-4 h-4" />
                                        審査を申請
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-4 h-4" />
                                        チェック未完了
                                    </>
                                )}
                            </button>
                        )}
                        {targetMode === 'SHARE' && (
                            <button
                                onClick={onConfirm}
                                disabled={!isComplete}
                                className={`
                  flex-1 px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                  ${isComplete
                                        ? 'bg-sky-600 text-white hover:bg-sky-700'
                                        : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                    }
                `}
                            >
                                {isComplete ? (
                                    <>
                                        <Share2 className="w-4 h-4" />
                                        共有を有効化
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-4 h-4" />
                                        チェック未完了
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
