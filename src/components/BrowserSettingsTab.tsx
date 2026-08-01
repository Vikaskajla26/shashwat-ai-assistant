import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Globe,
  Compass,
  CheckCircle2,
  ExternalLink,
  Shield,
  Monitor,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Power,
} from 'lucide-react';
import { BrowserRoutingMode, SystemBrowserInfo } from '../types';
import { openExternalUrl } from '../utils/browser';

interface BrowserSettingsTabProps {
  onOpenSandbox?: () => void;
}

export const BrowserSettingsTab: React.FC<BrowserSettingsTabProps> = ({ onOpenSandbox }) => {
  const [routingMode, setRoutingMode] = useState<BrowserRoutingMode>('system_default');
  const [autoLaunch, setAutoLaunch] = useState<boolean>(false);
  const [browserInfo, setBrowserInfo] = useState<SystemBrowserInfo>({
    name: 'Detecting System Default Browser...',
    isDetected: false,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    // Detect OS Default Browser via Electron API or fallback
    const detectBrowser = async () => {
      try {
        if ((window as any).electronAPI?.browserGetDefaultBrowser) {
          const info = await (window as any).electronAPI.browserGetDefaultBrowser();
          setBrowserInfo(info);
        } else {
          setBrowserInfo({ name: 'System Default Web Browser (OS Configured)', isDetected: true });
        }
      } catch (_) {
        setBrowserInfo({ name: 'System Default Web Browser', isDetected: false });
      }
    };

    // Load saved browser routing preference
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings').then((r) => r.json());
        if (res && res.success && res.settings && res.settings.browser_routing_mode) {
          setRoutingMode(res.settings.browser_routing_mode as BrowserRoutingMode);
        }
      } catch (_) {}
    };

    // Check Auto-Launch Status
    const checkAutoLaunch = async () => {
      try {
        if ((window as any).electronAPI?.appGetAutoLaunch) {
          const res = await (window as any).electronAPI.appGetAutoLaunch();
          setAutoLaunch(Boolean(res?.enabled));
        }
      } catch (_) {}
    };

    detectBrowser();
    loadSettings();
    checkAutoLaunch();
  }, []);

  const handleToggleAutoLaunch = async () => {
    const nextVal = !autoLaunch;
    setAutoLaunch(nextVal);
    try {
      if ((window as any).electronAPI?.appSetAutoLaunch) {
        await (window as any).electronAPI.appSetAutoLaunch(nextVal);
        setFeedback(nextVal ? 'Launch on Windows startup enabled!' : 'Launch on Windows startup disabled.');
      }
    } catch (_) {
      setFeedback('Failed to update startup settings.');
    }
  };

  const handleSaveMode = async (mode: BrowserRoutingMode) => {
    setRoutingMode(mode);
    setSaving(true);
    setFeedback(null);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'browser_routing_mode', value: mode }),
      });
      localStorage.setItem('shashwat_browser_routing_mode', mode);
      setFeedback('Browser routing preferences saved!');
    } catch (err: any) {
      setFeedback('Failed to save browser preferences.');
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const handleTestSystemBrowser = () => {
    openExternalUrl('https://www.google.com');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="pb-3 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Compass className="w-5 h-5 text-cyan-400" />
          Intelligent Browser Routing System
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Configure how Shashwat launches web pages. By default, user browsing and web searches open in your OS default browser, while AI sandbox is reserved for multi-step autonomous tasks.
        </p>
      </div>

      {/* Detected OS Default Browser Card */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-cyan-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-white text-sm">{browserInfo.name}</h4>
                {browserInfo.isDetected && (
                  <span className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> OS Default
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Primary browser used for user browsing, Google & YouTube searches</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestSystemBrowser}
            className="px-3 py-1.5 text-xs bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Test System Browser
          </button>
        </div>
      </div>

      {/* Routing Mode Preference Selector */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Browser Routing Preferences
        </label>

        <div className="grid grid-cols-1 gap-2.5">
          {/* Option 1: System Default (Recommended) */}
          <button
            type="button"
            onClick={() => handleSaveMode('system_default')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              routingMode === 'system_default'
                ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                : 'bg-slate-950/40 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Globe className={`w-4 h-4 ${routingMode === 'system_default' ? 'text-indigo-400' : 'text-slate-400'}`} />
                <h4 className="font-semibold text-sm text-white">System Default (Recommended)</h4>
              </div>
              {routingMode === 'system_default' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
            </div>
            <p className="text-xs text-slate-400 pl-6">
              User browsing and searches open in system default browser ({browserInfo.name}). AI sandbox is reserved only for autonomous multi-step automation.
            </p>
          </button>

          {/* Option 2: Always Ask */}
          <button
            type="button"
            onClick={() => handleSaveMode('always_ask')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              routingMode === 'always_ask'
                ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                : 'bg-slate-950/40 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <HelpCircle className={`w-4 h-4 ${routingMode === 'always_ask' ? 'text-indigo-400' : 'text-slate-400'}`} />
                <h4 className="font-semibold text-sm text-white">Always Ask</h4>
              </div>
              {routingMode === 'always_ask' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
            </div>
            <p className="text-xs text-slate-400 pl-6">
              Prompt for confirmation before launching any browser window.
            </p>
          </button>

          {/* Option 3: Always Sandbox */}
          <button
            type="button"
            onClick={() => handleSaveMode('always_sandbox')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              routingMode === 'always_sandbox'
                ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                : 'bg-slate-950/40 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${routingMode === 'always_sandbox' ? 'text-indigo-400' : 'text-slate-400'}`} />
                <h4 className="font-semibold text-sm text-white">Always Sandbox</h4>
              </div>
              {routingMode === 'always_sandbox' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
            </div>
            <p className="text-xs text-slate-400 pl-6">
              Open all web links inside the built-in AI Sandbox Browser.
            </p>
          </button>

          {/* Option 4: Always System Default */}
          <button
            type="button"
            onClick={() => handleSaveMode('always_default')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              routingMode === 'always_default'
                ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                : 'bg-slate-950/40 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Monitor className={`w-4 h-4 ${routingMode === 'always_default' ? 'text-indigo-400' : 'text-slate-400'}`} />
                <h4 className="font-semibold text-sm text-white">Always System Default</h4>
              </div>
              {routingMode === 'always_default' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
            </div>
            <p className="text-xs text-slate-400 pl-6">
              Always use OS system default browser for everything, bypassing the sandbox.
            </p>
          </button>
        </div>
      </div>

      {/* Windows Startup Options Card */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">Launch on Windows Startup</h4>
              <p className="text-[11px] text-slate-400">Automatically initialize Shashwat AI Assistant when your computer boots</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleAutoLaunch}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
              autoLaunch ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                autoLaunch ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* AI Sandbox Card */}
      <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">AI Sandbox Browser Workspace</h4>
              <p className="text-[11px] text-slate-400">Isolated Chromium instance for multi-step scraping, automation, and testing</p>
            </div>
          </div>

          {onOpenSandbox && (
            <button
              type="button"
              onClick={onOpenSandbox}
              className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all flex items-center gap-1.5 shrink-0"
            >
              Launch AI Sandbox
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
};
