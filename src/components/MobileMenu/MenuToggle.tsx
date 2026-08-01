"use client";

import { motion, useReducedMotion } from "motion/react";
import styles from "./MobileMenu.module.scss";

// Ease-out-quint, the site's curve.
const EASE = [0.22, 1, 0.36, 1] as const;

type MenuToggleProps = {
  open: boolean;
  onToggle: () => void;
  /** Names the action in the current locale — the button is icon-only. */
  label: string;
  /** The id of the panel this controls, for aria-controls. */
  controls: string;
};

/**
 * Two hairlines that cross into an X. Rendered inside NavRow, which means it is
 * painted once per colour layer — currentColor, so it inverts with the reveal
 * circle exactly like the logo pill and the CTA. Only the light layer takes a
 * pointer (the dark twin is `inert`), so the duplicate never receives the click.
 *
 * The reference component spins a plus 225°. A plus is a decoration, not an
 * affordance: two stacked lines say "menu" before anything animates, and the
 * same two lines are already the X you close with.
 */
export default function MenuToggle({
  open,
  onToggle,
  label,
  controls,
}: MenuToggleProps) {
  const reduced = useReducedMotion();

  // Enter and exit share a curve here on purpose: this is one gesture played
  // forwards and backwards, not an element arriving and leaving.
  const transition = reduced ? { duration: 0 } : { duration: 0.45, ease: EASE };

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={onToggle}
      aria-label={label}
      aria-expanded={open}
      aria-controls={controls}
    >
      <span className={styles.toggleIcon} aria-hidden>
        {/* Rotating about their own centres after meeting in the middle: the
            translate and the rotate run together, so the lines converge as they
            turn rather than snapping shut and then spinning. */}
        <motion.span
          className={styles.toggleLine}
          animate={open ? { y: 0, rotate: 45 } : { y: -6, rotate: 0 }}
          initial={false}
          transition={transition}
        />
        <motion.span
          className={styles.toggleLine}
          animate={open ? { y: 0, rotate: -45 } : { y: 6, rotate: 0 }}
          initial={false}
          transition={transition}
        />
      </span>
    </button>
  );
}
