"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { locales, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import styles from "./LanguageToggle.module.scss";

// Ease-out-quint, matching SwapText: the thumb and the words it governs settle
// on the same curve.
const EASE = [0.22, 1, 0.36, 1] as const;

type LanguageToggleProps = {
  locale: Locale;
  /** Names the action in the *current* language, e.g. "Switch to Spanish". */
  label: string;
  /** Nav's third state: the bar is over opaque content, so the border goes solid. */
  grounded?: boolean;
};

export default function LanguageToggle({
  locale,
  label,
  grounded,
}: LanguageToggleProps) {
  const pathname = usePathname();
  const router = useRouter();
  const reduced = useReducedMotion();

  const active = locales.indexOf(locale);
  const next = locales[(active + 1) % locales.length];

  // One control, two states: the whole surface toggles. With exactly two locales
  // a segmented "pick one of these" is a lie about the affordance, and it makes
  // half the button dead to the click that matters.
  const toggle = () => {
    // Persist the explicit choice so proxy.ts stops sniffing Accept-Language on
    // later visits to a bare path. A year, matching Next's own locale cookie.
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;

    // Swap only the locale segment, keep the rest of the path.
    const rest = pathname.replace(/^\/[^/]+/, "");

    // The hash never reaches the router (or the server), so carry it across by
    // hand — otherwise switching language while parked on #contact throws you
    // back to the top. `scroll: false` holds the viewport still, so the words
    // change under you and nothing else moves.
    router.replace(`/${next}${rest}${window.location.hash}`, { scroll: false });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={styles.toggle}
      data-grounded={grounded ? "true" : undefined}
      aria-label={label}
    >
      <motion.span
        aria-hidden
        className={styles.thumb}
        animate={{ x: `${active * 100}%` }}
        transition={reduced ? { duration: 0 } : { duration: 0.5, ease: EASE }}
      />

      {locales.map((option) => (
        <span
          key={option}
          className={styles.option}
          data-active={option === locale}
        >
          {option.toUpperCase()}
        </span>
      ))}
    </button>
  );
}
