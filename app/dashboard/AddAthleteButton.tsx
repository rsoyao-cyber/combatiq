"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SPORTS = ["Boxing", "MMA", "Muay Thai", "Brazilian Jiu-Jitsu", "Wrestling", "Kickboxing", "Judo", "Karate", "Other"];

const COMPETITION_LEVELS = ["Amateur", "Semi-professional", "Professional", "Elite"];

export function AddAthleteButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    sport: "",
    weight_class: "",
    competition_level: "",
    training_age_years: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const res = await fetch("/api/create-athlete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        sport: form.sport,
        weight_class: form.weight_class,
        competition_level: form.competition_level,
        training_age_years: form.training_age_years ? Number(form.training_age_years) : null,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Failed to create athlete");
      setStatus("error");
      return;
    }

    setStatus("idle");
    setOpen(false);
    setForm({ name: "", sport: "", weight_class: "", competition_level: "", training_age_years: "" });
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-amber-400 text-zinc-900 text-sm font-bold rounded-xl hover:bg-amber-300 transition-colors"
      >
        + Add athlete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900">New athlete</h2>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700 text-lg leading-none">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Micah Smith"
                  className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              {/* Sport */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Sport *</label>
                <select
                  required
                  value={form.sport}
                  onChange={(e) => set("sport", e.target.value)}
                  className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                >
                  <option value="">Select sport…</option>
                  {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Weight class + Competition level side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Weight class</label>
                  <input
                    type="text"
                    value={form.weight_class}
                    onChange={(e) => set("weight_class", e.target.value)}
                    placeholder="e.g. 70 kg"
                    className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Level</label>
                  <select
                    value={form.competition_level}
                    onChange={(e) => set("competition_level", e.target.value)}
                    className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                  >
                    <option value="">Select…</option>
                    {COMPETITION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {/* Training age */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Training age (years)</label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  step="0.5"
                  value={form.training_age_years}
                  onChange={(e) => set("training_age_years", e.target.value)}
                  placeholder="e.g. 3"
                  className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 border border-zinc-200 text-zinc-600 text-sm font-semibold rounded-xl hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="flex-1 px-4 py-2 bg-amber-400 text-zinc-900 text-sm font-bold rounded-xl hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {status === "loading" ? "Saving…" : "Create athlete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
