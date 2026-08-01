import SwapText from "@/components/SwapText/SwapText";
import Reveal from "@/components/Reveal/Reveal";
import DotField from "@/components/DotField/DotField";
import ContactForm from "./ContactForm";
import CopyEmail from "./CopyEmail";
import type { Dictionary } from "@/i18n/dictionaries";
import styles from "./Contact.module.scss";

// $color-primary (#47D7B5) — the bright mint, not the sunken accent: on the
// near-black ink the deep green read as darkness, and the section needs the
// light. Alpha carries the gradient instead of strength-of-dark: the canvas
// paints the dots through a diagonal fade of the same hue.
const DOT_FROM = "rgba(71, 215, 181, 0.5)";
const DOT_TO = "rgba(71, 215, 181, 0.2)";

type ContactDict = Dictionary["contact"];

export default function Contact({ dict }: { dict: ContactDict }) {
  return (
    <section id="contact" className={styles.contact}>
      <div className={styles.canvas} aria-hidden>
        <DotField
          dotRadius={1.5}
          dotSpacing={14}
          bulgeStrength={67}
          sparkle={false}
          waveAmplitude={0}
          gradientFrom={DOT_FROM}
          gradientTo={DOT_TO}
          // Texture, not an instrument. The field answering the cursor put
          // motion behind the one part of the page asking to be read and typed
          // into, and every attempt to fence it off — the card, then the
          // statement, then each line of it — was a rectangle in the wrong
          // place. Inert, it is what it should always have been: a surface.
          // It also costs one paint instead of a frame of work forever.
          interactive={false}
        />
      </div>

      <div className={styles.inner}>
        {/* The ask, and the terms of it. Left of the form so the reason to fill
            it in is read before the fields are. */}
        <Reveal className={styles.statement}>
          <h2 className={styles.heading}>
            <SwapText nowrap={false}>{dict.heading}</SwapText>
          </h2>

          <p className={styles.lead}>
            <SwapText nowrap={false}>{dict.lead}</SwapText>
          </p>

          {/* The way out of the form, for anyone who'd rather just write: the
              address at reading size, a way to pocket it, and the city as a
              quiet dateline under both. */}
          <p className={styles.details}>
            <span className={styles.emailRow}>
              <a className={styles.emailLink} href={`mailto:${dict.email}`}>
                {dict.email}
              </a>
              <CopyEmail
                email={dict.email}
                label={dict.copy}
                done={dict.copied}
              />
            </span>
            <span className={styles.location}>{dict.location}</span>
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <div className={styles.formWrap}>
            <ContactForm dict={dict.form} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
