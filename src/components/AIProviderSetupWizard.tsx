import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Server,
  Cpu,
  X,
} from 'lucide-react';
import { AIProviderId } from '../types';

interface AIProviderSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const PROVIDERS_LIST: { id: AIProviderId; name: string; desc: string; icon: any; defaultModel: string }[] = [
  { id: 'gemini', name: 'Google Gemini', desc: 'Real-time Live Audio Voice & Multimodal Intelligence', icon: Zap, defaultModel: 'gemini-2.0-flash' },
  { id: 'openai', name: 'OpenAI', desc: 'GPT-4o & GPT-4o-mini High Intelligence', icon: Cpu, defaultModel: 'gpt-4o' },
  { id: 'anthropic', name: 'Anthropic', desc: 'Claude 3.5 Sonnet & Haiku Reasoning', icon: ShieldCheck, defaultModel: 'claude-3-5-sonnet-20241022' },
  { id: 'groq', name: 'Groq', desc: 'Ultra-fast LLaMA 3.3 70B & Mixtral Inference', icon: Zap, defaultModel: 'llama-3.3-70b-versatile' },
  { id: 'openrouter', name: 'OpenRouter', desc: 'Unified Access to 100+ Open & Closed LLMs', icon: Globe, defaultModel: 'auto' },
  { id: 'local', name: 'Local AI (Ollama)', desc: '100% Offline Local Model Endpoint', icon: Server, defaultModel: 'llama3:latest' },
];

export const AIProviderSetupWizard: React.FC<AIProviderSetupWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const providerMeta = PROVIDERS_LIST.find((p) => p.id === selectedProvider) || PROVIDERS_LIST[0];

  const handleValidateAndSave = async () => {
    setValidating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let valRes: any = null;
      const payload = {
        id: selectedProvider,
        apiKey: apiKey.trim(),
        selectedModel: providerMeta.defaultModel,
      };

      if ((window as any).electronAPI?.aiValidateProvider) {
        valRes = await (window as any).electronAPI.aiValidateProvider(payload);
      } else {
        valRes = await fetch('/api/ai/providers/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then((r) => r.json());
      }

      if (!valRes || !valRes.success) {
        setErrorMsg(valRes?.message || 'Invalid API key or network connection failed.');
        setValidating(false);
        return;
      }

      // Validated! Now Save
      setSaving(true);
      let saveRes: any = null;
      const savePayload = { ...payload, enabled: true };

      if ((window as any).electronAPI?.aiSaveProvider) {
        saveRes = await (window as any).electronAPI.aiSaveProvider(savePayload);
      } else {
        saveRes = await fetch('/api/ai/providers/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savePayload),
        }).then((r) => r.json());
      }

      if (saveRes && saveRes.success) {
        setSuccessMsg(`${providerMeta.name} configured and encrypted successfully!`);
        setTimeout(() => {
          onComplete();
          onClose();
        }, 1200);
      } else {
        setErrorMsg(saveRes?.message || 'Failed to save encrypted provider configuration.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Setup error occurred.');
    } finally {
      setValidating(false);
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }}
            className="w-full max-w-xl bg-[#030303] border border-indigo-500/30 rounded-3xl p-7 shadow-2xl text-white relative overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Setup AI Engine</h3>
                  <p className="text-xs text-slate-400">Configure your primary AI Provider for real-time features</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Progress Bar */}
            <div className="flex items-center justify-between mb-6 px-2">
              <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 1 ? 'text-indigo-400' : 'text-slate-600'}`}>
                <span className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">1</span>
                <span>Select Provider</span>
              </div>
              <div className="h-[2px] flex-1 mx-3 bg-white/10" />
              <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 2 ? 'text-indigo-400' : 'text-slate-600'}`}>
                <span className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">2</span>
                <span>Enter Key & Validate</span>
              </div>
            </div>

            {/* Step 1: Provider Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 font-medium">Choose your AI provider:</p>
                <div className="grid grid-cols-2 gap-3">
                  {PROVIDERS_LIST.map((p) => {
                    const Icon = p.icon;
                    const isSelected = selectedProvider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProvider(p.id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                            : 'bg-slate-950/40 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                        </div>
                        <h4 className="font-semibold text-sm text-white mb-1">{p.name}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{p.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Skip for now (Use Offline Mode)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition-all flex items-center gap-2"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Key & Validation */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-center gap-3">
                  <Key className="w-6 h-6 text-indigo-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">{providerMeta.name} Setup</h4>
                    <p className="text-xs text-slate-400">Model: {providerMeta.defaultModel}</p>
                  </div>
                </div>

                {selectedProvider !== 'local' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Enter {providerMeta.name} API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter API key..."
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleValidateAndSave}
                    disabled={validating || saving}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {(validating || saving) ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Validate & Enable AI
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
