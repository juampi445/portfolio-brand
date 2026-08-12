"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import BorderGlow from "@/components/BorderGlow/BorderGlow";
import LanguageToggle from "@/components/LanguageToggle/LanguageToggle";
import MenuToggle from "@/components/MobileMenu/MenuToggle";
import MobileMenu, { MENU_PANEL_ID } from "@/components/MobileMenu/MobileMenu";
import SwapText from "@/components/SwapText/SwapText";
import { palette } from "@/styles/palette";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import en from "@/i18n/dictionaries/en.json";
import es from "@/i18n/dictionaries/es.json";
import styles from "./Nav.module.scss";

// The Contact section's id — the CTA and the Contact link point here; the
// smooth scroll itself is `scroll-behavior` in globals.scss.
const CONTACT_HREF = "#contact";

// The hero has no id of its own; `#top` is the HTML-specified fragment for the
// top of the document, which is where the hero lives.
const HOME_HREF = "#top";

// $color-primary (#47D7B5) as the "H S L" channels BorderGlow expects.
const GLOW_HSL = "166 64 56";

// Static imports, both locales, on purpose. The nav lives in the *root* layout —
// outside the [lang] segment — so it can't receive the locale as a prop without
// remounting when it changes, and that remount (a destroyed and recreated
// backdrop-filter header) is exactly the navbar blink this replaced. Reading the
// locale from the URL keeps the component instance alive across switches; the
// cost is both dictionaries in the client bundle, ~1KB each.
const dictionaries = { en, es } as const;

function useLocale(): Locale {
  const pathname = usePathname();
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : defaultLocale;
}

// The page's sections, in scroll order. The hero is deliberately absent: it has
// no nav link, so nothing is marked current while it's on screen.
const SECTION_IDS = [
  "projects",
  "services",
  "process",
  "about",
  "contact",
] as const;

// One source for the destinations, shared by the desktop bar and the mobile
// panel, so the two can't drift out of order or out of sync.
const LINKS = [
  { key: "projects", href: "#projects" },
  { key: "services", href: "#services" },
  { key: "process", href: "#process" },
  { key: "about", href: "#about" },
  { key: "contact", href: CONTACT_HREF },
] as const;

// Which section the viewport is in, as its id — or null over the hero. The
// "viewport" here is really the line across its vertical middle: shrinking the
// observer's root to that line (rootMargin -50% top and bottom) means exactly
// one full-height section can intersect at a time, so there's no threshold
// tuning and no tie-breaking.
function useActiveSection(): string | null {
  const pathname = usePathname();
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = SECTION_IDS.flatMap((id) => {
      const el = document.getElementById(id);
      return el ? [el] : [];
    });
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Leaves first, enters second: a hand-off between neighbouring sections
        // arrives as one batch, and the section being entered must win it.
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            setActive((current) =>
              current === entry.target.id ? null : current,
            );
          }
        }
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
    // Re-observe on navigation: a locale switch remounts the [lang] segment and
    // replaces every section element, leaving the old observer watching nodes
    // that are no longer in the document.
  }, [pathname]);

  return active;
}

// Whether the bar sits over content (Projects onward) rather than the hero, for
// its solid-background state. Deliberately *not* derived from useActiveSection:
// that observer drives the per-link "you are here" underline, and a tall section
// (the Services card stack) can leave its centre-line detection between states.
// The background just needs one boolean — "have we reached Projects yet" — so it
// reads the Projects section's position directly and latches on when its top
// passes the viewport middle. Monotonic with scroll, so it stays on for every
// section after Projects too.
function useGrounded(): boolean {
  const pathname = usePathname();
  const [grounded, setGrounded] = useState(false);

  useEffect(() => {
    const projects = document.getElementById("projects");
    if (!projects) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const top = projects.getBoundingClientRect().top;
      setGrounded(top <= window.innerHeight * 0.5);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // Re-bind on navigation: a locale switch replaces the section elements.
  }, [pathname]);

  return grounded;
}

