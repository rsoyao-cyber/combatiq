"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus } from "lucide-react";

const SPORTS = [
  "Boxing", "MMA", "Muay Thai", "Brazilian Jiu-Jitsu",
  "Wrestling", "Kickboxing", "Judo", "Karate", "Other",
];

const COMPETITION_LEVELS = ["Amateur", "Semi-Pro", "Professional", "Elite"];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

export function AddAthleteButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    sex: "",
    sport: "",
    weight_class: "",
    competition_level: "",
    training_age_years: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      setError("");
      setStatus("idle");
      setForm({ name: "", sex: "", sport: "", weight_class: "", competition_level: "", training_age_years: "" });
    }
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const res = await fetch("/api/create-athlete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        sex: form.sex || null,
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
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <UserPlus className="w-4 h-4" />
        Add athlete
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New athlete</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6 pt-2">

            {/* ── Athlete identity ── */}
            <div className="flex flex-col gap-4">
              <SectionLabel>Athlete</SectionLabel>

              <div className="grid gap-1.5">
                <Label htmlFor="athlete-name" className="text-sm font-medium text-foreground">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="athlete-name"
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Micah Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="athlete-sex" className="text-sm font-medium text-foreground">Sex</Label>
                  <Select value={form.sex || undefined} onValueChange={(v) => set("sex", v ?? "")}>
                    <SelectTrigger id="athlete-sex">
                      <SelectValue placeholder="Prefer not to say" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="athlete-sport" className="text-sm font-medium text-foreground">
                    Sport <span className="text-destructive">*</span>
                  </Label>
                  <Select required value={form.sport || undefined} onValueChange={(v) => set("sport", v ?? "")}>
                    <SelectTrigger id="athlete-sport">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPORTS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Physical details ── */}
            <div className="flex flex-col gap-4">
              <SectionLabel>Physical details</SectionLabel>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="athlete-weight" className="text-sm font-medium text-foreground">Weight class</Label>
                  <Input
                    id="athlete-weight"
                    value={form.weight_class}
                    onChange={(e) => set("weight_class", e.target.value)}
                    placeholder="e.g. 70 kg"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="athlete-level" className="text-sm font-medium text-foreground">Level</Label>
                  <Select value={form.competition_level || undefined} onValueChange={(v) => set("competition_level", v ?? "")}>
                    <SelectTrigger id="athlete-level">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPETITION_LEVELS.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Training background ── */}
            <div className="flex flex-col gap-4">
              <SectionLabel>Training background</SectionLabel>

              <div className="grid gap-1.5">
                <Label htmlFor="athlete-age" className="text-sm font-medium text-foreground">Training age (years)</Label>
                <Input
                  id="athlete-age"
                  type="number"
                  min="0"
                  max="40"
                  step="0.5"
                  value={form.training_age_years}
                  onChange={(e) => set("training_age_years", e.target.value)}
                  placeholder="e.g. 3"
                />
                <p className="text-xs text-muted-foreground">How many years has this athlete been training?</p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" disabled={status === "loading"} className="w-full font-bold">
                {status === "loading" ? "Saving…" : "Create athlete"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
