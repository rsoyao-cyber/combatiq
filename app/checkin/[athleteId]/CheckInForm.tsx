"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// ─── Slider ───────────────────────────────────────────────────────────────────

const SLIDER_LABELS: Record<string, [string, string]> = {
  sleep_quality:      ["Very poor",  "Excellent"],
  physical_fatigue:   ["Fresh",      "Exhausted"],
  mental_focus:       ["Scattered",  "Locked in"],
  motivation:         ["None",       "Fired up"],
  mood:               ["Low",        "Great"],
  stress:             ["Calm",       "Overwhelmed"],
  diet_quality:       ["Poor",       "Perfect"],
  injury_pain_rating: ["No pain",    "Worst pain"],
};

function SliderField({
  id,
  label,
  value,
  min = 0,
  max = 5,
  onChange,
  emoji,
}: {
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  emoji?: string;
}) {
  const [low, high] = SLIDER_LABELS[id] ?? ["Low", "High"];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {emoji && <span className="mr-2">{emoji}</span>}
          {label}
        </Label>
        <span className="text-2xl font-bold text-primary tabular-nums w-8 text-right">
          {value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted [accent-color:var(--primary)]"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

// ─── Checkbox toggle ──────────────────────────────────────────────────────────

function CheckToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 w-full rounded-xl border px-4 py-4 text-left transition-colors ${
        checked
          ? "bg-primary/10 border-primary"
          : "bg-background border-input hover:bg-muted"
      }`}
    >
      <span
        className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${
          checked ? "bg-primary border-primary" : "border-input bg-background"
        }`}
      >
        {checked && (
          <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function CheckInForm({
  athleteId,
  athleteName,
  isFemale = false,
}: {
  athleteId: string;
  athleteName: string;
  isFemale?: boolean;
}) {
  const today = new Date().toISOString().split("T")[0];

  const [fields, setFields] = useState({
    sleep_quality: 3,
    sleep_hours: "",
    physical_fatigue: 3,
    mental_focus: 3,
    motivation: 3,
    mood: 3,
    stress: 3,
    diet_quality: 3,
    hitting_nutrition_targets: null as boolean | null,
    sparring_load_rounds: "",
    session_rpe: 5,
    session_duration_mins: "",
    injury_area: "",
    injury_pain_rating: 0,
    open_notes: "",
    weight_kg: "",
  });

  const [hasInjury, setHasInjury] = useState(false);
  const [logPeriodStart, setLogPeriodStart] = useState(false);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function set<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  const STEPS = [
    "Wellbeing",
    "Training Load",
    "Nutrition & Body",
    "Injury & Notes",
    ...(isFemale ? ["Cycle"] : []),
  ];
  const totalSteps = STEPS.length;
  const isLastStep = step === totalSteps - 1;

  async function handleSubmit() {
    setStatus("submitting");

    const { error } = await supabase.from("daily_check_in").insert({
      athlete_id: athleteId,
      checkin_date: today,
      sleep_quality: fields.sleep_quality,
      sleep_hours: fields.sleep_hours !== "" ? Number(fields.sleep_hours) : null,
      physical_fatigue: fields.physical_fatigue,
      mental_focus: fields.mental_focus,
      motivation: fields.motivation,
      mood: fields.mood,
      stress: fields.stress,
      diet_quality: fields.diet_quality,
      hitting_nutrition_targets: fields.hitting_nutrition_targets,
      sparring_load_rounds: fields.sparring_load_rounds !== "" ? Number(fields.sparring_load_rounds) : null,
      session_rpe: fields.session_rpe,
      session_duration_mins: fields.session_duration_mins !== "" ? Number(fields.session_duration_mins) : null,
      injury_area: hasInjury ? (fields.injury_area || null) : null,
      injury_pain_rating: hasInjury && fields.injury_area ? fields.injury_pain_rating : null,
      open_notes: fields.open_notes || null,
      weight_kg: fields.weight_kg !== "" ? Number(fields.weight_kg) : null,
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }

    if (logPeriodStart) {
      await fetch("/api/log-cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athlete_id: athleteId, cycle_start_date: today }),
      });
    }

    setStatus("success");
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">✅</div>
        <h1 className="text-2xl font-bold text-foreground">Check-in submitted</h1>
        <p className="text-muted-foreground">Thanks {athleteName}. See you tomorrow.</p>
      </div>
    );
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <Card>
            <CardContent className="pt-5 flex flex-col gap-6">
              <SectionLabel>Sleep</SectionLabel>
              <SliderField id="sleep_quality" label="Sleep quality" emoji="😴"
                value={fields.sleep_quality} onChange={(v) => set("sleep_quality", v)} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sleep_hours" className="text-sm font-medium text-foreground">Hours slept</Label>
                <Input id="sleep_hours" type="number" inputMode="decimal" min={0} max={24} step={0.5}
                  placeholder="e.g. 7.5" value={fields.sleep_hours}
                  onChange={(e) => set("sleep_hours", e.target.value)} />
                <p className="text-xs text-muted-foreground">Optional</p>
              </div>
              <div className="border-t border-border pt-2" />
              <SectionLabel>Body &amp; Mind</SectionLabel>
              <SliderField id="physical_fatigue" label="Physical fatigue" emoji="💪"
                value={fields.physical_fatigue} onChange={(v) => set("physical_fatigue", v)} />
              <SliderField id="mental_focus" label="Mental focus" emoji="🧠"
                value={fields.mental_focus} onChange={(v) => set("mental_focus", v)} />
              <SliderField id="motivation" label="Motivation" emoji="🔥"
                value={fields.motivation} onChange={(v) => set("motivation", v)} />
              <SliderField id="mood" label="Mood" emoji="😊"
                value={fields.mood} onChange={(v) => set("mood", v)} />
              <SliderField id="stress" label="Stress" emoji="😤"
                value={fields.stress} onChange={(v) => set("stress", v)} />
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <Card>
            <CardContent className="pt-5 flex flex-col gap-6">
              <SectionLabel>Session</SectionLabel>
              <SliderField id="session_rpe" label="Session RPE" emoji="📊"
                value={fields.session_rpe} min={1} max={10}
                onChange={(v) => set("session_rpe", v)} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="session_duration_mins" className="text-sm font-medium text-foreground">
                  ⏱️ Session duration (minutes)
                </Label>
                <Input id="session_duration_mins" type="number" inputMode="numeric" min={0} max={480}
                  placeholder="e.g. 60" value={fields.session_duration_mins}
                  onChange={(e) => set("session_duration_mins", e.target.value)} />
                <p className="text-xs text-muted-foreground">Used to calculate training load</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sparring_load_rounds" className="text-sm font-medium text-foreground">
                  🥊 Sparring rounds today
                </Label>
                <Input id="sparring_load_rounds" type="number" inputMode="numeric" min={0}
                  placeholder="0" value={fields.sparring_load_rounds}
                  onChange={(e) => set("sparring_load_rounds", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardContent className="pt-5 flex flex-col gap-6">
              <SectionLabel>Nutrition</SectionLabel>
              <SliderField id="diet_quality" label="Diet quality today" emoji="🥗"
                value={fields.diet_quality} onChange={(v) => set("diet_quality", v)} />
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">Hitting nutrition targets?</p>
                <div className="flex gap-3">
                  {[
                    { label: "Yes", value: true },
                    { label: "No", value: false },
                  ].map(({ label, value }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => set("hitting_nutrition_targets", value)}
                      className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors border ${
                        fields.hitting_nutrition_targets === value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-input hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-border pt-2" />
              <SectionLabel>Body</SectionLabel>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="weight_kg" className="text-sm font-medium text-foreground">
                  ⚖️ Body weight (kg)
                </Label>
                <Input id="weight_kg" type="number" inputMode="decimal" min={0} max={200} step={0.1}
                  placeholder="e.g. 79.5" value={fields.weight_kg}
                  onChange={(e) => set("weight_kg", e.target.value)} />
                <p className="text-xs text-muted-foreground">Optional</p>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardContent className="pt-5 flex flex-col gap-6">
              <SectionLabel>Injury / Pain</SectionLabel>
              <CheckToggle
                checked={hasInjury}
                onChange={setHasInjury}
                label="🩹 I have an injury to report"
              />
              {hasInjury && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="injury_area" className="text-sm font-medium text-foreground">
                      Injury or pain area
                    </Label>
                    <Input id="injury_area" type="text"
                      placeholder="e.g. Left knee, lower back"
                      value={fields.injury_area}
                      onChange={(e) => set("injury_area", e.target.value)} />
                  </div>
                  <SliderField id="injury_pain_rating" label="Pain rating"
                    value={fields.injury_pain_rating}
                    onChange={(v) => set("injury_pain_rating", v)} />
                </>
              )}
              <div className="border-t border-border pt-2" />
              <SectionLabel>Notes</SectionLabel>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="open_notes" className="text-sm font-medium text-foreground">
                  💬 Open notes
                </Label>
                <textarea
                  id="open_notes"
                  rows={4}
                  placeholder="How are you feeling? Anything to flag?"
                  value={fields.open_notes}
                  onChange={(e) => set("open_notes", e.target.value)}
                  className="border border-input rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return isFemale ? (
          <Card>
            <CardContent className="pt-5 flex flex-col gap-6">
              <SectionLabel>Cycle</SectionLabel>
              <CheckToggle
                checked={logPeriodStart}
                onChange={setLogPeriodStart}
                label="🩸 Log period start today"
              />
              {logPeriodStart && (
                <p className="text-xs text-muted-foreground">
                  This will update your cycle phase on the dashboard.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null;

      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className="bg-primary text-primary-foreground px-5 pb-5"
        style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}
      >
        <p className="text-sm text-primary-foreground/70 mb-1">{today}</p>
        <h1 className="text-2xl font-bold">{athleteName}</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">Daily check-in</p>
      </header>

      {/* Progress indicator */}
      <div className="px-4 pt-5 pb-3 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {STEPS[step]}
          </span>
          <span className="text-xs text-muted-foreground">
            Step {step + 1} of {totalSteps}
          </span>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div
        className="px-4 pb-4 max-w-lg mx-auto"
        style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      >
        {renderStep()}

        {status === "error" && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Fixed bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-background border-t border-border">
        <div
          className="max-w-lg mx-auto px-4 py-3 flex gap-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12"
              onClick={() => setStep((s) => s - 1)}
            >
              ← Back
            </Button>
          )}
          {isLastStep ? (
            <Button
              type="button"
              className="flex-1 h-12 font-bold"
              disabled={status === "submitting"}
              onClick={handleSubmit}
            >
              {status === "submitting" ? "Submitting…" : "Submit check-in"}
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1 h-12 font-bold"
              onClick={() => setStep((s) => s + 1)}
            >
              Next →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
