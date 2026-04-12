"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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
        <Label htmlFor={id} className="text-base font-semibold text-foreground">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {children}
      </CardContent>
    </Card>
  );
}

export function CheckInForm({
  athleteId,
  athleteName,
}: {
  athleteId: string;
  athleteName: string;
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
    injury_area: "",
    injury_pain_rating: 0,
    open_notes: "",
    weight_kg: "",
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function set<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
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
      sparring_load_rounds:
        fields.sparring_load_rounds !== "" ? Number(fields.sparring_load_rounds) : null,
      session_rpe: fields.session_rpe,
      injury_area: fields.injury_area || null,
      injury_pain_rating: fields.injury_area ? fields.injury_pain_rating : null,
      open_notes: fields.open_notes || null,
      weight_kg: fields.weight_kg !== "" ? Number(fields.weight_kg) : null,
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("success");
    }
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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-5 pb-6" style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}>
        <p className="text-sm text-primary-foreground/70 mb-1">{today}</p>
        <h1 className="text-2xl font-bold">{athleteName}</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">Daily check-in</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="px-4 py-6 flex flex-col gap-4 max-w-lg mx-auto"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        {/* SLEEP */}
        <Section title="Sleep">
          <SliderField id="sleep_quality" label="Sleep quality" emoji="😴"
            value={fields.sleep_quality} onChange={(v) => set("sleep_quality", v)} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="sleep_hours" className="text-base font-semibold text-foreground">
              Hours slept
            </Label>
            <input
              id="sleep_hours"
              type="number"
              inputMode="decimal"
              min={0}
              max={24}
              step={0.5}
              placeholder="e.g. 7.5"
              value={fields.sleep_hours}
              onChange={(e) => set("sleep_hours", e.target.value)}
              className="border border-input rounded-lg px-4 py-3 text-foreground bg-background placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </Section>

        {/* BODY & MIND */}
        <Section title="Body & Mind">
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
        </Section>

        {/* NUTRITION */}
        <Section title="Nutrition">
          <SliderField id="diet_quality" label="Diet quality today" emoji="🥗"
            value={fields.diet_quality} onChange={(v) => set("diet_quality", v)} />
          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold text-foreground">Hitting nutrition targets?</p>
            <div className="flex gap-3">
              {[
                { label: "Yes", value: true },
                { label: "No",  value: false },
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
        </Section>

        {/* TRAINING LOAD */}
        <Section title="Training Load">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sparring_load_rounds" className="text-base font-semibold text-foreground">
              🥊 Sparring rounds today
            </Label>
            <input
              id="sparring_load_rounds"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="0"
              value={fields.sparring_load_rounds}
              onChange={(e) => set("sparring_load_rounds", e.target.value)}
              className="border border-input rounded-lg px-4 py-3 text-foreground bg-background placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <SliderField id="session_rpe" label="Session RPE" emoji="📊"
            value={fields.session_rpe} min={1} max={10}
            onChange={(v) => set("session_rpe", v)} />
        </Section>

        {/* INJURY */}
        <Section title="Injury / Pain">
          <div className="flex flex-col gap-2">
            <Label htmlFor="injury_area" className="text-base font-semibold text-foreground">
              🩹 Injury or pain area
            </Label>
            <input
              id="injury_area"
              type="text"
              placeholder="e.g. Left knee, lower back (leave blank if none)"
              value={fields.injury_area}
              onChange={(e) => set("injury_area", e.target.value)}
              className="border border-input rounded-lg px-4 py-3 text-foreground bg-background placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {fields.injury_area && (
            <SliderField id="injury_pain_rating" label="Pain rating"
              value={fields.injury_pain_rating}
              onChange={(v) => set("injury_pain_rating", v)} />
          )}
        </Section>

        {/* BODY WEIGHT */}
        <Section title="Body">
          <div className="flex flex-col gap-2">
            <Label htmlFor="weight_kg" className="text-base font-semibold text-foreground">
              ⚖️ Body weight (kg)
            </Label>
            <input
              id="weight_kg"
              type="number"
              inputMode="decimal"
              min={0}
              max={200}
              step={0.1}
              placeholder="e.g. 79.5 (optional)"
              value={fields.weight_kg}
              onChange={(e) => set("weight_kg", e.target.value)}
              className="border border-input rounded-lg px-4 py-3 text-foreground bg-background placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </Section>

        {/* NOTES */}
        <Section title="Anything else?">
          <div className="flex flex-col gap-2">
            <Label htmlFor="open_notes" className="text-base font-semibold text-foreground">
              💬 Open notes
            </Label>
            <textarea
              id="open_notes"
              rows={4}
              placeholder="How are you feeling? Anything to flag?"
              value={fields.open_notes}
              onChange={(e) => set("open_notes", e.target.value)}
              className="border border-input rounded-lg px-4 py-3 text-foreground bg-background placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </Section>

        {status === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={status === "submitting"}
          className="w-full h-14 text-base font-bold rounded-2xl"
        >
          {status === "submitting" ? "Submitting…" : "Submit check-in"}
        </Button>
      </form>
    </div>
  );
}
