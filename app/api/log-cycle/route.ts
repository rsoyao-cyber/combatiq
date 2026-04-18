import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const LogCycleSchema = z.object({
  athlete_id: z.uuid({ error: "Must be a valid UUID" }),
  cycle_start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Must be a date in YYYY-MM-DD format" }),
  cycle_length_days: z.number().int().min(21).max(45).optional().default(28),
});

export async function POST(request: Request) {
  const body = await request.json();

  const result = LogCycleSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.issues },
      { status: 400 },
    );
  }

  const { athlete_id, cycle_start_date, cycle_length_days } = result.data;

  const { error } = await supabaseAdmin.from("menstrual_cycle").insert({
    athlete_id,
    cycle_start_date,
    cycle_length_days,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
