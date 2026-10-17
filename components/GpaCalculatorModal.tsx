"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Calculator, Sparkles, Award } from 'lucide-react';

interface CourseGrade {
    id: string;
    code: string;
    credits: number;
    gradePoint: number;
}

const GRADE_SCALE = [
    { label: 'A+ (4.00)', value: 4.0 },
    { label: 'A  (3.75)', value: 3.75 },
    { label: 'A- (3.50)', value: 3.5 },
    { label: 'B+ (3.25)', value: 3.25 },
    { label: 'B  (3.00)', value: 3.0 },
    { label: 'B- (2.75)', value: 2.75 },
    { label: 'C+ (2.50)', value: 2.5 },
    { label: 'C  (2.25)', value: 2.25 },
    { label: 'D  (2.00)', value: 2.0 },
    { label: 'F  (0.00)', value: 0.0 },
];

export default function GpaCalculatorModal({
    isOpen,
    onClose
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const [courses, setCourses] = useState<CourseGrade[]>([
        { id: '1', code: 'STA 1201', credits: 3.0, gradePoint: 4.0 },
        { id: '2', code: 'STA 1202', credits: 3.0, gradePoint: 3.75 },
        { id: '3', code: 'STA 1203', credits: 3.0, gradePoint: 4.0 },
        { id: '4', code: 'STA 1204', credits: 1.5, gradePoint: 4.0 },
    ]);

    const [prevCgpa, setPrevCgpa] = useState<string>('');
    const [prevCredits, setPrevCredits] = useState<string>('');

    const addCourse = () => {
        setCourses(prev => [
            ...prev,
            {
                id: Math.random().toString(),
                code: `STA ${1200 + prev.length + 1}`,
                credits: 3.0,
                gradePoint: 4.0
            }
        ]);
    };

    const removeCourse = (id: string) => {
        if (courses.length <= 1) return;
        setCourses(prev => prev.filter(c => c.id !== id));
    };

    const updateCourse = (id: string, field: keyof CourseGrade, val: any) => {
        setCourses(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
    };

    // Calculate Semester GPA
    const totalCredits = courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
    const totalGradePoints = courses.reduce((sum, c) => sum + ((Number(c.credits) || 0) * (Number(c.gradePoint) || 0)), 0);
    const semesterGpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';

    // Calculate Cumulative CGPA
    const pCgpa = parseFloat(prevCgpa);
    const pCred = parseFloat(prevCredits);
    let cumulativeGpa = semesterGpa;

    if (!isNaN(pCgpa) && !isNaN(pCred) && pCred > 0) {
        const grandTotalCredits = pCred + totalCredits;
        const grandTotalPoints = (pCgpa * pCred) + totalGradePoints;
        cumulativeGpa = (grandTotalPoints / grandTotalCredits).toFixed(2);
    }

    const getGpaColor = (gpa: number) => {
        if (gpa >= 3.75) return 'from-emerald-400 to-cyan-400 text-emerald-300';
        if (gpa >= 3.25) return 'from-cyan-400 to-blue-400 text-cyan-300';
        if (gpa >= 2.75) return 'from-amber-400 to-orange-400 text-amber-300';
        return 'from-rose-400 to-red-400 text-rose-300';
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="w-full max-w-2xl bg-[#0b101e] border border-cyan-500/30 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(6,182,212,0.15)] flex flex-col max-h-[90vh] overflow-hidden relative"
                >
                    {/* Top neon glow bar */}
                    <div className="h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 w-full" />

                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                                <Calculator size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    Academic GPA & CGPA Calculator
                                    <span className="text-[10px] font-mono font-normal uppercase bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/20">4.0 Scale</span>
                                </h3>
                                <p className="text-xs text-gray-400">Calculate semester grades and projected cumulative average</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                        {/* GPA Summary Badges */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                <span className="text-xs text-gray-400 uppercase tracking-wider font-mono mb-1">Semester GPA (SGPA)</span>
                                <span className={`text-4xl font-black bg-gradient-to-r ${getGpaColor(parseFloat(semesterGpa))} bg-clip-text text-transparent`}>
                                    {semesterGpa}
                                </span>
                                <span className="text-[11px] text-gray-500 mt-1 font-mono">{totalCredits} Total Credits</span>
                            </div>

                            <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/30 to-blue-950/20 border border-cyan-500/30 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                                <div className="flex items-center gap-1.5 text-xs text-cyan-300 uppercase tracking-wider font-mono mb-1">
                                    <Award size={13} />
                                    <span>Cumulative CGPA</span>
                                </div>
                                <span className="text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                                    {cumulativeGpa}
                                </span>
                                <span className="text-[11px] text-cyan-400/80 mt-1 font-mono">
                                    {prevCredits ? `${(parseFloat(prevCredits) + totalCredits).toFixed(1)} Credits Total` : 'Based on Current Sem'}
                                </span>
                            </div>
                        </div>

                        {/* Optional Previous Semesters Input */}
                        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-mono text-gray-300">
                                <Sparkles size={14} className="text-cyan-400" />
                                <span>Include Previous Semesters (For Overall CGPA):</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] text-gray-400 mb-1">Previous CGPA</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="4"
                                        value={prevCgpa}
                                        onChange={(e) => setPrevCgpa(e.target.value)}
                                        placeholder="e.g. 3.65"
                                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-gray-400 mb-1">Completed Credits</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        value={prevCredits}
                                        onChange={(e) => setPrevCredits(e.target.value)}
                                        placeholder="e.g. 64.0"
                                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Current Semester Courses */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-mono uppercase text-gray-400 tracking-wider">Courses This Semester ({courses.length})</span>
                                <button
                                    onClick={addCourse}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono hover:bg-cyan-500/30 transition-all hover:scale-105"
                                >
                                    <Plus size={14} /> Add Course
                                </button>
                            </div>

                            <div className="space-y-2.5">
                                {courses.map((course, idx) => (
                                    <div
                                        key={course.id}
                                        className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors"
                                    >
                                        <span className="text-[11px] font-mono text-gray-500 w-5 text-center">{idx + 1}</span>
                                        <input
                                            type="text"
                                            value={course.code}
                                            onChange={(e) => updateCourse(course.id, 'code', e.target.value)}
                                            placeholder="Course Name / Code"
                                            className="flex-1 bg-transparent border-none text-xs sm:text-sm text-white outline-none font-medium placeholder-gray-600 min-w-0"
                                        />
                                        <div className="flex items-center gap-1.5">
                                            <select
                                                value={course.credits}
                                                onChange={(e) => updateCourse(course.id, 'credits', parseFloat(e.target.value))}
                                                className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-200 outline-none focus:border-cyan-400 font-mono"
                                                title="Credits"
                                            >
                                                <option value={1.0}>1.0 Cr</option>
                                                <option value={1.5}>1.5 Cr</option>
                                                <option value={2.0}>2.0 Cr</option>
                                                <option value={3.0}>3.0 Cr</option>
                                                <option value={4.0}>4.0 Cr</option>
                                            </select>

                                            <select
                                                value={course.gradePoint}
                                                onChange={(e) => updateCourse(course.id, 'gradePoint', parseFloat(e.target.value))}
                                                className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-cyan-300 outline-none focus:border-cyan-400 font-mono font-semibold"
                                                title="Grade Point"
                                            >
                                                {GRADE_SCALE.map(g => (
                                                    <option key={g.label} value={g.value}>{g.label}</option>
                                                ))}
                                            </select>

                                            <button
                                                onClick={() => removeCourse(course.id)}
                                                disabled={courses.length <= 1}
                                                className="p-1.5 text-gray-500 hover:text-rose-400 transition-colors disabled:opacity-30 disabled:hover:text-gray-500"
                                                title="Remove course"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 sm:p-5 border-t border-white/10 bg-black/40 flex items-center justify-between">
                        <span className="text-xs font-mono text-gray-400">Values calculated in real-time.</span>
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono uppercase tracking-wider hover:bg-cyan-500/30 transition-all"
                        >
                            Done
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
