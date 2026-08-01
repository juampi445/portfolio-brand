import { Fragment } from "react";
import ScrollVelocity from "@/components/ScrollVelocity/ScrollVelocity";
import styles from "./HeroSecondary.module.scss";

// Four rows, four stages of the same job: strategy, design, build, outcome.
// Read top to bottom they're the process; read one at a time they're the scope.
export default function HeroSecondary({ stages }: { stages: string[][] }) {
  return (
    <section className={styles.heroSecondary}>
      <ScrollVelocity
        texts={stages.map((terms, row) => (
          <Fragment key={row}>
            {terms.map((term) => (
              // The separator trails every term, so the seam between repeated
              // copies of a row is punctuated like any other gap.
              <Fragment key={term}>
                {term}
                <span className={styles.separator} aria-hidden="true" />
              </Fragment>
            ))}
          </Fragment>
        ))}
        velocity={40}
        // A row is now a whole phrase, wider than most viewports on its own;
        // three copies are enough to keep the loop seamless.
        numCopies={3}
        damping={70}
        stiffness={650}
        className={styles.line}
      />
    </section>
  );
}
