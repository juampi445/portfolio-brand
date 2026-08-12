import SwapText from "@/components/SwapText/SwapText";
import Reveal from "@/components/Reveal/Reveal";
import type { Dictionary } from "@/i18n/dictionaries";
import styles from "./Process.module.scss";

type ProcessDict = Dictionary["process"];

type Lane = "both" | "you" | "me";
type Stamp = "deposit" | "balance" | null;

// Who holds the work at each step, and where money moves. Structure, not copy:
// the lane decides which of the two rails the step's node sits on, and it is the
// same in every language, so it lives here rather than in the dictionaries —
// where the two locales could drift apart on a fact about the process itself.
// The labels those keys print ("Vos" / "Yo" / "Los dos") are copy, and they do
// live in the dictionary.
//
// One entry per step, in order. If a step is added to the dictionaries, add its
// lane here too — the render falls back to "both", which is the honest default
// for a step nobody has classified, but the diagram is only worth drawing while
// these agree.
const LANES: readonly Lane[] = ["both", "you", "me", "both", "both"];
const STAMPS: readonly Stamp[] = [null, "deposit", null, null, "balance"];

/**
 * What happens after the price. Services ends on three packages and a question;
 * this answers the one that always follows it — "and then what?" — before the
 * page asks for a message.
 *
 * The section is a handoff chart, not a list of steps. Two hairline rails run
 * down the sequence, one for the client and one for me, and each step's node
 * sits on the rail that holds the work: a tie across both when we are on it
 * together. That is the one thing a numbered list cannot say and the thing a
 * small-business owner actually wants to know before paying a deposit — how
 * much of this lands on them, and when. The braid the nodes draw as they cross
 * between the rails is the argument the copy makes in words.
 *
 * It is also why this section no longer looks like its neighbours. Services and
 * About are both ledgers (hairline-parted rows, read top to bottom), and a third
 * ledger in a row is what made this read as filler. There is exactly one rule
 * between steps here: none. The rails hold the sequence together, and the space
 * between rows does the parting.
 *
 * Still the quietest section on the site: no WebGL, no canvas, no scroll
 * machinery. Every mark is a 1px line or a 8px dot.
 */
export default function Process({ dict }: { dict: ProcessDict }) {
  const lastIndex = dict.steps.length - 1;

  return (
    <section id="process" className={styles.process}>
      <div className={styles.inner}>
        {/* A band across the top, not the sticky side-rail the two sections
            around this one use: the sequence below wants the full measure for
            its rails, and repeating the neighbours' 5/7 split is half of why
            this section read as generic. The claim and the line that qualifies
            it sit on one baseline, at opposite ends of the page. */}
        <header className={styles.head}>
          <Reveal className={styles.headMain}>
            <span className={styles.label}>
              <SwapText>{dict.title}</SwapText>
            </span>
            <h2 className={styles.heading}>
              <SwapText nowrap={false}>{dict.heading}</SwapText>
            </h2>
          </Reveal>
          <Reveal delay={0.08} className={styles.headAside}>
            <p className={styles.intro}>
              <SwapText nowrap={false}>{dict.intro}</SwapText>
            </p>
          </Reveal>
        </header>

        {/* An <ol>, not a styled list of divs: the order is the content, and it
            should survive with the stylesheet turned off. The numerals are
            rendered rather than left to list markers — they carry their own
            type, and a marker cannot be set in the margin like this. */}
        <ol className={styles.steps}>
          {dict.steps.map((step, i) => {
            const lane = LANES[i] ?? "both";
            const stamp = STAMPS[i] ?? null;
            const onYou = lane === "you" || lane === "both";
            const onMe = lane === "me" || lane === "both";

            return (
              // Keyed by position: the steps are fixed slots whose text only
              // translates, and keying on the title would remount the row on a
              // locale switch and defeat the crossfade inside it.
              <li key={i} className={styles.step}>
                {/* Each row arrives a beat after the one above it, which is the
                    reading order stated as motion — and because the rails are
                    drawn per row, the line itself lands in segments, top to
                    bottom, as the sequence assembles. Capped by the row count,
                    so the last step is still only a third of a second behind
                    the first. */}
                <Reveal delay={0.06 * i} className={styles.row}>
                  <span className={styles.marker} aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* The diagram. Decorative in the accessibility tree: every
                      fact it draws is written beside it in the actor line, so a
                      screen reader that announced the rails too would hear the
                      same thing twice. */}
                  <span
                    className={styles.rail}
                    data-last={i === lastIndex || undefined}
                    aria-hidden
                  >
                    <span className={`${styles.track} ${styles.trackYou}`} />
                    <span className={`${styles.track} ${styles.trackMe}`} />
                    {lane === "both" && <span className={styles.tie} />}
                    {onYou && (
                      <span
                        className={`${styles.node} ${styles.nodeYou}`}
                        data-paid={stamp ? true : undefined}
                      />
                    )}
                    {onMe && (
                      <span
                        className={`${styles.node} ${styles.nodeMe}`}
                        data-paid={stamp ? true : undefined}
                      />
                    )}
                    {i === lastIndex && <span className={styles.terminal} />}
                  </span>

                  <div className={styles.stepHead}>
                    <h3 className={styles.stepTitle}>
                      <SwapText nowrap={false}>{step.title}</SwapText>
                    </h3>
                    {/* Who is holding the work, said in words — the rails are
                        the same fact drawn. Colour is never the only carrier:
                        the money steps say "Seña 40%" as well as lighting
                        their node. */}
                    <p className={styles.actor}>
                      <SwapText>{dict.lanes[lane]}</SwapText>
                      {stamp && (
                        <>
                          <span className={styles.actorSep} aria-hidden>
                            ·
                          </span>
                          <span className={styles.stamp}>
                            <SwapText>{dict.stamps[stamp]}</SwapText>
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <p className={styles.stepDescription}>
                    <SwapText nowrap={false}>{step.description}</SwapText>
                  </p>
                </Reveal>
              </li>
            );
          })}
        </ol>

        {/* The costs and conditions that are not in any package. A definition
            list, because that is what it is: a term and what it means. Set
            apart from the sequence rather than trailing off it — these are not
            a sixth step, they are the things you would otherwise have to ask.
            The Spanish side carries one the English side does not (paying the
            USD prices in pesos), so the block is rendered from the array and
            takes whatever length a locale gives it. */}
        <Reveal delay={0.12} className={styles.notes}>
          <h3 className={styles.notesTitle}>
            <SwapText>{dict.notesTitle}</SwapText>
          </h3>
          <dl className={styles.noteList}>
            {dict.notes.map((note, i) => (
              <div key={i} className={styles.note}>
                <dt className={styles.noteLabel}>
                  <SwapText nowrap={false}>{note.label}</SwapText>
                </dt>
                <dd className={styles.noteBody}>
                  <SwapText nowrap={false}>{note.body}</SwapText>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
