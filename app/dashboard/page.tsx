import { supabaseAdmin } from "@/lib/supabase-admin";
import { getRagStatus } from "@/lib/analytics";
import { AthleteGrid, type AthleteCardData } from "./AthleteGrid";
import { AddAthleteButton } from "./AddAthleteButton";

export const revalidate = 60; // revalidate every 60s

export default async function DashboardPage() {
  // Fetch all athletes
  const { data: athletes, error } = await supabaseAdmin
    .from("athlete")
    .select("id, name, sport, weight_class")
    .order("name");

  if (error) throw new Error(error.message);
  if (!athletes?.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-foreground">Squad</h1>
          <AddAthleteButton />
        </div>
        <p className="text-muted-foreground">No athletes yet. Add one or import a PDF to get started.</p>
      </div>
    );
  }

  // Fetch RAG status, last check-in, and active injury for each athlete in parallel
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split("T")[0];

  const enriched = await Promise.all(
    athletes.map(async (athlete): Promise<AthleteCardData> => {
      const [ragResult, lastCheckinResult, injuryResult] = await Promise.all([
        getRagStatus(athlete.id),

        supabaseAdmin
          .from("daily_check_in")
          .select("checkin_date")
          .eq("athlete_id", athlete.id)
          .order("checkin_date", { ascending: false })
          .limit(1)
          .single(),

        supabaseAdmin
          .from("daily_check_in")
          .select("injury_area, injury_pain_rating")
          .eq("athlete_id", athlete.id)
          .gte("checkin_date", cutoff)
          .not("injury_area", "is", null)
          .gt("injury_pain_rating", 0)
          .order("checkin_date", { ascending: false })
          .limit(1)
          .single(),
      ]);

      return {
        id: athlete.id,
        name: athlete.name,
        sport: athlete.sport,
        weight_class: athlete.weight_class,
        lastCheckinDate: lastCheckinResult.data?.checkin_date ?? null,
        ragStatus: ragResult.status,
        hasActiveInjury: !!injuryResult.data,
        injuryArea: injuryResult.data?.injury_area ?? null,
      };
    }),
  );

  const redCount   = enriched.filter((a) => a.ragStatus === "red").length;
  const amberCount = enriched.filter((a) => a.ragStatus === "amber").length;
  const injuryCount = enriched.filter((a) => a.hasActiveInjury).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Page header */}
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Squad</h1>
          <p className="text-muted-foreground text-sm mt-1">{athletes.length} athletes</p>
        </div>
        <AddAthleteButton />

        {/* Summary pills */}
        <div className="flex gap-2 flex-wrap">
          {redCount > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1 text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {redCount} red
            </span>
          )}
          {amberCount > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {amberCount} amber
            </span>
          )}
          {injuryCount > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1 text-sm font-semibold">
              ⚠ {injuryCount} injured
            </span>
          )}
        </div>
      </div>

      <AthleteGrid athletes={enriched} />
    </div>
  );
}
