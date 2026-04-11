"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { ReportPDF, type ReportPDFProps } from "./ReportPDF";

export function DownloadPDFButton(props: ReportPDFProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const blob = await pdf(<ReportPDF {...props} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const slug = props.athleteName.toLowerCase().replace(/\s+/g, "-");
      const type = props.reportType === "monthly" ? "monthly-review" : "prefight-report";
      a.download = `${slug}-${type}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="px-4 py-2 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? "Generating PDF…" : "Download PDF"}
    </button>
  );
}
