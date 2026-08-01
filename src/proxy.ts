import { NextResponse, type NextRequest } from "next/server";
import { locales, defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";

// Picks the best supported locale from an Accept-Language header, e.g.
// "es-AR,es;q=0.9,en;q=0.8" -> "es". Tags are matched on their primary subtag,
// so es-AR and es-419 both resolve to es. Ordered by q-value, highest first.
function detectLocale(header: string | null) {
  if (!header) return defaultLocale;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return {
        tag: tag.trim().toLowerCase(),
        // A tag with no q= is the most preferred; the spec's default is 1.
        q: q ? Number.parseFloat(q.split("=")[1]) || 0 : 1,
      };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const primary = tag.split("-")[0];
    if (isLocale(primary)) return primary;
  }

  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Already localised — nothing to do.
  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return NextResponse.next();

  // An explicit pick beats what the browser advertises. Once someone has used
  // the toggle, that choice is the answer for every later bare-path visit.
  const chosen = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    chosen && isLocale(chosen)
      ? chosen
      : detectLocale(request.headers.get("accept-language"));

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except Next internals and files with an extension (favicon,
  // avatar.png, …) — without this the redirect would swallow static assets.
  matcher: ["/((?!_next|.*\\..*).*)"],
};
