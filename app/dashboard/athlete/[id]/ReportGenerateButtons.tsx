"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ExternalLink, Copy, AlertCircle, Check } from "lucide-react";

type ReportType = "monthly" | "prefight";
type GenStatus = "idle" | "loading" | "success" | "error";

function GenerateDialog({
  open,
  onOpenChange,
  reportType,
  status,
  error,
  shareToken,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reportType: ReportType;
  status: GenStatus;
  error: string;
  shareToken: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const label = reportType === "monthly" ? "Monthly Review" : "Pre-Fight Report";

  function handleCopy() {
    if (!shareToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/report/${shareToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{label}</DialogTitle>
        </DialogHeader>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Analysing data, this takes ~15–30 seconds…
            </p>
          </div>
        )}

        {status === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status === "success" && shareToken && (
          <div className="flex flex-col gap-4 py-2">
            <p className="text-sm text-muted-foreground">
              Report generated successfully. Share with the athlete:
            </p>
            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
              <span className="text-xs text-foreground font-mono flex-1 truncate">
                {`${window.location.origin}/report/${shareToken}`}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => window.open(`/report/${shareToken}`, "_blank")}
              >
                <ExternalLink className="w-3.5 h-3.5" /> View report
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleCopy}
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copied</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy link</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ReportGenerateButtons({ athleteId }: { athleteId: string }) {
  const router = useRouter();
  const [activeType, setActiveType] = useState<ReportType | null>(null);
  const [status, setStatus] = useState<GenStatus>("idle");
  const [error, setError] = useState("");
  const [shareToken, setShareToken] = useState<string | null>(null);

  async function handleGenerate(reportType: ReportType) {
    setActiveType(reportType);
    setStatus("loading");
    setError("");
    setShareToken(null);

    const res = await fetch("/api/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athleteId, reportType }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Unknown error");
      setStatus("error");
    } else {
      setShareToken(json.shareToken ?? null);
      setStatus("success");
      // Refresh server data so history table updates
      router.refresh();
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      setActiveType(null);
      setStatus("idle");
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => handleGenerate("monthly")}
        disabled={status === "loading"}
      >
        {status === "loading" && activeType === "monthly" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : null}
        Monthly Report
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => handleGenerate("prefight")}
        disabled={status === "loading"}
      >
        {status === "loading" && activeType === "prefight" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : null}
        Pre-Fight Report
      </Button>

      <GenerateDialog
        open={activeType !== null && status !== "idle"}
        onOpenChange={handleClose}
        reportType={activeType ?? "monthly"}
        status={status}
        error={error}
        shareToken={shareToken}
      />
    </>
  );
}
