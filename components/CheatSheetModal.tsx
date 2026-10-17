"use client";

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Copy, Check, Printer, RotateCcw, BookOpen, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/**
 * Pre-processes markdown to fix any collapsed table rows or formatting artifacts
 */
function sanitizeCheatSheetMarkdown(raw: string): string {
    if (!raw) return '';
    let text = raw;

    // Normalize escaped newlines
    if (text.includes('\\n') && !text.includes('\n')) {
        text = text.replace(/\\n/g, '\n');
    }

    // Fix double-pipe table delimiters like "||" into "|\n|"
    text = text.replace(/\|\s*\|/g, '|\n|');

    // Ensure steps start on fresh lines
    text = text.replace(/([^\n])\s*(\*{0,2}Step\s+\d+:)/gi, '$1\n\n$2');

    return text;
}

export default function CheatSheetModal({
    isOpen,
    onClose,
    courseId,
    fileTitle,
    courseCode
}: {
    isOpen: boolean;
    onClose: () => void;
    courseId?: string;
    fileTitle: string;
    courseCode: string;
}) {
    const [markdown, setMarkdown] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCached, setIsCached] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateCheatSheet = async (forceRefresh = false) => {
        setIsLoading(true);
        setError(null);
        setMarkdown('');
        setIsCached(false);

        try {
            const res = await fetch('/api/ai/cheatsheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId,
                    title: fileTitle,
                    courseCode: courseCode,
                    forceRefresh
                })
            });

            const data = await res.json();
            if (data.success && data.markdown) {
                setMarkdown(data.markdown);
                setIsCached(true);
            } else {
                throw new Error(data.error || "Failed to load cheat sheet.");
            }
        } catch (err: any) {
            console.error("Cheat sheet error:", err);
            setError(err.message || "Failed to load exam cheat sheet.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && fileTitle) {
            generateCheatSheet(false);
        }
    }, [isOpen, fileTitle, courseId]);

    const handleCopy = () => {
        if (!markdown) return;
        navigator.clipboard.writeText(markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrint = () => {
        window.print();
    };

    const cleanedMarkdown = useMemo(() => sanitizeCheatSheetMarkdown(markdown), [markdown]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 12 }}
                    className="w-full max-w-4xl lg:max-w-5xl bg-[#090d18] border border-cyan-500/30 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.12)] flex flex-col max-h-[92vh] overflow-hidden relative transform-gpu"
                >
                    {/* Top glowing accent gradient bar */}
                    <div className="h-1 bg-gradient-to-r from-amber-400 via-cyan-400 to-indigo-500 w-full shrink-0" />

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-white/[0.02] gap-3 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] shrink-0">
                                <BookOpen size={22} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                    <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold tracking-wide shrink-0">
                                        {courseCode}
                                    </span>
                                    {isCached && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-medium whitespace-nowrap shrink-0">
                                            <Database size={11} className="shrink-0" /> Saved in DB
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                    <span>Exam Cheat Sheet</span>
                                    <span className="text-gray-500 text-xs">•</span>
                                    <span className="text-gray-300 text-xs sm:text-sm font-normal truncate max-w-[200px] sm:max-w-md font-sans">
                                        {fileTitle}
                                    </span>
                                </h3>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {markdown && (
                                <>
                                    <button
                                        onClick={handleCopy}
                                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-mono"
                                        title="Copy Markdown"
                                    >
                                        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                        <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-mono"
                                        title="Print / PDF"
                                    >
                                        <Printer size={14} />
                                        <span className="hidden sm:inline">Print</span>
                                    </button>
                                    <button
                                        onClick={() => generateCheatSheet(true)}
                                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-cyan-300 hover:bg-white/10 transition-colors text-xs font-mono"
                                        title="Regenerate & update database"
                                    >
                                        <RotateCcw size={14} />
                                    </button>
                                </>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Content Area - Fast hardware-accelerated scrolling with containment */}
                    <div 
                        id="printable-cheatsheet" 
                        className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar overscroll-contain [scroll-behavior:auto!important] [transform:translateZ(0)] [will-change:scroll-position] [contain:content]"
                    >
                        {isLoading && (
                            <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="relative w-16 h-16 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin" />
                                    <Sparkles size={24} className="text-amber-400 animate-pulse" />
                                </div>
                                <h4 className="text-lg font-bold text-white">Loading Exam Cheat Sheet...</h4>
                                <p className="text-xs text-gray-400 max-w-xs font-mono">
                                    Retrieving high-yield formulas, step-by-step calculations & concepts.
                                </p>
                            </div>
                        )}

                        {!isLoading && error && (
                            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                                <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 px-4 py-2 rounded-xl">
                                    {error}
                                </p>
                                <button
                                    onClick={() => generateCheatSheet(false)}
                                    className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono flex items-center gap-2 hover:bg-cyan-500/30 transition-all"
                                >
                                    <RotateCcw size={14} /> Try Again
                                </button>
                            </div>
                        )}

                        {!isLoading && !error && cleanedMarkdown && (
                            <div className="prose prose-invert prose-cyan max-w-none text-sm leading-relaxed font-sans space-y-4">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                        h1: ({ ...props }) => (
                                            <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-cyan-200 to-white pb-3 border-b border-white/10 mb-4" {...props} />
                                        ),
                                        h2: ({ ...props }) => (
                                            <h2 className="text-base sm:text-lg font-bold text-cyan-300 mt-6 mb-3 flex items-center gap-2 pb-1.5 border-b border-cyan-500/20" {...props} />
                                        ),
                                        h3: ({ ...props }) => (
                                            <h3 className="text-sm sm:text-base font-semibold text-amber-300 mt-5 mb-2" {...props} />
                                        ),
                                        p: ({ ...props }) => (
                                            <p className="text-gray-200 leading-relaxed my-2 text-xs sm:text-sm" {...props} />
                                        ),
                                        ul: ({ ...props }) => (
                                            <ul className="list-disc list-inside space-y-1.5 my-2.5 text-gray-200 text-xs sm:text-sm pl-2" {...props} />
                                        ),
                                        ol: ({ ...props }) => (
                                            <ol className="list-decimal list-inside space-y-1.5 my-2.5 text-gray-200 text-xs sm:text-sm pl-2" {...props} />
                                        ),
                                        li: ({ ...props }) => (
                                            <li className="text-gray-200 text-xs sm:text-sm leading-relaxed" {...props} />
                                        ),
                                        strong: ({ ...props }) => (
                                            <strong className="font-bold text-white text-cyan-100" {...props} />
                                        ),
                                        code: ({ ...props }) => (
                                            <code className="bg-slate-900 text-cyan-300 px-1.5 py-0.5 rounded font-mono text-xs border border-white/10" {...props} />
                                        ),
                                        blockquote: ({ ...props }) => (
                                            <blockquote className="border-l-4 border-amber-400 bg-amber-500/10 p-3.5 rounded-r-xl italic text-xs sm:text-sm text-amber-200/90 my-3" {...props} />
                                        ),
                                        table: ({ ...props }) => (
                                            <div className="my-5 overflow-x-auto rounded-2xl border border-cyan-500/30 bg-slate-950/70 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
                                                <table className="min-w-full text-xs text-left divide-y divide-white/10 border-collapse" {...props} />
                                            </div>
                                        ),
                                        thead: ({ ...props }) => (
                                            <thead className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 font-mono text-cyan-300 uppercase tracking-wider text-[11px]" {...props} />
                                        ),
                                        tbody: ({ ...props }) => (
                                            <tbody className="divide-y divide-white/5 bg-slate-950/40" {...props} />
                                        ),
                                        tr: ({ ...props }) => (
                                            <tr className="hover:bg-cyan-500/[0.06] transition-colors" {...props} />
                                        ),
                                        th: ({ ...props }) => (
                                            <th className="px-4 py-3 text-center font-bold text-cyan-200 border-x border-white/5 whitespace-nowrap" {...props} />
                                        ),
                                        td: ({ ...props }) => (
                                            <td className="px-4 py-2.5 text-center text-gray-200 border-x border-white/5 font-mono text-xs whitespace-nowrap" {...props} />
                                        ),
                                    }}
                                >
                                    {cleanedMarkdown}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
