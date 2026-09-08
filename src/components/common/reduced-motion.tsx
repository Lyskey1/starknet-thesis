"use client";

// 📖 Docs: obsidian/frontend/components/common.md

import { useReducedMotion } from "@react-spring/web";

/**
 * Honours the OS "reduce motion" accessibility setting.
 *
 * `useReducedMotion` watches the `prefers-reduced-motion` media query and
 * toggles react-spring's global `skipAnimation`, so every spring (the FAQ
 * accordion, the pressable controls) jumps straight to its end state instead
 * of animating. Renders nothing; mount once at the app root.
 */
export const ReducedMotion = (): null => {
  useReducedMotion();
  return null;
};
