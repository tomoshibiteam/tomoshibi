import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Edit,
    RefreshCw,
    Lock,
    Unlock,
    ChevronDown,
    ChevronUp,
    Check,
    X,
    AlertCircle,
    Loader2,
    MapPin,
    BookOpen,
    Users,
    Info,
} from 'lucide-react';
import { SectionStatus, SectionType, STATUS_CONFIG, SECTION_LABELS } from './questCreatorTypes';

interface SectionCardProps {
    id: string;
    type: SectionType;
    status: SectionStatus;
    title?: string;
    spotIndex?: number;
    children: React.ReactNode;
    editContent?: React.ReactNode;
    onEdit?: () => void;
    onSave?: () => void;
    onCancel?: () => void;
    onRegenerate?: () => void;
    onLock?: () => void;
    onUnlock?: () => void;
    onRetry?: () => void;
    isEditing?: boolean;
    error?: string;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

const getIconForType = (type: SectionType) => {
    switch (type) {
        case 'basic-info':
            return Info;
        case 'spot':
            return MapPin;
        case 'story-prologue':
        case 'story-epilogue':
            return BookOpen;
        case 'story-characters':
            return Users;
        default:
            return Info;
    }
};

export default function SectionCard({
    id,
    type,
    status,
    title,
    spotIndex,
    children,
    editContent,
    onEdit,
    onSave,
    onCancel,
    onRegenerate,
    onLock,
    onUnlock,
    onRetry,
    isEditing = false,
    error,
    collapsed = false,
    onToggleCollapse,
}: SectionCardProps) {
    const statusConfig = STATUS_CONFIG[status];
    const Icon = getIconForType(type);
    const displayTitle = title || (spotIndex !== undefined
        ? `${SECTION_LABELS[type]} ${spotIndex + 1}`
        : SECTION_LABELS[type]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`bg-white rounded-2xl border transition-all duration-300 ${status === 'generating'
                    ? 'border-amber-200 shadow-lg shadow-amber-100/50'
                    : status === 'error'
                        ? 'border-rose-200 shadow-lg shadow-rose-100/50'
                        : status === 'editing'
                            ? 'border-sky-200 shadow-lg shadow-sky-100/50'
                            : status === 'locked'
                                ? 'border-violet-200'
                                : 'border-stone-200 shadow-md hover:shadow-lg'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${status === 'generating' ? 'bg-amber-100' :
                            status === 'error' ? 'bg-rose-100' :
                                status === 'locked' ? 'bg-violet-100' :
                                    'bg-brand-base'
                        }`}>
                        {status === 'generating' ? (
                            <Loader2 size={18} className="text-amber-600 animate-spin" />
                        ) : status === 'error' ? (
                            <AlertCircle size={18} className="text-rose-600" />
                        ) : status === 'locked' ? (
                            <Lock size={14} className="text-violet-600" />
                        ) : (
                            <Icon size={18} className="text-brand-dark" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-brand-dark text-sm">{displayTitle}</h3>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusConfig.className}`}>
                            {statusConfig.label}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {/* Action buttons based on status */}
                    {status === 'ready' && !isEditing && (
                        <>
                            {onEdit && (
                                <button
                                    onClick={onEdit}
                                    className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-brand-dark transition-colors"
                                    title="編集"
                                >
                                    <Edit size={16} />
                                </button>
                            )}
                            {onRegenerate && (
                                <button
                                    onClick={onRegenerate}
                                    className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-brand-dark transition-colors"
                                    title="再生成"
                                >
                                    <RefreshCw size={16} />
                                </button>
                            )}
                            {onLock && (
                                <button
                                    onClick={onLock}
                                    className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-brand-dark transition-colors"
                                    title="ロック"
                                >
                                    <Lock size={16} />
                                </button>
                            )}
                        </>
                    )}

                    {status === 'locked' && onUnlock && (
                        <button
                            onClick={onUnlock}
                            className="p-2 rounded-lg hover:bg-violet-50 text-violet-500 hover:text-violet-700 transition-colors"
                            title="ロック解除"
                        >
                            <Unlock size={16} />
                        </button>
                    )}

                    {status === 'error' && onRetry && (
                        <button
                            onClick={onRetry}
                            className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold transition-colors"
                        >
                            再試行
                        </button>
                    )}

                    {/* Collapse toggle */}
                    {onToggleCollapse && status !== 'generating' && (
                        <button
                            onClick={onToggleCollapse}
                            className="p-2 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                        >
                            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Body */}
            <AnimatePresence mode="wait">
                {!collapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="p-4">
                            {status === 'generating' ? (
                                <div className="space-y-3">
                                    <div className="h-4 bg-gradient-to-r from-stone-100 via-stone-200 to-stone-100 rounded animate-pulse" />
                                    <div className="h-4 bg-gradient-to-r from-stone-100 via-stone-200 to-stone-100 rounded animate-pulse w-3/4" />
                                    <div className="h-4 bg-gradient-to-r from-stone-100 via-stone-200 to-stone-100 rounded animate-pulse w-1/2" />
                                </div>
                            ) : status === 'error' && error ? (
                                <div className="text-sm text-rose-600 bg-rose-50 p-3 rounded-lg">
                                    {error}
                                </div>
                            ) : isEditing && editContent ? (
                                editContent
                            ) : (
                                children
                            )}
                        </div>

                        {/* Footer (only when editing) */}
                        {isEditing && (
                            <div className="flex items-center justify-end gap-2 px-4 pb-4">
                                <button
                                    onClick={onCancel}
                                    className="px-4 py-2 rounded-full border border-stone-200 text-stone-600 text-sm font-bold hover:bg-stone-50 transition-colors flex items-center gap-1"
                                >
                                    <X size={14} />
                                    キャンセル
                                </button>
                                <button
                                    onClick={onSave}
                                    className="px-4 py-2 rounded-full bg-brand-dark text-white text-sm font-bold hover:bg-brand-gold transition-colors flex items-center gap-1 shadow-md"
                                >
                                    <Check size={14} />
                                    保存
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
