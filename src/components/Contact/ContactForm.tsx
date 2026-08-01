"use client";

import { useState, useId, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import BorderGlow from "@/components/BorderGlow/BorderGlow";
import { palette } from "@/styles/palette";
import contactData from "@/data/contact.json";
import type { Dictionary } from "@/i18n/dictionaries";
import styles from "./Contact.module.scss";

const EASE = [0.22, 1, 0.36, 1] as const;
const GLOW_HSL = "166 64 56";

// FormSubmit's AJAX endpoint: no account, no key, no server of our own.
//
// Addressed by the token FormSubmit issued for this inbox rather than by the
// address itself. Same destination, but the address never ships in the client
// bundle where a scraper can lift it — and the token can be rotated from
// FormSubmit if it ever starts drawing spam, without touching the inbox.
const ENDPOINT = `https://formsubmit.co/ajax/${contactData.formsubmitToken}`;

// Caps, not just for tidiness: an unbounded body is a free megaphone. A human
// writing a genuine first message never gets near 4000 characters.
const LIMITS = { name: 100, email: 200, message: 4000 } as const;

// Deliberately loose: something@something.something. Tight email regexes reject
// real addresses, and the only real test of an address is whether mail arrives.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: Record<Field, string>) {
  const errors: Partial<Record<Field, true>> = {};

  if (!values.name || values.name.length > LIMITS.name) errors.name = true;
  if (
    !values.email ||
    values.email.length > LIMITS.email ||
    !EMAIL.test(values.email)
  ) {
    errors.email = true;
  }
  if (!values.message || values.message.length > LIMITS.message) {
    errors.message = true;
  }

  return errors;
}

type FormDict = Dictionary["contact"]["form"];
type Field = "name" | "email" | "message";
type Status = "idle" | "sending" | "sent" | "failed";

