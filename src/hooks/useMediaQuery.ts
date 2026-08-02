"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query and re-renders on the crossing.
 *
 * Reports `false` during the server render — there is no viewport to measure —
 * so the desktop branch is what ships in the HTML and the mobile one swaps in
 * right after hydration. That matters here: the two branches of Services mount
 * genuinely different machinery (Lenis + pinning vs. a drag track), so they are
 * swapped rather than rendered together and hidden with CSS, which would run
 * both and double the live WebGL contexts.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
