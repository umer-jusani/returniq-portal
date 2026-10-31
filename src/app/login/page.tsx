import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden mesh">
      <div className="pointer-events-none absolute -top-24 -left-16 size-[420px] rounded-full bg-teal-400/25 blur-3xl animate-drift" />
      <div className="pointer-events-none absolute -right-10 top-20 size-[380px] rounded-full bg-amber-400/20 blur-3xl animate-drift-slow" />
      <div className="grain pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay" />

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-2">
        <div className="hidden text-white lg:block">
          <p className="text-sm tracking-[0.28em] text-white/50 uppercase">ReturnIQ merchant portal</p>
          <h1 className="font-display mt-6 max-w-lg text-6xl leading-[0.95]">
            Every return.
            <br />
            One desk.
          </h1>
          <p className="mt-6 max-w-md text-lg text-white/65">
            Inspect parcels, ship replacements, and keep WhatsApp in lockstep — without leaving the warehouse floor.
          </p>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/8 p-7 shadow-2xl backdrop-blur-xl">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
