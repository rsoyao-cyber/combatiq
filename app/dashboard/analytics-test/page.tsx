import {
  getWellbeingTrends,
  getRagStatus,
  getPowerProgression,
  getStrengthProgression,
  getInjuryFlags,
} from "@/lib/analytics";

// Swap this to any athlete ID you want to inspect
const ATHLETE_ID = "285e72fa-9890-4d06-ab43-f5f77e00783f"; // Micah Smith

function Block({ title, data }: { title: string; data: unknown }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</h2>
      <pre style={{ background: "#f4f4f4", padding: 16, borderRadius: 6, fontSize: 12, overflow: "auto" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  );
}

export default async function AnalyticsTestPage() {
  const [trends, rag, power, strength, injuries] = await Promise.all([
    getWellbeingTrends(ATHLETE_ID, 30),
    getRagStatus(ATHLETE_ID),
    getPowerProgression(ATHLETE_ID, "Assault Fitness AssaultBike"),
    getStrengthProgression(ATHLETE_ID, "Barbell Back Squat"),
    getInjuryFlags(ATHLETE_ID),
  ]);

  return (
    <div style={{ padding: 24, maxWidth: 900, fontFamily: "monospace" }}>
      <h1 style={{ fontSize: 20, marginBottom: 32 }}>Analytics test — {ATHLETE_ID}</h1>
      <Block title="1. Wellbeing trends (30 days)" data={trends} />
      <Block title="2. RAG status (last 7 days)" data={rag} />
      <Block title="3. Power progression — AssaultBike" data={power} />
      <Block title="4. Strength progression — Barbell Back Squat" data={strength} />
      <Block title="5. Injury flags (14 days)" data={injuries} />
    </div>
  );
}
