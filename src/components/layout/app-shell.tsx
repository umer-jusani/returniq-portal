"use client";

import { LayoutList, LogOut, Moon, Settings2, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/requests", label: "Requests", icon: LayoutList },
  { href: "/settings", label: "Settings", icon: Settings2, admin: true },
];

export function AppShell({
  user,
  tenantName,
  demo,
  children,
}: {
  user: SessionUser;
  tenantName: string;
  demo: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const links = NAV.filter((item) => !item.admin || user.role === "admin");

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
        <div className="px-5 py-6">
          <Logo inverted />
          <p className="mt-3 text-[11px] tracking-[0.18em] text-sidebar-muted uppercase">
            {tenantName}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {links.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-muted transition-colors",
                  active && "bg-sidebar-accent text-white shadow-inner",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4">
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-sm text-white">{user.name}</p>
            <p className="text-xs text-sidebar-muted capitalize">{user.role}</p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur-xl lg:px-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="hidden text-sm text-muted-foreground lg:block">
            {demo ? "Demo data · credentials can be added later" : "Live Airtable"}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              <Sun className="size-4 dark:hidden" />
              <Moon className="hidden size-4 dark:block" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full">
                  {user.name.split(" ")[0]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t bg-background/95 p-2 backdrop-blur lg:hidden">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl py-3 text-sm",
                pathname.startsWith(item.href) ? "bg-secondary text-foreground" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
