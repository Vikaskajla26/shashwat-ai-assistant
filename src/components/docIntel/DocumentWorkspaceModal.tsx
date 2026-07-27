import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, FileText, Upload, Sparkles, BookOpen, Brain, Download, Trash2,
  CheckCircle2, Search, Layers, RefreshCw, FileCode, FileSpreadsheet,
  FileSearch, HelpCircle, ArrowRight, CornerDownRight, Share2, Eye
} from 'lucide-react';
import { DocumentMeta, KnowledgeQueryResult, StudyMaterials, DocumentComparison } from '../../../server/docIntel/types';

interface DocumentWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage?: (text: string) => void;
}

export const DocumentWorkspaceModal: React.FC<DocumentWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSendMessage,
}) => {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'search' | 'study' | 'compare'>('upload');
  
  // Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Search & Query State
  const [searchQuery, setSearchQuery] = useState('');
  const [queryResult, setQueryResult] = useState<KnowledgeQueryResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Study Tools State
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterials | null>(null);
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mcqAnswers, setMcqAnswers] = useState<{ [id: string]: number }>({});
  const [isGeneratingStudy, setIsGeneratingStudy] = useState(false);

  // Comparison State
  const [comparison, setComparison] = useState<DocumentComparison | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
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
    } catch (err) {
      console.error('Failed to fetch workspace documents:', err);
    }
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(10);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        setUploadProgress(30 + Math.floor((i / files.length) * 60));

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            base64,
          }),
        });

        const data = await response.json();
        if (data.success) {
          console.log('Successfully ingested document:', data.document);
        }
      } catch (err) {
        console.error('Upload failed for file:', file.name, err);
      }
    }

    setUploadProgress(100);
    setTimeout(() => {
      setIsUploading(false);
      setUploadProgress(0);
      fetchDocuments();
    }, 400);
  };

  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      fetchDocuments();
      if (selectedDocId === id) setSelectedDocId(null);
    } catch (err) {
      console.error('Delete document error:', err);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);

    try {
      const res = await fetch('/api/documents/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, docId: selectedDocId }),
      });
      const data = await res.json();
      if (data.success) {
        setQueryResult(data.result);
      }
    } catch (err) {
      console.error('Search knowledge base error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateStudy = async () => {
    setIsGeneratingStudy(true);
    try {
      const res = await fetch('/api/documents/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId: selectedDocId }),
      });
      const data = await res.json();
      if (data.success) {
        setStudyMaterials(data.study);
        setFlashcardIdx(0);
        setIsFlipped(false);
      }
    } catch (err) {
      console.error('Generate study materials error:', err);
    } finally {
      setIsGeneratingStudy(false);
    }
  };

  const handleRunComparison = async () => {
    try {
      const res = await fetch('/api/documents/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docIds: documents.map((d) => d.id) }),
      });
      const data = await res.json();
      if (data.success) {
        setComparison(data.comparison);
      }
    } catch (err) {
      console.error('Compare documents error:', err);
    }
  };

  const exportNotesAsMarkdown = () => {
    const text = `# Workspace Research Notes - ${new Date().toLocaleDateString()}\n\n` +
      (queryResult ? `## Search Query: ${queryResult.query}\n\n${queryResult.answer}\n\n` : '') +
      (studyMaterials ? `## Executive Summary\n${studyMaterials.executiveSummary}\n\n` : '');

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Shaashvat_Research_Notes_${Date.now()}.md`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-6xl h-[90vh] bg-[#0a0a0c] border border-blue-500/30 rounded-2xl shadow-[0_0_80px_rgba(59,130,246,0.15)] text-white flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
                <FileSearch className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <span>Document Intelligence Workspace</span>
                  <span className="text-[10px] font-mono font-bold bg-blue-500/20 border border-blue-500/40 text-blue-300 px-2 py-0.5 rounded-full">
                    {documents.length} FILES
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">Deep-Thinking AI Researcher, OCR, Semantic Search & Study Tools</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={exportNotesAsMarkdown}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                title="Export Research Notes"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>Export Notes</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2 px-6 pt-3 pb-2 border-b border-white/5 bg-black/40">
            {[
              { id: 'upload', label: 'Upload & Files', icon: Upload },
              { id: 'search', label: 'Deep Search & Citations', icon: Search },
              { id: 'study', label: 'Study Tools (MCQs & Mind Map)', icon: Brain },
              { id: 'compare', label: 'Multi-Doc Reasoning', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id === 'study' && !studyMaterials) handleGenerateStudy();
                    if (tab.id === 'compare' && !comparison) handleRunComparison();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-600/25 border border-blue-500 text-blue-300 shadow-md'
                      : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Body Workspace */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Navigator Panel (Workspace Documents) */}
            <div className="w-72 border-r border-white/10 bg-black/50 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <span>Workspace Files ({documents.length})</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  + Add File
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {documents.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500 text-xs italic">
                    No files in active workspace. Drag & drop or upload files to begin research.
                  </div>
                ) : (
                  documents.map((doc) => {
                    const isSelected = selectedDocId === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocId(doc.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500/60 text-white shadow-lg'
                            : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start space-x-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-white/10 text-blue-400 shrink-0 mt-0.5">
                            {doc.category === 'code' ? <FileCode className="w-4 h-4" /> :
                             doc.category === 'spreadsheet' ? <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> :
                             <FileText className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs truncate">{doc.name}</div>
                            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              {Math.round(doc.sizeBytes / 1024)} KB • {doc.pageCount || 1} pgs
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          className="text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-white/10 shrink-0"
                          title="Remove from workspace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: UPLOAD & FILES */}
              {activeTab === 'upload' && (
                <div className="space-y-6">
                  {/* Drag & Drop Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                      isDragging
                        ? 'border-blue-400 bg-blue-600/20 scale-[0.99]'
                        : 'border-white/20 hover:border-blue-500/50 bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="p-4 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                      <Upload className="w-8 h-8 animate-bounce" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white mb-1">
                        Drag & Drop files, presentations, code, spreadsheets or images
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Supports PDF, DOCX, TXT, CSV, XLSX, PPTX, Py, JS, TS, Java, C++, PNG, JPG, ZIP archives & more
                      </p>
                    </div>

                    {isUploading && (
                      <div className="w-full max-w-md mt-4 space-y-2">
                        <div className="flex justify-between text-xs text-blue-400 font-mono">
                          <span>Ingesting & Extracting Semantic Chunks...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Feature Highlights Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                      <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                        <Sparkles className="w-4 h-4" />
                        <span>OCR & Layout Extraction</span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Extracts text, figures, mathematical formulas, and tables seamlessly from scanned PDFs and images.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                      <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                        <Brain className="w-4 h-4" />
                        <span>Semantic Vector Chunking</span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Splits files into structured sections with exact page number and header metadata tracking.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                        <Layers className="w-4 h-4" />
                        <span>Cross-Document Reasoning</span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Compares multiple documents simultaneously to identify contradictions, similarities, and unified conclusions.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SEARCH & CITATIONS */}
              {activeTab === 'search' && (
                <div className="space-y-6">
                  {/* Search Bar */}
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ask anything e.g. 'Summarize chapter 2', 'Find all references to insulin', 'Explain this code architecture'"
                        className="w-full bg-black/60 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span>Deep Search</span>
                    </button>
                  </form>

                  {/* Query Results & Citations */}
                  {queryResult && (
                    <div className="space-y-4">
                      <div className="p-5 rounded-2xl bg-white/5 border border-blue-500/30 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-blue-400 uppercase tracking-wider">
                          <span>Synthesized Research Answer</span>
                          <span>{queryResult.citations.length} Citations</span>
                        </div>
                        <div className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                          {queryResult.answer}
                        </div>
                      </div>

                      {/* Citations List */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                          Verified Evidence & Citations
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {queryResult.citations.map((c, i) => (
                            <div key={i} className="p-3.5 rounded-xl bg-zinc-900 border border-white/10 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-blue-400 truncate">{c.docName}</span>
                                <span className="font-mono text-zinc-500">Page {c.pageNumber}</span>
                              </div>
                              <div className="text-[10px] font-semibold text-zinc-300">"{c.sectionHeader}"</div>
                              <p className="text-[11px] text-zinc-400 italic">"{c.snippet}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: STUDY TOOLS */}
              {activeTab === 'study' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider">AI Study & Exam Prep Tools</h3>
                      <p className="text-xs text-zinc-400">Interactive MCQs, Flashcards, and Mind Map visualizations</p>
                    </div>
                    <button
                      onClick={handleGenerateStudy}
                      disabled={isGeneratingStudy}
                      className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                    >
                      {isGeneratingStudy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                      <span>Regenerate Study Tools</span>
                    </button>
                  </div>

                  {studyMaterials && (
                    <div className="space-y-6">
                      {/* Flashcards Carousel */}
                      <div className="p-5 rounded-2xl bg-zinc-900 border border-white/10 space-y-4">
                        <div className="flex items-center justify-between text-xs font-bold text-purple-400 uppercase tracking-wider">
                          <span>Interactive Flashcard ({flashcardIdx + 1} / {studyMaterials.flashcards.length})</span>
                          <span>Category: {studyMaterials.flashcards[flashcardIdx]?.category}</span>
                        </div>

                        {studyMaterials.flashcards[flashcardIdx] && (
                          <div
                            onClick={() => setIsFlipped(!isFlipped)}
                            className="min-h-[160px] p-6 rounded-xl bg-purple-950/30 border border-purple-500/40 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:border-purple-400"
                          >
                            <span className="text-[10px] font-mono text-purple-400 uppercase mb-2">
                              {isFlipped ? 'ANSWER (CLICK TO FLIP)' : 'QUESTION (CLICK TO FLIP)'}
                            </span>
                            <p className="text-sm font-semibold text-white">
                              {isFlipped
                                ? studyMaterials.flashcards[flashcardIdx].back
                                : studyMaterials.flashcards[flashcardIdx].front}
                            </p>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <button
                            onClick={() => { setFlashcardIdx((prev) => Math.max(0, prev - 1)); setIsFlipped(false); }}
                            disabled={flashcardIdx === 0}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 disabled:opacity-40"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => { setFlashcardIdx((prev) => Math.min(studyMaterials.flashcards.length - 1, prev + 1)); setIsFlipped(false); }}
                            disabled={flashcardIdx === studyMaterials.flashcards.length - 1}
                            className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-xs font-bold text-purple-200 disabled:opacity-40"
                          >
                            Next Card
                          </button>
                        </div>
                      </div>

                      {/* MCQs Self-Quiz */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Self-Test Multiple Choice Quiz
                        </h4>
                        {studyMaterials.mcqs.map((mcq) => (
                          <div key={mcq.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                            <div className="text-xs font-bold text-white">{mcq.question}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {mcq.options.map((opt, optIdx) => {
                                const isSelected = mcqAnswers[mcq.id] === optIdx;
                                const isCorrect = optIdx === mcq.correctAnswer;
                                const showResult = mcqAnswers[mcq.id] !== undefined;

                                return (
                                  <button
                                    key={optIdx}
                                    onClick={() => setMcqAnswers((prev) => ({ ...prev, [mcq.id]: optIdx }))}
                                    className={`p-2.5 rounded-lg text-xs text-left border transition-all ${
                                      showResult
                                        ? isCorrect
                                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
                                          : isSelected
                                          ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                                          : 'bg-white/5 border-white/10 text-zinc-400'
                                        : isSelected
                                        ? 'bg-blue-600/20 border-blue-500 text-white'
                                        : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                            {mcqAnswers[mcq.id] !== undefined && (
                              <div className="text-[11px] text-zinc-400 italic mt-1">
                                💡 Explanation: {mcq.explanation} ({mcq.citation})
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: MULTI-DOC COMPARISON */}
              {activeTab === 'compare' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider">Multi-Document Reasoning & Comparison</h3>
                      <p className="text-xs text-zinc-400">Synthesize insights across all workspace files</p>
                    </div>
                    <button
                      onClick={handleRunComparison}
                      className="px-4 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Run Cross-Analysis</span>
                    </button>
                  </div>

                  {comparison && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
                        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Cross-Document Synthesis</div>
                        <p className="text-xs text-zinc-200 leading-relaxed">{comparison.synthesis}</p>
                      </div>

                      {/* Similarities */}
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                        <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Agreements & Similarities</div>
                        <ul className="list-disc list-inside text-xs text-zinc-300 space-y-1">
                          {comparison.similarities.map((sim, i) => (
                            <li key={i}>{sim}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Contradictions */}
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                        <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Differences & Contradictions</div>
                        <ul className="list-disc list-inside text-xs text-zinc-300 space-y-1">
                          {comparison.contradictions.map((con, i) => (
                            <li key={i}>{con}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
