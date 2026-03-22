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
                <FileText size={32} className="text-gray-600"/>
            </div>
        );
    }

    return (
        <img
            src={imgSrc}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
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
  const [currentUser, setCurrentUser] = useState<{id: string, name: string, role?: string} | null>(null); // <-- Update THIS one
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [loginIdInput, setLoginIdInput] = useState("");
  
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
        setChatHistory(prev => [...prev, { role: "bot", text: "⚠️ Server Error. Please try again." }]);
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
            alert("Access Denied: Invalid ID");
        }
    } catch (error) {
        console.error("Login Error:", error);
        alert("Login failed due to server error.");
    }
  }

  function handleLogout() {
      if(confirm("Logout?")) setCurrentUser(null);
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

// --- 📂 FILE UPLOAD LOGIC (FIXED) ---
  async function handleAddFile() {
    if (!newFileTitle || !targetFolderCode) return alert("Fill all fields");
    if (!currentUser) return alert("You must be logged in!");

    // 🔍 FIX: Find the correct folder details based on the selected code
    const selectedFolder = folders.find(f => f.code === targetFolderCode);
    if (!selectedFolder) return alert("Invalid Folder Selected");

    // Use the folder's year/semester, NOT the default state values
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
                    console.warn("XHR Error detected (likely CORS). Proceeding to verification...");
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

        // 📝 FIX: Use finalYear and finalSemester here
        const { error: dbError } = await supabase.from('courses').insert({
          title: newFileTitle,
          course_code: targetFolderCode,
          category: targetCategory,
          year: finalYear,           // <--- CHANGED THIS
          semester: finalSemester,   // <--- CHANGED THIS
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
    if (!confirm("Are you sure? This will delete the file from Google Drive and the website.")) return;
    
    // 👇 NEW SECURITY CHECK: Rely on the role assigned by the backend
    if (currentUser?.role !== 'admin' && file.uploader !== currentUser?.name) {
        return alert("Permission Denied: You can only delete files you uploaded.");
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
    <div className="flex h-[100dvh] bg-[#09090b] text-gray-100 font-sans overflow-hidden">
      <AnimatePresence>
        {isMobileMenuOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}/>
        )}
      </AnimatePresence>

      <motion.div className={`fixed md:relative inset-y-0 left-0 w-80 bg-[#121212] border-r border-white/10 flex flex-col z-50 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-5 border-b border-white/10 flex flex-col gap-4 bg-[#18181b]">
          <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 cursor-pointer" onClick={handleGoHome}>
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <GraduationCap size={18} className="text-white" />
                </div>
                <h1 className="text-lg font-bold text-white tracking-wide">Notes</h1>
              </div>
              <button className="md:hidden text-gray-400" onClick={() => setIsMobileMenuOpen(false)}><X size={20}/></button>
          </div>
          
          <div className="flex gap-2">
            <button onClick={handleGoHome} className="p-2.5 bg-[#27272a] hover:bg-[#3f3f46] rounded-lg text-gray-400 hover:text-white transition border border-white/5">
                <HomeIcon size={16} />
            </button>
            
            <div className="relative group flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors"/>
                <input className="w-full bg-[#27272a] text-xs text-white pl-9 pr-3 py-2.5 rounded-lg outline-none border border-white/5 focus:border-indigo-500/50 focus:bg-[#1f1f22] transition-all placeholder-gray-500" placeholder="Search files..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}/>
            </div>
          </div>

          {currentUser && (
              <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 p-2 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                      {currentUser.name.charAt(0)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                      <p className="text-xs text-gray-400">Logged in as</p>
                      <p className="text-sm font-bold text-indigo-300 truncate">{currentUser.name}</p>
                  </div>
              </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {structure.map((yData) => (
            <div key={yData.year}>
              <button onClick={() => toggleState(setExpandedYears, yData.year)} className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg text-sm font-semibold transition-all group">
                {expandedYears.includes(yData.year) ? <ChevronDown size={14} className="text-gray-500"/> : <ChevronRight size={14} className="text-gray-500"/>}
                <Folder size={14} className="text-indigo-400 fill-indigo-400/10" />
                <span className="text-gray-300 group-hover:text-white">{yData.year}</span>
              </button>

              <AnimatePresence>
                {expandedYears.includes(yData.year) && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden ml-3 pl-3 border-l border-white/10">
                    {yData.semesters.map((sData) => (
                      <div key={sData.sem}>
                        <button onClick={() => toggleState(setExpandedSemesters, `${yData.year}-${sData.sem}`)} className="w-full flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg text-xs text-gray-400 mt-1">
                           {expandedSemesters.includes(`${yData.year}-${sData.sem}`) ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                           {sData.sem}
                        </button>

                        {expandedSemesters.includes(`${yData.year}-${sData.sem}`) && (
                          <div className="ml-4 mt-1 space-y-1">
                             {sData.folders.length === 0 && <div className="text-[10px] text-gray-600 pl-2">No Courses</div>}
                             {sData.folders.map(folder => (
                                 <div key={folder.id}>
                                     <button onClick={() => toggleState(setExpandedCourses, folder.code)} className="w-full flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg text-xs text-gray-300 bg-[#1e1e22] border border-white/5">
                                          {expandedCourses.includes(folder.code) ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                                          <span className="font-bold text-indigo-300">{folder.code}</span>
                                     </button>
                                     
                                     {expandedCourses.includes(folder.code) && (
                                         <div className="ml-3 pl-2 border-l border-indigo-500/20 mt-1 space-y-1">
                                              {CATEGORIES.map(cat => {
                                                  const catFiles = files.filter(f => f.course_code === folder.code && f.category === cat && f.title.toLowerCase().includes(searchTerm));
                                                  const catKey = `${folder.code}-${cat}`;
                                                  return (
                                                     <div key={cat}>
                                                         <button onClick={() => toggleState(setExpandedCategories, catKey)} className="w-full flex items-center gap-2 p-1.5 hover:bg-white/5 rounded text-[11px] text-gray-400">
                                                             {expandedCategories.includes(catKey) ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
                                                             {cat}
                                                             <span className="ml-auto text-[9px] bg-white/10 px-1 rounded">{catFiles.length}</span>
                                                         </button>
                                                         {expandedCategories.includes(catKey) && (
                                                             <div className="ml-4 space-y-1 mt-1">
                                                                 {catFiles.length === 0 && <div className="text-[10px] text-gray-700 italic px-2">Empty</div>}
                                                                 {catFiles.map(file => (
                                                                     <div key={file.id} className="relative group">
                                                                         <button onClick={() => { setSelectedFile(file); setIsMobileMenuOpen(false); }} className={`w-full text-left flex items-center gap-2 p-2 rounded text-[11px] border border-transparent ${selectedFile?.id === file.id ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-white/5 text-gray-400 border-white/5 bg-[#000000]'}`}>
                                                                                 <FileText size={12}/> <span className="truncate">{file.title}</span>
                                                                         </button>
                                                                         {currentUser && (
                                                                            <button onClick={() => handleDeleteFile(file)} className="absolute right-1 top-1.5 p-1 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded">
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

        <div className="p-4 border-t border-white/10 bg-[#0e0e0e] flex gap-2">
            <button onClick={() => currentUser ? handleLogout() : setShowAdminModal(true)} className={`p-2 rounded-lg transition ${currentUser ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-white bg-white/5'}`}>
                {currentUser ? <Lock size={16}/> : <Unlock size={16}/>}
            </button>
            {currentUser && (
                <div className="flex-1 flex gap-2">
                    <button onClick={() => setShowAddFolderModal(true)} className="flex-1 bg-white/10 hover:bg-white/20 text-indigo-300 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold border border-white/5"><FolderPlus size={14}/> Folder</button>
                    <button onClick={() => setShowAddFileModal(true)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold shadow-lg shadow-indigo-900/40"><Plus size={14}/> File</button>
                </div>
            )}
        </div>
      </motion.div>

      {/* 🟢 SCROLL FIX APPLIED HERE (w-full, max-w-full, overflow-hidden) */}
      <div className="flex-1 flex flex-col relative bg-[#09090b] w-full max-w-full overflow-hidden">
        {!selectedFile && (
            <div className="md:hidden h-14 border-b border-white/10 flex items-center px-4 justify-between bg-[#121212] shrink-0">
                <span className="font-bold text-white">Notes</span>
                <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-300"><Menu size={24}/></button>
            </div>
        )}

        {selectedFile ? (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-0 md:p-4 gap-4 relative">
                <motion.div layout className="flex-1 bg-[#121212] md:rounded-2xl border-x md:border border-white/10 overflow-hidden shadow-2xl relative flex flex-col">
                   <div className="h-14 bg-[#18181b] border-b border-white/10 flex items-center justify-between px-4 gap-2">
                      <button onClick={handleGoHome} className="md:hidden mr-2 text-gray-400 hover:text-white">
                        <HomeIcon size={20} />
                      </button>
                      <div className="flex flex-col overflow-hidden flex-1">
                          <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 whitespace-nowrap">{selectedFile.category}</span>
                              <span className="text-[10px] text-gray-500 flex items-center gap-1"><User size={10}/> {selectedFile.uploader || "Unknown"}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-200 truncate mt-1">{selectedFile.title}</span>
                      </div>
                      <a href={selectedFile.pdf_url} target="_blank" className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap ml-2 border border-blue-500/30 px-3 py-1.5 rounded-lg hover:bg-blue-500/10">Open</a>
                   </div>
                   <iframe src={selectedFile.pdf_url} className="flex-1 w-full bg-[#0e0e0e]" title="Preview" />
                   
                   <button onClick={() => setIsAiOpen(!isAiOpen)} className="absolute bottom-6 right-6 bg-indigo-600 hover:bg-indigo-500 p-3 rounded-full text-white shadow-xl shadow-indigo-900/30 transition z-10 flex items-center justify-center">
                      {isAiOpen ? <ChevronRight size={20} /> : <MessageSquare size={20} />}
                   </button>
                </motion.div>
                
                <AnimatePresence mode='popLayout'>
                    {isAiOpen && (
                        <motion.div initial={{ width: 0, opacity: 0, x: 50 }} animate={{ width: 350, opacity: 1, x: 0 }} exit={{ width: 0, opacity: 0, x: 50 }} className="fixed md:relative inset-y-0 right-0 z-30 w-full md:w-[350px] bg-[#121212] border-l border-white/10 flex flex-col md:rounded-2xl md:border border-white/10 overflow-hidden shadow-2xl">
                           <div className="p-4 border-b border-white/10 bg-[#18181b] flex justify-between items-center">
                              <div className="flex items-center gap-2"><Sparkles size={16} className="text-indigo-400" /><span className="text-sm font-bold text-gray-200">AI Tutor</span></div>
                              <button onClick={() => setIsAiOpen(false)} className="text-gray-500 hover:text-white"><Minimize2 size={14}/></button>
                           </div>
                           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#09090b] flex flex-col" ref={chatScrollRef}>
                              {chatHistory.length === 0 && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 p-4">
                                    <div className="w-16 h-16 bg-indigo-600/10 rounded-full flex items-center justify-center mb-4">
                                        <Sparkles size={32} className="text-indigo-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">Ready to Help!</h3>
                                    <p className="text-xs text-gray-400 mb-6">I have read <b>{selectedFile.title}</b>. Ask me anything or click a suggestion below.</p>
                                    
                                    {suggestedQuestions.length === 0 ? (
                                        <div className="mt-4">
                                            <button
                                                onClick={() => generateSuggestions(selectedFile.title)}
                                                disabled={isAiLoading}
                                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-500/20"
                                            >
                                                {isAiLoading ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                                                Generate Suggestions
                                            </button>
                                            <p className="text-[10px] text-gray-500 mt-2">Click to generate AI questions (Saves Quota)</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2 w-full">
                                            {suggestedQuestions.map((q, i) => (
                                                <button key={i} onClick={() => handleChat(q)} className="text-left text-xs bg-[#1e1e22] hover:bg-[#27272a] text-indigo-300 p-3 rounded-xl border border-white/5 transition flex items-center gap-2 group">
                                                    <Lightbulb size={14} className="text-yellow-500/50 group-hover:text-yellow-500 transition"/> {q}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                              )}
                              {chatHistory.map((msg, i) => (
                                 <div key={i} className={`mb-4 p-3 rounded-2xl text-sm leading-relaxed max-w-[90%] ${msg.role === 'user' ? 'bg-indigo-600 text-white ml-auto rounded-br-none' : 'bg-[#1e1e22] text-gray-200 mr-auto border border-white/5 rounded-bl-none'}`}>
                                    <div className="prose prose-invert max-w-none text-sm break-words">
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={{ p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />, a: ({node, ...props}) => <a className="text-blue-400 hover:underline" {...props} /> }}>{msg.text}</ReactMarkdown>
                                    </div>
                                 </div>
                              ))}
                              {isAiLoading && <div className="flex items-center gap-2 text-xs text-gray-500 pl-2 mb-4"><Loader2 size={12} className="animate-spin text-indigo-500" /> Thinking...</div>}
                           </div>
                           <div className="p-3 border-t border-white/10 bg-[#18181b]">
                              <div className="flex items-center gap-2 bg-[#09090b] border border-white/10 rounded-xl px-2 py-1"><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChat()} placeholder="Ask AI..." className="flex-1 bg-transparent border-none text-sm text-white p-2 outline-none"/><button onClick={() => handleChat()} className="bg-indigo-600 p-2 rounded-lg text-white hover:bg-indigo-500 transition"><Send size={16}/></button></div>
                           </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        ) : (
            // 🟢 FIXED: Added min-h-0 and overflow-hidden here to force scroll, added flex-col to parent
            <div className="flex-1 flex flex-col bg-[#09090b] overflow-hidden min-h-0">
               <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar flex flex-col">
                   {dashboardFiles.length > 0 ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                           {dashboardFiles.map((file) => (
                               <div key={file.id} className="group bg-[#18181b] border border-white/5 hover:border-indigo-500/30 p-4 rounded-xl transition-all hover:shadow-2xl hover:shadow-indigo-900/10 flex flex-col gap-3 relative cursor-pointer overflow-hidden" onClick={() => setSelectedFile(file)}>
                                       
                                       <div className="h-40 bg-[#121212] rounded-lg mb-1 overflow-hidden relative border border-white/5">
                                           <FileThumbnail url={file.pdf_url} fileTitle={file.title} />
                                           <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-transparent to-transparent" />
                                           <div className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-md backdrop-blur-md border border-white/10 shadow-lg"><FileText size={14} className="text-indigo-400"/></div>
                                       </div>

                                       <div className="flex items-start justify-between">
                                           <div className="flex-1 min-w-0">
                                               <h3 className="font-semibold text-gray-200 text-sm truncate">{file.title}</h3>
                                               <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><User size={10} /> {file.uploader || "Unknown"}</p>
                                           </div>
                                           {currentUser && (
                                               <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(file); }} className="text-gray-600 hover:text-red-400 transition p-1 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                           )}
                                       </div>
                                       <div className="flex items-center gap-2 mt-auto">
                                           <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-1 rounded border border-white/5 truncate max-w-[50%]">{file.course_code}</span>
                                           <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-1 rounded border border-white/5 truncate max-w-[50%]">{file.category}</span>
                                       </div>
                               </div>
                           ))}
                       </div>
                   ) : (
                       <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4 opacity-50 mb-8"><Grid size={48} className="text-indigo-900"/><p>No notes found. Upload some!</p></div>
                   )}
{/* ✨ VISUALLY INTERESTING FUTURISTIC FOOTER ✨ */}
<div className="mt-auto pt-8 pb-4 w-full flex justify-center items-center">
     <div className="relative group cursor-default">
         {/* Neon glowing backdrop */}
         <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-600 to-fuchsia-500 rounded-xl blur-md opacity-30 group-hover:opacity-60 transition duration-700 animate-pulse"></div>
         
         {/* Inner Cyberpunk Badge */}
         <div className="relative flex flex-col items-center justify-center gap-1.5 px-8 py-3 bg-[#09090b]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden">
             {/* Top subtle scanline/laser effect */}
             <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
             
             <span className="text-[9px] font-mono tracking-[0.4em] text-cyan-400/80 uppercase">
                 Developed By
             </span>
             
             <div className="flex items-center gap-3">
                 <Sparkles size={12} className="text-fuchsia-400 animate-pulse" />
                 <span className="text-sm font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 uppercase">
                     MUNIF <span className="text-white/40 lowercase mx-0.5 font-light">x</span> VIBE CODING
                 </span>
                 <Sparkles size={12} className="text-cyan-400 animate-pulse" />
             </div>
             
             {/* Tech corner accents */}
             <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-cyan-500/50 rounded-br-sm"></div>
             <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-fuchsia-500/50 rounded-tl-sm"></div>
         </div>
     </div>
</div>

               </div>
            </div>
        )}
      </div>

      <AnimatePresence>
        {showAdminModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center">
            <div className="bg-[#18181b] border border-white/10 p-8 rounded-2xl w-80 text-center">
              <h3 className="text-white font-bold mb-4">Admin Login</h3>
              <input type="text" placeholder="Your ID" className="w-full bg-black/50 border border-white/10 p-3 rounded-xl mb-4 text-center text-white tracking-[0.2em] outline-none focus:border-indigo-500 transition" value={loginIdInput} onChange={(e) => setLoginIdInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()}/>
              <div className="flex gap-2"><button onClick={() => setShowAdminModal(false)} className="flex-1 py-2 rounded-lg bg-white/5 text-gray-400 text-xs">Cancel</button><button onClick={handleLogin} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold">Login</button></div>
            </div>
          </div>
        )}

        {showAddFolderModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-[#18181b] border border-white/10 p-6 rounded-2xl w-full max-w-sm relative">
                <button onClick={() => setShowAddFolderModal(false)} className="absolute top-4 right-4 text-gray-500"><X size={18}/></button>
                <h3 className="text-lg font-bold mb-4 text-white flex gap-2"><FolderPlus size={18} className="text-indigo-400"/> New Course Folder</h3>
                <div className="space-y-3">
                    <input className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white outline-none" placeholder="Course Code (e.g. STA 1201)" value={newFolderCode} onChange={(e) => setNewFolderCode(e.target.value)} />
                    <div className="flex gap-2">
                        <select className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-gray-300 outline-none" value={targetYear} onChange={(e) => setTargetYear(e.target.value)}>{["Year 1", "Year 2", "Year 3", "Year 4"].map(y => <option key={y}>{y}</option>)}</select>
                        <select className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-gray-300 outline-none" value={targetSemester} onChange={(e) => setTargetSemester(e.target.value)}>{["Semester 1", "Semester 2"].map(s => <option key={s}>{s}</option>)}</select>
                    </div>
                    <button onClick={handleCreateFolder} className="w-full bg-indigo-600 py-3 rounded-lg text-white text-sm font-bold">Create Folder</button>
                </div>
            </div>
          </div>
        )}

        {showAddFileModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-[#18181b] border border-white/10 p-6 rounded-2xl w-full max-w-sm relative">
                <button onClick={() => setShowAddFileModal(false)} className="absolute top-4 right-4 text-gray-500"><X size={18}/></button>
                <h3 className="text-lg font-bold mb-4 text-white flex gap-2"><File size={18} className="text-indigo-400"/> Add File</h3>
                <div className="space-y-3">
                    <select className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white outline-none" value={targetFolderCode} onChange={(e) => setTargetFolderCode(e.target.value)}>
                        <option value="">Select Course Folder</option>
                        {folders.map(f => <option key={f.id} value={f.code}>{f.code} ({f.year})</option>)}
                    </select>
                    <select className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white outline-none" value={targetCategory} onChange={(e) => setTargetCategory(e.target.value)}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white outline-none" placeholder="File Title" value={newFileTitle} onChange={(e) => setNewFileTitle(e.target.value)} />
                    
                    <div className="flex bg-black/50 p-1 rounded-lg border border-white/5">
                        <button onClick={() => setInputType("file")} className={`flex-1 text-xs py-2 rounded-md ${inputType === "file" ? "bg-white/10 text-white" : "text-gray-500"}`}>Upload</button>
                        <button onClick={() => setInputType("link")} className={`flex-1 text-xs py-2 rounded-md ${inputType === "link" ? "bg-white/10 text-white" : "text-gray-500"}`}>Link</button>
                    </div>

                    {inputType === "file" ? (
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition group">
                                <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-white">
                                    <Upload size={20} />
                                    <span className="text-xs font-medium">Click to Choose File</span>
                                </div>
                                <input
                                    key="file-input"
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                                />
                            </label>
                            {uploadFile && (
                                <div className="text-xs text-center text-indigo-400 bg-indigo-500/10 py-1 px-2 rounded truncate border border-indigo-500/20">
                                    Selected: {uploadFile.name}
                                </div>
                            )}
                        </div>
                    ) : (
                        <input
                            key="link-input"
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white outline-none"
                            placeholder="Paste Link"
                            value={driveLink || ""}
                            onChange={(e) => setDriveLink(e.target.value)}
                        />
                    )}
                    
                    {isUploading && (
                        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                             <div className="bg-indigo-500 h-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                    )}

                    <button onClick={handleAddFile} disabled={isUploading} className="w-full bg-indigo-600 py-3 rounded-lg text-white text-sm font-bold disabled:bg-indigo-600/50 disabled:cursor-not-allowed">
                        {isUploading ? `${Math.round(uploadProgress)}%` : "Save File"}
                    </button>
                </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}