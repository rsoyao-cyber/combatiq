"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// ─── types ────────────────────────────────────────────────────────────────────

export type MonthlyReportData = {
  summary: string;
  performance_narrative: { power: string; strength: string; conditioning: string };
  wellbeing_summary: string;
  strengths: string[];
  development_areas: string[];
  next_steps: string[];
};

export type PrefightReportData = {
  readiness_statement: string;
  preparation_highlights: string[];
  physical_benchmarks: { metric: string; value: string; interpretation: string }[];
  camp_summary: string;
};

export type ReportPDFProps = {
  reportType: "monthly" | "prefight";
  report: MonthlyReportData | PrefightReportData;
  athleteName: string;
  practitionerName: string;
  clinicName: string;
  generatedAt: string;
};

// ─── styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#27272a",
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    lineHeight: 1.5,
  },

  // header
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#fbbf24",
    paddingBottom: 16,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerLeft: { flexDirection: "column", gap: 3 },
  clinicName: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#a1a1aa", letterSpacing: 1.5, textTransform: "uppercase" },
  athleteName: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#18181b" },
  reportType: { fontSize: 9, color: "#71717a", fontFamily: "Helvetica-Bold", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 2 },
  headerRight: { flexDirection: "column", alignItems: "flex-end", gap: 3 },
  dateText: { fontSize: 8, color: "#a1a1aa" },

  // sections
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#a1a1aa",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e4e4e7",
    paddingBottom: 4,
    marginBottom: 10,
  },
  bodyText: { fontSize: 10, color: "#3f3f46", lineHeight: 1.6 },

  // performance narrative
  narrativeKey: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#71717a", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 },
  narrativeBlock: { marginBottom: 10 },

  // two-column grid
  grid: { flexDirection: "row", gap: 16, marginBottom: 4 },
  gridCol: { flex: 1 },

  // cards
  greenCard: { borderWidth: 0.5, borderColor: "#6ee7b7", backgroundColor: "#ecfdf5", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 5, flexDirection: "row", gap: 6, alignItems: "flex-start" },
  greenDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#10b981", marginTop: 3 },
  greenText: { flex: 1, fontSize: 9, color: "#065f46", lineHeight: 1.5 },

  amberCard: { borderWidth: 0.5, borderColor: "#fcd34d", backgroundColor: "#fffbeb", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 5, flexDirection: "row", gap: 6, alignItems: "flex-start" },
  amberDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#f59e0b", marginTop: 3 },
  amberText: { flex: 1, fontSize: 9, color: "#78350f", lineHeight: 1.5 },

  blueCard: { borderWidth: 0.5, borderColor: "#bfdbfe", backgroundColor: "#eff6ff", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 5 },
  blueMetricRow: { flexDirection: "row", gap: 6, alignItems: "baseline", marginBottom: 2 },
  blueMetricLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#3b82f6", letterSpacing: 0.8, textTransform: "uppercase" },
  blueMetricValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1e3a8a" },
  blueInterpretation: { fontSize: 8.5, color: "#1d4ed8", lineHeight: 1.5 },

  // numbered list
  numberedRow: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginBottom: 6 },
  numberBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#18181b", flexDirection: "row", alignItems: "center", justifyContent: "center" },
  numberText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  numberedText: { flex: 1, fontSize: 9.5, color: "#3f3f46", lineHeight: 1.55, paddingTop: 2 },

  // footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#e4e4e7",
    paddingTop: 8,
  },
  footerBrand: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#a1a1aa", letterSpacing: 1.2, textTransform: "uppercase" },
  footerPractitioner: { fontSize: 7.5, color: "#a1a1aa" },
});

// ─── shared components ────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionTitle}>{title}</Text>;
}

function GreenCard({ text }: { text: string }) {
  return (
    <View style={s.greenCard}>
      <View style={s.greenDot} />
      <Text style={s.greenText}>{text}</Text>
    </View>
  );
}

function AmberCard({ text }: { text: string }) {
  return (
    <View style={s.amberCard}>
      <View style={s.amberDot} />
      <Text style={s.amberText}>{text}</Text>
    </View>
  );
}

function NumberedItem({ index, text }: { index: number; text: string }) {
  return (
    <View style={s.numberedRow}>
      <View style={s.numberBadge}>
        <Text style={s.numberText}>{index + 1}</Text>
      </View>
      <Text style={s.numberedText}>{text}</Text>
    </View>
  );
}

function Footer({ practitionerName, clinicName }: { practitionerName: string; clinicName: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerBrand}>CombatIQ · {clinicName}</Text>
      <Text style={s.footerPractitioner}>{practitionerName}</Text>
    </View>
  );
}

// ─── monthly template ─────────────────────────────────────────────────────────

