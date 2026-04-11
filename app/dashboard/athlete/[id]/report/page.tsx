"use client";

import { useState, useCallback, use } from "react";
import Link from "next/link";
import { DownloadPDFButton } from "@/components/DownloadPDFButton";

// ─── types ────────────────────────────────────────────────────────────────────

type ReportType = "monthly" | "prefight";

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

// ─── editable primitives ──────────────────────────────────────────────────────

function EditableParagraph({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <textarea
        className={`w-full border border-amber-400 rounded-lg px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-amber-50 ${className}`}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        autoFocus
      />
    );
  }
  return (
    <p
      onClick={() => setEditing(true)}
      className={`text-sm leading-relaxed cursor-text hover:bg-zinc-50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors group relative ${className}`}
      title="Click to edit"
    >
      {value}
      <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-[10px] text-zinc-400 transition-opacity">
        edit
      </span>
    </p>
  );
}

function EditableListItem({
  value,
  onChange,
  prefix,
}: {
  value: string;
  onChange: (v: string) => void;
  prefix?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div className="flex gap-2 items-start">
        {prefix && <span className="shrink-0 mt-2">{prefix}</span>}
        <textarea
          className="flex-1 border border-amber-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-amber-50"
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          autoFocus
        />
      </div>
    );
  }
  return (
    <div
      onClick={() => setEditing(true)}
      className="flex gap-2 items-start cursor-text hover:bg-zinc-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors group relative"
      title="Click to edit"
    >
      {prefix && <span className="shrink-0">{prefix}</span>}
      <span className="text-sm leading-relaxed flex-1">{value}</span>
      <span className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-400 shrink-0 mt-0.5 transition-opacity">
        edit
      </span>
    </div>
  );
}

