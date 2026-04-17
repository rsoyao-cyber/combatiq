import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CreateAthleteSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const body = await request.json();

  const result = CreateAthleteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.issues },
      { status: 400 }
    );
  }

  const { name, sport, weight_class, competition_level, training_age_years, clinic_name, trainerize_user_id } =
    result.data;

  const { data, error } = await supabaseAdmin
    .from("athlete")
    .insert({
      name,
      sport,
      weight_class,
      competition_level,
      training_age_years,
      clinic_name: clinic_name ?? null,
      trainerize_user_id: trainerize_user_id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
