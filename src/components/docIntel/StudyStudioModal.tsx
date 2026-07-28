import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, FileText, Upload, Sparkles, BookOpen, Brain, Download, Trash2,
  CheckCircle2, Search, Layers, RefreshCw, HelpCircle, ArrowRight,
  GraduationCap, Plus, Folder, Calendar, Clock, Award, Bookmark, Shuffle,
  Volume2, Play, Pause, RotateCcw, PenTool, GitFork, BarChart3, Target,
  MessageSquare, UserCheck, Flame, Check, ChevronRight, FileCode, Terminal,
  Copy, Share2, Printer, FileDown, Command as CmdIcon
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

interface CommandItem {
  command: string;
  category: string;
  description: string;
  syntax: string;
  example: string;
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
    'commands' | 'materials' | 'notes' | 'handwritten' | 'flashcards' | 'quiz' | 'viva' | 'mindmap' | 'pomodoro' | 'analytics'
  >('commands');

  // Slash Command Palette State
  const [commandInput, setCommandInput] = useState('');
  const [registeredCommands, setRegisteredCommands] = useState<CommandItem[]>([]);
  const [filteredCommands, setFilteredCommands] = useState<CommandItem[]>([]);
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const [commandResult, setCommandResult] = useState<{ title: string; markdown: string } | null>(null);

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
  const [handwrittenTitle, setHandwrittenTitle] = useState('Anatomy Notes - Neurovascular System');

  // Flashcards State
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz Mode State
  const [mcqAnswers, setMcqAnswers] = useState<{ [id: string]: number }>({});
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');

  // Viva AI Examiner State
  const [vivaMessages, setVivaMessages] = useState<Array<{ sender: 'examiner' | 'user'; text: string; score?: number }>>([
    {
      sender: 'examiner',
      text: 'Welcome to your Viva Voce Examination on Anatomy & Histology. Can you describe the primary origin and clinical course of the Sciatic Nerve?',
    },
  ]);
  const [vivaInput, setVivaInput] = useState('');
  const [vivaPersona, setVivaPersona] = useState<'Friendly Teacher' | 'Strict Professor' | 'Exam Coach' | 'Medical Faculty'>('Medical Faculty');

  // Pomodoro Timer State
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState<'focus' | 'break'>('focus');

