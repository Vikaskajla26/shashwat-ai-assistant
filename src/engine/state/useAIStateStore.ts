import { create } from 'zustand';
import { AssistantState, AssistantMood, ToolExecutionEvent, TranscriptMessage } from '../../types';

export interface AIStateStore {
  state: AssistantState;
  mood: AssistantMood;
  inputVolume: number;
  outputVolume: number;
  isMuted: boolean;
  toolEvents: ToolExecutionEvent[];
  transcripts: TranscriptMessage[];
  
  // Actions
  setState: (state: AssistantState) => void;
  setMood: (mood: AssistantMood) => void;
  setVolumes: (inputVol: number, outputVol: number) => void;
  setIsMuted: (muted: boolean | ((prev: boolean) => boolean)) => void;
  addToolEvent: (event: ToolExecutionEvent) => void;
  addTranscript: (msg: TranscriptMessage) => void;
  clearTranscripts: () => void;
}

export const useAIStateStore = create<AIStateStore>((set) => ({
  state: 'disconnected',
  mood: 'witty',
  inputVolume: 0,
  outputVolume: 0,
  isMuted: false,
  toolEvents: [],
  transcripts: [],

  setState: (newState) => set({ state: newState }),
  setMood: (newMood) => set({ mood: newMood }),
  setVolumes: (inVol, outVol) => set({ inputVolume: inVol, outputVolume: outVol }),
  setIsMuted: (muted) =>
    set((s) => ({ isMuted: typeof muted === 'function' ? muted(s.isMuted) : muted })),
  addToolEvent: (event) => set((s) => ({ toolEvents: [event, ...s.toolEvents].slice(0, 20) })),
  addTranscript: (msg) => set((s) => ({ transcripts: [...s.transcripts, msg] })),
  clearTranscripts: () => set({ transcripts: [] }),
}));
