import type { Locale } from "./config";

// Dynamic imports so a locale's strings are only pulled into the bundle that
// renders it. These are awaited in Server Components, so no dictionary reaches
// the client.
const dictionaries = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  es: () => import("./dictionaries/es.json").then((m) => m.default),
};

// en.json is the source of truth for the shape; es.json has to match it.
export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["en"]>>;

export const getDictionary = (locale: Locale): Promise<Dictionary> =>
  dictionaries[locale]();
