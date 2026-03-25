"use client";

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, Plus, Upload, Lock, Unlock, FileText, Send, X,
  ChevronRight, ChevronDown, Folder, Sparkles, MessageSquare,
  Minimize2, Loader2, GraduationCap, Menu, Search, FolderPlus,
  File, User, Lightbulb, Grid, Home as HomeIcon
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

    if (hasError || !imgSrc) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#1a1a1e]">
                <FileText size={32} className="text-cyan-900/50"/>
            </div>
        );
    }

    return (
        <img
            src={imgSrc}
            className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity mix-blend-luminosity group-hover:mix-blend-normal"
            alt={fileTitle}
            loading="lazy"
            onError={() => setHasError(true)}
        />
    );
};

export default function Home() {
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
  
  // Chat States
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Auth & Admin States
  const [currentUser, setCurrentUser] = useState<{id: string, name: string, role?: string} | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [loginIdInput, setLoginIdInput] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
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

  useEffect(() => { fetchData(); }, []);
  
  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatHistory, isAiLoading, suggestedQuestions]);

  useEffect(() => {
    if (selectedFile) {
        setChatHistory([]);
        setSuggestedQuestions([]);
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
          if(data.error) throw new Error(data.error);

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
  async function handleLogin() {
    if (!loginIdInput.trim()) return; 

    setIsLoggingIn(true); 

    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: loginIdInput })
        });

        const data = await response.json();

        if (data.success && data.user) {
            setCurrentUser(data.user);
            setShowAdminModal(false);
            setLoginIdInput("");
        } else {
            alert("ACCESS DENIED: INVALID CREDENTIALS");
        }
    } catch (error) {
        console.error("Login Error:", error);
        alert("SYSTEM ERROR: CONNECTION FAILED");
    } finally {
        setIsLoggingIn(false); 
    }
  }

  function handleLogout() {
      if(confirm("Terminate Session?")) setCurrentUser(null);
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
    <div className="flex h-[100dvh] bg-[#050505] text-gray-100 font-sans overflow-hidden">
      <AnimatePresence>
        {isMobileMenuOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}/>
        )}
      </AnimatePresence>

      {/* ✨ CYBERPUNK SIDEBAR ✨ */}
      <motion.div className={`fixed md:relative inset-y-0 left-0 w-80 bg-[#0a0a0c]/80 backdrop-blur-xl border-r border-white/10 flex flex-col z-50 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} shadow-[4px_0_24px_rgba(0,0,0,0.5)]`}>
        <div className="p-5 border-b border-white/5 flex flex-col gap-4 bg-[#0d0d10]/50 relative overflow-hidden">
          {/* Top subtle line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
          
          <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={handleGoHome}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600/80 to-fuchsia-600/80 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all border border-white/10">
                  <GraduationCap size={18} className="text-white" />
                </div>
                <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 to-white tracking-widest uppercase">STAT.Notes</h1>
              </div>
              <button className="md:hidden text-cyan-500/70 hover:text-cyan-400" onClick={() => setIsMobileMenuOpen(false)}><X size={20}/></button>
          </div>
          
          <div className="flex gap-2">
            <button onClick={handleGoHome} className="p-2.5 bg-[#121216] hover:bg-white/5 rounded-lg text-gray-500 hover:text-cyan-400 transition border border-white/5">
                <HomeIcon size={16} />
            </button>
            
            <div className="relative group flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors"/>
                <input className="w-full bg-[#121216]/80 text-xs text-cyan-100 pl-9 pr-3 py-2.5 rounded-lg outline-none border border-white/5 focus:border-cyan-500/30 focus:bg-[#0a0a0c] transition-all placeholder-gray-600 font-mono" placeholder="SCAN_FILES..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}/>
            </div>
          </div>

          {currentUser && (
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-lg backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute left-0 top-0 w-1 h-full bg-cyan-500/50"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/80 to-fuchsia-500/80 flex items-center justify-center text-xs font-bold text-white shadow-sm border border-white/20">
                      {currentUser.name.charAt(0)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                      <p className="text-[9px] font-mono text-cyan-400/70 uppercase tracking-widest">Active User</p>
                      <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                  </div>
              </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {structure.map((yData) => (
            <div key={yData.year}>
              <button onClick={() => toggleState(setExpandedYears, yData.year)} className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg text-sm font-semibold transition-all group">
                {expandedYears.includes(yData.year) ? <ChevronDown size={14} className="text-cyan-500 group-hover:text-cyan-400"/> : <ChevronRight size={14} className="text-gray-500 group-hover:text-cyan-400"/>}
                <Folder size={14} className="text-cyan-500 fill-cyan-500/10 transition" />
                <span className="text-gray-300 group-hover:text-white font-mono uppercase tracking-wider text-xs">{yData.year}</span>
              </button>

              <AnimatePresence>
                {expandedYears.includes(yData.year) && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden ml-3 pl-3 border-l border-white/5">
                    {yData.semesters.map((sData) => (
                      <div key={sData.sem}>
                        <button onClick={() => toggleState(setExpandedSemesters, `${yData.year}-${sData.sem}`)} className="w-full flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg text-[11px] text-gray-400 mt-1 font-mono uppercase">
                           {expandedSemesters.includes(`${yData.year}-${sData.sem}`) ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                           {sData.sem}
                        </button>

                        {expandedSemesters.includes(`${yData.year}-${sData.sem}`) && (
                          <div className="ml-4 mt-1 space-y-1">
                             {sData.folders.length === 0 && <div className="text-[10px] text-gray-700 pl-2 font-mono">NO_DATA_FOUND</div>}
                             {sData.folders.map(folder => (
                                 <div key={folder.id}>
                                     <button onClick={() => toggleState(setExpandedCourses, folder.code)} className="w-full flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg text-xs text-gray-300 border border-transparent transition-all">
                                          {expandedCourses.includes(folder.code) ? <ChevronDown size={12} className="text-cyan-500"/> : <ChevronRight size={12} className="text-gray-600"/>}
                                          <span className="font-bold text-cyan-200/80 tracking-wide">{folder.code}</span>
                                     </button>
                                     
                                     {expandedCourses.includes(folder.code) && (
                                         <div className="ml-3 pl-2 border-l border-white/5 mt-1 space-y-1">
                                              {CATEGORIES.map(cat => {
                                                  const catFiles = files.filter(f => f.course_code === folder.code && f.category === cat && f.title.toLowerCase().includes(searchTerm));
                                                  const catKey = `${folder.code}-${cat}`;
                                                  return (
                                                     <div key={cat}>
                                                         <button onClick={() => toggleState(setExpandedCategories, catKey)} className={`w-full flex items-center gap-2 p-1.5 hover:bg-white/5 rounded text-[10px] uppercase font-mono tracking-wider ${expandedCategories.includes(catKey) ? 'text-cyan-400' : 'text-gray-500'}`}>
                                                             {expandedCategories.includes(catKey) ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
                                                             {cat}
                                                             <span className="ml-auto text-[9px] bg-white/5 text-gray-400 px-1 rounded border border-white/5">{catFiles.length}</span>
                                                         </button>
                                                         {expandedCategories.includes(catKey) && (
                                                             <div className="ml-4 space-y-1 mt-1">
                                                                 {catFiles.length === 0 && <div className="text-[9px] text-gray-700 italic px-2 font-mono">// EMPTY</div>}
                                                                 {catFiles.map(file => (
                                                                     <div key={file.id} className="relative group">
                                                                         <button onClick={() => { setSelectedFile(file); setIsMobileMenuOpen(false); }} className={`w-full text-left flex items-center gap-2 p-2 rounded text-[11px] border transition-all ${selectedFile?.id === file.id ? 'bg-white/10 text-white border-white/20 shadow-sm' : 'hover:bg-white/5 text-gray-400 border-transparent bg-transparent'}`}>
                                                                                 <FileText size={12} className={selectedFile?.id === file.id ? "text-cyan-300" : ""}/> <span className="truncate">{file.title}</span>
                                                                         </button>
                                                                         {currentUser && (
                                                                            <button onClick={() => handleDeleteFile(file)} className="absolute right-1 top-1.5 p-1 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition">
                                                                                <Trash2 size={10}/>
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
          ))}
        </div>

        <div className="p-4 border-t border-white/5 bg-[#0d0d10]/50 flex gap-2 relative">
            {!currentUser ? (
                <button 
                    onClick={() => setShowAdminModal(true)} 
                    className="w-full bg-white/5 hover:bg-white/10 text-cyan-400/80 hover:text-cyan-300 rounded-lg flex items-center justify-center gap-2 py-2.5 text-xs font-bold border border-white/10 transition uppercase tracking-widest"
                >
                    <Unlock size={14} /> Sys_Login
                </button>
            ) : (
                <>
                    <button 
                        onClick={handleLogout} 
                        title="Logout"
                        className="p-2 rounded-lg transition text-fuchsia-400/80 hover:text-fuchsia-300 hover:bg-white/5 border border-transparent hover:border-white/10 bg-[#121216]"
                    >
                        <Lock size={16}/>
                    </button>
                    <div className="flex-1 flex gap-2">
                        <button onClick={() => setShowAddFolderModal(true)} className="flex-1 bg-white/5 hover:bg-white/10 text-cyan-300/80 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold border border-white/10 transition uppercase"><FolderPlus size={14}/> Folder</button>
                        <button onClick={() => setShowAddFileModal(true)} className="flex-1 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold border border-white/20 transition uppercase"><Plus size={14}/> File</button>
                    </div>
                </>
            )}
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col relative bg-[#050505] w-full max-w-full overflow-hidden">
        {/* Mobile Header */}
        {!selectedFile && (
            <div className="md:hidden h-14 border-b border-white/10 flex items-center px-4 justify-between bg-[#0a0a0c]/80 backdrop-blur-md shrink-0">
                <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-white tracking-widest uppercase">STAT.Notes</span>
                <button onClick={() => setIsMobileMenuOpen(true)} className="text-cyan-400"><Menu size={24}/></button>
            </div>
        )}

        {selectedFile ? (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-0 md:p-4 gap-4 relative">
                {/* PDF Viewer Area */}
                <motion.div layout className="flex-1 bg-[#0a0a0c]/80 backdrop-blur-xl md:rounded-xl border-x md:border border-white/10 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative flex flex-col">
                   <div className="h-14 bg-[#0d0d10]/50 border-b border-white/5 flex items-center justify-between px-4 gap-2">
                      <button onClick={handleGoHome} className="md:hidden mr-2 text-cyan-600 hover:text-cyan-400 transition">
                        <HomeIcon size={20} />
                      </button>
                      <div className="flex flex-col overflow-hidden flex-1">
                          <div className="flex items-center gap-2">
                              <span className="text-[9px] bg-white/5 text-cyan-300 px-2 py-0.5 rounded border border-white/10 whitespace-nowrap font-mono uppercase tracking-wider">{selectedFile.category}</span>
                              <span className="text-[9px] text-gray-500 flex items-center gap-1 font-mono"><User size={10}/> {selectedFile.uploader || "UNKNOWN_USER"}</span>
                          </div>
                          <span className="text-sm font-bold text-gray-100 truncate mt-1 tracking-wide">{selectedFile.title}</span>
                      </div>
                      <a href={selectedFile.pdf_url} target="_blank" className="text-xs text-cyan-400 hover:text-white font-bold whitespace-nowrap ml-2 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition uppercase tracking-wider">External</a>
                   </div>
                   
                   <iframe src={selectedFile.pdf_url} className="flex-1 w-full bg-[#121212]" title="Preview" />
                   
                   <button onClick={() => setIsAiOpen(!isAiOpen)} className="absolute bottom-6 right-6 bg-[#050505]/95 backdrop-blur-xl p-3.5 rounded-full text-cyan-400 shadow-[0_4px_20px_rgba(0,0,0,0.8)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all z-10 flex items-center justify-center border border-cyan-500/50 hover:border-cyan-400 hover:bg-black group">
                      {isAiOpen ? <ChevronRight size={22} className="group-hover:text-cyan-300 transition-colors" /> : <MessageSquare size={22} className="group-hover:text-cyan-300 transition-colors" />}
                   </button>
                </motion.div>
                
                {/* AI Tutor Panel */}
                <AnimatePresence mode='popLayout'>
                    {isAiOpen && (
                        <motion.div initial={{ width: 0, opacity: 0, x: 50 }} animate={{ width: 350, opacity: 1, x: 0 }} exit={{ width: 0, opacity: 0, x: 50 }} className="fixed md:relative inset-y-0 right-0 z-30 w-full md:w-[350px] bg-[#0a0a0c]/70 backdrop-blur-2xl border-l md:border border-white/10 flex flex-col md:rounded-xl overflow-hidden shadow-[-8px_0_32px_rgba(0,0,0,0.5)]">
                           <div className="p-4 border-b border-white/10 bg-[#0d0d10]/50 flex justify-between items-center relative">
                              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"></div>
                              <div className="flex items-center gap-2"><Sparkles size={16} className="text-fuchsia-400/80" /><span className="text-sm font-black text-white uppercase tracking-widest">Tutor AI</span></div>
                              <button onClick={() => setIsAiOpen(false)} className="text-gray-500 hover:text-white transition"><Minimize2 size={16}/></button>
                           </div>
                           
                           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-transparent flex flex-col" ref={chatScrollRef}>
                              {chatHistory.length === 0 && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-80 p-4">
                                    <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                        <Sparkles size={28} className="text-cyan-400/80" />
                                    </div>
                                    <h3 className="text-md font-black text-white mb-2 tracking-widest uppercase">System Ready</h3>
                                    <p className="text-xs text-gray-400 mb-6 font-mono">DATASET LOADED: <br/><b className="text-cyan-200/80">[{selectedFile.title}]</b></p>
                                    
                                    {suggestedQuestions.length === 0 ? (
                                        <div className="mt-2 w-full">
                                            <button
                                                onClick={() => generateSuggestions(selectedFile.title)}
                                                disabled={isAiLoading}
                                                className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm uppercase tracking-wider"
                                            >
                                                {isAiLoading ? <Loader2 size={14} className="animate-spin text-fuchsia-400"/> : <Sparkles size={14} className="text-cyan-400/80"/>}
                                                Init Analysis
                                            </button>
                                            <p className="text-[9px] text-gray-500 mt-3 font-mono uppercase">Query generation uses API Quota</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3 w-full">
                                            {suggestedQuestions.map((q, i) => (
                                                <button key={i} onClick={() => handleChat(q)} className="text-left text-xs bg-white/5 hover:bg-white/10 text-gray-200 p-3.5 rounded-xl border border-white/5 transition-all flex items-start gap-3 group">
                                                    <Lightbulb size={14} className="text-fuchsia-400/60 group-hover:text-fuchsia-300 transition mt-0.5 shrink-0"/> 
                                                    <span className="leading-relaxed">{q}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                              )}
                              
                              {chatHistory.map((msg, i) => (
                                 <div key={i} className={`mb-5 p-3.5 rounded-2xl text-sm leading-relaxed max-w-[90%] relative ${msg.role === 'user' ? 'bg-white/15 backdrop-blur-md border border-white/10 text-white ml-auto rounded-br-none shadow-sm' : 'bg-black/40 backdrop-blur-md border border-white/5 text-gray-200 mr-auto rounded-bl-none shadow-sm'}`}>
                                    <div className="prose prose-invert max-w-none text-[13px] break-words">
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={{ p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />, a: ({node, ...props}) => <a className="text-cyan-300 hover:text-cyan-200 hover:underline" {...props} />, code: ({node, ...props}) => <code className="bg-black/50 text-cyan-200/80 px-1 py-0.5 rounded font-mono text-[11px]" {...props} /> }}>{msg.text}</ReactMarkdown>
                                    </div>
                                 </div>
                              ))}
                              {isAiLoading && <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 pl-2 mb-4 uppercase tracking-wider"><Loader2 size={12} className="animate-spin text-fuchsia-400/80" /> Processing...</div>}
                           </div>
                           
                           <div className="p-3 border-t border-white/10 bg-[#0d0d10]/50">
                              <div className="flex items-center gap-2 bg-black/40 border border-white/10 focus-within:border-white/20 rounded-xl px-2 py-1.5 transition-all">
                                  <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChat()} placeholder="Execute Query..." className="flex-1 bg-transparent border-none text-sm text-gray-100 p-2 outline-none placeholder-gray-600 font-mono"/>
                                  <button onClick={() => handleChat()} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-lg text-white transition border border-white/5"><Send size={14}/></button>
                              </div>
                           </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        ) : (
            <div className="flex-1 flex flex-col bg-[#050505] overflow-hidden min-h-0 relative">
               {/* Decorative background grid (subtle) */}
               <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-[0.015] pointer-events-none"></div>
               
               <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar flex flex-col z-10">
                   {dashboardFiles.length > 0 ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
                           {dashboardFiles.map((file) => (
                               <div key={file.id} className="group bg-[#0a0a0c]/40 backdrop-blur-md border border-white/10 hover:border-white/20 p-4 rounded-xl transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex flex-col gap-3 relative cursor-pointer overflow-hidden" onClick={() => setSelectedFile(file)}>
                                       {/* Very subtle corners */}
                                       <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-tl-sm z-20"></div>
                                       <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-br-sm z-20"></div>

                                       <div className="h-40 bg-black/40 rounded-lg mb-1 overflow-hidden relative border border-white/5 transition-colors">
                                           <FileThumbnail url={file.pdf_url} fileTitle={file.title} />
                                           <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c]/80 via-transparent to-transparent" />
                                           <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-md border border-white/10 shadow-sm transition-colors"><FileText size={14} className="text-gray-300"/></div>
                                       </div>

                                       <div className="flex items-start justify-between z-10">
                                           <div className="flex-1 min-w-0">
                                               <h3 className="font-bold text-gray-200 text-sm truncate tracking-wide group-hover:text-white transition-colors">{file.title}</h3>
                                               <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1 font-mono uppercase"><User size={10} /> {file.uploader || "UNKNOWN"}</p>
                                           </div>
                                           {currentUser && (
                                               <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(file); }} className="text-gray-500 hover:text-red-400 transition p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded"><Trash2 size={14} /></button>
                                           )}
                                       </div>
                                       <div className="flex items-center gap-2 mt-auto z-10">
                                           <span className="text-[9px] bg-white/5 text-gray-300 px-2 py-1 rounded border border-white/10 truncate max-w-[50%] font-mono uppercase">{file.course_code}</span>
                                           <span className="text-[9px] bg-white/5 text-gray-300 px-2 py-1 rounded border border-white/10 truncate max-w-[50%] font-mono uppercase">{file.category}</span>
                                       </div>
                               </div>
                           ))}
                       </div>
                   ) : (
                       <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-4 mb-8"><Grid size={56} className="text-white/10 drop-shadow-sm"/><p className="font-mono tracking-widest uppercase text-sm text-gray-600">NO_DATA_FOUND</p></div>
                   )}

                    {/* ✨ COMPACT GLASS FOOTER ✨ */}
                    <div className="mt-auto pt-6 pb-4 w-full flex justify-center items-center">
                         <div className="relative group cursor-default">
                             {/* Subtle ambient light */}
                             <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-xl blur-sm opacity-50 group-hover:opacity-100 transition duration-500"></div>
                             
                             <div className="relative flex flex-col items-center justify-center px-6 py-2.5 bg-[#0a0a0c]/60 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.3)] overflow-hidden transition-colors">
                                 {/* Scanline */}
                                 <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
                                 
                                 <span className="text-[7px] font-mono tracking-[0.3em] text-gray-500 uppercase mb-0.5">
                                     Developed By
                                 </span>
                                 
                                 <div className="flex flex-col items-center justify-center">
                                      <div className="flex items-center gap-2">
                                          <Sparkles size={10} className="text-fuchsia-400/70" />
                                          <span className="text-sm font-black tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-fuchsia-200 uppercase leading-none mt-0.5">
                                              MUNIF
                                          </span>
                                          <Sparkles size={10} className="text-cyan-400/70" />
                                      </div>
                                      <span className="text-[7px] font-mono tracking-[0.2em] text-cyan-400/60 uppercase mt-1">
                                          Vibe Coding
                                      </span>
                                 </div>
                                 
                                 {/* Subtle corners */}
                                 <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20 rounded-br-sm"></div>
                                 <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20 rounded-tl-sm"></div>
                             </div>
                         </div>
                    </div>

               </div>
            </div>
        )}
      </div>

      <AnimatePresence>
        {/* ✨ GLASS ADMIN MODAL ✨ */}
        {showAdminModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="relative group w-full max-w-sm">
              <div className="relative bg-[#09090b]/60 backdrop-blur-2xl border border-white/10 p-8 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-center overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/20 rounded-br-sm"></div>
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/20 rounded-tl-sm"></div>

                <h3 className="text-xl font-black mb-6 tracking-widest text-white uppercase">
                  System Access
                </h3>
                
                <div className="relative mb-6">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="ENTER YOUR ID" 
                      className="w-full bg-black/40 border border-white/10 pl-9 pr-3 py-3 rounded-lg text-center text-white font-mono tracking-[0.2em] outline-none focus:border-white/20 focus:bg-black/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase" 
                      value={loginIdInput} 
                      onChange={(e) => setLoginIdInput(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && !isLoggingIn && handleLogin()}
                      disabled={isLoggingIn}
                    />
                </div>

                <div className="flex gap-3">
                  <button 
                      onClick={() => setShowAdminModal(false)} 
                      disabled={isLoggingIn}
                      className="flex-1 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white transition text-xs font-bold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                  >
                      Abort
                  </button>
                  <button 
                      onClick={handleLogin} 
                      disabled={isLoggingIn}
                      className="flex-1 flex justify-center items-center py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-xs font-bold tracking-wider border border-white/10 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                  >
                      {isLoggingIn ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        "Authorize"
                      )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✨ GLASS ADD FOLDER MODAL ✨ */}
        {showAddFolderModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="relative group w-full max-w-sm">
                <div className="relative bg-[#09090b]/60 backdrop-blur-2xl border border-white/10 p-6 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/20 rounded-br-sm"></div>
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/20 rounded-tl-sm"></div>

                    <button onClick={() => setShowAddFolderModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition"><X size={18}/></button>
                    
                    <h3 className="text-lg font-black mb-5 text-white flex items-center gap-2 uppercase tracking-wide">
                        <FolderPlus size={18} className="text-cyan-400/80"/> New Directory
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

                    <button onClick={() => setShowAddFileModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition"><X size={18}/></button>
                    
                    <h3 className="text-lg font-black mb-5 text-white flex items-center gap-2 uppercase tracking-wide">
                        <File size={18} className="text-fuchsia-400/80"/> Inject File
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

    </div>
  );
}