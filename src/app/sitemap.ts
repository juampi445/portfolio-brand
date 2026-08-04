import type { MetadataRoute } from "next";
import { SITE_URL } from "@/data/site";
import { locales } from "@/i18n/config";

// One entry per locale, each declaring the other as its alternate. This is the
// same hreflang claim the <link> tags in [lang]/layout.tsx make, repeated here
// because Google reads the two independently — a page it reaches from the
// sitemap gets its alternates from the sitemap.
//
// The bare "/" is deliberately absent: it is a 307 from proxy.ts, never a
// destination, and listing redirects in a sitemap is a Search Console warning.
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, `${SITE_URL}/${locale}`]),
  );

  return locales.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 1,
    alternates: { languages },
  }));
}
