"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = {
  athlete: {
    id: string;
    name: string;
    sport: string;
    weight_class: string;
    competition_level: string;
    training_age_years: number;
    sex: "male" | "female" | null;
    clinic_name: string | null;
  };
};

export function EditAthleteModal({ athlete }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: athlete.name,
    sport: athlete.sport,
    weight_class: athlete.weight_class,
    competition_level: athlete.competition_level,
    training_age_years: String(athlete.training_age_years),
    sex: athlete.sex ?? "",
    clinic_name: athlete.clinic_name ?? "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/athlete/${athlete.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        sport: form.sport,
        weight_class: form.weight_class,
        competition_level: form.competition_level,
        training_age_years: parseInt(form.training_age_years, 10),
        sex: form.sex || null,
        clinic_name: form.clinic_name || null,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
      >
        <Pencil className="w-3.5 h-3.5" /> Edit
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit athlete</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ea-name">Name</Label>
            <Input id="ea-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ea-sport">Sport</Label>
              <Input id="ea-sport" value={form.sport} onChange={(e) => set("sport", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ea-weight">Weight class</Label>
              <Input id="ea-weight" value={form.weight_class} onChange={(e) => set("weight_class", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Competition level</Label>
              <Select value={form.competition_level} onValueChange={(v) => v && set("competition_level", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Amateur">Amateur</SelectItem>
                  <SelectItem value="Semi-Pro">Semi-Pro</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Elite">Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Sex</Label>
              <Select value={form.sex} onValueChange={(v) => v && set("sex", v)}>
                <SelectTrigger><SelectValue placeholder="Not specified" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ea-age">Training age (years)</Label>
              <Input
                id="ea-age"
                type="number"
                min={0}
                max={50}
                value={form.training_age_years}
                onChange={(e) => set("training_age_years", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ea-clinic">Clinic name</Label>
              <Input id="ea-clinic" value={form.clinic_name} onChange={(e) => set("clinic_name", e.target.value)} placeholder="Optional" />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <DialogClose className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Cancel
          </DialogClose>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
