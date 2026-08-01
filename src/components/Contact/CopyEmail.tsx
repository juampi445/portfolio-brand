"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Contact.module.scss";

// How long the confirmation holds before the button offers itself again. Long
// enough to be read without looking for it, short enough that it never becomes
// the button's resting state.
const CONFIRM_MS = 2200;

/**
 * Copies the address to the clipboard. The companion to the mailto beside it,
 * not a replacement for it: mailto only helps someone whose machine has a mail
 * client registered, and plenty of people write from a webmail tab where the
 * useful thing is the address itself, on the clipboard.
 */
export default function CopyEmail({
  email,
  label,
  done,
}: {
  email: string;
  label: string;
  done: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // No permission, or an insecure context where the API doesn't exist. Say
      // nothing rather than claim a copy that never happened — the address is
      // right there to select by hand.
      return;
    }

    setCopied(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), CONFIRM_MS);
  }, [email]);

  return (
    <button
      type="button"
      className={styles.copy}
      onClick={copy}
      data-copied={copied}
      // The button has no text, so this is its only name — and the address is
      // half of it: "Copy" alone, out of the reading order, names nothing.
      aria-label={`${label} ${email}`}
      // The sighted equivalent. An icon-only control has to answer "what is
      // this" for someone who isn't using a screen reader either.
      title={label}
    >
      <svg
        className={styles.copyIcon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        focusable="false"
      >
        {copied ? (
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        ) : (
          <>
            <rect x="9" y="9" width="11" height="11" rx="2.5" />
            <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15" />
          </>
        )}
      </svg>

      {/* The mark changing to a check says it on screen; this says it to a
          screen reader. Polite, not assertive: a copy is a small confirmation
          and must not interrupt whatever is being read at the time. */}
      <span className={styles.copySr} aria-live="polite">
        {copied ? done : ""}
      </span>
    </button>
  );
}
