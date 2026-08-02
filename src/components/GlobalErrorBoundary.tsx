/**
 * Global Error Boundary for Shashwat AI OS (Stabilization Update Priority 1).
 * Catches unhandled React component rendering exceptions, logs stack traces to CentralLogger,
 * displays an obsidian recovery overlay, and keeps the UI alive without unmounting the root tree.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { CentralLogger } from '../core/CentralLogger';
import { AlertCircle, RefreshCw, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const logger = CentralLogger.getInstance();
    const moduleName = this.props.moduleName || 'GlobalReactTree';
    logger.error(moduleName, `React Error Boundary caught exception: ${error?.message || error}\nStack: ${errorInfo.componentStack}`);
    this.setState({ errorInfo });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="relative w-full h-full min-h-[280px] p-6 flex flex-col items-center justify-center bg-slate-950/90 border border-rose-500/30 rounded-2xl backdrop-blur-xl text-white font-sans select-none z-50">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-4 text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-semibold text-rose-200 mb-1">
            {this.props.moduleName ? `${this.props.moduleName} Intercepted` : 'Component Exception Intercepted'}
          </h3>

          <p className="text-xs text-slate-400 text-center max-w-md mb-4">
            Shashwat OS caught a non-fatal rendering error and kept the main application active.
          </p>

          <div className="w-full max-w-lg bg-black/60 border border-white/10 rounded-xl p-3 text-[11px] font-mono text-rose-300/90 overflow-x-auto mb-5 max-h-32">
            {this.state.error?.message || 'Unknown render exception'}
          </div>

          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg transition-all hover:scale-105"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recover Component State
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
