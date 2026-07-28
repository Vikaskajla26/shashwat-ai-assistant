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
  Clock,
  Layers,
  HelpCircle,
  Play,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import type {
  FourSystemsLearningState,
  TaskExperienceRecord,
  ErrorIntelligenceRecord,
  VerifiedFixRecord,
  WorkflowSequence,
  ImprovementProposal
} from '../../server/selfLearningEngine';
import {
  getStoredFourSystemsState,
  saveStoredFourSystemsState,
  resetStoredFourSystemsState,
  exportFourSystemsDatabase,
  fetchLiveLearningState
} from '../utils/selfLearningStorage';

interface SelfLearningDashboardProps {
  onClose: () => void;
}

export const SelfLearningDashboard: React.FC<SelfLearningDashboardProps> = ({ onClose }) => {
  const [learningState, setLearningState] = useState<FourSystemsLearningState>(getStoredFourSystemsState());
  const [activeSystemTab, setActiveSystemTab] = useState<'system1' | 'system2' | 'system3' | 'system4'>('system1');
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchLiveLearningState().then((state) => {
      if (mounted) {
        setLearningState(state);
        setIsLive(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    saveStoredFourSystemsState(learningState);
  }, [learningState]);

  const handleReset = () => {
    resetStoredFourSystemsState();
    setLearningState(getStoredFourSystemsState());
  };

  const handleExport = () => {
    exportFourSystemsDatabase(learningState);
  };

  const promoteImprovement = (id: string) => {
    setLearningState((prev) => ({
      ...prev,
      system4ImprovementEngine: {
        ...prev.system4ImprovementEngine,
        proposals: prev.system4ImprovementEngine.proposals.map((p) =>
          p.id === id ? { ...p, status: 'PROMOTED', promotedTimestamp: new Date().toLocaleString() } : p
        ),
      },
    }));
  };

  const rollbackImprovement = (id: string) => {
    setLearningState((prev) => ({
      ...prev,
      system4ImprovementEngine: {
        ...prev.system4ImprovementEngine,
        proposals: prev.system4ImprovementEngine.proposals.map((p) =>
          p.id === id ? { ...p, status: 'ROLLED_BACK' } : p
        ),
      },
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fadeIn font-sans">
      <div className="relative w-full max-w-6xl h-[92vh] bg-[#05070d]/90 border border-white/14 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-purple-600 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">Four Cooperating Systems (आत्म-शिक्षा तन्त्र)</h2>
                {isLive && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-400/80">Experience Memory • Error Intelligence • Workflow Learning • Improvement Engine</p>
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

        {/* 4 Systems Header Metrics Grid */}
        <div className="p-6 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            onClick={() => setActiveSystemTab('system1')}
            className={`p-4 border rounded-2xl cursor-pointer transition-all ${
              activeSystemTab === 'system1'
                ? 'bg-cyan-500/15 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider">System 1</div>
            <div className="text-lg font-extrabold text-white mt-1">Experience Memory</div>
            <div className="text-[11px] text-gray-400">{learningState.system1ExperienceMemory.totalTasksExecuted} tasks recorded</div>
          </div>

          <div
            onClick={() => setActiveSystemTab('system2')}
            className={`p-4 border rounded-2xl cursor-pointer transition-all ${
              activeSystemTab === 'system2'
                ? 'bg-rose-500/15 border-rose-500/40 shadow-lg shadow-rose-500/10'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="text-xs text-rose-400 font-bold uppercase tracking-wider">System 2</div>
            <div className="text-lg font-extrabold text-white mt-1">Error Intelligence</div>
            <div className="text-[11px] text-gray-400">{learningState.system2ErrorIntelligence.totalErrorsAnalyzed} root-causes analyzed</div>
          </div>

          <div
            onClick={() => setActiveSystemTab('system3')}
            className={`p-4 border rounded-2xl cursor-pointer transition-all ${
              activeSystemTab === 'system3'
                ? 'bg-purple-500/15 border-purple-500/40 shadow-lg shadow-purple-500/10'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="text-xs text-purple-400 font-bold uppercase tracking-wider">System 3</div>
            <div className="text-lg font-extrabold text-white mt-1">Workflow Learning</div>
            <div className="text-[11px] text-gray-400">{learningState.system3WorkflowLearning.learnedHabitsCount} habits & macros</div>
          </div>

          <div
            onClick={() => setActiveSystemTab('system4')}
            className={`p-4 border rounded-2xl cursor-pointer transition-all ${
              activeSystemTab === 'system4'
                ? 'bg-emerald-500/15 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">System 4</div>
            <div className="text-lg font-extrabold text-white mt-1">Improvement Engine</div>
            <div className="text-[11px] text-emerald-400 font-semibold">{learningState.system4ImprovementEngine.overallSystemHealth}% System Health</div>
          </div>
        </div>

        {/* Tab View Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SYSTEM 1: EXPERIENCE MEMORY */}
          {activeSystemTab === 'system1' && (
            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-cyan-400" /> System 1: Experience Memory (अनुभव स्मृति)
                  </h3>
                  <p className="text-xs text-gray-400">Records every task, execution timing, tools used, and outcome context.</p>
                </div>
                <div className="text-xs font-mono text-cyan-300 bg-cyan-500/20 px-3 py-1 rounded-xl">
                  Avg Duration: {learningState.system1ExperienceMemory.avgExecutionTimeMs} ms
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 uppercase font-bold">
                      <th className="p-3">Task Name</th>
                      <th className="p-3">User Command</th>
                      <th className="p-3">Context</th>
                      <th className="p-3">Duration</th>
                      <th className="p-3">Tools Used</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-200">
                    {learningState.system1ExperienceMemory.experiences.map((exp) => (
                      <tr key={exp.id}>
                        <td className="p-3 font-bold text-cyan-300">{exp.taskName}</td>
                        <td className="p-3 italic text-gray-300">"{exp.userCommand}"</td>
                        <td className="p-3 text-gray-400">{exp.context}</td>
                        <td className="p-3 font-mono text-cyan-300">{exp.executionTimeMs} ms</td>
                        <td className="p-3 font-mono text-purple-300 text-[11px]">{exp.toolsUsed.join(', ')}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-semibold">
                            SUCCESS
                          </span>
                        </td>
                        <td className="p-3 font-bold text-emerald-400">{exp.confidenceScore}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SYSTEM 2: ERROR INTELLIGENCE */}
          {activeSystemTab === 'system2' && (
            <div className="space-y-6">
              {/* Root Cause Analyzer Logs */}
              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" /> System 2: Error Intelligence & Root Cause Analysis
                </h3>
                <div className="space-y-3">
                  {learningState.system2ErrorIntelligence.errorLogs.map((e) => (
                    <div key={e.id} className="p-4 bg-black/50 border border-rose-500/30 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-300">{e.taskName} ({e.exceptionName})</span>
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono font-semibold">
                          Category: {e.category} (Occurrences: {e.occurrencesCount})
                        </span>
                      </div>
                      <p className="text-gray-300">Root Cause: {e.rootCauseReason}</p>
                      <p className="text-emerald-300 font-semibold">Suggested Fix: {e.suggestedFix}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verified Fixes Memory */}
              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" /> Verified Fixes Memory
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {learningState.system2ErrorIntelligence.verifiedFixes.map((f) => (
                    <div key={f.id} className="p-4 bg-black/50 border border-emerald-500/30 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-300">{f.problemKey}</span>
                        <span className="font-bold text-emerald-400">{f.confidenceScore}% Verified</span>
                      </div>
                      <p className="text-gray-300">{f.problemDescription}</p>
                      <p className="text-cyan-300 font-mono">Action: {f.solutionAction}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SYSTEM 3: WORKFLOW LEARNING */}
          {activeSystemTab === 'system3' && (
            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" /> System 3: Workflow Learning & Habit Macros
              </h3>
              <div className="space-y-3">
                {learningState.system3WorkflowLearning.learnedWorkflows.map((w) => (
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

          {/* SYSTEM 4: IMPROVEMENT ENGINE */}
          {activeSystemTab === 'system4' && (
            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> System 4: Improvement Engine & Verification Tests
              </h3>
              <p className="text-xs text-gray-400">
                Evaluates system changes, runs automated validation tests, and only promotes improvements after clean verification.
              </p>

              <div className="space-y-4">
                {learningState.system4ImprovementEngine.proposals.map((imp) => (
                  <div key={imp.id} className="p-4 bg-black/50 border border-white/14 rounded-2xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{imp.title} ({imp.targetComponent})</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        imp.status === 'PROMOTED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        Status: {imp.status}
                      </span>
                    </div>

                    <p className="text-gray-300">{imp.explanation}</p>

                    {/* Validation Test Results */}
                    <div className="p-3 bg-black/80 rounded-xl space-y-1 font-mono text-[11px]">
                      <div className="text-gray-400 font-bold mb-1">Automated Validation Test Suite:</div>
                      {imp.validationResults.map((v, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-cyan-300">✓ {v.testName} ({v.durationMs}ms)</span>
                          <span className="text-emerald-400 font-bold">{v.status}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 pt-1">
                      {imp.status !== 'PROMOTED' && (
                        <button
                          onClick={() => promoteImprovement(imp.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all"
                        >
                          Promote Improvement
                        </button>
                      )}
                      <button
                        onClick={() => rollbackImprovement(imp.id)}
                        className="px-4 py-2 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-300 rounded-xl font-bold transition-all"
                      >
                        1-Click Rollback
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
