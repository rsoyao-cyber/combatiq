"use client";

import { useState } from "react";
import { AlertCircle, Check, ChevronDown, ChevronLeft, Flame, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrandMark } from "@/components/checkin/BrandMark";
import { RatingScale } from "@/components/checkin/RatingScale";
import { RpeScale } from "@/components/checkin/RpeScale";
import { Stepper } from "@/components/checkin/Stepper";
import { ChipToggle } from "@/components/checkin/ChipToggle";
import { rpeBand, sessionLoad } from "@/lib/load";
import { computeStreak, lastNDays } from "@/lib/streak";
import { cn } from "@/lib/utils";

// ─── Questions ────────────────────────────────────────────────────────────────

const WELLBEING = [
  { key: "sleep_quality",    label: "Sleep quality", low: "Very poor",   high: "Excellent" },
  { key: "physical_fatigue", label: "Energy",        low: "Exhausted",   high: "Fresh" },
  { key: "mental_focus",     label: "Focus",         low: "Scattered",   high: "Locked in" },
  { key: "motivation",       label: "Motivation",    low: "None",        high: "Fired up" },
  { key: "mood",             label: "Mood",          low: "Low",         high: "Great" },
  { key: "stress",           label: "Stress",        low: "Overwhelmed", high: "Calm" },
] as const;

type WellbeingKey = (typeof WELLBEING)[number]["key"];

const SESSION_TYPE_OPTIONS = [
  "Running", "Strength", "BJJ/Grappling", "Boxing/Pads",
  "Sparring", "Conditioning", "Mobility", "Competition", "Other",
];

const DURATION_PRESETS = [30, 45, 60, 75, 90, 120];

const PAIN_WORDS = ["None", "Mild", "Noticeable", "Moderate", "Severe", "Worst"];

// ─── Types ────────────────────────────────────────────────────────────────────

type ExistingCheckIn = {
  sleep_quality: number;
  sleep_hours: number | null;
  physical_fatigue: number;
  mental_focus: number;
  motivation: number;
  mood: number;
  stress: number;
  diet_quality: number | null;
  hitting_nutrition_targets: boolean | null;
  weight_kg: number | null;
  check_in_timing: string | null;
} | null;

export type ExistingSession = {
  session_types: string[];
  duration_mins: number;
  rpe: number;
  sparring_rounds: number | null;
};

type Session = { types: string[]; duration: string; rpe: number | null; rounds: number | null };

const emptySession = (): Session => ({ types: [], duration: "", rpe: null, rounds: null });

function sessionMinutes(s: Session): number {
  return s.duration !== "" ? Number(s.duration) : 0;
}

function isComplete(s: Session): boolean {
  return sessionMinutes(s) >= 1 && s.rpe != null;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// ─── Small pieces ─────────────────────────────────────────────────────────────

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-border bg-card p-4", className)}>{children}</div>;
}

