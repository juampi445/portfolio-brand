"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type CSSProperties,
} from "react";
import "./LineSidebar.css";

type Falloff = "linear" | "smooth" | "sharp";

export interface LineSidebarProps {
  items?: string[];
  accentColor?: string;
  textColor?: string;
  markerColor?: string;
  showIndex?: boolean;
  showMarker?: boolean;
  /**
   * How far *outside* a row the pointer can be and still light it, in px. Inside
   * the row the effect is always full, so this only shapes the ramp across the
   * gap between rows.
   */
  proximityRadius?: number;
  maxShift?: number;
  falloff?: Falloff;
  markerLength?: number;
  markerGap?: number;
  tickScale?: number;
  scaleTick?: boolean;
  itemGap?: number;
  fontSize?: number;
  smoothing?: number;
  defaultActive?: number | null;
  /**
   * Controlled active index. When provided, the sidebar reflects this instead of
   * its own click state — so an outside source (here, scroll position) can own
   * "which item is current". Clicks then only fire onItemClick.
   */
  active?: number | null;
  onItemClick?: (index: number, label: string) => void;
  className?: string;
}

const FALLOFF_CURVES: Record<Falloff, (p: number) => number> = {
  linear: (p) => p,
  smooth: (p) => p * p * (3 - 2 * p),
  sharp: (p) => p * p * p,
};

const DEFAULT_ITEMS = ["Overview", "Components", "Animations"];

