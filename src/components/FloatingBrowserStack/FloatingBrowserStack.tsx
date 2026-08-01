"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import styles from "./FloatingBrowserStack.module.scss";

export interface StackItem {
  /** A real project screenshot under /public — never a texture. */
  src: string;
}

interface FloatingBrowserStackProps {
  /** Exactly three, in depth order: [background, middle, foreground]. */
  items: StackItem[];
  className?: string;
}

interface LayerSpec {
  // Base position offset from the stack centre, in px — a gentle diagonal so the
  // supports peek up-left and the hero sits forward, down-right.
  offsetX: number;
  offsetY: number;
  rotate: number;
  scale: number;
  opacity: number;
  blur: number;
  z: number;
  // Parallax reach in px: the closer the plate, the further it tracks the mouse.
  parallax: number;
  // Float amplitude (px) and its own slow cycle, so the three never sync.
  floatY: number;
  duration: number;
  delay: number;
  /** The foreground plate is above the fold, so it loads eagerly. */
  priority: boolean;
}

// Index order matches the `items` prop: background, middle, foreground. The two
// supports are held well back — smaller, fainter, blurred — so the foreground
// plate is unambiguously the subject rather than one of three peers.
const LAYERS: LayerSpec[] = [
  { offsetX: -78, offsetY: -84, rotate: 3, scale: 0.8, opacity: 0.46, blur: 5, z: 1, parallax: 3, floatY: 5, duration: 12, delay: 0.6, priority: false },
  { offsetX: -30, offsetY: -26, rotate: -4, scale: 0.88, opacity: 0.68, blur: 2.5, z: 2, parallax: 5, floatY: 7, duration: 10, delay: 1.3, priority: false },
  { offsetX: 44, offsetY: 52, rotate: 6, scale: 1.04, opacity: 1, blur: 0, z: 3, parallax: 8, floatY: 9, duration: 9, delay: 0, priority: true },
];

function BrowserMockup({ src, priority }: { src: string; priority: boolean }) {
  return (
    <div className={styles.mockup}>
      <div className={styles.toolbar}>
        <span className={styles.lights}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.address} />
      </div>
      <div className={styles.screen}>
        {/* `fill` + object-fit: cover — the screenshots' own ratios differ from
            the 16/10 pane, and cropping is the only way to keep them true.
            Decorative (the stack is aria-hidden), hence the empty alt. */}
        <Image
          className={styles.shot}
          src={src}
          alt=""
          fill
          sizes="480px"
          priority={priority}
        />
      </div>
    </div>
  );
}

function ParallaxLayer({
  spec,
  item,
  mx,
  my,
  reduced,
}: {
  spec: LayerSpec;
  item: StackItem;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  reduced: boolean;
}) {
  const px = useTransform(mx, [-1, 1], [-spec.parallax, spec.parallax]);
  const py = useTransform(my, [-1, 1], [-spec.parallax, spec.parallax]);

  return (
    <div
      className={styles.layer}
      style={{
        transform: `translate(${spec.offsetX}px, ${spec.offsetY}px)`,
        zIndex: spec.z,
      }}
    >
      {/* Parallax rides on its own element so it never fights the float/tilt. */}
      <motion.div
        className={styles.parallax}
        style={reduced ? undefined : { x: px, y: py }}
      >
        <motion.div
          className={styles.plate}
          style={{
            opacity: spec.opacity,
            filter: spec.blur ? `blur(${spec.blur}px)` : undefined,
          }}
          animate={
            reduced
              ? { rotate: spec.rotate, scale: spec.scale }
              : {
                  rotate: spec.rotate,
                  scale: spec.scale,
                  y: [-spec.floatY, spec.floatY, -spec.floatY],
                }
          }
          transition={
            reduced
              ? { duration: 0 }
              : {
                  rotate: { duration: 0 },
                  scale: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                  y: {
                    duration: spec.duration,
                    delay: spec.delay,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "loop",
                  },
                }
          }
        >
          {/* Hover is a lighting change, not a movement: the plate never
              scales, so nothing under the cursor shifts. See the stylesheet. */}
          <BrowserMockup src={item.src} priority={spec.priority} />
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function FloatingBrowserStack({
  items,
  className,
}: FloatingBrowserStackProps) {
  const reduced = useReducedMotion();

  // Mouse position, normalised to -1..1, softened by a spring so the parallax
  // trails the cursor rather than snapping to it.
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.6 });
  const my = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      rawX.set((e.clientX / window.innerWidth) * 2 - 1);
      rawY.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced, rawX, rawY]);

  return (
    <div
      className={className ? `${styles.stack} ${className}` : styles.stack}
      aria-hidden
    >
      {/* One soft teal bloom behind the hero plate, tying the group together. */}
      <span className={styles.glow} />

      {LAYERS.map((spec, i) => (
        <ParallaxLayer
          key={i}
          spec={spec}
          item={items[i] ?? items[items.length - 1]}
          mx={mx}
          my={my}
          reduced={reduced ?? false}
        />
      ))}
    </div>
  );
}