function MonthlyTemplate({
  report,
  athleteName,
  practitionerName,
  clinicName,
  generatedAt,
}: {
  report: MonthlyReportData;
  athleteName: string;
  practitionerName: string;
  clinicName: string;
  generatedAt: string;
}) {
  return (
    <Page size="A4" style={s.page}>
      {/* header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.clinicName}>{clinicName}</Text>
          <Text style={s.athleteName}>{athleteName}</Text>
          <Text style={s.reportType}>Monthly Performance Review</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.dateText}>{generatedAt}</Text>
        </View>
      </View>

      {/* summary */}
      <View style={s.section}>
        <SectionHeader title="Summary" />
        <Text style={s.bodyText}>{report.summary}</Text>
      </View>

      {/* performance narrative */}
      <View style={s.section}>
        <SectionHeader title="Training Performance" />
        {(["power", "strength", "conditioning"] as const).map((key) => (
          <View key={key} style={s.narrativeBlock}>
            <Text style={s.narrativeKey}>{key}</Text>
            <Text style={s.bodyText}>{report.performance_narrative[key]}</Text>
          </View>
        ))}
      </View>

      {/* wellbeing */}
      <View style={s.section}>
        <SectionHeader title="Wellbeing" />
        <Text style={s.bodyText}>{report.wellbeing_summary}</Text>
      </View>

      {/* strengths + dev areas */}
      <View style={[s.section, s.grid]}>
        <View style={s.gridCol}>
          <SectionHeader title="Strengths" />
          {report.strengths.map((item, i) => <GreenCard key={i} text={item} />)}
        </View>
        <View style={s.gridCol}>
          <SectionHeader title="Development Areas" />
          {report.development_areas.map((item, i) => <AmberCard key={i} text={item} />)}
        </View>
      </View>

      {/* next steps */}
      <View style={s.section}>
        <SectionHeader title="Next Steps" />
        {report.next_steps.map((item, i) => <NumberedItem key={i} index={i} text={item} />)}
      </View>

      <Footer practitionerName={practitionerName} clinicName={clinicName} />
    </Page>
  );
}

// ─── pre-fight template ───────────────────────────────────────────────────────

function PrefightTemplate({
  report,
  athleteName,
  practitionerName,
  clinicName,
  generatedAt,
}: {
  report: PrefightReportData;
  athleteName: string;
  practitionerName: string;
  clinicName: string;
  generatedAt: string;
}) {
  return (
    <Page size="A4" style={s.page}>
      {/* header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.clinicName}>{clinicName}</Text>
          <Text style={s.athleteName}>{athleteName}</Text>
          <Text style={s.reportType}>Pre-Fight Readiness Report</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.dateText}>{generatedAt}</Text>
        </View>
      </View>

      {/* readiness statement */}
      <View style={s.section}>
        <SectionHeader title="Readiness" />
        <Text style={s.bodyText}>{report.readiness_statement}</Text>
      </View>

      {/* preparation highlights */}
      <View style={s.section}>
        <SectionHeader title="Preparation Highlights" />
        {report.preparation_highlights.map((item, i) => <GreenCard key={i} text={item} />)}
      </View>

      {/* physical benchmarks */}
      <View style={s.section}>
        <SectionHeader title="Physical Benchmarks" />
        {report.physical_benchmarks.map((b, i) => (
          <View key={i} style={s.blueCard}>
            <View style={s.blueMetricRow}>
              <Text style={s.blueMetricLabel}>{b.metric}</Text>
              <Text style={s.blueMetricValue}>{b.value}</Text>
            </View>
            <Text style={s.blueInterpretation}>{b.interpretation}</Text>
          </View>
        ))}
      </View>

      {/* camp summary */}
      <View style={s.section}>
        <SectionHeader title="Camp Summary" />
        <Text style={s.bodyText}>{report.camp_summary}</Text>
      </View>

      <Footer practitionerName={practitionerName} clinicName={clinicName} />
    </Page>
  );
}

// ─── document root ────────────────────────────────────────────────────────────

export function ReportPDF({
  reportType,
  report,
  athleteName,
  practitionerName,
  clinicName,
  generatedAt,
}: ReportPDFProps) {
  return (
    <Document>
      {reportType === "monthly" ? (
        <MonthlyTemplate
          report={report as MonthlyReportData}
          athleteName={athleteName}
          practitionerName={practitionerName}
          clinicName={clinicName}
          generatedAt={generatedAt}
        />
      ) : (
        <PrefightTemplate
          report={report as PrefightReportData}
          athleteName={athleteName}
          practitionerName={practitionerName}
          clinicName={clinicName}
          generatedAt={generatedAt}
        />
      )}
    </Document>
  );
}
