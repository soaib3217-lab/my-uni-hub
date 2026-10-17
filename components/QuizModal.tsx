"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, HelpCircle, Trophy, RotateCcw, Sparkles, ChevronRight, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export interface QuizQuestion {
    id: number;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

export default function QuizModal({
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
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCached, setIsCached] = useState(false);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const fetchQuiz = async (forceRefresh = false) => {
        setIsLoading(true);
        setErrorMessage(null);
        setSelectedAnswers({});
        setCurrentIndex(0);
        setIsFinished(false);
        setIsCached(false);

        try {
            const res = await fetch('/api/ai/quiz', {
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
            if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
                setQuestions(data.questions);
                setIsCached(true);
            } else {
                throw new Error(data.error || "Failed to load quiz questions.");
            }
        } catch (err: any) {
            console.error("Quiz fetch error:", err);
            setErrorMessage(err.message || "Failed to load AI quiz. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && fileTitle) {
            fetchQuiz(false);
        }
    }, [isOpen, fileTitle, courseId]);

    const handleSelectOption = (qIndex: number, optionIdx: number) => {
        if (selectedAnswers[qIndex] !== undefined) return; // already answered
        setSelectedAnswers(prev => ({ ...prev, [qIndex]: optionIdx }));
    };

    const totalQuestions = questions.length;
    const answeredCount = Object.keys(selectedAnswers).length;
    const correctCount = questions.reduce((acc, q, idx) => {
        return selectedAnswers[idx] === q.correctIndex ? acc + 1 : acc;
    }, 0);

    const currentQ = questions[currentIndex];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="w-full max-w-2xl bg-[#0b101e] border border-cyan-500/30 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.12)] flex flex-col max-h-[90vh] overflow-hidden relative transform-gpu"
                >
                    {/* Top neon glow line */}
                    <div className="h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-fuchsia-500 w-full shrink-0" />

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-white/[0.02] gap-3 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)] shrink-0">
                                <Sparkles size={22} />
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
                                    <span>AI Practice Quiz</span>
                                    <span className="text-gray-500 text-xs">•</span>
                                    <span className="text-gray-300 text-xs sm:text-sm font-normal truncate max-w-[200px] sm:max-w-md font-sans">
                                        {fileTitle}
                                    </span>
                                </h3>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors border border-white/5 self-end sm:self-center shrink-0"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 overscroll-contain [scroll-behavior:auto!important] [transform:translateZ(0)] [will-change:scroll-position] [contain:content]">
                        {isLoading && (
                            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="relative w-16 h-16 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin" />
                                    <HelpCircle size={24} className="text-cyan-400 animate-pulse" />
                                </div>
                                <h4 className="text-lg font-bold text-white">Loading Practice Quiz...</h4>
                                <p className="text-xs text-gray-400 max-w-xs font-mono">
                                    Formulating conceptual questions & mathematical derivations for this note.
                                </p>
                            </div>
                        )}

                        {!isLoading && errorMessage && (
                            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                                    <AlertCircle size={28} />
                                </div>
                                <h4 className="text-base font-bold text-white">Quiz Loading Error</h4>
                                <p className="text-xs text-gray-400 max-w-md">{errorMessage}</p>
                                <button
                                    onClick={() => fetchQuiz(false)}
                                    className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono flex items-center gap-2 hover:bg-cyan-500/30 transition-all"
                                >
                                    <RotateCcw size={14} /> Try Again
                                </button>
                            </div>
                        )}

                        {!isLoading && !errorMessage && isFinished && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-10 flex flex-col items-center justify-center text-center space-y-5"
                            >
                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500/20 via-emerald-500/15 to-transparent border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                                    <Trophy size={36} className="text-amber-300 drop-shadow-[0_0_15px_rgba(252,211,77,0.5)]" />
                                </div>

                                <div>
                                    <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">Quiz Completed</span>
                                    <h3 className="text-3xl font-black text-white mt-1">
                                        Your Score: <span className={correctCount >= 3 ? "text-emerald-400" : "text-amber-400"}>{correctCount}</span> / {totalQuestions}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-2 font-mono">
                                        {correctCount === 5 ? "🌟 Outstanding Mastery! Complete comprehension achieved." :
                                         correctCount >= 3 ? "🎯 Solid comprehension! Review the explanations below." :
                                         "📚 Keep studying! Review the formulas in the Exam Cheat Sheet."}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 pt-4">
                                    <button
                                        onClick={() => fetchQuiz(false)}
                                        className="px-5 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono uppercase tracking-wider hover:bg-cyan-500/30 transition-all flex items-center gap-2 font-bold"
                                    >
                                        <RotateCcw size={14} /> Retake Quiz
                                    </button>
                                    <button
                                        onClick={() => setIsFinished(false)}
                                        className="px-5 py-2.5 rounded-xl bg-white/10 text-white border border-white/20 text-xs font-mono uppercase tracking-wider hover:bg-white/20 transition-all"
                                    >
                                        Review Answers
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {!isLoading && !errorMessage && !isFinished && currentQ && (
                            <div className="space-y-6">
                                {/* Question Progress & Dots */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                                        Question {currentIndex + 1} of {totalQuestions} • {answeredCount}/{totalQuestions} Answered
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        {questions.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setCurrentIndex(idx)}
                                                className={`w-2.5 h-2.5 rounded-full transition-all ${
                                                    idx === currentIndex
                                                        ? 'bg-cyan-400 scale-125 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                                                        : selectedAnswers[idx] !== undefined
                                                            ? selectedAnswers[idx] === questions[idx].correctIndex
                                                                ? 'bg-emerald-400'
                                                                : 'bg-rose-400'
                                                            : 'bg-white/20'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Question Title with KaTeX */}
                                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 shadow-sm">
                                    <div className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                            {currentQ.question}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                {/* Options */}
                                <div className="space-y-2.5">
                                    {currentQ.options.map((option, optIdx) => {
                                        const isSelected = selectedAnswers[currentIndex] === optIdx;
                                        const isAnswered = selectedAnswers[currentIndex] !== undefined;
                                        const isCorrect = optIdx === currentQ.correctIndex;

                                        let style = "bg-white/[0.03] border-white/10 hover:bg-white/[0.07] text-gray-200 hover:border-cyan-500/40";
                                        if (isAnswered) {
                                            if (isCorrect) {
                                                style = "bg-emerald-500/20 border-emerald-500/50 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                                            } else if (isSelected) {
                                                style = "bg-rose-500/20 border-rose-500/50 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.2)]";
                                            } else {
                                                style = "bg-white/[0.02] border-white/5 text-gray-500 opacity-60";
                                            }
                                        }

                                        return (
                                            <button
                                                key={optIdx}
                                                disabled={isAnswered}
                                                onClick={() => handleSelectOption(currentIndex, optIdx)}
                                                className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs sm:text-sm font-sans flex items-center justify-between gap-3 ${style}`}
                                            >
                                                <div className="flex-1">
                                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                        {option}
                                                    </ReactMarkdown>
                                                </div>
                                                {isAnswered && isCorrect && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
                                                {isAnswered && isSelected && !isCorrect && <AlertCircle size={16} className="text-rose-400 shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Explanation Banner once answered */}
                                {selectedAnswers[currentIndex] !== undefined && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 rounded-xl bg-white/[0.03] border border-cyan-500/20 text-xs space-y-1.5"
                                    >
                                        <div className="font-mono uppercase font-bold text-[10px] text-cyan-300 flex items-center gap-1.5">
                                            <HelpCircle size={12} /> Solution Explanation:
                                        </div>
                                        <div className="text-gray-300 leading-relaxed font-sans">
                                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                {currentQ.explanation}
                                            </ReactMarkdown>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Bottom navigation buttons */}
                                <div className="flex items-center justify-between pt-2">
                                    <button
                                        disabled={currentIndex === 0}
                                        onClick={() => setCurrentIndex(prev => prev - 1)}
                                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-gray-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                    >
                                        Previous
                                    </button>

                                    {currentIndex < totalQuestions - 1 ? (
                                        <button
                                            onClick={() => setCurrentIndex(prev => prev + 1)}
                                            className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs font-mono hover:bg-cyan-500/30 transition-all flex items-center gap-1"
                                        >
                                            Next <ChevronRight size={14} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setIsFinished(true)}
                                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold text-xs font-mono uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:scale-105 transition-all"
                                        >
                                            View Final Results
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
