"use client";

import { useReducedMotion } from "motion/react";
import MetallicPaint from "@/components/MetallicPaint/MetallicPaint";
import { palette } from "@/styles/palette";

// Google Material Symbols (Outlined, weight 300), on Material's own 0 -960 960
// 960 grid, so the official path data drops straight in.
//
//   landing      → ads_click          (a click resolving on a single target)
//   events       → celebration        (the occasion)
//   professional → workspace_premium  (an established, credentialed presence)
//
// Rather than paint them flat, each glyph is fed to MetallicPaint as a liquid-
// metal surface. That effect reads the shape from a raster, not from the DOM, so
// we hand it the path baked into an SVG data URI: a BLACK fill (the metal shows
// through the dark shape) with generous PADDING around the grid (viewBox grown
// by 200 units a side) so the wavy edges never clip.

type ServiceId = "landing" | "events" | "professional";

const PATHS: Record<ServiceId, string> = {
  landing:
    "M462.23-260.77q-85.61-7.31-143.92-69.77Q260-393 260-480q0-92.05 63.98-156.02Q387.95-700 480-700q87 0 149.46 58.12 62.46 58.11 69.77 144.34l-48.38-15q-11.36-61.31-58.71-101.69-47.36-40.38-112.14-40.38-72.69 0-123.65 50.96-50.96 50.96-50.96 123.65 0 64.31 40.57 112.08 40.58 47.77 101.5 59.15l14.77 48Zm48 159.15q-7.56 1-15.11 1.31-7.56.31-15.12.31-78.85 0-148.2-29.92t-120.65-81.21q-51.3-51.29-81.22-120.63Q100-401.1 100-479.93q0-78.84 29.92-148.21t81.21-120.68q51.29-51.31 120.63-81.25Q401.1-860 479.93-860q78.84 0 148.21 29.93 69.37 29.92 120.68 81.22t81.25 120.65Q860-558.85 860-480q0 7.46-.31 14.92t-1.31 14.93l-43.77-13.39V-480q0-139.69-97.46-237.15-97.46-97.46-237.15-97.46t-237.15 97.46Q145.39-619.69 145.39-480t97.46 237.15q97.46 97.46 237.15 97.46h16.46l13.77 43.77Zm295.38 7.39L624.23-276l-43.46 131.38L480-480l335.38 100.77L684-335.77l181.77 181.38-60.16 60.16Z",
  events:
    "m111.93-113.08 165.22-461.53 298.54 295.69-463.76 165.84Zm76.38-76.38L493.46-298 296.23-496.23 188.31-189.46Zm352.92-252.85-27.85-27.84 231.16-231.16q30.07-29.69 75.61-30.19t75.62 29.58l14.3 14.31L883-659.77l-15.54-15.92q-19.77-19.77-46.31-20.08-26.54-.31-46.92 20.08l-233 233.38ZM395.69-585l-27.84-27.46 28.46-28.46q24.54-24.54 23.42-56.73-1.11-32.19-23.42-54.5L369.46-779l27.85-27.46 25.23 25.23q34.61 34.23 34.11 85t-34.73 85L395.69-585Zm73.69 70.85-27.46-27.46L587-687.08q19.77-19.38 19.46-49.26-.31-29.89-20.08-49.66l-57.15-57.15 27.46-27.46 58.77 58.38q29.46 30.46 30.27 75.89.81 45.42-29.65 75.5l-146.7 146.69Zm144.93 145.53-27.85-27.46 35.46-35.46q34.62-34.61 83.23-35.42 48.62-.81 83.23 33.81l38.31 38.3L799.23-367l-39.31-39.31q-24.54-24.54-53.96-24.54t-54.35 24.54l-37.3 37.69Zm-426 179.16Z",
  professional:
    "m390.39-420.46 34.07-109.23-89.23-67.08h109.46L480-710l34.31 113.23h110.46l-88.85 67.08L569-420.46 480-488l-89.61 67.54ZM262.85-70.77v-282.85q-43.08-43.15-62.96-96.84Q180-504.15 180-560q0-126.77 86.62-213.38Q353.23-860 480-860t213.38 86.62Q780-686.77 780-560q0 55.85-19.89 109.54-19.88 53.69-62.96 96.84v282.85L480-140.16 262.85-70.77Zm397.8-308.58q73.96-73.96 73.96-180.65 0-106.69-73.96-180.65-73.96-73.96-180.65-73.96-106.69 0-180.65 73.96-73.96 73.96-73.96 180.65 0 106.69 73.96 180.65 73.96 73.96 180.65 73.96 106.69 0 180.65-73.96ZM308.23-133.23 480-186.31l171.77 53.08v-182.93q-38.08 29-82.73 42.58Q524.38-260 480-260q-44.38 0-89.04-13.58-44.65-13.58-82.73-42.58v182.93ZM480-225Z",
};

// The path on a padded, black-fill canvas, as a data URI MetallicPaint can load.
// 500px so it clears the effect's MIN_SIZE without oversizing the CPU pass.
function iconSrc(id: ServiceId): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" ` +
    `viewBox="-200 -1160 1360 1360">` +
    `<path fill="#000000" d="${PATHS[id]}"/></svg>`;
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
