"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Pencil } from "lucide-react";

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
    <div className="mt-4 pt-4 border-t border-border">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        Monthly goal — {monthYear}
      </p>
      {editing ? (
        <div className="flex gap-2 items-start">
          <Textarea
            className="flex-1 text-sm resize-none"
            rows={2}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            autoFocus
          />
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="text-xs">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <p className="text-sm text-foreground flex-1">
            {goal || <span className="text-muted-foreground italic">No goal set</span>}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            className={`shrink-0 gap-1.5 text-xs ${saved ? "text-emerald-600" : "text-primary"}`}
          >
            {saved ? <><Check className="w-3 h-3" /> Saved</> : <><Pencil className="w-3 h-3" /> Edit</>}
          </Button>
        </div>
      )}
    </div>
  );
}
