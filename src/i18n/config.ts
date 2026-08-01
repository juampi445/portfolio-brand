export const locales = ["en", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Read by proxy.ts on every request and written by the language toggle. Next
// treats this name as the canonical locale cookie, so keep it.
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
