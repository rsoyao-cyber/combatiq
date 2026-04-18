import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({ id: z.string().uuid() });

export async function PATCH(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid request", issues: result.error.issues }, { status: 400 });
  }

  const { id } = result.data;

  const { data: share } = await supabaseAdmin
    .from("report_share")
    .select("expires_at")
    .eq("id", id)
    .single();

  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Extend from current expiry (or now if already expired)
  const base = share.expires_at && new Date(share.expires_at) > new Date()
    ? new Date(share.expires_at)
    : new Date();
  const newExpiry = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { error } = await supabaseAdmin
    .from("report_share")
    .update({ expires_at: newExpiry.toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ expires_at: newExpiry.toISOString() });
}
