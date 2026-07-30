// Shared design tokens for the StoreLocalizer promo video.
// Colors, type and crop metadata are pulled from the product screenshots so
// every beat matches the app's real design language.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const COLORS = {
  bg: "#070812",
  bgDeep: "#04050c",
  panel: "#0f1117",
  panelBorder: "rgba(255,255,255,0.08)",
  text: "#f8fafc",
  textDim: "rgba(226,232,240,0.62)",
  // Brand wordmark gradient (pink -> violet -> blue)
  grad: "linear-gradient(90deg, #ff8fc7 0%, #b58cff 48%, #6ea8ff 100%)",
  gradFrom: "#ff8fc7",
  gradMid: "#b58cff",
  gradTo: "#6ea8ff",
  violet: "#7c5cff",
  indigo: "#6366f1",
  green: "#22c55e",
  amber: "#e0982a",
  blue: "#3b82f6",
};

export const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Helvetica Neue", Arial, sans-serif';
export const MONO =
  'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace';

// Fixed top "caption band" — every caption is anchored here, identically.
export const CAPTION_BAND = 240;
export const CAPTION_TOP = 96;

// Natural pixel dimensions of each source still (measured with sips).
export const SHOTS = {
  editor: { src: "shots/editor.png", w: 3200, h: 2000 },
  keywords: { src: "shots/keywords.png", w: 1544, h: 1566 },
  keywordReview: { src: "shots/keyword-review.png", w: 1424, h: 1120 },
  studio: { src: "shots/studio.png", w: 3200, h: 2000 },
  asc: { src: "shots/asc.png", w: 3200, h: 2000 },
  editTranslation: { src: "shots/edit-translation.png", w: 1244, h: 1078 },
} as const;

export type Shot = (typeof SHOTS)[keyof typeof SHOTS];
