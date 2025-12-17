import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDanger = false
}: ConfirmationModalProps) {
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
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 flex items-center justify-center z-[101] pointer-events-none p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md pointer-events-auto overflow-hidden border border-stone-100"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-stone-100">
                                <div className="flex items-center gap-3">
                                    {isDanger && (
                                        <div className="p-2 bg-rose-100 text-rose-600 rounded-full">
                                            <AlertTriangle size={20} />
                                        </div>
                                    )}
                                    <h3 className="font-bold text-lg text-stone-800">{title}</h3>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6">
                                <p className="text-stone-600 leading-relaxed text-sm">
                                    {message}
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg text-sm font-bold text-stone-600 hover:bg-stone-200 transition-colors"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold text-white shadow-md transition-all ${isDanger
                                            ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                                            : 'bg-brand-dark hover:bg-brand-gold shadow-stone-300'
                                        }`}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
