import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_TONE } from "@/lib/status";
import type { ExchangeStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: ExchangeStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]}>
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: string }) {
  const paid = status.toLowerCase() === "paid";
  return (
    <Badge tone={paid ? "emerald" : "amber"}>
      {paid ? "Paid" : status || "Unpaid"}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: "return" | "exchange" }) {
  return <Badge tone={type === "exchange" ? "indigo" : "slate"}>{type}</Badge>;
}
