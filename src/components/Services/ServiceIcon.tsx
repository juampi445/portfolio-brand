"use client";

import { useReducedMotion } from "motion/react";
import MetallicPaint from "@/components/MetallicPaint/MetallicPaint";
import { palette } from "@/styles/palette";

// One mark per package, all three drawn on Material's own 0 -960 960 960 grid
// (x runs 0…960, y runs -960…0), so they sit at the same optical size and the
// one that is a real Material Symbol drops straight in beside the two that are
// not.
//
//   landing      → ads_click, a Material Symbol: a globe closed by a click.
//                  It was the mark for landing pages and it survives the change
//                  intact — "your presence online, and someone arriving at it"
//                  is exactly what package 1 is.
//   events       → a window with a header rule and a side panel. The old mark
//                  here was `celebration`, a party popper, which was tied to
//                  event sites and says nothing at all about a site that ships
//                  with its own editing panel. Drawn rather than borrowed: this
//                  is "web + panel", stated literally.
//   professional → three sliders, each set differently. The old mark was
//                  `workspace_premium`, a medal, which read as "the best tier"
//                  — the wrong claim for the one that is priced on scope.
//                  Sliders say what this tier actually is: the same work, set
//                  to your own measurements.
//
// The two drawn marks are built from 60-unit strokes, which is what Material's
// weight-300 outlines run to at this scale, so the family holds together.
//
// Rather than paint them flat, each mark is fed to MetallicPaint as a liquid-
// metal surface. That effect reads the shape from a raster, not from the DOM, so
// we hand it the geometry baked into an SVG data URI: a BLACK fill (the metal
// shows through the dark shape) with generous PADDING around the grid (viewBox
// grown by 200 units a side) so the wavy edges never clip.

type ServiceId = "landing" | "events" | "professional";

// Inner SVG markup, not bare path data: two of the three marks are more than one
// subpath and need their own fill rules (the window's frame is an even-odd ring,
// the bars and knobs beside it are plain non-zero fills).
const MARKS: Record<ServiceId, string> = {
  landing:
    `<path fill="#000000" d="M462.23-260.77q-85.61-7.31-143.92-69.77Q260-393 260-480q0-92.05 63.98-156.02Q387.95-700 480-700q87 0 149.46 58.12 62.46 58.11 69.77 144.34l-48.38-15q-11.36-61.31-58.71-101.69-47.36-40.38-112.14-40.38-72.69 0-123.65 50.96-50.96 50.96-50.96 123.65 0 64.31 40.57 112.08 40.58 47.77 101.5 59.15l14.77 48Zm48 159.15q-7.56 1-15.11 1.31-7.56.31-15.12.31-78.85 0-148.2-29.92t-120.65-81.21q-51.3-51.29-81.22-120.63Q100-401.1 100-479.93q0-78.84 29.92-148.21t81.21-120.68q51.29-51.31 120.63-81.25Q401.1-860 479.93-860q78.84 0 148.21 29.93 69.37 29.92 120.68 81.22t81.25 120.65Q860-558.85 860-480q0 7.46-.31 14.92t-1.31 14.93l-43.77-13.39V-480q0-139.69-97.46-237.15-97.46-97.46-237.15-97.46t-237.15 97.46Q145.39-619.69 145.39-480t97.46 237.15q97.46 97.46 237.15 97.46h16.46l13.77 43.77Zm295.38 7.39L624.23-276l-43.46 131.38L480-480l335.38 100.77L684-335.77l181.77 181.38-60.16 60.16Z"/>`,
  // A browser window: even-odd frame (outer rect, inner rect punched out of it),
  // then the header rule and the side panel's edge as their own filled bars.
  events:
    `<path fill="#000000" fill-rule="evenodd" d="M120-800h720v640H120v-640Zm60 60v520h600v-520H180Z"/>` +
    `<path fill="#000000" d="M180-620h600v60H180z"/>` +
    `<path fill="#000000" d="M340-560h60v340h-60z"/>`,
  // Three sliders. Each is a 50-unit bar with a 150-unit knob sitting on it, and
  // no two are set alike — the whole point of the mark. Knob and bar overlap and
  // merge under the default non-zero fill, which is what makes each one read as
  // one control rather than a disc parked on a line.
  professional:
    `<path fill="#000000" d="M140-765h680v50H140z"/>` +
    `<path fill="#000000" d="M585-740a75 75 0 1 0 150 0 75 75 0 1 0-150 0Z"/>` +
    `<path fill="#000000" d="M140-505h680v50H140z"/>` +
    `<path fill="#000000" d="M225-480a75 75 0 1 0 150 0 75 75 0 1 0-150 0Z"/>` +
    `<path fill="#000000" d="M140-245h680v50H140z"/>` +
    `<path fill="#000000" d="M405-220a75 75 0 1 0 150 0 75 75 0 1 0-150 0Z"/>`,
};

// The mark on a padded canvas, as a data URI MetallicPaint can load. 500px so it
// clears the effect's MIN_SIZE without oversizing the CPU pass.
function iconSrc(id: ServiceId): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" ` +
    `viewBox="-200 -1160 1360 1360">${MARKS[id]}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function ServiceIcon({ id }: { id: ServiceId }) {
  // Respect reduced-motion: the shader still renders, it just doesn't advance —
  // a frozen slab of chrome instead of a flowing one, matching the site's rule
  // that motion collapses to a static state when the user asks for it.
  const reduced = useReducedMotion();

  return (
    <MetallicPaint
      imageSrc={iconSrc(id)}
      // A slow mint chrome, keyed off the brand variables: the deep accent as
      // the highlight, the ink as the shadow, the primary mint as the tint.
      lightColor={palette.accent}
      darkColor={palette.dark}
      tintColor={palette.primary}
      brightness={1.0}
      contrast={0.65}
      scale={3}
      speed={reduced ? 0 : 0.22}
      liquid={0.6}
      refraction={0.012}
      blur={0.02}
      patternSharpness={1}
      noiseScale={0.5}
      chromaticSpread={2}
      fresnel={1}
      distortion={0.85}
      contour={0.25}
    />
  );
}
