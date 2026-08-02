// The one line between the desktop layouts and the touch ones.
//
// Keep in step with `$compact-max` in `_variables.scss` — the pair exists
// because a media query has to be readable from both sides: the stylesheets
// lay the compact version out, and a few components have to *not mount* the
// desktop machinery at all (a pinned scroll stack, a circle-reveal stage), which
// only JS can decide.
//
// 75rem, not the 64rem the layouts break at: a tablet in landscape is
// ~1024–1180px wide, which clears that line while still being a touch screen
// with no wheel, no hover and a battery. Anything driven by scroll-pinning or
// pointer proximity belongs on the touch side there.
export const COMPACT_QUERY = "(max-width: 75rem)";
