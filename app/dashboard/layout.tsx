import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <nav className="bg-zinc-900 text-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-amber-400 tracking-tight text-lg">CombatIQ</span>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className="text-white/80 hover:text-white transition-colors">
              Dashboard
            </Link>
<Link href="/settings" className="text-white/80 hover:text-white transition-colors">
              Settings
            </Link>
          </div>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}
