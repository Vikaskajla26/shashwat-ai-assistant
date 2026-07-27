import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe,
  Lock,
  Plus,
  X,
  RotateCw,
  Sparkles,
  Layers,
  Cpu,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShoppingBag,
  BookOpen,
  Mail,
  ShieldCheck,
  Search,
  ExternalLink,
  Bot,
  Download,
  Terminal,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { SandboxTab, TaskExecutionPlan, SandboxMode, SandboxDownload } from '../types';
import { openExternalUrl } from '../utils/browser';

interface AISandboxBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  activePlan?: TaskExecutionPlan | null;
  onExecutePrompt?: (prompt: string) => void;
  onUserConfirmAction?: (confirmed: boolean) => void;
}

const DEFAULT_TABS: SandboxTab[] = [
  {
    id: 'tab-1',
    title: 'Google Search - Best Laptops 2026',
    url: 'https://www.google.com/search?q=best+laptops+2026',
    active: true,
    contentSummary: 'Parsed 42 DOM nodes. Found top reviews from Wirecutter, Verge, and CNET.',
    domNodesCount: 1840,
    extractedData: {
      query: 'best laptops 2026',
      resultsCount: 8,
      topPick: 'MacBook Pro M4 / Dell XPS 16 / Lenovo ThinkPad X1',
    },
  },
  {
    id: 'tab-2',
    title: 'Wirecutter - Best Laptops Review',
    url: 'https://www.nytimes.com/wirecutter/reviews/best-laptop',
    active: false,
    contentSummary: 'Extracted benchmark comparison specs, battery life tests, and thermal ratings.',
    domNodesCount: 2420,
    extractedData: {
      batteryAverage: '16.5 hours',
      bestOverall: 'MacBook Air M3 / M4',
      bestWindows: 'Dell XPS 14 OLED',
    },
  },
  {
    id: 'tab-3',
    title: 'Amazon - Product Price Comparison',
    url: 'https://www.amazon.com/s?k=macbook+pro+m4',
    active: false,
    contentSummary: 'Isolated live prices, deal badges, and user review sentiment scores.',
    domNodesCount: 3110,
    extractedData: {
      inStock: true,
      priceRange: '$1,299 - $1,999',
      rating: '4.8 / 5.0 stars (1,420 ratings)',
    },
  },
];

const DEFAULT_PLAN: TaskExecutionPlan = {
  id: 'plan-101',
  goal: 'Search best laptops 2026, compare top 3 models, extract live specs, and summarize best recommendations.',
  mode: 'research',
  currentStepIndex: 1,
  status: 'executing',
  steps: [
    {
      id: 'step-1',
      label: 'Initialize isolated sandbox & search Google',
      status: 'completed',
      detail: 'HTTP 200 OK - 8 relevant links harvested',
    },
    {
      id: 'step-2',
      label: 'Parallel multi-tab extraction (Wirecutter & Amazon)',
      status: 'in_progress',
      detail: 'Parsing DOM accessibility tree & price tables...',
    },
    {
      id: 'step-3',
      label: 'Synthesize specifications & cross-verify benchmarks',
      status: 'pending',
      detail: 'Compare battery life, thermals, and display accuracy',
    },
    {
      id: 'step-4',
      label: 'Formulate final recommendation report for user',
      status: 'pending',
      detail: 'Generate structured visual card & spoken summary',
    },
  ],
  findingsSummary:
    'Top contender: MacBook Air/Pro M4 leads battery life (18 hrs) and single-core benchmarks. Best Windows alternative: Dell XPS 14 with Copilot+ OLED screen.',
};

