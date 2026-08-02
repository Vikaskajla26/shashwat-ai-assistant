import { useEffect, useState } from 'react';
import { diagnostics, VoicePipelineStageStatus } from './VoiceDiagnostics';
import { VoicePipelineEngine } from './VoicePipelineEngine';
import { HealthMonitor, SystemDiagnosticsReport } from '../core/HealthMonitor';
import { Supervisor } from '../core/Supervisor';

interface Props {
  engine?: VoicePipelineEngine;
  onClose?: () => void;
}

export function VoiceDiagnosticsPanel({ engine, onClose }: Props) {
  const [metrics, setMetrics] = useState<VoicePipelineStageStatus>(diagnostics.getState());
  const [sysReport, setSysReport] = useState<SystemDiagnosticsReport | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const unsub = diagnostics.subscribe((newMetrics) => {
      setMetrics(newMetrics);
    });

    const updateReport = async () => {
      try {
        const report = await HealthMonitor.getInstance().getDiagnostics();
        setSysReport(report);
      } catch (_) {}
    };

    updateReport();
    const interval = setInterval(updateReport, 3000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const handleRecoverVoice = () => {
    if (engine) {
      engine.forceSubsystemRecovery();
    } else {
      Supervisor.getInstance().forceSelfHeal('voice');
    }
  };

  const handleHealModule = (moduleId: string) => {
    Supervisor.getInstance().forceSelfHeal(moduleId);
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-96 rounded-2xl border border-white/15 bg-slate-950/85 p-4 shadow-2xl backdrop-blur-xl text-xs font-mono text-white/90 animate-fade-in max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-white tracking-wide">Kernel Diagnostics HUD</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:text-emerald-400 transition-colors px-1"
          >
            {isMinimized ? 'Expand' : 'Minimize'}
          </button>
          {onClose && (
            <button onClick={onClose} className="hover:text-rose-400 transition-colors">
              ✕
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <div className="space-y-3">
          {/* Latency & System Health Banner */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1.5">
              <div className="text-emerald-400/80 font-medium">Pipeline Latency</div>
              <div className="text-xs font-bold text-emerald-300">
                {metrics.latencyMs !== null ? `${metrics.latencyMs} ms` : 'Sub-second active'}
              </div>
            </div>
            <div className="rounded-lg bg-cyan-950/40 border border-cyan-500/20 px-2.5 py-1.5">
              <div className="text-cyan-400/80 font-medium">Kernel Status</div>
              <div className="text-xs font-bold text-cyan-300">
                {sysReport ? sysReport.overallStatus : 'HEALTHY'} ({sysReport?.memoryMB || 0} MB)
              </div>
            </div>
          </div>

          {/* Module Health Matrix */}
          {sysReport && (
            <div className="rounded-lg bg-white/5 p-2 border border-white/5 space-y-1.5">
              <div className="text-white/50 text-[10px] uppercase font-bold tracking-wider mb-1">
                Core Module Supervisor ({sysReport.activeModulesCount} Active)
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {Object.entries(sysReport.modules).map(([id, health]) => (
                  <div
                    key={id}
                    className="flex items-center justify-between bg-white/5 rounded px-2 py-1 border border-white/5"
                  >
                    <span className="truncate text-white/80 font-medium">{id}</span>
                    <button
                      onClick={() => handleHealModule(id)}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${
                        health.status === 'RUNNING'
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          : health.status === 'DEGRADED'
                          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                          : 'bg-rose-500/30 text-rose-200 hover:bg-rose-500/40 animate-pulse'
                      }`}
                    >
                      {health.status} 🔄
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real-time Stage Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {/* Mic Status */}
            <div className="rounded-lg bg-white/5 p-2 border border-white/5">
              <div className="text-white/40">Microphone</div>
              <div className="font-semibold capitalize text-emerald-400">{metrics.micInit}</div>
            </div>

            {/* VAD & Energy */}
            <div className="rounded-lg bg-white/5 p-2 border border-white/5">
              <div className="text-white/40">Voice Activity</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={metrics.vadDetected ? 'text-amber-400 font-bold' : 'text-white/40'}>
                  {metrics.vadDetected ? 'VOICE DETECTED' : 'SILENT'}
                </span>
                <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-75"
                    style={{ width: `${Math.min(100, metrics.vadEnergy * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* WebSocket State */}
            <div className="rounded-lg bg-white/5 p-2 border border-white/5">
              <div className="text-white/40">WebSocket Live</div>
              <div className="font-semibold text-cyan-400">{metrics.wsState}</div>
            </div>

            {/* Playback Status */}
            <div className="rounded-lg bg-white/5 p-2 border border-white/5">
              <div className="text-white/40">Speaker Playback</div>
              <div className="font-semibold capitalize text-purple-400">{metrics.playbackStatus}</div>
            </div>
          </div>

          {/* Current State */}
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 border border-white/5">
            <span className="text-white/40">AI Engine State:</span>
            <span className="font-bold uppercase text-amber-300">{metrics.currentState}</span>
          </div>

          {/* Last Error Display */}
          {metrics.lastError && (
            <div className="rounded-lg bg-rose-950/50 border border-rose-500/30 p-2 text-rose-300 text-[11px]">
              <div className="font-semibold text-rose-400 mb-0.5">Pipeline Diagnostics Warning</div>
              <div className="text-rose-200/90 break-words">{metrics.lastError}</div>
            </div>
          )}

          {/* Self-Healing Auto Recovery Button */}
          <div className="pt-1">
            <button
              onClick={handleRecoverVoice}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-3 py-2 font-sans font-semibold text-white shadow-lg shadow-emerald-950/50 hover:from-emerald-500 hover:to-cyan-500 active:scale-95 transition-all"
            >
              🔄 Self-Heal Voice Subsystem
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
