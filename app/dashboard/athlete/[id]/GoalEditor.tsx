"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function GoalEditor({
  athleteId,
  initialGoal,
  monthYear,
}: {
  athleteId: string;
  initialGoal: string;
  monthYear: string;
}) {
  const [goal, setGoal] = useState(initialGoal);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    // Upsert: delete existing for this month then insert, or just insert if none
    const { error } = await supabase.from("monthly_goal").upsert(
      { athlete_id: athleteId, month_year: monthYear, goal_text: goal },
      { onConflict: "athlete_id,month_year" },
    );
    setSaving(false);
    if (!error) {
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">
        Monthly goal — {monthYear}
      </p>
      {editing ? (
        <div className="flex gap-2 items-start">
          <textarea
            className="flex-1 text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            rows={2}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            autoFocus
          />
          <div className="flex flex-col gap-1.5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 bg-zinc-100 text-zinc-600 text-xs font-semibold rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <p className="text-sm text-zinc-700 flex-1">
            {goal || <span className="text-zinc-400 italic">No goal set</span>}
          </p>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-amber-600 hover:text-amber-700 font-semibold shrink-0"
          >
            {saved ? "Saved ✓" : "Edit"}
          </button>
        </div>
      )}
    </div>
  );
}
