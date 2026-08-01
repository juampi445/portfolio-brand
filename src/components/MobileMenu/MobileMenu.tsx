"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import contactData from "@/data/contact.json";
import {
  MailIcon,
  WhatsAppIcon,
  LinkedInIcon,
} from "@/components/icons/ChannelIcons";
import styles from "./MobileMenu.module.scss";

// The stack: two prelayers wiping in one after another before the ink panel
// lands on top — mint, then the sunk mint, then ink. A single ramp down the
// brand hue rather than unrelated colours, so what reads is one surface
// thickening, not three things arriving.
//
// The colours and every duration live in the stylesheet, keyed off `data-tone`;
// this only decides how many there are. Keep in step with `$sheet-count` there.
const SHEET_TONES = ["1", "2"] as const;

// The width the desktop links come back at — the same breakpoint the stylesheet
// uses to hide the toggle. Above it this menu has no reason to exist, so an
// orientation change or a desktop resize with it open closes it.
const MOBILE_QUERY = "(max-width: 48rem)";

export const MENU_PANEL_ID = "mobile-menu-panel";

// Marks the portalled subtree so the `inert` sweep below can skip it — it is a
// direct child of <body> like everything it is hiding.
const HOST_ATTR = "data-mobile-menu";

// "Are we on the client yet." A store that never changes, so this subscribes to
// nothing and simply reports false during the server render and true after
// hydration — which is what `document.body` being available comes down to.
const subscribeNever = () => () => {};

export type MobileMenuLink = {
  label: string;
  href: string;
};

export type MobileMenuStrings = {
  /** Names the <nav> for screen readers, e.g. "Site sections". */
  menuLabel: string;
  /** Heading over the channel list, e.g. "Direct contact". */
  directLabel: string;
  linkedin: string;
  cta: string;
  email: string;
  /** Names the mail channel under its icon, e.g. "Email". */
  emailLabel: string;
  /** Names the panel's own close button, e.g. "Close menu". */
  closeLabel: string;
};

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  links: MobileMenuLink[];
  /** The section currently under the viewport middle, as its id, or null. */
  active: string | null;
  strings: MobileMenuStrings;
};

