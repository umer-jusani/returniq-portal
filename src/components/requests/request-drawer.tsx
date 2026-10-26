"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, Loader2, Package, Truck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PaymentBadge, StatusBadge, TypeBadge } from "@/components/requests/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatPKR, formatRelative, itemName, itemPrice, phoneDisplay } from "@/lib/format";
import { inspectionSchema, shipSchema, type InspectionValues, type ShipValues } from "@/lib/schemas";
import { canAdminAct, canInspect, canShip } from "@/lib/status";
import { COURIERS, type AuditEntry, type PortalRequest, type Role } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminAction, useInspect, useRequest, useShip } from "@/hooks/use-requests";

const TIMELINE: Array<{ status: PortalRequest["status"]; label: string }> = [
  { status: "choice_pending", label: "Request opened" },
  { status: "in_transit", label: "Return in transit" },
  { status: "inspection_pending", label: "Arrived at warehouse" },
  { status: "inspection_done", label: "Inspection passed" },
  { status: "inspection_failed", label: "Inspection failed" },
  { status: "manual_review", label: "Needs review" },
  { status: "replacement_shipped", label: "Replacement shipped" },
  { status: "completed", label: "Completed" },
];

function timelineIndex(status: PortalRequest["status"]) {
  const order = [
    "choice_pending",
    "in_transit",
    "inspection_pending",
    "inspection_done",
    "replacement_shipped",
    "completed",
  ];
  if (status === "inspection_failed" || status === "manual_review") return 3;
  return Math.max(order.indexOf(status), 0);
}

