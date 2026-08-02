"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import SwapText from "@/components/SwapText/SwapText";
import Reveal from "@/components/Reveal/Reveal";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { COMPACT_QUERY } from "@/styles/breakpoints";
import styles from "./Projects.module.scss";

export interface ProjectRow {
  slug: string;
  title: string;
  /** Two-letter mark used by the designed video fallback. */
  monogram: string;
  year: string;
  url: string | null;
  video: string;
  /** Brand-derived hex — the fallback tile's ground. */
  accent: string;
  outcome: string;
  tags: string[];
}

// SVG, not "↗": glyphs render at the font's mercy — weight, baseline and size
// all drift per platform, and they can't take a stroke width.
function CardArrow() {
  return (
    <svg
      className={styles.cardArrow}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

/**
 * A gallery of captioned panes: the media above, the facts below a hairline,
 * like plates in a catalogue. Pointing at (or tabbing to) a card starts its
 * recording; leaving rewinds it to the top. Cards with a public URL are
 * links, the rest are just plates.
 */
export default function ProjectsGallery({ rows }: { rows: ProjectRow[] }) {
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const reduced = useReducedMotion();

  // Touch has no hover, so the pointer can't be the play button there. Scroll
  // position is: the plate the reader has brought to the middle of the screen is
  // the one they are looking at, and it plays. Same effect, different question
  // asked of the reader — "where are you" instead of "what are you pointing at".
  const compact = useMediaQuery(COMPACT_QUERY);
  const galleryRef = useRef<HTMLUListElement>(null);
  const mediaRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [focused, setFocused] = useState<string | null>(null);

  // Hover is the play button. Under reduced motion nothing runs — the poster
  // frame (preload="metadata") or the monogram tile stands for the project.
  const play = useCallback(
    (slug: string) => {
      if (reduced) return;
      videoRefs.current.get(slug)?.play().catch(() => {
        /* Autoplay refused or file missing — the fallback tile is behind it. */
      });
    },
    [reduced],
  );

  // Leaving rewinds: the next visit starts the recording from the top, like
  // picking the plate up fresh — a video resumed mid-scroll reads as broken.
  const reset = useCallback((slug: string) => {
    const video = videoRefs.current.get(slug);
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }, []);

  // Which plate is "the one being looked at": the media box whose centre sits
  // nearest the middle of the screen. Nearest, rather than a band the box has to
  // be inside — a band leaves dead zones in the gaps between cards, where
  // nothing qualifies and the recording that was playing stops for no reason the
  // reader can see. There is always a nearest, so there is always exactly one.
  //
  // Measured off the media box, not the whole card: the card includes its
  // caption, and its centre sits well below the picture the rule is about.
  //
  // The scroll listener only exists while the gallery is on screen — the
  // observer is what turns it on and off, so scrolling the rest of the page
  // costs nothing.
  useEffect(() => {
    if (!compact || reduced) return;
    const gallery = galleryRef.current;
    if (!gallery) return;

    let frame = 0;
    let listening = false;

    const measure = () => {
      frame = 0;
      const middle = window.innerHeight / 2;

      let nearest: string | null = null;
      let shortest = Infinity;
      for (const [slug, el] of mediaRefs.current) {
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - middle);
        if (distance < shortest) {
          shortest = distance;
          nearest = slug;
        }
      }

      setFocused(nearest);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    const stopListening = () => {
      if (!listening) return;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      listening = false;
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (!listening) {
          window.addEventListener("scroll", onScroll, { passive: true });
          window.addEventListener("resize", onScroll);
          listening = true;
        }
        measure();
      } else {
        stopListening();
        // Nothing on screen is being looked at, so nothing is playing.
        setFocused(null);
      }
    });
    observer.observe(gallery);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      stopListening();
    };
  }, [compact, reduced]);

  // One plate plays at a time, and the cleanup is what stops the last one: when
  // `focused` moves on, React runs this effect's teardown against the *previous*
  // slug before starting the next. Same pair of calls the pointer makes.
  useEffect(() => {
    if (!compact || reduced || !focused) return;
    play(focused);
    return () => reset(focused);
  }, [compact, reduced, focused, play, reset]);

  return (
    <Reveal delay={0.12}>
      <ul ref={galleryRef} className={styles.gallery}>
        {rows.map((project) => {
          // The tags double as the overlay's record: the first is the kind of
          // work, the rest are what it was for, one per line.
          const [kind, ...detail] = project.tags;

          const content: ReactNode = (
            <>
              <div
                ref={(el) => {
                  if (el) mediaRefs.current.set(project.slug, el);
                  else mediaRefs.current.delete(project.slug);
                }}
                className={styles.media}
              >
                {/* The designed fallback sits under the video at all times:
                    it is the loading state, the failure state (a missing
                    .webm renders nothing, and this shows through) and the
                    reduced-motion poster all at once. */}
                <div
                  className={styles.fallback}
                  style={{ backgroundColor: project.accent }}
                >
                  <span className={styles.monogram}>{project.monogram}</span>
                </div>

                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(project.slug, el);
                    else videoRefs.current.delete(project.slug);
                  }}
                  className={styles.video}
                  src={project.video}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  tabIndex={-1}
                />

                {/* The hover record: ink washed up from the bottom edge with
                    the classification set into it. It stays in the DOM (and in
                    the accessibility tree) at all times — only its opacity and
                    a few px of travel are hover-bound. */}
                <div className={styles.overlay}>
                  <div className={styles.overlayInner}>
                    <span className={styles.overlayKind}>
                      <SwapText nowrap={false}>{kind}</SwapText>
                    </span>

                    {detail.map((tag, j) => (
                      <span key={j} className={styles.overlayDetail}>
                        <SwapText nowrap={false}>{tag}</SwapText>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* The caption: facts under a hairline, like a plate in a
                  catalogue — the pane is the picture, this is the record. */}
              <div className={styles.caption}>
                <span className={styles.captionTop}>
                  <span className={styles.cardTitle}>{project.title}</span>
                  <span className={styles.cardYear}>{project.year}</span>
                  {project.url && <CardArrow />}
                </span>

                {/* The tags live in the hover overlay now; the caption keeps
                    the facts that have to be readable at rest. */}
                <p className={styles.cardOutcome}>
                  <SwapText nowrap={false}>{project.outcome}</SwapText>
                </p>
              </div>
            </>
          );

          // Marks the plate the scroll has settled on. The stylesheet hangs the
          // whole hover treatment off this as well as off :hover, so the two
          // routes into the state produce the same plate. Only ever set on the
          // compact side — on the desktop the attribute simply never appears.
          const isFocused = compact && focused === project.slug;

          // The pointer stops being the trigger where the scroll is one. A tap
          // on a touch screen fires pointerenter with no pointerleave to follow
          // it, which would leave that plate playing under the one the reader
          // has actually scrolled to.
          const pointerPlay = compact
            ? undefined
            : {
                onPointerEnter: () => play(project.slug),
                onPointerLeave: () => reset(project.slug),
              };

          return (
            <li key={project.slug}>
              {project.url ? (
                <a
                  className={styles.card}
                  data-focused={isFocused ? "true" : undefined}
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...pointerPlay}
                  // Keyboard keeps its own way in at every width: a tablet with
                  // a keyboard tabs through these too.
                  onFocus={() => play(project.slug)}
                  onBlur={() => reset(project.slug)}
                >
                  {content}
                </a>
              ) : (
                // No URL, no link: the plate still plays, it just doesn't
                // pretend to go anywhere.
                <div
                  className={styles.card}
                  data-focused={isFocused ? "true" : undefined}
                  {...pointerPlay}
                >
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Reveal>
  );
}
