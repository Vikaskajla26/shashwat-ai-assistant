/**
 * AI Workspace Modal Component for Shashwat AI OS (Phase 10 AI Workspace).
 * Hub for Pinned Files, Projects, Chat History, Bookmarks, Scratchpad,
 * Clipboard History, Recent Files, Task List, Daily Goals, and Knowledge Graph,
 * synchronized with 3-Tier Human Memory.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Pin, Folder, MessageSquare, Bookmark, Edit3, Clipboard, Clock, CheckSquare, Target, Network, Plus, Check, Sparkles
} from 'lucide-react';
import type { AIWorkspaceState } from '../../../server/tools/aiWorkspace';

interface AIWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIWorkspaceModal: React.FC<AIWorkspaceModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'projects' | 'tasks' | 'scratchpad' | 'bookmarks' | 'clipboard' | 'graph'>('projects');
  const [workspaceData, setWorkspaceData] = useState<AIWorkspaceState | null>(null);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [scratchpadText, setScratchpadText] = useState('');
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [newBookmarkUrl, setNewBookmarkUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadWorkspace();
    }
  }, [isOpen]);

  const loadWorkspace = async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.workspace?.get) {
      const data = await (window as any).electronAPI.workspace.get();
      if (data) {
        setWorkspaceData(data);
        setScratchpadText(data.scratchpad || '');
      }
    } else {
      // Fallback State
      const fallbackState: AIWorkspaceState = {
        pinnedFiles: [{ id: 'p1', name: 'Shashwat Architecture.pdf', path: '/docs/arch.pdf', type: 'pdf' }],
        recentFiles: [{ id: 'r1', name: 'Anatomy Notes.docx', path: '/docs/anatomy.docx', accessedAt: Date.now() }],
        projects: [{ id: 'proj1', name: 'Shashwat AI OS', description: 'Enterprise AI OS System', taskCount: 8 }],
        chatHistory: [{ id: 'c1', prompt: 'Explain sciatic nerve', response: 'Largest single nerve in human body...', timestamp: Date.now() }],
        bookmarks: [{ id: 'b1', title: 'Gemini AI Docs', url: 'https://ai.google.dev', category: 'Dev', createdAt: Date.now() }],
        scratchpad: '# Scratchpad Notes\n- All workspace items sync with Human Memory.',
        clipboardHistory: ['git commit -m "feat: phase 10 workspace"'],
        tasks: [{ id: 't1', title: 'Test Memory Sync', category: 'System', completed: true, priority: 'high', createdAt: Date.now() }],
        dailyGoals: [{ id: 'g1', goal: 'Complete Workspace Phase', target: 1, current: 1, completed: true }],
        knowledgeGraph: [{ id: 'n1', label: 'AI OS Kernel', category: 'project', connections: ['n2'] }],
      };
      setWorkspaceData(fallbackState);
      setScratchpadText(fallbackState.scratchpad);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    if (typeof window !== 'undefined' && (window as any).electronAPI?.workspace?.saveTask) {
      const newTask = await (window as any).electronAPI.workspace.saveTask(newTaskTitle.trim(), 'General', 'medium');
      if (newTask && workspaceData) {
        setWorkspaceData({ ...workspaceData, tasks: [newTask, ...workspaceData.tasks] });
      }
    }
    setNewTaskTitle('');
  };

  const handleToggleTask = async (taskId: string) => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.workspace?.toggleTask) {
      await (window as any).electronAPI.workspace.toggleTask(taskId);
    }
    if (workspaceData) {
      setWorkspaceData({
        ...workspaceData,
        tasks: workspaceData.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
      });
    }
  };

  const handleSaveScratchpad = async (text: string) => {
    setScratchpadText(text);
    if (typeof window !== 'undefined' && (window as any).electronAPI?.workspace?.saveScratchpad) {
      await (window as any).electronAPI.workspace.saveScratchpad(text);
    }
  };

  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookmarkTitle.trim() || !newBookmarkUrl.trim()) return;

    if (typeof window !== 'undefined' && (window as any).electronAPI?.workspace?.saveBookmark) {
      const bm = await (window as any).electronAPI.workspace.saveBookmark(newBookmarkTitle.trim(), newBookmarkUrl.trim(), 'General');
      if (bm && workspaceData) {
        setWorkspaceData({ ...workspaceData, bookmarks: [bm, ...workspaceData.bookmarks] });
      }
    }
    setNewBookmarkTitle('');
    setNewBookmarkUrl('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-5xl h-[85vh] bg-slate-900/95 border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Shashwat AI Workspace</h2>
                <p className="text-xs text-slate-400">Synchronized with 3-Tier Human Memory System</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Bar */}
          <div className="flex items-center gap-2 px-6 py-3 border-b border-white/10 bg-slate-950/30 text-xs overflow-x-auto">
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium ${
                activeTab === 'projects' ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <Folder className="w-4 h-4" /> Projects & Files
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium ${
                activeTab === 'tasks' ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <CheckSquare className="w-4 h-4" /> Tasks & Goals
            </button>
            <button
              onClick={() => setActiveTab('scratchpad')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium ${
                activeTab === 'scratchpad' ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <Edit3 className="w-4 h-4" /> Scratchpad
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium ${
                activeTab === 'bookmarks' ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <Bookmark className="w-4 h-4" /> Bookmarks
            </button>
            <button
              onClick={() => setActiveTab('clipboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium ${
                activeTab === 'clipboard' ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <Clipboard className="w-4 h-4" /> Clipboard History
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium ${
                activeTab === 'graph' ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <Network className="w-4 h-4" /> Knowledge Graph
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Tab 1: Projects & Files */}
            {activeTab === 'projects' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                    <Pin className="w-4 h-4" /> Pinned Documents
                  </h3>
                  <div className="space-y-2">
                    {workspaceData?.pinnedFiles.map((file) => (
                      <div key={file.id} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                        <span className="text-xs text-slate-200">{file.name}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full font-mono uppercase">{file.type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-indigo-400 mb-3 flex items-center gap-2">
                    <Folder className="w-4 h-4" /> Active Projects
                  </h3>
                  <div className="space-y-2">
                    {workspaceData?.projects.map((proj) => (
                      <div key={proj.id} className="p-3 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-100">{proj.name}</span>
                          <span className="text-[10px] text-slate-400">{proj.taskCount} tasks</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{proj.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Tasks & Goals */}
            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <form onSubmit={handleAddTask} className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a new workspace task..."
                    className="flex-1 px-4 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs flex items-center gap-1 font-medium">
                    <Plus className="w-4 h-4" /> Add Task
                  </button>
                </form>

                <div className="space-y-2">
                  {workspaceData?.tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                        task.completed ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-400 line-through' : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${task.completed ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-white/30'}`}>
                          {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-xs">{task.title}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">{task.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Scratchpad */}
            {activeTab === 'scratchpad' && (
              <div className="h-full flex flex-col">
                <textarea
                  value={scratchpadText}
                  onChange={(e) => handleSaveScratchpad(e.target.value)}
                  placeholder="Type quick notes here... Automatically synced to 3-Tier Human Memory."
                  className="w-full h-80 p-4 bg-black/50 border border-white/15 rounded-2xl text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>
            )}

            {/* Tab 4: Bookmarks */}
            {activeTab === 'bookmarks' && (
              <div className="space-y-6">
                <form onSubmit={handleAddBookmark} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newBookmarkTitle}
                    onChange={(e) => setNewBookmarkTitle(e.target.value)}
                    placeholder="Bookmark Title"
                    className="px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white"
                  />
                  <input
                    type="text"
                    value={newBookmarkUrl}
                    onChange={(e) => setNewBookmarkUrl(e.target.value)}
                    placeholder="https://..."
                    className="px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white"
                  />
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium">
                    Save Bookmark
                  </button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {workspaceData?.bookmarks.map((bm) => (
                    <a
                      key={bm.id}
                      href={bm.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-xs font-semibold text-cyan-300">{bm.title}</h4>
                        <p className="text-[10px] text-slate-400 truncate max-w-xs">{bm.url}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full">{bm.category}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 5: Clipboard History */}
            {activeTab === 'clipboard' && (
              <div className="space-y-2">
                {workspaceData?.clipboardHistory.map((item, idx) => (
                  <div key={idx} className="p-3 bg-black/40 border border-white/10 rounded-xl font-mono text-xs text-slate-300 flex items-center justify-between">
                    <span className="truncate max-w-2xl">{item}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(item)}
                      className="px-2 py-1 bg-white/10 hover:bg-white/20 text-[10px] rounded-lg transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 6: Knowledge Graph */}
            {activeTab === 'graph' && (
              <div className="p-6 bg-black/60 border border-white/10 rounded-2xl flex flex-col items-center justify-center min-h-[300px]">
                <div className="flex gap-4 mb-4">
                  {workspaceData?.knowledgeGraph.map((node) => (
                    <div key={node.id} className="px-4 py-3 bg-cyan-950/40 border border-cyan-500/50 rounded-2xl text-center shadow-lg">
                      <p className="text-xs font-bold text-cyan-300">{node.label}</p>
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest">{node.category}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400">Connected Memory Nodes Visualizer Active</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