export function RequestDrawer({
  id,
  role,
  onClose,
}: {
  id: string | null;
  role: Role;
  onClose: () => void;
}) {
  const query = useRequest(id);
  const request = query.data?.request;
  const audit = (query.data?.audit ?? []) as AuditEntry[];

  return (
    <Sheet open={Boolean(id)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Order</p>
          <SheetTitle>{request ? `#${request.order_no}` : "Loading"}</SheetTitle>
          {request ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={request.status} />
              <TypeBadge type={request.type} />
              <PaymentBadge status={request.payment.status} />
            </div>
          ) : null}
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="space-y-6 p-6">
            {query.isLoading ? <p className="text-sm text-muted-foreground">Loading request…</p> : null}
            {request ? (
              <DrawerBody request={request} audit={audit} role={role} />
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({
  request,
  audit,
  role,
}: {
  request: PortalRequest;
  audit: AuditEntry[];
  role: Role;
}) {
  const refund =
    request.original_order_value != null &&
    request.replacement_total != null &&
    request.replacement_total < request.original_order_value
      ? request.original_order_value - request.replacement_total
      : 0;

  return (
    <>
      <section className="rounded-3xl border bg-card p-4">
        <p className="text-xs text-muted-foreground uppercase">Customer</p>
        <p className="mt-1 font-medium">{phoneDisplay(request.customer.phone)}</p>
        <p className="text-sm text-muted-foreground">{request.customer.email || "No email"}</p>
        <p className="mt-2 text-xs text-muted-foreground">Updated {formatRelative(request.updated_at)}</p>
      </section>

      <Timeline request={request} />

      <section>
        <h3 className="mb-3 font-display text-lg">Items</h3>
        {request.items_unavailable ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Items unavailable
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <ItemCard title="Original" items={request.original_items} />
            <ItemCard title="Replacement" items={request.replacement_items} replacement />
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase">Payment</p>
          <p className="mt-2 font-display text-2xl">{formatPKR(request.payment.amount_paid || request.payment.amount_due)}</p>
          <p className="text-sm text-muted-foreground">
            Due {formatPKR(request.payment.amount_due)} · {request.payment.status}
          </p>
          {refund > 0 ? (
            <p className="mt-2 text-sm text-teal-700">Customer is owed {formatPKR(refund)}</p>
          ) : null}
        </div>
        <div className="rounded-3xl border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase">Return shipment</p>
          <p className="mt-2 font-medium">{request.return_shipment.carrier || "No courier yet"}</p>
          <p className="font-mono text-sm">{request.return_shipment.tracking_number || "—"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Deadline {formatDate(request.return_shipment.deadline, { dateStyle: "medium" })}
          </p>
        </div>
      </section>

      {request.replacement_shipment.tracking_number ? (
        <div className="rounded-3xl border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase">Replacement</p>
          <p className="mt-2 font-medium">
            {request.replacement_shipment.courier} · {request.replacement_shipment.tracking_number}
          </p>
          <p className="text-sm text-muted-foreground">
            Shipped {formatDate(request.replacement_shipment.shipped_at)}
          </p>
          {request.customer_notified === false ? (
            <RetryNotify requestId={request.id} />
          ) : null}
        </div>
      ) : null}

      {request.status === "inspection_pending" && canInspect(role) ? (
        <InspectionPanel request={request} />
      ) : null}
      {request.status === "inspection_done" && canShip(role) ? (
        <ShipPanel request={request} />
      ) : null}
      {(request.status === "inspection_failed" || request.status === "manual_review") &&
      canAdminAct(role) ? (
        <AdminPanel request={request} />
      ) : null}

      <section>
        <h3 className="mb-3 font-display text-lg">Activity</h3>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">No portal actions yet.</p>
        ) : (
          <ul className="space-y-3">
            {audit.map((entry) => (
              <li key={entry.id} className="rounded-2xl border bg-card px-4 py-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="font-medium capitalize">{entry.action}</span>
                  <span className="text-muted-foreground">{formatRelative(entry.createdAt)}</span>
                </div>
                <p className="text-muted-foreground">
                  {entry.actor?.name ?? "System"} · {entry.result}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function ItemCard({
  title,
  items,
  replacement,
}: {
  title: string;
  items: PortalRequest["original_items"] | PortalRequest["replacement_items"];
  replacement?: boolean;
}) {
  return (
    <div className="rounded-3xl border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase">{title}</p>
      <ul className="mt-3 space-y-3">
        {items.length === 0 ? <li className="text-sm text-muted-foreground">None</li> : null}
        {items.map((item, index) => {
          const price = itemPrice(item);
          return (
            <li key={index}>
              <p className="text-sm font-medium">{itemName(item)}</p>
              <p className="text-xs text-muted-foreground">
                Qty {item.quantity ?? 1}
                {price != null ? ` · ${formatPKR(price)}` : ""}
              </p>
            </li>
          );
        })}
      </ul>
      {replacement ? <Package className="mt-3 size-4 text-primary" /> : null}
    </div>
  );
}

function Timeline({ request }: { request: PortalRequest }) {
  const current = timelineIndex(request.status);
  return (
    <ol className="space-y-3">
      {TIMELINE.filter((step) => {
        if (step.status === "inspection_failed") return request.status === "inspection_failed";
        if (step.status === "manual_review") return request.status === "manual_review";
        if (step.status === "inspection_done" && request.status === "inspection_failed") return false;
        return true;
      }).map((step, index) => {
        const done = index <= current || request.status === step.status;
        return (
          <li key={step.status} className="flex gap-3">
            <span
              className={`mt-0.5 grid size-5 place-items-center rounded-full ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {done ? <Check className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
            </span>
            <div>
              <p className="text-sm font-medium">{step.label}</p>
              {request.status === step.status ? (
                <p className="text-xs text-muted-foreground">{formatRelative(request.updated_at)}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function InspectionPanel({ request }: { request: PortalRequest }) {
  const inspect = useInspect();
  const [confirm, setConfirm] = useState<"pass" | "fail" | null>(null);
  const form = useForm<InspectionValues>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: { result: "pass", note: "" },
  });

  async function submit(result: "pass" | "fail") {
    const values = form.getValues();
    const parsed = inspectionSchema.safeParse({ ...values, result });
    if (!parsed.success) {
      form.setError("note", { message: parsed.error.issues[0]?.message });
      return;
    }
    try {
      const response = await inspect.mutateAsync({ id: request.id, ...parsed.data });
      toast.success(
        response.customer_notified === false
          ? "Saved, but WhatsApp notify failed"
          : "Customer notified on WhatsApp",
      );
      setConfirm(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Inspection failed");
    }
  }

  return (
    <section className="rounded-3xl border border-primary/20 bg-primary/5 p-4">
      <h3 className="font-display text-lg">Inspection result</h3>
      <p className="mt-1 text-sm text-muted-foreground">Record pass or fail. Fail requires a note.</p>
      <div className="mt-4 space-y-3">
        <Textarea placeholder="Warehouse note" {...form.register("note")} />
        {form.formState.errors.note ? (
          <p className="text-xs text-rose-600">{form.formState.errors.note.message}</p>
        ) : null}
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => {
              form.setValue("result", "pass");
              setConfirm("pass");
            }}
          >
            Pass
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              form.setValue("result", "fail");
              const parsed = inspectionSchema.safeParse({ result: "fail", note: form.getValues("note") });
              if (!parsed.success) {
                form.setError("note", { message: parsed.error.issues[0]?.message });
                return;
              }
              setConfirm("fail");
            }}
          >
            Fail
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm === "fail" ? "Fail this inspection?" : "Pass this inspection?"}
        description={
          confirm === "fail"
            ? "The customer will be told the reason and that the team will contact them."
            : "The customer will be told inspection passed and a replacement will ship."
        }
        pending={inspect.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && submit(confirm)}
      />
    </section>
  );
}

function ShipPanel({ request }: { request: PortalRequest }) {
  const ship = useShip();
  const [open, setOpen] = useState(false);
  const form = useForm<ShipValues>({
    resolver: zodResolver(shipSchema),
    defaultValues: { courier: "TCS", tracking_number: "", note: "", courierOther: "" },
  });
  const courier = form.watch("courier");

  async function submit(values: ShipValues) {
    try {
      const response = await ship.mutateAsync({ id: request.id, ...values });
      toast.success(
        response.customer_notified === false
          ? "Shipped, but WhatsApp notify failed"
          : "Customer notified on WhatsApp",
      );
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ship failed");
    }
  }

  return (
    <section className="rounded-3xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Truck className="size-4 text-primary" />
        <h3 className="font-display text-lg">Ship replacement</h3>
      </div>
      <form className="space-y-3" onSubmit={form.handleSubmit(() => setOpen(true))}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Courier</Label>
            <Select
              value={courier}
              onValueChange={(value) => form.setValue("courier", value as ShipValues["courier"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COURIERS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {courier === "Other" ? (
            <div className="space-y-1">
              <Label>Courier name</Label>
              <Input {...form.register("courierOther")} />
            </div>
          ) : null}
          <div className="space-y-1 sm:col-span-2">
            <Label>Tracking number</Label>
            <Input {...form.register("tracking_number")} placeholder="6–30 letters or digits" />
            {form.formState.errors.tracking_number ? (
              <p className="text-xs text-rose-600">{form.formState.errors.tracking_number.message}</p>
            ) : null}
          </div>
        </div>
        <Textarea placeholder="Optional note for the customer" {...form.register("note")} />
        <Button type="submit">Ship replacement</Button>
      </form>
      <ConfirmDialog
        open={open}
        title="Ship this replacement?"
        description="The customer will receive courier and tracking on WhatsApp."
        pending={ship.isPending}
        onCancel={() => setOpen(false)}
        onConfirm={form.handleSubmit(submit)}
      />
    </section>
  );
}

function RetryNotify({ requestId }: { requestId: string }) {
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();
  return (
    <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
      <span className="inline-flex items-center gap-2">
        <AlertTriangle className="size-4" />
        WhatsApp notify failed
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const res = await fetch(`/api/requests/${requestId}/notify`, { method: "POST" });
          const json = await res.json();
          setPending(false);
          if (json.ok) {
            toast.success("Customer notified on WhatsApp");
            queryClient.invalidateQueries({ queryKey: ["request", requestId] });
            queryClient.invalidateQueries({ queryKey: ["requests"] });
          } else toast.error(json.error || "Retry failed");
        }}
      >
        Retry notify
      </Button>
    </div>
  );
}

function AdminPanel({ request }: { request: PortalRequest }) {
  const action = useAdminAction();
  return (
    <section className="rounded-3xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
      <h3 className="font-display text-lg">Admin actions</h3>
      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          disabled={action.isPending}
          onClick={async () => {
            await action.mutateAsync({ id: request.id, action: "reinspect" });
            toast.success("Moved back to inspection");
          }}
        >
          Re-inspect
        </Button>
        <Button
          variant="secondary"
          disabled={action.isPending}
          onClick={async () => {
            await action.mutateAsync({ id: request.id, action: "resolve" });
            toast.success("Marked resolved");
          }}
        >
          Mark resolved
        </Button>
      </div>
    </section>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MotionPresence({ children }: { children: React.ReactNode }) {
  return <AnimatePresence>{children}</AnimatePresence>;
}

export function FadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {children}
    </motion.div>
  );
}
