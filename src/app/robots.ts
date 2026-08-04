import type { MetadataRoute } from "next";
import { SITE_URL } from "@/data/site";

// The per-page `robots` meta tag (root layout) and this file answer different
// questions: the tag says how to *treat* a page a crawler already has, this
// says which paths it may fetch at all, and — the part that matters — where
// the sitemap is. Google will not guess the sitemap location; this is the
// only discovery path that doesn't require Search Console.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    // Absolute by spec: a Sitemap: line with a relative path is ignored.
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
