import type {
  ExchangeStatus,
  OriginalItem,
  PortalRequest,
  ReplacementItem,
} from "./types";
import { EXCHANGE_STATUSES } from "./types";

const SECRET_KEY = /(?:^|_)(token|secret|key|password|pat|access_token)$/i;

export function isSecretField(name: string) {
  return SECRET_KEY.test(name) || name === "shopify_access_token";
}

export function parseJsonField(raw: unknown): { value: unknown; unavailable: boolean } {
  if (raw == null || raw === "") {
    return { value: null, unavailable: false };
  }

  let current: unknown = raw;
  for (let i = 0; i < 3; i++) {
    if (typeof current !== "string") break;
    const trimmed = current.trim();
    if (!trimmed) return { value: null, unavailable: false };
    try {
      current = JSON.parse(trimmed);
    } catch {
      return { value: null, unavailable: true };
    }
  }

  if (typeof current === "string") {
    return { value: null, unavailable: true };
  }

  return { value: current, unavailable: false };
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") return [value as T];
  return [];
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function asString(value: unknown, fallback = "") {
  if (value == null) return fallback;
  return String(value);
}

function asStatus(value: unknown): ExchangeStatus {
  const s = asString(value);
  return (EXCHANGE_STATUSES as readonly string[]).includes(s)
    ? (s as ExchangeStatus)
    : "choice_pending";
}

function asType(value: unknown): "return" | "exchange" {
  const s = asString(value).toLowerCase();
  if (s.includes("return") && !s.includes("exchange")) return "return";
  return "exchange";
}

type AirtableRecord = {
  id: string;
  createdTime?: string;
  fields?: Record<string, unknown>;
};

export function mapAirtableRecord(record: AirtableRecord): PortalRequest {
  const fields = { ...(record.fields ?? {}) };

  for (const key of Object.keys(fields)) {
    if (isSecretField(key)) delete fields[key];
  }

  const original = parseJsonField(fields.original_items);
  const replacement = parseJsonField(fields.replacement_items);
  const selected = parseJsonField(fields.selected_items);
  const itemsUnavailable =
    original.unavailable || replacement.unavailable || selected.unavailable;

  return {
    id: record.id,
    order_no: asString(fields.order_no, "—"),
    customer: {
      phone: asString(fields.session_id),
      email: asString(fields.customer_email),
    },
    type: asType(fields.return_reason),
    status: asStatus(fields.exchange_status),
    inspection_status: fields.inspection_status
      ? asString(fields.inspection_status)
      : null,
    payment: {
      status: asString(fields.payment_status, "unpaid"),
      amount_due: asNumber(fields.amount_due),
      amount_paid: asNumber(fields.amount_paid),
      currency: asString(fields.currency, "PKR"),
      url: fields.payment_url ? asString(fields.payment_url) : null,
      reference: fields.payment_reference
        ? asString(fields.payment_reference)
        : null,
    },
    original_items: asArray<OriginalItem>(original.value),
    replacement_items: asArray<ReplacementItem>(replacement.value),
    selected_items: Array.isArray(selected.value) ? selected.value : null,
    items_unavailable: itemsUnavailable,
    return_shipment: {
      carrier: fields.carrier ? asString(fields.carrier) : null,
      carrier_code: fields.carrier_code ? asString(fields.carrier_code) : null,
      tracking_number: fields.tracking_number
        ? asString(fields.tracking_number)
        : null,
      tracking_status: fields.tracking_status
        ? asString(fields.tracking_status)
        : null,
      tracking_status_detail: fields.tracking_status_detail
        ? asString(fields.tracking_status_detail)
        : null,
      deadline: fields.return_shipment_deadline
        ? asString(fields.return_shipment_deadline)
        : null,
      delivered_at: fields.return_delivered_at
        ? asString(fields.return_delivered_at)
        : null,
    },
    replacement_shipment: {
      courier: fields.replacement_courier
        ? asString(fields.replacement_courier)
        : null,
      tracking_number: fields.replacement_tracking_number
        ? asString(fields.replacement_tracking_number)
        : null,
      shipped_at: fields.replacement_shipped_at
        ? asString(fields.replacement_shipped_at)
        : null,
    },
    inspection_note: fields.inspection_note
      ? asString(fields.inspection_note)
      : null,
    inspection_completed_at: fields.inspection_completed_at
      ? asString(fields.inspection_completed_at)
      : null,
    inspection_by: fields.inspection_by ? asString(fields.inspection_by) : null,
    shipped_by: fields.shipped_by ? asString(fields.shipped_by) : null,
    original_order_value:
      fields.original_order_value == null
        ? null
        : asNumber(fields.original_order_value),
    replacement_total:
      fields.replacement_total == null ? null : asNumber(fields.replacement_total),
    created_at: record.createdTime || asString(fields.created_at) || new Date().toISOString(),
    updated_at: asString(fields.updated_at) || record.createdTime || new Date().toISOString(),
  };
}

export function matchesQuery(request: PortalRequest, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    request.order_no,
    request.customer.phone,
    request.customer.email,
    request.return_shipment.tracking_number,
    request.replacement_shipment.tracking_number,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}