export const AISandboxBrowser: React.FC<AISandboxBrowserProps> = ({
  isOpen,
  onClose,
  activePlan = DEFAULT_PLAN,
  onExecutePrompt,
  onUserConfirmAction,
}) => {
  const [tabs, setTabs] = useState<SandboxTab[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [mode, setMode] = useState<SandboxMode>('research');
  const [inputUrl, setInputUrl] = useState<string>('https://www.google.com/search?q=best+laptops+2026');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [promptInput, setPromptInput] = useState<string>('');

  const currentTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const plan = activePlan || DEFAULT_PLAN;

  const handleSelectTab = (id: string) => {
    setTabs((prev) => prev.map((t) => ({ ...t, active: t.id === id })));
    setActiveTabId(id);
    const target = tabs.find((t) => t.id === id);
    if (target) setInputUrl(target.url);
  };

  const handleCloseTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const filtered = tabs.filter((t) => t.id !== id);
    setTabs(filtered);
    if (activeTabId === id) {
      const next = filtered[0];
      setActiveTabId(next.id);
      setInputUrl(next.url);
    }
  };

  const handleAddTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: SandboxTab = {
      id: newId,
      title: 'New Sandbox Workspace',
      url: 'https://www.google.com',
      active: true,
      contentSummary: 'Isolated sandbox tab ready for शाश्वत instruction.',
      domNodesCount: 120,
    };
    setTabs((prev) => [...prev.map((t) => ({ ...t, active: false })), newTab]);
    setActiveTabId(newId);
    setInputUrl(newTab.url);
  };

  const handleNavigateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let url = inputUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.')) {
        url = 'https://' + url;
      } else {
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
    }
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, url, title: url, isLoading: true } : t
      )
    );
    setTimeout(() => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, isLoading: false, contentSummary: `Successfully loaded DOM tree from ${url}` }
            : t
        )
      );
    }, 600);
  };

  const handleRunTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    if (onExecutePrompt) {
      onExecutePrompt(promptInput);
    } else {
      // Simulate creating a new sandbox task
      handleAddTab();
      setInputUrl(`https://www.google.com/search?q=${encodeURIComponent(promptInput)}`);
    }
    setPromptInput('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={`fixed z-50 bg-[#07090e]/95 border border-blue-500/30 backdrop-blur-2xl shadow-[0_0_80px_rgba(37,99,235,0.25)] flex flex-col overflow-hidden font-sans text-zinc-200 transition-all ${
          isExpanded
            ? 'inset-3 rounded-2xl'
            : 'top-16 bottom-12 left-4 right-4 sm:left-12 sm:right-12 lg:left-20 lg:right-20 rounded-2xl'
        }`}
      >
        {/* Top Title Bar & Window Controls */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-black/60 border-b border-white/10 select-none">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block cursor-pointer" onClick={onClose} />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>

            <div className="h-4 w-[1px] bg-white/10" />

            <div className="flex items-center space-x-2 text-xs font-mono font-bold tracking-wider text-blue-400 uppercase">
              <Bot className="w-4 h-4 text-blue-400 animate-pulse" />
              <span>शाश्वत AUTONOMOUS BROWSER WORKSPACE</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px]">
                SANDBOX ISOLATED
              </span>
            </div>
          </div>

          {/* Controls Right */}
          <div className="flex items-center space-x-3">
            {/* Mode Selector */}
            <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 text-[10px] font-mono">
              <button
                onClick={() => setMode('research')}
                className={`px-2.5 py-1 rounded flex items-center space-x-1 transition-all ${
                  mode === 'research' ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>RESEARCH</span>
              </button>
              <button
                onClick={() => setMode('shopping')}
                className={`px-2.5 py-1 rounded flex items-center space-x-1 transition-all ${
                  mode === 'shopping' ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-3 h-3" />
                <span>SHOPPING</span>
              </button>
              <button
                onClick={() => setMode('email')}
                className={`px-2.5 py-1 rounded flex items-center space-x-1 transition-all ${
                  mode === 'email' ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Mail className="w-3 h-3" />
                <span>WORKFLOW</span>
              </button>
              <button
                onClick={() => setMode('general')}
                className={`px-2.5 py-1 rounded flex items-center space-x-1 transition-all ${
                  mode === 'general' ? 'bg-cyan-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>ARCHITECTURE</span>
              </button>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title={isExpanded ? 'Restore Window' : 'Maximize Window'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 transition-colors"
              title="Close Workspace"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Multi-Tab Bar Engine */}
        <div className="flex items-center px-2 pt-2 bg-[#0a0d14] border-b border-white/10 space-x-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`group relative flex items-center space-x-2 px-3.5 py-2 rounded-t-lg text-xs font-medium cursor-pointer transition-all max-w-[220px] select-none border-t border-x ${
                tab.active
                  ? 'bg-[#111622] text-blue-300 border-blue-500/40 shadow-md'
                  : 'bg-black/30 text-zinc-400 border-transparent hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              <Globe className={`w-3.5 h-3.5 shrink-0 ${tab.active ? 'text-blue-400' : 'text-zinc-500'}`} />
              <span className="truncate">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/20 text-zinc-400 hover:text-white transition-opacity ml-auto"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={handleAddTab}
            className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Open New Sandbox Tab"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation URL Bar & AI Task Bar */}
        <div className="p-3 bg-[#0d121d] border-b border-white/10 flex flex-col md:flex-row items-center gap-3">
          {/* Address Bar */}
          <form onSubmit={handleNavigateSubmit} className="flex-1 flex items-center bg-black/60 border border-white/10 rounded-xl px-3 py-2 space-x-2 focus-within:border-blue-500/80 transition-colors w-full">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none w-full font-mono"
              placeholder="Enter URL or search query..."
            />
            <button type="submit" className="text-zinc-400 hover:text-white p-1">
              <RotateCw className={`w-3.5 h-3.5 ${currentTab.isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </form>

          {/* Quick Natural Language Prompt Bar for शाश्वत */}
          <form onSubmit={handleRunTaskSubmit} className="flex-1 flex items-center bg-blue-950/30 border border-blue-500/30 rounded-xl px-3 py-2 space-x-2 focus-within:border-blue-400 w-full">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-pulse" />
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-blue-300/50 focus:outline-none w-full font-sans"
              placeholder='Tell शाश्वत what to do in sandbox (e.g., "Search best laptops and compare prices")'
            />
            <button
              type="submit"
              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer transition-all flex items-center space-x-1 shrink-0"
            >
              <span>Instruct</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </form>
        </div>

        {/* Main Content Split View: Left Planner Sidebar & Right Live Sandbox Viewport */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#05070a]">
          {/* Left Panel: Autonomous Execution Planner & Visual Memory */}
          <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#0a0d14]/90 p-4 flex flex-col space-y-4 overflow-y-auto scrollbar-thin">
            {/* Goal Banner */}
            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">
                <span className="flex items-center space-x-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>AUTONOMOUS PLANNER</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  {plan.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs font-semibold text-white leading-relaxed">{plan.goal}</p>
            </div>

            {/* Execution Pipeline Steps */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>EXECUTION PIPELINE</span>
                <span>STEP {plan.currentStepIndex + 1} OF {plan.steps.length}</span>
              </div>

              <div className="space-y-2">
                {plan.steps.map((step, idx) => {
                  const isCurrent = idx === plan.currentStepIndex;
                  const isDone = step.status === 'completed';
                  return (
                    <div
                      key={step.id}
                      className={`p-2.5 rounded-xl border text-xs transition-all ${
                        isCurrent
                          ? 'bg-blue-900/20 border-blue-500/60 shadow-lg shadow-blue-500/10'
                          : isDone
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-zinc-300'
                          : 'bg-white/[0.02] border-white/5 text-zinc-500'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : isCurrent ? (
                          <RotateCw className="w-4 h-4 text-blue-400 animate-spin shrink-0 mt-0.5" />
                        ) : (
                          <Clock className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-0.5">
                          <div className={`font-medium ${isCurrent ? 'text-blue-200' : 'text-zinc-200'}`}>
                            {step.label}
                          </div>
                          {step.detail && (
                            <div className="text-[10px] text-zinc-400 font-mono leading-tight">
                              {step.detail}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Extracted Findings Matrix */}
            {plan.findingsSummary && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="w-3 h-3" />
                  <span>SYNTHESIZED INSIGHTS</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">{plan.findingsSummary}</p>
              </div>
            )}

            {/* Self-Healing Status Badge */}
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>SELF-HEALING ACTIVE</span>
              </div>
              <p className="text-[10px] text-emerald-400/80 leading-normal font-sans">
                Automatic selector recovery & dynamic DOM parsing enabled. Anti-bot block bypass engaged.
              </p>
            </div>
          </div>

          {/* Right Panel: Live Sandbox Viewport & DOM Inspector */}
          <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto scrollbar-thin bg-gradient-to-br from-black/80 via-[#070b12] to-black/90">
            {/* Page DOM & Visual Extraction Card */}
            <div className="flex-1 rounded-2xl bg-black/60 border border-white/10 p-5 space-y-4 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-white">{currentTab.title}</span>
                </div>
                <div className="flex items-center space-x-2 text-[10px] font-mono text-zinc-400">
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                    DOM Nodes: {currentTab.domNodesCount || 1200}
                  </span>
                  <button
                    onClick={() => openExternalUrl(currentTab.url, '_blank')}
                    className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Inspect Target</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Simulated Live Web Content Frame */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-2">
                  <div className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest flex items-center space-x-1">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>AI DOM PARSER SUMMARY</span>
                  </div>
                  <p className="text-xs text-zinc-200 leading-relaxed font-mono">
                    {currentTab.contentSummary || 'Active DOM tree analyzed. No blocking elements detected.'}
                  </p>
                </div>

                {/* Structured Data Extraction Cards */}
                {currentTab.extractedData && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(currentTab.extractedData).map(([key, val]) => (
                      <div key={key} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                        <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </div>
                        <div className="text-xs font-semibold text-white truncate">{String(val)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Simulated Product Specs Comparison Table when in shopping mode */}
                {mode === 'shopping' && (
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 space-y-3">
                    <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                      TOP COMPARISON MATRIX (AUTOMATED)
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-white/10 text-zinc-400">
                            <th className="pb-2">Model</th>
                            <th className="pb-2">Processor</th>
                            <th className="pb-2">Battery</th>
                            <th className="pb-2">Price</th>
                            <th className="pb-2">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-zinc-200">
                          <tr>
                            <td className="py-2 font-bold text-blue-300">Apple MacBook Air M3</td>
                            <td>Apple M3 8-core</td>
                            <td>18 hours</td>
                            <td className="text-emerald-400">$1,099</td>
                            <td className="text-amber-300">9.4/10</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-bold text-blue-300">Dell XPS 14 OLED</td>
                            <td>Intel Core Ultra 7</td>
                            <td>13 hours</td>
                            <td className="text-emerald-400">$1,449</td>
                            <td className="text-amber-300">9.1/10</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-bold text-blue-300">Lenovo ThinkPad X1 Carbon</td>
                            <td>Intel Core Ultra 7</td>
                            <td>14.5 hours</td>
                            <td className="text-emerald-400">$1,599</td>
                            <td className="text-amber-300">8.9/10</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmation Popup Trigger inside Browser if sensitive task is pending */}
              {plan.requiresUserConfirmation && (
                <div className="mt-4 p-4 rounded-xl bg-rose-950/40 border border-rose-500/60 space-y-3 shadow-2xl animate-pulse">
                  <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>SECURITY VAULT CONFIRMATION REQUIRED</span>
                  </div>
                  <p className="text-xs text-zinc-200 leading-relaxed">
                    {plan.confirmationAction || 'शाश्वat is requesting permission to execute an action on your behalf.'}
                  </p>
                  <div className="flex items-center space-x-3 pt-1">
                    <button
                      onClick={() => onUserConfirmAction && onUserConfirmAction(true)}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-all"
                    >
                      Confirm Action
                    </button>
                    <button
                      onClick={() => onUserConfirmAction && onUserConfirmAction(false)}
                      className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer transition-all"
                    >
                      Deny / Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
