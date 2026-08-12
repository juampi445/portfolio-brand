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

// Scroll order, and the order the packages are numbered in.
//
// The ids are internal keys, and they no longer describe what is in the card:
// they date from the three service *shapes* this section used to hold. They are
// kept because they key the dictionaries, the marks and the stack, and renaming
// them buys nothing. Read them as tier 1, 2, 3:
//
//   landing      → package 1, the fixed-price site
//   events       → package 2, the site plus its editing panel
//   professional → package 3, custom work, priced on scope
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
// `compact` is the slide's cut of it, and it is down to one line now: the
// glance-line naming who the package is for. In the strip layout that line sits
// beside the mark as a third centred sentence and pushes the offer off the
// fold, and it is the one thing on the card a price and three deliverables
// already imply.
//
// The ledger stays on both sides. It used to be dropped here — three ledgers of
// six rows each in a swipe track was a wall — but the packages are three rows
// now, and without it the slide would be a title and a payment line over a
// screen of empty paper. It is also the part someone actually compares.
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

  // `in` rather than an optional property: the dictionary is typed from the
  // JSON itself, so only the item that carries the override has the key at all.
  const includedLabel =
    ("includedLabel" in copy ? copy.includedLabel : undefined) ??
    dict.includedLabel;

  return (
    <>
      {/* Identity rail: the package's mark, then two groups — what it costs,
          and who and when. A hairline (in the stylesheet) divides the whole
          from the offer beside it: a rule, not a box.
          Two groups and not five lines, because five lines set at one interval
          is a list, and a list has no hierarchy: the price would be the biggest
          item in it rather than the thing the rest hangs off. So the deposit
          line is welded to the price as its footnote, and the glance-line and
          the delivery date are set apart as a second, quieter pair. */}
      <div className={styles.cardAside}>
        <span className={styles.cardIcon} aria-hidden>
          <ServiceIcon id={id} />
        </span>

        {/* What it costs, and how it is paid. `nowrap={false}` on the price
            because the custom tier's is a phrase, not a number, and it has to
            be allowed to break rather than push the column open. */}
        <div className={styles.cardPriceBlock}>
          <span className={styles.cardPrice}>
            <SwapText nowrap={false}>{copy.price}</SwapText>
          </span>
          <span className={styles.cardTerms}>
            <SwapText nowrap={false}>{copy.terms}</SwapText>
          </span>
        </div>

        {/* Who it is for, and when it lands. The compact strip drops the first
            of the two: beside a mark rather than under one there is no room for
            a qualifying line, and the ledger a swipe below says the same thing
            in specifics. */}
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

      {/* The offer: which rung this is, the claim, what it buys, and what it
          costs to start. */}
      <div className={styles.cardMain}>
        {/* The rung number, above the name rather than beside it. The three
            packages are a ladder and the card should say so before it says
            anything else — "02" over "Web + Panel" reads as a position; the
            same figure set beside the title would read as a price. Held in the
            dictionary as a string, not derived from the array index, so the
            two locales can't drift from the numbering the sidebar shows. */}
        {/* The rung number, set inline with the name at nearly its size and in
            a half-strength accent: "01 Web Profesional" reads as one line, the
            way a catalogue numbers its plates. It was an eyebrow above the
            title and it read as neither — too small to count as a number, too
            separate to belong to the name.
            Inside the heading, so it is announced with the title rather than
            as a loose figure before it. No SwapText: the same string in both
            locales, so there is nothing to crossfade. */}
        <h3 className={styles.cardTitle}>
          <span className={styles.cardIndex}>{copy.index}</span>
          <SwapText nowrap={false}>{copy.title}</SwapText>
        </h3>

        <div className={styles.cardIncluded}>
          {/* Package 1 is the base tier: it inherits nothing. The row is still
              reserved, so the three ledgers keep the same number of slots and
              the cards agree in height — but it is reserved *above* the label,
              not inside the list. Held under the label it opened a gap between
              the eyebrow and the first hairline, so the base card read as
              "Incluye, nothing, then the items". Above it, every card runs
              label → rows, and package 1's eyebrow sits straight on top of its
              first separator. */}
          {!("inherits" in copy && copy.inherits) && (
            <div className={styles.inheritsSpacer} aria-hidden />
          )}

          {/* The shared label ("Incluye") is a promise, and the custom tier
              cannot make it — its rows are examples of what can be added, not
              a list of what comes with it. So an item may override the label
              for itself; only that one does. */}
          <span className={styles.includedLabel}>
            <SwapText>{includedLabel}</SwapText>
          </span>
          {/* Deliverables as a ledger: hairline rows, no bullets.
              Package 2 and 3 open on what they inherit — the rung below,
              carried whole. It is the first row because that is the reading
              order of a ladder ("everything before this, plus…"), and it is
              tinted and set in the accent because it is a different kind of
              claim from the rows under it: those are things I build, this is
              a thing you already have. */}
          <ul className={styles.includedList}>
            {"inherits" in copy && copy.inherits && (
              <li className={`${styles.includedItem} ${styles.inheritsItem}`}>
                <SwapText nowrap={false}>{copy.inherits}</SwapText>
              </li>
            )}
            {copy.included.map((row, ri) => (
              <li key={ri} className={styles.includedItem}>
                <SwapText nowrap={false}>{row}</SwapText>
              </li>
            ))}
          </ul>
        </div>
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

  // Help choosing, as two lines instead of a card — not a fourth package: the
  // third one is already the escape hatch, and offering "something else" beside
  // it would read as two doors to the same room. Where it goes is the one thing
  // that changes between the layouts: on the desktop it closes the sticky rail,
  // under the index of the three tiers. Stacked, that same position would ask
  // "which one suits you?" *above* the three it is asking about, so on the
  // compact side it is rendered after the track instead.
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
        {/* Left rail: the claim, a live index of the three tiers, and the
            hand-off for choosing between them. Sticky, so it stays in view the
            whole way down while the cards stack past it on the right. */}
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

          {/* Live index of the three packages. Two-way bound to the stack:
              `active` follows the scroll, and a click scrolls the stack to that
              card. Numbered now — these are tiers, and they are read in order:
              the index says which of the three you are on, which is exactly the
              question the section raises. The figures are held back to a quiet
              mono in the stylesheet so they read as position, not as a second
              price. Not re-keyed on locale: LineSidebar keys its rows
              positionally, so the labels swap in place on a language switch
              without remounting (which would reset the active marker and break
              hover). */}
          <LineSidebar
            className={styles.index}
            items={labels}
            active={active}
            onItemClick={handleSelect}
            showIndex
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
          /* Each package as a full card that pins and stacks as you scroll —
             the three tiers laid one over another, in price order.
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
