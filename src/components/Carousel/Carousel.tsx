"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
  type PanInfo,
  type MotionValue,
} from "motion/react";
import styles from "./Carousel.module.scss";

// A drag/swipe track: one item in view at a time, the neighbours swinging in on
// a Y-axis rotation as they arrive. Adapted from the React Bits carousel — the
// motion logic (looping clones, the spring, the perspective) is kept; the items
// are arbitrary nodes rather than a fixed title/description/icon shape, so a
// caller can hand it whatever card it already renders elsewhere.
//
// Width: `baseWidth` pins it, or leave it off and the track measures its own
// slot and fills it. The measurement is what makes it usable on a phone — the
// spring animates a pixel offset, so the geometry has to be a real number, not
// a percentage.

export type CarouselItem = {
  /** Stable identity for the item; also used to key the clones. */
  id: string;
  content: ReactNode;
};

export type CarouselProps = {
  items: CarouselItem[];
  /** Fixed track width in px. Omitted, the carousel measures its container. */
  baseWidth?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  /** Seamless wrap from the last item back to the first, via edge clones. */
  loop?: boolean;
  /** Inner padding between the track and the container edge, in px. */
  containerPadding?: number;
  /** Accessible name for the whole track, e.g. "Services". */
  label?: string;
  /** Names each dot, given the 1-based slide number. */
  slideLabel?: (index: number) => string;
  className?: string;
};

const DRAG_BUFFER = 0;
const VELOCITY_THRESHOLD = 500;
const GAP = 16;
const SPRING_OPTIONS = { type: "spring" as const, stiffness: 300, damping: 30 };

type SlideProps = {
  index: number;
  itemWidth: number;
  trackItemOffset: number;
  x: MotionValue<number>;
  /** Off, the slides sit flat — reduced motion keeps the swipe, drops the swing. */
  rotate: boolean;
  children: ReactNode;
};

function Slide({
  index,
  itemWidth,
  trackItemOffset,
  x,
  rotate,
  children,
}: SlideProps) {
  // The slide's own offset maps to a swing: edge-on as it leaves either side,
  // flat when it is the one in view.
  const range = [
    -(index + 1) * trackItemOffset,
    -index * trackItemOffset,
    -(index - 1) * trackItemOffset,
  ];
  const rotateY = useTransform(x, range, [90, 0, -90], { clamp: false });

  return (
    <motion.div
      className={styles.item}
      style={{ width: itemWidth, ...(rotate ? { rotateY } : null) }}
    >
      {children}
    </motion.div>
  );
}

