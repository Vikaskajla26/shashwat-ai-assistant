import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, FileText, Upload, Sparkles, BookOpen, Brain, Download, Trash2,
  CheckCircle2, Search, Layers, RefreshCw, HelpCircle, ArrowRight,
  GraduationCap, Plus, Folder, Calendar, Clock, Award, Bookmark, Shuffle,
  Volume2, Play, Pause, RotateCcw, PenTool, GitFork, BarChart3, Target,
  MessageSquare, UserCheck, Flame, Check, ChevronRight, FileCode, Sliders
} from 'lucide-react';
import { DocumentMeta, KnowledgeQueryResult, StudyMaterials } from '../../../server/docIntel/types';

interface StudyStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage?: (text: string) => void;
}

interface Workspace {
  id: string;
  name: string;
  icon: string;
  docCount: number;
  createdAt: string;
}

export const StudyStudioModal: React.FC<StudyStudioModalProps> = ({
  isOpen,
  onClose,
  onSendMessage,
}) => {
  // Workspaces State
  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    { id: 'anatomy', name: 'Anatomy & Histology', icon: '🧬', docCount: 4, createdAt: '2026-07-20' },
    { id: 'physiology', name: 'Physiology & Neuro', icon: '🧠', docCount: 3, createdAt: '2026-07-22' },
    { id: 'dravyaguna', name: 'Dravyaguna & Herbal AI', icon: '🌿', docCount: 5, createdAt: '2026-07-24' },
    { id: 'pharmacology', name: 'Pharmacology & Drugs', icon: '💊', docCount: 2, createdAt: '2026-07-25' },
    { id: 'research', name: 'Research & Thesis', icon: '🔬', docCount: 6, createdAt: '2026-07-26' },
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('anatomy');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  // Active Tool Tab
  const [activeTab, setActiveTab] = useState<
    'materials' | 'notes' | 'handwritten' | 'flashcards' | 'quiz' | 'viva' | 'mindmap' | 'pomodoro' | 'analytics'
  >('materials');

  // Documents & Processing
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // PDF Chat & Semantic Search
  const [searchQuery, setSearchQuery] = useState('');
  const [queryResult, setQueryResult] = useState<KnowledgeQueryResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Study Generator
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterials | null>(null);
  const [isGeneratingStudy, setIsGeneratingStudy] = useState(false);

  // Handwritten Notebook Generator State
  const [inkColor, setInkColor] = useState<'blue' | 'black' | 'green' | 'red'>('blue');
  const [paperStyle, setPaperStyle] = useState<'ruled' | 'blank' | 'graph' | 'medical'>('ruled');
  const [handwritingStyle, setHandwritingStyle] = useState<'cursive' | 'script' | 'student'>('cursive');
  const [handwrittenTitle, setHandwrittenTitle] = useState('Anatomy Notes - Neurovascular System');

  // Flashcards State
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [bookmarkedCards, setBookmarkedCards] = useState<Set<number>>(new Set());

  // Quiz Mode State
  const [mcqAnswers, setMcqAnswers] = useState<{ [id: string]: number }>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [quizLength, setQuizLength] = useState<10 | 20 | 50>(10);

  // Viva AI Examiner State
  const [vivaMessages, setVivaMessages] = useState<Array<{ sender: 'examiner' | 'user'; text: string; score?: number }>>([
    {
      sender: 'examiner',
      text: 'Welcome to your Viva Examination on Anatomy & Histology. Let us begin: Can you describe the primary origin and clinical course of the Sciatic Nerve?',
    },
  ]);
  const [vivaInput, setVivaInput] = useState('');
  const [vivaPersona, setVivaPersona] = useState<'Friendly Teacher' | 'Strict Professor' | 'Exam Coach' | 'Medical Faculty'>('Medical Faculty');

  // Pomodoro Timer State
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState<'focus' | 'break'>('focus');
  const [pomodoroSessions, setPomodoroSessions] = useState(3);

  // Study Streak & Analytics
  const [studyStreak, setStudyStreak] = useState(7);
  const [hoursStudied, setHoursStudied] = useState(14.5);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen]);

  // Pomodoro countdown timer
  useEffect(() => {
    let timer: any = null;
    if (isPomodoroRunning && pomodoroSeconds > 0) {
      timer = setInterval(() => {
        setPomodoroSeconds((prev) => prev - 1);
      }, 1000);
    } else if (pomodoroSeconds === 0) {
      if (pomodoroMode === 'focus') {
        setPomodoroMode('break');
        setPomodoroSeconds(5 * 60);
        setPomodoroSessions((s) => s + 1);
      } else {
        setPomodoroMode('focus');
        setPomodoroSeconds(25 * 60);
      }
      setIsPomodoroRunning(false);
    }
    return () => clearInterval(timer);
  }, [isPomodoroRunning, pomodoroSeconds, pomodoroMode]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents || []);
        if (data.documents && data.documents.length > 0 && !selectedDocId) {
          setSelectedDocId(data.documents[0].id);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch documents from server');
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(20);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(40 + (i / files.length) * 40);

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || result);
          };
          reader.readAsDataURL(file);
        });

        const base64 = await base64Promise;
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, mimeType: file.type, base64 }),
        });
        const data = await res.json();

        if (data.success) {
          setDocuments((prev) => [data.document, ...prev]);
          setSelectedDocId(data.document.id);
        }
      }
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (err) {
      console.error('File upload error:', err);
      setIsUploading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/knowledge/query?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setQueryResult(data.result);
      }
    } catch (err) {
      console.error('Knowledge query error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateStudyMaterials = async () => {
    if (!selectedDocId) return;
    setIsGeneratingStudy(true);
    try {
      const res = await fetch(`/api/documents/${selectedDocId}/study`);
      const data = await res.json();
      if (data.success) {
        setStudyMaterials(data.studyMaterials);
        setFlashcardIdx(0);
        setIsFlipped(false);
        setMcqAnswers({});
        setQuizScore(null);
      }
    } catch (err) {
      console.error('Study generation error:', err);
    } finally {
      setIsGeneratingStudy(false);
    }
  };

  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) return;
    const newWs: Workspace = {
      id: `ws_${Date.now()}`,
      name: newWorkspaceName.trim(),
      icon: '📚',
      docCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setWorkspaces([newWs, ...workspaces]);
    setActiveWorkspaceId(newWs.id);
    setNewWorkspaceName('');
    setIsCreatingWorkspace(false);
  };

  const handleSendVivaAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vivaInput.trim()) return;

    const userMsg = vivaInput.trim();
    setVivaInput('');
    setVivaMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);

    setTimeout(() => {
      const score = Math.floor(Math.random() * 25) + 75; // 75-100% score
      const examinerResponses = [
        `Excellent response! You correctly identified the origin (L4-S3 nerve roots). Score: ${score}%. Next question: What are the main cutaneous branches of the nerve?`,
        `Good explanation. You scored ${score}%. Can you now relate the anatomical course to Sciatica compression syndrome?`,
        `Accurate clinical reasoning. Score: ${score}%. Moving to histology: What distinguishes nerve fascicles under high magnification?`,
      ];
      const nextResponse = examinerResponses[Math.floor(Math.random() * examinerResponses.length)];
      setVivaMessages((prev) => [...prev, { sender: 'examiner', text: nextResponse, score }]);
    }, 1000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-3xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-7xl h-[90vh] flex flex-col rounded-3xl bg-[#05070D]/90 border border-white/14 shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden text-slate-100"
        >
          {/* TOP HEADER BAR */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-[#4FC3F7]/20 to-[#9B5DE5]/20 border border-[#4FC3F7]/30 text-[#4FC3F7] shadow-[0_0_20px_rgba(79,195,247,0.3)]">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-sans tracking-wide text-white flex items-center gap-2">
                  🎓 Study Studio
                  <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-mono tracking-widest bg-[#4FC3F7]/15 border border-[#4FC3F7]/40 text-[#4FC3F7]">
                    Pro Learning Ecosystem
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 font-sans">Learn Smarter with शाश्वत AI Professor</p>
              </div>
            </div>

            {/* WORKSPACE SELECTOR & ACTIONS */}
            <div className="flex items-center gap-3">
              {/* Workspace Selector Dropdown */}
              <div className="relative flex items-center gap-2">
                <select
                  value={activeWorkspaceId}
                  onChange={(e) => setActiveWorkspaceId(e.target.value)}
                  className="bg-white/5 border border-white/14 focus:border-[#4FC3F7]/60 text-white text-xs rounded-xl px-3 py-2 outline-none font-sans cursor-pointer"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id} className="bg-slate-900 text-white">
                      {ws.icon} {ws.name} ({ws.docCount} docs)
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setIsCreatingWorkspace(true)}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#4FC3F7]/50 hover:bg-[#4FC3F7]/15 text-zinc-300 hover:text-[#4FC3F7] transition-all cursor-pointer"
                  title="Create New Workspace"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Upload Action */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-[#4FC3F7] text-slate-950 hover:bg-[#4FC3F7]/90 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(79,195,247,0.4)]"
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />

              {/* Close Workspace Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* NEW WORKSPACE CREATION MODAL */}
          {isCreatingWorkspace && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-white/14 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-2">Create Study Workspace</h3>
                <p className="text-xs text-zinc-400 mb-4">Organize your subjects, assignments, and study materials into a dedicated AI memory environment.</p>
                <input
                  type="text"
                  placeholder="e.g. Pathology Semester 2"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full bg-white/5 border border-white/14 text-white text-sm px-4 py-2.5 rounded-xl outline-none mb-4 focus:border-[#4FC3F7]"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsCreatingWorkspace(false)}
                    className="px-4 py-2 text-xs rounded-xl bg-white/5 text-zinc-300 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateWorkspace}
                    className="px-4 py-2 text-xs rounded-xl bg-[#4FC3F7] text-slate-950 font-bold hover:bg-[#4FC3F7]/90"
                  >
                    Create Workspace
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TOOL TABS NAVIGATION */}
          <nav className="flex items-center gap-1.5 px-6 py-2 border-b border-white/10 bg-white/[0.02] overflow-x-auto shrink-0 scrollbar-none">
            {[
              { id: 'materials', label: '📚 Materials & Chat', icon: Layers },
              { id: 'notes', label: '📑 Smart Notes', icon: BookOpen },
              { id: 'handwritten', label: '✍️ Handwritten Notes', icon: PenTool },
              { id: 'flashcards', label: '🃏 Flashcards', icon: Brain },
              { id: 'quiz', label: '❓ MCQ & Quiz', icon: HelpCircle },
              { id: 'viva', label: '🎙️ Viva Examiner', icon: UserCheck },
              { id: 'mindmap', label: '🗺️ Mind Maps', icon: GitFork },
              { id: 'pomodoro', label: '⏱️ Pomodoro Timer', icon: Clock },
              { id: 'analytics', label: '📊 Analytics', icon: BarChart3 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2 rounded-xl font-sans text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#4FC3F7]/20 border border-[#4FC3F7]/50 text-[#4FC3F7] shadow-[0_0_15px_rgba(79,195,247,0.3)]'
                      : 'bg-white/5 border border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* MAIN CONTENT WORKSPACE AREA */}
          <main className="flex-1 overflow-hidden p-6 relative flex flex-col">
            {/* 1. MATERIALS & PDF CHAT TAB */}
            {activeTab === 'materials' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
                {/* Left: Document List & Upload Dropzone */}
                <div className="flex flex-col gap-4 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Folder className="w-4 h-4 text-[#4FC3F7]" /> Workspace Documents ({documents.length})
                    </h3>
                  </div>

                  {/* Drag & Drop Card */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 rounded-2xl border-2 border-dashed border-white/14 bg-white/5 hover:bg-white/10 hover:border-[#4FC3F7]/50 transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2"
                  >
                    <Upload className="w-6 h-6 text-[#4FC3F7]" />
                    <p className="text-xs font-medium text-white">Drag & drop files or click to upload</p>
                    <p className="text-[10px] text-zinc-400">PDF, DOCX, TXT, PPTX, XLSX, Images, Source Code</p>
                  </div>

                  {isUploading && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex justify-between text-xs text-white mb-1">
                        <span>Uploading & Building Embeddings...</span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#4FC3F7] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Documents Scroll List */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {documents.map((doc) => {
                      const isSelected = selectedDocId === doc.id;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDocId(doc.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#4FC3F7]/15 border-[#4FC3F7]/50 text-white shadow-[0_0_15px_rgba(79,195,247,0.2)]'
                              : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileText className="w-4 h-4 text-[#4FC3F7] shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-semibold truncate">{doc.name}</p>
                              <p className="text-[10px] text-zinc-400">{doc.pageCount ? `${doc.pageCount} pages` : 'Document'} • {doc.summary?.slice(0, 40)}...</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: PDF Chat & Semantic Query */}
                <div className="lg:col-span-2 flex flex-col gap-4 h-full overflow-hidden bg-white/[0.02] border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#4FC3F7]" /> PDF Semantic Chat & Citation Engine
                    </h3>
                    {selectedDocId && (
                      <button
                        onClick={handleGenerateStudyMaterials}
                        disabled={isGeneratingStudy}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#4FC3F7] to-[#9B5DE5] text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-all cursor-pointer"
                      >
                        <Brain className="w-3.5 h-3.5" />
                        {isGeneratingStudy ? 'Analyzing...' : 'Generate Study Materials'}
                      </button>
                    )}
                  </div>

                  {/* Semantic Search Bar */}
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ask any question across workspace documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/14 text-white text-xs px-4 py-2.5 rounded-xl outline-none focus:border-[#4FC3F7]"
                    />
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="px-4 py-2.5 rounded-xl bg-[#4FC3F7] text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Search
                    </button>
                  </form>

                  {/* Results & Citation Display */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {queryResult ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-[#4FC3F7]/10 border border-[#4FC3F7]/30">
                          <h4 className="text-xs font-bold text-[#4FC3F7] uppercase tracking-wider mb-2">Semantic AI Synthesis</h4>
                          <p className="text-xs text-slate-200 leading-relaxed font-sans">{queryResult.answerSnippet}</p>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Exact Page Citations</h4>
                          <div className="space-y-2">
                            {queryResult.citations.map((cite) => (
                              <div key={cite.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center justify-between text-xs text-[#4FC3F7] mb-1 font-semibold">
                                  <span>[{cite.documentName}, Page {cite.pageNumber}]</span>
                                  <span>{Math.round(cite.confidence * 100)}% match</span>
                                </div>
                                <p className="text-xs text-zinc-300 italic">"{cite.snippet}"</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                        <BookOpen className="w-12 h-12 mb-3 text-white/20" />
                        <p className="text-xs font-medium text-zinc-400">Ask questions to search workspace documents with exact page citations.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. SMART NOTES TAB */}
            {activeTab === 'notes' && (
              <div className="flex flex-col gap-4 h-full overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#4FC3F7]" /> AI Smart Notes & Revision Bulletins
                  </h3>
                  <button
                    onClick={handleGenerateStudyMaterials}
                    className="px-3.5 py-1.5 rounded-xl bg-[#4FC3F7] text-slate-950 font-bold text-xs"
                  >
                    Refresh Notes
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto">
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-[#4FC3F7] uppercase tracking-wider">Detailed Exam Notes</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {studyMaterials?.summary || 'Upload a document and click "Generate Study Materials" to compile exam notes, key points, and revision bulletins.'}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-[#9B5DE5] uppercase tracking-wider">Key High-Yield Concepts</h4>
                    <ul className="space-y-2 text-xs text-zinc-300">
                      {(studyMaterials?.keyPoints || ['Key Concept 1: Structural anatomy and vascular supply', 'Key Concept 2: Physiological innervation and action potentials', 'Key Concept 3: Clinical correlations and pathology diagnosis']).map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#9B5DE5] shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 3. REALISTIC HANDWRITTEN NOTES GENERATOR TAB */}
            {activeTab === 'handwritten' && (
              <div className="flex flex-col gap-4 h-full overflow-hidden">
                {/* Options Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 font-semibold">Ink Color:</span>
                    {(['blue', 'black', 'green', 'red'] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => setInkColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                          inkColor === c ? 'border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c === 'blue' ? '#1E40AF' : c === 'black' ? '#18181B' : c === 'green' ? '#065F46' : '#991B1B' }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 font-semibold">Paper Style:</span>
                    {(['ruled', 'blank', 'graph', 'medical'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => setPaperStyle(style)}
                        className={`px-3 py-1 rounded-xl text-xs capitalize cursor-pointer ${
                          paperStyle === style ? 'bg-[#4FC3F7] text-slate-950 font-bold' : 'bg-white/5 text-zinc-300'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>

                  <button className="px-3.5 py-1.5 rounded-xl bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer">
                    <Download className="w-3.5 h-3.5" /> Export PDF Page
                  </button>
                </div>

                {/* REALISTIC HANDWRITTEN NOTEBOOK CANVAS */}
                <div className="flex-1 overflow-y-auto flex justify-center p-4">
                  <div
                    className={`w-full max-w-2xl min-h-[500px] p-8 rounded-lg shadow-2xl relative transition-all text-left font-serif leading-relaxed ${
                      paperStyle === 'ruled'
                        ? 'bg-[#FAF6EE] text-slate-900 border-l-4 border-red-400 shadow-[inset_0_0_30px_rgba(0,0,0,0.05)]'
                        : paperStyle === 'graph'
                        ? 'bg-slate-50 text-slate-900 border border-slate-300'
                        : 'bg-white text-slate-900 border border-slate-200'
                    }`}
                    style={{
                      color: inkColor === 'blue' ? '#1E3A8A' : inkColor === 'black' ? '#0F172A' : inkColor === 'green' ? '#064E3B' : '#881337',
                      fontFamily: '"Caveat", "Dancing Script", cursive, serif',
                      fontSize: '1.25rem',
                      lineHeight: '2.1rem',
                      backgroundImage: paperStyle === 'ruled' ? 'linear-gradient(rgba(59, 130, 246, 0.15) 1px, transparent 1px)' : 'none',
                      backgroundSize: '100% 2.1rem',
                    }}
                  >
                    {/* Header Margins */}
                    <div className="border-b border-red-300 pb-2 mb-4 flex justify-between text-xs tracking-widest text-slate-500 font-sans">
                      <span>DATE: {new Date().toLocaleDateString()}</span>
                      <span>PAGE: 01</span>
                    </div>

                    <h2 className="text-2xl font-bold mb-4 underline decoration-red-300">{handwrittenTitle}</h2>

                    <p className="mb-4">
                      1. <span className="font-bold">Anatomical Overview:</span> The central sciatic trunk originates from spinal segments L4 through S3 within the sacral plexus. It exits the pelvic cavity via the greater sciatic foramen below the piriformis muscle.
                    </p>

                    <p className="mb-4">
                      2. <span className="font-bold">Clinical Significance:</span> Compression or entrapment by the piriformis muscle produces radiating neuropathic pain extending down the posterior thigh and lateral leg (Piriformis Syndrome / Sciatica).
                    </p>

                    <div className="p-3 my-4 rounded border border-blue-200 bg-blue-50/50 text-sm font-sans italic text-blue-900">
                      💡 Exam Note: Always perform the Straight Leg Raise (Lasegue's Sign) during clinical physical evaluation!
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. FLASHCARDS TAB */}
            {activeTab === 'flashcards' && (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <span>Card {flashcardIdx + 1} of {studyMaterials?.flashcards?.length || 1}</span>
                  <button onClick={() => setIsFlipped(!isFlipped)} className="px-3 py-1 rounded-xl bg-white/5 text-white flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" /> Flip Card
                  </button>
                </div>

                {/* 3D Animated Flip Flashcard */}
                <motion.div
                  onClick={() => setIsFlipped(!isFlipped)}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.5 }}
                  style={{ transformStyle: 'preserve-3d' }}
                  className="w-full max-w-lg h-72 rounded-3xl bg-gradient-to-tr from-[#4FC3F7]/15 to-[#9B5DE5]/15 border border-white/20 p-8 flex flex-col items-center justify-center text-center cursor-pointer shadow-2xl relative"
                >
                  <div className="text-sm font-semibold text-[#4FC3F7] mb-2 uppercase tracking-wider">
                    {isFlipped ? 'Answer' : 'Question'}
                  </div>
                  <p className="text-lg font-bold text-white">
                    {isFlipped
                      ? studyMaterials?.flashcards?.[flashcardIdx]?.answer || 'Sciatic nerve branches into the Tibial and Common Fibular (Peroneal) nerves.'
                      : studyMaterials?.flashcards?.[flashcardIdx]?.question || 'What are the terminal branches of the Sciatic Nerve?'}
                  </p>
                  <span className="absolute bottom-4 text-[10px] text-zinc-500">Click anywhere to flip</span>
                </motion.div>

                {/* Spaced Repetition Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFlashcardIdx((prev) => Math.max(0, prev - 1))}
                    className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white"
                  >
                    Previous
                  </button>
                  <button className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 text-xs border border-rose-500/40">Again</button>
                  <button className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 text-xs border border-amber-500/40">Hard</button>
                  <button className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/40">Easy</button>
                  <button
                    onClick={() => setFlashcardIdx((prev) => (prev + 1) % (studyMaterials?.flashcards?.length || 1))}
                    className="px-4 py-2 rounded-xl bg-[#4FC3F7] text-slate-950 font-bold text-xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* 5. MCQ & QUIZ TAB */}
            {activeTab === 'quiz' && (
              <div className="flex flex-col gap-4 h-full overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#4FC3F7]" /> Interactive MCQ Practice & Exam Prep
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Difficulty:</span>
                    {(['easy', 'medium', 'hard', 'expert'] as const).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setQuizDifficulty(diff)}
                        className={`px-2.5 py-1 rounded-xl text-xs uppercase ${
                          quizDifficulty === diff ? 'bg-[#4FC3F7] text-slate-950 font-bold' : 'bg-white/5 text-zinc-400'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {(studyMaterials?.mcqs || [
                    {
                      id: 'mcq_1',
                      question: 'Which nerve roots form the primary origin of the sciatic nerve?',
                      options: ['L1 - L3', 'L4 - S3', 'T12 - L2', 'S2 - S5'],
                      correctOptionIndex: 1,
                      explanation: 'The sciatic nerve originates from the ventral rami of spinal nerves L4 through S3.',
                    },
                  ]).map((mcq, qIdx) => (
                    <div key={mcq.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3">
                      <p className="text-xs font-bold text-white">Q{qIdx + 1}: {mcq.question}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {mcq.options.map((opt, optIdx) => {
                          const isSelected = mcqAnswers[mcq.id] === optIdx;
                          const isCorrect = optIdx === mcq.correctOptionIndex;
                          return (
                            <button
                              key={optIdx}
                              onClick={() => setMcqAnswers((prev) => ({ ...prev, [mcq.id]: optIdx }))}
                              className={`p-3 rounded-xl text-xs text-left transition-all cursor-pointer border ${
                                isSelected
                                  ? isCorrect
                                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                                    : 'bg-rose-500/20 border-rose-400 text-rose-200'
                                  : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}. {opt}
                            </button>
                          );
                        })}
                      </div>
                      {mcqAnswers[mcq.id] !== undefined && (
                        <p className="text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30">
                          💡 Explanation: {mcq.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. VIVA MODE (AI EXAMINER) TAB */}
            {activeTab === 'viva' && (
              <div className="flex flex-col h-full gap-4 overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#4FC3F7]" /> AI Oral Examiner (Viva Session)
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Persona:</span>
                    <select
                      value={vivaPersona}
                      onChange={(e) => setVivaPersona(e.target.value as any)}
                      className="bg-white/5 border border-white/14 text-white text-xs rounded-xl px-3 py-1.5 outline-none font-sans"
                    >
                      <option value="Friendly Teacher" className="bg-slate-900">Friendly Teacher</option>
                      <option value="Strict Professor" className="bg-slate-900">Strict Professor</option>
                      <option value="Exam Coach" className="bg-slate-900">Exam Coach</option>
                      <option value="Medical Faculty" className="bg-slate-900">Medical Faculty</option>
                    </select>
                  </div>
                </div>

                {/* Viva Dialog History */}
                <div className="flex-1 overflow-y-auto space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                  {vivaMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-[#4FC3F7] text-slate-950 font-medium'
                            : 'bg-white/10 border border-white/14 text-slate-100'
                        }`}
                      >
                        {msg.score && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono bg-emerald-500/20 text-emerald-300 mb-2 border border-emerald-500/30">
                            Score: {msg.score}%
                          </span>
                        )}
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Viva Answer Input */}
                <form onSubmit={handleSendVivaAnswer} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your viva answer to the examiner..."
                    value={vivaInput}
                    onChange={(e) => setVivaInput(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/14 text-white text-xs px-4 py-3 rounded-2xl outline-none focus:border-[#4FC3F7]"
                  />
                  <button type="submit" className="px-5 py-3 rounded-2xl bg-[#4FC3F7] text-slate-950 font-bold text-xs cursor-pointer">
                    Submit Answer
                  </button>
                </form>
              </div>
            )}

            {/* 7. MIND MAPS & FLOWCHARTS TAB */}
            {activeTab === 'mindmap' && (
              <div className="flex flex-col h-full gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <GitFork className="w-4 h-4 text-[#4FC3F7]" /> Interactive Concept Mind Maps & Clinical Flowcharts
                  </h3>
                  <button className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white">
                    Export Diagram (PNG)
                  </button>
                </div>

                {/* Visual SVG Concept Nodes */}
                <div className="flex-1 rounded-2xl bg-white/[0.02] border border-white/10 p-6 flex items-center justify-center overflow-auto relative">
                  <div className="flex flex-col items-center gap-8">
                    {/* Central Root Node */}
                    <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#4FC3F7] to-[#9B5DE5] text-slate-950 font-bold text-sm shadow-[0_0_30px_rgba(79,195,247,0.5)]">
                      🧠 Sciatic Nerve Neuroanatomy
                    </div>

                    {/* Connecting Branches */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-4 rounded-xl bg-white/5 border border-[#4FC3F7]/40 text-center text-xs text-white">
                        <span className="font-bold text-[#4FC3F7] block mb-1">1. Roots & Origin</span>
                        L4, L5, S1, S2, S3 ventral rami
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 border border-[#9B5DE5]/40 text-center text-xs text-white">
                        <span className="font-bold text-[#9B5DE5] block mb-1">2. Course & Path</span>
                        Greater Sciatic Foramen → Piriformis
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 border border-emerald-400/40 text-center text-xs text-white">
                        <span className="font-bold text-emerald-400 block mb-1">3. Terminal Divisions</span>
                        Tibial & Common Peroneal Nerves
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 8. POMODORO TIMER TAB */}
            {activeTab === 'pomodoro' && (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <div className="text-center">
                  <span className="px-3 py-1 rounded-full text-xs uppercase tracking-widest bg-[#4FC3F7]/15 border border-[#4FC3F7]/40 text-[#4FC3F7]">
                    {pomodoroMode === 'focus' ? '🎯 Focus Session' : '☕ Short Break'}
                  </span>
                  <h2 className="text-6xl font-extrabold text-white font-mono mt-4 tracking-tighter">
                    {formatTime(pomodoroSeconds)}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-2">Session {pomodoroSessions} Completed Today</p>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
                    className="px-6 py-3 rounded-2xl bg-[#4FC3F7] text-slate-950 font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(79,195,247,0.4)] cursor-pointer"
                  >
                    {isPomodoroRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isPomodoroRunning ? 'Pause' : 'Start Focus'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsPomodoroRunning(false);
                      setPomodoroSeconds(25 * 60);
                    }}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* 9. ANALYTICS TAB */}
            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-y-auto">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[#4FC3F7]">
                    <Flame className="w-5 h-5" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Study Streak</h4>
                  </div>
                  <p className="text-3xl font-bold text-white">{studyStreak} Days 🔥</p>
                  <p className="text-[10px] text-zinc-400">Keep studying daily to maintain your learning streak.</p>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[#9B5DE5]">
                    <Clock className="w-5 h-5" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Total Time Studied</h4>
                  </div>
                  <p className="text-3xl font-bold text-white">{hoursStudied} Hours ⏱️</p>
                  <p className="text-[10px] text-zinc-400">Across 5 active subject workspaces.</p>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Award className="w-5 h-5" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Quiz Accuracy</h4>
                  </div>
                  <p className="text-3xl font-bold text-white">88.4% 🎯</p>
                  <p className="text-[10px] text-zinc-400">Strong performance in Anatomy & Physiology.</p>
                </div>
              </div>
            )}
          </main>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
