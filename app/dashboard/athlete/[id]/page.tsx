import { notFound } from "next/navigation";
import Link from "next/link";
import { FileUp } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  WELLBEING_DOMAINS,
  getWellbeingTrends,
  getExerciseProgressions,
  getInjuryFlags,
  getWeightTrends,
  getSessionLoads,
} from "@/lib/analytics";
import { getMondayOfWeek } from "@/lib/training-week-types";
import type { TrainingWeekSnapshot } from "@/lib/training-week-types";
import { athleteSnapshot, type CheckInRow } from "@/lib/squad";
import { checkinLabel, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { Tabs } from "@/components/dashboard/Tabs";
import { CopyCheckinLink } from "@/components/dashboard/CopyCheckinLink";
import { Panel } from "@/components/dashboard/Panel";
import { EditAthleteModal } from "./EditAthleteModal";
import { ReportGenerateButtons } from "./ReportGenerateButtons";
import { ReportPanel } from "./ReportPanel";
import { OverviewTab, type LoggedSession } from "./OverviewTab";
import { TrainingTab, type TrainerizeSession } from "./TrainingTab";
import { WellbeingTab } from "./WellbeingTab";
import { BodyTab } from "./BodyTab";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "training", label: "Training" },
  { key: "wellbeing", label: "Wellbeing" },
  { key: "body", label: "Body & weight" },
  { key: "reports", label: "Reports" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function isoDaysAgo(today: string, days: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function AthletePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "overview";

  const today = new Date().toISOString().slice(0, 10);
  const monthYear = today.slice(0, 7);
  const currentWeekStart = getMondayOfWeek(new Date());
  const cutoff35 = isoDaysAgo(today, 35);
  const cutoff28 = isoDaysAgo(today, 28);
  const cutoff30 = isoDaysAgo(today, 30);
  const last4Mondays = Array.from({ length: 4 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    return getMondayOfWeek(d);
  });

  const [
    athleteResult,
    goalResult,
    checkInsResult,
    loggedSessionsResult,
    lastCheckinResult,
    trends,
    progressions,
    injuries,
    trainerizeResult,
    weekSnapshotResult,
    weightTrends,
    sessionLoads,
    lastCycleResult,
    latestProgramResult,
    checkInCount30dResult,
    weekSchedule4wResult,
    reportHistoryResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("athlete")
      .select("id, name, sex, sport, weight_class, competition_level, training_age_years, clinic_name")
      .eq("id", id)
      .single(),
    supabaseAdmin.from("monthly_goal").select("goal_text").eq("athlete_id", id).eq("month_year", monthYear).maybeSingle(),
    supabaseAdmin
      .from("daily_check_in")
      .select(`athlete_id, checkin_date, weight_kg, injury_area, injury_pain_rating, ${WELLBEING_DOMAINS.join(", ")}`)
      .eq("athlete_id", id)
      .gte("checkin_date", cutoff35)
      .order("checkin_date", { ascending: true }),
    supabaseAdmin
      .from("check_in_session")
      .select("session_date, position, session_types, duration_mins, rpe, load_au, sparring_rounds")
      .eq("athlete_id", id)
      .gte("session_date", cutoff35)
      .order("session_date", { ascending: true })
      .order("position", { ascending: true }),
    supabaseAdmin
      .from("daily_check_in")
      .select("checkin_date")
      .eq("athlete_id", id)
      .order("checkin_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getWellbeingTrends(id, 28),
    getExerciseProgressions(id),
    getInjuryFlags(id),
    supabaseAdmin
      .from("training_session")
      .select("id, session_date, session_rpe, completed, workout_template(name)")
      .eq("athlete_id", id)
      .order("session_date", { ascending: false })
      .limit(40),
    supabaseAdmin
      .from("training_week_snapshot")
      .select("*")
      .eq("athlete_id", id)
      .eq("week_start_date", currentWeekStart)
      .maybeSingle(),
    getWeightTrends(id, 8),
    getSessionLoads(id, 8),
    supabaseAdmin
      .from("menstrual_cycle")
      .select("cycle_start_date, cycle_length_days")
      .eq("athlete_id", id)
      .order("cycle_start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("workout_program")
      .select("start_date, name")
      .eq("athlete_id", id)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("daily_check_in")
      .select("*", { count: "exact", head: true })
      .eq("athlete_id", id)
      .gte("checkin_date", cutoff30),
    supabaseAdmin
      .from("training_week_snapshot")
      .select("week_start_date", { count: "exact", head: true })
      .eq("athlete_id", id)
      .in("week_start_date", last4Mondays),
    supabaseAdmin
      .from("report_share")
      .select("id, token, report_type, created_at, expires_at, viewed_at")
      .eq("athlete_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (!athleteResult.data) notFound();

  const athlete = athleteResult.data;
  const checkIns = (checkInsResult.data ?? []) as unknown as CheckInRow[];
  const loggedSessions = (loggedSessionsResult.data ?? []) as LoggedSession[];
  const trainerizeSessions = (trainerizeResult.data ?? []) as TrainerizeSession[];
  const weekSnapshot = (weekSnapshotResult.data ?? null) as TrainingWeekSnapshot | null;
  const lastCheckinDate = lastCheckinResult.data?.checkin_date ?? null;

  // Same status, KPIs and flags as the Squad page
  const snapshot = athleteSnapshot(checkIns, loggedSessions, today, lastCheckinDate);

  const programStart = latestProgramResult.data?.start_date ?? null;
  const programme = latestProgramResult.data && programStart
    ? {
        name: latestProgramResult.data.name,
        weeks: Math.max(1, Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${programStart}T00:00:00Z`)) / (7 * 86_400_000)) + 1),
      }
    : null;

  const meta = [athlete.sport, athlete.weight_class, athlete.competition_level].filter(Boolean).join(" · ");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col gap-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <nav aria-label="Breadcrumb" className="text-[13px] text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground hover:underline underline-offset-4">Squad</Link>
          <span aria-hidden="true"> / </span>
          <span className="text-foreground">{athlete.name}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="size-14 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-lg font-bold shrink-0" aria-hidden="true">
              {initials(athlete.name)}
            </span>
            <div className="flex flex-col gap-1.5 min-w-0">
              <h1 className="font-display text-[38px] leading-none font-bold uppercase text-foreground truncate">{athlete.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                {meta && <span>{meta}</span>}
                <StatusPill status={snapshot.status} />
                <span>Last check-in: {checkinLabel(snapshot.daysSinceCheckin).toLowerCase()}</span>
                {programme && <span>· {programme.name}, week {programme.weeks}</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CopyCheckinLink athleteId={athlete.id} name={athlete.name} withLabel />
            <EditAthleteModal athlete={athlete} />
            <Link
              href={`/dashboard/import?athleteId=${id}&athleteName=${encodeURIComponent(athlete.name)}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 rounded-full px-4 gap-1.5")}
            >
              <FileUp className="size-3.5" /> Import PDF
            </Link>
            <ReportGenerateButtons athleteId={id} />
          </div>
        </div>

        <Tabs
          label="Athlete sections"
          tabs={[...TABS]}
          active={tab}
          hrefFor={(key) => (key === "overview" ? `/dashboard/athlete/${id}` : `/dashboard/athlete/${id}?tab=${key}`)}
        />
      </div>

      {/* ── Active tab ─────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <OverviewTab
          athleteId={id}
          snapshot={snapshot}
          goal={goalResult.data?.goal_text ?? ""}
          monthYear={monthYear}
          sessions={loggedSessions}
          weekStart={currentWeekStart}
          weekSnapshot={weekSnapshot}
          sessionLoads={sessionLoads}
          trends={trends.domains}
          checkIns={checkIns}
          today={today}
        />
      )}

      {tab === "training" && (
        <TrainingTab
          athleteId={id}
          sessionLoads={sessionLoads}
          weekSnapshot={weekSnapshot}
          weekStart={currentWeekStart}
          checkIns={checkIns}
          loggedSessions={loggedSessions}
          trainerizeSessions={trainerizeSessions}
          progressions={progressions}
          programme={programme}
        />
      )}

      {tab === "wellbeing" && (
        <WellbeingTab
          trends={trends.domains}
          checkIns={checkIns.filter((c) => c.checkin_date >= cutoff28)}
          injuries={injuries}
          isFemale={athlete.sex === "female"}
          lastCycle={lastCycleResult.data ?? null}
        />
      )}

      {tab === "body" && <BodyTab snapshot={snapshot} weightTrends={weightTrends} today={today} />}

      {tab === "reports" && (
        <Panel title="Reports">
          <ReportPanel
            athleteId={id}
            checkInCount30d={checkInCount30dResult.count ?? 0}
            weekScheduleCount4w={weekSchedule4wResult.count ?? 0}
            lastSessionDate={trainerizeSessions[0]?.session_date ?? null}
            reportHistory={reportHistoryResult.data ?? []}
          />
        </Panel>
      )}
    </div>
  );
}
