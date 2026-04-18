"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  FileUp,
  Settings,
  HelpCircle,
  Search,
  LogOut,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ─── Nav items ───────────────────────────────────────────────────────────────

const GENERAL_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const MANAGEMENT_NAV = [
  { href: "/dashboard/import", label: "Import PDF", icon: FileUp },
];

function NavLink({
  href,
  label,
  icon: Icon,
  exact = false,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href ||
      (href === "/dashboard" && pathname.startsWith("/dashboard/athlete")) ||
      (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
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
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-30 overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-base">CombatIQ</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-4 pb-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Quick search…"
            className="pl-8 h-8 text-sm bg-muted border-transparent focus-visible:ring-1"
            readOnly
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-5">
        <div>
          <p className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            General
          </p>
          <div className="flex flex-col gap-0.5">
            {GENERAL_NAV.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Program Management
          </p>
          <div className="flex flex-col gap-0.5">
            {MANAGEMENT_NAV.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-border px-3 pt-3 pb-4 flex-shrink-0 flex flex-col gap-0.5">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          Settings
        </Link>
        <Link
          href="#"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          Help Center
        </Link>

        {/* User + sign out */}
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground font-medium truncate">{email ?? "Account"}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
