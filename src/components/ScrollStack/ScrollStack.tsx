"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import type { ReactNode } from "react";
import Lenis from "lenis";
import "./ScrollStack.css";

export interface ScrollStackHandle {
  /** Smooth-scroll so that the card at `index` becomes the front of the stack. */
  scrollToCard: (index: number) => void;
}

// useLayoutEffect on the client, useEffect on the server — the layout variant
// warns during SSR, and there is nothing to measure there anyway.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface ScrollStackItemProps {
  itemClassName?: string;
  children: ReactNode;
}

export const ScrollStackItem: React.FC<ScrollStackItemProps> = ({
  children,
  itemClassName = "",
}) => (
  <div className={`scroll-stack-card ${itemClassName}`.trim()}>{children}</div>
);

interface ScrollStackProps {
  className?: string;
  children: ReactNode;
  itemDistance?: number;
  itemScale?: number;
  itemStackDistance?: number;
  stackPosition?: string;
  scaleEndPosition?: string;
  baseScale?: number;
  scaleDuration?: number;
  rotationAmount?: number;
  blurAmount?: number;
  useWindowScroll?: boolean;
  onStackComplete?: () => void;
  /** Fires with the index of the front-most (top) card whenever it changes. */
  onCardChange?: (index: number) => void;
}

interface CardTransform {
  translateY: number;
  scale: number;
  rotation: number;
  blur: number;
}

