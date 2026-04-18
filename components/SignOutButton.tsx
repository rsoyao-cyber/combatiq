"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignOutButton({ email }: { email?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = email
    ? email.slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-bold text-primary-foreground select-none flex-shrink-0">
        {initials}
      </div>
      {email && (
        <span className="hidden xl:block text-xs text-primary-foreground/70 max-w-[140px] truncate">
          {email}
        </span>
      )}
      <button
        onClick={handleSignOut}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
        )}
      >
        Sign out
      </button>
    </div>
  );
}
