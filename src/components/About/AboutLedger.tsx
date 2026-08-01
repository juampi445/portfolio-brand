"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import SwapText from "@/components/SwapText/SwapText";
import styles from "./About.module.scss";

// Same curve as the language toggle and the text swaps: one motion vocabulary
// across the site.
const EASE = [0.22, 1, 0.36, 1] as const;

export type LedgerRow = {
  id: string;
  company: string;
  logo: string;
  href: string;
  period: string;
  role: string;
};

export default function AboutLedger({ rows }: { rows: LedgerRow[] }) {
  const reduced = useReducedMotion();

  return (
    <ol className={styles.ledger}>
      {rows.map((row, i) => (
        <motion.li
          key={row.id}
          initial={reduced ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          // `once` so the rows don't re-animate every time they scroll past;
          // the reveal is an arrival, not a loop.
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE, delay: i * 0.04 }}
        >
          <a
            className={styles.row}
            href={row.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* Decorative: the company name is right there in the row, so an
                alt here would just make screen readers say it twice. */}
            <Image
              className={styles.rowLogo}
              src={row.logo}
              alt=""
              width={40}
              height={40}
            />

            <span className={styles.period}>
              <SwapText>{row.period}</SwapText>
            </span>

            <span className={styles.role}>
              <SwapText>{row.role}</SwapText>
            </span>

            <span className={styles.company}>{row.company}</span>

            {/* Decorative: the link's company name is already its accessible
                name, and target=_blank is announced by the rel/target pair. */}
            <svg
              className={styles.rowArrow}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              focusable="false"
            >
              <path d="M7 17 17 7" />
              <path d="M8 7h9v9" />
            </svg>
          </a>
        </motion.li>
      ))}
    </ol>
  );
}