export default function Carousel({
  items,
  baseWidth,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
  loop = false,
  containerPadding = 0,
  label,
  slideLabel = (index) => `Go to slide ${index}`,
  className,
}: CarouselProps) {
  const reduced = useReducedMotion();

  // Fluid mode: the wrapper is whatever the layout gives it, and the track is
  // sized off the measurement. Until the first measurement lands there is
  // nothing to size, so the track holds off rendering rather than flashing at a
  // made-up width and springing to the real one.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<number | null>(null);

  useEffect(() => {
    if (baseWidth !== undefined) return;
    const el = wrapRef.current;
    if (!el) return;

    setMeasured(el.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) =>
      setMeasured(entry.contentRect.width),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [baseWidth]);

  const width = baseWidth ?? measured;
  const itemWidth = Math.max((width ?? 0) - containerPadding * 2, 0);
  const trackItemOffset = itemWidth + GAP;

  // Looping is done with edge clones: [last, ...items, first]. Sliding onto a
  // clone then swapping to its twin with the animation off is what makes the
  // wrap seamless.
  const itemsForRender = useMemo(() => {
    if (!loop || items.length === 0) return items;
    return [items[items.length - 1], ...items, items[0]];
  }, [items, loop]);

  // Index into `itemsForRender` — so with looping, 1 is the first real item and
  // 0 / length-1 are the clones. Clamped on read rather than corrected in an
  // effect, which keeps a shrinking item list from needing a second render.
  // A caller wanting to reset the track when its items change should key it.
  const [rawPosition, setPosition] = useState(loop ? 1 : 0);
  const maxIndex = Math.max(itemsForRender.length - 1, 0);
  const position = Math.min(rawPosition, maxIndex);

  const x = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pauseOnHover) return;
    const container = containerRef.current;
    if (!container) return;

    const onEnter = () => setIsHovered(true);
    const onLeave = () => setIsHovered(false);
    container.addEventListener("mouseenter", onEnter);
    container.addEventListener("mouseleave", onLeave);
    return () => {
      container.removeEventListener("mouseenter", onEnter);
      container.removeEventListener("mouseleave", onLeave);
    };
  }, [pauseOnHover]);

  useEffect(() => {
    if (!autoplay || itemsForRender.length <= 1) return;
    if (pauseOnHover && isHovered) return;

    const timer = setInterval(() => {
      setPosition((prev) => Math.min(prev + 1, itemsForRender.length - 1));
    }, autoplayDelay);
    return () => clearInterval(timer);
  }, [autoplay, autoplayDelay, isHovered, pauseOnHover, itemsForRender.length]);

  // Geometry changed — the first measurement, a resize, an orientation flip.
  // Snap the track to where the current slide now sits, rather than letting the
  // spring chase the new offset across the screen. Guarded on the offset alone:
  // the effect also runs when the position changes, and that is precisely the
  // case that must stay animated.
  const measuredOffset = useRef(-1);
  useEffect(() => {
    if (measuredOffset.current === trackItemOffset) return;
    measuredOffset.current = trackItemOffset;
    x.set(-position * trackItemOffset);
  }, [trackItemOffset, position, x]);

  const effectiveTransition = isJumping
    ? { duration: 0 }
    : reduced
      ? { duration: 0.2 }
      : SPRING_OPTIONS;

  // Landed on a clone: swap to its twin with the transition off, so the wrap
  // reads as one continuous slide rather than a rewind.
  const handleAnimationComplete = () => {
    if (!loop || itemsForRender.length <= 1) {
      setIsAnimating(false);
      return;
    }

    const lastClone = itemsForRender.length - 1;
    const target =
      position === lastClone ? 1 : position === 0 ? items.length : null;

    if (target === null) {
      setIsAnimating(false);
      return;
    }

    setIsJumping(true);
    setPosition(target);
    x.set(-target * trackItemOffset);
    requestAnimationFrame(() => {
      setIsJumping(false);
      setIsAnimating(false);
    });
  };

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const { offset, velocity } = info;
    const direction =
      offset.x < -DRAG_BUFFER || velocity.x < -VELOCITY_THRESHOLD
        ? 1
        : offset.x > DRAG_BUFFER || velocity.x > VELOCITY_THRESHOLD
          ? -1
          : 0;
    if (direction === 0) return;

    setPosition(Math.max(0, Math.min(position + direction, maxIndex)));
  };

  // Without the clones there is nothing past either end to drag onto, so the
  // track is fenced in at both edges.
  const dragProps = loop
    ? {}
    : {
        dragConstraints: {
          left: -trackItemOffset * Math.max(itemsForRender.length - 1, 0),
          right: 0,
        },
      };

  const activeIndex =
    items.length === 0
      ? 0
      : loop
        ? (position - 1 + items.length) % items.length
        : Math.min(position, items.length - 1);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={
        baseWidth !== undefined
          ? ({ width: `${baseWidth}px` } as CSSProperties)
          : undefined
      }
    >
      <div
        ref={containerRef}
        className={styles.container}
        style={{ padding: containerPadding }}
        role="group"
        aria-roledescription="carousel"
        aria-label={label}
      >
        {width !== null && (
          <motion.div
            className={styles.track}
            drag={isAnimating ? false : "x"}
            {...dragProps}
            style={{
              width: itemWidth,
              gap: `${GAP}px`,
              perspective: 1000,
              perspectiveOrigin: `${position * trackItemOffset + itemWidth / 2}px 50%`,
              x,
            }}
            onDragEnd={handleDragEnd}
            animate={{ x: -(position * trackItemOffset) }}
            transition={effectiveTransition}
            onAnimationStart={() => setIsAnimating(true)}
            onAnimationComplete={handleAnimationComplete}
          >
            {itemsForRender.map((item, index) => (
              <Slide
                key={`${item.id}-${index}`}
                index={index}
                itemWidth={itemWidth}
                trackItemOffset={trackItemOffset}
                x={x}
                rotate={!reduced}
              >
                {item.content}
              </Slide>
            ))}
          </motion.div>
        )}
      </div>

      <div className={styles.indicators}>
        {items.map((item, index) => (
          <motion.button
            type="button"
            key={item.id}
            className={`${styles.indicator} ${activeIndex === index ? styles.active : ""}`}
            aria-label={slideLabel(index + 1)}
            aria-current={activeIndex === index}
            animate={{ scale: activeIndex === index ? 1.2 : 1 }}
            transition={{ duration: 0.15 }}
            onClick={() => setPosition(loop ? index + 1 : index)}
          />
        ))}
      </div>
    </div>
  );
}
