"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertCircle, ExternalLink, Copy } from "lucide-react";

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

function ItemList({
  items,
  variant = "default",
}: {
  items: string[];
  variant?: "green" | "amber" | "blue" | "default";
}) {
  const styles = {
    green:   "bg-emerald-50 text-emerald-800 border-emerald-200",
    amber:   "bg-amber-50  text-amber-800  border-amber-200",
    blue:    "bg-blue-50   text-blue-800   border-blue-200",
    default: "bg-muted     text-foreground  border-border",
  };
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className={`text-sm border rounded-lg px-3 py-2 ${styles[variant]}`}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function MonthlyPreview({ report }: { report: MonthlyReport }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Monthly Review
        </CardTitle>
        <p className="text-sm leading-relaxed text-foreground">{report.summary}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Separator />
        <div>
          <p className="text-sm font-bold mb-3">Performance</p>
          <div className="flex flex-col gap-3">
            {Object.entries(report.performance_narrative).map(([key, val]) => (
              <div key={key}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 capitalize">{key}</p>
                <p className="text-sm leading-relaxed">{val}</p>
              </div>
            ))}
          </div>
        </div>
        <Separator />
        <div>
          <p className="text-sm font-bold mb-2">Wellbeing</p>
          <p className="text-sm leading-relaxed">{report.wellbeing_summary}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-bold mb-2">Strengths</p>
            <ItemList items={report.strengths} variant="green" />
          </div>
          <div>
            <p className="text-sm font-bold mb-2">Development areas</p>
            <ItemList items={report.development_areas} variant="amber" />
          </div>
        </div>
        <div>
          <p className="text-sm font-bold mb-2">Next steps</p>
          <ItemList items={report.next_steps} />
        </div>
      </CardContent>
    </Card>
  );
}

function PrefightPreview({ report }: { report: PrefightReport }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Pre-Fight Readiness
        </CardTitle>
        <p className="text-sm leading-relaxed">{report.readiness_statement}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Separator />
        <div>
          <p className="text-sm font-bold mb-2">Preparation highlights</p>
          <ItemList items={report.preparation_highlights} variant="green" />
        </div>
        <div>
          <p className="text-sm font-bold mb-2">Physical benchmarks</p>
          <div className="flex flex-col gap-2">
            {report.physical_benchmarks.map((b, i) => (
              <div key={i} className="border border-blue-200 bg-blue-50 rounded-lg px-4 py-3">
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
          <p className="text-sm font-bold mb-2">Camp summary</p>
          <p className="text-sm leading-relaxed">{report.camp_summary}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportSection({
  buttonLabel,
  buttonClassName,
  status,
  error,
  onGenerate,
  children,
  token,
  athleteId,
  reportType,
}: {
  buttonLabel: string;
  buttonClassName: string;
  status: "idle" | "loading" | "success" | "error";
  error: string;
  onGenerate: () => void;
  children: React.ReactNode;
  token: string | null;
  athleteId: string;
  reportType: ReportType;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={onGenerate}
          disabled={status === "loading"}
          className={buttonClassName}
        >
          {status === "loading" ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
          ) : buttonLabel}
        </Button>
        {status === "loading" && (
          <p className="text-xs text-muted-foreground animate-pulse">
            Analysing data, this takes ~15–30 seconds…
          </p>
        )}
      </div>

      {status === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {status === "success" && children && (
        <div className="flex flex-col gap-3">
          {children}
          <div className="flex flex-wrap gap-3 items-center">
            {reportType === "monthly" && (
              <Link href={`/dashboard/athlete/${athleteId}/report?type=monthly`} className={cn(buttonVariants({ variant: "link" }), "p-0 h-auto text-sm font-semibold gap-1")}>
                Open full report view <ExternalLink className="w-3 h-3" />
              </Link>
            )}
            {token && (
              <>
                <Link href={`/report/${token}`} target="_blank" className={cn(buttonVariants({ variant: "link" }), "p-0 h-auto text-sm font-semibold text-muted-foreground gap-1")}>
                  Shareable link <ExternalLink className="w-3 h-3" />
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-muted-foreground"
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/report/${token}`)}
                >
                  <Copy className="w-3 h-3" /> Copy link
                </Button>
              </>
            )}
          </div>
        </div>
      )}
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
      if (reportType === "monthly") { setMonthlyError(json.error ?? "Unknown error"); setMonthlyStatus("error"); }
      else { setPrefightError(json.error ?? "Unknown error"); setPrefightStatus("error"); }
    } else {
      if (reportType === "monthly") { setMonthlyReport(json.report as MonthlyReport); setMonthlyToken(json.shareToken ?? null); setMonthlyStatus("success"); }
      else { setPrefightReport(json.report as PrefightReport); setPrefightToken(json.shareToken ?? null); setPrefightStatus("success"); }
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <ReportSection
        buttonLabel="Generate Monthly Review"
        buttonClassName="font-bold gap-2"
        status={monthlyStatus}
        error={monthlyError}
        onGenerate={() => handleGenerate("monthly")}
        token={monthlyToken}
        athleteId={athleteId}
        reportType="monthly"
      >
        {monthlyReport && <MonthlyPreview report={monthlyReport} />}
      </ReportSection>

      <Separator />

      <ReportSection
        buttonLabel="Generate Pre-Fight Report"
        buttonClassName="font-bold gap-2"
        status={prefightStatus}
        error={prefightError}
        onGenerate={() => handleGenerate("prefight")}
        token={prefightToken}
        athleteId={athleteId}
        reportType="prefight"
      >
        {prefightReport && <PrefightPreview report={prefightReport} />}
      </ReportSection>
    </div>
  );
}
