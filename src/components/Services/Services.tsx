"use client";

import { useCallback, useRef, useState } from "react";
import ScrollStack, {
  ScrollStackItem,
  type ScrollStackHandle,
} from "@/components/ScrollStack/ScrollStack";
import LineSidebar from "@/components/LineSidebar/LineSidebar";
import SwapText from "@/components/SwapText/SwapText";
import Reveal from "@/components/Reveal/Reveal";
import Carousel from "@/components/Carousel/Carousel";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { COMPACT_QUERY } from "@/styles/breakpoints";
import { ServiceIcon } from "./ServiceIcon";
import { palette } from "@/styles/palette";
import type { Dictionary } from "@/i18n/dictionaries";
import styles from "./Services.module.scss";

type ServicesDict = Dictionary["services"];

// Scroll order, and the order the marks are numbered in.
const SERVICE_IDS = ["landing", "events", "professional"] as const;

type ServiceId = (typeof SERVICE_IDS)[number];

// SVG, not "→": glyph arrows render at the font's mercy — weight, baseline and
// size all drift per platform, and they can't take a stroke width.
function CtaArrow() {
  return (
    <svg
      className={styles.ctaArrow}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

// The inside of a service card: an identity rail (the mark, a glance-line and
// when it ships) and the offer, split by a hairline. Only the shell around it
// changes between the two layouts — a pinned stack card on the desktop, a
// slide below the collapse — so the contents live here once.
//
// `compact` is the slide's cut of it. A card being read while it is held under
// a thumb, one of three, gets the claim and nothing that only pays off on a
// second read: no glance-line under the title that already says it, and no
// deliverables ledger. The ledger is the part someone reads once they are
// choosing, and by then they are on the desktop side or in the conversation the
// hand-off opens — three of them stacked in a swipe track is a wall.
function ServiceCardBody({
  id,
  dict,
  compact = false,
}: {
  id: ServiceId;
  dict: ServicesDict;
  compact?: boolean;
}) {
  const copy = dict.items[id];

  return (
    <>
      {/* Identity rail: the service's mark, a glance-line, and when it ships. A
          hairline (in the stylesheet) divides it from the offer — a rule, not a
          box. */}
      <div className={styles.cardAside}>
        <span className={styles.cardIcon} aria-hidden>
          <ServiceIcon id={id} />
        </span>
        <div className={styles.cardMeta}>
          {!compact && (
            <span className={styles.cardTag}>
              <SwapText nowrap={false}>{copy.tag}</SwapText>
            </span>
          )}
          <span className={styles.cardTimeline}>
            <SwapText nowrap={false}>{copy.timeline}</SwapText>
          </span>
        </div>
      </div>

      {/* The offer: claim, one line of it, then what it buys. */}
      <div className={styles.cardMain}>
        <h3 className={styles.cardTitle}>
          <SwapText nowrap={false}>{copy.title}</SwapText>
        </h3>
        <p className={styles.cardLead}>
          <SwapText nowrap={false}>{copy.lead}</SwapText>
        </p>

        {!compact && (
          <div className={styles.cardIncluded}>
            <span className={styles.includedLabel}>
              <SwapText>{dict.includedLabel}</SwapText>
            </span>
            {/* Deliverables as a ledger: hairline rows, no bullets. */}
            <ul className={styles.includedList}>
              {copy.included.map((row, ri) => (
                <li key={ri} className={styles.includedItem}>
                  <SwapText nowrap={false}>{row}</SwapText>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

export default function Services({ dict }: { dict: ServicesDict }) {
  // False through the server render, so the desktop stack is what ships in the
  // HTML and the track takes over on a phone right after hydration.
  const compact = useMediaQuery(COMPACT_QUERY);

  // Which card is front-most in the stack. Reported by ScrollStack as you scroll
  // (that's the sidebar → follows → scroll direction), and set optimistically on
  // a sidebar click while the scroll it triggers catches up (the click → scrolls
  // → confirms direction). Stable callback so ScrollStack's effect doesn't re-init
  // Lenis on every render.
  const [active, setActive] = useState(0);
  const handleCardChange = useCallback((index: number) => setActive(index), []);

  const stackRef = useRef<ScrollStackHandle>(null);

  // Sidebar click: jump the highlight now, then scroll the stack to that card —
  // the scroll's own onCardChange keeps things honest as it settles.
  const handleSelect = useCallback((index: number) => {
    setActive(index);
    stackRef.current?.scrollToCard(index);
  }, []);

  const labels = SERVICE_IDS.map((id) => dict.items[id].title);

  // The fourth service, as two lines instead of a card. Where it goes is the one
  // thing that changes between the layouts: on the desktop it closes the sticky
  // rail, under the index of the three shapes. Stacked, that same position would
  // put "need something outside these three?" *above* the three — an escape
  // hatch offered before the thing it is an escape from. So on the compact side
  // it is rendered after the track instead, which is where it means what it says.
  const handoff = (
    <Reveal delay={0.1} className={styles.cta}>
      <p className={styles.ctaQuestion}>
        <SwapText nowrap={false}>{dict.cta.question}</SwapText>
      </p>
      <a className={styles.ctaLink} href="#contact">
        <SwapText nowrap={false}>{dict.cta.action}</SwapText>
        <CtaArrow />
      </a>
    </Reveal>
  );

  return (
    <section id="services" className={styles.services}>
      <div className={styles.inner}>
        {/* Left rail: the claim, a live index of the three shapes, and the
            custom-work hand-off. Sticky, so it stays in view the whole way down
            while the cards stack past it on the right. */}
        <div className={styles.rail}>
          <Reveal className={styles.head}>
            {/* The label names the section; the heading makes its claim. */}
            <span className={styles.label}>
              <SwapText>{dict.title}</SwapText>
            </span>
            <h2 className={styles.heading}>
              <SwapText nowrap={false}>{dict.heading}</SwapText>
            </h2>
          </Reveal>

          {/* Live index of the three shapes. Two-way bound to the stack: `active`
              follows the scroll, and a click scrolls the stack to that card. No
              numbers — the services aren't an ordered sequence. Not re-keyed on
              locale: LineSidebar keys its rows positionally, so the labels swap in
              place on a language switch without remounting (which would reset the
              active marker and break hover). */}
          <LineSidebar
            className={styles.index}
            items={labels}
            active={active}
            onItemClick={handleSelect}
            showIndex={false}
            accentColor={palette.primary}
            textColor="#c6c6c6"
            markerColor="#7a7a7a"
            markerLength={44}
            markerGap={4}
            itemGap={20}
            fontSize={1.1}
            maxShift={14}
            // Measured from the edge of a row, so this is purely the ramp
            // across the 20px gap: the row under the pointer is always at full
            // strength. 30 puts the handoff a little past halfway through the
            // gap, which is where the eye expects the next row to take over.
            proximityRadius={30}
            smoothing={130}
          />

          {!compact && handoff}
        </div>

        {/* Below the collapse the same three cards ride a swipe track. The rail
            is no longer sticky there, so a stack that pins against the document
            would just be three cards taking three screens of scroll with
            nothing beside them — and the pinning itself (Lenis + per-frame
            transforms) is the part a phone pays most for. Swapped, not
            CSS-hidden: mounting both would run two sets of the cards' WebGL
            marks at once. */}
        {compact ? (
          <Carousel
            className={styles.carousel}
            items={SERVICE_IDS.map((id) => ({
              id,
              content: (
                <div className={`${styles.card} ${styles.slideCard}`}>
                  <ServiceCardBody id={id} dict={dict} compact />
                </div>
              ),
            }))}
            // No looping: the wrap is done with edge clones, and each card
            // carries a live WebGL mark — two clones would mean five contexts
            // for three services, on the device with the tightest budget for
            // them. Three cards fenced at both ends read as a short list
            // anyway, which is what this is.
            label={dict.title}
            slideLabel={(n) => labels[n - 1]}
          />
        ) : (
          /* Each service as a full card that pins and stacks as you scroll —
             the three "shapes of the same work" laid one over another.
             useWindowScroll: the page is the scroller, so cards pin against the
             document rather than trapping the wheel in a nested panel. */
          <ScrollStack
            ref={stackRef}
            className={styles.stack}
            useWindowScroll
            itemDistance={160}
            itemStackDistance={24}
            itemScale={0.035}
            baseScale={0.86}
            stackPosition="30%"
            scaleEndPosition="16%"
            onCardChange={handleCardChange}
          >
            {SERVICE_IDS.map((id) => (
              <ScrollStackItem key={id} itemClassName={styles.card}>
                <ServiceCardBody id={id} dict={dict} />
              </ScrollStackItem>
            ))}
          </ScrollStack>
        )}

        {compact && handoff}
      </div>
    </section>
  );
}
