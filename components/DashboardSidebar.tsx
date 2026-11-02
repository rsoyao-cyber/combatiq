"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, FileUp, LayoutDashboard, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const DASHBOARD_NAV = [
  { href: "/dashboard", label: "Squad today", icon: LayoutDashboard },
  { href: "/dashboard/import", label: "Import Trainerize PDF", icon: FileUp },
];

export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/athlete");
  return pathname.startsWith(href);
}

export function DashboardLockup() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="size-8 rounded-[10px] bg-sidebar-primary flex items-center justify-center flex-shrink-0">
        <Activity className="size-[18px] text-sidebar-primary-foreground" aria-hidden="true" />
      </div>
      <div className="flex flex-col leading-none gap-0.5">
        <span className="font-display text-[19px] font-bold uppercase tracking-wide text-sidebar-foreground">CombatIQ</span>
        <span className="text-[11px] text-sidebar-foreground/60">by TFP Clinic</span>
      </div>
    </div>
  );
}

function NavLink({ href, label, icon: Icon }: (typeof DASHBOARD_NAV)[number]) {
  const pathname = usePathname();
  const active = isNavActive(href, pathname);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 h-[38px] px-2.5 rounded-[10px] text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
          : "text-sidebar-foreground/80 font-medium hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 flex-shrink-0" aria-hidden="true" />
      {label}
    </Link>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function DashboardSidebar({ email }: { email?: string }) {
  const router = useRouter();
  const initials = email ? email.slice(0, 2).toUpperCase() : "?";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-60 bg-sidebar text-sidebar-foreground z-30 overflow-y-auto px-3.5 py-5 gap-6">
      <div className="px-1.5">
        <DashboardLockup />
      </div>

      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {DASHBOARD_NAV.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      <div className="mt-auto pt-3 border-t border-sidebar-border flex items-center gap-2.5 px-1.5">
        <div className="size-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0 leading-tight">
          <p className="text-[13px] font-semibold truncate">{email ?? "Account"}</p>
          <p className="text-xs text-sidebar-foreground/60">Practitioner</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="size-9 rounded-lg flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}

// ─── Mobile top bar ──────────────────────────────────────────────────────────

export function DashboardMobileBar({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="lg:hidden fixed top-0 inset-x-0 z-20 bg-sidebar text-sidebar-foreground">
      <div className="h-14 px-4 flex items-center justify-between gap-3">
        <DashboardLockup />
        <div className="flex items-center gap-1">
          <nav aria-label="Main" className="flex items-center gap-1">
            {DASHBOARD_NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isNavActive(href, pathname) ? "page" : undefined}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors",
                  isNavActive(href, pathname)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:text-sidebar-foreground",
                )}
              >
                {href === "/dashboard" ? "Squad" : "Import"}
                <span className="sr-only"> — {label}</span>
              </Link>
            ))}
          </nav>
          {children}
        </div>
      </div>
    </div>
  );
}
