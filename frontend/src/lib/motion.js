import { useReducedMotion } from "framer-motion";

/**
 * Central animation variants for the redesign. Every variant here is
 * intentionally subtle (short distances, quick durations) and every
 * consumer should pull timings through `useMotionPreset()` so that
 * `prefers-reduced-motion` is respected automatically — components never
 * need to branch on it themselves.
 */
const BASE = {
  fadeUp: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.94 },
    show: { opacity: 1, scale: 1 },
  },
  slideInLeft: {
    hidden: { opacity: 0, x: -24 },
    show: { opacity: 1, x: 0 },
  },
  slideInRight: {
    hidden: { opacity: 0, x: 24 },
    show: { opacity: 1, x: 0 },
  },
};

const REDUCED = Object.fromEntries(
  Object.keys(BASE).map((key) => [
    key,
    { hidden: { opacity: 0 }, show: { opacity: 1 } },
  ])
);

export function staggerContainer(staggerChildren = 0.08, delayChildren = 0) {
  return {
    hidden: {},
    show: {
      transition: { staggerChildren, delayChildren },
    },
  };
}

/** Returns motion variants + a default transition, aware of the user's OS motion preference. */
export function useMotionPreset() {
  const reduce = useReducedMotion();
  return {
    variants: reduce ? REDUCED : BASE,
    transition: reduce
      ? { duration: 0.15 }
      : { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
    viewport: { once: true, amount: 0.2 },
  };
}
