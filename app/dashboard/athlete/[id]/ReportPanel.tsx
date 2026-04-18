"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ExternalLink, Copy, RefreshCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportShare = {
  id: string;
  token: string | null;
  report_type: string | null;
  created_at: string | null;
  expires_at: string | null;
  viewed_at: string | null;
};

export type ReportPanelProps = {
  athleteId: string;
  checkInCount30d: number;
  weekScheduleCount4w: number;
  lastSessionDate: string | null;
  reportHistory: ReportShare[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatExpiry(expiresAt: string | null): { label: string; expired: boolean } {
  if (!expiresAt) return { label: "No expiry", expired: false };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { label: "Expired", expired: true };
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return { label: `Expires in ${days}d`, expired: false };
}

// ─── Extend button ────────────────────────────────────────────────────────────

function ExtendButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleExtend() {
    setLoading(true);
    await fetch("/api/report-share", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
      onClick={handleExtend}
      disabled={loading}
    >
      <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
      +30d
    </Button>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(`${window.location.origin}/report/${token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
    >
      {copied ? (
        <><Check className="w-3 h-3 text-emerald-600" /> Copied</>
      ) : (
        <><Copy className="w-3 h-3" /> Copy</>
      )}
    </Button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReportPanel({
  checkInCount30d,
  weekScheduleCount4w,
  lastSessionDate,
  reportHistory,
}: ReportPanelProps) {
  const checkInPct = Math.min(100, Math.round((checkInCount30d / 30) * 100));

  return (
    <div className="flex flex-col gap-5">

      {/* ── Data completeness card ────────────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Data completeness
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-5">
          {/* Progress bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Check-ins — last 30 days</span>
              <span className="text-xs font-semibold text-foreground tabular-nums">
                {checkInCount30d} / 30
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  checkInPct >= 80
                    ? "bg-emerald-500"
                    : checkInPct >= 50
                    ? "bg-amber-400"
                    : "bg-red-400",
                )}
                style={{ width: `${checkInPct}%` }}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Last session</span>
              <span className="text-sm font-medium text-foreground">
                {lastSessionDate ?? "—"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Weeks scheduled</span>
              <span className="text-sm font-medium text-foreground">
                {weekScheduleCount4w} / 4
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Fill rate</span>
              <span className={cn(
                "text-sm font-bold",
                checkInPct >= 80 ? "text-emerald-600"
                : checkInPct >= 50 ? "text-amber-600"
                : "text-red-600",
              )}>
                {checkInPct}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Report history ────────────────────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Report history
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {reportHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 pb-4">
              No reports generated yet. Use the buttons above to generate one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportHistory.map((share) => {
                  const { label: expiryLabel, expired } = formatExpiry(share.expires_at);
                  return (
                    <TableRow key={share.id}>
                      <TableCell className="font-medium text-sm capitalize">
                        {share.report_type === "prefight" ? "Pre-Fight" : "Monthly"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatDate(share.created_at)}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-xs font-medium",
                          expired ? "text-red-600" : "text-muted-foreground",
                        )}>
                          {expiryLabel}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            share.viewed_at
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                              : "bg-muted text-muted-foreground text-xs"
                          }
                        >
                          {share.viewed_at ? "Viewed" : "Not opened"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          {share.token && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                onClick={() => window.open(`/report/${share.token}`, "_blank")}
                              >
                                <ExternalLink className="w-3 h-3" /> View
                              </Button>
                              <CopyLinkButton token={share.token} />
                            </>
                          )}
                          <ExtendButton id={share.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
