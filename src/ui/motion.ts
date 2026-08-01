import type { Transition } from 'motion/react';
import type React from 'react';

/**
 * Shared spring/microinteraction presets.
 *
 * The spec wants every interaction to use "smooth spring-based motion": buttons
 * gently lift on hover, icons glow, ripples originate from interaction points,
 * transitions use natural easing. These presets centralize that feel and honour
 * prefers-reduced-motion by collapsing to a fast tween when the user has
 * requested reduced motion.
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A gentle lift used by buttons/icons on hover. */
export const liftSpring: Transition = prefersReducedMotion()
  ? { duration: 0.12 }
  : { type: 'spring', stiffness: 380, damping: 26, mass: 0.7 };

/** A tactile press (scale-down) for active/click. */
export const pressSpring: Transition = prefersReducedMotion()
  ? { duration: 0.08 }
  : { type: 'spring', stiffness: 500, damping: 30, mass: 0.6 };

/** Soft entrance for cards/toasts/banners. */
export const enterSpring: Transition = prefersReducedMotion()
  ? { duration: 0.2, ease: 'easeOut' }
  : { type: 'spring', stiffness: 320, damping: 28, mass: 0.9 };

/** Cinematic, slightly slower reveal for the main stage. */
export const stageSpring: Transition = prefersReducedMotion()
  ? { duration: 0.25, ease: 'easeOut' }
  : { type: 'spring', stiffness: 180, damping: 24, mass: 1.1 };

/** Natural easing curve shared with CSS transitions. */
export const NATURAL_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * Variant builders for framer-motion-style `whileHover` / `whileTap`.
 * Returns scale-only variants so they compose with any layout.
 */
export function hoverLift() {
  if (prefersReducedMotion()) {
    return { whileHover: { opacity: 0.85 }, whileTap: { opacity: 0.7 } };
  }
  return {
    whileHover: { y: -2, scale: 1.06 },
    whileTap: { scale: 0.94 },
    transition: liftSpring,
  };
}

/**
 * Create a pointer-relative ripple style. Call from a pointer handler to get
 * the {x,y} origin for an absolutely-positioned ripple element.
 */
export function rippleOriginFromEvent(
  e: React.PointerEvent | React.MouseEvent,
  rect: DOMRect,
): { x: number; y: number } {
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}
