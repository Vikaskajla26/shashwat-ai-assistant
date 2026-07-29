import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssistantPhase, AssistantState } from '../types';
import { getStateTheme, type StateTheme } from '../theme/aiState';

/**
 * useStateMachine — the single source of truth for the AI consciousness state.
 *
 * It owns the live `AssistantState`, runs the derivation/auto-return rules
 * (booting → idle, success/error → listening, idle-timeout → sleeping), and
 * exposes a stable `setState` that LiveSession / server phase signals / UI
 * actions all push into. It also computes the current `StateTheme` and tracks
 * the last "activity" timestamp for the idle-timeout.
 *
 * Transitions are intentionally simple (not a full guard matrix): the producer
 * of each event (server, audio, user) knows what it means; this hook only
 * enforces a few safety auto-returns and the sleep timeout.
 */

const IDLE_TIMEOUT_MS = 45_000; // no activity → sleeping
const TRANSIENT_HOLD_MS = 1600; // success/error flare duration before returning
const REASONING_FALLBACK_MS = 700; // silence after user speech → understanding

export interface StateMachineApi {
  state: AssistantState;
  stateTheme: StateTheme;
  setState: (next: AssistantState) => void;
  /** Accept a server-pushed phase and map it to a state. */
  setPhase: (phase: AssistantPhase) => void;
  /** Reset to idle (used when a session connects / turn completes). */
  returnToReady: () => void;
  /** Mark activity (resets the idle/sleep timer). */
  poke: () => void;
}

export function useStateMachine(): StateMachineApi {
  const [state, setStateRaw] = useState<AssistantState>('booting');

  // Refs read inside timers/closures without re-subscribing.
  const stateRef = useRef<AssistantState>('booting');
  const lastActivityRef = useRef<number>(Date.now());
  const transientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback((next: AssistantState) => {
    if (stateRef.current === next) return;
    stateRef.current = next;
    setStateRaw(next);
    lastActivityRef.current = Date.now();
  }, []);

  const clearTransient = useCallback(() => {
    if (transientTimerRef.current) {
      clearTimeout(transientTimerRef.current);
      transientTimerRef.current = null;
    }
  }, []);

  const poke = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  /** Set state, and if it's a transient flare, auto-return to a ready state. */
  const setState = useCallback(
    (next: AssistantState) => {
      clearTransient();

      if (next === 'success' || next === 'error') {
        commit(next);
        // Hold the flare, then return to a listening/idle ready state.
        transientTimerRef.current = setTimeout(() => {
          const prev = stateRef.current;
          // Only auto-return if we're still in the flare; otherwise honor a newer state.
          if (prev === 'success' || prev === 'error') {
            commit('listening');
          }
        }, TRANSIENT_HOLD_MS);
        return;
      }

      commit(next);
    },
    [commit, clearTransient],
  );

  /** Map a server phase onto a state. */
  const setPhase = useCallback(
    (phase: AssistantPhase) => {
      clearTransient();
      commit(phase);
    },
    [commit, clearTransient],
  );

  const returnToReady = useCallback(() => {
    clearTransient();
    // Prefer listening while a live session is open; else idle.
    const prev = stateRef.current;
    if (prev === 'speaking' || prev === 'reasoning' || prev === 'understanding') {
      commit('listening');
    }
  }, [commit, clearTransient]);

  // Booting intro → idle.
  useEffect(() => {
    if (stateRef.current !== 'booting') return;
    const t = setTimeout(() => {
      if (stateRef.current === 'booting') commit('idle');
    }, 1800);
    return () => clearTimeout(t);
  }, [commit]);

  // Idle → sleeping watchdog.
  useEffect(() => {
    const tick = () => {
      const idleFor = Date.now() - lastActivityRef.current;
      const cur = stateRef.current;
      const awakeStates: AssistantState[] = [
        'listening',
        'speaking',
        'understanding',
        'reasoning',
        'searching',
        'executing',
        'wakeWord',
        'learning',
        'success',
        'error',
        'idle',
      ];
      if (idleFor > IDLE_TIMEOUT_MS && awakeStates.includes(cur)) {
        commit('sleeping');
      }
    };
    idleTimerRef.current = setInterval(tick, 5000);
    return () => {
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, [commit]);

  // Keep activity fresh whenever an active (non-sleep) state is committed.
  useEffect(() => {
    if (state !== 'sleeping' && state !== 'idle') poke();
  }, [state, poke]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      clearTransient();
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, [clearTransient]);

  return {
    state,
    stateTheme: getStateTheme(state),
    setState,
    setPhase,
    returnToReady,
    poke,
  };
}

export { REASONING_FALLBACK_MS };
