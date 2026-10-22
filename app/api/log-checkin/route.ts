import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CheckInSchema, type CheckInSessionInput } from "@/lib/schemas";
import { sessionLoad, summariseDay } from "@/lib/load";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "placeholder");
}

function rating(value: number, max = 5): string {
  return `${value}/${max}`;
}

function flag(value: boolean | null | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

function buildEmailHtml(data: {
  athlete_name: string;
  checkin_date: string;
  mood: number;
  sleep_quality: number;
  sleep_hours?: number | null;
  physical_fatigue: number;
  mental_focus: number;
  motivation: number;
  stress: number;
  diet_quality: number;
  hitting_nutrition_targets?: boolean | null;
  sessions: CheckInSessionInput[];
  weight_kg?: number | null;
  injury_area?: string | null;
  injury_pain_rating?: number | null;
  open_notes?: string | null;
  check_in_timing?: string | null;
}): string {
  const hasInjury = !!data.injury_area;
  const injuryColour = hasInjury && (data.injury_pain_rating ?? 0) >= 3 ? "#dc2626" : "#d97706";

  const day = summariseDay(data.sessions);

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#71717a;font-size:13px;white-space:nowrap;">${label}</td>
      <td style="padding:6px 0;color:#09090b;font-size:13px;font-weight:600;">${value}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#7c3aed);padding:24px 28px;">
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">CombatIQ · Daily Check-in</p>
            <h1 style="margin:4px 0 0;color:#ffffff;font-size:22px;font-weight:700;">${data.athlete_name}</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">${data.checkin_date}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:24px 28px;">

          ${data.check_in_timing === "morning_only" ? `
          <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
            <p style="margin:0;color:#4338ca;font-weight:700;font-size:13px;">🌅 Morning check-in — session data not yet logged</p>
          </div>` : ""}

          ${hasInjury ? `
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
            <p style="margin:0;color:${injuryColour};font-weight:700;font-size:13px;">⚠️ Injury flagged: ${data.injury_area}${data.injury_pain_rating != null ? ` — pain ${data.injury_pain_rating}/5` : ""}</p>
          </div>` : ""}

          <p style="margin:0 0 12px;color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Wellbeing</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
            ${row("Mood", rating(data.mood))}
            ${row("Sleep quality", rating(data.sleep_quality))}
            ${row("Hours slept", data.sleep_hours != null ? `${data.sleep_hours}h` : "—")}
            ${row("Physical fatigue", rating(data.physical_fatigue))}
            ${row("Mental focus", rating(data.mental_focus))}
            ${row("Motivation", rating(data.motivation))}
            ${row("Stress", rating(data.stress))}
          </table>

          <p style="margin:0 0 12px;color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Training</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
            ${data.sessions.length === 0 ? row("Sessions", data.check_in_timing === "morning_only" ? "Not logged yet" : "Rest day") : data.sessions.map((s, i) =>
              row(
                `Session ${i + 1}`,
                `${s.session_types.length ? s.session_types.join(", ") : "Training"} · ${s.duration_mins} min · RPE ${s.rpe}/10 · ${sessionLoad(s.rpe, s.duration_mins)} AU${s.sparring_rounds ? ` · ${s.sparring_rounds} sparring rounds` : ""}`,
              ),
            ).join("")}
            ${day.count > 1 ? row("Day total", `${day.totalMins} min · ${day.totalLoad} AU`) : ""}
          </table>

          <p style="margin:0 0 12px;color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Nutrition &amp; Body</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
            ${row("Diet quality", rating(data.diet_quality))}
            ${row("Hitting targets", flag(data.hitting_nutrition_targets))}
            ${row("Body weight", data.weight_kg != null ? `${data.weight_kg} kg` : "—")}
          </table>

          ${data.open_notes ? `
          <p style="margin:0 0 8px;color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Notes</p>
          <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;color:#09090b;font-size:13px;line-height:1.6;">${data.open_notes.replace(/\n/g, "<br>")}</div>
          ` : ""}

        </td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 28px;border-top:1px solid #f4f4f5;">
            <p style="margin:0;color:#a1a1aa;font-size:12px;">Sent automatically by CombatIQ when an athlete submits their daily check-in.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = CheckInSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.issues },
      { status: 400 },
    );
  }

  const {
    athlete_id,
    athlete_name,
    checkin_date,
    log_period_start,
    sessions: sessionsInput,
    session_rpe,
    session_duration_mins,
    sparring_load_rounds,
    session_types,
    ...checkinFields
  } = result.data;

  // Derive timing if not explicitly provided
  const hasSessionData = sessionsInput !== undefined || session_rpe != null;
  const check_in_timing =
    checkinFields.check_in_timing ?? (hasSessionData ? "complete" : "morning_only");

  // Forms loaded before per-session records send one daily aggregate instead.
  // Only a recorded duration counts as a session (RPE alone was the slider default).
  const sessions: CheckInSessionInput[] =
    sessionsInput ??
    (session_rpe != null && session_duration_mins != null && session_duration_mins >= 1
      ? [{
          session_types: session_types ?? [],
          duration_mins: session_duration_mins,
          rpe: session_rpe,
          sparring_rounds: sparring_load_rounds ?? null,
        }]
      : []);

  // ── 1. Upsert check-in (handles both first submit and post-training completion) ──
  const { data: checkIn, error: dbError } = await supabaseAdmin.from("daily_check_in").upsert(
    {
      athlete_id,
      checkin_date,
      sleep_quality: checkinFields.sleep_quality,
      sleep_hours: checkinFields.sleep_hours ?? null,
      physical_fatigue: checkinFields.physical_fatigue,
      mental_focus: checkinFields.mental_focus,
      motivation: checkinFields.motivation,
      mood: checkinFields.mood,
      stress: checkinFields.stress,
      diet_quality: checkinFields.diet_quality,
      hitting_nutrition_targets: checkinFields.hitting_nutrition_targets ?? null,
      injury_area: checkinFields.injury_area ?? null,
      injury_pain_rating: checkinFields.injury_pain_rating ?? null,
      open_notes: checkinFields.open_notes ?? null,
      weight_kg: checkinFields.weight_kg ?? null,
      check_in_timing,
    },
    { onConflict: "athlete_id,checkin_date" },
  ).select("id").single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // ── 1b. Replace the day's sessions (full submits only — a morning-only
  //        submit must not wipe sessions already logged) ─────────────────────
  if (check_in_timing === "complete") {
    const { error: sessionError } = await supabaseAdmin.rpc("replace_check_in_sessions", {
      p_check_in_id: checkIn.id,
      p_sessions: sessions,
    });

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }
  }

  // ── 2. Log menstrual cycle if flagged ────────────────────────────────────
  if (log_period_start) {
    await supabaseAdmin.from("menstrual_cycle").insert({
      athlete_id,
      cycle_start_date: checkin_date,
      cycle_length_days: 28,
    });
  }

  // ── 3. Send email notification ───────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && process.env.RESEND_API_KEY) {
    await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || "CombatIQ <onboarding@resend.dev>",
      to: adminEmail,
      subject: `${check_in_timing === "morning_only" ? "Morning check-in" : "Check-in"}: ${athlete_name} · ${checkin_date}`,
      html: buildEmailHtml({ athlete_name, checkin_date, ...checkinFields, sessions, check_in_timing }),
    });
  }

  return NextResponse.json({ ok: true });
}
