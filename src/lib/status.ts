import type { ExchangeStatus, Role, TabKey } from "./types";

export const STATUS_LABELS: Record<ExchangeStatus, string> = {
  choice_pending: "Awaiting return",
  in_transit: "In transit",
  inspection_pending: "Inspection pending",
  inspection_done: "Ready to ship",
  inspection_failed: "Inspection failed",
  manual_review: "Needs review",
  replacement_shipped: "Shipped",
  completed: "Completed",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const TAB_LABELS: Record<TabKey, string> = {
  all: "All",
  awaiting: "Awaiting return",
  inspection: "Inspection pending",
  ready: "Ready to ship",
  shipped: "Shipped",
  review: "Needs review",
  failed: "Failed",
};

export const STATUS_TONE: Record<
  ExchangeStatus,
  "slate" | "blue" | "amber" | "teal" | "rose" | "violet" | "indigo" | "emerald" | "zinc"
> = {
  choice_pending: "slate",
  in_transit: "blue",
  inspection_pending: "amber",
  inspection_done: "teal",
  inspection_failed: "rose",
  manual_review: "violet",
  replacement_shipped: "indigo",
  completed: "emerald",
  expired: "zinc",
  cancelled: "zinc",
};

export function canInspect(role: Role) {
  return role === "admin" || role === "warehouse";
}

export function canShip(role: Role) {
  return role === "admin" || role === "warehouse";
}

export function canAdminAct(role: Role) {
  return role === "admin";
}

export function canManageTeam(role: Role) {
  return role === "admin";
}

export const FORWARD_TRANSITIONS: Record<ExchangeStatus, ExchangeStatus[]> = {
  choice_pending: ["in_transit", "manual_review", "expired", "cancelled"],
  in_transit: ["inspection_pending", "manual_review", "expired", "cancelled"],
  inspection_pending: ["inspection_done", "inspection_failed", "manual_review"],
  inspection_done: ["replacement_shipped", "manual_review"],
  inspection_failed: ["manual_review"],
  manual_review: ["inspection_pending", "inspection_done", "inspection_failed", "cancelled"],
  replacement_shipped: ["completed"],
  completed: [],
  expired: [],
  cancelled: [],
};
