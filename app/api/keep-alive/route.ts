import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Hit daily by a Vercel cron (see vercel.json) so the free-tier Supabase
// project never sees 7 days of inactivity and gets paused.
export async function GET(request: Request) {
  // Vercel sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from("athlete")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("[keep-alive] Supabase query failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