const LineSidebar = ({
  items = DEFAULT_ITEMS,
  accentColor = "#A855F7",
  textColor = "#c4c4c4",
  markerColor = "#6c6c6c",
  showIndex = true,
  showMarker = true,
  proximityRadius = 100,
  maxShift = 30,
  falloff = "smooth",
  markerLength = 60,
  markerGap = 0,
  tickScale = 0.5,
  scaleTick = true,
  itemGap = 20,
  fontSize = 1.1,
  smoothing = 100,
  defaultActive = null,
  active,
  onItemClick,
  className = "",
}: LineSidebarProps) => {
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const targetsRef = useRef<number[]>([]);
  const currentRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  // Whether the rAF loop is live. Tracked explicitly instead of inferring it from
  // rafRef: a cancelled frame leaves rafRef holding a stale id, and guarding
  // startLoop on that stale id wedges the loop shut so nothing repaints again.
  const runningRef = useRef(false);
  const lastRef = useRef(0);
  const activeRef = useRef<number | null>(defaultActive);
  const smoothingRef = useRef(smoothing);
  const [internalActive, setInternalActive] = useState<number | null>(
    defaultActive,
  );

  // Controlled when `active` is passed, otherwise self-managed via clicks.
  const isControlled = active !== undefined;
  const activeIndex = isControlled ? active! : internalActive;

  // Mirrored into refs instead of read straight from the closure: the frame loop
  // below is deliberately identity-stable, so it can't capture these values and
  // reads the live ones through the refs instead. Synced in an effect rather
  // than during render — a render is allowed to be thrown away, and a ref
  // written there would keep a value that was never committed. Declared above
  // the effects that call startLoop, so effect order guarantees the loop always
  // starts from fresh values.
  useEffect(() => {
    activeRef.current = activeIndex;
    smoothingRef.current = smoothing;
  }, [activeIndex, smoothing]);

  // Single rAF loop that eases every item's --effect toward its target using
  // frame-rate independent exponential smoothing, so color, shift and scale
  // all move together without staggering CSS transitions.
  //
  // The frame body lives inside startLoop as a hoisted function declaration so
  // it can schedule itself by name. As a component-level const it would be
  // referencing its own binding before that binding is initialised, which reads
  // as a value that could change under the running loop.
  const startLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    lastRef.current = performance.now();

    function runFrame(now: number) {
      const dt = Math.min((now - lastRef.current) / 1000, 0.05);
      lastRef.current = now;
      const tau = Math.max(smoothingRef.current, 1) / 1000;
      const k = 1 - Math.exp(-dt / tau);

      let moving = false;
      const els = itemRefs.current;
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (!el) continue;
        const target = Math.max(
          targetsRef.current[i] || 0,
          activeRef.current === i ? 1 : 0,
        );
        const cur = currentRef.current[i] || 0;
        const next = cur + (target - cur) * k;
        const settled = Math.abs(target - next) < 0.0015;
        const value = settled ? target : next;
        currentRef.current[i] = value;
        el.style.setProperty("--effect", value.toFixed(4));
        if (!settled) moving = true;
      }

      if (moving) {
        rafRef.current = requestAnimationFrame(runFrame);
      } else {
        rafRef.current = null;
        runningRef.current = false;
      }
    }

    rafRef.current = requestAnimationFrame(runFrame);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLUListElement>) => {
      const list = listRef.current;
      if (!list) return;
      const rect = list.getBoundingClientRect();
      const pointerY = e.clientY - rect.top;
      const ease = FALLOFF_CURVES[falloff] ?? FALLOFF_CURVES.linear;
      const els = itemRefs.current;

      // Distance to each row's *box*, not to its centre. Measured to the centre,
      // a row starts fading the moment the pointer moves off its middle — so
      // pointing squarely at a label still only half-lit it, and the row's own
      // top and bottom edges were always dimmer than its middle. Measured to the
      // box, anywhere inside the row is zero distance, and the falloff only
      // begins in the gap between rows, which is the only place it means
      // anything.
      const distances: number[] = [];
      let nearest = -1;
      let nearestDistance = Infinity;

      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (!el) continue;

        const half = el.offsetHeight / 2;
        const center = el.offsetTop + half;
        const distance = Math.max(0, Math.abs(pointerY - center) - half);

        distances[i] = distance;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = i;
        }
      }

      // One row at a time. Every row computing its own proximity meant that in
      // the gap between two of them both lit to roughly half, and a half-lit
      // pair reads as neither being pointed at. The nearest row takes it whole
      // and the rest go to zero; the frame loop's own smoothing is what turns
      // the switch between two rows into a crossfade.
      for (let i = 0; i < els.length; i++) {
        if (!els[i]) continue;
        targetsRef.current[i] =
          i === nearest ? ease(Math.max(0, 1 - distances[i] / proximityRadius)) : 0;
      }

      startLoop();
    },
    [falloff, proximityRadius, startLoop],
  );

  const handlePointerLeave = useCallback(() => {
    targetsRef.current = targetsRef.current.map(() => 0);
    startLoop();
  }, [startLoop]);

  const handleClick = useCallback(
    (index: number, label: string) => {
      if (!isControlled) setInternalActive(index);
      onItemClick?.(index, label);
    },
    [isControlled, onItemClick],
  );

  useEffect(() => {
    startLoop();
  }, [activeIndex, startLoop]);

  // Repaint when the label set changes (a locale switch translates the labels in
  // place, keeping the same rows and the same activeIndex). Without this the
  // marker and hover would go dark until the next scroll or pointer move, because
  // the activeIndex effect above has nothing new to react to.
  const itemsKey = items.join("|");
  useEffect(() => {
    startLoop();
  }, [itemsKey, startLoop]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      runningRef.current = false;
    },
    [],
  );

  return (
    <nav
      className={`line-sidebar${showMarker ? " line-sidebar--markers" : ""}${scaleTick ? " line-sidebar--scale-tick" : ""}${className ? ` ${className}` : ""}`}
      style={
        {
          "--accent-color": accentColor,
          "--text-color": textColor,
          "--marker-color": markerColor,
          "--marker-length": `${markerLength}px`,
          "--marker-gap": `${markerGap}px`,
          "--tick-scale": tickScale,
          "--max-shift": `${maxShift}px`,
          "--item-gap": `${itemGap}px`,
          "--font-size": `${fontSize}rem`,
          "--smoothing": `${smoothing}ms`,
        } as CSSProperties
      }
    >
      <ul
        ref={listRef}
        className="line-sidebar__list"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {items.map((label, index) => (
          <li
            // Positional key, not label-based: the list is a fixed set of ordered
            // slots whose labels only translate. Keying on the label would remount
            // every row on a locale switch, nulling the index-based refs below and
            // breaking hover and the active marker. Keyed by slot, the text swaps
            // in place and the refs stay attached.
            key={index}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className="line-sidebar__item"
            aria-current={activeIndex === index ? "true" : undefined}
            onClick={() => handleClick(index, label)}
          >
            {showMarker && (
              <span className="line-sidebar__marker" aria-hidden="true" />
            )}
            <span className="line-sidebar__label">
              {showIndex && (
                <span className="line-sidebar__index">
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}
              <span className="line-sidebar__text">{label}</span>
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default LineSidebar;
