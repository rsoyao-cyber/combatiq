"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

    // Check for server-side error sentinel
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

    // Strip heartbeat zero-width spaces before parsing
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

      {/* header */}
      <div className="flex items-center gap-4">
        <Link href={backHref} className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
          ←
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Import Trainerize PDF</h1>
          {athleteName && (
            <p className="text-sm text-zinc-500 mt-0.5">
              For <span className="font-semibold text-zinc-700">{athleteName}</span>
            </p>
          )}
        </div>
      </div>

      {/* upload form */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 flex flex-col gap-5">

        {athleteName && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <p className="text-sm text-amber-800">
              This PDF will be imported for <strong>{athleteName}</strong>. The athlete name in the PDF will be ignored.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">PDF file</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-zinc-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
            />
          </div>

          <button
            type="submit"
            disabled={!file || status === "loading"}
            className="self-start px-5 py-2 bg-amber-400 text-zinc-900 text-sm font-bold rounded-xl hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {status === "loading" ? "Parsing…" : "Upload & Parse"}
          </button>
        </form>

        {status === "loading" && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-zinc-500 animate-pulse">Extracting data with Claude…</p>
            {rawStream && (
              <pre className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs text-zinc-600 overflow-auto max-h-64 font-mono">
                {rawStream}
              </pre>
            )}
          </div>
        )}

        {status === "error" && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            Error: {errorMsg}
          </p>
        )}

        {usage && (
          <p className="text-xs text-zinc-400">
            Tokens: {usage.input_tokens.toLocaleString()} in / {usage.output_tokens.toLocaleString()} out
            {" "}— Est. cost: ${usage.estimated_cost_usd.toFixed(4)}
          </p>
        )}
      </div>
    </div>
  );
}
