import { Transition } from 'framer-motion';

export interface PhysicalMotionPreset {
  initial: Record<string, any>;
  animate: Record<string, any>;
  exit?: Record<string, any>;
  transition: Transition;
}

/**
 * MotionPresets — Physical Motion Presets with zero linear/cubic robotic easing.
 * Every preset uses authentic physical spring dynamics (mass, stiffness, damping).
 */
export const PHYSICAL_SPRING_PRESETS = {
  // Heavy Glass Panel (Modals, Drawers)
  glassPanel: {
    transition: {
      type: 'spring',
      mass: 1.2,
      stiffness: 220,
      damping: 24,
      restDelta: 0.001,
    } as Transition,
  },

  // Floating Dock Button (Magnification & Hover Elevation)
  dockButton: {
    transition: {
      type: 'spring',
      mass: 0.5,
      stiffness: 350,
      damping: 22,
      restDelta: 0.001,
    } as Transition,
  },

  // Vision Pro Floating Pill Tooltip
  tooltipPill: {
    transition: {
      type: 'spring',
      mass: 0.4,
      stiffness: 400,
      damping: 26,
      restDelta: 0.001,
    } as Transition,
  },

  // Organic AI State Transition
  orbStateShift: {
    transition: {
      type: 'spring',
      mass: 1.5,
      stiffness: 180,
      damping: 20,
      restDelta: 0.001,
    } as Transition,
  },

  // Micro UI Element (Chips, Badges)
  microElement: {
    transition: {
      type: 'spring',
      mass: 0.3,
      stiffness: 450,
      damping: 28,
      restDelta: 0.001,
    } as Transition,
  },
};
