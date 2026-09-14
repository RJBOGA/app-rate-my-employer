import type { Transition } from 'motion/react'

/**
 * Motion tokens.
 *
 * Apple's two designer-facing spring parameters are damping ratio (how
 * much it overshoots) and response (how quickly it reaches the target).
 * Motion's spring API takes `bounce` + `duration`, which maps onto them
 * closely: bounce 0 == critically damped (damping 1.0).
 *
 * House rule: critically damped everywhere by default. Overshoot is
 * reserved for surfaces the user physically moved — a flicked sheet
 * earns a bounce, a popover that merely appeared does not.
 *
 * This product is mostly forms and records. Motion here is for
 * orientation, not personality, so the list is short on purpose.
 */

/** Default for anything that appears, moves or resizes. No overshoot. */
export const springDefault: Transition = {
  type: 'spring',
  bounce: 0,
  duration: 0.35,
}

/** Snappier variant for small, frequent transitions (menu items, chips). */
export const springSnappy: Transition = {
  type: 'spring',
  bounce: 0,
  duration: 0.22,
}

/**
 * Drawer / bottom sheet. The one place a slight bounce is justified: the
 * user drags it, so the surface should carry a little momentum home.
 * (Apple ships damping 0.8 / response 0.3 for drawers.)
 */
export const springSheet: Transition = {
  type: 'spring',
  bounce: 0.18,
  duration: 0.3,
}

/**
 * Glass and popover surfaces should *materialise* rather than fade:
 * animate scale and blur together so the surface reads as a real
 * material arriving, not an image cross-dissolving.
 */
export const materializeIn = {
  initial: { opacity: 0, scale: 0.97, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: -2 },
  transition: springSnappy,
} as const

/**
 * Spatial consistency: a surface leaves along the path it arrived on.
 * Enter-from-below / exit-to-the-side reads as two unrelated events.
 */
export const sheetFromBottom = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
  transition: springSheet,
} as const

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
} as const

/**
 * Reads the user's OS-level setting. Components that animate position
 * should degrade to a cross-fade rather than dropping feedback entirely —
 * reduced motion means gentler, not absent.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Tailwind classes for instant press feedback. Feedback belongs on
 * pointer-down, not on click — waiting for the release feels dead.
 */
export const pressable =
  'transition-transform duration-100 ease-out active:scale-[0.97] motion-reduce:active:scale-100'

export const pressableSubtle =
  'transition-transform duration-100 ease-out active:scale-[0.99] motion-reduce:active:scale-100'
