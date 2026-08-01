import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bot, Wrench, Sparkles, Brain, Plus, Trash2, RefreshCw, Bookmark, FolderGit2, User, Sliders, ShieldCheck, Compass } from 'lucide-react';
import { AssistantMood, AssistantState } from '../types';
import { MemoryManager, MemoryFact, MemoryCategory } from '../modules/MemoryManager';
import { AIProviderSettingsTab } from './AIProviderSettingsTab';
import { BrowserSettingsTab } from './BrowserSettingsTab';

interface SettingsModalProps {
  isOpen: boolean;
  state: AssistantState;
  currentMood: AssistantMood;
  onClose: () => void;
  onChangeMood: (mood: AssistantMood) => void;
  onTriggerTestTool: (toolName: string) => void;
  onOpenSandbox?: () => void;
}

const moodsList: { id: AssistantMood; label: string; desc: string; icon: string }[] = [
  { id: 'witty', label: 'Witty & Charming', desc: 'Clever, smart teasing, humorous', icon: '✨' },
  { id: 'playful', label: 'Playful & Energetic', desc: 'Fun, bubbly, high energy', icon: '🎭' },
  { id: 'focused', label: 'Focused & Analytical', desc: 'Direct, clear, concise intelligence', icon: '🧠' },
  { id: 'charming', label: 'Warm Companion', desc: 'Supportive, friendly, empathetic', icon: '💫' },
  { id: 'energetic', label: 'High Octane', desc: 'Rapid, enthusiastic, bold', icon: '⚡' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  state,
  currentMood,
  onClose,
  onChangeMood,
  onTriggerTestTool,
  onOpenSandbox,
}) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'browser' | 'config' | 'memory'>('providers');
  const [memories, setMemories] = useState<MemoryFact[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // New Memory Form
  const [newCategory, setNewCategory] = useState<MemoryCategory>('personal');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newImportance, setNewImportance] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [isAdding, setIsAdding] = useState(false);

  const memoryManager = MemoryManager.getInstance();

  const refreshMemories = () => {
    setMemories(memoryManager.getAllMemories());
  };

  useEffect(() => {
    if (isOpen) {
      refreshMemories();
    }
  }, [isOpen]);

  const handleAddFact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    memoryManager.rememberFact(newCategory, newKey, newValue, newImportance);
    setNewKey('');
    setNewValue('');
    setIsAdding(false);
    refreshMemories();
  };

  const handleDeleteFact = (key: string) => {
    memoryManager.forgetMemory(key);
    refreshMemories();
  };

  const handleClearAllMemory = () => {
    if (window.confirm('Are you sure you want to erase all long-term memory? शाश्वत will forget everything.')) {
      memoryManager.clearAllMemory();
      refreshMemories();
    }
  };

  const filteredMemories = memories.filter((m) =>
    filterCategory === 'all' ? true : m.category === filterCategory
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-xl bg-[#030303] border border-white/10 rounded-3xl p-6 shadow-2xl text-white relative overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">शाश्वat SYSTEM CONFIG</h2>
                  <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Gemini Live Real-time Engine</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-2 pt-4 pb-2 border-b border-white/5">
              <button
                onClick={() => setActiveTab('providers')}
                className={`flex-1 py-2 rounded-xl font-bold uppercase tracking-wider text-[11px] flex items-center justify-center space-x-2 transition-all ${
                  activeTab === 'providers'
                    ? 'bg-indigo-600/20 border border-indigo-500 text-indigo-300 shadow-md'
                    : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI Providers</span>
              </button>

              <button
                onClick={() => setActiveTab('browser')}
                className={`flex-1 py-2 rounded-xl font-bold uppercase tracking-wider text-[11px] flex items-center justify-center space-x-2 transition-all ${
                  activeTab === 'browser'
                    ? 'bg-cyan-600/20 border border-cyan-500 text-cyan-300 shadow-md'
                    : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Browser Routing</span>
              </button>

              <button
                onClick={() => setActiveTab('config')}
                className={`flex-1 py-2 rounded-xl font-bold uppercase tracking-wider text-[11px] flex items-center justify-center space-x-2 transition-all ${
                  activeTab === 'config'
                    ? 'bg-blue-600/20 border border-blue-500 text-blue-300 shadow-md'
                    : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>System Config</span>
              </button>

              <button
                onClick={() => setActiveTab('memory')}
                className={`flex-1 py-2 rounded-xl font-bold uppercase tracking-wider text-[11px] flex items-center justify-center space-x-2 transition-all ${
                  activeTab === 'memory'
                    ? 'bg-purple-600/20 border border-purple-500 text-purple-300 shadow-md'
                    : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span>Memory Vault ({memories.length})</span>
              </button>
            </div>

            {/* Content Scroll */}
            <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1 text-xs">
              {activeTab === 'providers' && <AIProviderSettingsTab />}

              {activeTab === 'browser' && <BrowserSettingsTab onOpenSandbox={onOpenSandbox} />}

              {activeTab === 'config' && (
                <>
                  {/* Personality Summary */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex items-center space-x-2 text-blue-400 font-bold uppercase text-[10px] tracking-widest">
                      <Sparkles className="w-4 h-4" />
                      <span>Personality Profile</span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed text-xs">
                      <strong>शाश्वत</strong> is a confident, witty, charming, and smart AI assistant. He possesses persistent long-term personal memory and responds naturally in Hindi, English, and Hinglish.
                    </p>
                  </div>

                  {/* Mood Selector */}
                  <div>
                    <label className="block text-zinc-400 font-bold text-[10px] tracking-widest uppercase mb-2.5">
                      Assistant Mood & Tone
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {moodsList.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => onChangeMood(m.id)}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-start space-x-2.5 ${
                            currentMood === m.id
                              ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg'
                              : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-base">{m.icon}</span>
                          <div>
                            <div className="font-bold text-xs uppercase tracking-wider">{m.label}</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">{m.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Tools & Function Calling */}
                  <div>
                    <label className="block text-zinc-400 font-bold text-[10px] tracking-widest uppercase mb-2 flex items-center justify-between">
                      <span>Available Browser & Memory Tools</span>
                      <Wrench className="w-3.5 h-3.5 text-blue-400" />
                    </label>
                    <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="font-mono text-xs text-blue-400">openWebsite / search_web</span>
                        <button
                          onClick={() => onTriggerTestTool('openWebsite')}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[10px] font-bold tracking-wider uppercase"
                        >
                          Test
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="font-mono text-xs text-purple-400">remember_fact / memory_vault</span>
                        <button
                          onClick={() => setActiveTab('memory')}
                          className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[10px] font-bold tracking-wider uppercase"
                        >
                          View Vault
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="font-mono text-xs text-cyan-400">showVisualCard</span>
                        <button
                          onClick={() => onTriggerTestTool('showVisualCard')}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold tracking-wider uppercase"
                        >
                          Test
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Voice Identity & Biometrics Status */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900 border border-blue-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-blue-400 font-bold uppercase text-[10px] tracking-widest">
                        <ShieldCheck className="w-4 h-4 text-blue-400" />
                        <span>Voice Identity & Speaker Biometrics</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                        Active Protection
                      </span>
                    </div>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      Speaker recognition checks incoming audio features to recognize the registered owner and protect private memory from unknown speakers.
                    </p>
                  </div>

                  {/* Technical Specifications */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/10 space-y-1.5 text-[10px] font-mono tracking-wider text-zinc-400 uppercase">
                    <div className="flex justify-between">
                      <span>Gemini Model:</span>
                      <span className="text-zinc-200">gemini-3.1-flash-live-preview</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory System:</span>
                      <span className="text-purple-400 font-bold">SHAASHVAT Persistent v1</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Voice Identity:</span>
                      <span className="text-blue-400 font-bold">Biometrics Engined (24-Band MFCC)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Voice Avatar:</span>
                      <span className="text-zinc-200">Puck (Male)</span>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'memory' && (
                /* Memory Vault Tab */
                <div className="space-y-4">
                  {/* Explanation Banner */}
                  <div className="p-3.5 rounded-2xl bg-purple-900/20 border border-purple-500/30 text-purple-200 flex items-start space-x-3">
                    <Brain className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <strong className="text-white block mb-0.5 font-bold uppercase tracking-wider text-[11px]">
                        Persistent Long-Term Memory System
                      </strong>
                      शाश्वत remembers important personal facts, project status, and communication preferences across conversations. You have full transparency and control over what is saved.
                    </div>
                  </div>

                  {/* Category Filter & Add Button */}
                  <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                    <div className="flex items-center space-x-1.5">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'identity', label: 'Identity' },
                        { id: 'preferences', label: 'Preferences' },
                        { id: 'projects', label: 'Projects' },
                        { id: 'relationships', label: 'Relationships' },
                        { id: 'education', label: 'Education' },
                        { id: 'career', label: 'Career' },
                        { id: 'habits', label: 'Habits' },
                        { id: 'goals', label: 'Goals' },
                        { id: 'skills', label: 'Skills' },
                        { id: 'important_dates', label: 'Dates' },
                        { id: 'favorites', label: 'Favorites' },
                        { id: 'devices', label: 'Devices' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setFilterCategory(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all ${
                            filterCategory === cat.id
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setIsAdding(!isAdding)}
                      className="px-3 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-[10px] font-bold tracking-wider uppercase flex items-center space-x-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Fact</span>
                    </button>
                  </div>

                  {/* Add Fact Form */}
                  <AnimatePresence>
                    {isAdding && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleAddFact}
                        className="p-3.5 rounded-2xl bg-zinc-900 border border-white/10 space-y-3 overflow-hidden"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-300 uppercase tracking-wider">
                          <span>Save New Memory Fact</span>
                          <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="text-zinc-500 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] text-zinc-400 font-semibold mb-1">Category</label>
                            <select
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                            >
                              <option value="identity">Identity</option>
                              <option value="preferences">Preferences</option>
                              <option value="projects">Projects</option>
                              <option value="relationships">Relationships</option>
                              <option value="education">Education</option>
                              <option value="career">Career</option>
                              <option value="habits">Habits</option>
                              <option value="goals">Goals</option>
                              <option value="skills">Skills</option>
                              <option value="important_dates">Important Dates</option>
                              <option value="favorites">Favorites</option>
                              <option value="devices">Devices</option>
                              <option value="conversation_history">Conversation History</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] text-zinc-400 font-semibold mb-1">Importance</label>
                            <select
                              value={newImportance}
                              onChange={(e) => setNewImportance(e.target.value as 'HIGH' | 'MEDIUM' | 'LOW')}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                            >
                              <option value="HIGH">HIGH (Permanent)</option>
                              <option value="MEDIUM">MEDIUM (Preference)</option>
                              <option value="LOW">LOW (Temporary)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] text-zinc-400 font-semibold mb-1">Key / Subject</label>
                            <input
                              type="text"
                              placeholder="e.g. Profession"
                              value={newKey}
                              onChange={(e) => setNewKey(e.target.value)}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-zinc-400 font-semibold mb-1">Detail / Fact</label>
                          <input
                            type="text"
                            placeholder="e.g. Rahul prefers Cursor IDE and dark mode."
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="flex justify-end space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="px-3 py-1 rounded-xl bg-white/5 text-zinc-400 text-xs font-semibold hover:bg-white/10"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 shadow-lg shadow-purple-600/30"
                          >
                            Remember Fact
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Fact List */}
                  <div className="space-y-2">
                    {filteredMemories.length === 0 ? (
                      <div className="text-center py-8 text-zinc-500 text-xs">
                        No stored memories found in this category.
                      </div>
                    ) : (
                      filteredMemories.map((m) => (
                        <div
                          key={m.id}
                          className="p-3 rounded-2xl bg-zinc-900/80 border border-white/10 flex items-start justify-between space-x-3 hover:border-purple-500/40 transition-all"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-purple-400 shrink-0 mt-0.5">
                              {m.category === 'personal' && <User className="w-4 h-4 text-blue-400" />}
                              {m.category === 'project' && <FolderGit2 className="w-4 h-4 text-emerald-400" />}
                              {m.category === 'preference' && <Bookmark className="w-4 h-4 text-amber-400" />}
                              {m.category === 'conversation' && <RefreshCw className="w-4 h-4 text-purple-400" />}
                            </div>

                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-white text-xs">{m.key}</span>
                                <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                                  {m.category}
                                </span>
                                <span
                                  className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                                    m.importance === 'HIGH'
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                      : m.importance === 'MEDIUM'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                                  }`}
                                >
                                  {m.importance || 'HIGH'}
                                </span>
                              </div>
                              <p className="text-zinc-300 text-xs mt-1 leading-relaxed">{m.value}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteFact(m.key)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                            title="Forget this fact"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Clear Memory Button */}
                  {memories.length > 0 && (
                    <div className="pt-2 border-t border-white/10 flex justify-end">
                      <button
                        onClick={handleClearAllMemory}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear All Memory</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

