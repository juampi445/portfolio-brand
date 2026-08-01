"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// Ease-out-quint — the same curve as the text swaps, the language toggle and the
// ledger rows. One motion vocabulary across the site.
const EASE = [0.22, 1, 0.36, 1] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Seconds to hold before starting. Stagger siblings with 0.06–0.12 steps. */
  delay?: number;
};

/**
 * Fades a block up into place the first time it scrolls into view.
 *
 * Deliberately small: 12px of travel, no scale, no blur. The element should look
 * like it settled, not like it flew in — anything larger reads as a slide deck.
 *
 * `once` because a reveal is an arrival. Re-firing it every time the section
 * scrolls back past turns the page into a carousel of its own content.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
}: RevealProps) {
  const reduced = useReducedMotion();

  // Nothing to animate under reduced motion — render the content as-is rather
  // than animating to the same place over 0s, which leaves a stray transform.
  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
