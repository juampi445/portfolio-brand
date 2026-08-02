"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { COMPACT_QUERY } from "@/styles/breakpoints";
import styles from "./ScrollReveal.module.scss";

type ScrollRevealProps = {
  base: ReactNode;
  overlay: ReactNode;
};

// useLayoutEffect on the client, useEffect on the server — the layout variant
// warns during SSR, and there is no layout to measure there anyway.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Keep in sync with $reveal-radius in ScrollReveal.module.scss.
const REVEAL_RADIUS = 0.75;

// How far the compact branch lets the page move before the bar takes its
// backing. Small on purpose: the bar goes white as soon as the page starts
// moving, rather than waiting on a section edge — on a phone the nav is a
// permanent object over whatever is passing under it, and it has to be legible
// from the first flick.
//
// Not 0: a rubber-band overscroll or a browser restoring a scroll position of a
// pixel or two would otherwise flip the bar back and forth. 12px is under a
// finger's slop and over that noise.
const COMPACT_HANDOFF = 12;

export default function ScrollReveal({ base, overlay }: ScrollRevealProps) {
  // The whole reveal — a 250vh track, a pinned stage, a growing clip circle and
  // the second hero inside it — is a wheel-scrolled desktop set piece. Below the
  // line it is not rendered at all rather than hidden: the overlay carries a
  // marquee running its own animation loop, and there is nothing to reveal on a
  // screen where the circle would be most of a phone anyway.
  const compact = useMediaQuery(COMPACT_QUERY);

  const trackRef = useRef<HTMLDivElement>(null);
  const rampRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Layout effect, not effect: the circle has to be published before the browser
  // paints. On a locale switch this component remounts (the [lang] segment
  // changes), and a post-paint effect would let the nav render one frame against
  // a --reveal-r of 0 — the whole bar flipping colour and back.
  useIsomorphicLayoutEffect(() => {
    if (compact) return;
    const track = trackRef.current;
    const ramp = rampRef.current;
    const stage = stageRef.current;
    if (!track || !ramp || !stage) return;

    const root = document.documentElement;
    let frame = 0;

    const update = () => {
      frame = 0;
      // The circle finishes after the ramp; the rest of the track is the hold,
      // where the stage stays pinned with the reveal already at 1.
      const distance = ramp.offsetHeight;
      const scrolled = -track.getBoundingClientRect().top;
      const progress =
        distance > 0 ? Math.min(Math.max(scrolled / distance, 0), 1) : 1;

      stage.style.setProperty("--reveal", progress.toFixed(4));

      // Republish the same circle in viewport coordinates so elements outside
      // the stage (the fixed nav) can clip against it and stay in lockstep.
      const rect = stage.getBoundingClientRect();

      // A clip-path radius of 100% resolves to sqrt(w² + h²) / sqrt(2), which is
      // what REVEAL_RADIUS below is a fraction of. Matching that formula here
      // keeps the pixel circle identical to the percentage one in the stylesheet.
      const reference = Math.hypot(rect.width, rect.height) / Math.SQRT2;
      const radius = progress * REVEAL_RADIUS * reference;

      // Once the circle has fully covered the screen, freeze it open — radius
      // *and* centre. The stage scrolls away, dragging its midpoint thousands
      // of pixels above the viewport; a frozen radius alone still loses the
      // nav once that distance outgrows it (which is exactly what happened by
      // the Contact section). Pinned to the viewport centre, 200vmax can never
      // be outrun. The centre hand-off is invisible: at progress 1 the circle
      // already covers the whole screen from either centre.
      if (progress < 1) {
        root.style.setProperty("--reveal-r", `${radius.toFixed(2)}px`);
        root.style.setProperty(
          "--reveal-cx",
          `${rect.left + rect.width / 2}px`,
        );
        root.style.setProperty(
          "--reveal-cy",
          `${rect.top + rect.height / 2}px`,
        );
      } else {
        root.style.setProperty("--reveal-r", "200vmax");
        root.style.setProperty("--reveal-cx", "50vw");
        root.style.setProperty("--reveal-cy", "50vh");
      }

      // 1 once the circle has fully covered the screen — i.e. the end of the ramp
      // and the start of the hold. The nav's solid backing keys off this.
      root.style.setProperty("--reveal-done", progress < 1 ? "0" : "1");
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);

      // The custom properties are deliberately left on :root. They describe the
      // reveal circle the fixed nav clips against, and the nav outlives this
      // component — clearing them on unmount is what made the navbar blink on
      // every language switch. A remount republishes them in the same frame.
    };
  }, [compact]);

  // The compact branch still owns the same three custom properties, because the
  // nav is downstream of them and does not know which branch is running: the
  // translucent backing is `opacity: var(--reveal-done)` and the dark twin —
  // the readable copy of the bar over pale content — is gated on the same
  // variable here (see the compact rule for `.dark` in Nav.module.scss, which
  // swaps the clip circle for a plain crossfade, there being no circle).
  //
  // So: one flip, the moment the page starts moving.
  //
  // It lands before `useGrounded` in Nav.tsx (which goes solid at
  // `projects.top <= innerHeight * 0.5`) rather than with it, and that ordering
  // is the safe one — grounded forces the backing fully opaque on its own, so
  // the dark twin has to be in place by then or the light nav text would sit on
  // a solid light bar. Arriving early is invisible; arriving late is not.
  useIsomorphicLayoutEffect(() => {
    if (!compact) return;

    const root = document.documentElement;
    let frame = 0;

    const update = () => {
      frame = 0;
      const handedOver = window.scrollY > COMPACT_HANDOFF;

      root.style.setProperty("--reveal-done", handedOver ? "1" : "0");
      // No circle on this branch, but the variables are published anyway: the
      // nav's desktop rule is still in the cascade above the media query, and a
      // stale radius from a resize across the line would clip the twin to a
      // circle from the last layout.
      root.style.setProperty("--reveal-r", handedOver ? "200vmax" : "0px");
      root.style.setProperty("--reveal-cx", "50vw");
      root.style.setProperty("--reveal-cy", "50vh");
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      // Left published, for the same reason as above.
    };
  }, [compact]);

  if (compact) {
    // The hero alone, as an ordinary block. It brings its own full-screen floor, so
    // there is nothing for the stage to have held it against.
    return (
      <div ref={trackRef} className={styles.plain}>
        {base}
      </div>
    );
  }

  return (
    <div ref={trackRef} className={styles.track}>
      <div ref={rampRef} className={styles.ramp} aria-hidden />
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.base}>{base}</div>
        <div className={styles.overlay}>{overlay}</div>
      </div>
    </div>
  );
}
