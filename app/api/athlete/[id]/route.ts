import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { UpdateAthleteSchema } from "@/lib/schemas";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const body = await request.json();
  const result = UpdateAthleteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.issues },
      { status: 400 },
    );
  }

  const { name, sex, sport, weight_class, competition_level, training_age_years, clinic_name } =
    result.data;

  const { error } = await supabaseAdmin
    .from("athlete")
    .update({ name, sex: sex ?? null, sport, weight_class, competition_level, training_age_years, clinic_name: clinic_name ?? null })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