export default function ContactForm({ dict }: { dict: FormDict }) {
  const reduced = useReducedMotion();
  const id = useId();

  const [status, setStatus] = useState<Status>("idle");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, true>>>(
    {},
  );

  const transition = reduced ? { duration: 0 } : { duration: 0.45, ease: EASE };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    const form = event.currentTarget;
    const data = new FormData(form);

    const values = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
    };

    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // The honeypot is invisible, unlabelled and out of the tab order, so only a
    // bot ever fills it. Show the success state and send nothing: a rejection
    // tells the bot what to fix, a silent no-op tells it nothing.
    if (String(data.get("company") ?? "").trim()) {
      setStatus("sent");
      form.reset();
      return;
    }

    setStatus("sending");
    setFieldErrors({});

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Without this FormSubmit answers with its own HTML thank-you page
          // instead of JSON, even on the ajax endpoint.
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...values,
          _subject: `Portfolio — ${values.name}`,
          // FormSubmit reads this as the reply-to, so answering the notification
          // answers the person who wrote, not the robot that delivered it.
          _replyto: values.email,
          _template: "table",
          // Off for ajax: the captcha is a redirect to a challenge page, which
          // a fetch can't show and the visitor would never see.
          _captcha: "false",
        }),
      });

      if (!response.ok) {
        setStatus("failed");
        return;
      }

      setStatus("sent");
      form.reset();
    } catch {
      // Offline, DNS, the request never left. Same story for the user either way.
      setStatus("failed");
    }
  }

  const sent = status === "sent";

  return (
    // Both states share one grid cell. The form stays mounted underneath the
    // confirmation — invisible and inert, but still in flow, so the glass pane
    // keeps the exact height it had while it was being filled in. Swapping one
    // for the other would collapse the pane to the shorter of the two and drop
    // the page a hundred-odd pixels at the moment of success, which is the one
    // moment nothing should move.
    <div className={styles.stack}>
      <form
        className={styles.form}
        onSubmit={onSubmit}
        noValidate
        data-hidden={sent || undefined}
        // Not just hidden: `inert` takes the fields out of the tab order and off
        // the accessibility tree, so a keyboard or screen-reader user can't land
        // in a form that is no longer there.
        inert={sent}
      >
        <div className={styles.row}>
          {/* Neither of these is prose, and the dictionary has an opinion about
              both: a surname it has never seen gets flagged, and an address gets
              flagged in full. The message below keeps its spellcheck — that one
              is writing, and a typo there is worth catching. */}
          <Field
            id={`${id}-name`}
            name="name"
            label={dict.name}
            autoComplete="name"
            autoCapitalize="words"
            spellCheck={false}
            error={fieldErrors.name ? dict.errors.name : undefined}
          />
          <Field
            id={`${id}-email`}
            name="email"
            type="email"
            label={dict.email}
            autoComplete="email"
            inputMode="email"
            // An address is not a sentence: capitalising the first letter or
            // "correcting" the domain is how a valid address turns invalid on a
            // phone, silently, between typing it and sending it.
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            error={fieldErrors.email ? dict.errors.email : undefined}
          />
        </div>

        <Field
          id={`${id}-message`}
          name="message"
          label={dict.message}
          placeholder={dict.messagePlaceholder}
          multiline
          error={fieldErrors.message ? dict.errors.message : undefined}
        />

        {/* Honeypot. Hidden from sight and from assistive tech, and left out of the
            tab order — a human never finds it, a bot fills everything it sees. */}
        <div className={styles.honeypot} aria-hidden>
          <label htmlFor={`${id}-company`}>Company</label>
          <input
            id={`${id}-company`}
            name="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className={styles.submitRow}>
          <BorderGlow
            className={styles.submitGlow}
            backgroundColor="transparent"
            glowColor={GLOW_HSL}
            colors={[palette.primary, palette.primaryLight, palette.primary]}
            borderRadius={999}
            uniform
            edgeSensitivity={0}
            glowRadius={20}
            glowIntensity={0.95}
            fillOpacity={0}
          >
            <button
              type="submit"
              className={styles.submit}
              disabled={status === "sending"}
            >
              {status === "sending" ? (
                <>
                  {dict.sending}
                  <span className={styles.dots} aria-hidden />
                </>
              ) : (
                dict.submit
              )}
            </button>
          </BorderGlow>

          {/* Assertive: the send just failed under the user's hands, and the
              message names the way out (write to me directly). */}
          <AnimatePresence>
            {status === "failed" && (
              <motion.p
                className={styles.failed}
                role="alert"
                initial={reduced ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={transition}
              >
                {dict.errors.failed}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </form>

      {sent && (
        <motion.div
          className={styles.sent}
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          // The form is gone from view; a screen reader would otherwise never
          // learn why.
          role="status"
        >
          {/* One gesture, drawn once: the ring closes, then the check strikes
              through it. A seal being stamped, not an icon appearing. */}
          <svg
            className={styles.sentMark}
            viewBox="0 0 40 40"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            focusable="false"
          >
            <motion.circle
              className={styles.sentRing}
              cx="20"
              cy="20"
              r="18.5"
              strokeWidth="1"
              initial={reduced ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: reduced ? 0 : 0.6, ease: EASE }}
              // From twelve o'clock, clockwise: a ring that starts anywhere else
              // reads as an arc that happened to close.
              style={{ rotate: -90, transformOrigin: "center" }}
            />
            <motion.path
              d="m12.8 20.4 4.8 4.8 9.6-10"
              strokeWidth="1.5"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: reduced ? 0 : 0.35,
                ease: EASE,
                delay: reduced ? 0 : 0.42,
              }}
            />
          </svg>

          <p className={styles.sentTitle}>{dict.successTitle}</p>
          <p className={styles.sentBody}>{dict.successBody}</p>

          {/* The way back, set apart by the same hairline the rest of the page
              divides with — so it reads as a footnote to the confirmation, not
              as a second thing being offered. */}
          <div className={styles.againRow}>
            <button
              type="button"
              className={styles.again}
              onClick={() => setStatus("idle")}
            >
              {dict.again}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

type FieldProps = {
  id: string;
  name: Field;
  label: string;
  error?: string;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "email";
  autoCapitalize?: string;
  autoCorrect?: string;
  spellCheck?: boolean;
};

function Field({
  id,
  name,
  label,
  error,
  type = "text",
  multiline,
  placeholder,
  autoComplete,
  inputMode,
  autoCapitalize,
  autoCorrect,
  spellCheck,
}: FieldProps) {
  const errorId = `${id}-error`;

  // A visible label, not a placeholder standing in for one: a placeholder
  // vanishes the moment someone types, exactly when they need it to check what
  // they were asked for.
  const shared = {
    id,
    name,
    placeholder,
    autoComplete,
    inputMode,
    autoCapitalize,
    autoCorrect,
    spellCheck,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error ? errorId : undefined,
    className: styles.input,
  };

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>

      {multiline ? (
        <textarea {...shared} rows={4} />
      ) : (
        <input {...shared} type={type} />
      )}

      {/* The rule under each field doubles as the focus indicator: it lights in
          the accent, so focus and validity share one visual language. */}
      <span className={styles.rule} aria-hidden />

      <AnimatePresence>
        {error && (
          <motion.span
            id={errorId}
            className={styles.error}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
