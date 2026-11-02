import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { DashboardSidebar, DashboardMobileBar } from "@/components/DashboardSidebar";
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
    <div className="flex min-h-screen bg-background">
      {/* ── Persistent left sidebar (desktop) ───────────────────────────── */}
      <DashboardSidebar email={user?.email} />

      {/* ── Mobile top bar ───────────────────────────────────────────────── */}
      <DashboardMobileBar>
        <SignOutButton email={user?.email} />
      </DashboardMobileBar>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 lg:pl-60 pt-14 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
