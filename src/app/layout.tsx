import { Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav/Nav";
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
