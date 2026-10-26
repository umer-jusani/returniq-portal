"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleDashed, Loader2, WifiOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inviteSchema, type InviteValues } from "@/lib/schemas";
import type { Role } from "@/lib/types";

const MESSAGES = [
  {
    name: "payment_received",
    title: "Payment received",
    body: "Payment receive ho gayi. Warehouse address, last date, courier list — courier aur tracking bhejein.",
  },
  {
    name: "return_parcel_received",
    title: "Parcel delivered",
    body: "Aapka return parcel humein mil gaya hai, inspection karegi, replacement baad mein.",
  },
  {
    name: "inspection_passed",
    title: "Inspection passed",
    body: "Inspection pass ho gayi, replacement dispatch kar diya jayega, tracking yahin share karenge.",
  },
  {
    name: "inspection_failed",
    title: "Inspection failed",
    body: "Inspection pass nahi hui, reason, team rabta karegi.",
  },
  {
    name: "replacement_shipped",
    title: "Replacement shipped",
    body: "Replacement ship ho gaya, order number, courier, tracking number, optional note.",
  },
];

export function SettingsWorkspace({ role }: { role: Role }) {
  const query = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      return json;
    },
  });

  if (query.isLoading) {
    return <div className="p-8 text-muted-foreground">Loading settings…</div>;
  }
  if (query.isError) {
    return <div className="p-8">Couldn’t load settings.</div>;
  }

  const { tenant, connections, team } = query.data;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 lg:px-8">
      <div>
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Workspace</p>
        <h1 className="font-display mt-1 text-4xl">{tenant.name}</h1>
        <p className="mt-2 text-muted-foreground">
          Timezone {tenant.timezone}. {tenant.demo ? "Running on demo data until credentials are added." : "Connected to Airtable."}
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <HealthCard
          title="Airtable"
          status={connections.airtable.status}
          detail={connections.airtable.baseId || "AIRTABLE_BASE_ID pending"}
        />
        <HealthCard
          title="Webhook"
          status={connections.airtable.webhook === "configured" ? "connected" : "waiting"}
          detail="Live pings from Exchange Sessions"
        />
        <HealthCard
          title="n8n"
          status={connections.n8n.ship === "configured" ? "connected" : "waiting"}
          detail="Inspection + ship webhooks"
        />
      </section>

      <section className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h2 className="font-display text-2xl">Team</h2>
        <ul className="mt-4 divide-y">
          {team.map((member: { id: string; name: string; email: string; role: string }) => (
            <li key={member.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs capitalize">{member.role}</span>
            </li>
          ))}
        </ul>
        {role === "admin" ? <InviteForm /> : null}
      </section>

      <section>
        <h2 className="font-display text-2xl">WhatsApp previews</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The portal never sends these. n8n / Meta Cloud API does.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {MESSAGES.map((message) => (
            <article key={message.name} className="rounded-3xl border bg-card p-5">
              <p className="text-[11px] tracking-[0.16em] text-primary uppercase">{message.name}</p>
              <h3 className="mt-1 font-medium">{message.title}</h3>
              <div className="mt-3 rounded-2xl bg-secondary p-4 text-sm leading-6">{message.body}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function HealthCard({
  title,
  status,
  detail,
}: {
  title: string;
  status: "connected" | "waiting" | "error" | string;
  detail: string;
}) {
  const icon =
    status === "connected" ? (
      <CheckCircle2 className="size-5 text-emerald-600" />
    ) : status === "error" ? (
      <WifiOff className="size-5 text-rose-600" />
    ) : (
      <CircleDashed className="size-5 text-amber-600" />
    );
  return (
    <div className="rounded-3xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="font-medium">{title}</p>
        {icon}
      </div>
      <p className="mt-2 text-sm capitalize text-muted-foreground">{status}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function InviteForm() {
  const client = useQueryClient();
  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", email: "", role: "warehouse", password: "" },
  });
  const mutation = useMutation({
    mutationFn: async (values: InviteValues) => {
      const res = await fetch("/api/settings/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Team member added");
      client.invalidateQueries({ queryKey: ["settings"] });
      form.reset();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <form
      className="mt-6 grid gap-3 border-t pt-5 md:grid-cols-2"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <div className="space-y-1">
        <Label>Name</Label>
        <Input {...form.register("name")} />
      </div>
      <div className="space-y-1">
        <Label>Email</Label>
        <Input type="email" {...form.register("email")} />
      </div>
      <div className="space-y-1">
        <Label>Role</Label>
        <Select
          value={form.watch("role")}
          onValueChange={(value) => form.setValue("role", value as InviteValues["role"])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="warehouse">Warehouse</SelectItem>
            <SelectItem value="support">Support</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Temporary password</Label>
        <Input type="password" {...form.register("password")} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
          Add teammate
        </Button>
      </div>
    </form>
  );
}
