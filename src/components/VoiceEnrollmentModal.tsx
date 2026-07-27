import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, CheckCircle2, ShieldCheck, X, Volume2, Square, AlertCircle } from 'lucide-react';
import { float32ToInt16Base64 } from '../utils/pcm';

interface VoiceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnrollComplete: (ownerName: string, samples: string[]) => void;
}

const ENROLLMENT_PHRASES = [
  'नमस्ते शाश्वत, I am setting up my voice identity.',
  'मेरा नाम विकास है, I am your registered owner.',
  'शाश्वत AI Operating System, open Google Chrome.',
  'Check weather forecast and read today schedule.',
];

export const VoiceEnrollmentModal: React.FC<VoiceEnrollmentModalProps> = ({
  isOpen,
  onClose,
  onEnrollComplete,
}) => {
  const [step, setStep] = useState<number>(0);
  const [ownerName, setOwnerName] = useState<string>('Vikas Kajla');
  const [samples, setSamples] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(4);
  const [volume, setVolume] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recordingBuffersRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setStep(0);
    setSamples([]);
    setIsRecording(false);
    isRecordingRef.current = false;
    setCountdown(4);
    setIsCompleted(false);
    setErrorMsg(null);
    cleanupAudio();
  };

  const cleanupAudio = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (_) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        audioCtxRef.current.close();
      } catch (_) {}
    }
    processorRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
    recordingBuffersRef.current = [];
  };

  const stopRecordingSample = useCallback(() => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);

    const chunks = recordingBuffersRef.current;
    let totalLength = 0;
    for (const chunk of chunks) totalLength += chunk.length;

    if (totalLength === 0) {
      setErrorMsg('No audio detected. Please try recording again.');
      cleanupAudio();
      return;
    }

    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const base64Pcm = float32ToInt16Base64(merged);
    cleanupAudio();

    setSamples((prev) => {
      const next = [...prev, base64Pcm];
      if (next.length >= ENROLLMENT_PHRASES.length) {
        setIsCompleted(true);
      } else {
        setStep(next.length);
      }
      return next;
    });
  }, []);

  const startRecordingSample = async () => {
    setErrorMsg(null);
    cleanupAudio();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      recordingBuffersRef.current = [];
      isRecordingRef.current = true;
      setIsRecording(true);
      setCountdown(4);

      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        recordingBuffersRef.current.push(new Float32Array(inputData));

        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += Math.abs(inputData[i]);
        }
        setVolume(Math.min(100, Math.floor((sum / inputData.length) * 400)));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      let timeLeft = 4;
      timerRef.current = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timerRef.current);
          stopRecordingSample();
        }
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start microphone for enrollment:', err);
      setErrorMsg('Microphone access failed. Please allow mic permissions in your browser.');
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  const handleFinishEnrollment = () => {
    if (samples.length === 0) {
      setErrorMsg('At least 1 voice sample is required.');
      return;
    }
    onEnrollComplete(ownerName.trim() || 'Vikas Kajla', samples);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-blue-500/40 rounded-xl shadow-[0_0_50px_rgba(59,130,246,0.2)] p-6 text-white font-sans overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-lg font-bold tracking-wide">Voice Identity Enrollment</h2>
              <p className="text-xs text-zinc-400">Build a secure voiceprint to recognize your voice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!isCompleted ? (
          <div>
            {/* Owner Name Input */}
            <div className="mb-5">
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                Registered Owner Name
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400 font-mono"
                placeholder="Enter your name e.g. Vikas Kajla"
              />
            </div>

            {/* Step Progress Bar */}
            <div className="flex items-center justify-between gap-2 mb-6">
              {ENROLLMENT_PHRASES.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    idx < samples.length
                      ? 'bg-emerald-400'
                      : idx === step
                      ? 'bg-blue-500 animate-pulse'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>

            {/* Phrase Card */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-5 mb-6 text-center">
              <span className="text-[10px] font-mono tracking-widest text-blue-400 uppercase mb-2 block">
                PHRASE {step + 1} OF {ENROLLMENT_PHRASES.length}
              </span>
              <p className="text-base font-semibold text-zinc-100 leading-relaxed italic">
                "{ENROLLMENT_PHRASES[step]}"
              </p>
            </div>

            {/* Visualizer / Actions */}
            {isRecording ? (
              <div className="flex flex-col items-center justify-center gap-4 py-3">
                <div className="flex items-center gap-1.5 h-10">
                  {Array.from({ length: 16 }).map((_, i) => {
                    const h = Math.max(8, Math.sin(i * 0.4 + Date.now() * 0.01) * (volume * 0.8));
                    return (
                      <span
                        key={i}
                        className="w-1.5 bg-blue-400 rounded-full transition-all duration-75"
                        style={{ height: `${h}px` }}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span>Recording... {countdown}s remaining</span>
                </div>
                <button
                  onClick={stopRecordingSample}
                  className="px-4 py-2 rounded-lg bg-rose-600/30 border border-rose-500/50 hover:bg-rose-600/50 text-rose-200 text-xs font-mono font-semibold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>STOP & SAVE SAMPLE</span>
                </button>
              </div>
            ) : (
              <div className="flex justify-center py-4">
                <button
                  onClick={startRecordingSample}
                  className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold tracking-wider flex items-center gap-2.5 shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all cursor-pointer"
                >
                  <Mic className="w-5 h-5" />
                  <span>RECORD SAMPLE {step + 1}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Completion Screen */
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold mb-1">Voice Profile Ready!</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Recorded {samples.length} voice samples for <strong className="text-white">{ownerName}</strong>.
            </p>

            <button
              onClick={handleFinishEnrollment}
              className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm tracking-wider transition-all shadow-[0_0_25px_rgba(16,185,129,0.4)] cursor-pointer"
            >
              SAVE & ACTIVATE VOICEPRINT
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
