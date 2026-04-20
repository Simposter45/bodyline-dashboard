// ============================================================
// lib/constants/status.ts
// Unified status pill configuration for the entire app.
//
// Every page that renders a coloured status pill (Members, Payments,
// Trainers, Member Portal) imports from here — one source, no drift.
//
// Add new statuses here as pages are audited:
//   ✅ Members:  active | expiring | overdue | pending | inactive
//   🔜 Payments: paid   (= active styling, different label)
//   🔜 Trainers: active | inactive  (subset, already covered)
// ============================================================

import { ACCENT, TEXT, BG, BORDER } from "./design";

export type StatusKey =
  | "active"
  | "expiring"
  | "overdue"
  | "pending"
  | "inactive"
  | "paid"
  | "all";

export interface StatusConfig {
  label:  string;
  color:  string; /** Text + icon colour */
  bg:     string; /** Pill background    */
  border: string; /** Pill border        */
}

/**
 * Single source of truth for all status pill styles across the app.
 * Colours are derived from lib/constants/design.ts — never hardcoded.
 */
export const STATUS_CONFIG: Record<StatusKey, StatusConfig> = {
  active: {
    label:  "Active",
    color:  ACCENT.green,
    bg:     "rgba(74,222,128,0.1)",
    border: "rgba(74,222,128,0.2)",
  },
  paid: {
    label:  "Paid",
    color:  ACCENT.green,
    bg:     "rgba(74,222,128,0.1)",
    border: "rgba(74,222,128,0.2)",
  },
  expiring: {
    label:  "Expiring soon",
    color:  ACCENT.amber,
    bg:     "rgba(251,191,36,0.1)",
    border: "rgba(251,191,36,0.2)",
  },
  pending: {
    label:  "Pending",
    color:  ACCENT.amber,
    bg:     "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.15)",
  },
  overdue: {
    label:  "Overdue",
    color:  ACCENT.red,
    bg:     "rgba(248,113,113,0.1)",
    border: "rgba(248,113,113,0.2)",
  },
  inactive: {
    label:  "Inactive",
    color:  TEXT.muted,
    bg:     "rgba(255,255,255,0.04)",
    border: BORDER.default,
  },
  all: {
    label:  "All",
    color:  TEXT.secondary,
    bg:     "transparent",
    border: "transparent",
  },
} as const;
