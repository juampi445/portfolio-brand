import type { Locale } from "@/i18n/config";

// The origin every URL-shaped tag resolves against — canonicals, hreflang
// alternates, og:image, the sitemap. Defaults to production so a deploy with no
// env vars still emits correct absolute URLs; set NEXT_PUBLIC_SITE_URL on
// preview deploys so their canonicals point at themselves and not at prod.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://juancuadrelli.com";

// The brand, not the legal name. This is the small grey line above the title in
// a WhatsApp, Slack or Discord preview card, so it reads as the studio.
export const SITE_NAME = "Juan Cuadrelli";

// The legal name, for the tags that identify a person rather than a site.
export const AUTHOR_NAME = "Juan Pablo Cuadrelli";

// Open Graph wants full locale codes, not the bare language tags the routes use.
// es_AR over es_ES on purpose — the work and the phone number are Argentine.
export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  es: "es_AR",
};
