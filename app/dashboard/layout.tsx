import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Separator } from "@/components/ui/separator";
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
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col">
      <header className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold tracking-tight text-lg select-none">
            CombatIQ
          </span>
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-md text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
            >
              Dashboard
            </Link>
            <Separator orientation="vertical" className="h-4 bg-primary-foreground/20 mx-1" />
            <Link
              href="/settings"
              className="px-3 py-1.5 rounded-md text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
            >
              Settings
            </Link>
            <Separator orientation="vertical" className="h-4 bg-primary-foreground/20 mx-1" />
            <SignOutButton email={user?.email} />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
