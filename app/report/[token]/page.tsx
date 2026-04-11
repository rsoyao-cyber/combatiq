import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { DownloadPDFButton } from "@/components/DownloadPDFButton";

// ─── types ────────────────────────────────────────────────────────────────────

type MonthlyReport = {
  summary: string;
  performance_narrative: { power: string; strength: string; conditioning: string };
  wellbeing_summary: string;
  strengths: string[];
  development_areas: string[];
  next_steps: string[];
};

type PrefightReport = {
  readiness_statement: string;
  preparation_highlights: string[];
  physical_benchmarks: { metric: string; value: string; interpretation: string }[];
  camp_summary: string;
};

// ─── components ───────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function GreenCard({ text }: { text: string }) {
  return (
    <div className="flex gap-3 items-start border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3">
      <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
      <p className="text-sm text-emerald-800 leading-relaxed">{text}</p>
    </div>
  );
}

function AmberCard({ text }: { text: string }) {
  return (
    <div className="flex gap-3 items-start border border-amber-200 bg-amber-50 rounded-xl px-4 py-3">
      <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
      <p className="text-sm text-amber-800 leading-relaxed">{text}</p>
    </div>
  );
}

function MonthlyView({ report, athleteName }: { report: MonthlyReport; athleteName: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 flex flex-col gap-8">
      <div className="border-b border-zinc-100 pb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">
          Monthly Performance Review
        </p>
        <h1 className="text-xl font-bold text-zinc-900">{athleteName}</h1>
      </div>

      <Section title="Summary">
        <p className="text-sm text-zinc-700 leading-relaxed">{report.summary}</p>
      </Section>

      <Section title="Training Performance">
        {(["power", "strength", "conditioning"] as const).map((key) => (
          <div key={key}>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1 capitalize">{key}</p>
            <p className="text-sm text-zinc-700 leading-relaxed">{report.performance_narrative[key]}</p>
          </div>
        ))}
      </Section>

      <Section title="Wellbeing">
        <p className="text-sm text-zinc-700 leading-relaxed">{report.wellbeing_summary}</p>
      </Section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Section title="Strengths">
          <div className="flex flex-col gap-2">
            {report.strengths.map((s, i) => <GreenCard key={i} text={s} />)}
          </div>
        </Section>
        <Section title="Development Areas">
          <div className="flex flex-col gap-2">
            {report.development_areas.map((s, i) => <AmberCard key={i} text={s} />)}
          </div>
        </Section>
      </div>

      <Section title="Next Steps">
        <ol className="flex flex-col gap-2">
          {report.next_steps.map((step, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-zinc-700 leading-relaxed">{step}</p>
            </div>
          ))}
        </ol>
      </Section>
    </div>
  );
}

function PrefightView({ report, athleteName }: { report: PrefightReport; athleteName: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 flex flex-col gap-8">
      <div className="border-b border-zinc-100 pb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">
          Pre-Fight Readiness Report
        </p>
        <h1 className="text-xl font-bold text-zinc-900">{athleteName}</h1>
      </div>

      <Section title="Readiness">
        <p className="text-sm text-zinc-700 leading-relaxed">{report.readiness_statement}</p>
      </Section>

      <Section title="Preparation Highlights">
        <div className="flex flex-col gap-2">
          {report.preparation_highlights.map((s, i) => <GreenCard key={i} text={s} />)}
        </div>
      </Section>

      <Section title="Physical Benchmarks">
        <div className="flex flex-col gap-3">
          {report.physical_benchmarks.map((b, i) => (
            <div key={i} className="border border-blue-200 bg-blue-50 rounded-xl px-4 py-3">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{b.metric}</span>
                <span className="text-sm font-bold text-blue-900">{b.value}</span>
              </div>
              <p className="text-xs text-blue-700 leading-relaxed">{b.interpretation}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Camp Summary">
        <p className="text-sm text-zinc-700 leading-relaxed">{report.camp_summary}</p>
      </Section>
    </div>
  );
}

// ─── page ──────────────────────────────────────────────────────────────────────

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: share } = await supabaseAdmin
    .from("report_share")
    .select("athlete_id, report_type, report_json, created_at, expires_at")
    .eq("token", token)
    .single();

  if (!share) notFound();

  // Check expiry
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-500 text-sm">This report link has expired.</p>
      </div>
    );
  }

  let athleteName = "";
  if (share.athlete_id) {
    const { data: athlete } = await supabaseAdmin
      .from("athlete")
      .select("name")
      .eq("id", share.athlete_id)
      .single();
    athleteName = athlete?.name ?? "";
  }

  const createdAt = share.created_at
    ? new Date(share.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const reportType = (share.report_type ?? "monthly") as "monthly" | "prefight";
  const reportData = share.report_json as unknown as MonthlyReport | PrefightReport;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-6">

        {/* minimal header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">CombatIQ</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">{createdAt}</span>
            <DownloadPDFButton
              reportType={reportType}
              report={reportData}
              athleteName={athleteName}
              practitionerName="Yusuf Ali-Taleb"
              clinicName="CombatIQ"
              generatedAt={createdAt}
            />
          </div>
        </div>

        {reportType === "monthly" ? (
          <MonthlyView
            report={reportData as MonthlyReport}
            athleteName={athleteName}
          />
        ) : (
          <PrefightView
            report={reportData as PrefightReport}
            athleteName={athleteName}
          />
        )}

        <p className="text-xs text-zinc-400 text-center">
          Generated by CombatIQ · For performance tracking purposes only
        </p>
      </div>
    </div>
  );
}