// Same geometry as the nav's arrow — long shaft, shallow head, hairline stroke.
// A stock icon-set arrow reads stubby beside type this size.
function Arrow() {
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

/**
 * The mobile navigation panel.
 *
 * The whole open/close animation is CSS transitions, driven by one attribute:
 * `data-open` on the root. Nothing here animates anything imperatively, and
 * there is no animation library in the path.
 *
 * That is deliberate, and it is the fourth approach this component has had.
 * Three JS-driven versions (two on `motion`, one a direct GSAP port) all
 * presented the same way — the panel simply appearing, with no transition —
 * and each rewrite could only guess at why, because a JS animation that does
 * not run leaves nothing behind to inspect. A CSS transition cannot silently
 * no-op: it is visible in devtools on the element, it survives remounts and
 * re-renders because it is not tied to a component lifecycle at all, and it
 * has no initial/animate handshake to get wrong. The staggering that made a
 * library look necessary is one `calc()` on `transition-delay`.
 *
 * Reduced motion is handled the same way, in a media query beside the rules it
 * overrides — a cross-fade in place, since "reduce" means drop the positional
 * travel, not remove the transition and leave the surface blinking into
 * existence with no signal that anything happened.
 *
 * Portalled to <body> rather than rendered inside the header, because the
 * header carries `z-index: 10` and so is its own stacking context: a panel
 * inside it could never clear the rocket console at z-index 100. Out here it
 * sits at 200 and covers everything, the nav bar included — which is why the
 * panel carries its own close button, sitting exactly where the burger was.
 */
export default function MobileMenu({
  open,
  onClose,
  links,
  active,
  strings,
}: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // The server render and the first client render both produce nothing, so
  // hydration stays quiet; the portal appears on the commit after.
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  // Escape closes, wherever focus is.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Above the breakpoint the desktop links are back and the toggle is gone, so
  // a panel left open would be orphaned. Closes on the crossing, not on every
  // resize tick.
  useEffect(() => {
    if (!open) return;
    const query = window.matchMedia(MOBILE_QUERY);
    const onChange = () => {
      if (!query.matches) onClose();
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [open, onClose]);

  // Scroll lock. On <html>, not <body>: Lenis drives window scroll when the
  // services stack mounts it, and only the document element stops that too.
  //
  // Hiding the overflow also takes away a classic scrollbar, which widens the
  // viewport by its own width and jerks the entire page sideways at the exact
  // moment the menu opens. Padding the gutter back keeps everything still.
  // Zero on touch and on any browser with overlay scrollbars, so this costs
  // nothing where the menu actually lives.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousPadding = root.style.paddingRight;

    const gutter = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    if (gutter > 0) root.style.paddingRight = `${gutter}px`;

    return () => {
      root.style.overflow = previousOverflow;
      root.style.paddingRight = previousPadding;
    };
  }, [open]);

  // Everything behind the panel goes `inert` — the nav bar included, since the
  // panel covers it: the page's links and form fields leave the tab order and
  // the accessibility tree, so Tab cycles the panel and nothing else. This is
  // the focus trap — implemented by removing the rest of the page rather than
  // by fighting keydown, which means it can't strand a keyboard user if a
  // render goes sideways.
  useEffect(() => {
    if (!open) return;

    const marked = (Array.from(document.body.children) as HTMLElement[]).filter(
      (child) =>
        !child.hasAttribute(HOST_ATTR) &&
        // Something else already made it inert; leave that alone rather than
        // clearing someone else's flag on the way out.
        !child.inert,
    );

    for (const el of marked) el.inert = true;
    return () => {
      for (const el of marked) el.inert = false;
    };
  }, [open]);

  // Focus moves into the panel on open and back to whatever opened it on close.
  // Read off `activeElement` rather than held in a ref: the burger is rendered
  // once per nav colour layer, and this way the copy that was actually used is
  // the copy that gets focus back.
  //
  // `preventScroll` is load-bearing, not a nicety. A bare `.focus()` scrolls
  // the element into view, and at this moment the panel is parked a full
  // viewport to the right — so the browser scrolled its container sideways to
  // reveal it. `overflow: hidden` does not prevent that: it only hides the
  // scrollbar, the box stays programmatically scrollable. The panel therefore
  // appeared instantly at the wrong offset and the real transition then ran
  // against a scrolled container, finishing slightly off the left edge.
  //
  // That was the bug behind every "the menu just appears, there's no
  // animation" report, through three different animation engines — none of
  // which was ever at fault. `.root` also uses `overflow: clip` now, which
  // creates a genuinely unscrollable clip box, so this cannot come back.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() =>
      panelRef.current?.focus({ preventScroll: true }),
    );
    return () => {
      cancelAnimationFrame(frame);
      opener?.focus?.({ preventScroll: true });
    };
  }, [open]);

  // Anchors do the scrolling; this only gets the lock out of the way first.
  // React's handler runs before the browser follows the href, so releasing
  // <html> here means the hash jump lands on an already-scrollable document.
  const onLinkClick = useCallback(() => {
    document.documentElement.style.overflow = "";
    onClose();
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    // `data-open` is the entire animation trigger. Closed, the subtree is also
    // parked offscreen and made `inert`, so its links leave the tab order and
    // the accessibility tree; the wrapper never takes a pointer, only the panel
    // does.
    <div
      className={styles.root}
      data-mobile-menu=""
      data-open={open ? "true" : undefined}
      aria-hidden={!open}
      inert={!open}
    >
      {/* The stack. None of these ever comes to rest and none is ever seen
          whole: each is covered by the next and all of them by the panel, so
          what reads is four curved edges chasing each other across the screen
          in a darkening ramp. */}
      {SHEET_TONES.map((tone) => (
        <div
          key={tone}
          className={styles.sheet}
          data-tone={tone}
          aria-hidden
        />
      ))}

      <div
        id={MENU_PANEL_ID}
        ref={panelRef}
        className={styles.panel}
        // Programmatic focus target on open, but not a tab stop of its own.
        tabIndex={-1}
        // Lenis listens on window and would otherwise swallow the panel's own
        // scroll on a short viewport.
        data-lenis-prevent
      >
        <nav className={styles.sections} aria-label={strings.menuLabel}>
          <ul className={styles.list}>
            {links.map(({ label, href }, i) => (
              // Keyed by position, not label: the label is what changes on a
              // locale switch, and keying on it would remount the row.
              <li key={i} className={styles.item}>
                {/* The row's mask does the revealing; the inner element just
                    climbs out of it, pivoting on its own baseline so the word
                    swings into place rather than riding an elevator. On close
                    it holds still — the panel carries it away — and only once
                    the panel is offscreen does it snap back to parked, so the
                    next open starts from below. */}
                <div className={styles.itemInner}>
                  <a
                    className={styles.link}
                    href={href}
                    onClick={onLinkClick}
                    aria-current={href === `#${active}` ? "true" : undefined}
                  >
                    <span className={styles.linkLabel}>{label}</span>
                    {/* Decorative: the position is already carried by the list
                        itself. */}
                    <span className={styles.index} aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.foot}>
          <h2 className={styles.footLabel}>{strings.directLabel}</h2>

          {/* Three cells divided by hairlines rather than three bordered
              tiles: the rules are the structure, the same way they are in the
              section list above. The mark identifies the channel at a glance
              and the label under it names the one thing the mark can't say —
              which address, whose profile. */}
          <ul className={styles.channels}>
            <li className={styles.channelCell}>
              <a
                className={styles.channel}
                href={`mailto:${strings.email}`}
                aria-label={`${strings.emailLabel}: ${strings.email}`}
              >
                <MailIcon className={styles.channelIcon} />
                <span className={styles.channelLabel}>
                  {strings.emailLabel}
                </span>
              </a>
            </li>
            <li className={styles.channelCell}>
              <a
                className={styles.channel}
                href={contactData.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon
                  className={`${styles.channelIcon} ${styles.brandIcon}`}
                />
                <span className={styles.channelLabel}>WhatsApp</span>
              </a>
            </li>
            <li className={styles.channelCell}>
              <a
                className={styles.channel}
                href={contactData.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                <LinkedInIcon
                  className={`${styles.channelIcon} ${styles.brandIcon}`}
                />
                <span className={styles.channelLabel}>{strings.linkedin}</span>
              </a>
            </li>
          </ul>

          {/* The nav's CTA gives up its place in the bar on small screens —
              four controls do not fit at 375px — and lands here, where it has
              the width to be the panel's one primary action.

              Solid mint, not an outline: this is the only element in the panel
              that is asking for something, and on an ink surface a hairline
              pill reads as one more quiet affordance among the channels above
              it. The ink disc on the right holds the arrow and gives the bar a
              fixed point to move against. */}
          <a className={styles.cta} href="#contact" onClick={onLinkClick}>
            <span className={styles.ctaLabel}>{strings.cta}</span>
            <span className={styles.ctaToken} aria-hidden>
              <Arrow />
            </span>
          </a>
        </div>
      </div>

      {/* The panel's own close button. The panel covers the whole screen, nav
          bar included, so the bar's burger is buried under it — this X sits in
          exactly the burger's spot and geometry, so it reads as the same
          control carried across. It doesn't ride the panel: it fades in once
          the wipe has landed, and out the instant a close begins. */}
      <button
        type="button"
        className={styles.close}
        aria-label={strings.closeLabel}
        onClick={onClose}
      >
        <span className={styles.closeIcon} aria-hidden>
          <span className={styles.closeLine} data-dir="a" />
          <span className={styles.closeLine} data-dir="b" />
        </span>
      </button>
    </div>,
    document.body,
  );
}
