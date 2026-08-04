import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav/Nav";
import { SITE_URL, SITE_NAME, AUTHOR_NAME } from "@/data/site";
import "./globals.scss";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Corrects <html lang> before first paint. This layout is static — it cannot
// know the locale server-side — so the attribute ships as "en" and is fixed
// from the URL before hydration. Crawlers get the locale from the hreflang
// alternates in [lang]/layout.tsx regardless.
const LANG_SCRIPT = `document.documentElement.lang=/^\\/es(\\/|$)/.test(location.pathname)?"es":"en"`;

// Everything here is the same in both languages, so it belongs at the root and
// is inherited. The locale-dependent half — title, description, alternates,
// Open Graph — is in [lang]/layout.tsx. Metadata merges shallowly per key, so
// the split is safe as long as the two layers never name the same key.
export const metadata: Metadata = {
  // Set once, here, because it governs the *whole* tree: every relative URL in
  // any descendant's metadata resolves against it.
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  authors: [{ name: AUTHOR_NAME, url: SITE_URL }],
  creator: AUTHOR_NAME,
  publisher: AUTHOR_NAME,
  // The page already ships explicit tel:, mailto: and map-free address markup.
  // Left on, iOS Safari relinkifies all three itself and overrides their
  // styling with its own blue.
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    // The bare `robots` tag has no way to say "you may show a large thumbnail".
    // max-image-preview:large is what lets the OG image run full width in
    // Google results and makes the page eligible for Discover at all.
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  // themeColor moved out of `metadata` in Next 14 — it lives in the viewport
  // export now, and setting it in metadata is a no-op with a warning.
  //
  // #111111 is $color-dark, the hero's background. The hero is the first full
  // screen, so matching it makes Android's chrome and the iOS status bar
  // continue the page instead of drawing a pale seam above it — which is most
  // of why a link opened from Instagram's in-app browser reads as an app
  // rather than a web page.
  themeColor: "#111111",
  // There is no dark theme. Saying so stops Chrome's auto-dark-mode from
  // inventing one and inverting the palette.
  colorScheme: "light",
};

// Static root layout, and that's the point: the nav lives here so it survives
// locale switches. The [lang] segment below is a *nested* layout — when its
// param changes, everything inside it unmounts and remounts (each param value
// is its own segment-cache entry), and when the nav lived in there, the
// <header> was destroyed and rebuilt on every switch. A recreated
// backdrop-filter layer plus a remounting avatar <img> painted as a one-frame
// flash of the whole bar — the "navbar blink". Out here, the nav's DOM
// persists and only its text changes.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: LANG_SCRIPT }} />
        <Nav />
        {children}
      </body>
    </html>
  );
}
