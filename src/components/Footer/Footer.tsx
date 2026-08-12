import SwapText from "@/components/SwapText/SwapText";
import Reveal from "@/components/Reveal/Reveal";
import contactData from "@/data/contact.json";
import type { Dictionary } from "@/i18n/dictionaries";
import styles from "./Footer.module.scss";
import {
  Icon,
  MailIcon,
  WhatsAppIcon,
  LinkedInIcon,
} from "@/components/icons/ChannelIcons";

// Same fragment the nav's avatar uses: the HTML-specified anchor for the top of
// the document, which is where the hero lives.
const TOP_HREF = "#top";

/**
 * The page's coda: the same ink as the Contact section above it, and the same
 * pane of glass as the form sitting in it — a deliberate rhyme, so the page
 * closes on the surface it made its ask from.
 *
 * Copy comes from three places on purpose — the name and section labels are
 * the nav's (one source, so a rename can't leave the footer stale), the address
 * is Contact's, the rest is its own. Hence the whole dictionary as a prop.
 */
export default function Footer({ dict }: { dict: Dictionary }) {
  const { footer, nav, contact } = dict;

  // Same order as the sections on the page, and as the nav.
  const sections = [
    { label: nav.projects, href: "#projects" },
    { label: nav.services, href: "#services" },
    { label: nav.process, href: "#process" },
    { label: nav.about, href: "#about" },
    { label: nav.contact, href: "#contact" },
  ];

  // Resolved when the page is built. Both locales are prerendered, so this is
  // the deploy's year — a redeploy is what moves it on.
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.panel}>
          <Reveal className={styles.columns}>
            {/* The name, what the studio is for, and where it's made. The name
                carries the column on its own — a signature, set at size. */}
            <div className={styles.brand}>
              <span className={styles.name}>{nav.name}</span>

              <p className={styles.tagline}>
                <SwapText nowrap={false}>{footer.tagline}</SwapText>
              </p>

              <p className={styles.colophon}>
                <SwapText nowrap={false}>{footer.colophon}</SwapText>
              </p>
            </div>

            <nav className={styles.column} aria-label={footer.sectionsLabel}>
              <span className={styles.columnLabel}>
                <SwapText>{footer.sectionsLabel}</SwapText>
              </span>

              {/* Keyed by position, not by label: the label is the thing that
                  changes, and keying on it would remount the link and defeat
                  the crossfade. */}
              {sections.map(({ label, href }, i) => (
                <a key={i} className={styles.link} href={href}>
                  <SwapText>{label}</SwapText>
                </a>
              ))}
            </nav>

            {/* Icons only in this column: here they identify the channel at a
                glance, which is work. On the section links above they would be
                decoration, and the labels already say where they go. */}
            <div className={styles.column}>
              <span className={styles.columnLabel}>
                <SwapText>{footer.directLabel}</SwapText>
              </span>

              {/* Address and number as themselves — the same string in both
                  languages, so there is nothing to crossfade. */}
              <a
                className={`${styles.link} ${styles.channel}`}
                href={`mailto:${contact.email}`}
              >
                <MailIcon
                  className={`${styles.channelIcon} ${styles.mailIcon}`}
                />
                <span className={styles.channelText}>{contact.email}</span>
              </a>

              {/* The number opens a WhatsApp thread rather than dialling: it is
                  how this audience actually starts a conversation, and the icon
                  says so before the tap. wa.me hands off to the app when there
                  is one and to web.whatsapp.com when there isn't. Still the
                  number as text — that is the thing worth reading, and it stays
                  copyable. */}
              <a
                className={`${styles.link} ${styles.channel}`}
                href={contactData.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon
                  className={`${styles.channelIcon} ${styles.brandIcon}`}
                />
                <span className={`${styles.channelText} ${styles.number}`}>
                  {contactData.phone}
                </span>
                <Icon className={styles.outIcon}>
                  <path d="M7 17 17 7" />
                  <path d="M8 7h9v9" />
                </Icon>
              </a>

              <a
                className={`${styles.link} ${styles.channel}`}
                href={contactData.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                <LinkedInIcon
                  className={`${styles.channelIcon} ${styles.brandIcon}`}
                />
                <span className={styles.channelText}>{footer.linkedin}</span>
                <Icon className={styles.outIcon}>
                  <path d="M7 17 17 7" />
                  <path d="M8 7h9v9" />
                </Icon>
              </a>
            </div>
          </Reveal>

          {/* The baseline: the notice on one end, the way back up on the other,
              held apart by the one rule the pane draws. */}
          <div className={styles.baseline}>
            <span className={styles.notice}>
              © {year} {nav.name}
            </span>

            <a className={styles.top} href={TOP_HREF}>
              <SwapText>{footer.backToTop}</SwapText>
              <Icon className={styles.upIcon}>
                <path d="M12 20V6" />
                <path d="m5 13 7-7 7 7" />
              </Icon>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