// ─── section wrapper ──────────────────────────────────────────────────────────

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function CardList({
  items,
  onChange,
  colorClass,
  dotColor,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  colorClass: string;
  dotColor: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className={`flex gap-3 items-start border rounded-xl px-4 py-3 ${colorClass}`}>
          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
          <EditableListItem
            value={item}
            onChange={(v) => {
              const next = [...items];
              next[i] = v;
              onChange(next);
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── monthly display ──────────────────────────────────────────────────────────

function MonthlyDisplay({
  report,
  athleteName,
  onChange,
}: {
  report: MonthlyReport;
  athleteName: string;
  onChange: (r: MonthlyReport) => void;
}) {
  function setField<K extends keyof MonthlyReport>(key: K, value: MonthlyReport[K]) {
    onChange({ ...report, [key]: value });
  }
  function setNarrative(key: keyof MonthlyReport["performance_narrative"], value: string) {
    onChange({ ...report, performance_narrative: { ...report.performance_narrative, [key]: value } });
  }

  return (
    <>
      <div className="border-b border-zinc-100 pb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Monthly Performance Review</p>
        {athleteName && <h1 className="text-xl font-bold text-zinc-900">{athleteName}</h1>}
      </div>

      <ReportSection title="Summary">
        <EditableParagraph value={report.summary} onChange={(v) => setField("summary", v)} className="text-zinc-700" />
      </ReportSection>

      <ReportSection title="Training Performance">
        {(["power", "strength", "conditioning"] as const).map((key) => (
          <div key={key}>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1 capitalize">{key}</p>
            <EditableParagraph value={report.performance_narrative[key]} onChange={(v) => setNarrative(key, v)} className="text-zinc-700" />
          </div>
        ))}
      </ReportSection>

      <ReportSection title="Wellbeing">
        <EditableParagraph value={report.wellbeing_summary} onChange={(v) => setField("wellbeing_summary", v)} className="text-zinc-700" />
      </ReportSection>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <ReportSection title="Strengths">
          <CardList
            items={report.strengths}
            onChange={(v) => setField("strengths", v)}
            colorClass="bg-emerald-50 border-emerald-200 text-emerald-800"
            dotColor="bg-emerald-500"
          />
        </ReportSection>
        <ReportSection title="Development Areas">
          <CardList
            items={report.development_areas}
            onChange={(v) => setField("development_areas", v)}
            colorClass="bg-amber-50 border-amber-200 text-amber-800"
            dotColor="bg-amber-400"
          />
        </ReportSection>
      </div>

      <ReportSection title="Next Steps">
        <ol className="flex flex-col gap-2">
          {report.next_steps.map((item, i) => (
            <EditableListItem
              key={i}
              value={item}
              onChange={(v) => {
                const arr = [...report.next_steps];
                arr[i] = v;
                setField("next_steps", arr);
              }}
              prefix={
                <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
              }
            />
          ))}
        </ol>
      </ReportSection>
    </>
  );
}

// ─── pre-fight display ────────────────────────────────────────────────────────

function PrefightDisplay({
  report,
  athleteName,
  onChange,
}: {
  report: PrefightReport;
  athleteName: string;
  onChange: (r: PrefightReport) => void;
}) {
  function setField<K extends keyof PrefightReport>(key: K, value: PrefightReport[K]) {
    onChange({ ...report, [key]: value });
  }

  return (
    <>
      <div className="border-b border-zinc-100 pb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Pre-Fight Readiness Report</p>
        {athleteName && <h1 className="text-xl font-bold text-zinc-900">{athleteName}</h1>}
      </div>

      <ReportSection title="Readiness">
        <EditableParagraph value={report.readiness_statement} onChange={(v) => setField("readiness_statement", v)} className="text-zinc-700" />
      </ReportSection>

      <ReportSection title="Preparation Highlights">
        <CardList
          items={report.preparation_highlights}
          onChange={(v) => setField("preparation_highlights", v)}
          colorClass="bg-emerald-50 border-emerald-200 text-emerald-800"
          dotColor="bg-emerald-500"
        />
      </ReportSection>

      <ReportSection title="Physical Benchmarks">
        <div className="flex flex-col gap-3">
          {report.physical_benchmarks.map((b, i) => (
            <div key={i} className="border border-blue-200 bg-blue-50 rounded-xl px-4 py-3">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{b.metric}</span>
                <span className="text-sm font-bold text-blue-900">{b.value}</span>
              </div>
              <EditableListItem
                value={b.interpretation}
                onChange={(v) => {
                  const arr = [...report.physical_benchmarks];
                  arr[i] = { ...arr[i], interpretation: v };
                  setField("physical_benchmarks", arr);
                }}
              />
            </div>
          ))}
        </div>
      </ReportSection>

      <ReportSection title="Camp Summary">
        <EditableParagraph value={report.camp_summary} onChange={(v) => setField("camp_summary", v)} className="text-zinc-700" />
      </ReportSection>
    </>
  );
}

// ─── page ──────────────────────────────────────────────────────────────────────

export default function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = use(params);
  const { type } = use(searchParams);
  const initialType: ReportType = type === "prefight" ? "prefight" : "monthly";

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [prefightReport, setPrefightReport] = useState<PrefightReport | null>(null);
  const [athleteName, setAthleteName] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeReportType, setActiveReportType] = useState<ReportType>(initialType);

  const generate = useCallback(async (rt: ReportType) => {
    setStatus("loading");
    setMonthlyReport(null);
    setPrefightReport(null);
    setErrorMsg("");

    const res = await fetch("/api/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athleteId: id, reportType: rt }),
    });

    const json = await res.json();

    if (!res.ok) {
      setErrorMsg(json.error ?? "Unknown error");
      setStatus("error");
    } else {
      if (rt === "monthly") {
        setMonthlyReport(json.report as MonthlyReport);
      } else {
        setPrefightReport(json.report as PrefightReport);
      }
      setGeneratedAt(json.generatedAt);
      setStatus("success");

      try {
        const stored = sessionStorage.getItem("combatiq_import_data");
        if (stored) setAthleteName(JSON.parse(stored).parsed?.athlete_name ?? "");
      } catch { /* non-fatal */ }
    }
  }, [id]);

  const hasReport = activeReportType === "monthly" ? !!monthlyReport : !!prefightReport;

  const formattedDate = generatedAt
    ? new Date(generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-8">

      {/* header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/athlete/${id}`} className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
            ← Athlete
          </Link>
          {generatedAt && (
            <span className="text-xs text-zinc-400">
              Generated {new Date(generatedAt).toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex rounded-xl overflow-hidden border border-zinc-200">
            {(["monthly", "prefight"] as ReportType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setActiveReportType(t); setStatus("idle"); }}
                className={`px-3 py-1.5 text-sm font-semibold transition-colors ${
                  activeReportType === t ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {t === "monthly" ? "Monthly" : "Pre-fight"}
              </button>
            ))}
          </div>

          <button
            onClick={() => generate(activeReportType)}
            disabled={status === "loading"}
            className="px-4 py-1.5 bg-amber-400 text-zinc-900 text-sm font-bold rounded-xl hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {status === "loading" ? "Generating…" : hasReport ? "Regenerate" : "Generate Report"}
          </button>
        </div>
      </div>

      {/* loading */}
      {status === "loading" && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-10 text-center">
          <p className="text-sm text-zinc-500 animate-pulse">Analysing data… this takes ~15–30 seconds</p>
        </div>
      )}

      {/* error */}
      {status === "error" && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          Error: {errorMsg}
        </p>
      )}

      {/* idle */}
      {status === "idle" && !hasReport && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-10 text-center flex flex-col gap-3">
          <p className="text-zinc-500 text-sm">
            Select report type and click Generate Report to produce the{" "}
            {activeReportType === "monthly" ? "monthly review" : "pre-fight readiness"} report.
          </p>
          <p className="text-xs text-zinc-400">All text fields are editable after generation.</p>
        </div>
      )}

      {/* report */}
      {hasReport && status === "success" && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 flex flex-col gap-8">

          {activeReportType === "monthly" && monthlyReport ? (
            <MonthlyDisplay
              report={monthlyReport}
              athleteName={athleteName}
              onChange={setMonthlyReport}
            />
          ) : prefightReport ? (
            <PrefightDisplay
              report={prefightReport}
              athleteName={athleteName}
              onChange={setPrefightReport}
            />
          ) : null}

          {/* actions */}
          <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-4 flex-wrap">
            <p className="text-xs text-zinc-400">Click any text to edit before sharing.</p>
            <DownloadPDFButton
              reportType={activeReportType}
              report={activeReportType === "monthly" ? monthlyReport! : prefightReport!}
              athleteName={athleteName}
              practitionerName="Yusuf Ali-Taleb"
              clinicName="CombatIQ"
              generatedAt={formattedDate}
            />
          </div>
        </div>
      )}
    </div>
  );
}
