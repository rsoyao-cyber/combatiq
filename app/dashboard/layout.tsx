import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
