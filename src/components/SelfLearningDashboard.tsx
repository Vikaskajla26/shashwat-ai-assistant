import React, { useState, useEffect } from 'react';
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  Zap,
  RotateCcw,
  ShieldCheck,
  Download,
  X,
  Sparkles,
  Activity,
  Cpu,
  Terminal,
  FileCode,
  FileCheck,
  Search,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  HelpCircle,
  Play
} from 'lucide-react';
import {
  LearningSystemState,
  TaskRecord,
  ErrorRecord,
  SolutionRecord,
  WorkflowSequence,
  UserPreference,
  CodeImprovementProposal,
  explainDecisionRationale
} from '../../server/selfLearningEngine';
import {
  getStoredLearningState,
  saveStoredLearningState,
  resetStoredLearningState,
  exportLearningDatabase
} from '../utils/selfLearningStorage';

interface SelfLearningDashboardProps {
  onClose: () => void;
}

export const SelfLearningDashboard: React.FC<SelfLearningDashboardProps> = ({ onClose }) => {
  const [learningState, setLearningState] = useState<LearningSystemState>(getStoredLearningState());
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'errors' | 'solutions' | 'workflows' | 'proposals'>('overview');
  const [explainQuery, setExplainQuery] = useState<string>('Playwright Chromium Browser Launch');
  const [explainResponse, setExplainResponse] = useState<string>('');

  useEffect(() => {
    saveStoredLearningState(learningState);
  }, [learningState]);

  const handleReset = () => {
    resetStoredLearningState();
    setLearningState(getStoredLearningState());
  };

  const handleExport = () => {
    exportLearningDatabase(learningState);
  };

  const runExplainabilityQuery = () => {
    const rationale = explainDecisionRationale(explainQuery, learningState);
    setExplainResponse(rationale);
  };

  const approveProposal = (id: string) => {
    setLearningState((prev) => ({
      ...prev,
      proposals: prev.proposals.map((p) => (p.id === id ? { ...p, status: 'APPROVED' } : p)),
    }));
  };

  const rollbackProposal = (id: string) => {
    setLearningState((prev) => ({
      ...prev,
      proposals: prev.proposals.map((p) => (p.id === id ? { ...p, status: 'ROLLED_BACK' } : p)),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fadeIn font-sans">
      <div className="relative w-full max-w-6xl h-[92vh] bg-[#05070d]/90 border border-white/14 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Self Learning Engine (आत्म-शिक्षा तन्त्र)</h2>
              <p className="text-xs text-amber-400/80">Autonomous Workflow Optimization • Error Memory • Root Cause Analysis</p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Export DB
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Memory
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metric Cards Top Row */}
        <div className="p-6 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white">{learningState.tasksCompleted}</div>
              <div className="text-[11px] text-gray-400 font-medium">Tasks Completed</div>
            </div>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white">{learningState.lessonsLearnedCount}</div>
              <div className="text-[11px] text-gray-400 font-medium">Lessons Learned</div>
            </div>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white">{learningState.commonErrorsCount}</div>
              <div className="text-[11px] text-gray-400 font-medium">Common Errors</div>
            </div>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-emerald-400">{learningState.overallConfidenceScore}%</div>
              <div className="text-[11px] text-gray-400 font-medium">System Confidence</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2 flex items-center gap-2 border-b border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'overview'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Activity className="inline w-3.5 h-3.5 mr-1.5" /> Philosophy & Flow
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'tasks'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock className="inline w-3.5 h-3.5 mr-1.5" /> Task History
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'errors'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="inline w-3.5 h-3.5 mr-1.5" /> Error Analyzer
          </button>
          <button
            onClick={() => setActiveTab('solutions')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'solutions'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="inline w-3.5 h-3.5 mr-1.5" /> Verified Solutions
          </button>
          <button
            onClick={() => setActiveTab('workflows')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'workflows'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="inline w-3.5 h-3.5 mr-1.5" /> Macro Workflows
          </button>
          <button
            onClick={() => setActiveTab('proposals')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'proposals'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileCode className="inline w-3.5 h-3.5 mr-1.5" /> Explainability & Code Diff
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW & CORE PHILOSOPHY */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Philosophy Pipeline Diagram */}
              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-amber-400" /> Core Autonomous Learning Cycle
                </h3>
                <p className="text-xs text-gray-400">
                  The AI never blindly mutates production code. It operates on a strict observation, root-cause validation, and user approval protocol.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 pt-2 text-center text-xs font-semibold">
                  {['Observe', 'Analyze', 'Hypothesize', 'Validate', 'Learn', 'Apply', 'Monitor', 'Improve'].map((step, idx) => (
                    <div key={idx} className="p-3 bg-black/40 border border-amber-500/30 rounded-xl text-amber-300 shadow">
                      <div className="text-[10px] text-gray-500 uppercase">Step {idx + 1}</div>
                      <div className="mt-1">{step}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explainability Query Box */}
              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-cyan-400" /> Explainability Engine: "Why Did You Do That?"
                </h3>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={explainQuery}
                    onChange={(e) => setExplainQuery(e.target.value)}
                    placeholder="Ask why a specific decision was made..."
                    className="flex-1 bg-black/60 border border-white/20 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={runExplainabilityQuery}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow"
                  >
                    Explain Decision
                  </button>
                </div>

                {explainResponse && (
                  <div className="p-4 bg-black/50 border border-cyan-500/30 rounded-2xl text-xs text-cyan-200 font-mono leading-relaxed">
                    💬 {explainResponse}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TASK MEMORY */}
          {activeTab === 'tasks' && (
            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-white">Task Memory & Execution History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 uppercase font-bold">
                      <th className="p-3">Task Name</th>
                      <th className="p-3">User Command</th>
                      <th className="p-3">Duration</th>
                      <th className="p-3">Tools Used</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-200">
                    {learningState.taskHistory.map((t) => (
                      <tr key={t.id}>
                        <td className="p-3 font-bold text-amber-300">{t.taskName}</td>
                        <td className="p-3 italic text-gray-300">"{t.userCommand}"</td>
                        <td className="p-3 font-mono text-cyan-300">{t.executionTimeMs} ms</td>
                        <td className="p-3 font-mono text-purple-300 text-[11px]">{t.toolsUsed.join(', ')}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-semibold">
                            PASSED
                          </span>
                        </td>
                        <td className="p-3 font-bold text-emerald-400">{t.confidenceScore}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ERROR ANALYZER */}
          {activeTab === 'errors' && (
            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-white">Error Memory & Root Cause Analyzer</h3>
              <div className="space-y-3">
                {learningState.errorLog.map((e) => (
                  <div key={e.id} className="p-4 bg-black/50 border border-rose-500/30 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-300">{e.taskName} ({e.exceptionName})</span>
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono font-semibold">
                        Category: {e.category}
                      </span>
                    </div>
                    <p className="text-gray-300">Root Cause: {e.rootCauseReason}</p>
                    <p className="text-emerald-300 font-semibold">Suggested Fix: {e.suggestedFix}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: VERIFIED SOLUTIONS */}
          {activeTab === 'solutions' && (
            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-white">Verified Solution Memory</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {learningState.solutions.map((s) => (
                  <div key={s.id} className="p-4 bg-black/50 border border-emerald-500/30 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300">{s.problemKey}</span>
                      <span className="font-bold text-emerald-400">{s.confidenceScore}% Confidence</span>
                    </div>
                    <p className="text-gray-300">{s.problemDescription}</p>
                    <p className="text-cyan-300 font-mono">Action: {s.solutionAction}</p>
                    <div className="text-[11px] text-gray-500">Verified {s.timesVerified} times • Last Used: {s.lastUsedTimestamp}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: WORKFLOW OPTIMIZATION */}
          {activeTab === 'workflows' && (
            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-white">Learned Macro Workflows & Sequences</h3>
              <div className="space-y-3">
                {learningState.workflows.map((w) => (
                  <div key={w.id} className="p-4 bg-black/50 border border-purple-500/30 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300">{w.sequenceName}</span>
                      <span className="text-gray-400">Repeated {w.frequencyCount} times</span>
                    </div>
                    <p className="text-gray-300">Steps: {w.orderedSteps.join(' ➔ ')}</p>
                    <p className="text-amber-300 italic">"{w.suggestedMacro}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: EXPLAINABILITY & PROPOSALS */}
          {activeTab === 'proposals' && (
            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-white">Safe Improvement Engine & Code Proposals</h3>
              <p className="text-xs text-gray-400">
                Code modifications generate explicit diff proposals and require user confirmation before applying to production files.
              </p>

              {learningState.proposals.length === 0 ? (
                <div className="p-6 bg-black/40 border border-white/10 rounded-2xl text-center text-xs text-gray-400">
                  No pending code improvement proposals. System operating within optimal performance parameters.
                </div>
              ) : (
                <div className="space-y-4">
                  {learningState.proposals.map((p) => (
                    <div key={p.id} className="p-4 bg-black/50 border border-white/14 rounded-2xl space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-purple-300">{p.targetFile}</span>
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-semibold">
                          Risk: {p.riskAssessment}
                        </span>
                      </div>
                      <p className="text-gray-300">{p.explanation}</p>
                      <pre className="p-3 bg-black/80 rounded-xl font-mono text-[11px] text-emerald-300 overflow-x-auto">
                        {p.diffContent}
                      </pre>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => approveProposal(p.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold"
                        >
                          Approve Code Diff
                        </button>
                        <button
                          onClick={() => rollbackProposal(p.id)}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold"
                        >
                          Reject / Rollback
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
