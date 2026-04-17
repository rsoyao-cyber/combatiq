"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
      )}
    >
      Sign out
    </button>
  );
}
