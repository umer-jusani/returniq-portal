export const ROLES = ["admin", "warehouse", "support"] as const;
export type Role = (typeof ROLES)[number];

export const EXCHANGE_STATUSES = [
  "choice_pending",
  "in_transit",
  "inspection_pending",
  "inspection_done",
  "inspection_failed",
  "manual_review",
  "replacement_shipped",
  "completed",
  "expired",
  "cancelled",
] as const;

export type ExchangeStatus = (typeof EXCHANGE_STATUSES)[number];

export type InspectionStatus =
  | "pending"
  | "passed"
  | "failed"
  | "manual_review"
  | string;

export type OriginalItem = {
  product_name?: string;
  variant_name?: string;
  quantity?: number;
  price?: string | number;
  [key: string]: unknown;
};

export type ReplacementItem = {
  replacement_product?: string;
  replacement_variant?: string;
  product_name?: string;
  variant_name?: string;
  quantity?: number;
  unit_price?: number | string;
  price?: number | string;
  [key: string]: unknown;
};

export type PortalRequest = {
  id: string;
  order_no: string;
  customer: {
    phone: string;
    email: string;
  };
  type: "return" | "exchange";
  status: ExchangeStatus;
  inspection_status: InspectionStatus | null;
  payment: {
    status: string;
    amount_due: number;
    amount_paid: number;
    currency: string;
    url?: string | null;
    reference?: string | null;
  };
  original_items: OriginalItem[];
  replacement_items: ReplacementItem[];
  selected_items: unknown[] | null;
  items_unavailable: boolean;
  return_shipment: {
    carrier: string | null;
    carrier_code: string | null;
    tracking_number: string | null;
    tracking_status: string | null;
    tracking_status_detail: string | null;
    deadline: string | null;
    delivered_at: string | null;
  };
  replacement_shipment: {
    courier: string | null;
    tracking_number: string | null;
    shipped_at: string | null;
    note?: string | null;
  };
  inspection_note: string | null;
  inspection_completed_at: string | null;
  inspection_by: string | null;
  shipped_by: string | null;
  original_order_value: number | null;
  replacement_total: number | null;
  created_at: string;
  updated_at: string;
  customer_notified?: boolean | null;
};

export type StreamEvent =
  | { type: "upsert"; request: PortalRequest }
  | { type: "delete"; id: string }
  | { type: "ping" };

export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
};

export type AuditEntry = {
  id: string;
  requestId: string;
  action: string;
  result: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  actor: { name: string; email: string; role: string } | null;
};

export type TabKey =
  | "all"
  | "awaiting"
  | "inspection"
  | "ready"
  | "shipped"
  | "review"
  | "failed";

export const TAB_STATUSES: Record<TabKey, ExchangeStatus[] | null> = {
  all: null,
  awaiting: ["choice_pending", "in_transit"],
  inspection: ["inspection_pending"],
  ready: ["inspection_done"],
  shipped: ["replacement_shipped", "completed"],
  review: ["manual_review"],
  failed: ["inspection_failed"],
};

export const COURIERS = ["TCS", "Leopards", "M&P", "Trax", "PostEx", "Other"] as const;
