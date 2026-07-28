import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Upload, Sparkles, BookOpen, Brain, Download,
  HelpCircle, GraduationCap, Folder, Clock,
  PenTool, GitFork, UserCheck, Terminal,
  Copy, Command as CmdIcon, ChevronRight, Layers
} from 'lucide-react';
import { DocumentMeta, KnowledgeQueryResult, StudyMaterials } from '../../../server/docIntel/types';
import { DEFAULT_COMMANDS, CommandItem } from '../../data/commands';

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
  const [workspaces] = useState<Workspace[]>([
    { id: 'anatomy', name: 'Anatomy & Histology', icon: '🧬', docCount: 4, createdAt: '2026-07-20' },
    { id: 'physiology', name: 'Physiology & Neuro', icon: '🧠', docCount: 3, createdAt: '2026-07-22' },
    { id: 'dravyaguna', name: 'Dravyaguna & Herbal AI', icon: '🌿', docCount: 5, createdAt: '2026-07-24' },
    { id: 'pharmacology', name: 'Pharmacology & Drugs', icon: '💊', docCount: 2, createdAt: '2026-07-25' },
    { id: 'research', name: 'Research & Thesis', icon: '🔬', docCount: 6, createdAt: '2026-07-26' },
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('anatomy');

  // Active Tool Tab
  const [activeTab, setActiveTab] = useState<
    'commands' | 'materials' | 'notes' | 'handwritten' | 'flashcards' | 'quiz' | 'viva' | 'mindmap' | 'pomodoro'
  >('commands');

  // Slash Command Palette State (Initialized with DEFAULT_COMMANDS)
  const [commandInput, setCommandInput] = useState('');
  const [registeredCommands, setRegisteredCommands] = useState<CommandItem[]>(DEFAULT_COMMANDS);
  const [filteredCommands, setFilteredCommands] = useState<CommandItem[]>(DEFAULT_COMMANDS);
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const [commandResult, setCommandResult] = useState<{ title: string; markdown: string } | null>(null);

  // Documents & Processing
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Handwritten Notebook Generator State
  const [inkColor, setInkColor] = useState<'blue' | 'black' | 'green' | 'red'>('blue');
  const [handwrittenTitle, setHandwrittenTitle] = useState('Anatomy Notes - Neurovascular System');

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
      if (data.success && data.documents) {
        setDocuments(data.documents);
        if (data.documents.length > 0 && !selectedDocId) {
          setSelectedDocId(data.documents[0].id);
        }
      }
    } catch (e) {
      console.warn('Using local workspace docs');
    }
  };

  const fetchCommands = async () => {
    try {
      const res = await fetch('/api/study/commands');
      const data = await res.json();
      if (data.success && data.commands && data.commands.length > 0) {
        setRegisteredCommands(data.commands);
        setFilteredCommands(data.commands);
      }
    } catch (e) {
      // DEFAULT_COMMANDS already set
    }
  };

  const handleCommandInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCommandInput(val);

    if (val.trim()) {
      const search = val.toLowerCase().replace('/', '');
      const matched = registeredCommands.filter(
        (c) => c.command.toLowerCase().includes(search) || c.description.toLowerCase().includes(search)
      );
      setFilteredCommands(matched.length > 0 ? matched : registeredCommands);
      setShowCommandSuggestions(true);
    } else {
      setFilteredCommands(registeredCommands);
      setShowCommandSuggestions(true);
    }
  };

  const handleSelectCommand = (cmd: CommandItem) => {
    setCommandInput(`${cmd.command} `);
    setShowCommandSuggestions(false);
  };

  const handleRunSpecificCommand = (cmdName: string) => {
    const defaultTopic = 'Sciatic Nerve & Lower Extremity Neuroanatomy';
    const fullCmd = `${cmdName} ${defaultTopic}`;
    setCommandInput(fullCmd);
    executeCommand(fullCmd);
  };

  const executeCommand = async (cmdText: string) => {
    if (!cmdText.trim()) return;

    setIsExecutingCommand(true);
    setShowCommandSuggestions(false);

    try {
      const res = await fetch('/api/study/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmdText.trim(), docId: selectedDocId }),
      });
      const data = await res.json();

      if (data.success && data.result) {
        setCommandResult({
          title: data.result.title || cmdText,
          markdown: data.result.markdown || data.result.output,
        });
      }
    } catch (err) {
      console.error('Error running command:', err);
    } finally {
      setIsExecutingCommand(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(commandInput);
  };

  const handleExportText = (format: 'pdf' | 'docx' | 'markdown' | 'txt') => {
    const textToExport = commandResult?.markdown || 'Study Studio Notes';
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
    const text = commandResult?.markdown || '';
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
                    Slash Commands Ready
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 font-sans">Learn Smarter with शाश्वत AI Professor</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={activeWorkspaceId}
                onChange={(e) => setActiveWorkspaceId(e.target.value)}
                className="bg-white/5 border border-white/14 text-white text-xs rounded-xl px-3 py-2 outline-none font-sans cursor-pointer"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id} className="bg-slate-900 text-white">
                    {ws.icon} {ws.name}
                  </option>
                ))}
              </select>

              <button onClick={onClose} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* TOOL TABS NAVIGATION */}
          <nav className="flex items-center gap-1.5 px-6 py-2 border-b border-white/10 bg-white/[0.02] overflow-x-auto shrink-0 scrollbar-none">
            {[
              { id: 'commands', label: '⚡ Slash Commands', icon: Terminal },
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
            {/* 1. SLASH COMMAND TAB */}
            {activeTab === 'commands' && (
              <div className="flex flex-col h-full gap-4 overflow-hidden">
                {/* Command Chips Bar for Instant 1-Click Execution */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0">
                  <span className="text-[11px] text-zinc-400 font-mono font-bold shrink-0">Quick Run:</span>
                  {[
                    '/notes', '/summarize', '/mnemonics', '/viva', '/ayurveda',
                    '/mindmap', '/quiz', '/studyplan', '/cheatsheet', '/importantquestions'
                  ].map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => handleRunSpecificCommand(cmd)}
                      className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-[#4FC3F7]/20 text-[11px] font-mono text-[#4FC3F7] border border-[#4FC3F7]/30 whitespace-nowrap cursor-pointer transition-all"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>

                {/* Command Input Form */}
                <div className="relative shrink-0">
                  <form onSubmit={handleFormSubmit} className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Type slash command e.g. /notes Sciatic nerve, /summarize, /ayurveda, /viva..."
                        value={commandInput}
                        onFocus={() => setShowCommandSuggestions(true)}
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
                          <button onClick={handleCopy} className="px-3 py-1.5 rounded-xl bg-white/5 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer">
                            <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy'}
                          </button>
                          {(['pdf', 'docx', 'markdown', 'txt'] as const).map((fmt) => (
                            <button
                              key={fmt}
                              onClick={() => handleExportText(fmt)}
                              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-[#4FC3F7]/20 text-[11px] uppercase font-mono text-zinc-300 hover:text-[#4FC3F7] border border-white/10 cursor-pointer"
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
                      <p className="text-xs text-zinc-400">Select any quick command above or type a slash command to generate AI study materials.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* HANDWRITTEN TAB */}
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
                  <button onClick={() => handleExportText('pdf')} className="px-3.5 py-1.5 rounded-xl bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer">
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
