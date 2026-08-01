import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { locales, isLocale } from "@/i18n/config";

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

  return {
    // Relative `alternates` (canonical, hreflang) resolve against this. Defaults
    // to the production domain so a deploy without env vars still emits correct
    // URLs; override with NEXT_PUBLIC_SITE_URL for previews.
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://cuadrelli.com.ar",
    ),
    title: dict.meta.title,
    description: dict.meta.description,
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
  };
}

export default async function LangLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return children;
}
