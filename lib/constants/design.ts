// ============================================================
// lib/constants/design.ts
// JS mirror of the CSS design token system (app/globals.css :root).
//
// ⚠️  If you update a value here, update globals.css too (and vice versa).
//     These exist because CSS custom properties are not accessible in JS
//     objects (STATUS_CONFIG, chart configs, inline style generators, etc.)
// ============================================================

/** Core background surfaces */
export const BG = {
  page:     "#0d0d0f",
  surface:  "#141417",
  elevated: "#1c1c21",
} as const;

/** Border alphas */
export const BORDER = {
  default: "rgba(255,255,255,0.07)",
  hi:      "rgba(255,255,255,0.13)",
} as const;

/** Text colours */
export const TEXT = {
  primary:   "#f0efe8",
  secondary: "#8a8987",
  muted:     "#555450",
} as const;

/** Accent colours — solid */
export const ACCENT = {
  green: "#4ade80", // Owner / Success / Active / Paid
  amber: "#fbbf24", // Warning / Pending / Expiring
  red:   "#f87171", // Danger / Overdue / Error
  blue:  "#60a5fa", // Trainer / Info
} as const;

/** Accent colours — translucent backgrounds (12% opacity) */
export const ACCENT_DIM = {
  green: "rgba(74,222,128,0.12)",
  amber: "rgba(251,191,36,0.12)",
  red:   "rgba(248,113,113,0.12)",
  blue:  "rgba(96,165,250,0.12)",
} as const;
