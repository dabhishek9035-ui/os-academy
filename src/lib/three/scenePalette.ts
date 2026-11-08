/**
 * Scene colours per theme. Mirrors the CSS tokens in app/globals.css
 * (Notion paper / Notion dark) so WebGL and DOM never drift apart.
 * The DOM is the source of truth; keep these in sync when tokens change.
 */
export type SceneTheme = "light" | "dark";

export interface ScenePalette {
  /** Page canvas (--bg) and one step up (--bg-soft). */
  bg: string;
  bgSoft: string;
  /** Primary ink (--ink) used for hairlines and the CPU core. */
  ink: string;
  /** Grid hairlines, minor / major. */
  gridMinor: string;
  gridMajor: string;
  accent: string;
  /** Eight process colours, same order as PROCESS_COLORS in types. */
  process: readonly string[];
  /** Contour-field hairline alpha for the page backdrop. */
  contourAlpha: number;
}

export const PALETTES: Record<SceneTheme, ScenePalette> = {
  light: {
    bg: "#fbfaf8",
    bgSoft: "#f4f3ef",
    ink: "#37352f",
    gridMinor: "#e6e4de",
    gridMajor: "#cfccc4",
    accent: "#1a6fc4",
    process: [
      "#2383e2", "#448361", "#cb912f", "#d44c47",
      "#9065b0", "#288aa0", "#c14c8a", "#789628",
    ],
    contourAlpha: 0.085,
  },
  dark: {
    bg: "#191919",
    bgSoft: "#202020",
    ink: "#ebebea",
    gridMinor: "#2c2c2c",
    gridMajor: "#444444",
    accent: "#60a6d4",
    process: [
      "#529cca", "#4dab9a", "#ffa344", "#ff7369",
      "#9a6dd7", "#4ebed2", "#e255a1", "#a0be46",
    ],
    contourAlpha: 0.07,
  },
};
