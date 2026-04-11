"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ParsedImportData, ParsedWorkoutTemplate, ParsedTrainingSession } from "@/lib/trainerize-types";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <label style={{ fontSize: 11, color: "#666" }}>{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: "4px 8px", border: "1px solid #ccc", borderRadius: 4, fontSize: 13 }}
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
    <div style={{ border: "1px solid #ddd", borderRadius: 6, marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", textAlign: "left", padding: "10px 14px",
          background: "#f8f8f8", border: "none", cursor: "pointer",
          fontWeight: 600, fontSize: 13, borderRadius: open ? "6px 6px 0 0" : 6,
          display: "flex", justifyContent: "space-between",
        }}
      >
        <span>{template.name || `Template ${index + 1}`}</span>
        <span style={{ color: "#999" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Field
              label="Name"
              value={template.name}
              onChange={(v) => onChange({ ...template, name: v })}
            />
            <Field
              label="Type"
              value={template.workout_type}
              onChange={(v) =>
                onChange({ ...template, workout_type: v as ParsedWorkoutTemplate["workout_type"] })
              }
            />
            <Field
              label="Est. duration (mins)"
              value={template.estimated_duration_mins}
              type="number"
              onChange={(v) =>
                onChange({ ...template, estimated_duration_mins: v ? Number(v) : null })
              }
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <label style={{ fontSize: 11, color: "#666" }}>Equipment (comma-separated)</label>
            <input
              value={template.equipment.join(", ")}
              onChange={(e) =>
                onChange({ ...template, equipment: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
              }
              style={{ padding: "4px 8px", border: "1px solid #ccc", borderRadius: 4, fontSize: 13 }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <label style={{ fontSize: 11, color: "#666" }}>Instructions</label>
            <textarea
              rows={4}
              value={template.instructions}
              onChange={(e) => onChange({ ...template, instructions: e.target.value })}
              style={{ padding: "4px 8px", border: "1px solid #ccc", borderRadius: 4, fontSize: 13, resize: "vertical" }}
            />
          </div>

          {template.power_benchmarks.length > 0 && (
            <div>
              <p style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>
                Power benchmarks ({template.power_benchmarks.length})
              </p>
              <table style={{ fontSize: 12, width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f4f4f4" }}>
                    <th style={th}>Rep</th>
                    <th style={th}>Threshold (W)</th>
                    <th style={th}>Action if below</th>
                  </tr>
                </thead>
                <tbody>
                  {template.power_benchmarks.map((b, i) => (
                    <tr key={i}>
                      <td style={td}>{b.rep_number}</td>
                      <td style={td}>{b.threshold_watts}</td>
                      <td style={td}>{b.action_if_below}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── table styles ──────────────────────────────────────────────────────────

const th: React.CSSProperties = {
  padding: "6px 10px", textAlign: "left", fontWeight: 600,
  borderBottom: "1px solid #ddd", fontSize: 12,
};
const td: React.CSSProperties = {
  padding: "6px 10px", borderBottom: "1px solid #eee", fontSize: 12,
};

// ─── helpers ───────────────────────────────────────────────────────────────

/** Reads the import snapshot from sessionStorage. Browser-only. */
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
  // Lazy initialisers avoid calling setState inside an effect.
  const [data, setData] = useState<ParsedImportData | null>(
    () => getImportSnapshot()?.parsed ?? null,
  );
  const [filename] = useState(
    () => getImportSnapshot()?.filename ?? "",
  );
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

  // Redirect to upload step if no import data is present in this session.
  useEffect(() => {
    if (!sessionStorage.getItem("combatiq_import_data")) {
      router.push("/dashboard/import");
    }
  }, [router]);

  if (!data) return <p style={{ padding: 24 }}>Loading…</p>;

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
      <div style={{ padding: 24, maxWidth: 800 }}>
        <h1>Import confirmed</h1>
        <pre style={{ background: "#f4f4f4", padding: 16, fontSize: 12, overflow: "auto" }}>
          {JSON.stringify(successSummary, null, 2)}
        </pre>
        <button onClick={() => router.push("/dashboard/import")} style={{ marginTop: 16 }}>
          Import another
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1>Review import — {data.athlete_name}</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 24 }}>File: {filename}</p>

      {/* ── 1. Program details ── */}
      <h2 style={{ fontSize: 15, marginBottom: 10 }}>Program details</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
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
      </div>

      {/* ── 2. Workout templates ── */}
      <h2 style={{ fontSize: 15, marginBottom: 10 }}>
        Workout templates ({data.workout_templates.length})
      </h2>
      <div style={{ marginBottom: 24 }}>
        {data.workout_templates.map((t, i) => (
          <TemplateCard key={i} template={t} index={i} onChange={(u) => updateTemplate(i, u)} />
        ))}
      </div>

      {/* ── 3. Training sessions ── */}
      <h2 style={{ fontSize: 15, marginBottom: 10 }}>
        Training sessions ({sessions.length})
      </h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f4f4f4" }}>
            <th style={th}>Date</th>
            <th style={th}>Workout</th>
            <th style={th}>Sets</th>
            <th style={th}>RPE (1–10)</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s, i) => (
            <tr key={i}>
              <td style={td}>{s.session_date}</td>
              <td style={td}>{s.workout_template_name}</td>
              <td style={td}>{s.exercise_sets.length}</td>
              <td style={td}>
                <input
                  type="number"
                  min={1}
                  max={10}
                  placeholder="—"
                  value={s.session_rpe ?? ""}
                  onChange={(e) => updateSessionRpe(i, e.target.value)}
                  style={{ width: 60, padding: "2px 6px", border: "1px solid #ccc", borderRadius: 4 }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── 4. Summary ── */}
      <div style={{
        background: "#f8f8f8", border: "1px solid #ddd", borderRadius: 6,
        padding: 16, marginBottom: 24, display: "flex", gap: 32,
      }}>
        <div><strong>1</strong><br /><span style={{ fontSize: 12, color: "#666" }}>Program</span></div>
        <div><strong>{data.workout_templates.length}</strong><br /><span style={{ fontSize: 12, color: "#666" }}>Templates</span></div>
        <div><strong>{sessions.length}</strong><br /><span style={{ fontSize: 12, color: "#666" }}>Sessions</span></div>
        <div><strong>{totalSets}</strong><br /><span style={{ fontSize: 12, color: "#666" }}>Sets</span></div>
        <div><strong>{data.athlete_name}</strong><br /><span style={{ fontSize: 12, color: "#666" }}>Athlete</span></div>
      </div>

      {submitStatus === "error" && (
        <p style={{ color: "red", marginBottom: 12 }}>Error: {submitError}</p>
      )}

      {submitStatus === "duplicate" && (
        <div style={{ marginBottom: 12, padding: 12, background: "#fff8e1", border: "1px solid #f0c040", borderRadius: 6 }}>
          <p style={{ marginBottom: 8, fontSize: 13 }}>
            This program has already been imported. Do you want to proceed anyway?
          </p>
          <button
            onClick={() => handleConfirm(true)}
            style={{ padding: "6px 16px", background: "#c0392b", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
          >
            Yes, import anyway
          </button>
          <button
            onClick={() => setSubmitStatus("idle")}
            style={{ marginLeft: 8, padding: "6px 16px", background: "#eee", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
          >
            Cancel
          </button>
        </div>
      )}

      <button
        onClick={() => handleConfirm()}
        disabled={submitStatus === "loading" || submitStatus === "duplicate"}
        style={{
          padding: "10px 28px", background: "#1a1a1a", color: "#fff",
          border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer",
        }}
      >
        {submitStatus === "loading" ? "Importing…" : "Confirm Import"}
      </button>
    </div>
  );
}