// Document-relative top of an element, walking the offsetParent chain. offsetTop
// is a *layout* measurement — unlike getBoundingClientRect it is unaffected by
// any transform on the element or its ancestors. That is the whole point: the
// per-frame pin math writes a transform to each card, so measuring position with
// getBoundingClientRect would feed that transform back into the value that
// produced it, and the card would oscillate. Measuring off layout keeps the
// reference fixed.
function getDocumentTop(element: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = element;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

const ScrollStack = forwardRef<ScrollStackHandle, ScrollStackProps>(function ScrollStack(
  {
    children,
    className = "",
    itemDistance = 100,
    itemScale = 0.03,
    itemStackDistance = 30,
    stackPosition = "20%",
    scaleEndPosition = "10%",
    baseScale = 0.85,
    scaleDuration = 0.5,
    rotationAmount = 0,
    blurAmount = 0,
    useWindowScroll = false,
    onStackComplete,
    onCardChange,
  },
  ref,
) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stackCompletedRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const cardsRef = useRef<HTMLElement[]>([]);
  const lastTransformsRef = useRef(new Map<number, CardTransform>());
  const isUpdatingRef = useRef(false);

  // Layout positions, measured off the flow and cached. Rebuilt on mount and on
  // any resize — never read during the scroll loop, where transforms are live.
  const cardTopsRef = useRef<number[]>([]);
  const endTopRef = useRef(0);
  const activeIndexRef = useRef(-1);

  const calculateProgress = useCallback(
    (scrollTop: number, start: number, end: number) => {
      if (scrollTop < start) return 0;
      if (scrollTop > end) return 1;
      return (scrollTop - start) / (end - start);
    },
    [],
  );

  const parsePercentage = useCallback(
    (value: string | number, containerHeight: number) => {
      if (typeof value === "string" && value.includes("%")) {
        return (parseFloat(value) / 100) * containerHeight;
      }
      return parseFloat(value as string);
    },
    [],
  );

  const getScrollData = useCallback(() => {
    if (useWindowScroll) {
      return { scrollTop: window.scrollY, containerHeight: window.innerHeight };
    }
    const scroller = scrollerRef.current;
    return {
      scrollTop: scroller ? scroller.scrollTop : 0,
      containerHeight: scroller ? scroller.clientHeight : 0,
    };
  }, [useWindowScroll]);

  // Measure and cache the flow position of every card and the end spacer. Cheap,
  // and only called on mount / resize, so the scroll loop stays read-free.
  const measureLayout = useCallback(() => {
    const scroller = scrollerRef.current;
    const measure = (el: HTMLElement) =>
      useWindowScroll ? getDocumentTop(el) : el.offsetTop;

    cardTopsRef.current = cardsRef.current.map(measure);

    const endElement = (
      useWindowScroll ? document : (scroller ?? document)
    ).querySelector(".scroll-stack-end") as HTMLElement | null;
    endTopRef.current = endElement ? measure(endElement) : 0;
  }, [useWindowScroll]);

  const updateCardTransforms = useCallback(() => {
    const cards = cardsRef.current;
    if (!cards.length || isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    const { scrollTop, containerHeight } = getScrollData();
    const stackPositionPx = parsePercentage(stackPosition, containerHeight);
    const scaleEndPositionPx = parsePercentage(scaleEndPosition, containerHeight);
    const endElementTop = endTopRef.current;

    // The front card: the highest-index card whose stacking point has been
    // passed. Drives both the optional blur and the onCardChange report.
    let topCardIndex = 0;
    for (let j = 0; j < cards.length; j++) {
      const jTriggerStart =
        cardTopsRef.current[j] - stackPositionPx - itemStackDistance * j;
      if (scrollTop >= jTriggerStart) topCardIndex = j;
    }

    if (topCardIndex !== activeIndexRef.current) {
      activeIndexRef.current = topCardIndex;
      onCardChange?.(topCardIndex);
    }

    cards.forEach((card, i) => {
      if (!card) return;

      const cardTop = cardTopsRef.current[i];
      const triggerStart = cardTop - stackPositionPx - itemStackDistance * i;
      const triggerEnd = cardTop - scaleEndPositionPx;
      const pinStart = cardTop - stackPositionPx - itemStackDistance * i;
      const pinEnd = endElementTop - containerHeight / 2;

      const scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd);
      const targetScale = baseScale + i * itemScale;
      const scale = 1 - scaleProgress * (1 - targetScale);
      const rotation = rotationAmount ? i * rotationAmount * scaleProgress : 0;

      let blur = 0;
      if (blurAmount && i < topCardIndex) {
        blur = Math.max(0, (topCardIndex - i) * blurAmount);
      }

      let translateY = 0;
      const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;

      if (isPinned) {
        translateY = scrollTop - cardTop + stackPositionPx + itemStackDistance * i;
      } else if (scrollTop > pinEnd) {
        translateY = pinEnd - cardTop + stackPositionPx + itemStackDistance * i;
      }

      const newTransform: CardTransform = {
        translateY: Math.round(translateY * 100) / 100,
        scale: Math.round(scale * 1000) / 1000,
        rotation: Math.round(rotation * 100) / 100,
        blur: Math.round(blur * 100) / 100,
      };

      const lastTransform = lastTransformsRef.current.get(i);
      const hasChanged =
        !lastTransform ||
        Math.abs(lastTransform.translateY - newTransform.translateY) > 0.1 ||
        Math.abs(lastTransform.scale - newTransform.scale) > 0.001 ||
        Math.abs(lastTransform.rotation - newTransform.rotation) > 0.1 ||
        Math.abs(lastTransform.blur - newTransform.blur) > 0.1;

      if (hasChanged) {
        const transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale}) rotate(${newTransform.rotation}deg)`;
        const filter = newTransform.blur > 0 ? `blur(${newTransform.blur}px)` : "";

        card.style.transform = transform;
        card.style.filter = filter;

        lastTransformsRef.current.set(i, newTransform);
      }

      if (i === cards.length - 1) {
        const isInView = scrollTop >= pinStart && scrollTop <= pinEnd;
        if (isInView && !stackCompletedRef.current) {
          stackCompletedRef.current = true;
          onStackComplete?.();
        } else if (!isInView && stackCompletedRef.current) {
          stackCompletedRef.current = false;
        }
      }
    });

    isUpdatingRef.current = false;
  }, [
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    rotationAmount,
    blurAmount,
    onStackComplete,
    onCardChange,
    calculateProgress,
    parsePercentage,
    getScrollData,
  ]);

  const handleScroll = useCallback(() => {
    updateCardTransforms();
  }, [updateCardTransforms]);

  // Mounts Lenis on the right scroll source and returns its teardown. On window
  // scroll it drives the whole page (with `anchors` so in-page #hash links stay
  // smooth); nested, it wraps the scroller. Lenis runs scroll and the transform
  // update in the same frame, which is what keeps the pinned cards from jittering.
  const setupLenis = useCallback((): (() => void) => {
    const common = {
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 2,
      infinite: false,
      wheelMultiplier: 1,
      lerp: 0.1,
      syncTouch: true,
      syncTouchLerp: 0.075,
    };

    let lenis: Lenis | null;
    if (useWindowScroll) {
      lenis = new Lenis({ ...common, anchors: true });
    } else {
      const scroller = scrollerRef.current;
      if (!scroller) return () => {};
      lenis = new Lenis({
        ...common,
        wrapper: scroller,
        content: scroller.querySelector(".scroll-stack-inner") as HTMLElement,
        gestureOrientation: "vertical",
      });
    }

    lenis.on("scroll", handleScroll);

    const raf = (time: number) => {
      lenis!.raf(time);
      animationFrameRef.current = requestAnimationFrame(raf);
    };
    animationFrameRef.current = requestAnimationFrame(raf);
    lenisRef.current = lenis;

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      lenis!.destroy();
      lenisRef.current = null;
    };
  }, [handleScroll, useWindowScroll]);

  useIsomorphicLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const cards = Array.from(
      useWindowScroll
        ? document.querySelectorAll(".scroll-stack-card")
        : scroller.querySelectorAll(".scroll-stack-card"),
    ) as HTMLElement[];

    cardsRef.current = cards;
    const transformsCache = lastTransformsRef.current;

    cards.forEach((card, i) => {
      if (i < cards.length - 1) {
        card.style.marginBottom = `${itemDistance}px`;
      }
      card.style.willChange = "transform, filter";
      card.style.transformOrigin = "top center";
      card.style.backfaceVisibility = "hidden";
      card.style.transform = "translateZ(0)";
      card.style.perspective = "1000px";
      // Vendor-prefixed fallbacks: not in the typed CSSStyleDeclaration surface.
      const s = card.style as CSSStyleDeclaration & Record<string, string>;
      s.webkitTransform = "translateZ(0)";
      s.webkitPerspective = "1000px";
    });

    // Margins are set above, so the flow positions are final — measure now.
    measureLayout();
    const teardownScroll = setupLenis();
    updateCardTransforms();

    // Any layout change (fonts settling, viewport resize, locale swap) shifts the
    // cached tops, so remeasure and repaint the frame off the new values.
    const remeasure = () => {
      measureLayout();
      updateCardTransforms();
    };
    const resizeObserver = new ResizeObserver(remeasure);
    resizeObserver.observe(scroller);
    window.addEventListener("resize", remeasure);

    return () => {
      teardownScroll();
      resizeObserver.disconnect();
      window.removeEventListener("resize", remeasure);
      stackCompletedRef.current = false;
      activeIndexRef.current = -1;
      cardsRef.current = [];
      transformsCache.clear();
      isUpdatingRef.current = false;
    };
  }, [
    itemDistance,
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    scaleDuration,
    rotationAmount,
    blurAmount,
    useWindowScroll,
    measureLayout,
    setupLenis,
    updateCardTransforms,
  ]);

  // Smooth-scroll so card `index` sits at the front of the stack: its front
  // begins exactly at its stacking trigger, so target that. Routed through Lenis
  // when it owns the scroll, so it doesn't fight the smoothing.
  const scrollToCard = useCallback(
    (index: number) => {
      const cards = cardsRef.current;
      if (!cards.length) return;

      // Remeasure first. The cached tops are only refreshed on resize and by the
      // observer on the scroller, so a height change *above* the stack (media
      // finishing, fonts settling) shifts every card down without either firing:
      // the stack moved, its size didn't. Stale-low tops make this land short of
      // the trigger, which reads as overshooting upward. Three offsetTop walks
      // on a click is nothing.
      measureLayout();

      const i = Math.max(0, Math.min(index, cards.length - 1));
      const { containerHeight } = getScrollData();
      const stackPositionPx = parsePercentage(stackPosition, containerHeight);
      const target = Math.max(
        0,
        cardTopsRef.current[i] - stackPositionPx - itemStackDistance * i + 2,
      );

      const lenis = lenisRef.current;
      if (lenis) {
        lenis.scrollTo(target);
      } else if (useWindowScroll) {
        window.scrollTo({ top: target, behavior: "smooth" });
      } else {
        scrollerRef.current?.scrollTo({ top: target, behavior: "smooth" });
      }
    },
    [
      getScrollData,
      measureLayout,
      parsePercentage,
      stackPosition,
      itemStackDistance,
      useWindowScroll,
    ],
  );

  useImperativeHandle(ref, () => ({ scrollToCard }), [scrollToCard]);

  return (
    <div className={`scroll-stack-scroller ${className}`.trim()} ref={scrollerRef}>
      <div className="scroll-stack-inner">
        {children}
        {/* Spacer so the last pin can release cleanly */}
        <div className="scroll-stack-end" />
      </div>
    </div>
  );
});

export default ScrollStack;
