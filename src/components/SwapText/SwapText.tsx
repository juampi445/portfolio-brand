"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// Ease-out-quint, the site's curve.
const EASE = [0.22, 1, 0.36, 1] as const;

type SwapTextProps = {
  children: string;
  className?: string;
  /**
   * Short labels hold one line while they crossfade — letting them re-wrap
   * mid-animation looks like a glitch. Prose has to wrap, so it opts out.
   */
  nowrap?: boolean;
  /**
   * The same label in the other locale. Given it, the box is sized to whichever
   * of the two is wider and *stays* that size, so a swap changes no widths at
   * all. Pass it anywhere a width change would push siblings around — the nav
   * especially. Omit it where the text owns its line and nothing sits beside it.
   */
  sizer?: string;
};

/**
 * Crossfades its text whenever the string changes, which in practice means a
 * locale switch.
 *
 * Both strings occupy one grid cell and dissolve through each other in place.
 * Nothing is pulled out of the flow on the way out (what `mode="popLayout"` does,
 * and why it lurched: the wrapper snapped to the incoming width the instant the
 * swap began, while the outgoing text floated free above it).
 *
 * That leaves one problem — the cell is as wide as the wider string while both
 * are mounted, then shrinks when the old one leaves, and the plain <a> elements
 * around it reflow instantly. `sizer` removes it at the root: two invisible
 * copies, one per locale, are parked in the same cell, so the cell is *always*
 * as wide as the wider of the two. The width never changes, so nothing moves.
 * The animation is then pure opacity and blur — no geometry, nothing to shift.
 *
 * `initial={false}` keeps it silent on first paint: this is a response to the
 * toggle, not an entrance on every page load.
 */
export default function SwapText({
  children,
  className,
  nowrap = true,
  sizer,
}: SwapTextProps) {
  const reduced = useReducedMotion();

  const enter = reduced ? { duration: 0 } : { duration: 0.34, ease: EASE };
  const leave = reduced
    ? { duration: 0 }
    : { duration: 0.22, ease: "easeOut" as const };

  const cell = {
    gridArea: "1 / 1",
    whiteSpace: nowrap ? ("nowrap" as const) : ("normal" as const),
  };

  const ghost = {
    ...cell,
    visibility: "hidden" as const,
    pointerEvents: "none" as const,
  };

  return (
    <motion.span
      // `layout` only where the box can still resize. With a sizer it can't, and
      // asking motion to project a size that never changes just adds jitter.
      layout={sizer ? false : "position"}
      className={className}
      transition={enter}
      // No `overflow: clip` here. Decorations hang *outside* the text box — the
      // nav links' underline sits below the baseline — and clipping ate them.
      // Nothing needs clipping anymore: both strings stay in normal flow, and
      // BorderGlow's inner container guards against scrollbars on its own.
      style={{
        position: "relative",
        display: "inline-grid",
        justifyItems: "start",
      }}
    >
      {sizer !== undefined && (
        <>
          <span aria-hidden style={ghost}>
            {children}
          </span>
          <span aria-hidden style={ghost}>
            {sizer}
          </span>
        </>
      )}

      <AnimatePresence initial={false}>
        <motion.span
          key={children}
          style={cell}
          initial={{ opacity: 0, filter: "blur(3px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, filter: "blur(3px)", transition: leave }}
          transition={enter}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}
