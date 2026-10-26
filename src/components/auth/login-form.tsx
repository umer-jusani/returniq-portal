"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginValues } from "@/lib/schemas";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "uma.s@example.org", password: "ReturnIQ!2026" },
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!res.ok || json.ok === false) {
      setServerError(json.error || "Could not sign in");
      return;
    }
    router.push(params.get("next") || "/requests");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <Logo inverted />
      <div>
        <p className="text-xs tracking-[0.22em] text-white/45 uppercase">Merchant portal</p>
        <h1 className="font-display mt-2 text-4xl text-white">Welcome back.</h1>
        <p className="mt-2 text-sm text-white/60">
          Every return, inspection and replacement — one desk.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-white/70">Email</Label>
        <Input
          type="email"
          autoComplete="email"
          className="border-white/10 bg-white/8 text-white placeholder:text-white/30"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p className="text-xs text-rose-300">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label className="text-white/70">Password</Label>
        <Input
          type="password"
          autoComplete="current-password"
          className="border-white/10 bg-white/8 text-white placeholder:text-white/30"
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p className="text-xs text-rose-300">{form.formState.errors.password.message}</p>
        ) : null}
      </div>

      {serverError ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {serverError}
        </div>
      ) : null}

      <Button type="submit" className="h-12 w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
        Sign in
      </Button>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/55">
        Demo mode is on until Airtable / n8n keys are added.
        <div className="mt-1 font-mono text-white/75">uma.s@example.org · ReturnIQ!2026</div>
      </div>
    </form>
  );
}
