"use client";
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trash2, Plus, Upload, Lock, Unlock, FileText, Send, X, 
  ChevronRight, ChevronDown, Folder, Sparkles, MessageSquare, 
  Minimize2, Loader2, GraduationCap, Menu, Search, FolderPlus, 
  File, User, Lightbulb, Grid, Zap
} from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// --- CONFIGURATION ---
const SUPABASE_URL = "https://cgwhjwpqemlbpvspcqtc.supabase.co";
const SUPABASE_KEY = "***REMOVED_SUPABASE_KEY***";
const GEMINI_KEY = "AIzaSyAp1QqCnMv-at_o5Pkcr0npCcbw7Pl3Ezc";

// ✅ YOUR GOOGLE SCRIPT URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxrj2v6XKh2NarhriFbpvNIRSJyXo0k5T3LNiKDAkd16O7brwI52q7jXq5wfa5LORIo/exec"; 

// --- 👑 SUPREME ADMIN CONFIGURATION ---
const SUPREME_ADMIN_ID = "686432"; 

// --- 🛡️ SECURITY: VALID USERS LIST ---
const VALID_USERS = [
    { id: "686432", name: "Supreme Administrator" },
    { id: "B230304071", name: "MST. MAHBUBA KHATUN" },
    { id: "B230304072", name: "VABNA RANI" },
    { id: "B230304074", name: "UDAY KUMER BORMON" },
    { id: "B230304075", name: "SAKIBA ISLAM" },
    { id: "B230304076", name: "JANNATUL FERDUSI" },
    { id: "B230304077", name: "MD SADIDUR RAHMAN BHUIYA" },
    { id: "B230304078", name: "ANIKA TAHSIN RAHMAN" },
    { id: "B230304079", name: "MAHATHIR MOHAMMAD" },
    { id: "B230304080", name: "RUBAET FERDOUS NIBIR" },
    { id: "B230304081", name: "MD. FAHIM HOSSAIN" },
    { id: "B220304055", name: "TANJIA TABASSUM" },
    { id: "B230304001", name: "SHAITY BISWAS" },
    { id: "B230304024", name: "SADIA RAHMAN" },
    { id: "B230304038", name: "IMTIAZ KABIR SHAOWN" },
    { id: "B230304062", name: "SADIA SULTANA SORNALI" },
    { id: "B230304084", name: "SHAMIM" },
    { id: "B230304085", name: "JANNATUL FERDOUS RIA" },
    { id: "B240304001", name: "SADNAN SAMI" },
    { id: "B240304002", name: "HRITHIK KUMAR SUTRADAR" },
    { id: "B240304003", name: "EKBAL HASAN JIHAD" },
    { id: "B240304004", name: "MAJEDA KHATUN" },
    { id: "B240304005", name: "ARFANA TUN SINDA" },
    { id: "B240304006", name: "UMME HABIBA SYNTHEA" },
    { id: "B240304007", name: "AFRIN AKTER ANIKA" },
    { id: "B240304008", name: "MD. ABDUL OYADUD" },
    { id: "B240304009", name: "MIRZA ROHAN" },
    { id: "B240304010", name: "DHRUBO MANDOL" },
    { id: "B240304011", name: "MD KAMRUL HASAN" },
    { id: "B240304012", name: "SHANTA DAS" },
    { id: "B240304013", name: "SUSAMA SAHA" },
    { id: "B240304014", name: "FAIYAZ AHMED TUTUL" },
    { id: "B240304015", name: "MUNTASHIR RAHMAN ANANN" },
    { id: "B240304016", name: "MAHMUDUR RAHMAN MUZAHID" },
    { id: "B240304017", name: "MD. RISAT MIM" },
    { id: "B240304018", name: "LABIBA RAHMAN" },
    { id: "B240304019", name: "ONOY CHANDRA SAHA" },
    { id: "B240304020", name: "MD. MASUD RANA" },
    { id: "B240304021", name: "MD. PAVEL ANAM" },
    { id: "B240304022", name: "MOST. NAHIDA AKTHER SORNA" },
    { id: "B240304023", name: "MD. RIFAT HOSSAIN" },
    { id: "B240304024", name: "PALLAB DAS" },
    { id: "B240304025", name: "MUSKAN JAMIL" },
    { id: "B240304026", name: "MD. SHAHRIAR NAFIZ SHAON" },
    { id: "B240304027", name: "MD. TAMIM HOSSAIN MOLLA" },
    { id: "B240304028", name: "MEHEDI HASAN" },
    { id: "B240304029", name: "JISANUR RAHMAN TUFAN" },
    { id: "B240304030", name: "MD. MUNIF HOSSAIN" },
    { id: "B240304031", name: "MD. MUDACCHIR RAHMAN SAMIR" },
    { id: "B240304032", name: "MST MARJIA SULTANA" },
    { id: "B240304033", name: "ATIA SAIDA ONIMA" },
    { id: "B240304034", name: "SABIHA NISHAT" },
    { id: "B240304035", name: "MST. RISHAT TASFIA" },
    { id: "B240304036", name: "MD. HASIBUR RAHMAN" },
    { id: "B240304037", name: "FARHANA AFRIN" },
    { id: "B240304038", name: "MD. HABIB SHEIKH" },
    { id: "B240304039", name: "SAMIHA FAIROJ" },
    { id: "B240304040", name: "MD NASIR SHEIKH" },
    { id: "B240304041", name: "ARAFATUL ISLAM" },
    { id: "B240304042", name: "MD. ARIFUL ISLAM CHOWDHURY SUNMOON" },
    { id: "B240304043", name: "ANIMASH DEV NATH UZZAL" },
    { id: "B240304044", name: "MD. ARNOB" },
    { id: "B240304045", name: "MD. MINHAJUL ABEDIN SURKAR MINAR" },
    { id: "B240304046", name: "MD. RASHIBUR RAHMAN TIHAM" },
    { id: "B240304047", name: "MD. TANZIL ISLAM RAFI" },
    { id: "B240304048", name: "MD. MOKSHEDUL MOMIN" },
    { id: "B240304049", name: "MD. OBAYED HASAN" },
    { id: "B240304050", name: "SAROAR JAHAN" },
    { id: "B240304051", name: "TAHIA TASNIM" },
    { id: "B240304052", name: "MD. NIAMUL ISLAM SIAM" },
    { id: "B240304053", name: "SHAFAYET RAHMAN KHAN SHAFIN" },
    { id: "B240304054", name: "MD MAHIN ISLAM" },
    { id: "B240304055", name: "MASUMA AKTER LABONI" },
    { id: "B240304056", name: "KANIZ FATEMA" },
    { id: "B240304057", name: "MD. BOKHTIYER HABIB BIPLOB" },
    { id: "B240304058", name: "JUNAIDA AFROSE" },
    { id: "B240304059", name: "MD. AWAL" },
    { id: "B240304060", name: "RAISA AFRIN SARAH" },
    { id: "B240304061", name: "ASHIK AHMED" },
    { id: "B240304062", name: "AISHI MAZUMDER" },
    { id: "B240304063", name: "MITHILA MAMUN OISHE" },
    { id: "B240304064", name: "PARIJAT SAHA PREKSHA" },
    { id: "B240304065", name: "MD. AHNAF BHUIYAN TANZIM" },
    { id: "B240304066", name: "PROGGYA TAHSIN" },
    { id: "B240304067", name: "SUKANYA SAHA" },
    { id: "B240304068", name: "TAWSIN ISLAM" },
    { id: "B240304069", name: "MD. OHIDUL ISLAM" },
    { id: "B240304070", name: "FAIJA HABIB" },
    { id: "B240304071", name: "ABDUR RAHMAN" },
    { id: "B240304072", name: "SADIA AKTHER" },
    { id: "B240304073", name: "Α.Ν.M. AKRAMUZZAMAN" },
    { id: "B240304074", name: "GORGE ROY" },
    { id: "B240304075", name: "MD. ALIF AHMED SAJIB" },
    { id: "B240304076", name: "MD.SAMIULLAH BASIR" },
    { id: "B240304077", name: "S. M. ARIYAN ROKKAN" },
    { id: "B240304078", name: "ISRAT JAHAN LAMIΑ" },
    { id: "B240304079", name: "MD. SADIKUR RAHMAN" },
    { id: "B240304080", name: "AZMAN MAHTAB SHAFIN" },
    { id: "B240304081", name: "PROTAY BISWAS" },
    { id: "B240304082", name: "NOWSHIN FAREHA TIABA" }
];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
});

