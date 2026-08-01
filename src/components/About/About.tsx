import BorderGlow from "@/components/BorderGlow/BorderGlow";
import SwapText from "@/components/SwapText/SwapText";
import Reveal from "@/components/Reveal/Reveal";
import AboutLedger, { type LedgerRow } from "./AboutLedger";
import aboutData from "@/data/about.json";
import { palette } from "@/styles/palette";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import styles from "./About.module.scss";

type AboutDict = Dictionary["about"];

// The CV is the one credential that changes with the language: two documents,
// not one document at two addresses. Its href is a per-locale map; the
// certificates are a single URL that reads the same in both.
function resolveHref(href: string | Record<Locale, string>, locale: Locale) {
  return typeof href === "string" ? href : href[locale];
}

// $color-primary as the "H S L" channels BorderGlow expects.
const GLOW_HSL = "166 64 56";

// SVG, not the "↗" / "↓" characters: glyphs render at the font's mercy — weight,
// baseline and size all drift per platform, and they can't take a stroke width.
function CardIcon({ external }: { external: boolean }) {
  return (
    <svg
      className={styles.credentialIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {external ? (
        <>
          <path d="M7 17 17 7" />
          <path d="M8 7h9v9" />
        </>
      ) : (
        <>
          <path d="M12 4v12" />
          <path d="m7 11 5 5 5-5" />
          <path d="M5 20h14" />
        </>
      )}
    </svg>
  );
}

export default function About({
  dict,
  locale,
}: {
  dict: AboutDict;
  locale: Locale;
}) {
  // Company names and URLs are data; periods and roles are copy. Joined on id so
  // the two can be edited independently.
  const rows: LedgerRow[] = aboutData.ledger.map((entry) => {
    const copy = dict.ledger[entry.id as keyof AboutDict["ledger"]];
    return { ...entry, period: copy.period, role: copy.role };
  });

  return (
    <section id="about" className={styles.about}>
      {/* Tier 1: positioning. Prose, no card. */}
      <div className={styles.statement}>
        {/* The claim lands first, the qualifying prose a beat behind it — the
            same order you'd read them in. */}
        <Reveal>
          <h2 className={styles.heading}>
            <SwapText nowrap={false}>{dict.heading}</SwapText>
          </h2>
        </Reveal>

        <Reveal delay={0.12} className={styles.lead}>
          {dict.lead.map((line, i) => (
            <p key={i}>
              <SwapText nowrap={false}>{line}</SwapText>
            </p>
          ))}
        </Reveal>
      </div>

      <div className={styles.record}>
        {/* Tier 2: the ledger. Carries the section's weight. */}
        <AboutLedger rows={rows} />

        {/* Tier 3: supporting evidence. Small dark chips against the pale
            section — BorderGlow's halo blends with plus-lighter, so it can only
            lighten; on a light card there would be nothing to see.

            Delayed past the ledger's own stagger (3 rows x 40ms), so the tier
            arrives after the evidence it supports rather than alongside it. */}
        <Reveal delay={0.2} className={styles.credentials}>
          <span className={styles.credentialsLabel}>
            <SwapText>{dict.credentialsLabel}</SwapText>
          </span>

          <ul className={styles.credentialList}>
            {aboutData.credentials.map((credential) => {
              const copy =
                dict.credentials[
                  credential.id as keyof AboutDict["credentials"]
                ];

              return (
                <li key={credential.id}>
                  <BorderGlow
                    className={styles.credentialCard}
                    // Dark card: BorderGlow's halo blends with plus-lighter, so
                    // it can only add light. It needs something dark to add it
                    // to — on a pale card there is no glow to see.
                    backgroundColor={palette.dark}
                    glowColor={GLOW_HSL}
                    colors={[
                      palette.primary,
                      palette.primaryLight,
                      palette.primary,
                    ]}
                    borderRadius={14}
                    glowRadius={28}
                    glowIntensity={0.9}
                    // No `uniform`: these are the cards the cursor-tracked arc
                    // was kept for. `animated` loops the sweep every 5s, all
                    // three in unison — hovering any one of them stops the lot
                    // (see .credentialList:hover in About.module.scss).
                    animated
                    // 0 kills the interior mesh fill. It muddies the halo, and
                    // the halo is the whole point of these cards.
                    fillOpacity={0}
                  >
                    <a
                      className={styles.credentialLink}
                      href={resolveHref(credential.href, locale)}
                      // `download` with no value keeps the file's own name, so
                      // the saved PDF says which language it is.
                      {...(credential.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : { download: true })}
                    >
                      <span className={styles.credentialText}>
                        <span className={styles.credentialTitle}>
                          <SwapText>{copy.title}</SwapText>
                        </span>
                        <CardIcon external={credential.external} />
                      </span>

                      <span className={styles.credentialDescription}>
                        <SwapText nowrap={false}>{copy.description}</SwapText>
                      </span>
                    </a>
                  </BorderGlow>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
