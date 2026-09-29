import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Subtle page-transition wrapper.
 *
 * Fades + slides content in on route change. Respects
 * prefers-reduced-motion (framer-motion's `motion` automatically
 * disables transforms when the user has reduced motion enabled).
 */
const variants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