// Long shaft, shallow head, hairline stroke — a stock 24px icon-set arrow reads
// stubby and heavy next to text this size. `currentColor` so it inverts with the
// nav's two colour layers. Decorative: the link's text already names it.
function Arrow() {
  return (
    <svg
      className={styles.arrow}
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

// Rendered twice, once per colour layer — single source of truth so the two
// copies stay pixel-identical.
function NavRow({
  locale,
  active,
  grounded,
  menuOpen,
  onMenuToggle,
}: {
  locale: Locale;
  active: string | null;
  grounded: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
}) {
  const dict = dictionaries[locale].nav;

  // The label in the locale we're *not* in. Every SwapText in the bar is sized
  // to the wider of its two languages and stays that size, so a switch is a pure
  // crossfade: no width changes, so nothing in the nav can shift.
  const other = dictionaries[locale === "en" ? "es" : "en"].nav;

  // Same order as the sections on the page.
  const links = LINKS.map(({ key, href }) => ({
    label: dict[key],
    sizer: other[key],
    href,
  }));

  return (
    <>
      {/* Home, not contact: the avatar is the identity mark, and identity marks
          go to the start. The name is a proper noun, identical in both locales —
          SwapText stays anyway so the pill keeps the same sizing mechanics as
          every other label in the bar. */}
      <a className={styles.logo} href={HOME_HREF}>
        <Image
          src="/avatar.png"
          alt=""
          width={56}
          height={56}
          priority
          className={styles.logoImg}
        />
        <span className={styles.logoLabel}>
          <SwapText className={styles.logoLabelText} sizer={other.name}>
            {dict.name}
          </SwapText>
        </span>
      </a>

      <nav className={styles.links}>
        {/* Keyed by position, not by label: the label is the thing that changes,
            and keying on it would remount the link and defeat the crossfade. */}
        {/* aria-current marks the section on screen — the stylesheet keeps that
            link's underline drawn, and screen readers announce it. */}
        {links.map(({ label, sizer, href }, i) => (
          <a
            key={i}
            href={href}
            aria-current={href === `#${active}` ? "true" : undefined}
          >
            <SwapText sizer={sizer}>{label}</SwapText>
          </a>
        ))}
      </nav>

      <div className={styles.actions}>
        <LanguageToggle
          locale={locale}
          label={dict.switchLanguage}
          grounded={grounded}
        />

        <BorderGlow
          className={styles.cta}
          backgroundColor="transparent"
          glowColor={GLOW_HSL}
          colors={[palette.primary, palette.primaryLight, palette.primary]}
          borderRadius={999}
          // The full ring lights on hover; the cursor-tracked arc is saved for
          // the cards, where the element is big enough for the sweep to read.
          uniform
          edgeSensitivity={0}
          glowRadius={20}
          glowIntensity={0.95}
          // 0 kills the ::after interior mesh fill. At this size it reads as the
          // button being stained rather than lit; only the border glow is wanted.
          fillOpacity={0}
        >
          <a className={styles.ctaLink} href={CONTACT_HREF}>
            <SwapText sizer={other.cta}>{dict.cta}</SwapText>
            <Arrow />
          </a>
        </BorderGlow>

        {/* Small screens only. The CTA beside it steps aside there — four
            controls do not fit at 375px — and reappears as the panel's primary
            action, which is also where it has the width to look like one. */}
        <MenuToggle
          open={menuOpen}
          onToggle={onMenuToggle}
          label={menuOpen ? dict.closeMenu : dict.openMenu}
          controls={MENU_PANEL_ID}
        />
      </div>
    </>
  );
}

export default function Nav() {
  const locale = useLocale();
  const active = useActiveSection();
  const grounded = useGrounded();
  const [menuOpen, setMenuOpen] = useState(false);

  const dict = dictionaries[locale];

  // The root layout ships lang="en" (it's static and can't know the locale);
  // an inline script corrects the first paint, this keeps it correct across
  // client-side locale switches.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Home opens the panel's list, and only the panel's. On the bar the avatar
  // pill is the way back to the top and is on screen at all times; inside the
  // panel that pill is covered by the panel itself, so without this row the
  // menu is the one place on the site with no way home. Prepended here rather
  // than added to LINKS, which the desktop bar reads from too — there it would
  // be a second home affordance sitting beside the first.
  const menuLinks = [
    { label: dict.nav.home, href: HOME_HREF },
    ...LINKS.map(({ key, href }) => ({ label: dict.nav[key], href })),
  ];

  return (
    // data-grounded latches on once Projects reaches the viewport middle — past
    // the hero and its held twin. It is the third nav state: the backing goes
    // fully solid and opaque and the action borders go solid, since the bar now
    // sits over content rather than the hero.
    <header
      className={styles.nav}
      data-grounded={grounded ? "true" : undefined}
    >
      <div className={styles.layer}>
        <NavRow
          locale={locale}
          active={active}
          grounded={grounded}
          menuOpen={menuOpen}
          onMenuToggle={toggleMenu}
        />
      </div>

      {/* The dark twin, clipped to the reveal circle published by ScrollReveal.
          Inert: the layer below it owns all interaction and accessibility — and
          `inert` (not just aria-hidden) is what keeps its duplicate links and
          language buttons out of the tab order. */}
      <div className={`${styles.layer} ${styles.dark}`} aria-hidden inert>
        <NavRow
          locale={locale}
          active={active}
          grounded={grounded}
          menuOpen={menuOpen}
          onMenuToggle={toggleMenu}
        />
      </div>

      {/* Covers the whole screen when open, this bar included — it brings its
          own close button, so the header needs no special open state. */}
      <MobileMenu
        open={menuOpen}
        onClose={closeMenu}
        links={menuLinks}
        // `top` where the bar's own links get null: the observer reports no
        // section over the hero, which used to mean "mark nothing" — right when
        // there was no home link to mark. The panel has one now, and it is
        // where you are, so it says so. The bar is unaffected: none of its
        // hrefs is `#top`, so nothing there matches.
        active={active ?? "top"}
        strings={{
          menuLabel: dict.nav.menuLabel,
          directLabel: dict.footer.directLabel,
          linkedin: dict.footer.linkedin,
          cta: dict.nav.cta,
          email: dict.contact.email,
          emailLabel: dict.contact.form.email,
          closeLabel: dict.nav.closeMenu,
        }}
      />
    </header>
  );
}
