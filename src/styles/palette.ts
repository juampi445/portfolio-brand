// Mirror of _variables.scss, for components that take colours as JS values
// (WebGL uniforms, canvas, etc.) and so can't read the SCSS ones.
// Keep in sync with src/styles/_variables.scss.

export const palette = {
  primary: "#47D7B5",
  primaryLight: "#D6F5EE",
  dark: "#111111",
  light: "#ECECEC",
  accent: "#286456",
} as const;
