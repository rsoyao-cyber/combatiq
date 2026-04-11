"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Upload, Loader2, AlertCircle, Info } from "lucide-react";
import type { ParsedImportData } from "@/lib/trainerize-types";

type Usage = {
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
};

export default function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ athleteId?: string; athleteName?: string }>;
}) {
  const { athleteId, athleteName } = use(searchParams);

  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [rawStream, setRawStream] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;

    setStatus("loading");
    setUsage(null);
    setRawStream("");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/parse-trainerize", {
      method: "POST",
      body: formData,
    });

    if (!res.body) {
      setErrorMsg("No response body");
      setStatus("error");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      accumulated += chunk;
      setRawStream(accumulated.split("__USAGE__")[0]);
    }

    if (accumulated.includes("__ERROR__")) {
      const errMsg = accumulated.split("__ERROR__")[1]?.trim() ?? "Unknown error";
      setErrorMsg(errMsg);
      setStatus("error");
      return;
    }

    const [jsonPart, usagePart] = accumulated.split("__USAGE__");
    if (usagePart) {
      try { setUsage(JSON.parse(usagePart)); } catch { /* non-fatal */ }
    }

    const cleanJson = jsonPart.replace(/\u200B/g, "");
    const start = cleanJson.indexOf("{");
    const end = cleanJson.lastIndexOf("}");

    if (start === -1 || end === -1 || end < start) {
      setErrorMsg("Model returned malformed JSON — the PDF may be too large or have no extractable data");
      setStatus("error");
      return;
    }

    try {
      const parsed: ParsedImportData = JSON.parse(cleanJson.slice(start, end + 1));
      sessionStorage.setItem(
        "combatiq_import_data",
        JSON.stringify({ parsed, filename: file.name, athleteId: athleteId ?? null }),
      );
      setStatus("success");
      router.push("/dashboard/import/review");
    } catch {
      setErrorMsg("Failed to parse extracted JSON");
      setStatus("error");
    }
  }

  const backHref = athleteId ? `/dashboard/athlete/${athleteId}` : "/dashboard";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={backHref} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0")}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Import Trainerize PDF</h1>
          {athleteName && (
            <p className="text-sm text-muted-foreground mt-0.5">
              For <span className="font-semibold text-foreground">{athleteName}</span>
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload PDF</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {athleteName && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This PDF will be imported for <strong>{athleteName}</strong>. The athlete name in the PDF will be ignored.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                PDF file
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
              />
            </div>

            <Button
              type="submit"
              disabled={!file || status === "loading"}
              className="self-start font-bold gap-2"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Parsing…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload &amp; Parse
                </>
              )}
            </Button>
          </form>

          {status === "loading" && rawStream && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground animate-pulse flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Extracting data with Claude…
                </p>
                <pre className="bg-muted rounded-lg p-4 text-xs text-muted-foreground overflow-auto max-h-64 font-mono">
                  {rawStream}
                </pre>
              </div>
            </>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {usage && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
                {usage.input_tokens.toLocaleString()} in / {usage.output_tokens.toLocaleString()} out tokens
              </Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
                Est. ${usage.estimated_cost_usd.toFixed(4)}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
