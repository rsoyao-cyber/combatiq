"use client";

import { useState } from "react";
import Link from "next/link";

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


function StringList({ items, color = "zinc" }: { items: string[]; color?: string }) {
  const colorMap: Record<string, string> = {
    green:  "bg-emerald-50 text-emerald-800 border-emerald-200",
    amber:  "bg-amber-50 text-amber-800 border-amber-200",
    blue:   "bg-blue-50 text-blue-800 border-blue-200",
    zinc:   "bg-zinc-50 text-zinc-700 border-zinc-200",
  };
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className={`text-sm border rounded-lg px-3 py-2 ${colorMap[color] ?? colorMap.zinc}`}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function MonthlyPreview({ report }: { report: MonthlyReport }) {
  return (
    <div className="flex flex-col gap-6 bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Monthly Review</h3>
        <p className="text-zinc-800 text-sm leading-relaxed">{report.summary}</p>
      </div>
      <div>
        <h4 className="text-sm font-bold text-zinc-700 mb-3">Performance</h4>
        <div className="flex flex-col gap-3">
          {Object.entries(report.performance_narrative).map(([key, val]) => (
            <div key={key}>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1 capitalize">{key}</p>
              <p className="text-sm text-zinc-700 leading-relaxed">{val}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-bold text-zinc-700 mb-2">Wellbeing</h4>
        <p className="text-sm text-zinc-700 leading-relaxed">{report.wellbeing_summary}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-bold text-zinc-700 mb-2">Strengths</h4>
          <StringList items={report.strengths} color="green" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-zinc-700 mb-2">Development areas</h4>
          <StringList items={report.development_areas} color="amber" />
        </div>
      </div>
      <div>
        <h4 className="text-sm font-bold text-zinc-700 mb-2">Next steps</h4>
        <StringList items={report.next_steps} color="zinc" />
      </div>
    </div>
  );
}

function PrefightPreview({ report }: { report: PrefightReport }) {
  return (
    <div className="flex flex-col gap-6 bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Pre-Fight Readiness</h3>
        <p className="text-zinc-800 text-sm leading-relaxed">{report.readiness_statement}</p>
      </div>
      <div>
        <h4 className="text-sm font-bold text-zinc-700 mb-2">Preparation highlights</h4>
        <StringList items={report.preparation_highlights} color="green" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-zinc-700 mb-2">Physical benchmarks</h4>
        <div className="flex flex-col gap-2">
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
      </div>
      <div>
        <h4 className="text-sm font-bold text-zinc-700 mb-2">Camp summary</h4>
        <p className="text-sm text-zinc-700 leading-relaxed">{report.camp_summary}</p>
      </div>
    </div>
  );
}

export function ReportPanel({ athleteId }: { athleteId: string }) {
  const [monthlyStatus, setMonthlyStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [prefightStatus, setPrefightStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [prefightReport, setPrefightReport] = useState<PrefightReport | null>(null);
  const [monthlyToken, setMonthlyToken] = useState<string | null>(null);
  const [prefightToken, setPrefightToken] = useState<string | null>(null);
  const [monthlyError, setMonthlyError] = useState("");
  const [prefightError, setPrefightError] = useState("");

  async function handleGenerate(reportType: ReportType) {
    if (reportType === "monthly") {
      setMonthlyStatus("loading");
      setMonthlyReport(null);
      setMonthlyError("");
    } else {
      setPrefightStatus("loading");
      setPrefightReport(null);
      setPrefightError("");
    }

    const res = await fetch("/api/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athleteId, reportType }),
    });

    const json = await res.json();

    if (!res.ok) {
      if (reportType === "monthly") {
        setMonthlyError(json.error ?? "Unknown error");
        setMonthlyStatus("error");
      } else {
        setPrefightError(json.error ?? "Unknown error");
        setPrefightStatus("error");
      }
    } else {
      if (reportType === "monthly") {
        setMonthlyReport(json.report as MonthlyReport);
        setMonthlyToken(json.shareToken ?? null);
        setMonthlyStatus("success");
      } else {
        setPrefightReport(json.report as PrefightReport);
        setPrefightToken(json.shareToken ?? null);
        setPrefightStatus("success");
      }
    }
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Monthly report */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleGenerate("monthly")}
            disabled={monthlyStatus === "loading"}
            className="px-5 py-2 bg-amber-400 text-zinc-900 text-sm font-bold rounded-xl hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {monthlyStatus === "loading" ? "Generating…" : "Generate Monthly Review"}
          </button>
          {monthlyStatus === "loading" && (
            <p className="text-xs text-zinc-500 animate-pulse">Analysing data, this takes ~15–30 seconds…</p>
          )}
        </div>

        {monthlyStatus === "error" && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            Error: {monthlyError}
          </p>
        )}

        {monthlyReport && monthlyStatus === "success" && (
          <div className="flex flex-col gap-3">
            <MonthlyPreview report={monthlyReport} />
            <div className="flex flex-wrap gap-4 items-center">
              <Link
                href={`/dashboard/athlete/${athleteId}/report?type=monthly`}
                className="text-sm text-amber-600 hover:text-amber-700 font-semibold"
              >
                Open full report view →
              </Link>
              {monthlyToken && (
                <Link
                  href={`/report/${monthlyToken}`}
                  target="_blank"
                  className="text-sm text-zinc-500 hover:text-zinc-700 font-semibold"
                >
                  Shareable link ↗
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pre-fight report */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleGenerate("prefight")}
            disabled={prefightStatus === "loading"}
            className="px-5 py-2 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {prefightStatus === "loading" ? "Generating…" : "Generate Pre-Fight Report"}
          </button>
          {prefightStatus === "loading" && (
            <p className="text-xs text-zinc-500 animate-pulse">Analysing data, this takes ~15–30 seconds…</p>
          )}
        </div>

        {prefightStatus === "error" && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            Error: {prefightError}
          </p>
        )}

        {prefightReport && prefightStatus === "success" && (
          <div className="flex flex-col gap-3">
            <PrefightPreview report={prefightReport} />
            <div className="flex flex-wrap gap-4 items-center">
              {prefightToken && (
                <Link
                  href={`/report/${prefightToken}`}
                  target="_blank"
                  className="text-sm text-amber-600 hover:text-amber-700 font-semibold"
                >
                  Open shareable report ↗
                </Link>
              )}
              {prefightToken && (
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/report/${prefightToken}`;
                    navigator.clipboard.writeText(url);
                  }}
                  className="text-sm text-zinc-500 hover:text-zinc-700 font-semibold"
                >
                  Copy link
                </button>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
