import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { locales, isLocale, type Locale } from "@/i18n/config";
import { SITE_URL, SITE_NAME, AUTHOR_NAME, OG_LOCALE } from "@/data/site";
import contact from "@/data/contact.json";

// Nested layout — the root layout (app/layout.tsx) owns <html>, <body> and the
// nav, precisely so they survive locale switches. This segment remounts wholesale
// whenever [lang] changes, so nothing that should persist may live here.

// Both locales are prerendered at build time; nothing here is request-dependent.
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const other = lang === "en" ? "es" : "en";

  // The card art is the one asset that is genuinely per-locale — the copy is
  // burned into the image, so /en and /es cannot share a file the way they
  // share the favicon. Declared once here and handed to both og: and twitter:
  // below, so the two can never drift apart.
  //
  // Relative on purpose: metadataBase (root layout) makes it absolute, which
  // every scraper requires. Width and height are stated because Slack and
  // LinkedIn reserve the card's space from these tags before the image
  // finishes downloading; without them the preview reflows as it loads.
  const card = {
    url: `/og-${lang}.png`,
    width: 1200,
    height: 600,
    alt: dict.meta.ogAlt,
  };

  // metadataBase lives in the root layout — relative URLs below resolve
  // against it from there.
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    // No `keywords`. Google has ignored the meta keywords tag since 2009 and
    // Bing treats it as a spam signal; it is pure payload.
    //
    // Tells crawlers the two URLs are the same page in different languages, so
    // they surface the right one per user instead of treating them as dupes.
    // x-default points at the bare path, where proxy.ts does the detection.
    alternates: {
      canonical: `/${lang}`,
      languages: {
        en: "/en",
        es: "/es",
        "x-default": "/",
      },
    },
    // Deliberately no `title`/`description` here. Next fills both in from the
    // top-level fields, so repeating them is a second copy to keep in sync for
    // no change in output. Only what cannot be derived is stated.
    openGraph: {
      type: "website",
      // Must be the localised URL, not the bare origin: this is the address a
      // scraper reports as canonical for the card it just built.
      url: `/${lang}`,
      siteName: SITE_NAME,
      locale: OG_LOCALE[lang],
      alternateLocale: OG_LOCALE[other],
      images: [card],
    },
    // `card` is what makes X, Slack and Discord render the wide banner rather
    // than a square thumbnail. The image is repeated rather than left to fall
    // back to og:image because the scrapers disagree about that fallback —
    // pinning twitter:image explicitly means none of them has to guess.
    twitter: {
      card: "summary_large_image",
      images: [card],
    },
  };
}

// Structured data — the machine-readable half of the same claims the meta tags
// make in prose. Meta tags describe *a page*; this describes *a person*, which
// is what Google needs to link the site, the LinkedIn profile and the name into
// one entity rather than three unrelated results. `sameAs` is the load-bearing
// line: it is how a crawler is told the LinkedIn profile is the same person.
async function personSchema(lang: Locale) {
  const dict = await getDictionary(lang);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: AUTHOR_NAME,
    alternateName: SITE_NAME,
    url: `${SITE_URL}/${lang}`,
    image: `${SITE_URL}/avatar.png`,
    jobTitle: dict.meta.jobTitle,
    description: dict.meta.description,
    email: `mailto:${dict.contact.email}`,
    telephone: contact.phoneHref.replace("tel:", ""),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Tandil",
      addressRegion: "Buenos Aires",
      addressCountry: "AR",
    },
    knowsLanguage: locales,
    sameAs: [contact.linkedin],
  };
}

export default async function LangLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const schema = await personSchema(lang);

  return (
    <>
      {/* Server-rendered into the static HTML, so HTML-only crawlers see it.
          JSON.stringify of a literal we own — no user input reaches this. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {children}
    </>
  );
}
