import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const body = await request.json() as {
    name: string;
    sport: string;
    weight_class: string;
    competition_level: string;
    training_age_years: number;
  };

  const { name, sport, weight_class, competition_level, training_age_years } = body;

  if (!name?.trim() || !sport?.trim()) {
    return NextResponse.json({ error: "Name and sport are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("athlete")
    .insert({
      name: name.trim(),
      sport: sport.trim(),
      weight_class: weight_class?.trim() ?? null,
      competition_level: competition_level?.trim() ?? null,
      training_age_years: training_age_years ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
