import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { offsetWeekStart } from "@/lib/training-week-types";

const Schema = z.object({
  athleteId: z.uuid(),
  fromWeekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weeks: z.number().int().min(1).max(8),
});

export async function POST(request: Request) {
  const body = await request.json();
  const result = Schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { athleteId, fromWeekStart, weeks } = result.data;

  const { data: source } = await supabaseAdmin
    .from("training_week_snapshot")
    .select("primary_json")
    .eq("athlete_id", athleteId)
    .eq("week_start_date", fromWeekStart)
    .maybeSingle();

  if (!source?.primary_json) {
    return NextResponse.json(
      { error: "No primary plan found for this week" },
      { status: 404 },
    );
  }

  let created = 0;
  let skipped = 0;

  for (let i = 1; i <= weeks; i++) {
    const targetWeekStart = offsetWeekStart(fromWeekStart, i);

    const { data: existing } = await supabaseAdmin
      .from("training_week_snapshot")
      .select("id, primary_json")
      .eq("athlete_id", athleteId)
      .eq("week_start_date", targetWeekStart)
      .maybeSingle();

    if (existing?.primary_json) {
      skipped++;
      continue;
    }

    if (existing) {
      await supabaseAdmin
        .from("training_week_snapshot")
        .update({ primary_json: source.primary_json, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("training_week_snapshot").insert({
        athlete_id: athleteId,
        week_start_date: targetWeekStart,
        primary_json: source.primary_json,
      });
    }

    created++;
  }

  return NextResponse.json({ created, skipped });
}
