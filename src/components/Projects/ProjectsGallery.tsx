"use client";

import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import SwapText from "@/components/SwapText/SwapText";
import Reveal from "@/components/Reveal/Reveal";
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

  // Hover is the play button. Under reduced motion nothing runs — the poster
  // frame (preload="metadata") or the monogram tile stands for the project.
  const play = (slug: string) => {
    if (reduced) return;
    videoRefs.current.get(slug)?.play().catch(() => {
      /* Autoplay refused or file missing — the fallback tile is behind it. */
    });
  };

  // Leaving rewinds: the next visit starts the recording from the top, like
  // picking the plate up fresh — a video resumed mid-scroll reads as broken.
  const reset = (slug: string) => {
    const video = videoRefs.current.get(slug);
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };

  return (
    <Reveal delay={0.12}>
      <ul className={styles.gallery}>
        {rows.map((project) => {
          // The tags double as the overlay's record: the first is the kind of
          // work, the rest are what it was for, one per line.
          const [kind, ...detail] = project.tags;

          const content: ReactNode = (
            <>
              <div className={styles.media}>
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

          return (
            <li key={project.slug}>
              {project.url ? (
                <a
                  className={styles.card}
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onPointerEnter={() => play(project.slug)}
                  onPointerLeave={() => reset(project.slug)}
                  onFocus={() => play(project.slug)}
                  onBlur={() => reset(project.slug)}
                >
                  {content}
                </a>
              ) : (
                // No URL, no link: the plate still plays on hover, it just
                // doesn't pretend to go anywhere.
                <div
                  className={styles.card}
                  onPointerEnter={() => play(project.slug)}
                  onPointerLeave={() => reset(project.slug)}
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
