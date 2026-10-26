import { formatDistanceToNowStrict } from "date-fns";

export const DEFAULT_TZ = "Asia/Karachi";

export function formatPKR(amount: number | string | null | undefined) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (n == null || Number.isNaN(n)) return "PKR —";
  const formatted = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `PKR ${formatted}`;
}

export function formatDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
  timeZone = DEFAULT_TZ,
) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    try {
      return new Intl.DateTimeFormat("en-PK", {
        timeZone,
        dateStyle: "medium",
      }).format(new Date(`${value}T00:00:00`));
    } catch {
      return value;
    }
  }
  return new Intl.DateTimeFormat("en-GB", { timeZone, ...options }).format(date);
}

export function formatRelative(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

export function hoursUntil(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T23:59:59`);
  if (Number.isNaN(date.getTime())) return null;
  return (date.getTime() - Date.now()) / 36e5;
}

export function isDeadlineUrgent(value: string | null | undefined) {
  const hours = hoursUntil(value);
  if (hours == null) return false;
  return hours < 24;
}

export function phoneDisplay(phone: string) {
  if (!phone) return "—";
  if (phone.startsWith("92") && phone.length >= 12) {
    return `+${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5)}`;
  }
  return phone;
}

export function itemName(item: {
  product_name?: string;
  replacement_product?: string;
  variant_name?: string;
  replacement_variant?: string;
}) {
  const name = item.product_name || item.replacement_product || "Item";
  const variant = item.variant_name || item.replacement_variant;
  return variant ? `${name} · ${variant}` : name;
}

export function itemPrice(item: {
  price?: string | number;
  unit_price?: string | number;
}) {
  const raw = item.unit_price ?? item.price;
  if (raw == null || raw === "") return null;
  return typeof raw === "number" ? raw : Number(raw);
}
