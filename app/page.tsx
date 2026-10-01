"use client";

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from "framer-motion";
import {
    Trash2, Plus, Upload, Lock, Unlock, FileText, Send, X,
    ChevronRight, ChevronDown, Folder, Sparkles, MessageSquare,
    Minimize2, Loader2, GraduationCap, Menu, Search, FolderPlus,
    File, User, Lightbulb, Grid, Home as HomeIcon, MoreVertical, ExternalLink,
    Download, ArrowLeft, BarChart2, Users, Activity, Eye, Clock, RefreshCw,
    Fingerprint, ShieldCheck, ShieldAlert, KeyRound, LogIn, Github
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

function getFileIdFromUrl(url: string) {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return idMatch ? idMatch[1] : null;
}

function getDriveThumbnail(url: string) {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
    }
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w800`;
    }
    return null;
}

function getDirectDownloadUrl(url: string) {
    if (!url) return '';
    const fileId = getFileIdFromUrl(url);
    if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    return url;
}

// 🔍 Search Term Text Highlighter
function HighlightText({ text, highlight }: { text: string; highlight: string }) {
    if (!highlight || !highlight.trim()) return <>{text}</>;
    const query = highlight.trim().toLowerCase();
    const lowerText = text.toLowerCase();
    const parts: { text: string; match: boolean }[] = [];
    let start = 0;

    while (start < text.length) {
        const index = lowerText.indexOf(query, start);
        if (index === -1) {
            parts.push({ text: text.slice(start), match: false });
            break;
        }
        if (index > start) {
            parts.push({ text: text.slice(start, index), match: false });
        }
        parts.push({ text: text.slice(index, index + query.length), match: true });
        start = index + query.length;
    }

    return (
        <>
            {parts.map((part, i) =>
                part.match ? (
                    <mark
                        key={i}
                        className="bg-cyan-400/25 text-cyan-200 px-1 py-0.5 rounded font-bold border border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.3)] not-italic"
                    >
                        {part.text}
                    </mark>
                ) : (
                    <span key={i}>{part.text}</span>
                )
            )}
        </>
    );
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
    const [currentUser, setCurrentUser] = useState<{ id: string, name: string, role?: string, traffic_count?: number, login_count?: number } | null>(null);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password' | 'reset_password'>('login');
    const [authForm, setAuthForm] = useState({ id: "", email: "", password: "", otp: "", newPassword: "" });
    const [isAuthLoading, setIsAuthLoading] = useState(false);

    // Auto-Login States
    const [autoLoginStatus, setAutoLoginStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('processing');
    const [autoLoginMessage, setAutoLoginMessage] = useState<string>("");

    // Traffic & Analytics States
    const [showTrafficModal, setShowTrafficModal] = useState(false);
    const [trafficData, setTrafficData] = useState<{ summary: any, students: any[] } | null>(null);
    const [isTrafficLoading, setIsTrafficLoading] = useState(false);
    const [trafficSearch, setTrafficSearch] = useState("");
    const [trafficSort, setTrafficSort] = useState<'traffic' | 'logins' | 'recent' | 'id' | 'name'>('traffic');

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

    // 🚦 Traffic Session Tracker: Tracks website open per browser session
    async function recordTrafficSession(user: any) {
        if (!user || user.role === 'admin' || !user.id) return;
        const sessionKey = `traffic_tracked_${user.id}`;
        if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) {
            return;
        }

        try {
            const res = await fetch('/api/traffic', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem(sessionKey, 'true');
                }
                if (data.traffic_count !== undefined) {
                    setCurrentUser(prev => prev ? { ...prev, traffic_count: data.traffic_count } : null);
                }
            }
        } catch (err) {
            console.error("Traffic logging error:", err);
        }
    }

    async function fetchTrafficAnalytics() {
        setIsTrafficLoading(true);
        try {
            const res = await fetch('/api/admin/traffic');
            const data = await res.json();
            if (data.success) {
                setTrafficData({ summary: data.summary, students: data.students });
            } else {
                alert(data.error || "Failed to load traffic data");
            }
        } catch (err) {
            console.error("Traffic fetch error", err);
            alert("Failed to load traffic analytics.");
        } finally {
            setIsTrafficLoading(false);
        }
    }

    function exportTrafficCsv() {
        if (!trafficData?.students?.length) return alert("No student data to export.");
        const headers = ["Student ID", "Name", "Email", "Status", "Website Opens (Traffic)", "Logins", "Devices & Browsers Used", "Last Active"];
        const rows = trafficData.students.map(s => {
            const devicesSummary = (s.devices && s.devices.length > 0)
                ? s.devices.map((d: any) => `${d.os} (${d.browser})${d.count > 1 ? ` x${d.count}` : ''}`).join('; ')
                : (s.device?.label || 'No visit yet');

            return [
                `"${s.id}"`,
                `"${(s.name || '').replace(/"/g, '""')}"`,
                `"${s.email || 'Unregistered'}"`,
                `"${s.isRegistered ? 'Registered' : 'Pending'}"`,
                s.traffic_count || 0,
                s.login_count || 0,
                `"${devicesSummary}"`,
                `"${s.last_visited_at ? new Date(s.last_visited_at).toLocaleString() : 'Never'}"`
            ];
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `student_traffic_report_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    useEffect(() => {
        fetchData();
        attemptAutoLogin();
    }, []);

    async function attemptAutoLogin() {
        setAutoLoginStatus('processing');
        if (typeof window !== 'undefined') {
            localStorage.removeItem('statnotes_saved_id');
        }
        const startTime = Date.now();
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();

            // Smooth minimum animation duration (850ms) for high-tech biometric scan effect
            const elapsed = Date.now() - startTime;
            if (elapsed < 850) {
                await new Promise(r => setTimeout(r, 850 - elapsed));
            }

            if (data.success && data.user) {
                setCurrentUser(data.user);
                recordTrafficSession(data.user);
                setAutoLoginStatus('success');
                setTimeout(() => {
                    setAutoLoginStatus('idle');
                }, 1000);
            } else {
                setAutoLoginStatus('failed');
                setAutoLoginMessage("No active session found or session has expired. Please log in with your Student ID and Password.");
            }
        } catch (e) {
            console.error("Auto login error:", e);
            const elapsed = Date.now() - startTime;
            if (elapsed < 850) {
                await new Promise(r => setTimeout(r, 850 - elapsed));
            }
            setAutoLoginStatus('failed');
            setAutoLoginMessage("Unable to verify session. Please log in with your Student ID and Password.");
        }
    }

    function openLoginModal(mode: 'login' | 'register' = 'login') {
        setAuthMode(mode);
        setAuthForm({ id: "", email: "", password: "", otp: "", newPassword: "" });
        if (typeof window !== 'undefined') {
            localStorage.removeItem('statnotes_saved_id');
        }
        setShowAdminModal(true);
    }

    function openLoginWithIdPassword() {
        openLoginModal('login');
    }

    useEffect(() => {
        if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }, [chatHistory, isAiLoading, suggestedQuestions]);

    // Handle Browser History & Mobile Back Button so pressing back closes the file instead of exiting the site
    useEffect(() => {
        if (window.location.hash === '#view') {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        const handlePopState = (event: PopStateEvent) => {
            if (!event.state?.fileViewer && window.location.hash !== '#view') {
                setSelectedFile(null);
                setIsAiOpen(false);
                setIsHeaderMenuOpen(false);
            } else if (event.state?.fileViewer && event.state?.fileId) {
                const targetFile = files.find(f => f.id === event.state.fileId);
                if (targetFile) {
                    setSelectedFile(targetFile);
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [files]);

    useEffect(() => {
        if (selectedFile) {
            setChatHistory([]);
            setSuggestedQuestions([]);
            setIsHeaderMenuOpen(false);
        } else {
            setIsAiOpen(false);
            setIsHeaderMenuOpen(false);
        }
    }, [selectedFile]);

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
                    recordTrafficSession(data.user);
                    setAutoLoginStatus('idle');
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
            setAutoLoginStatus('idle');
        }
    }

    async function handleCreateFolder() {
        if (!newFolderCode) return alert("Enter a Course Code");
        try {
            const res = await fetch('/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: newFolderCode,
                    year: targetYear,
                    semester: targetSemester
                })
            });
            const data = await res.json();
            if (!data.success) {
                alert("Error: " + (data.error || "Failed to create folder"));
            } else {
                setShowAddFolderModal(false);
                setNewFolderCode("");
                fetchData();
            }
        } catch (err) {
            console.error("Folder creation error:", err);
            alert("Network error creating folder.");
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

            const courseRes = await fetch('/api/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newFileTitle,
                    course_code: targetFolderCode,
                    category: targetCategory,
                    year: finalYear,
                    semester: finalSemester,
                    pdf_url: finalUrl
                })
            });

            const courseData = await courseRes.json();
            if (!courseData.success) {
                alert("Upload Error: " + (courseData.error || "Failed to save material"));
            } else {
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

        try {
            const res = await fetch(`/api/courses?id=${file.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) {
                alert("Error: " + (data.error || "Failed to delete file"));
            } else {
                fetchData();
                if (selectedFile?.id === file.id) handleGoHome();
            }
        } catch (err) {
            console.error("Delete error:", err);
            alert("Failed to delete file. Check your connection.");
        }
    }

    const toggleState = (setter: any, val: string) => {
        setter((prev: string[]) => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
    };

    const handleSelectFile = (file: any) => {
        if (!selectedFile) {
            window.history.pushState({ fileViewer: true, fileId: file.id }, '', '#view');
        } else {
            window.history.replaceState({ fileViewer: true, fileId: file.id }, '', '#view');
        }
        setSelectedFile(file);
        setIsMobileMenuOpen(false);
    };

    const handleGoHome = () => {
        setSelectedFile(null);
        setIsAiOpen(false);
        setIsHeaderMenuOpen(false);
        setSearchTerm("");
        if (window.history.state?.fileViewer || window.location.hash === '#view') {
            window.history.back();
        }
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
                            <input className="relative z-10 w-full bg-white/5 backdrop-blur-md text-xs text-cyan-50 pl-10 pr-9 py-2.5 rounded-full outline-none border border-white/10 focus:border-cyan-500/50 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all placeholder-gray-500 font-sans tracking-wide" placeholder="Search resources..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value.toLowerCase())} />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors z-20 p-0.5"
                                    title="Clear search"
                                >
                                    <X size={13} />
                                </button>
                            )}
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
                                    {currentUser.role === 'admin' ? 'Super Admin' : 'Student'}
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
                                                        {sData.folders.map(folder => {
                                                            const hasCourseMatch = searchTerm.length > 0 && files.some(f => f.course_code === folder.code && f.title.toLowerCase().includes(searchTerm));
                                                            return (
                                                            <div key={folder.id}>
                                                                <button onClick={() => toggleState(setExpandedCourses, folder.code)} className="w-full flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg text-xs text-gray-300 border border-transparent transition-colors group">
                                                                    {expandedCourses.includes(folder.code) ? <ChevronDown size={12} className="text-cyan-500" /> : <ChevronRight size={12} className="text-gray-600 group-hover:text-cyan-400" />}
                                                                    <span className={`font-bold tracking-wide transition-colors ${hasCourseMatch ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'text-cyan-200/80 group-hover:text-white'}`}>{folder.code}</span>
                                                                    {hasCourseMatch && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.8)] ml-auto" title="Contains matching files" />}
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
                                                                                        <span className={`ml-auto text-[9px] px-1 rounded border transition-colors ${searchTerm && catFiles.length > 0 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-[0_0_6px_rgba(6,182,212,0.3)]' : 'bg-white/5 text-gray-400 border-white/5'}`}>{catFiles.length}</span>
                                                                                    </button>
                                                                                    {expandedCategories.includes(catKey) && (
                                                                                        <div className="ml-4 space-y-1 mt-1">
                                                                                            {catFiles.length === 0 && <div className="text-[9px] text-gray-700 italic px-2 font-mono">// EMPTY</div>}
                                                                                            {catFiles.map(file => (
                                                                                                <div key={file.id} className="relative group">
                                                                                                    <button onClick={() => handleSelectFile(file)} className={`w-full text-left flex items-center gap-2 p-2 rounded text-[11px] border transition-colors ${selectedFile?.id === file.id ? 'bg-white/10 text-white border-white/20 shadow-sm' : (searchTerm && file.title.toLowerCase().includes(searchTerm) ? 'bg-cyan-500/10 text-cyan-200 border-cyan-500/30 font-medium' : 'hover:bg-white/5 text-gray-400 border-transparent bg-transparent hover:text-gray-200')}`}>
                                                                                                        <FileText size={12} className={selectedFile?.id === file.id ? "text-cyan-300" : (searchTerm && file.title.toLowerCase().includes(searchTerm) ? "text-cyan-400" : "")} /> <span className="truncate"><HighlightText text={file.title} highlight={searchTerm} /></span>
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
                                                        );})}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-60 p-4 text-center">
                            {autoLoginStatus === 'processing' ? (
                                <>
                                    <Loader2 size={24} className="mb-2 text-cyan-400 animate-spin" />
                                    <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mt-1">Authenticating...</p>
                                </>
                            ) : (
                                <>
                                    <Lock size={32} className="mb-2 text-cyan-500" />
                                    <p className="text-xs font-mono text-cyan-400 uppercase tracking-widest mt-2">Login Required</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/5 bg-[#0d0d10]/50 flex gap-2 relative">
                    {!currentUser ? (
                        <>
                            <button
                                onClick={() => openLoginModal('login')}
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
                            {currentUser?.role === 'admin' && (
                                <button
                                    onClick={() => { setShowTrafficModal(true); fetchTrafficAnalytics(); }}
                                    title="Account Traffic & Analytics"
                                    className="p-2 rounded-lg transition text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 bg-[#121216]"
                                >
                                    <BarChart2 size={16} />
                                </button>
                            )}
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
                        <div className="flex items-center gap-2">
                            {currentUser?.role === 'admin' && (
                                <button 
                                    onClick={() => { setShowTrafficModal(true); fetchTrafficAnalytics(); }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold font-mono uppercase flex items-center gap-1"
                                >
                                    <BarChart2 size={12} /> Traffic
                                </button>
                            )}
                            <button onClick={() => setIsMobileMenuOpen(true)} className="text-cyan-400"><Menu size={24} /></button>
                        </div>
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
                            <div className="h-16 bg-black/20 border-b border-white/10 flex items-center justify-between px-3 md:px-5 gap-2 md:gap-3 relative shrink-0">
                                <button
                                    onClick={handleGoHome}
                                    className="p-2 -ml-1 md:ml-0 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-1.5 shrink-0 group border border-transparent hover:border-white/10"
                                    title="Back to Library"
                                    aria-label="Back to Library"
                                >
                                    <ArrowLeft size={18} className="text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
                                    <span className="text-xs font-mono uppercase hidden sm:inline text-gray-300">Back</span>
                                </button>
                                <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-white/10 text-cyan-200 px-2.5 py-0.5 rounded-md border border-white/10 whitespace-nowrap font-medium tracking-wide">{selectedFile.category}</span>
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium truncate"><User size={12} className="shrink-0" /> <span className="truncate">{selectedFile.uploader || "UNKNOWN_USER"}</span></span>
                                    </div>
                                    <span className="text-sm font-bold text-gray-100 truncate mt-0.5 tracking-wide">{selectedFile.title}</span>
                                </div>

                                {/* Desktop Actions */}
                                <div className="hidden md:flex items-center gap-2 ml-2">
                                    <a
                                        href={getDirectDownloadUrl(selectedFile.pdf_url)}
                                        download={selectedFile.title}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-[11px] font-bold whitespace-nowrap border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-200 hover:text-white px-3.5 py-2 rounded-xl transition-all tracking-wide shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95"
                                        title="Direct Download File"
                                    >
                                        <Download size={14} className="text-cyan-400" />
                                        <span>DOWNLOAD</span>
                                    </a>
                                    <a
                                        href={selectedFile.pdf_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-[11px] text-white font-bold whitespace-nowrap border border-white/20 bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl transition tracking-wide shadow-sm"
                                        title="Open in External Tab"
                                    >
                                        <ExternalLink size={13} className="text-gray-400" />
                                        <span>EXTERNAL</span>
                                    </a>
                                </div>

                                {/* Mobile Actions */}
                                <div className="flex md:hidden items-center gap-1">
                                    <a
                                        href={getDirectDownloadUrl(selectedFile.pdf_url)}
                                        download={selectedFile.title}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl transition-all shadow-[0_0_12px_rgba(6,182,212,0.15)] flex items-center justify-center shrink-0"
                                        title="Direct Download"
                                        aria-label="Direct Download"
                                    >
                                        <Download size={18} className="text-cyan-400" />
                                    </a>

                                    {/* Mobile 3-Dot Menu */}
                                    <div className="relative flex items-center">
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
                                                    className="absolute right-0 top-full mt-2 w-52 bg-[#0a0a0c]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                                                >
                                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
                                                    <div className="p-1.5 flex flex-col gap-1">
                                                        <a
                                                            href={getDirectDownloadUrl(selectedFile.pdf_url)}
                                                            download={selectedFile.title}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={() => setIsHeaderMenuOpen(false)}
                                                            className="flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10 rounded-lg transition-colors text-left w-full font-bold"
                                                        >
                                                            <Download size={14} className="text-cyan-400" />
                                                            <span>Direct Download</span>
                                                        </a>
                                                        <div className="h-[1px] bg-white/5 my-0.5"></div>
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
                                                            <ArrowLeft size={14} className="text-red-400" />
                                                            <span>Back to Library</span>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            <iframe src={selectedFile.pdf_url} className="flex-1 w-full bg-white/5 border-0" title="Preview" />

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
                            {currentUser && searchTerm && (
                                <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <Search size={14} className="text-cyan-400" />
                                        <p className="text-xs font-mono text-gray-300">
                                            Found <span className="text-cyan-300 font-bold">{dashboardFiles.length}</span> resource{dashboardFiles.length === 1 ? '' : 's'} matching "<span className="text-white font-semibold">{searchTerm}</span>"
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 uppercase tracking-wider transition-colors hover:underline flex items-center gap-1"
                                    >
                                        <X size={12} /> Clear Filter
                                    </button>
                                </div>
                            )}

                            {currentUser && dashboardFiles.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                                    {dashboardFiles.map((file, idx) => (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 30 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true, margin: "100px" }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                            key={file.id} 
                                            className={`group bg-white/[0.04] backdrop-blur-md border ${searchTerm ? 'border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-white/[0.07]' : 'border-white/10 hover:border-white/30'} p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:bg-white/[0.08] flex flex-col gap-4 relative cursor-pointer overflow-hidden`} 
                                            onClick={() => handleSelectFile(file)}
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
                                                    <h3 className="font-bold text-gray-100 text-[15px] truncate tracking-wide group-hover:text-white transition-colors">
                                                        <HighlightText text={file.title} highlight={searchTerm} />
                                                    </h3>
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
                                            <p className="font-mono tracking-widest uppercase text-sm text-gray-400">
                                                {searchTerm ? `No files matching "${searchTerm}"` : 'NO_DATA_FOUND'}
                                            </p>
                                            {searchTerm && (
                                                <button
                                                    onClick={() => setSearchTerm("")}
                                                    className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline underline-offset-4 transition-colors"
                                                >
                                                    Clear Search Filter
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-2xl text-center z-20 w-full">
                                            <AnimatePresence mode="wait">
                                                {autoLoginStatus === 'processing' && (
                                                    <motion.div
                                                        key="auto-login-processing"
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-cyan-500/30 shadow-[0_15px_40px_rgba(0,0,0,0.5),0_0_30px_rgba(6,182,212,0.15)] flex flex-col items-center relative overflow-hidden"
                                                    >
                                                        {/* Cyber Scan Top Glow Line */}
                                                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>

                                                        {/* Biometric Scanning Radar Graphic */}
                                                        <div className="relative w-28 h-28 mb-5 flex items-center justify-center">
                                                            {/* Concentric rotating radar rings */}
                                                            <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping opacity-30" style={{ animationDuration: '2.5s' }}></div>
                                                            <div className="absolute inset-2 rounded-full border-2 border-dashed border-cyan-500/40 animate-spin" style={{ animationDuration: '10s' }}></div>
                                                            <div className="absolute inset-4 rounded-full border border-dashed border-fuchsia-500/40 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}></div>

                                                            {/* Central Biometric Scanner Core */}
                                                            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-fuchsia-500/20 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.3)] overflow-hidden">
                                                                <Fingerprint size={32} className="text-cyan-300 animate-pulse drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                                                                
                                                                {/* Moving Laser Beam Sweep */}
                                                                <motion.div
                                                                    animate={{ y: [-26, 26, -26] }}
                                                                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                                                                    className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_8px_rgba(34,211,238,1)]"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Status Badge */}
                                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] uppercase tracking-widest mb-3 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                                                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                                                            <span>Auto-Login In Progress</span>
                                                        </div>

                                                        <h3 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase mb-1">
                                                            Authenticating Session
                                                        </h3>
                                                        <p className="text-xs text-gray-400 font-mono max-w-xs leading-relaxed mb-5">
                                                            Verifying device credentials and retrieving student records...
                                                        </p>

                                                        {/* High-tech animated progress track */}
                                                        <div className="w-48 sm:w-56 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10 relative">
                                                            <motion.div
                                                                animate={{ x: ["-100%", "100%"] }}
                                                                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                                                                className="w-1/2 h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                                                            />
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {autoLoginStatus === 'failed' && (
                                                    <motion.div
                                                        key="auto-login-failed"
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-rose-500/30 shadow-[0_15px_40px_rgba(0,0,0,0.5),0_0_30px_rgba(244,63,94,0.12)] flex flex-col items-center relative overflow-hidden"
                                                    >
                                                        {/* Red/Amber Warning Accent Line */}
                                                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-rose-400 to-amber-400"></div>

                                                        {/* Key/Lock Alert Icon */}
                                                        <div className="w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-rose-500/15 via-amber-500/10 to-rose-500/5 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.2)]">
                                                            <KeyRound size={34} className="text-rose-300 drop-shadow-[0_0_10px_rgba(244,63,94,0.6)]" />
                                                        </div>

                                                        {/* Status Pill */}
                                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-[11px] uppercase tracking-widest mb-2.5">
                                                            <ShieldAlert size={12} />
                                                            <span>Auto-Login Not Found / Expired</span>
                                                        </div>

                                                        <h3 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase mb-2">
                                                            Please Login Again
                                                        </h3>

                                                        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-xs mb-6 font-medium">
                                                            No active session was detected on this device. Please log in with your <strong className="text-cyan-300 font-semibold">Student ID & Password</strong> to continue.
                                                        </p>

                                                        {/* Primary Action Button: Login with ID & Password */}
                                                        <div className="w-full flex flex-col gap-2.5">
                                                            <button
                                                                onClick={openLoginWithIdPassword}
                                                                className="w-full py-3.5 px-5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm tracking-wider uppercase rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <LogIn size={16} />
                                                                <span>Login with ID & Password</span>
                                                            </button>

                                                            <button
                                                                onClick={() => attemptAutoLogin()}
                                                                className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-mono text-[11px] tracking-wider uppercase rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                                                            >
                                                                <RefreshCw size={12} />
                                                                <span>Retry Auto-Login</span>
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {autoLoginStatus === 'success' && (
                                                    <motion.div
                                                        key="auto-login-success"
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-emerald-500/30 shadow-[0_15px_40px_rgba(0,0,0,0.5),0_0_30px_rgba(16,185,129,0.2)] flex flex-col items-center relative overflow-hidden"
                                                    >
                                                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"></div>
                                                        <div className="w-20 h-20 mb-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                                                            <ShieldCheck size={36} className="text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                                                        </div>
                                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] uppercase tracking-widest mb-2.5">
                                                            <span>✓ Session Verified</span>
                                                        </div>
                                                        <h3 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase mb-1">
                                                            Welcome Back!
                                                        </h3>
                                                        <p className="text-xs text-gray-300 font-mono">
                                                            Unlocking your courses and study materials...
                                                        </p>
                                                    </motion.div>
                                                )}

                                                {autoLoginStatus === 'idle' && (
                                                    <motion.div
                                                        key="auto-login-idle"
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="w-full max-w-lg flex flex-col items-center"
                                                    >
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
                                                            onClick={() => openLoginModal('login')} 
                                                            className="group relative px-8 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl transition-all duration-300 border border-white/20 shadow-[0_8px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:-translate-y-1 overflow-hidden"
                                                        >
                                                            <span className="relative text-sm font-bold tracking-widest text-white uppercase drop-shadow-sm flex items-center gap-2">
                                                                Login to Access <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                                            </span>
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ✨ MINIMAL FOOTER LINK ✨ */}
                            <div className="mt-auto pt-6 pb-4 w-full flex justify-center items-center">
                                <a
                                    href="https://github.com/soaib3217-lab"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="View Munif's GitHub Profile"
                                    className="group flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 active:scale-95 backdrop-blur-xl border border-white/10 hover:border-cyan-400/40 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all duration-300 cursor-pointer no-underline"
                                >
                                    <Github size={12} className="text-gray-400 group-hover:text-cyan-400 transition-colors" />
                                    <span className="text-[10px] font-medium tracking-widest text-gray-400 group-hover:text-gray-300 uppercase transition-colors">
                                        Developed By
                                    </span>
                                    <span className="text-[10px] font-black tracking-widest text-white group-hover:text-cyan-300 uppercase transition-colors flex items-center gap-1">
                                        MUNIF
                                        <ExternalLink size={10} className="text-gray-500 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                                    </span>
                                </a>
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

                {/* 📊 ADMIN TRAFFIC & ANALYTICS MODAL */}
                {showTrafficModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[75] flex items-center justify-center p-2 sm:p-4 md:p-6"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 15, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 15, opacity: 0 }}
                            transition={{ type: "spring", damping: 26, stiffness: 320 }}
                            className="relative w-full max-w-5xl h-[94dvh] sm:h-[88vh] flex flex-col bg-[#09090d]/98 border border-white/15 rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] backdrop-blur-3xl overflow-hidden"
                        >
                            {/* Neon accent line at top */}
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-cyan-400"></div>

                            {/* Header (fixed at top of modal) */}
                            <div className="p-3.5 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-white/[0.02] shrink-0">
                                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] shrink-0">
                                        <BarChart2 size={18} className="sm:w-5 sm:h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm sm:text-base font-black text-white tracking-wide truncate">
                                                Traffic & Analytics
                                            </h3>
                                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono uppercase tracking-wider">Live DB</span>
                                        </div>
                                        <p className="text-[10px] sm:text-xs text-gray-400 font-mono truncate hidden xs:block">Individual student website opens & activity</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                    <button
                                        onClick={fetchTrafficAnalytics}
                                        disabled={isTrafficLoading}
                                        title="Refresh Data"
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        <RefreshCw size={14} className={isTrafficLoading ? "animate-spin text-cyan-400" : ""} />
                                    </button>
                                    <button
                                        onClick={exportTrafficCsv}
                                        title="Download CSV Report"
                                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-[11px] sm:text-xs font-mono transition-all"
                                    >
                                        <Download size={13} />
                                        <span className="hidden sm:inline">CSV</span>
                                    </button>
                                    <button
                                        onClick={() => setShowTrafficModal(false)}
                                        className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Top Stats & Filters Section (Fixed, non-scrolling) */}
                            <div className="p-3 sm:p-5 border-b border-white/10 bg-white/[0.01] shrink-0 space-y-3">
                                {/* 4 Summary Cards + Device Analytics */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                    <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-mono uppercase text-gray-400">Total Opens</span>
                                            <Eye size={12} className="text-cyan-400" />
                                        </div>
                                        <p className="text-xl sm:text-2xl font-black text-white font-mono drop-shadow-[0_0_12px_rgba(6,182,212,0.4)] mt-1">
                                            {trafficData?.summary?.totalTraffic ?? 0}
                                        </p>
                                    </div>

                                    <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-mono uppercase text-gray-400">Total Logins</span>
                                            <Unlock size={12} className="text-fuchsia-400" />
                                        </div>
                                        <p className="text-xl sm:text-2xl font-black text-white font-mono drop-shadow-[0_0_12px_rgba(217,70,239,0.4)] mt-1">
                                            {trafficData?.summary?.totalLogins ?? 0}
                                        </p>
                                    </div>

                                    <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-mono uppercase text-gray-400">Device Traffic</span>
                                            <span className="text-[11px]">📱 / 💻</span>
                                        </div>
                                        <div className="mt-1 flex items-baseline gap-2">
                                            <span className="text-xs sm:text-sm font-bold text-cyan-300 font-mono">
                                                📱 {trafficData?.summary?.deviceBreakdown?.mobilePercent ?? 0}%
                                            </span>
                                            <span className="text-xs sm:text-sm font-bold text-gray-300 font-mono">
                                                💻 {trafficData?.summary?.deviceBreakdown?.desktopPercent ?? 0}%
                                            </span>
                                        </div>
                                        <p className="text-[9px] text-gray-400 font-mono truncate">
                                            Top OS: {trafficData?.summary?.deviceBreakdown?.topOs || 'N/A'}{trafficData?.summary?.deviceBreakdown?.totalSessions ? ` (${trafficData.summary.deviceBreakdown.totalSessions} visits)` : ''}
                                        </p>
                                    </div>

                                    <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-mono uppercase text-gray-400">Top Active</span>
                                            <Activity size={12} className="text-amber-400" />
                                        </div>
                                        <p className="text-xs sm:text-sm font-bold text-white truncate mt-1">
                                            {trafficData?.summary?.mostActive?.name || 'N/A'}
                                        </p>
                                        <p className="text-[9px] text-amber-400/80 font-mono">
                                            {trafficData?.summary?.mostActive ? `${trafficData.summary.mostActive.traffic_count || 0} opens` : 'No data'}
                                        </p>
                                    </div>
                                </div>

                                {/* Controls: Search & Sort Pills */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                                    <div className="relative flex-1">
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            value={trafficSearch}
                                            onChange={(e) => setTrafficSearch(e.target.value)}
                                            placeholder="Search student ID, name, or email..."
                                            className="w-full bg-black/40 border border-white/10 focus:border-white/20 rounded-xl pl-8 pr-7 py-1.5 sm:py-2 text-xs text-gray-200 outline-none font-mono placeholder-gray-600 transition-colors"
                                        />
                                        {trafficSearch && (
                                            <button onClick={() => setTrafficSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                                        <span className="text-[10px] font-mono text-gray-500 uppercase mr-1 hidden sm:inline shrink-0">Sort:</span>
                                        {[
                                            { id: 'traffic', label: 'Opens' },
                                            { id: 'logins', label: 'Logins' },
                                            { id: 'recent', label: 'Recent' },
                                            { id: 'id', label: 'ID' }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setTrafficSort(tab.id as any)}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all shrink-0 ${trafficSort === tab.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Students Container (Fluid, touch-optimized, with sticky header) */}
                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar smooth-scroll p-2 sm:p-5">
                                {(() => {
                                    const rawList = trafficData?.students || [];
                                    const query = trafficSearch.trim().toLowerCase();
                                    const filtered = rawList.filter(s => 
                                        !query || 
                                        s.id.toLowerCase().includes(query) || 
                                        (s.name && s.name.toLowerCase().includes(query)) ||
                                        (s.email && s.email.toLowerCase().includes(query))
                                    );

                                    const sorted = [...filtered].sort((a, b) => {
                                        if (trafficSort === 'traffic') return (b.traffic_count || 0) - (a.traffic_count || 0);
                                        if (trafficSort === 'logins') return (b.login_count || 0) - (a.login_count || 0);
                                        if (trafficSort === 'recent') {
                                            const ta = a.last_visited_at ? new Date(a.last_visited_at).getTime() : 0;
                                            const tb = b.last_visited_at ? new Date(b.last_visited_at).getTime() : 0;
                                            return tb - ta;
                                        }
                                        if (trafficSort === 'id') return a.id.localeCompare(b.id);
                                        return 0;
                                    });

                                    if (isTrafficLoading && sorted.length === 0) {
                                        return (
                                            <div className="py-16 text-center text-gray-400 font-mono flex items-center justify-center gap-2">
                                                <Loader2 size={16} className="animate-spin text-cyan-400" />
                                                <span className="text-xs">Connecting to Supabase...</span>
                                            </div>
                                        );
                                    }

                                    if (sorted.length === 0) {
                                        return (
                                            <div className="py-16 text-center text-gray-500 font-mono text-xs">
                                                No accounts match "{trafficSearch}"
                                            </div>
                                        );
                                    }

                                    return (
                                        <>
                                            {/* 📱 MOBILE VIEW: Smooth touch-friendly cards */}
                                            <div className="sm:hidden space-y-2">
                                                {sorted.map(student => (
                                                    <div 
                                                        key={student.id}
                                                        className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col gap-2 shadow-sm"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 tracking-wider">
                                                                {student.id}
                                                            </span>
                                                            <span className="text-[10px] font-mono text-gray-400">
                                                                {student.last_visited_at ? (
                                                                    new Date(student.last_visited_at).toLocaleDateString(undefined, {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })
                                                                ) : (
                                                                    <span className="text-gray-600 italic">Never</span>
                                                                )}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-xs font-bold text-white truncate">{student.name}</p>
                                                            {student.email ? (
                                                                <span className="text-[10px] font-mono text-gray-400 truncate max-w-[140px]" title={student.email}>
                                                                    {student.email}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[9px] font-mono text-gray-600 uppercase italic">Unregistered</span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center justify-between pt-1.5 border-t border-white/5 flex-wrap gap-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${student.traffic_count > 0 ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]' : 'bg-white/5 text-gray-500 border border-white/5'}`}>
                                                                    {student.traffic_count || 0} {student.traffic_count === 1 ? 'open' : 'opens'}
                                                                </span>
                                                                <span className="text-[11px] font-mono text-gray-300 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                                                    {student.login_count || 0} logins
                                                                </span>
                                                            </div>
                                                            {student.devices && student.devices.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {student.devices.map((d: any, idx: number) => (
                                                                        <span key={idx} className="text-[10px] font-mono text-cyan-300/90 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 flex items-center gap-1">
                                                                            <span>{d.icon}</span>
                                                                            <span>{d.os} ({d.browser}){d.count > 1 ? ` ×${d.count}` : ''}</span>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : student.device && student.device.type !== 'Unknown' ? (
                                                                <span className="text-[10px] font-mono text-cyan-300/90 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 flex items-center gap-1">
                                                                    <span>{student.device.icon}</span>
                                                                    <span>{student.device.os} ({student.device.browser})</span>
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* 💻 DESKTOP & TABLET VIEW: Sleek Table with Sticky Header & Device Column */}
                                            <div className="hidden sm:block border border-white/10 rounded-2xl overflow-hidden bg-white/[0.01]">
                                                <table className="w-full text-left border-collapse text-xs">
                                                    <thead className="sticky top-0 z-10 bg-[#0c0c12] border-b border-white/10 shadow-sm backdrop-blur-md">
                                                        <tr className="text-gray-400 font-mono uppercase text-[10px] tracking-wider">
                                                            <th className="p-3.5 pl-4">Student ID</th>
                                                            <th className="p-3.5">Name</th>
                                                            <th className="p-3.5">Email / Status</th>
                                                            <th className="p-3.5">Device & Browser</th>
                                                            <th className="p-3.5 text-center">Opens (Traffic)</th>
                                                            <th className="p-3.5 text-center">Logins</th>
                                                            <th className="p-3.5 pr-4 text-right">Last Active</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5 font-mono">
                                                        {sorted.map((student) => (
                                                            <tr key={student.id} className="hover:bg-white/[0.03] transition-colors group">
                                                                <td className="p-3.5 pl-4">
                                                                    <span className="font-bold text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/20 tracking-wider">
                                                                        {student.id}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3.5 font-sans font-medium text-white">
                                                                    {student.name}
                                                                </td>
                                                                <td className="p-3.5">
                                                                    {student.email ? (
                                                                        <span className="text-gray-300 text-[11px] truncate max-w-[180px] block" title={student.email}>
                                                                            {student.email}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] text-gray-600 uppercase italic">Unregistered</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-3.5">
                                                                    {student.devices && student.devices.length > 0 ? (
                                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                                            {student.devices.map((d: any, idx: number) => (
                                                                                <div key={idx} className="flex items-center gap-1.5 bg-white/[0.04] border border-white/10 px-2 py-1 rounded-lg">
                                                                                    <span className="text-sm">{d.icon}</span>
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-white text-[11px] font-mono font-medium leading-tight flex items-center gap-1">
                                                                                            {d.os}
                                                                                            {d.count > 1 && <span className="text-[9px] text-cyan-300 font-bold font-mono">({d.count}x)</span>}
                                                                                        </span>
                                                                                        <span className="text-[9px] text-gray-400 font-mono leading-tight">{d.browser}</span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : student.device && student.device.type !== 'Unknown' ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-base">{student.device.icon}</span>
                                                                            <div className="flex flex-col">
                                                                                <span className="text-white text-xs font-mono font-medium leading-tight">{student.device.os}</span>
                                                                                <span className="text-[10px] text-gray-400 font-mono leading-tight">{student.device.browser} • {student.device.type}</span>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-[10px] font-mono text-gray-600 italic">No visit yet</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-3.5 text-center">
                                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${student.traffic_count > 0 ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-white/5 text-gray-500 border border-white/5'}`}>
                                                                        {student.traffic_count || 0}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3.5 text-center">
                                                                    <span className="text-gray-300">
                                                                        {student.login_count || 0}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3.5 pr-4 text-right text-gray-400 text-[11px]">
                                                                    {student.last_visited_at ? (
                                                                        new Date(student.last_visited_at).toLocaleString(undefined, {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })
                                                                    ) : (
                                                                        <span className="text-gray-600 italic">Never</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    );
                                })()}
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