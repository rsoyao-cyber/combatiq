"use client";

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyCheckinLink({
  athleteId,
  name,
  withLabel = false,
}: {
  athleteId: string;
  name: string;
  withLabel?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(`${window.location.origin}/checkin/${athleteId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `Check-in link for ${name} copied` : `Copy check-in link for ${name}`}
      title={copied ? "Copied" : "Copy check-in link"}
      className={cn(
        "rounded-full border border-border bg-card inline-flex items-center justify-center gap-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        withLabel ? "h-9 px-4" : "size-9 rounded-[10px] text-muted-foreground hover:text-foreground",
      )}
    >
      {copied ? <Check className="size-4 text-status-ready" /> : <LinkIcon className="size-4" />}
      {withLabel && (copied ? "Copied" : "Copy check-in link")}
    </button>
  );
}
