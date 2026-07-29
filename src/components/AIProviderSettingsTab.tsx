import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Cpu,
  ShieldCheck,
  Server,
  Zap,
  Globe,
} from 'lucide-react';
import { ClientProviderMeta, AIProviderId } from '../types';

interface AIProviderSettingsTabProps {
  onStatusChange?: () => void;
}

export const AIProviderSettingsTab: React.FC<AIProviderSettingsTabProps> = ({ onStatusChange }) => {
  const [providers, setProviders] = useState<ClientProviderMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // Per provider form states
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [customEndpoints, setCustomEndpoints] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, { type: 'success' | 'error'; message: string }>>({});

  const fetchProviderStatus = async () => {
    setLoading(true);
    try {
      let data: any = null;
      if ((window as any).electronAPI?.aiGetProviders) {
        data = await (window as any).electronAPI.aiGetProviders();
      } else {
        data = await fetch('/api/ai/providers').then((r) => r.json());
      }

      if (data && data.success && Array.isArray(data.providers)) {
        setProviders(data.providers);
        const keys: Record<string, string> = {};
        const models: Record<string, string> = {};
        const endpoints: Record<string, string> = {};

        data.providers.forEach((p: ClientProviderMeta) => {
          models[p.id] = p.selectedModel || p.availableModels[0] || '';
          endpoints[p.id] = p.customEndpoint || '';
        });

        setSelectedModels(models);
        setCustomEndpoints(endpoints);
      }
    } catch (err) {
      console.error('[AIProviderSettings] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviderStatus();
  }, []);

  const handleValidate = async (p: ClientProviderMeta) => {
    setValidating((prev) => ({ ...prev, [p.id]: true }));
    setFeedback((prev) => ({ ...prev, [p.id]: undefined as any }));

    const rawKey = apiKeys[p.id] || '';
    const model = selectedModels[p.id] || p.selectedModel;
    const endpoint = customEndpoints[p.id];

    try {
      let res: any = null;
      const payload = { id: p.id, apiKey: rawKey, selectedModel: model, customEndpoint: endpoint };

      if ((window as any).electronAPI?.aiValidateProvider) {
        res = await (window as any).electronAPI.aiValidateProvider(payload);
      } else {
        res = await fetch('/api/ai/providers/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then((r) => r.json());
      }

      if (res && res.success) {
        setFeedback((prev) => ({
          ...prev,
          [p.id]: { type: 'success', message: res.message || 'Connection validated successfully!' },
        }));
      } else {
        setFeedback((prev) => ({
          ...prev,
          [p.id]: { type: 'error', message: res?.message || 'Validation failed.' },
        }));
      }
    } catch (err: any) {
      setFeedback((prev) => ({
        ...prev,
        [p.id]: { type: 'error', message: err?.message || 'Network validation failed' },
      }));
    } finally {
      setValidating((prev) => ({ ...prev, [p.id]: false }));
    }
  };

  const handleSave = async (p: ClientProviderMeta, enabledOverride?: boolean) => {
    setSaving((prev) => ({ ...prev, [p.id]: true }));
    setFeedback((prev) => ({ ...prev, [p.id]: undefined as any }));

    const rawKey = apiKeys[p.id] || '';
    const model = selectedModels[p.id] || p.selectedModel;
    const isEnabled = enabledOverride !== undefined ? enabledOverride : p.enabled;
    const endpoint = customEndpoints[p.id];

    try {
      let res: any = null;
      const payload = {
        id: p.id,
        apiKey: rawKey,
        selectedModel: model,
        enabled: isEnabled,
        customEndpoint: endpoint,
      };

      if ((window as any).electronAPI?.aiSaveProvider) {
        res = await (window as any).electronAPI.aiSaveProvider(payload);
      } else {
        res = await fetch('/api/ai/providers/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then((r) => r.json());
      }

      if (res && res.success) {
        setFeedback((prev) => ({
          ...prev,
          [p.id]: { type: 'success', message: res.message || 'Saved securely!' },
        }));
        await fetchProviderStatus();
        if (onStatusChange) onStatusChange();
      } else {
        setFeedback((prev) => ({
          ...prev,
          [p.id]: { type: 'error', message: res?.message || 'Failed to save configuration.' },
        }));
      }
    } catch (err: any) {
      setFeedback((prev) => ({
        ...prev,
        [p.id]: { type: 'error', message: err?.message || 'Save error' },
      }));
    } finally {
      setSaving((prev) => ({ ...prev, [p.id]: false }));
    }
  };

  const handleReset = async (id: AIProviderId) => {
    if (!window.confirm('Are you sure you want to reset this provider settings?')) return;
    try {
      if ((window as any).electronAPI?.aiResetProvider) {
        await (window as any).electronAPI.aiResetProvider(id);
      } else {
        await fetch('/api/ai/providers/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
      }
      setApiKeys((prev) => ({ ...prev, [id]: '' }));
      setFeedback((prev) => ({ ...prev, [id]: { type: 'success', message: 'Provider reset.' } }));
      await fetchProviderStatus();
      if (onStatusChange) onStatusChange();
    } catch (_) {}
  };

  const getProviderIcon = (id: AIProviderId) => {
    switch (id) {
      case 'gemini': return <Zap className="w-5 h-5 text-indigo-400" />;
      case 'openai': return <Cpu className="w-5 h-5 text-emerald-400" />;
      case 'anthropic': return <ShieldCheck className="w-5 h-5 text-amber-400" />;
      case 'groq': return <Zap className="w-5 h-5 text-orange-400" />;
      case 'openrouter': return <Globe className="w-5 h-5 text-cyan-400" />;
      case 'local': return <Server className="w-5 h-5 text-violet-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
        <p className="text-sm">Loading AI Providers configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            AI Providers & Encryption
          </h3>
          <p className="text-xs text-slate-400">
            Configure your AI keys securely. Keys are encrypted using OS-level machine credentials and never stored in plain text.
          </p>
        </div>
        <button
          onClick={fetchProviderStatus}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 transition-colors"
          title="Refresh Status"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {providers.map((p) => {
          const isEnabled = p.enabled;
          const isVal = validating[p.id];
          const isSav = saving[p.id];
          const fb = feedback[p.id];
          const showKey = showKeys[p.id];

          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-2xl border transition-all ${
                isEnabled
                  ? 'bg-slate-900/60 border-indigo-500/30 shadow-lg shadow-indigo-950/20'
                  : 'bg-slate-950/40 border-white/5 opacity-80'
              }`}
            >
              {/* Top Header Row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                    {getProviderIcon(p.id)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base flex items-center gap-2">
                      {p.name}
                      {p.status === 'valid' && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Validated
                        </span>
                      )}
                      {p.status === 'invalid' && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Invalid Key
                        </span>
                      )}
                      {p.status === 'unconfigured' && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-full">
                          Unconfigured
                        </span>
                      )}
                    </h4>
                    {p.lastConnectedAt && (
                      <p className="text-[11px] text-slate-500">
                        Last tested: {new Date(p.lastConnectedAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Enable/Disable Toggle */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => handleSave(p, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Fields */}
              <div className="space-y-3">
                {/* API Key Field */}
                {p.id !== 'local' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      API Key
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKeys[p.id] !== undefined ? apiKeys[p.id] : ''}
                        onChange={(e) => setApiKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder={p.hasKey ? p.maskedApiKey : 'Enter API Key...'}
                        className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                        className="absolute right-3 text-slate-400 hover:text-white"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom Endpoint for Local AI */}
                {p.id === 'local' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Ollama / Local Endpoint
                    </label>
                    <input
                      type="text"
                      value={customEndpoints[p.id] || ''}
                      onChange={(e) => setCustomEndpoints((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder="http://localhost:11434/api/tags"
                      className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                )}

                {/* Model Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Model Selection
                  </label>
                  <select
                    value={selectedModels[p.id] || p.availableModels[0]}
                    onChange={(e) => setSelectedModels((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                  >
                    {p.availableModels.map((m) => (
                      <option key={m} value={m} className="bg-slate-900 text-white">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Feedback Message */}
                {fb && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      fb.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {fb.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{fb.message}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleReset(p.id)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={() => handleValidate(p)}
                    disabled={isVal}
                    className="px-3.5 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isVal && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Validate Connection
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSave(p)}
                    disabled={isSav}
                    className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSav && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Save Securely
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
