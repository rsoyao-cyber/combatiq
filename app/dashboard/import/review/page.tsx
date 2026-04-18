"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ParsedImportData, ParsedWorkoutTemplate, ParsedTrainingSession } from "@/lib/trainerize-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

// ─── helpers ───────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number | null;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  );
}

// ─── template card ─────────────────────────────────────────────────────────

function TemplateCard({
  template,
  index,
  onChange,
}: {
  template: ParsedWorkoutTemplate;
  index: number;
  onChange: (t: ParsedWorkoutTemplate) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg"
      >
        <span className="text-sm font-semibold">{template.name || `Template ${index + 1}`}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <CardContent className="flex flex-col gap-4 pt-0">
          <Separator />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Name" value={template.name}
              onChange={(v) => onChange({ ...template, name: v })} />
            <Field label="Type" value={template.workout_type}
              onChange={(v) => onChange({ ...template, workout_type: v as ParsedWorkoutTemplate["workout_type"] })} />
            <Field label="Est. duration (mins)" value={template.estimated_duration_mins} type="number"
              onChange={(v) => onChange({ ...template, estimated_duration_mins: v ? Number(v) : null })} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Equipment (comma-separated)</Label>
            <Input
              value={template.equipment.join(", ")}
              onChange={(e) =>
                onChange({ ...template, equipment: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
              }
              className="h-8 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Instructions</Label>
            <textarea
              rows={3}
              value={template.instructions}
              onChange={(e) => onChange({ ...template, instructions: e.target.value })}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-vertical"
            />
          </div>

          {template.power_benchmarks.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Power benchmarks ({template.power_benchmarks.length})
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Rep</TableHead>
                    <TableHead className="text-xs">Threshold (W)</TableHead>
                    <TableHead className="text-xs">Action if below</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {template.power_benchmarks.map((b, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{b.rep_number}</TableCell>
                      <TableCell className="text-xs">{b.threshold_watts}</TableCell>
                      <TableCell className="text-xs">{b.action_if_below}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────

function getImportSnapshot() {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("combatiq_import_data");
  if (!raw) return null;
  return JSON.parse(raw) as {
    parsed: ParsedImportData;
    filename: string;
    athleteId: string | null;
  };
}

// ─── main page ─────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const router = useRouter();
  const [data, setData] = useState<ParsedImportData | null>(
    () => getImportSnapshot()?.parsed ?? null,
  );
  const [filename] = useState(() => getImportSnapshot()?.filename ?? "");
  const [lockedAthleteId] = useState<string | null>(
    () => getImportSnapshot()?.athleteId ?? null,
  );
  const [sessions, setSessions] = useState<ParsedTrainingSession[]>(
    () =>
      getImportSnapshot()?.parsed.training_sessions.map((s) => ({
        ...s,
        session_rpe: null,
      })) ?? [],
  );
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error" | "duplicate">("idle");
  const [submitError, setSubmitError] = useState("");
  const [successSummary, setSuccessSummary] = useState<unknown>(null);

  useEffect(() => {
    if (!sessionStorage.getItem("combatiq_import_data")) {
      router.push("/dashboard/import");
    }
  }, [router]);

  if (!data) return <p className="p-6 text-muted-foreground text-sm">Loading…</p>;

  const totalSets = sessions.reduce((sum, s) => sum + s.exercise_sets.length, 0);

  function updateProgram(key: keyof ParsedImportData["program"], value: string) {
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, program: { ...prev.program, [key]: value || null } };
    });
  }

  function updateTemplate(index: number, t: ParsedImportData["workout_templates"][number]) {
    setData((prev) => {
      if (!prev) return prev;
      const templates = [...prev.workout_templates];
      templates[index] = t;
      return { ...prev, workout_templates: templates };
    });
  }

  function updateSessionRpe(index: number, rpe: string) {
    setSessions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], session_rpe: rpe ? Number(rpe) : null };
      return next;
    });
  }

  async function handleConfirm(force = false) {
    if (!data) return;
    setSubmitStatus("loading");
    setSubmitError("");

    const payload = { ...data, training_sessions: sessions, filename, force, athleteId: lockedAthleteId };

    const res = await fetch("/api/confirm-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (res.status === 409 && json.duplicate) {
      setSubmitStatus("duplicate");
      return;
    }

    if (!res.ok) {
      const detail = json.detail ? ` — ${json.detail}` : "";
      setSubmitError((json.error ?? "Unknown error") + detail);
      setSubmitStatus("error");
    } else {
      setSuccessSummary(json);
      setSubmitStatus("success");
      sessionStorage.removeItem("combatiq_import_data");
    }
  }

  if (submitStatus === "success") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-6">
        <h1 className="text-xl font-bold text-foreground">Import confirmed</h1>
        <pre className="bg-muted rounded-lg p-4 text-xs text-muted-foreground overflow-auto">
          {JSON.stringify(successSummary, null, 2)}
        </pre>
        <Button onClick={() => router.push("/dashboard/import")} className="self-start">
          Import another
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Review import — {data.athlete_name}</h1>
        <p className="text-muted-foreground text-sm mt-1">File: {filename}</p>
      </div>

      {/* ── Stat strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="sm:col-span-1">
          <CardContent className="pt-4 pb-4">
            <p className="text-base font-bold text-foreground truncate">{data.athlete_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Athlete</p>
          </CardContent>
        </Card>
        {[
          { label: "Program", value: 1 },
          { label: "Templates", value: data.workout_templates.length },
          { label: "Sessions", value: sessions.length },
          { label: "Sets", value: totalSets },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── 1. Program details ── */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Program details</h2>
        <Card>
          <CardContent className="pt-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Program name" value={data.program.name}
              onChange={(v) => updateProgram("name", v)} />
            <Field label="Phase number" value={data.program.phase_number} type="number"
              onChange={(v) => updateProgram("phase_number", v)} />
            <Field label="Start date" value={data.program.start_date} type="date"
              onChange={(v) => updateProgram("start_date", v)} />
            <Field label="End date" value={data.program.end_date} type="date"
              onChange={(v) => updateProgram("end_date", v)} />
            <Field label="Total weeks" value={data.program.total_weeks} type="number"
              onChange={(v) => updateProgram("total_weeks", v)} />
            <Field label="Trainerize plan ID" value={data.program.trainerize_plan_id} type="number"
              onChange={(v) => updateProgram("trainerize_plan_id", v)} />
          </CardContent>
        </Card>
      </div>

      {/* ── 2. Workout templates ── */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workout templates</span>
          <Badge variant="outline" className="ml-2 text-xs font-normal">{data.workout_templates.length}</Badge>
        </h2>
        <div className="flex flex-col gap-2">
          {data.workout_templates.map((t, i) => (
            <TemplateCard key={i} template={t} index={i} onChange={(u) => updateTemplate(i, u)} />
          ))}
        </div>
      </div>

      {/* ── 3. Training sessions ── */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Training sessions</span>
          <Badge variant="outline" className="ml-2 text-xs font-normal">{sessions.length}</Badge>
        </h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Workout</TableHead>
                <TableHead>Sets</TableHead>
                <TableHead>RPE (1–10)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium tabular-nums text-sm">{s.session_date}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.workout_template_name}</TableCell>
                  <TableCell className="text-sm">{s.exercise_sets.length}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      placeholder="—"
                      value={s.session_rpe ?? ""}
                      onChange={(e) => updateSessionRpe(i, e.target.value)}
                      className="w-16 h-7 text-xs px-2"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-col gap-3">
        {submitStatus === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {submitStatus === "duplicate" && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-3">This program has already been imported. Import anyway?</p>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={() => handleConfirm(true)}>
                  Yes, import anyway
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSubmitStatus("idle")}>
                  Cancel
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => handleConfirm()}
            disabled={submitStatus === "loading" || submitStatus === "duplicate"}
            className="font-semibold"
          >
            {submitStatus === "loading" ? "Importing…" : "Confirm import"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/import")}
            disabled={submitStatus === "loading"}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