// ✅ HELPER: EXTRACT DRIVE THUMBNAIL
function getDriveThumbnail(url: string) {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
    }
    return null;
}

// ✅ NEW HELPER: Extract File ID for Deletion
function getFileIdFromUrl(url: string) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}

async function fileToGenerativePart(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise<{ inlineData: { data: string, mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const base64Content = base64data.split(',')[1];
      resolve({
        inlineData: {
          data: base64Content,
          mimeType: blob.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function Home() {
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  
  const [expandedYears, setExpandedYears] = useState<string[]>([]);
  const [expandedSemesters, setExpandedSemesters] = useState<string[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<{id: string, name: string} | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [loginIdInput, setLoginIdInput] = useState("");
  
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

  async function generateSuggestions(title: string) {
      setIsAiLoading(true);
      try {
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const prompt = `I am studying "${title}". Generate 3 short, curious questions I might ask a tutor. Return ONLY the questions separated by pipes (|).`;
          const result = await model.generateContent([prompt]);
          const response = await result.response;
          const questions = response.text().split('|').slice(0, 3);
          setSuggestedQuestions(questions);
      } catch (e) {
          console.error("Suggestion Error:", e);
          setSuggestedQuestions(["Summarize this", "Explain key concepts", "Quiz me"]);
      }
      setIsAiLoading(false);
  }

  async function fetchData() {
    const { data: folderData } = await supabase.from('folders').select('*').order('code', { ascending: true });
    if (folderData) setFolders(folderData);

    const { data: fileData } = await supabase.from('courses').select('*').order('created_at', { ascending: true });
    if (fileData) setFiles(fileData);
  }

  function handleLogin() {
    const user = VALID_USERS.find(u => u.id === loginIdInput);
    if (user) {
        setCurrentUser(user);
        setShowAdminModal(false);
        setLoginIdInput("");
    } else {
        alert("ID Access Denied.");
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

  async function handleAddFile() {
    if (!newFileTitle || !targetFolderCode) return alert("Fill all fields");
    if (!currentUser) return alert("You must be logged in!");

    let finalUrl = "";
    setIsUploading(true);

    try {
        if (inputType === "file") {
            if (!uploadFile) return alert("Select a file");
            
            const base64Content = await toBase64(uploadFile);
            
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify({ 
                    file: base64Content, 
                    filename: uploadFile.name, 
                    mimeType: uploadFile.type 
                })
            });
            
            const data = await response.json();
            if (!data.url) throw new Error("Upload Failed: " + (data.error || "Unknown Error"));
            finalUrl = data.url;

        } else {
            if (!driveLink) return alert("Enter a link");
            let cleanLink = driveLink;
            if (cleanLink.includes("drive.google.com") && !cleanLink.includes("/preview")) {
                cleanLink = cleanLink.replace(/\/view.*|\/edit.*/, '/preview');
            }
            finalUrl = cleanLink;
        }

        const { error: dbError } = await supabase.from('courses').insert({
          title: newFileTitle, 
          course_code: targetFolderCode, 
          category: targetCategory,
          year: targetYear, 
          semester: targetSemester, 
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
    } catch (error) {
        alert("Upload Error: " + error);
        console.error(error);
    }
    setIsUploading(false);
  }

  async function handleDeleteFile(file: any) {
    if (!confirm("Are you sure? This will delete the file from Google Drive and the website.")) return;
    
    // Permission Check
    if (currentUser?.id !== SUPREME_ADMIN_ID && file.uploader !== currentUser?.name) {
        return alert("Permission Denied: You can only delete files you uploaded.");
    }

    // 1. DELETE FROM GOOGLE DRIVE (Using Apps Script)
    const fileId = getFileIdFromUrl(file.pdf_url);
    if (fileId) {
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify({ 
                    action: "delete", 
                    fileId: fileId 
                })
            });
        } catch (err) {
            console.error("Drive Deletion Error (Continuing to DB delete):", err);
        }
    }

    // 2. DELETE FROM SUPABASE
    await supabase.from('courses').delete().eq('id', file.id);
    fetchData();
    if (selectedFile?.id === file.id) setSelectedFile(null);
  }

  async function handleChat(overrideInput?: string) {
    const messageToSend = overrideInput || chatInput;
    if (!messageToSend) return;
    
    setChatInput("");
    setChatHistory(prev => [...prev, { role: "user", text: messageToSend }]);
    setIsAiLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      let parts: any[] = [{ text: messageToSend }];
      
      if (selectedFile?.pdf_url && selectedFile.pdf_url.toLowerCase().endsWith('.pdf')) {
         try {
             const pdfPart = await fileToGenerativePart(selectedFile.pdf_url);
             parts = [
                { text: `You are an expert professor teaching ${selectedFile.title}. Answer clearly. If using math, use LaTeX format (e.g., $x^2$).` },
                pdfPart,
                { text: messageToSend }
             ];
         } catch (e) {
             console.log("PDF Error", e);
             parts = [{ text: `I cannot read this file directly. Question: ${messageToSend}` }];
         }
      } else {
         parts = [{ text: `Context: ${selectedFile?.title}. Question: ${messageToSend}` }];
      }

      const result = await model.generateContent(parts);
      const response = await result.response;
      setChatHistory(prev => [...prev, { role: "bot", text: response.text() }]);
    } catch (error) {
      console.error("AI Error:", error);
      setChatHistory(prev => [...prev, { role: "bot", text: "⚠️ AI Error. Try again." }]);
    }
    setIsAiLoading(false);
  }

  const toggleState = (setter: any, val: string) => {
    setter((prev: string[]) => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
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
    <div className="flex h-screen bg-[#09090b] text-gray-100 font-sans overflow-hidden">
      <AnimatePresence>
        {isMobileMenuOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}/>
        )}
      </AnimatePresence>

      <motion.div className={`fixed md:relative inset-y-0 left-0 w-80 bg-[#121212] border-r border-white/10 flex flex-col z-50 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-5 border-b border-white/10 flex flex-col gap-4 bg-[#18181b]">
          <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <GraduationCap size={18} className="text-white" />
                </div>
                <h1 className="text-lg font-bold text-white tracking-wide">Notes</h1>
              </div>
              <button className="md:hidden text-gray-400" onClick={() => setIsMobileMenuOpen(false)}><X size={20}/></button>
          </div>
          
          <div className="relative group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors"/>
              <input className="w-full bg-[#27272a] text-xs text-white pl-9 pr-3 py-2.5 rounded-lg outline-none border border-white/5 focus:border-indigo-500/50 focus:bg-[#1f1f22] transition-all placeholder-gray-500" placeholder="Search files..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}/>
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

      <div className="flex-1 flex flex-col relative bg-[#09090b]">
        <div className="md:hidden h-14 border-b border-white/10 flex items-center px-4 justify-between bg-[#121212]">
            <span className="font-bold text-white">Notes</span>
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-300"><Menu size={24}/></button>
        </div>

        {selectedFile ? (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-0 md:p-4 gap-4 relative">
                <motion.div layout className="flex-1 bg-[#121212] md:rounded-2xl border-x md:border border-white/10 overflow-hidden shadow-2xl relative flex flex-col">
                   <div className="h-14 bg-[#18181b] border-b border-white/10 flex items-center justify-between px-4">
                      <div className="flex flex-col overflow-hidden">
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
                                    
                                    {/* 💥 QUOTA SAVER BUTTON 💥 */}
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
            <div className="flex-1 flex flex-col bg-[#09090b]">
               <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                   {dashboardFiles.length > 0 ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                           {dashboardFiles.map((file) => {
                               const thumb = getDriveThumbnail(file.pdf_url);
                               return (
                                   <div key={file.id} className="group bg-[#18181b] border border-white/5 hover:border-indigo-500/30 p-4 rounded-xl transition-all hover:shadow-2xl hover:shadow-indigo-900/10 flex flex-col gap-3 relative cursor-pointer overflow-hidden" onClick={() => setSelectedFile(file)}>
                                       
                                       {/* 📄 NEW THUMBNAIL LOGIC */}
                                       <div className="h-40 bg-[#121212] rounded-lg mb-1 overflow-hidden relative border border-white/5">
                                           {thumb ? (
                                               <img 
                                                   src={thumb} 
                                                   className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                                                   alt="preview"
                                                   loading="lazy"
                                               />
                                           ) : (
                                               <div className="w-full h-full flex items-center justify-center bg-[#1a1a1e]">
                                                   <FileText size={32} className="text-gray-600"/>
                                               </div>
                                           )}
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
                               );
                           })}
                       </div>
                   ) : (
                       <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4 opacity-50"><Grid size={48} className="text-indigo-900"/><p>No notes found. Upload some!</p></div>
                   )}
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

                    <button onClick={handleAddFile} disabled={isUploading} className="w-full bg-indigo-600 py-3 rounded-lg text-white text-sm font-bold">
                        {isUploading ? "Uploading..." : "Save File"}
                    </button>
                </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}