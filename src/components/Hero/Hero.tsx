"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import SideRays from "@/components/SideRays/SideRays";
import SwapText from "@/components/SwapText/SwapText";
import Reveal from "@/components/Reveal/Reveal";
import RotatingText from "@/components/RotatingText/RotatingText";
import Image from "next/image";
// import FloatingBrowserStack from "@/components/FloatingBrowserStack/FloatingBrowserStack";
import { palette } from "@/styles/palette";
import type { Dictionary } from "@/i18n/dictionaries";
import styles from "./Hero.module.scss";

type HeroDict = Dictionary["hero"];

const CONTACT_HREF = "#contact";

// The nav CTA's arrow, drawn identically: long shaft, shallow head, hairline
// stroke on a 40x24 box. The two are the same offer in two places, so they point
// with the same mark — a stock square icon-set arrow would read stubby and heavy
// beside it. SVG rather than "→", which renders at the font's mercy and can't
// take a stroke width.
function CtaArrow() {
  return (
    <svg
      className={styles.ctaArrow}
      viewBox="0 0 40 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M2 12h36" />
      <path d="M28 3l10 9-10 9" />
    </svg>
  );
}

// Ease-out-quint, the site's one motion curve — same as Reveal, the text swaps
// and the ledger rows. Travel decays to nothing at the end, so each plate looks
// like it settled into place rather than stopped.
const PLATE_EASE = [0.22, 1, 0.36, 1] as const;

// Entry for one device plate: in from the right, fading up, over a hold long
// enough to read as arrival rather than a slide. `from` is the px of travel and
// `delay` the beat it waits, so the two plates land in sequence.
// Under reduced motion it returns nothing at all: no initial state to animate
// out of means the plate renders in its final place, no transform left behind.
function plateEntry(reduced: boolean, delay: number, from: number) {
  if (reduced) return {};
  return {
    initial: { opacity: 0, x: from },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.95, ease: PLATE_EASE, delay },
  };
}

// The mint block behind the rotating word. RotatingText's own width animation
// (motion's `layout`) snaps in this composition, so the block doesn't rely on
// it: every word is rendered once as an invisible ghost, each rotation reads
// the next word's exact pixel width off its ghost, and a CSS transition on the
// measuring window does the glide.
function RotatingWord({ words, reduced }: { words: string[]; reduced: boolean }) {
  const ghostsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const indexRef = useRef(0);
  const [width, setWidth] = useState<number | undefined>(undefined);

  const fit = useCallback((index: number) => {
    indexRef.current = index;
    const ghost = ghostsRef.current[index];
    if (ghost) setWidth(ghost.offsetWidth);
  }, []);

  // First measure on mount, and re-measure whenever the ghosts change size —
  // the headline's font-size follows a viewport clamp, so the px widths drift
  // with the window. `words` in the deps re-measures on a locale switch.
  useEffect(() => {
    fit(indexRef.current);

    const ghost = ghostsRef.current[0];
    if (!ghost || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => fit(indexRef.current));
    observer.observe(ghost);
    return () => observer.disconnect();
  }, [fit, words]);

  return (
    <span className={styles.rotator}>
      <span
        className={styles.window}
        style={width !== undefined ? { width } : undefined}
      >
        <span className={styles.ghosts} aria-hidden>
          {words.map((word, i) => (
            <span
              key={word}
              ref={(el) => {
                ghostsRef.current[i] = el;
              }}
            >
              {word}
            </span>
          ))}
        </span>

        <RotatingText
          texts={words}
          onNext={fit}
          mainClassName={styles.words}
          splitLevelClassName={styles.rotatorClip}
          staggerFrom="last"
          staggerDuration={0.025}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-120%" }}
          transition={
            // Static swap under reduced motion — the words still cycle (the
            // content is the point), they just stop travelling.
            reduced
              ? { duration: 0 }
              : { type: "spring", damping: 30, stiffness: 400 }
          }
          rotationInterval={2600}
        />
      </span>
    </span>
  );
}

export default function Hero({ dict }: { dict: HeroDict }) {
  const reduced = useReducedMotion();

  return (
    <section className={styles.hero}>
      <div className={styles.rays}>
        <SideRays
          rayColor1={palette.primary}
          rayColor2={palette.primaryLight}
          origin="top-right"
          speed={1.6}
          intensity={1.4}
          spread={1.6}
          saturation={1.2}
          blend={0.6}
          falloff={1.8}
          opacity={0.9}
        />
      </div>

      <div className={styles.content}>
        <div className={styles.inner}>
          <Reveal>
            <p className={styles.kicker}>
              <SwapText nowrap={false}>{dict.kicker}</SwapText>
            </p>
          </Reveal>

          {/* One sentence, two lines: the static verb line, then the rotating
              object in a mint block. The rotator carries its own sr-only copy
              of the current word, so the h1 always reads as the full
              sentence. */}
          <Reveal delay={0.08}>
            <h1 className={styles.headline}>
              <span className={styles.headlineLine}>
                <SwapText nowrap={false}>{dict.headline}</SwapText>
              </span>
              <RotatingWord words={dict.words} reduced={reduced ?? false} />
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className={styles.tagline}>
              <SwapText nowrap={false}>{dict.tagline}</SwapText>
            </p>
          </Reveal>

          {/* The page's primary action, drawn as a rule instead of a button:
              label left, arrow right, a hairline spanning between them that
              the mint sweeps across on hover. The accent is already spent
              solid on the rotating word above, so this one spends it as a
              line — the section's own instrument, played once more. */}
          {/* The wrapper is the flex item in the stacked layout, and the link
              inside it is an inline-flex box — so on a phone it is the wrapper
              that has to do the centring. Named for that reason alone. */}
          <Reveal delay={0.24} className={styles.ctaWrap}>
            <a className={styles.cta} href={CONTACT_HREF}>
              <SwapText>{dict.cta}</SwapText>
              <CtaArrow />
            </a>
          </Reveal>
        </div>

        {/* Floating project showcase in the right column — decorative, so it's
            marked aria-hidden inside the component. Real project screenshots in
            depth order [background, middle, foreground]; the foreground plate
            is the one the composition is built around. Swap the paths to
            feature different work. */}
        {/* <FloatingBrowserStack
          className={styles.showcase}
          items={[
            { src: "/images/vincula.webp" },
            { src: "/images/rocketly.webp" },
            { src: "/images/quintana.webp" },
          ]}
        /> */}

        {/* Two device plates, dealt like a hand of cards: the upper one sits
            inboard toward the copy, the lower one hangs out to the right edge
            and lies over it. Both slide in from the right and fade up, the
            lower one a beat behind, so the composition assembles itself
            instead of arriving whole. Decorative, so aria-hidden. */}
        <div className={styles.devices} aria-hidden>
          <motion.div
            className={`${styles.plate} ${styles.plateUpper}`}
            {...plateEntry(reduced ?? false, 0.24, 56)}
          >
            <Image
              src="/images/devices2.webp"
              alt=""
              width={1920}
              height={1440}
              sizes="(max-width: 1024px) 55vw, 34vw"
              loading="eager"
              fetchPriority="high"
            />
          </motion.div>

          <motion.div
            className={`${styles.plate} ${styles.plateLower}`}
            {...plateEntry(reduced ?? false, 0.42, 76)}
          >
            <Image
              src="/images/devices1.webp"
              alt=""
              width={1920}
              height={1440}
              sizes="(max-width: 1024px) 55vw, 34vw"
              loading="eager"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
