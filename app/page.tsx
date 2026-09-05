"use client";

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from "framer-motion";
import {
    Trash2, Plus, Upload, Lock, Unlock, FileText, Send, X,
    ChevronRight, ChevronDown, Folder, Sparkles, MessageSquare,
    Minimize2, Loader2, GraduationCap, Menu, Search, FolderPlus,
    File, User, Lightbulb, Grid, Home as HomeIcon, MoreVertical, ExternalLink
} from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// --- CONFIGURATION ---
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GOOGLE_SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL!;

function getDriveThumbnail(url: string) {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
    }
    return null;
}

function getFileIdFromUrl(url: string) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}

// 🖼️ Thumbnail Component
const FileThumbnail = ({ url, fileTitle }: { url: string, fileTitle: string }) => {
    const [imgSrc, setImgSrc] = useState<string | null>(getDriveThumbnail(url));
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setImgSrc(getDriveThumbnail(url));
        setHasError(false);
    }, [url]);

    const getGradient = (title: string) => {
        const char = title.charAt(0).toUpperCase();
        if (char >= 'A' && char <= 'F') return 'from-blue-600/60 to-cyan-400/60';
        if (char >= 'G' && char <= 'L') return 'from-purple-600/60 to-fuchsia-400/60';
        if (char >= 'M' && char <= 'R') return 'from-indigo-600/60 to-blue-400/60';
        return 'from-slate-600/60 to-slate-400/60';
    };

    if (hasError || !imgSrc) {
        const fileId = getFileIdFromUrl(url);
        if (fileId) {
            // Live iframe fallback if thumbnail API fails (Drive blocks hotlinking for some files)
            return (
                <div className="w-full h-full relative overflow-hidden bg-white/5 flex items-center justify-center">
                    <iframe 
                        src={`https://drive.google.com/file/d/${fileId}/preview`} 
                        className="absolute top-[-55px] left-0 w-full h-[calc(100%+110px)] pointer-events-none" 
                        loading="lazy" 
                    />
                    <div className="absolute inset-0 bg-transparent z-10" />
                </div>
            );
        }

        // Final graceful fallback if it's not a Drive link
        return (
            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getGradient(fileTitle)} backdrop-blur-sm`}>
                <div className="bg-white/10 p-4 rounded-full border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    <FileText size={32} className="text-white drop-shadow-md" />
                </div>
            </div>
        );
    }

    return (
        <img
            src={imgSrc}
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity mix-blend-normal"
            alt={fileTitle}
            loading="lazy"
            onError={() => setHasError(true)}
        />
    );
};

const STAT_QUOTES = [
    "90% of the world's data was generated in the last two years. Let's make sense of it.",
    "Statistics: The grammar of science. — Karl Pearson",
    "In God we trust, all others must bring data. — W. Edwards Deming",
    "Without data, you're just another person with an opinion.",
    "Errors using inadequate data are much less than those using no data at all."
];

export default function Home() {
    const [quoteIndex, setQuoteIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setQuoteIndex((prev) => (prev + 1) % STAT_QUOTES.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const [folders, setFolders] = useState<any[]>([]);
    const [files, setFiles] = useState<any[]>([]);
    const [selectedFile, setSelectedFile] = useState<any>(null);

    // Expand States
    const [expandedYears, setExpandedYears] = useState<string[]>([]);
    const [expandedSemesters, setExpandedSemesters] = useState<string[]>([]);
    const [expandedCourses, setExpandedCourses] = useState<string[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    // UI States
    const [isAiOpen, setIsAiOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

    // Chat States
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState<{ role: string, text: string }[]>([]);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // Auth & Admin States
    const [currentUser, setCurrentUser] = useState<{ id: string, name: string, role?: string } | null>(null);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password' | 'reset_password'>('login');
    const [authForm, setAuthForm] = useState({ id: "", email: "", password: "", otp: "", newPassword: "" });
    const [isAuthLoading, setIsAuthLoading] = useState(false);

    // Cover Generator State
    const [showCoverGenerator, setShowCoverGenerator] = useState(false);
    const [coverDetails, setCoverDetails] = useState({
        assignmentNo: "",
        courseName: "",
        courseCode: "",
        submittedTo: "",
        submittedBy: "",
        studentId: "",
        date: ""
    });

    // Upload/Folder States
    const [showAddFolderModal, setShowAddFolderModal] = useState(false);
    const [showAddFileModal, setShowAddFileModal] = useState(false);
    const [newFolderCode, setNewFolderCode] = useState("");
    const [targetYear, setTargetYear] = useState("Year 1");
    const [targetSemester, setTargetSemester] = useState("Semester 1");
    const [newFileTitle, setNewFileTitle] = useState("");
    const [targetFolderCode, setTargetFolderCode] = useState("");
    const [targetCategory, setTargetCategory] = useState("Course Materials");
    const [inputType, setInputType] = useState<"file" | "link">("file");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [driveLink, setDriveLink] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        fetchData();
        fetchUser();
    }, []);

    async function fetchUser() {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            if (data.success && data.user) {
                setCurrentUser(data.user);
            }
        } catch (e) { console.error("Error fetching user", e); }
    }

    useEffect(() => {
        if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }, [chatHistory, isAiLoading, suggestedQuestions]);

    useEffect(() => {
        if (selectedFile) {
            setChatHistory([]);
            setSuggestedQuestions([]);
            setIsHeaderMenuOpen(false);
        }
    }, [selectedFile]);

    useEffect(() => {
        if (searchTerm.length > 0) {
            const matches = files.filter(f => f.title.toLowerCase().includes(searchTerm));
            const years = new Set(matches.map(f => f.year));
            const semesters = new Set(matches.map(f => `${f.year}-${f.semester}`));
            const courses = new Set(matches.map(f => f.course_code));
            const cats = new Set(matches.map(f => `${f.course_code}-${f.category}`));
            setExpandedYears(prev => [...Array.from(years), ...prev]);
            setExpandedSemesters(prev => [...Array.from(semesters), ...prev]);
            setExpandedCourses(prev => [...Array.from(courses), ...prev]);
            setExpandedCategories(prev => [...Array.from(cats), ...prev]);
        }
    }, [searchTerm, files]);

    // --- 🔒 SECURE AI CALLS ---
    async function generateSuggestions(title: string) {
        setIsAiLoading(true);
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Generate 3 short, curious questions I might ask a tutor about "${title}". Return ONLY the questions separated by pipes (|).`,
                    context: null
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const questions = data.text.split('|').slice(0, 3);
            setSuggestedQuestions(questions);
        } catch (e) {
            console.error("Suggestion Error:", e);
            setSuggestedQuestions(["Summarize this", "Explain key concepts", "Quiz me"]);
        }
        setIsAiLoading(false);
    }

    async function handleChat(overrideInput?: string) {
        const messageToSend = overrideInput || chatInput;
        if (!messageToSend) return;

        setChatInput("");
        setChatHistory(prev => [...prev, { role: "user", text: messageToSend }]);
        setIsAiLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageToSend,
                    context: selectedFile?.title || null
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            setChatHistory(prev => [...prev, { role: "bot", text: data.text }]);
        } catch (error) {
            console.error("AI Error:", error);
            setChatHistory(prev => [...prev, { role: "bot", text: "⚠️ SYSTEM ERROR. CONNECTION LOST." }]);
        }
        setIsAiLoading(false);
    }

    // --- DATABASE & AUTH ---
    async function fetchData() {
        const { data: folderData } = await supabase.from('folders').select('*').order('code', { ascending: true });
        if (folderData) setFolders(folderData);
        const { data: fileData } = await supabase.from('courses').select('*').order('created_at', { ascending: true });
        if (fileData) setFiles(fileData);
    }

    // --- 🔒 SECURE LOGIN ---
    async function handleAuth() {
        if (!authForm.id.trim()) return alert("Student ID is required.");
        setIsAuthLoading(true);

        try {
            let endpoint = '/api/auth';
            let body: any = { id: authForm.id.trim() };

            if (authMode === 'login' || authMode === 'register') {
                body.action = authMode;
                body.password = authForm.password.trim();
                if (authMode === 'register') body.email = authForm.email.trim();
            } else if (authMode === 'forgot_password') {
                endpoint = '/api/auth/forgot-password';
            } else if (authMode === 'reset_password') {
                endpoint = '/api/auth/reset-password';
                body.otp = authForm.otp.trim();
                body.newPassword = authForm.newPassword.trim();
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (data.success) {
                if (authMode === 'login' || authMode === 'register') {
                    setCurrentUser(data.user);
                    setShowAdminModal(false);
                    setAuthForm({ id: "", email: "", password: "", otp: "", newPassword: "" });
                } else if (authMode === 'forgot_password') {
                    alert("OTP Sent! PLEASE CHECK YOUR SPAM/JUNK FOLDER if you don't see it in your inbox.");
                    setAuthMode('reset_password');
                } else if (authMode === 'reset_password') {
                    alert(data.message || "Password reset successful! Please login.");
                    setAuthMode('login');
                }
            } else {
                alert("AUTH ERROR: " + (data.error || "Request Failed"));
            }
        } catch (error) {
            console.error("Auth Error:", error);
            alert("SYSTEM ERROR: CONNECTION FAILED");
        } finally {
            setIsAuthLoading(false);
        }
    }

    async function handleLogout() {
        if (confirm("Terminate Session?")) {
            await fetch('/api/auth/logout', { method: 'POST' });
            setCurrentUser(null);
        }
    }

    async function handleCreateFolder() {
        if (!newFolderCode) return alert("Enter a Course Code");
        const { error } = await supabase.from('folders').insert({
            code: newFolderCode,
            year: targetYear,
            semester: targetSemester
        });
        if (error) alert("Error: " + error.message);
        else {
            setShowAddFolderModal(false);
            setNewFolderCode("");
            fetchData();
        }
    }

    // --- 📂 FILE UPLOAD LOGIC ---
    async function handleAddFile() {
        if (!newFileTitle || !targetFolderCode) return alert("Fill all fields");
        if (!currentUser) return alert("You must be logged in!");

        const selectedFolder = folders.find(f => f.code === targetFolderCode);
        if (!selectedFolder) return alert("Invalid Folder Selected");

        const finalYear = selectedFolder.year;
        const finalSemester = selectedFolder.semester;

        let finalUrl = "";
        setIsUploading(true);
        setUploadProgress(0);

        try {
            if (inputType === "file") {
                if (!uploadFile) return alert("Select a file");

                setUploadProgress(5);

                const initResponse = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { "Content-Type": "text/plain" },
                    body: JSON.stringify({
                        action: "get_upload_url",
                        filename: uploadFile.name,
                        mimeType: uploadFile.type
                    })
                });
                const initData = await initResponse.json();
                if (!initData.success) throw new Error(initData.error || "Failed to start upload");

                const uploadUrl = initData.uploadUrl;

                await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("PUT", uploadUrl, true);
                    xhr.setRequestHeader("Content-Type", uploadFile.type);

                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const percentComplete = (e.loaded / e.total) * 85;
                            setUploadProgress(5 + percentComplete);
                        }
                    };

                    xhr.onload = () => resolve(xhr.response);
                    xhr.onerror = () => {
                        console.warn("XHR Error detected. Proceeding...");
                        resolve(null);
                    };

                    xhr.send(uploadFile);
                });

                setUploadProgress(92);

                const finalizeResponse = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { "Content-Type": "text/plain" },
                    body: JSON.stringify({
                        action: "make_public",
                        filename: uploadFile.name
                    })
                });
                const finalizeData = await finalizeResponse.json();
                if (!finalizeData.success) throw new Error(finalizeData.error || "Verification failed.");

                if (finalizeData.fileId) {
                    finalUrl = "https://drive.google.com/file/d/" + finalizeData.fileId + "/preview";
                } else {
                    finalUrl = finalizeData.url;
                }

            } else {
                if (!driveLink) return alert("Enter a link");
                let cleanLink = driveLink;
                if (cleanLink.includes("drive.google.com") && !cleanLink.includes("/preview")) {
                    cleanLink = cleanLink.replace(/\/view.*|\/edit.*/, '/preview');
                }
                finalUrl = cleanLink;
            }

            setUploadProgress(98);

            const { error: dbError } = await supabase.from('courses').insert({
                title: newFileTitle,
                course_code: targetFolderCode,
                category: targetCategory,
                year: finalYear,
                semester: finalSemester,
                pdf_url: finalUrl,
                uploader: currentUser.name
            });

            if (dbError) alert("Database Error: " + dbError.message);
            else {
                setShowAddFileModal(false);
                setNewFileTitle("");
                setUploadFile(null);
                setDriveLink("");
                fetchData();
            }
        } catch (error: any) {
            alert("Error: " + (error.message || error));
            console.error(error);
        }

        setUploadProgress(100);
        setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
        }, 500);
    }

    async function handleDeleteFile(file: any) {
        if (!confirm("Confirm Deletion? This action is irreversible.")) return;

        if (currentUser?.role !== 'admin' && file.uploader !== currentUser?.name) {
            return alert("ACCESS DENIED: Insufficient Permissions.");
        }

        const fileId = getFileIdFromUrl(file.pdf_url);
        if (fileId) {
            try {
                await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { "Content-Type": "text/plain" },
                    body: JSON.stringify({ action: "delete", fileId: fileId })
                });
            } catch (err) {
                console.error("Drive Deletion Error:", err);
            }
        }
        await supabase.from('courses').delete().eq('id', file.id);
        fetchData();
        if (selectedFile?.id === file.id) setSelectedFile(null);
    }

    const toggleState = (setter: any, val: string) => {
        setter((prev: string[]) => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
    };

    const handleGoHome = () => {
        setSelectedFile(null);
        setSearchTerm("");
    };

    const structure = ["Year 1", "Year 2", "Year 3", "Year 4"].map(year => ({
        year,
        semesters: ["Semester 1", "Semester 2"].map(sem => ({
            sem,
            folders: folders.filter(f => f.year === year && f.semester === sem)
        }))
    }));

    const CATEGORIES = ["Course Materials", "Hand Notes", "Previous Year Question Solve"];
    const dashboardFiles = files.filter(f => f.title.toLowerCase().includes(searchTerm));

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} className="flex h-[100dvh] bg-transparent text-gray-100 font-sans overflow-hidden relative">
            {/* Super fast animated background blobs (using radial gradients instead of expensive CSS blur) */}
            <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.15)_0%,transparent_60%)] animate-blob pointer-events-none -z-10"></div>
            <div className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.12)_0%,transparent_60%)] animate-blob animation-delay-2000 pointer-events-none -z-10"></div>
            <div className="absolute bottom-[-30%] left-[10%] w-[80vw] h-[80vw] bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.12)_0%,transparent_60%)] animate-blob animation-delay-4000 pointer-events-none -z-10"></div>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
                )}
            </AnimatePresence>

            {/* ✨ FROSTED SIDEBAR ✨ */}
            <aside className={`fixed md:relative inset-y-0 left-0 w-80 bg-[#060913] md:bg-white/[0.03] md:backdrop-blur-3xl border-r border-white/10 flex flex-col z-50 transform transition-transform duration-300 ease-out will-change-transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} shadow-[4px_0_30px_rgba(0,0,0,0.5)]`}>
                <div className="p-5 border-b border-white/5 flex flex-col gap-4 bg-transparent relative overflow-hidden">
                    {/* Top subtle line */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 cursor-pointer group" onClick={handleGoHome}>
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600/80 to-fuchsia-600/80 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all border border-white/10">
                                <GraduationCap size={18} className="text-white" />
                            </div>
                            <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 to-white tracking-widest uppercase">STAT.Notes</h1>
                        </div>
                        <button className="md:hidden text-cyan-500/70 hover:text-cyan-400" onClick={() => setIsMobileMenuOpen(false)}><X size={20} /></button>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={handleGoHome} className="p-2.5 bg-[#121216] hover:bg-white/5 rounded-lg text-gray-500 hover:text-cyan-400 transition border border-white/5">
                            <HomeIcon size={16} />
                        </button>

                        <div className="relative group flex-1">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 rounded-full blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors z-10" />
                            <input className="relative z-10 w-full bg-white/5 backdrop-blur-md text-xs text-cyan-50 pl-10 pr-4 py-2.5 rounded-full outline-none border border-white/10 focus:border-cyan-500/50 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all placeholder-gray-500 font-sans tracking-wide" placeholder="Search resources..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value.toLowerCase())} />
                        </div>
                    </div>

                    {currentUser && (
                        <motion.div 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-4 bg-gradient-to-r from-white/10 to-white/5 border border-white/20 p-2.5 rounded-[2rem] backdrop-blur-md relative overflow-hidden group cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                        >
                            {/* Animated Background Glow */}
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-fuchsia-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem] -z-0"></div>
                            
                            {/* Avatar */}
                            <div className="relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] border-2 border-white/20 z-10 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-fuchsia-500 group-hover:scale-110 transition-transform duration-500"></div>
                                <span className="relative z-10">{currentUser.name.charAt(0)}</span>
                            </div>
                            
                            {/* Info */}
                            <div className="flex-1 overflow-hidden relative z-10">
                                <p className="text-[9px] font-mono text-cyan-300 uppercase tracking-widest flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_5px_rgba(34,211,238,0.8)]"></span>
                                    Active Session
                                </p>
                                <p className="text-xs font-bold text-white truncate drop-shadow-md tracking-wide mt-0.5">{currentUser.name}</p>
                            </div>
                        </motion.div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar pb-20" style={{ transform: 'translateZ(0)', willChange: 'transform' }}>
                    {currentUser ? structure.map((yData) => (
                        <div key={yData.year}>
                            <button onClick={() => toggleState(setExpandedYears, yData.year)} className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg text-sm font-semibold transition-colors group">
                                {expandedYears.includes(yData.year) ? <ChevronDown size={14} className="text-cyan-500 group-hover:text-cyan-400" /> : <ChevronRight size={14} className="text-gray-500 group-hover:text-cyan-400" />}
                                <Folder size={14} className="text-cyan-500 fill-cyan-500/10 transition-colors" />
                                <span className="text-gray-300 group-hover:text-white font-mono uppercase tracking-wider text-xs">{yData.year}</span>
                            </button>

                            <AnimatePresence>
                                {expandedYears.includes(yData.year) && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden ml-3 pl-3 border-l border-white/5">
                                        {yData.semesters.map((sData) => (
                                            <div key={sData.sem}>
                                                <button onClick={() => toggleState(setExpandedSemesters, `${yData.year}-${sData.sem}`)} className="w-full flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg text-[11px] text-gray-400 mt-1 font-mono uppercase">
                                                    {expandedSemesters.includes(`${yData.year}-${sData.sem}`) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                    {sData.sem}
                                                </button>

                                                {expandedSemesters.includes(`${yData.year}-${sData.sem}`) && (
                                                    <div className="ml-4 mt-1 space-y-1">
                                                        {sData.folders.length === 0 && <div className="text-[10px] text-gray-700 pl-2 font-mono">NO_DATA_FOUND</div>}
                                                        {sData.folders.map(folder => (
                                                            <div key={folder.id}>
                                                                <button onClick={() => toggleState(setExpandedCourses, folder.code)} className="w-full flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg text-xs text-gray-300 border border-transparent transition-colors group">
                                                                    {expandedCourses.includes(folder.code) ? <ChevronDown size={12} className="text-cyan-500" /> : <ChevronRight size={12} className="text-gray-600 group-hover:text-cyan-400" />}
                                                                    <span className="font-bold text-cyan-200/80 tracking-wide group-hover:text-white transition-colors">{folder.code}</span>
                                                                </button>

                                                                {expandedCourses.includes(folder.code) && (
                                                                    <div className="ml-3 pl-2 border-l border-white/5 mt-1 space-y-1">
                                                                        {CATEGORIES.map(cat => {
                                                                            const catFiles = files.filter(f => f.course_code === folder.code && f.category === cat && f.title.toLowerCase().includes(searchTerm));
                                                                            const catKey = `${folder.code}-${cat}`;
                                                                            return (
                                                                                <div key={cat}>
                                                                                    <button onClick={() => toggleState(setExpandedCategories, catKey)} className={`w-full flex items-center gap-2 p-1.5 hover:bg-white/5 rounded text-[10px] uppercase font-mono tracking-wider transition-colors ${expandedCategories.includes(catKey) ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}>
                                                                                        {expandedCategories.includes(catKey) ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                                                                        {cat}
                                                                                        <span className="ml-auto text-[9px] bg-white/5 text-gray-400 px-1 rounded border border-white/5">{catFiles.length}</span>
                                                                                    </button>
                                                                                    {expandedCategories.includes(catKey) && (
                                                                                        <div className="ml-4 space-y-1 mt-1">
                                                                                            {catFiles.length === 0 && <div className="text-[9px] text-gray-700 italic px-2 font-mono">// EMPTY</div>}
                                                                                            {catFiles.map(file => (
                                                                                                <div key={file.id} className="relative group">
                                                                                                    <button onClick={() => { setSelectedFile(file); setIsMobileMenuOpen(false); }} className={`w-full text-left flex items-center gap-2 p-2 rounded text-[11px] border transition-colors ${selectedFile?.id === file.id ? 'bg-white/10 text-white border-white/20 shadow-sm' : 'hover:bg-white/5 text-gray-400 border-transparent bg-transparent hover:text-gray-200'}`}>
                                                                                                        <FileText size={12} className={selectedFile?.id === file.id ? "text-cyan-300" : ""} /> <span className="truncate">{file.title}</span>
                                                                                                    </button>
                                                                                                    {currentUser && (
                                                                                                        <button onClick={() => handleDeleteFile(file)} className="absolute right-1 top-1.5 p-1 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-colors">
                                                                                                            <Trash2 size={10} />
                                                                                                        </button>
                                                                                                    )}
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-50 p-4 text-center">
                            <Lock size={32} className="mb-2 text-cyan-500" />
                            <p className="text-xs font-mono text-cyan-400 uppercase tracking-widest mt-2">Login Required</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/5 bg-[#0d0d10]/50 flex gap-2 relative">
                    {!currentUser ? (
                        <>
                            <button
                                onClick={() => setShowAdminModal(true)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-cyan-400/80 hover:text-cyan-300 rounded-lg flex items-center justify-center gap-2 py-2.5 text-xs font-bold border border-white/10 transition uppercase tracking-widest"
                            >
                                <Unlock size={14} /> Login
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleLogout}
                                title="Logout"
                                className="p-2 rounded-lg transition text-fuchsia-400/80 hover:text-fuchsia-300 hover:bg-white/5 border border-transparent hover:border-white/10 bg-[#121216]"
                            >
                                <Lock size={16} />
                            </button>
                            <button
                                onClick={() => setShowCoverGenerator(true)}
                                title="Cover Generator"
                                className="p-2 rounded-lg transition text-cyan-400/80 hover:text-cyan-300 hover:bg-white/5 border border-transparent hover:border-white/10 bg-[#121216]"
                            >
                                <FileText size={16} />
                            </button>
                            <div className="flex-1 flex gap-2">
                                <button onClick={() => setShowAddFolderModal(true)} className="flex-1 bg-white/5 hover:bg-white/10 text-cyan-300/80 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold border border-white/10 transition uppercase"><FolderPlus size={14} /> Folder</button>
                                <button onClick={() => setShowAddFileModal(true)} className="flex-1 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold border border-white/20 transition uppercase"><Plus size={14} /> File</button>
                            </div>
                        </>
                    )}
                </div>
            </aside>

            <div className="flex-1 flex flex-col relative bg-transparent w-full max-w-full overflow-hidden">
                {/* Mobile Header */}
                {!selectedFile && (
                    <div className="md:hidden h-14 border-b border-white/10 flex items-center px-4 justify-between bg-white/[0.03] backdrop-blur-3xl shrink-0">
                        <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-white tracking-widest uppercase">STAT.Notes</span>
                        <button onClick={() => setIsMobileMenuOpen(true)} className="text-cyan-400"><Menu size={24} /></button>
                    </div>
                )}

                {selectedFile ? (
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-0 md:p-4 gap-4 relative">
                        {/* PDF Viewer Area */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.98 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            layout 
                            className="flex-1 bg-white/[0.04] backdrop-blur-3xl md:rounded-2xl border-x md:border border-white/10 overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.4)] relative flex flex-col"
                        >
                            <div className="h-16 bg-black/20 border-b border-white/10 flex items-center justify-between px-5 gap-3 relative">
                                <button onClick={handleGoHome} className="md:hidden mr-2 text-white hover:text-gray-300 transition">
                                    <HomeIcon size={20} />
                                </button>
                                <div className="flex flex-col overflow-hidden flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-white/10 text-cyan-200 px-2.5 py-1 rounded-md border border-white/10 whitespace-nowrap font-medium tracking-wide">{selectedFile.category}</span>
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium"><User size={12} /> {selectedFile.uploader || "UNKNOWN_USER"}</span>
                                    </div>
                                    <span className="text-sm font-bold text-gray-100 truncate mt-1 tracking-wide">{selectedFile.title}</span>
                                </div>
                                <a href={selectedFile.pdf_url} target="_blank" className="hidden md:inline-flex text-[11px] text-white font-bold whitespace-nowrap ml-2 border border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition tracking-wide shadow-sm">EXTERNAL</a>

                                {/* Mobile 3-Dot Menu */}
                                <div className="relative md:hidden flex items-center">
                                    <button onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)} className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-white/5 rounded-lg border border-white/5 transition-all">
                                        <MoreVertical size={20} />
                                    </button>

                                    {isHeaderMenuOpen && (
                                        <div className="fixed inset-0 z-40" onClick={() => setIsHeaderMenuOpen(false)} />
                                    )}

                                    <AnimatePresence>
                                        {isHeaderMenuOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute right-0 top-full mt-2 w-48 bg-[#0a0a0c]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                                            >
                                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
                                                <div className="p-1.5 flex flex-col gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setIsMobileMenuOpen(true);
                                                            setIsHeaderMenuOpen(false);
                                                        }}
                                                        className="flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left w-full"
                                                    >
                                                        <Menu size={14} className="text-cyan-400" />
                                                        <span>Browse Library</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setIsAiOpen(!isAiOpen);
                                                            setIsHeaderMenuOpen(false);
                                                        }}
                                                        className="flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left w-full"
                                                    >
                                                        <MessageSquare size={14} className="text-fuchsia-400" />
                                                        <span>Tutor AI</span>
                                                    </button>
                                                    <a
                                                        href={selectedFile.pdf_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={() => setIsHeaderMenuOpen(false)}
                                                        className="flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left w-full"
                                                    >
                                                        <ExternalLink size={14} className="text-cyan-400" />
                                                        <span>External Link</span>
                                                    </a>
                                                    <div className="h-[1px] bg-white/5 my-1"></div>
                                                    <button
                                                        onClick={() => {
                                                            handleGoHome();
                                                            setIsHeaderMenuOpen(false);
                                                        }}
                                                        className="flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left w-full"
                                                    >
                                                        <HomeIcon size={14} className="text-red-400" />
                                                        <span>Go Home</span>
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <iframe src={selectedFile.pdf_url} className="flex-1 w-full bg-white/5" title="Preview" />

                            <button onClick={() => setIsAiOpen(!isAiOpen)} className="absolute bottom-6 right-6 bg-white/10 backdrop-blur-xl p-4 rounded-full text-white shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300 z-10 flex items-center justify-center border border-white/20 hover:border-white/30 hover:bg-white/20 group">
                                {isAiOpen ? <ChevronRight size={22} className="text-white drop-shadow-md" /> : <MessageSquare size={22} className="text-white drop-shadow-md" />}
                            </button>
                        </motion.div>

                        {/* AI Tutor Panel */}
                        <AnimatePresence mode='popLayout'>
                            {isAiOpen && (
                                <motion.div initial={{ width: 0, opacity: 0, x: 50 }} animate={{ width: 350, opacity: 1, x: 0 }} exit={{ width: 0, opacity: 0, x: 50 }} transition={{ duration: 0.4, ease: "easeOut" }} className="fixed md:relative inset-y-0 right-0 z-30 w-full md:w-[350px] bg-black/40 backdrop-blur-3xl border border-white/10 flex flex-col md:rounded-2xl overflow-hidden shadow-[-10px_0_40px_rgba(0,0,0,0.5)]">
                                    <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center relative backdrop-blur-xl">
                                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-fuchsia-400/30 to-transparent"></div>
                                        <div className="flex items-center gap-2"><Sparkles size={16} className="text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.5)]" /><span className="text-[15px] font-bold text-white tracking-wide">Tutor AI</span></div>
                                        <button onClick={() => setIsAiOpen(false)} className="text-gray-400 hover:text-white transition bg-white/5 hover:bg-white/10 p-1.5 rounded-lg border border-transparent hover:border-white/10"><Minimize2 size={16} /></button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-transparent flex flex-col" ref={chatScrollRef}>
                                        {chatHistory.length === 0 && (
                                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-80 p-4">
                                                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                                    <Sparkles size={28} className="text-cyan-400/80" />
                                                </div>
                                                <h3 className="text-md font-black text-white mb-2 tracking-widest uppercase">System Ready</h3>
                                                <p className="text-xs text-gray-400 mb-6 font-mono">DATASET LOADED: <br /><b className="text-cyan-200/80">[{selectedFile.title}]</b></p>

                                                {suggestedQuestions.length === 0 ? (
                                                    <div className="mt-2 w-full">
                                                        <button
                                                            onClick={() => generateSuggestions(selectedFile.title)}
                                                            disabled={isAiLoading}
                                                            className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm uppercase tracking-wider"
                                                        >
                                                            {isAiLoading ? <Loader2 size={14} className="animate-spin text-fuchsia-400" /> : <Sparkles size={14} className="text-cyan-400/80" />}
                                                            Init Analysis
                                                        </button>
                                                        <p className="text-[9px] text-gray-500 mt-3 font-mono uppercase">Query generation uses API Quota</p>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-3 w-full">
                                                        {suggestedQuestions.map((q, i) => (
                                                            <button key={i} onClick={() => handleChat(q)} className="text-left text-xs bg-white/5 hover:bg-white/10 text-gray-200 p-3.5 rounded-xl border border-white/5 transition-all flex items-start gap-3 group">
                                                                <Lightbulb size={14} className="text-fuchsia-400/60 group-hover:text-fuchsia-300 transition mt-0.5 shrink-0" />
                                                                <span className="leading-relaxed">{q}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {chatHistory.map((msg, i) => (
                                            <div key={i} className={`mb-5 p-4 rounded-2xl text-sm leading-relaxed max-w-[90%] relative ${msg.role === 'user' ? 'bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-md border border-white/20 text-white ml-auto rounded-br-none shadow-[0_4px_15px_rgba(0,0,0,0.2)]' : 'bg-black/60 backdrop-blur-md border border-white/10 text-gray-200 mr-auto rounded-bl-none shadow-[0_4px_15px_rgba(0,0,0,0.2)]'}`}>
                                                <div className="prose prose-invert max-w-none text-[13px] break-words">
                                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={{ p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />, a: ({ node, ...props }) => <a className="text-cyan-300 hover:text-cyan-200 hover:underline" {...props} />, code: ({ node, ...props }) => <code className="bg-black/50 text-cyan-200/80 px-1.5 py-0.5 rounded font-mono text-[11px] border border-white/10" {...props} /> }}>{msg.text}</ReactMarkdown>
                                                </div>
                                            </div>
                                        ))}
                                        {isAiLoading && <div className="flex items-center gap-2 text-[10px] font-mono text-fuchsia-400/80 pl-2 mb-4 uppercase tracking-wider"><Loader2 size={12} className="animate-spin" /> Processing...</div>}
                                    </div>

                                    <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-xl relative z-10">
                                        <div className="flex items-center gap-2 bg-black/60 border border-white/10 focus-within:border-white/30 focus-within:bg-black/80 rounded-xl px-2 py-1.5 transition-all shadow-inner">
                                            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChat()} placeholder="Execute Query..." className="flex-1 bg-transparent border-none text-sm text-gray-100 p-2 outline-none placeholder-gray-500 font-mono" />
                                            <button onClick={() => handleChat()} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-lg text-white transition-all duration-300 border border-white/10 hover:border-white/20 hover:scale-105"><Send size={14} /></button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col bg-transparent overflow-hidden min-h-0 relative">
                        <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-[0.015] pointer-events-none"></div>

                        <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar flex flex-col z-10">
                            {currentUser && dashboardFiles.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                                    {dashboardFiles.map((file, idx) => (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 30 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true, margin: "100px" }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                            key={file.id} 
                                            className="group bg-white/[0.04] backdrop-blur-md border border-white/10 hover:border-white/30 p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:bg-white/[0.08] flex flex-col gap-4 relative cursor-pointer overflow-hidden" 
                                            onClick={() => setSelectedFile(file)}
                                        >
                                            {/* Very subtle corners */}
                                            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-tl-sm z-20"></div>
                                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-br-sm z-20"></div>

                                            <div className="h-44 bg-black/20 rounded-xl mb-1 overflow-hidden relative border border-white/10 transition-colors">
                                                <FileThumbnail url={file.pdf_url} fileTitle={file.title} />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#060913]/90 via-transparent to-transparent" />
                                                <div className="absolute top-3 right-3 bg-white/10 backdrop-blur-md p-2 rounded-lg border border-white/20 shadow-lg transition-colors"><FileText size={16} className="text-white drop-shadow-md" /></div>
                                            </div>

                                            <div className="flex items-start justify-between z-10">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-gray-100 text-[15px] truncate tracking-wide group-hover:text-white transition-colors">{file.title}</h3>
                                                    <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1 font-medium"><User size={12} /> {file.uploader || "UNKNOWN"}</p>
                                                </div>
                                                {currentUser && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(file); }} className="text-gray-500 hover:text-red-400 transition p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 backdrop-blur-md rounded-lg"><Trash2 size={16} /></button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-auto z-10">
                                                <span className="text-[10px] bg-white/10 text-gray-200 px-2.5 py-1 rounded-md border border-white/10 truncate max-w-[50%] font-medium">{file.course_code}</span>
                                                <span className="text-[10px] bg-white/10 text-gray-200 px-2.5 py-1 rounded-md border border-white/10 truncate max-w-[50%] font-medium">{file.category}</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-4 mb-8">
                                    {currentUser ? (
                                        <>
                                            <Grid size={56} className="text-white/10 drop-shadow-sm" />
                                            <p className="font-mono tracking-widest uppercase text-sm text-gray-600">NO_DATA_FOUND</p>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl text-center z-20">
                                            <div className="w-24 h-24 mb-6 relative flex items-center justify-center">
                                                <div className="absolute inset-0 bg-white/5 rounded-full animate-ping opacity-20 duration-1000"></div>
                                                <div className="absolute inset-0 bg-white/10 rounded-full backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                                    <Lock size={32} className="text-white drop-shadow-md" />
                                                </div>
                                            </div>
                                            
                                            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-6 tracking-tight drop-shadow-sm">Access Knowledge Base</h2>
                                            
                                            <div className="h-16 mb-8 relative w-full flex items-center justify-center overflow-visible">
                                                <AnimatePresence mode="wait">
                                                    <motion.p
                                                        key={quoteIndex}
                                                        initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                                                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                                        exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                                        className="text-sm md:text-base font-medium text-gray-300 italic leading-relaxed max-w-lg absolute text-center"
                                                    >
                                                        "{STAT_QUOTES[quoteIndex]}"
                                                    </motion.p>
                                                </AnimatePresence>
                                            </div>

                                            <button 
                                                onClick={() => setShowAdminModal(true)} 
                                                className="group relative px-8 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl transition-all duration-300 border border-white/20 shadow-[0_8px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:-translate-y-1 overflow-hidden"
                                            >
                                                <span className="relative text-sm font-bold tracking-widest text-white uppercase drop-shadow-sm flex items-center gap-2">
                                                    Login to Access <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ✨ MINIMAL FOOTER ✨ */}
                            <div className="mt-auto pt-6 pb-4 w-full flex justify-center items-center">
                                <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:bg-white/10 transition-colors">
                                    <span className="text-[10px] font-medium tracking-widest text-gray-400 uppercase">
                                        Developed By
                                    </span>
                                    <span className="text-[10px] font-black tracking-widest text-white uppercase">
                                        MUNIF
                                    </span>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {/* ✨ FROSTED AUTH MODAL ✨ */}
                {showAdminModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60] flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-sm"
                        >
                            <div className="relative bg-white/[0.05] backdrop-blur-3xl border border-white/20 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center overflow-hidden">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>

                                <h3 className="text-xl font-black mb-6 tracking-widest text-white uppercase drop-shadow-md">
                                    {authMode === 'login' ? 'System Login' : authMode === 'register' ? 'Register Account' : authMode === 'forgot_password' ? 'Reset Request' : 'New Password'}
                                </h3>

                                <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }}>
                                    <div className="space-y-4 mb-6">
                                        {(authMode === 'login' || authMode === 'register' || authMode === 'forgot_password' || authMode === 'reset_password') && (
                                            <div className="relative">
                                                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                                                <input type="text" placeholder="STUDENT ID" className="w-full bg-black/20 border border-white/10 pl-9 pr-3 py-3 rounded-xl text-white font-medium text-sm outline-none focus:border-white/30 focus:bg-black/30 transition-all uppercase placeholder-white/30" value={authForm.id} onChange={(e) => setAuthForm({ ...authForm, id: e.target.value.toUpperCase() })} disabled={isAuthLoading || authMode === 'reset_password'} />
                                            </div>
                                        )}

                                        {authMode === 'register' && (
                                            <div className="relative">
                                                <input type="email" placeholder="EMAIL ADDRESS" className="w-full bg-black/20 border border-white/10 px-3 py-3 rounded-xl text-white font-medium text-sm outline-none focus:border-white/30 focus:bg-black/30 transition-all placeholder-white/30" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} disabled={isAuthLoading} />
                                            </div>
                                        )}

                                        {(authMode === 'login' || authMode === 'register') && (
                                            <div className="relative">
                                                <input type="password" placeholder="PASSWORD" className="w-full bg-black/20 border border-white/10 px-3 py-3 rounded-xl text-white font-medium text-sm outline-none focus:border-white/30 focus:bg-black/30 transition-all placeholder-white/30" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} disabled={isAuthLoading} />
                                            </div>
                                        )}

                                        {authMode === 'reset_password' && (
                                            <>
                                                <p className="text-[11px] text-white/90 font-medium bg-white/10 border border-white/20 p-2 rounded-xl text-center leading-relaxed">
                                                    OTP Sent! ⚠️ Check your <strong className="text-white font-bold">SPAM / JUNK</strong> folder if you don't see it.
                                                </p>
                                                <div className="relative">
                                                    <input type="text" placeholder="6-DIGIT OTP" className="w-full bg-black/20 border border-white/10 px-3 py-3 rounded-xl text-white font-medium text-sm outline-none focus:border-white/30 focus:bg-black/30 transition-all uppercase tracking-widest text-center placeholder-white/30" value={authForm.otp} onChange={(e) => setAuthForm({ ...authForm, otp: e.target.value })} disabled={isAuthLoading} />
                                                </div>
                                                <div className="relative">
                                                    <input type="password" placeholder="NEW PASSWORD" className="w-full bg-black/20 border border-white/10 px-3 py-3 rounded-xl text-white font-medium text-sm outline-none focus:border-white/30 focus:bg-black/30 transition-all placeholder-white/30" value={authForm.newPassword} onChange={(e) => setAuthForm({ ...authForm, newPassword: e.target.value })} disabled={isAuthLoading} />
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex gap-3 mb-4">
                                        <button type="button" onClick={() => { setShowAdminModal(false); setAuthMode('login'); }} disabled={isAuthLoading} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors text-xs font-bold tracking-wider uppercase border border-white/10">Abort</button>
                                        <button type="submit" disabled={isAuthLoading} className="flex-1 flex justify-center items-center py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white transition text-xs font-bold tracking-wider border border-white/20 shadow-sm uppercase">
                                            {isAuthLoading ? <Loader2 size={16} className="animate-spin" /> : "Execute"}
                                        </button>
                                    </div>
                                </form>

                                <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-white/10">
                                    {authMode === 'login' ? (
                                        <>
                                            <button onClick={() => setAuthMode('register')} className="w-full py-3 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest shadow-sm transition-all">Create New Account</button>
                                            <button onClick={() => setAuthMode('forgot_password')} className="text-[10px] text-gray-400 hover:text-white uppercase tracking-widest font-medium mt-1 transition-colors">Forgot Password?</button>
                                        </>
                                    ) : (
                                        <button onClick={() => setAuthMode('login')} className="text-[10px] text-gray-400 hover:text-white uppercase tracking-widest font-medium transition-colors">Back to Login</button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* ✨ GLASS ADD FOLDER MODAL ✨ */}
                {showAddFolderModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                        <div className="relative group w-full max-w-sm">
                            <div className="relative bg-[#09090b]/60 backdrop-blur-2xl border border-white/10 p-6 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/20 rounded-br-sm"></div>
                                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/20 rounded-tl-sm"></div>

                                <button onClick={() => setShowAddFolderModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition"><X size={18} /></button>

                                <h3 className="text-lg font-black mb-5 text-white flex items-center gap-2 uppercase tracking-wide">
                                    <FolderPlus size={18} className="text-cyan-400/80" /> New Directory
                                </h3>

                                <div className="space-y-4">
                                    <div className="relative">
                                        <input className="w-full bg-black/40 border border-white/10 focus:border-white/20 rounded-lg p-3 text-sm text-gray-100 outline-none transition-colors font-mono uppercase placeholder-gray-600" placeholder="DIR_CODE (e.g. STA 1201)" value={newFolderCode} onChange={(e) => setNewFolderCode(e.target.value)} />
                                    </div>
                                    <div className="flex gap-3">
                                        <select className="flex-1 bg-black/40 border border-white/10 focus:border-white/20 rounded-lg p-2.5 text-xs text-gray-300 outline-none transition-colors font-mono uppercase" value={targetYear} onChange={(e) => setTargetYear(e.target.value)}>{["Year 1", "Year 2", "Year 3", "Year 4"].map(y => <option key={y} className="bg-[#09090b] text-white">{y}</option>)}</select>
                                        <select className="flex-1 bg-black/40 border border-white/10 focus:border-white/20 rounded-lg p-2.5 text-xs text-gray-300 outline-none transition-colors font-mono uppercase" value={targetSemester} onChange={(e) => setTargetSemester(e.target.value)}>{["Semester 1", "Semester 2"].map(s => <option key={s} className="bg-[#09090b] text-white">{s}</option>)}</select>
                                    </div>
                                    <button onClick={handleCreateFolder} className="w-full bg-white/10 hover:bg-white/20 border border-white/10 py-3 rounded-lg text-white text-xs font-bold tracking-wider uppercase shadow-sm transition-all">Initialize Folder</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ✨ GLASS ADD FILE MODAL ✨ */}
                {showAddFileModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                        <div className="relative group w-full max-w-sm">
                            <div className="relative bg-[#09090b]/60 backdrop-blur-2xl border border-white/10 p-6 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-fuchsia-400/30 to-transparent"></div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/20 rounded-br-sm"></div>
                                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/20 rounded-tl-sm"></div>

                                <button onClick={() => setShowAddFileModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition"><X size={18} /></button>

                                <h3 className="text-lg font-black mb-5 text-white flex items-center gap-2 uppercase tracking-wide">
                                    <File size={18} className="text-fuchsia-400/80" /> Inject File
                                </h3>

                                <div className="space-y-4">
                                    <select className="w-full bg-black/40 border border-white/10 focus:border-white/20 rounded-lg p-3 text-xs text-gray-300 outline-none transition-colors font-mono uppercase" value={targetFolderCode} onChange={(e) => setTargetFolderCode(e.target.value)}>
                                        <option value="" className="bg-[#09090b]">Select Target Directory</option>
                                        {folders.map(f => <option key={f.id} value={f.code} className="bg-[#09090b]">{f.code} ({f.year})</option>)}
                                    </select>
                                    <select className="w-full bg-black/40 border border-white/10 focus:border-white/20 rounded-lg p-3 text-xs text-gray-300 outline-none transition-colors font-mono uppercase" value={targetCategory} onChange={(e) => setTargetCategory(e.target.value)}>
                                        {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#09090b]">{c}</option>)}
                                    </select>
                                    <input className="w-full bg-black/40 border border-white/10 focus:border-white/20 rounded-lg p-3 text-sm text-gray-100 outline-none transition-colors font-mono placeholder-gray-600" placeholder="FILE_DESIGNATION" value={newFileTitle} onChange={(e) => setNewFileTitle(e.target.value)} />

                                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
                                        <button onClick={() => setInputType("file")} className={`flex-1 text-[10px] font-bold tracking-wider uppercase py-2 rounded-md transition-colors ${inputType === "file" ? "bg-white/15 text-white shadow-sm border border-white/5" : "text-gray-500 hover:text-gray-300"}`}>Upload</button>
                                        <button onClick={() => setInputType("link")} className={`flex-1 text-[10px] font-bold tracking-wider uppercase py-2 rounded-md transition-colors ${inputType === "link" ? "bg-white/15 text-white shadow-sm border border-white/5" : "text-gray-500 hover:text-gray-300"}`}>Link</button>
                                    </div>

                                    {inputType === "file" ? (
                                        <div className="flex flex-col gap-2">
                                            <label className="flex items-center justify-center w-full p-5 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-white/30 hover:bg-white/5 transition-all group">
                                                <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-gray-300 transition-colors">
                                                    <Upload size={24} className="group-hover:-translate-y-1 transition-transform" />
                                                    <span className="text-[10px] font-bold tracking-widest uppercase font-mono">Select Payload</span>
                                                </div>
                                                <input
                                                    key="file-input"
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                                                />
                                            </label>
                                            {uploadFile && (
                                                <div className="text-[10px] font-mono text-center text-gray-300 bg-white/5 py-1.5 px-3 rounded truncate border border-white/10">
                                                    QUEUED: {uploadFile.name}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <input
                                            key="link-input"
                                            className="w-full bg-black/40 border border-white/10 focus:border-white/20 rounded-lg p-3 text-sm text-gray-100 outline-none transition-colors font-mono placeholder-gray-600"
                                            placeholder="PASTE_URL"
                                            value={driveLink || ""}
                                            onChange={(e) => setDriveLink(e.target.value)}
                                        />
                                    )}

                                    {isUploading && (
                                        <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden border border-white/10">
                                            <div className="bg-white/80 h-full transition-all duration-300 ease-out shadow-sm" style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                    )}

                                    <button onClick={handleAddFile} disabled={isUploading} className="w-full bg-white/10 hover:bg-white/20 border border-white/10 py-3 rounded-lg text-white text-xs font-bold tracking-wider uppercase shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                        {isUploading ? `UPLOADING [${Math.round(uploadProgress)}%]` : "Execute Injection"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* ✨ COVER GENERATOR MODAL ✨ */}
            {showCoverGenerator && (
                <div className="fixed inset-0 bg-[#050505] z-[70] flex flex-col overflow-hidden">
                    <div className="h-14 border-b border-white/10 flex items-center px-4 justify-between bg-[#0a0a0c]/80 backdrop-blur-md shrink-0 print:hidden">
                        <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-200 to-cyan-200 tracking-widest uppercase flex items-center gap-2"><FileText size={18} /> Cover Page Generator</span>
                        <button onClick={() => setShowCoverGenerator(false)} className="text-gray-500 hover:text-white transition"><X size={24} /></button>
                    </div>
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                        <div className="w-full md:w-1/3 bg-[#0a0a0c]/80 border-r border-white/10 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4 print:hidden">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2 border-b border-white/10 pb-2">Configuration</h3>
                            <input className="bg-black/40 border border-white/10 p-3 rounded-lg text-white font-mono text-xs focus:border-cyan-500/50 outline-none w-full" placeholder="Assignment no:" value={coverDetails.assignmentNo} onChange={e => setCoverDetails({ ...coverDetails, assignmentNo: e.target.value })} />
                            <input className="bg-black/40 border border-white/10 p-3 rounded-lg text-white font-mono text-xs focus:border-cyan-500/50 outline-none w-full" placeholder="Course Name:" value={coverDetails.courseName} onChange={e => setCoverDetails({ ...coverDetails, courseName: e.target.value })} />
                            <input className="bg-black/40 border border-white/10 p-3 rounded-lg text-white font-mono text-xs focus:border-cyan-500/50 outline-none w-full" placeholder="Course Code:" value={coverDetails.courseCode} onChange={e => setCoverDetails({ ...coverDetails, courseCode: e.target.value })} />

                            <textarea className="bg-black/40 border border-white/10 p-3 rounded-lg text-white font-mono text-xs focus:border-cyan-500/50 outline-none w-full resize-none h-24" placeholder="Submitted to:&#10;Dr. XYZ&#10;Professor..." value={coverDetails.submittedTo} onChange={e => setCoverDetails({ ...coverDetails, submittedTo: e.target.value })} />

                            <textarea className="bg-black/40 border border-white/10 p-3 rounded-lg text-white font-mono text-xs focus:border-cyan-500/50 outline-none w-full resize-none h-24" placeholder="Submitted by:&#10;Munif&#10;Section: A" value={coverDetails.submittedBy} onChange={e => setCoverDetails({ ...coverDetails, submittedBy: e.target.value })} />

                            <input className="bg-black/40 border border-white/10 p-3 rounded-lg text-white font-mono text-xs focus:border-cyan-500/50 outline-none w-full" type="text" placeholder="Student ID (e.g. B21...)" value={coverDetails.studentId} onChange={e => setCoverDetails({ ...coverDetails, studentId: e.target.value })} />

                            <input className="bg-black/40 border border-white/10 p-3 rounded-lg text-white font-mono text-xs focus:border-cyan-500/50 outline-none w-full" type="text" placeholder="Submission Date (e.g. 10 October 2026)" value={coverDetails.date} onChange={e => setCoverDetails({ ...coverDetails, date: e.target.value })} />

                            <button onClick={() => window.print()} className="mt-4 bg-gradient-to-r from-cyan-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 py-3 rounded-lg text-white font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-2">Print Document</button>
                        </div>

                        <div className="flex-1 bg-[#1a1a1e] p-4 md:p-8 overflow-auto print:p-0 print:bg-white print:m-0 print:overflow-visible">
                            <div className="min-w-[210mm] flex justify-center items-start">
                                {/* A4 Paper */}
                                <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl px-[20mm] pb-[20mm] pt-[15mm] text-black font-sans relative print:shadow-none print:w-[210mm] print:h-[297mm] print:p-0 flex flex-col justify-start">
                                    <div className="text-center mb-16">
                                        <img src="/logo.png" alt="University Logo" className="h-40 mx-auto mb-4 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        <h2 className="text-[20px] font-bold uppercase tracking-widest leading-tight">DEPARTMENT OF STATISTICS</h2>
                                        <h1 className="text-[32px] font-black uppercase tracking-widest mt-1">JAGANNATH UNIVERSITY</h1>
                                    </div>

                                    <div className="w-[90%] mx-auto space-y-8 text-[22px] mt-8" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                                        <div className="flex gap-4">
                                            <span className="font-bold italic w-44 shrink-0 flex justify-between items-end"><span>Assignment no</span><span>:</span></span>
                                            <span className="flex-1 min-h-[30px] border-b border-black outline-none flex items-end">{coverDetails.assignmentNo}</span>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="font-bold italic w-44 shrink-0 flex justify-between items-end"><span>Course Name</span><span>:</span></span>
                                            <span className="flex-1 min-h-[30px] border-b border-black outline-none flex items-end">{coverDetails.courseName}</span>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="font-bold italic w-44 shrink-0 flex justify-between items-end"><span>Course Code</span><span>:</span></span>
                                            <span className="flex-1 min-h-[30px] border-b border-black outline-none flex items-end">{coverDetails.courseCode}</span>
                                        </div>
                                        <div className="flex gap-4 items-start">
                                            <span className="font-bold italic w-44 shrink-0 mt-1 flex justify-between"><span>Submitted to</span><span>:</span></span>
                                            <span className="flex-1 whitespace-pre-wrap leading-tight border-b border-black outline-none min-h-[30px] mt-1">{coverDetails.submittedTo}</span>
                                        </div>
                                        <div className="flex gap-4 items-start">
                                            <span className="font-bold italic w-44 shrink-0 mt-1 flex justify-between"><span>Submitted by</span><span>:</span></span>
                                            <span className="flex-1 whitespace-pre-wrap leading-tight border-b border-black outline-none min-h-[30px] mt-1">{coverDetails.submittedBy}</span>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="font-bold italic w-44 shrink-0 flex justify-between items-end"><span>ID</span><span>:</span></span>
                                            <span className="flex-1 min-h-[30px] border-b border-black outline-none flex items-end">{coverDetails.studentId}</span>
                                        </div>
                                        <div className="flex gap-4 mt-12">
                                            <span className="font-bold italic w-44 shrink-0 flex justify-between items-end"><span>Submission Date</span><span>:</span></span>
                                            <span className="flex-1 min-h-[30px] border-b border-black outline-none flex items-end">{coverDetails.date}</span>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-8 right-8">
                                        <img src="/logo.png" alt="Bottom Logo" className="h-16 opacity-30 object-contain grayscale" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </motion.div>
    );
}