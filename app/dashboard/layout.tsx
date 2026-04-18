import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Activity } from "lucide-react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SignOutButton } from "@/components/SignOutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* ── Persistent left sidebar (desktop) ───────────────────────────── */}
      <DashboardSidebar email={user?.email} />

      {/* ── Mobile top bar ───────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-card border-b border-border">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">CombatIQ</span>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Squad
            </Link>
            <Link
              href="/dashboard/import"
              className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Import
            </Link>
            <SignOutButton email={user?.email} />
          </nav>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
