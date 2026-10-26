"use client";

import { motion } from "motion/react";
import { Radio, RefreshCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { RequestDrawer } from "@/components/requests/request-drawer";
import { PaymentBadge, StatusBadge, TypeBadge } from "@/components/requests/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveStream } from "@/hooks/use-live-stream";
import { useRequests } from "@/hooks/use-requests";
import { formatRelative, isDeadlineUrgent, phoneDisplay } from "@/lib/format";
import { TAB_LABELS } from "@/lib/status";
import type { Role, TabKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: TabKey[] = ["all", "awaiting", "inspection", "ready", "shipped", "review", "failed"];

export function RequestsWorkspace({ role }: { role: Role }) {
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading, isError, refetch, isFetching } = useRequests(tab, q);
  const { status, highlighted } = useLiveStream();

  const rows = data?.requests ?? [];
  const counts = data?.counts;

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Operations</p>
          <h1 className="font-display mt-1 text-4xl tracking-tight">Requests</h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
              status === "live"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-amber-200 bg-amber-50 text-amber-800",
            )}
          >
            <Radio className={cn("size-3", status === "live" && "animate-pulse")} />
            {status === "live" ? "Live" : "Reconnecting"}
          </span>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className={cn("size-3.5", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search order, phone or email"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {TABS.map((key) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "relative shrink-0 rounded-full px-3.5 py-2 text-sm transition-colors",
                active ? "text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-full bg-ink dark:bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span className="relative z-10 flex items-center gap-2">
                {TAB_LABELS[key]}
                <span className={cn("rounded-full px-1.5 text-[11px]", active ? "bg-white/15" : "bg-background/70")}>
                  {counts?.[key] ?? 0}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-soft)]">
        {isLoading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : null}

        {isError ? (
          <div className="p-10 text-center">
            <p className="font-display text-2xl">Couldn’t load requests</p>
            <Button className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {!isLoading && !isError && rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-display text-3xl">
              {q || tab !== "all" ? "No match for these filters" : "No requests yet"}
            </p>
            <p className="mt-2 text-muted-foreground">
              New WhatsApp returns will land here live.
            </p>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="border-b bg-secondary/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-5 py-3 font-medium">Order</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Payment</th>
                    <th className="px-5 py-3 font-medium">Return tracking</th>
                    <th className="px-5 py-3 font-medium">Deadline</th>
                    <th className="px-5 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const urgent = isDeadlineUrgent(row.return_shipment.deadline);
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelected(row.id)}
                        className={cn(
                          "cursor-pointer border-b last:border-0 transition-colors hover:bg-secondary/60",
                          highlighted.has(row.id) && "row-flash",
                        )}
                      >
                        <td className="px-5 py-4 font-mono font-medium">#{row.order_no}</td>
                        <td className="px-5 py-4">
                          <div>{phoneDisplay(row.customer.phone)}</div>
                          <div className="text-xs text-muted-foreground">{row.customer.email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <TypeBadge type={row.type} />
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-5 py-4">
                          <PaymentBadge status={row.payment.status} />
                        </td>
                        <td className="px-5 py-4 font-mono text-xs">
                          {row.return_shipment.tracking_number || "—"}
                        </td>
                        <td className={cn("px-5 py-4", urgent && "font-semibold text-rose-600")}>
                          {row.return_shipment.deadline || "—"}
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">{formatRelative(row.updated_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 md:hidden">
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelected(row.id)}
                  className={cn(
                    "rounded-2xl border bg-background p-4 text-left",
                    highlighted.has(row.id) && "row-flash",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium">#{row.order_no}</span>
                    <StatusBadge status={row.status} />
                  </div>
                  <p className="mt-2 text-sm">{phoneDisplay(row.customer.phone)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <TypeBadge type={row.type} />
                    <PaymentBadge status={row.payment.status} />
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <RequestDrawer id={selected} role={role} onClose={() => setSelected(null)} />
    </div>
  );
}

export function useTabCounts(counts?: Record<TabKey, number>) {
  return useMemo(() => counts, [counts]);
}
