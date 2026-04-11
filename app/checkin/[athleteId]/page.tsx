import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CheckInForm } from "./CheckInForm";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const { athleteId } = await params;

  const { data: athlete } = await supabaseAdmin
    .from("athlete")
    .select("id, name")
    .eq("id", athleteId)
    .single();

  if (!athlete) notFound();

  return <CheckInForm athleteId={athlete.id} athleteName={athlete.name} />;
}