  // Copy feedback
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
      fetchCommands();
    }
  }, [isOpen]);

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
      console.warn('Failed to fetch documents');
    }
  };

  const fetchCommands = async () => {
    try {
      const res = await fetch('/api/study/commands');
      const data = await res.json();
      if (data.success) {
        setRegisteredCommands(data.commands || []);
        setFilteredCommands(data.commands || []);
      }
    } catch (e) {
      console.warn('Failed to fetch slash commands');
    }
  };

  const handleCommandInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCommandInput(val);

    if (val.startsWith('/')) {
      const search = val.toLowerCase();
      const matched = registeredCommands.filter(
        (c) => c.command.toLowerCase().includes(search) || c.description.toLowerCase().includes(search)
      );
      setFilteredCommands(matched);
      setShowCommandSuggestions(true);
    } else {
      setShowCommandSuggestions(false);
    }
  };

  const handleSelectCommand = (cmd: CommandItem) => {
    setCommandInput(`${cmd.command} `);
    setShowCommandSuggestions(false);
  };

  const handleExecuteCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commandInput.trim()) return;

    setIsExecutingCommand(true);
    setShowCommandSuggestions(false);

    try {
      const res = await fetch('/api/study/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: commandInput.trim(), docId: selectedDocId }),
      });
      const data = await res.json();

      if (data.success) {
        setCommandResult({
          title: data.result.title || commandInput,
          markdown: data.result.markdown || data.result.output,
        });
      }
    } catch (err) {
      console.error('Error executing command:', err);
    } finally {
      setIsExecutingCommand(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(30);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(40 + (i / files.length) * 50);

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

  const handleExportText = (format: 'pdf' | 'docx' | 'markdown' | 'txt' | 'csv') => {
    const textToExport = commandResult?.markdown || studyMaterials?.summary || 'Study Studio Notes';
    const blob = new Blob([textToExport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Study_Studio_Export.${format === 'markdown' ? 'md' : format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = () => {
    const text = commandResult?.markdown || studyMaterials?.summary || '';
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
          {/* HEADER BAR */}
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

            {/* WORKSPACE & ACTIONS */}
            <div className="flex items-center gap-3">
              <select
                value={activeWorkspaceId}
                onChange={(e) => setActiveWorkspaceId(e.target.value)}
                className="bg-white/5 border border-white/14 text-white text-xs rounded-xl px-3 py-2 outline-none font-sans cursor-pointer"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id} className="bg-slate-900 text-white">
                    {ws.icon} {ws.name} ({ws.docCount} docs)
                  </option>
                ))}
              </select>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-[#4FC3F7] text-slate-950 hover:bg-[#4FC3F7]/90 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(79,195,247,0.4)]"
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />

              <button onClick={onClose} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* TOOL TABS NAVIGATION */}
          <nav className="flex items-center gap-1.5 px-6 py-2 border-b border-white/10 bg-white/[0.02] overflow-x-auto shrink-0 scrollbar-none">
            {[
              { id: 'commands', label: '⚡ Slash Commands', icon: Terminal },
              { id: 'materials', label: '📚 Materials & Chat', icon: Layers },
              { id: 'notes', label: '📑 Smart Notes', icon: BookOpen },
              { id: 'handwritten', label: '✍️ Handwritten Notes', icon: PenTool },
              { id: 'flashcards', label: '🃏 Flashcards', icon: Brain },
              { id: 'quiz', label: '❓ MCQ & Quiz', icon: HelpCircle },
              { id: 'viva', label: '🎙️ Viva Examiner', icon: UserCheck },
              { id: 'mindmap', label: '🗺️ Mind Maps', icon: GitFork },
              { id: 'pomodoro', label: '⏱️ Pomodoro Timer', icon: Clock },
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

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 overflow-hidden p-6 relative flex flex-col">
            {/* 1. SLASH COMMAND ENGINE TAB */}
            {activeTab === 'commands' && (
              <div className="flex flex-col h-full gap-4 overflow-hidden">
                {/* Command Input Form */}
                <div className="relative">
                  <form onSubmit={handleExecuteCommand} className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Type a slash command e.g. /notes, /summary, /mnemonics, /ayurveda, /viva..."
                        value={commandInput}
                        onChange={handleCommandInputChange}
                        className="w-full bg-white/5 border border-white/14 focus:border-[#4FC3F7]/60 text-white font-mono text-xs px-4 py-3 rounded-2xl outline-none"
                      />
                      {showCommandSuggestions && filteredCommands.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-slate-950 border border-white/14 rounded-2xl shadow-2xl z-50 p-2 space-y-1">
                          {filteredCommands.map((cmd) => (
                            <div
                              key={cmd.command}
                              onClick={() => handleSelectCommand(cmd)}
                              className="p-2.5 rounded-xl hover:bg-[#4FC3F7]/15 cursor-pointer flex items-center justify-between transition-all"
                            >
                              <div>
                                <span className="font-mono text-xs text-[#4FC3F7] font-bold">{cmd.command}</span>
                                <span className="text-[10px] text-zinc-400 ml-2">{cmd.description}</span>
                              </div>
                              <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-white/5 text-zinc-400">{cmd.category}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isExecutingCommand}
                      className="px-6 py-3 rounded-2xl bg-[#4FC3F7] text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <CmdIcon className="w-4 h-4" />
                      {isExecutingCommand ? 'Executing...' : 'Run Command'}
                    </button>
                  </form>
                </div>

                {/* Command Output Display Card */}
                <div className="flex-1 overflow-hidden flex flex-col rounded-2xl bg-white/[0.02] border border-white/10 p-5">
                  {commandResult ? (
                    <div className="flex flex-col h-full overflow-hidden">
                      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 shrink-0">
                        <h3 className="text-sm font-bold text-[#4FC3F7] font-mono">{commandResult.title}</h3>
                        <div className="flex items-center gap-2">
                          <button onClick={handleCopy} className="px-3 py-1.5 rounded-xl bg-white/5 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5">
                            <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy'}
                          </button>
                          {(['pdf', 'docx', 'markdown', 'txt'] as const).map((fmt) => (
                            <button
                              key={fmt}
                              onClick={() => handleExportText(fmt)}
                              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-[#4FC3F7]/20 text-[11px] uppercase font-mono text-zinc-300 hover:text-[#4FC3F7] border border-white/10"
                            >
                              {fmt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto font-sans text-xs leading-relaxed text-slate-200 whitespace-pre-wrap pr-2">
                        {commandResult.markdown}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500">
                      <Terminal className="w-12 h-12 mb-3 text-white/20" />
                      <p className="text-xs text-zinc-400">Type any slash command above to execute AI study tools.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. MATERIALS TAB */}
            {activeTab === 'materials' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
                <div className="flex flex-col gap-4 overflow-hidden">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Folder className="w-4 h-4 text-[#4FC3F7]" /> Workspace Documents ({documents.length})
                  </h3>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 rounded-2xl border-2 border-dashed border-white/14 bg-white/5 hover:bg-white/10 text-center cursor-pointer"
                  >
                    <Upload className="w-6 h-6 text-[#4FC3F7] mx-auto mb-1" />
                    <p className="text-xs text-white">Drag & drop files or click to upload</p>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocId(doc.id)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between ${
                          selectedDocId === doc.id ? 'bg-[#4FC3F7]/15 border-[#4FC3F7]/50 text-white' : 'bg-white/5 border-white/10 text-zinc-300'
                        }`}
                      >
                        <span className="text-xs truncate">{doc.name}</span>
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-4 h-full overflow-hidden bg-white/[0.02] border border-white/10 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-white/10">
                    <Sparkles className="w-4 h-4 text-[#4FC3F7]" /> PDF Semantic Search & Citations
                  </h3>
                  <form onSubmit={(e) => { e.preventDefault(); if (searchQuery.trim()) setIsSearching(true); }} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ask questions across documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/14 text-white text-xs px-4 py-2.5 rounded-xl outline-none"
                    />
                    <button type="submit" className="px-4 py-2.5 rounded-xl bg-[#4FC3F7] text-slate-950 font-bold text-xs">Search</button>
                  </form>
                </div>
              </div>
            )}

            {/* 3. REALISTIC HANDWRITTEN NOTES TAB */}
            {activeTab === 'handwritten' && (
              <div className="flex flex-col gap-4 h-full overflow-hidden">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">Ink Color:</span>
                    {(['blue', 'black', 'green', 'red'] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => setInkColor(c)}
                        className={`w-6 h-6 rounded-full border-2 ${inkColor === c ? 'border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: c === 'blue' ? '#1E40AF' : c === 'black' ? '#18181B' : c === 'green' ? '#065F46' : '#991B1B' }}
                      />
                    ))}
                  </div>
                  <button onClick={() => handleExportText('pdf')} className="px-3.5 py-1.5 rounded-xl bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Export PDF
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto flex justify-center p-4">
                  <div
                    className="w-full max-w-2xl min-h-[500px] p-8 rounded-lg shadow-2xl text-left font-serif leading-relaxed bg-[#FAF6EE] text-slate-900 border-l-4 border-red-400"
                    style={{
                      color: inkColor === 'blue' ? '#1E3A8A' : inkColor === 'black' ? '#0F172A' : inkColor === 'green' ? '#064E3B' : '#881337',
                      fontFamily: 'serif',
                      fontSize: '1.1rem',
                      lineHeight: '2rem',
                    }}
                  >
                    <div className="border-b border-red-300 pb-2 mb-4 flex justify-between text-xs tracking-widest text-slate-500 font-sans">
                      <span>DATE: {new Date().toLocaleDateString()}</span>
                      <span>PAGE: 01</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-4 underline decoration-red-300">{handwrittenTitle}</h2>
                    <p className="mb-4">1. High-Yield Neuroanatomy Note: The sciatic nerve is formed by ventral rami L4-S3 within the pelvis.</p>
                    <p className="mb-4">2. Clinical Correlation: Piriformis entrapment results in neuropathic pain radiating down posterior leg.</p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
