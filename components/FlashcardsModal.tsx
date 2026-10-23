"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ChevronLeft, ChevronRight, RotateCcw, Shuffle, Layers, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export interface Flashcard {
    id: number;
    question: string;
    answer: string;
    keyFormula?: string;
    category?: string;
}

export default function FlashcardsModal({
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
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [knownCards, setKnownCards] = useState<Set<number>>(new Set());

    const fetchFlashcards = async (forceRefresh = false) => {
        setIsLoading(true);
        setError(null);
        setIsFlipped(false);
        setCurrentIndex(0);
        setKnownCards(new Set());

        try {
            const res = await fetch('/api/ai/flashcards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId,
                    title: fileTitle,
                    courseCode,
                    forceRefresh
                })
            });

            const data = await res.json();
            if (data.success && Array.isArray(data.flashcards) && data.flashcards.length > 0) {
                setCards(data.flashcards);
            } else {
                throw new Error(data.error || "No flashcards generated for this course.");
            }
        } catch (err: any) {
            console.error("Flashcards error:", err);
            setError(err.message || "Failed to load flashcards.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && fileTitle) {
            fetchFlashcards(false);
        }
    }, [isOpen, fileTitle, courseId]);

    const handleNext = () => {
        setIsFlipped(false);
        if (currentIndex < cards.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setCurrentIndex(0); // Loop back
        }
    };

    const handlePrev = () => {
        setIsFlipped(false);
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        } else {
            setCurrentIndex(cards.length - 1);
        }
    };

    const handleShuffle = () => {
        setIsFlipped(false);
        const shuffled = [...cards].sort(() => Math.random() - 0.5);
        setCards(shuffled);
        setCurrentIndex(0);
    };

    const toggleKnown = (cardId: number) => {
        setKnownCards(prev => {
            const next = new Set(prev);
            if (next.has(cardId)) {
                next.delete(cardId);
            } else {
                next.add(cardId);
            }
            return next;
        });
    };

    const currentCard = cards[currentIndex];
    const isMastered = currentCard ? knownCards.has(currentCard.id) : false;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-2xl bg-neutral-900 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                                <Layers size={20} />
                            </div>
                            <div>
                                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                    AI Interactive Flashcards
                                    <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                        Active Recall
                                    </span>
                                </h2>
                                <p className="text-xs text-neutral-400 truncate max-w-sm sm:max-w-md">
                                    {fileTitle} {courseCode && `• ${courseCode}`}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchFlashcards(true)}
                                title="Regenerate Deck"
                                disabled={isLoading}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition"
                            >
                                <RotateCcw size={16} className={isLoading ? "animate-spin" : ""} />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 flex-1 flex flex-col items-center justify-center overflow-y-auto min-h-[350px]">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                                <p className="text-sm text-cyan-300 font-medium">Generating High-Yield Flashcards...</p>
                                <p className="text-xs text-neutral-500">Extracting formulas, definitions & theorems</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-12 px-4">
                                <p className="text-red-400 text-sm mb-3">{error}</p>
                                <button
                                    onClick={() => fetchFlashcards(true)}
                                    className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-xl text-xs font-semibold border border-cyan-500/40 transition"
                                >
                                    Retry Generation
                                </button>
                            </div>
                        ) : currentCard ? (
                            <div className="w-full flex flex-col items-center gap-4">
                                {/* Progress & Mastered Counter */}
                                <div className="w-full flex items-center justify-between text-xs text-neutral-400 px-1">
                                    <span className="font-semibold text-cyan-400">
                                        Card {currentIndex + 1} of {cards.length}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[11px] text-neutral-400">
                                            Mastered: <strong className="text-emerald-400">{knownCards.size}</strong>/{cards.length}
                                        </span>
                                        <button
                                            onClick={handleShuffle}
                                            title="Shuffle Deck"
                                            className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition"
                                        >
                                            <Shuffle size={12} /> Shuffle
                                        </button>
                                    </div>
                                </div>

                                {/* Flashcard Card Container */}
                                <div
                                    onClick={() => setIsFlipped(!isFlipped)}
                                    style={{ perspective: "1200px" }}
                                    className="relative w-full h-[280px] sm:h-[320px] cursor-pointer select-none"
                                >
                                    <motion.div
                                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                                        transition={{ duration: 0.5, ease: "easeInOut" }}
                                        style={{ transformStyle: "preserve-3d" }}
                                        className="relative w-full h-full rounded-2xl shadow-xl"
                                    >
                                        {/* FRONT FACE (Question) */}
                                        <div
                                            style={{
                                                backfaceVisibility: "hidden",
                                                WebkitBackfaceVisibility: "hidden",
                                                transform: "rotateY(0deg)"
                                            }}
                                            className="absolute inset-0 bg-gradient-to-br from-neutral-800/90 to-neutral-900/95 border border-cyan-500/30 rounded-2xl p-6 flex flex-col justify-between shadow-2xl"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                                    {currentCard.category || "Question"}
                                                </span>
                                                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                                                    <Sparkles size={11} className="text-cyan-400" /> Click to reveal answer
                                                </span>
                                            </div>

                                            <div className="text-center my-auto py-2">
                                                <div className="text-base sm:text-lg font-medium text-white leading-relaxed markdown-content">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkMath]}
                                                        rehypePlugins={[rehypeKatex]}
                                                    >
                                                        {currentCard.question}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>

                                            <div className="text-center text-[11px] text-neutral-500">
                                                Flip Card ↻
                                            </div>
                                        </div>

                                        {/* BACK FACE (Answer) */}
                                        <div
                                            style={{
                                                backfaceVisibility: "hidden",
                                                WebkitBackfaceVisibility: "hidden",
                                                transform: "rotateY(180deg)"
                                            }}
                                            className="absolute inset-0 bg-gradient-to-br from-neutral-800/95 to-neutral-900 border border-emerald-500/40 rounded-2xl p-6 flex flex-col justify-between shadow-2xl overflow-y-auto"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                                    Answer & Explanation
                                                </span>
                                                <span className="text-[10px] text-neutral-400">
                                                    Click to view question
                                                </span>
                                            </div>

                                            <div className="my-auto py-2">
                                                <div className="text-sm sm:text-base text-neutral-100 leading-relaxed markdown-content">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkMath]}
                                                        rehypePlugins={[rehypeKatex]}
                                                    >
                                                        {currentCard.answer}
                                                    </ReactMarkdown>
                                                </div>

                                                {currentCard.keyFormula && (
                                                    <div className="mt-3 p-2.5 rounded-xl bg-black/40 border border-emerald-500/20 text-xs text-emerald-200">
                                                        <span className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">Key Formula:</span>
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkMath]}
                                                            rehypePlugins={[rehypeKatex]}
                                                        >
                                                            {currentCard.keyFormula}
                                                        </ReactMarkdown>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-center text-[11px] text-neutral-500">
                                                Click to flip back
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Controls */}
                                <div className="w-full flex items-center justify-between gap-3 mt-1">
                                    <button
                                        onClick={handlePrev}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl text-xs font-semibold border border-white/10 transition"
                                    >
                                        <ChevronLeft size={16} /> Prev
                                    </button>

                                    <button
                                        onClick={() => toggleKnown(currentCard.id)}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                                            isMastered
                                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                                : "bg-white/5 text-neutral-400 hover:text-white border-white/10"
                                        }`}
                                    >
                                        <CheckCircle2 size={15} />
                                        {isMastered ? "Mastered" : "Mark Mastered"}
                                    </button>

                                    <button
                                        onClick={handleNext}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-xl text-xs font-semibold border border-cyan-500/40 transition"
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