function YesNo({ value, onChange, label }: {
  value: boolean | null; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-2">
      {[{ text: "Yes", v: true }, { text: "No", v: false }].map(({ text, v }) => (
        <button
          key={text}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "h-11 rounded-xl border text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === v
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-muted border-input text-foreground/80 hover:bg-input",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function StreakDots({ dates, today }: { dates: string[]; today: string }) {
  const logged = new Set(dates);
  const days = lastNDays(today, 7);
  return (
    <div className="grid grid-cols-7 gap-1.5 text-center">
      {days.map((day) => {
        const done = logged.has(day);
        const label = day === today
          ? "Today"
          : new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }).slice(0, 2);
        return (
          <div key={day} className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "size-8 rounded-full border flex items-center justify-center",
                done ? "bg-primary border-primary" : "bg-muted border-input",
              )}
              aria-label={`${label}: ${done ? "checked in" : "no check-in"}`}
            >
              {done && <Check className="size-3.5 text-primary-foreground" strokeWidth={3} aria-hidden="true" />}
            </span>
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function CheckInForm({
  athleteId,
  athleteName,
  isFemale = false,
  existingCheckIn = null,
  existingSessions = [],
  checkInDates = [],
}: {
  athleteId: string;
  athleteName: string;
  isFemale?: boolean;
  existingCheckIn?: ExistingCheckIn;
  existingSessions?: ExistingSession[];
  checkInDates?: string[]; // recent check-in dates, for the streak
}) {
  const today = new Date().toISOString().split("T")[0];
  const firstName = athleteName.split(" ")[0];
  const isContinuing = existingCheckIn?.check_in_timing === "morning_only";
  const isEditing = existingCheckIn?.check_in_timing === "complete";

  // Step 1 · Morning
  const [ratings, setRatings] = useState<Record<WellbeingKey, number | null>>({
    sleep_quality:    existingCheckIn?.sleep_quality    ?? null,
    physical_fatigue: existingCheckIn?.physical_fatigue ?? null,
    mental_focus:     existingCheckIn?.mental_focus     ?? null,
    motivation:       existingCheckIn?.motivation       ?? null,
    mood:             existingCheckIn?.mood             ?? null,
    stress:           existingCheckIn?.stress           ?? null,
  });
  const [sleepHours, setSleepHours] = useState<number | null>(existingCheckIn?.sleep_hours ?? null);
  const [weight, setWeight] = useState(existingCheckIn?.weight_kg != null ? String(existingCheckIn.weight_kg) : "");

  // Step 2 · Training
  const [sessions, setSessions] = useState<Session[]>(
    existingSessions.length > 0
      ? existingSessions.map((s) => ({
          types: s.session_types,
          duration: String(s.duration_mins),
          rpe: s.rpe,
          rounds: s.sparring_rounds,
        }))
      : [emptySession()],
  );
  const [openSession, setOpenSession] = useState(existingSessions.length > 0 ? -1 : 0);
  const [restDay, setRestDay] = useState(isEditing && existingSessions.length === 0);

  // Step 3 · Body & notes
  const [diet, setDiet] = useState<number | null>(existingCheckIn?.diet_quality ?? null);
  const [hittingTargets, setHittingTargets] = useState<boolean | null>(existingCheckIn?.hitting_nutrition_targets ?? null);
  const [hasInjury, setHasInjury] = useState(false);
  const [injuryArea, setInjuryArea] = useState("");
  const [painRating, setPainRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [logPeriodStart, setLogPeriodStart] = useState(false);

  const [step, setStep] = useState(isContinuing ? 1 : 0);
  const [savedToday, setSavedToday] = useState(existingCheckIn != null);
  const [status, setStatus] = useState<"idle" | "submitting" | "morning_saved" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const STEPS = ["Morning", "Training", "Body & notes"];
  const answered = WELLBEING.filter((q) => ratings[q.key] != null).length;
  const loggedSessions = restDay ? [] : sessions.filter(isComplete);
  const dayLoad = loggedSessions.reduce((sum, s) => sum + sessionLoad(s.rpe!, sessionMinutes(s)), 0);
  const trainingValid = restDay || (sessions.length > 0 && sessions.every(isComplete));

  // ── Session editing ────────────────────────────────────────────────────────

  function updateSession(i: number, patch: Partial<Session>) {
    setSessions((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function toggleType(i: number, type: string) {
    const s = sessions[i];
    const types = s.types.includes(type) ? s.types.filter((t) => t !== type) : [...s.types, type];
    updateSession(i, { types });
  }

  function addSession() {
    if (sessions.length >= 5) return;
    setSessions((prev) => [...prev, emptySession()]);
    setOpenSession(sessions.length);
    setRestDay(false);
  }

  function removeSession(i: number) {
    setSessions((prev) => prev.filter((_, idx) => idx !== i));
    setOpenSession(-1);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  const baseFields = () => ({
    athlete_id: athleteId,
    athlete_name: athleteName,
    checkin_date: today,
    ...ratings,
    sleep_hours: sleepHours,
    weight_kg: weight !== "" ? Number(weight) : null,
  });

  async function post(body: object, onDone: "morning_saved" | "success") {
    setStatus("submitting");
    const res = await fetch("/api/log-checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Failed to submit. Please try again.");
      setStatus("error");
      return;
    }
    setSavedToday(true);
    setStatus(onDone);
  }

  function handleMorningSubmit() {
    return post({
      ...baseFields(),
      diet_quality: null,
      check_in_timing: "morning_only",
      log_period_start: false,
    }, "morning_saved");
  }

  function handleSubmit() {
    return post({
      ...baseFields(),
      diet_quality: diet,
      hitting_nutrition_targets: hittingTargets,
      sessions: loggedSessions.map((s) => ({
        session_types: s.types,
        duration_mins: sessionMinutes(s),
        rpe: s.rpe,
        sparring_rounds: s.types.includes("Sparring") ? s.rounds : null,
      })),
      injury_area: hasInjury ? (injuryArea || null) : null,
      injury_pain_rating: hasInjury && injuryArea ? painRating : null,
      open_notes: notes || null,
      log_period_start: logPeriodStart,
      check_in_timing: "complete",
    }, "success");
  }

  // ── Finished screens ───────────────────────────────────────────────────────

  if (status === "morning_saved" || status === "success") {
    const dates = [...checkInDates, today];
    const streak = computeStreak(dates, today);
    const wellbeingAvg = WELLBEING.reduce((sum, q) => sum + (ratings[q.key] ?? 0), 0) / WELLBEING.length;
    const morningOnly = status === "morning_saved";

    return (
      <div className="dark min-h-dvh bg-background text-foreground">
        <div className="max-w-lg mx-auto px-5 pt-14 pb-8 flex flex-col gap-5" style={{ paddingTop: "max(3.5rem, env(safe-area-inset-top))" }}>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="size-16 rounded-full bg-status-ready-bg border border-status-ready flex items-center justify-center">
              <Check className="size-8 text-status-ready" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h1 className="font-display text-[40px] leading-[0.95] font-bold uppercase">
              {morningOnly ? <>Morning saved.<br />Train well.</> : <>Logged.<br />See you tomorrow.</>}
            </h1>
            <p className="text-sm text-muted-foreground">
              {morningOnly ? "Come back after training to log your sessions." : "Your coach can see today's check-in now."}
            </p>
          </div>

          <SectionCard className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-semibold">{streak}-day streak</span>
              <span className="text-xs text-muted-foreground">Last 7 days</span>
            </div>
            <StreakDots dates={dates} today={today} />
          </SectionCard>

          <SectionCard className="py-1">
            {!morningOnly && (
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Training</span>
                <span className="text-sm font-semibold tabular-nums">
                  {loggedSessions.length === 0
                    ? "Rest day"
                    : `${loggedSessions.length} session${loggedSessions.length > 1 ? "s" : ""} · ${loggedSessions.reduce((m, s) => m + sessionMinutes(s), 0)} min · ${dayLoad} AU`}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">Wellbeing</span>
              <span className="text-sm font-semibold tabular-nums">{wellbeingAvg.toFixed(1)} / 5</span>
            </div>
            {weight !== "" && (
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground">Weight</span>
                <span className="text-sm font-semibold tabular-nums">{weight} kg</span>
              </div>
            )}
          </SectionCard>

          <button
            type="button"
            onClick={() => { setStatus("idle"); setStep(morningOnly ? 1 : 0); }}
            className="h-12 rounded-full border border-input text-[15px] font-semibold text-foreground hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {morningOnly ? "Log training now" : "Edit today's check-in"}
          </button>
        </div>
      </div>
    );
  }

  // ── Steps ──────────────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <SectionCard className="flex flex-col gap-2">
                <Label htmlFor="weight_kg" className="text-[13px] font-medium text-muted-foreground">Morning weight</Label>
                <div className="flex items-baseline gap-1">
                  <input
                    id="weight_kg" type="number" inputMode="decimal" min={0} max={200} step={0.1}
                    placeholder="—" value={weight} onChange={(e) => setWeight(e.target.value)}
                    className="w-full min-w-0 bg-transparent text-[26px] font-semibold tabular-nums text-foreground placeholder:text-muted-foreground outline-none rounded-md focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <span className="text-sm text-muted-foreground">kg</span>
                </div>
                <span className="text-xs text-muted-foreground">Optional</span>
              </SectionCard>
              <SectionCard className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-muted-foreground">Hours slept</span>
                <Stepper
                  value={sleepHours} onChange={setSleepHours} label="hours slept"
                  min={0} max={14} step={0.5} start={7.5} format={(v) => `${v.toFixed(1)}h`}
                />
                <span className="text-xs text-muted-foreground">Optional</span>
              </SectionCard>
            </div>
            {WELLBEING.map((q) => (
              <RatingScale
                key={q.key} id={q.key} label={q.label} low={q.low} high={q.high}
                value={ratings[q.key]}
                onChange={(v) => setRatings((prev) => ({ ...prev, [q.key]: v }))}
              />
            ))}
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col gap-2.5">
            {isContinuing && (
              <div className="rounded-2xl border border-primary/40 bg-primary/15 px-4 py-3">
                <p className="text-sm font-semibold text-accent-foreground">Morning check-in saved</p>
                <p className="text-xs text-muted-foreground mt-0.5">Add today&apos;s training to finish.</p>
              </div>
            )}

            {restDay ? (
              <SectionCard className="flex flex-col items-start gap-3">
                <p className="text-[15px] font-semibold">Rest day — no training logged</p>
                <button
                  type="button"
                  onClick={() => { setRestDay(false); if (sessions.length === 0) addSession(); }}
                  className="text-sm font-semibold text-accent-foreground underline-offset-4 hover:underline"
                >
                  I did train — add a session
                </button>
              </SectionCard>
            ) : (
              <>
                {sessions.map((s, i) => {
                  const open = openSession === i || !isComplete(s);
                  const mins = sessionMinutes(s);
                  if (!open) {
                    const band = rpeBand(s.rpe!);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setOpenSession(i)}
                        aria-label={`Edit session ${i + 1}`}
                        className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-3 text-left hover:border-input transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span
                          className="size-9 rounded-xl flex items-center justify-center text-sm font-bold tabular-nums text-[#08131E]"
                          style={{ backgroundColor: band.color }}
                        >
                          {s.rpe}
                        </span>
                        <span className="flex-1 min-w-0 flex flex-col">
                          <span className="text-sm font-semibold truncate">{s.types.length ? s.types.join(", ") : "Training"}</span>
                          <span className="text-xs text-muted-foreground">{mins} min · {band.label}</span>
                        </span>
                        <span className="text-sm tabular-nums text-foreground/80">{sessionLoad(s.rpe!, mins)} AU</span>
                        <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                      </button>
                    );
                  }
                  return (
                    <SectionCard key={i} className={cn("flex flex-col gap-4", openSession === i && "border-primary/60")}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Session {i + 1}</span>
                        <div className="flex items-center gap-2">
                          {isComplete(s) && (
                            <span className="text-[13px] tabular-nums text-accent-foreground">
                              {s.rpe} × {mins} min = {sessionLoad(s.rpe!, mins)} AU
                            </span>
                          )}
                          {sessions.length > 1 && (
                            <button
                              type="button" onClick={() => removeSession(i)} aria-label={`Remove session ${i + 1}`}
                              className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <X className="size-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <ChipToggle
                        label={`Session ${i + 1} activity type`}
                        options={SESSION_TYPE_OPTIONS} selected={s.types}
                        onToggle={(t) => toggleType(i, t)}
                      />

                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`duration_${i}`} className="text-[13px] font-medium text-muted-foreground">Duration (minutes)</Label>
                        <div className="grid grid-cols-6 gap-1.5">
                          {DURATION_PRESETS.map((m) => (
                            <button
                              key={m} type="button" aria-pressed={mins === m}
                              onClick={() => updateSession(i, { duration: String(m) })}
                              className={cn(
                                "h-10 rounded-xl border text-sm font-semibold tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                mins === m
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "bg-muted border-input text-foreground/80 hover:bg-input",
                              )}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                        <Input
                          id={`duration_${i}`} type="number" inputMode="numeric" min={1} max={480}
                          placeholder="Other — type minutes" value={s.duration}
                          onChange={(e) => updateSession(i, { duration: e.target.value })}
                          className="h-11 bg-muted"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-[13px] font-medium text-muted-foreground">How hard was it? Rate about 30 min after</span>
                        <RpeScale value={s.rpe} onChange={(v) => updateSession(i, { rpe: v })} />
                      </div>

                      {s.types.includes("Sparring") && (
                        <div className="flex items-center justify-between gap-4 pt-3 border-t border-border">
                          <span className="text-sm font-medium">Sparring rounds</span>
                          <Stepper
                            value={s.rounds} onChange={(v) => updateSession(i, { rounds: v })}
                            label="sparring rounds" min={0} max={30} start={1} className="w-40"
                          />
                        </div>
                      )}
                    </SectionCard>
                  );
                })}

                {sessions.length < 5 && (
                  <button
                    type="button" onClick={addSession}
                    className="h-12 rounded-full border border-dashed border-input text-sm font-medium text-foreground/80 hover:border-primary hover:text-foreground transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="size-4" aria-hidden="true" /> Add another session
                  </button>
                )}
              </>
            )}
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col gap-2.5">
            <RatingScale
              id="diet_quality" label="Diet quality today" low="Poor" high="Perfect"
              value={diet} onChange={setDiet}
            />
            <SectionCard className="flex flex-col gap-3">
              <span className="text-[15px] font-semibold">Hitting your nutrition targets?</span>
              <YesNo value={hittingTargets} onChange={setHittingTargets} label="Hitting nutrition targets" />
            </SectionCard>

            <SectionCard className="flex flex-col gap-3">
              <span className="text-[15px] font-semibold">Any injury or pain?</span>
              <YesNo value={hasInjury} onChange={setHasInjury} label="Injury or pain to report" />
              {hasInjury && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="injury_area" className="text-[13px] font-medium text-muted-foreground">Where?</Label>
                  <Input
                    id="injury_area" placeholder="e.g. Left knee, lower back" className="h-11 bg-muted"
                    value={injuryArea} onChange={(e) => setInjuryArea(e.target.value)}
                  />
                </div>
              )}
            </SectionCard>
            {hasInjury && (
              <RatingScale
                id="injury_pain_rating" label="Pain level" low="No pain" high="Worst pain"
                words={PAIN_WORDS} value={painRating} onChange={setPainRating}
              />
            )}

            {isFemale && (
              <SectionCard className="flex flex-col gap-3">
                <span className="text-[15px] font-semibold">Did your period start today?</span>
                <YesNo value={logPeriodStart} onChange={setLogPeriodStart} label="Period started today" />
              </SectionCard>
            )}

            <SectionCard className="flex flex-col gap-2">
              <Label htmlFor="open_notes" className="text-[15px] font-semibold">Anything else for your coach?</Label>
              <textarea
                id="open_notes" rows={3} placeholder="Optional"
                value={notes} onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl border border-input bg-muted px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground resize-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </SectionCard>
          </div>
        );

      default:
        return null;
    }
  }

  // ── Footer state per step ──────────────────────────────────────────────────

  const canContinue = step === 0 ? answered === WELLBEING.length : step === 1 ? trainingValid : diet != null;
  const hint =
    step === 0 && !canContinue ? `${answered} of ${WELLBEING.length} answered`
    : step === 1 && !canContinue ? "Add a duration and RPE to each session"
    : step === 2 && !canContinue ? "Rate your diet to finish"
    : null;
  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="dark min-h-dvh bg-background text-foreground">
      <header
        className="max-w-lg mx-auto px-5 pb-4 flex flex-col gap-4"
        style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between">
          {step > 0 ? (
            <button
              type="button" onClick={() => setStep((s) => s - 1)} aria-label="Back"
              className="size-10 rounded-xl border border-input bg-card flex items-center justify-center hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : (
            <BrandMark />
          )}
          {step === 1 && !restDay ? (
            <span className="flex items-center gap-2 rounded-full border border-input bg-muted px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Today</span>
              <span className="text-sm font-semibold tabular-nums">{dayLoad} AU</span>
            </span>
          ) : computeStreak(checkInDates, today) > 0 ? (
            <span className="flex items-center gap-1.5 rounded-full border border-input bg-muted px-3 py-1.5 text-[13px] font-semibold text-orange-300">
              <Flame className="size-3.5" aria-hidden="true" />
              {computeStreak(checkInDates, today)}-day streak
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[13px] font-medium text-muted-foreground" suppressHydrationWarning>
            {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
            {isEditing ? " · Editing today's check-in" : ""}
          </p>
          <h1 className="font-display text-[34px] leading-none font-bold uppercase tracking-wide" suppressHydrationWarning>
            {step === 0 ? `${greeting()}, ${firstName}` : step === 1 ? "Today's training" : "Body & notes"}
          </h1>
        </div>

        <div className="flex flex-col gap-2" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          <div className="grid grid-cols-3 gap-1.5">
            {STEPS.map((name, i) => (
              <div key={name} className={cn("h-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-input")} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {STEPS.map((name, i) => (
              <span key={name} className={cn(i === step ? "text-foreground font-semibold" : "text-muted-foreground")}>{name}</span>
            ))}
          </div>
        </div>
      </header>

      <main
        className="max-w-lg mx-auto px-4"
        style={{ paddingBottom: "calc(9rem + env(safe-area-inset-bottom))" }}
      >
        {renderStep()}

        {status === "error" && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
      </main>

      <footer className="fixed bottom-0 inset-x-0 z-10 border-t border-border bg-background/95 backdrop-blur">
        <div
          className="max-w-lg mx-auto px-4 pt-3 flex flex-col gap-2"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {hint && <p className="text-center text-xs text-muted-foreground" aria-live="polite">{hint}</p>}
          <button
            type="button"
            disabled={!canContinue || status === "submitting"}
            onClick={isLastStep ? handleSubmit : () => { setStep((s) => s + 1); window.scrollTo({ top: 0 }); }}
            className="h-[52px] rounded-full bg-primary text-primary-foreground text-base font-semibold transition-opacity disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {status === "submitting" ? "Saving…" : isLastStep ? "Submit check-in" : step === 0 ? "Continue to training" : "Continue"}
          </button>
          {step === 0 && !savedToday && (
            <button
              type="button" onClick={handleMorningSubmit}
              disabled={!canContinue || status === "submitting"}
              className="h-8 text-[13px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
            >
              Not trained yet? Save morning check-in
            </button>
          )}
          {step === 1 && !restDay && (
            <button
              type="button" onClick={() => { setRestDay(true); setStep(2); window.scrollTo({ top: 0 }); }}
              className="h-8 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Rest day — no training
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
