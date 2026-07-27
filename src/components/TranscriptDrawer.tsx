import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Bot, User, Trash2, Volume2, Sparkles } from 'lucide-react';
import { TranscriptMessage } from '../types';

interface TranscriptDrawerProps {
  isOpen: boolean;
  messages: TranscriptMessage[];
  onClose: () => void;
  onSendMessage: (text: string) => void;
  onClearHistory: () => void;
}

export const TranscriptDrawer: React.FC<TranscriptDrawerProps> = ({
  isOpen,
  messages,
  onClose,
  onSendMessage,
  onClearHistory,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex justify-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-md h-full bg-[#030303] border-l border-white/10 p-4 sm:p-6 flex flex-col shadow-2xl text-white relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-wider text-white uppercase flex items-center gap-1.5">
                    <span>TRANSCRIBED LOG</span>
                  </h2>
                  <p className="text-[10px] tracking-widest text-zinc-500 uppercase font-mono">Real-time voice stream</p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                {messages.length > 0 && (
                  <button
                    onClick={onClearHistory}
                    className="p-2 rounded-xl hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 transition-colors"
                    title="Clear transcript"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Transcript Messages List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-600 space-y-2">
                  <Sparkles className="w-8 h-8 text-blue-500/40 animate-pulse" />
                  <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase">NO LOGS RECORDED</p>
                  <p className="text-[11px] text-zinc-500">Speak naturally with शाश्वत or type below.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1 px-1">
                      {msg.role === 'user' ? (
                        <>
                          <span className="text-[10px] text-zinc-500 font-mono">{msg.timestamp}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">USER</span>
                          <User className="w-3 h-3 text-blue-400" />
                        </>
                      ) : (
                        <>
                          <Bot className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">शाश्वत</span>
                          <span className="text-[10px] text-zinc-500 font-mono">{msg.timestamp}</span>
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                          : 'bg-zinc-900 border border-white/10 text-zinc-200 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Text Input */}
            <form onSubmit={handleSend} className="pt-3 border-t border-white/10 flex items-center space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Send text command to शाश्वत..."
                className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-xl bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
